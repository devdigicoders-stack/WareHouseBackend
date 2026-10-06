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
    const { adjustedQty, type, reason } = req.body

    if (adjustedQty !== undefined && Number(adjustedQty) < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative in warehouse adjustments' })
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Adjustment reason / root cause notes are mandatory' })
    }

    const adj = new StockAdjustment(req.body)
    await adj.save()

    // If variance exists and is approved, update product stock
    if (adj.status === 'Approved / Executed') {
      const variance = Number(adj.variance) || (Number(adj.adjustedQty) - Number(adj.previousQty)) || 0
      
      if (adj.type === 'Damage / Rejection') {
        // Damage reduces usable stock
        const damageQty = Number(adj.adjustedQty) || 0
        if (damageQty > 0) {
          if (adj.productId) {
            await Product.findByIdAndUpdate(adj.productId, { $inc: { currentStock: -damageQty } })
          } else if (adj.sku) {
            await Product.findOneAndUpdate({ sku: adj.sku }, { $inc: { currentStock: -damageQty } })
          }
        }
      } else if (variance !== 0) {
        if (adj.productId) {
          await Product.findByIdAndUpdate(adj.productId, { $inc: { currentStock: variance } })
        } else if (adj.sku) {
          await Product.findOneAndUpdate({ sku: adj.sku }, { $inc: { currentStock: variance } })
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

module.exports = router
