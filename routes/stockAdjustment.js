const express = require('express')
const StockAdjustment = require('../models/StockAdjustment')
const Product = require('../models/Product')
const Rack = require('../models/Rack')

const router = express.Router()

// GET all stock adjustment logs
router.get('/', async (req, res) => {
  try {
    const logs = await StockAdjustment.find().sort({ createdAt: -1 })
    res.json(logs)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create stock adjustment (and auto-apply inventory difference)
router.post('/', async (req, res) => {
  try {
    const qty = req.body.adjustedQty !== undefined ? req.body.adjustedQty : req.body.adjustmentQty
    if (qty !== undefined) {
      req.body.adjustedQty = Number(qty)
    }
    const { adjustedQty, type, reason } = req.body

    if (adjustedQty !== undefined && Number(adjustedQty) < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative in warehouse adjustments' })
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Adjustment reason / root cause notes are mandatory' })
    }

    // Pre-locate product to validate physical warehouse inventory
    let prod = null
    if (req.body.productId) {
      prod = await Product.findById(req.body.productId)
    }
    if (!prod && req.body.sku) {
      prod = await Product.findOne({ sku: req.body.sku.trim().toUpperCase() })
    }
    if (!prod && req.body.productName) {
      const cleanName = req.body.productName.trim()
      const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const basePart = cleanName.split('(')[0].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      prod = await Product.findOne({
        $or: [
          { name: cleanName },
          { name: new RegExp(`^${escaped}$`, 'i') },
          { name: new RegExp(basePart, 'i') }
        ]
      })
    }

    // STRICT INVENTORY BUSINESS RULES ENFORCEMENT:
    if (type === 'Damage / Rejection') {
      const damageQty = Number(req.body.adjustedQty) || 0
      if (damageQty <= 0) {
        return res.status(400).json({ message: 'Quarantined damage quantity must be greater than zero.' })
      }
      if (prod) {
        const availableStock = Number(prod.currentStock) || 0
        if (availableStock <= 0) {
          return res.status(400).json({
            message: `Cannot report damage: "${prod.name}" is currently Out of Stock (0 ${prod.unit || 'Kg'} available in warehouse).`
          })
        }
        if (damageQty > availableStock) {
          return res.status(400).json({
            message: `Cannot report ${damageQty} ${prod.unit || 'Kg'} damage. Only ${availableStock} ${prod.unit || 'Kg'} is physically available in warehouse stock.`
          })
        }
      }
    } else if (type === 'Quality Hold') {
      const holdQty = Number(req.body.adjustedQty) || 0
      if (holdQty <= 0) {
        return res.status(400).json({ message: 'Quantity to place on hold must be greater than zero.' })
      }
      if (prod) {
        const availableUnreserved = Math.max(0, (Number(prod.currentStock) || 0) - (Number(prod.reservedQty) || 0))
        if (availableUnreserved <= 0) {
          return res.status(400).json({
            message: `Cannot place on hold: No available unreserved stock for "${prod.name}" (Total stock: ${prod.currentStock || 0}, already reserved: ${prod.reservedQty || 0}).`
          })
        }
        if (holdQty > availableUnreserved) {
          return res.status(400).json({
            message: `Cannot place ${holdQty} ${prod.unit || 'Kg'} on hold. Only ${availableUnreserved} ${prod.unit || 'Kg'} is unreserved and available.`
          })
        }
      }
    } else if (type === 'Expiry Write-Off') {
      const writeOffQty = Number(req.body.adjustedQty) || 0
      if (writeOffQty <= 0) {
        return res.status(400).json({ message: 'Write-off disposal quantity must be greater than zero.' })
      }
      if (prod) {
        const availableStock = Number(prod.currentStock) || 0
        if (availableStock <= 0) {
          return res.status(400).json({
            message: `Cannot write-off expired stock: "${prod.name}" has 0 available inventory in warehouse.`
          })
        }
        if (writeOffQty > availableStock) {
          return res.status(400).json({
            message: `Cannot write-off ${writeOffQty} ${prod.unit || 'Kg'}. Only ${availableStock} ${prod.unit || 'Kg'} is physically available in warehouse stock.`
          })
        }
      }
    } else if (Number(req.body.variance) < 0) {
      const deduction = Math.abs(Number(req.body.variance))
      if (prod) {
        const availableStock = Number(prod.currentStock) || 0
        if (availableStock <= 0) {
          return res.status(400).json({
            message: `Cannot deduct stock: "${prod.name}" is currently Out of Stock (0 ${prod.unit || 'Kg'} available).`
          })
        }
        if (deduction > availableStock) {
          return res.status(400).json({
            message: `Cannot deduct ${deduction} ${prod.unit || 'Kg'}. Only ${availableStock} ${prod.unit || 'Kg'} is physically available in warehouse stock.`
          })
        }
      }
    }

    const adj = new StockAdjustment(req.body)
    await adj.save()

    // If variance exists or hold/damage/expiry action, apply inventory changes
    if (adj.status === 'Approved / Executed' || adj.status === 'On Hold' || adj.status === 'Quarantine') {
      const variance = Number(adj.variance) || (Number(adj.adjustedQty) - Number(adj.previousQty)) || 0
      
      if (adj.type === 'Damage / Rejection') {
        // Damage reduces usable stock
        const damageQty = Number(adj.adjustedQty) || 0
        if (damageQty > 0 && prod) {
          prod.currentStock = Math.max(0, (prod.currentStock || 0) - damageQty)
          await prod.save()
        }
      } else if (adj.type === 'Expiry Write-Off') {
        // Expiry Write-Off permanently deducts stock and unfreezes quarantine
        const writeOffQty = Number(adj.adjustedQty) || 0
        if (writeOffQty > 0 && prod) {
          prod.currentStock = Math.max(0, (prod.currentStock || 0) - writeOffQty)
          prod.reservedQty = Math.max(0, (prod.reservedQty || 0) - writeOffQty)
          if (prod.currentStock === 0) {
            prod.status = 'Disposed / Expired'
          }
          await prod.save()
        }
      } else if (adj.type === 'Quality Hold') {
        // Quality Hold freezes stock and marks product On Hold
        const holdQty = Number(adj.adjustedQty) || 0
        if (prod) {
          prod.reservedQty = (prod.reservedQty || 0) + holdQty
          prod.labStatus = 'On Hold'
          await prod.save()
        }
      } else if (adj.type === 'Hold Release') {
        // Hold Release clears hold status and unfreezes reserved quantity
        const releaseQty = Number(adj.adjustedQty) || 0
        if (prod) {
          prod.reservedQty = Math.max(0, (prod.reservedQty || 0) - releaseQty)
          prod.labStatus = 'Passed'
          await prod.save()
        }
      } else if (variance !== 0) {
        if (!prod && adj.productId) prod = await Product.findById(adj.productId)
        if (!prod && adj.sku) prod = await Product.findOne({ sku: adj.sku.trim().toUpperCase() })
        if (!prod && adj.productName) prod = await Product.findOne({ name: new RegExp(`^${adj.productName.trim()}$`, 'i') })
        if (prod) {
          prod.currentStock = Math.max(0, (prod.currentStock || 0) + variance)
          await prod.save()
        }
      }

      // If locationCode provided, update cell stock
      if (adj.locationCode) {
        const rack = await Rack.findOne({ 'cells.code': adj.locationCode })
        if (rack) {
          const cell = rack.cells.find((c) => c.code === adj.locationCode)
          if (cell) {
            if (adj.type === 'Damage / Rejection') {
              cell.status = 'Blocked'
            } else if (adj.type === 'Quality Hold') {
              cell.status = 'Reserved'
            } else if (adj.type === 'Hold Release') {
              cell.status = 'Occupied'
            } else if (adj.type === 'Internal Transfer' && adj.targetLocationCode) {
              // Clear current cell
              const movedQty = cell.currentStock
              const pId = cell.productId
              const pName = cell.productName
              const bNo = cell.batchNo
              cell.status = 'Empty'
              cell.currentStock = 0
              cell.productId = null
              cell.productName = ''
              cell.batchNo = ''

              // Fill target cell
              const targetRack = await Rack.findOne({ 'cells.code': adj.targetLocationCode })
              if (targetRack) {
                const targetCell = targetRack.cells.find((c) => c.code === adj.targetLocationCode)
                if (targetCell) {
                  targetCell.status = 'Occupied'
                  targetCell.currentStock = movedQty
                  targetCell.productId = pId
                  targetCell.productName = pName
                  targetCell.batchNo = bNo
                  await targetRack.save()
                }
              }
            }
            await rack.save()
          }
        }
      }
    }

    res.status(201).json(adj)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PATCH /api/stock-adjust/:id/release — release a held item
router.patch('/:id/release', async (req, res) => {
  try {
    const { releaseReason, releasedBy } = req.body
    const adj = await StockAdjustment.findById(req.params.id)
    if (!adj) return res.status(404).json({ message: 'Hold record not found' })

    const officerName = releasedBy || 'Priya Patel (QC Lead)'
    const rReason = releaseReason || 'QC Re-inspection Passed & Clearance Granted'

    adj.releasedBy = officerName
    adj.releaseReason = rReason
    adj.releasedAt = new Date()
    adj.status = 'Released'
    adj.notes = (adj.notes ? adj.notes + ' | ' : '') + `RELEASED: ${rReason} by ${officerName}`
    await adj.save()

    // Unreserve product stock and restore labStatus
    let prod = null
    if (adj.productId) prod = await Product.findById(adj.productId)
    if (!prod && adj.sku) prod = await Product.findOne({ sku: adj.sku.trim().toUpperCase() })
    if (!prod && adj.productName) prod = await Product.findOne({ name: new RegExp(`^${adj.productName.trim()}$`, 'i') })

    if (prod) {
      const holdQty = Number(adj.adjustedQty) || 0
      prod.reservedQty = Math.max(0, (prod.reservedQty || 0) - holdQty)
      prod.labStatus = 'Passed'
      await prod.save()
    }

    // Unreserve cell
    if (adj.locationCode) {
      const rack = await Rack.findOne({ 'cells.code': adj.locationCode })
      if (rack) {
        const cell = rack.cells.find((c) => c.code === adj.locationCode)
        if (cell) {
          cell.status = 'Occupied'
          await rack.save()
        }
      }
    }

    res.json({ message: 'Hold released successfully', adjustment: adj })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// POST /api/stock-adjust/toggle-quarantine — lock/unlock expired or near-expiry batches in quarantine
router.post('/toggle-quarantine', async (req, res) => {
  try {
    const { productId, sku, productName, batchNo, quarantined, quantity, reason } = req.body

    let prod = null
    if (productId) prod = await Product.findById(productId)
    if (!prod && sku) prod = await Product.findOne({ sku: sku.trim().toUpperCase() })
    if (!prod && productName) prod = await Product.findOne({ name: new RegExp(`^${productName.trim()}$`, 'i') })

    if (!prod) {
      return res.status(404).json({ message: 'Target product not found in warehouse registry' })
    }

    const qty = Number(quantity) || prod.currentStock || 0

    if (quarantined) {
      // Lock in Quarantine
      prod.labStatus = 'Quarantine'
      prod.reservedQty = Math.min(prod.currentStock, (prod.reservedQty || 0) + qty)
      await prod.save()

      // Create an audit ledger record
      const adj = new StockAdjustment({
        type: 'Quality Hold',
        productId: prod._id,
        productName: prod.name,
        sku: prod.sku,
        batchNo: batchNo || prod.batchNo || '',
        locationCode: prod.binLocation || '',
        previousQty: prod.currentStock,
        adjustedQty: qty,
        unit: prod.baseUnit || 'Kg',
        reason: reason || 'Expired or Near-Expiry lot locked in Quarantine by inventory supervisor',
        reportedBy: 'Inventory Controller',
        status: 'Quarantine',
        notes: `Quarantine Lock applied for Batch ${batchNo || prod.batchNo || 'N/A'}`
      })
      await adj.save()

      return res.json({
        message: `Batch ${batchNo || prod.batchNo} is now LOCKED in Quarantine!`,
        quarantined: true,
        product: prod,
        adjustmentId: adj._id
      })
    } else {
      // Unlock from Quarantine
      prod.labStatus = 'Passed'
      prod.reservedQty = Math.max(0, (prod.reservedQty || 0) - qty)
      await prod.save()

      // Create release audit ledger
      const adj = new StockAdjustment({
        type: 'Hold Release',
        productId: prod._id,
        productName: prod.name,
        sku: prod.sku,
        batchNo: batchNo || prod.batchNo || '',
        locationCode: prod.binLocation || '',
        previousQty: prod.currentStock,
        adjustedQty: qty,
        unit: prod.baseUnit || 'Kg',
        reason: reason || 'Batch moved back from Quarantine to Active Stock',
        reportedBy: 'Inventory Controller',
        status: 'Released',
        notes: `Quarantine Lock released for Batch ${batchNo || prod.batchNo || 'N/A'}`
      })
      await adj.save()

      return res.json({
        message: `Batch ${batchNo || prod.batchNo} moved back to active stock.`,
        quarantined: false,
        product: prod,
        adjustmentId: adj._id
      })
    }
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
