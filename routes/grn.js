const express = require('express')
const GRN = require('../models/GRN')
const Product = require('../models/Product')

const router = express.Router()

// GET /api/grn — fetch all GRNs (latest first)
router.get('/', async (req, res) => {
  try {
    const grns = await GRN.find().sort({ createdAt: -1 })
    res.json(grns)
  } catch {
    res.status(500).json({ message: 'Server error fetching GRNs' })
  }
})

// GET /api/grn/:id — fetch single GRN
router.get('/:id', async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id)
    if (!grn) return res.status(404).json({ message: 'GRN not found' })
    res.json(grn)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// Helper to update product stocks for completed GRN
async function applyStockUpdates(materials, defaultShade = '') {
  if (!Array.isArray(materials)) return
  for (const item of materials) {
    const qtyToAdd = Number(item.totalBaseQty) || (Number(item.packageQty) * (Number(item.packSize) || 1)) || Number(item.packageQty) || 0
    const updateFields = {
      status: 'Active',
      labStatus: 'Quarantine / Under Test',
    }
    if (item.batchNo) updateFields.batchNo = item.batchNo
    if (item.mfgDate) updateFields.mfgDate = item.mfgDate
    if (item.expiryDate) updateFields.expiryDate = item.expiryDate
    if (item.baseUnit) updateFields.baseUnit = item.baseUnit
    if (item.packagingUnit) updateFields.outerPackaging = item.packagingUnit
    if (item.packSize) updateFields.packSize = Number(item.packSize)
    if (item.location) updateFields.binLocation = item.location
    if (defaultShade) {
      updateFields.storageZone = defaultShade
      const shadeCodeMatch = defaultShade.match(/SH-?\d{1,2}/i)
      if (shadeCodeMatch) updateFields.shadeId = shadeCodeMatch[0].toUpperCase()
    }

    let updated = null
    if (item.productId) {
      try {
        updated = await Product.findByIdAndUpdate(item.productId, {
          $inc: { currentStock: qtyToAdd },
          $set: updateFields,
        }, { new: true })
      } catch {}
    }

    if (!updated && item.sku && item.sku.trim()) {
      updated = await Product.findOneAndUpdate(
        { sku: item.sku.trim().toUpperCase() },
        { $inc: { currentStock: qtyToAdd }, $set: updateFields },
        { new: true }
      )
    }

    if (!updated && item.productName && item.productName.trim()) {
      updated = await Product.findOneAndUpdate(
        { name: new RegExp(`^${item.productName.trim()}$`, 'i') },
        { $inc: { currentStock: qtyToAdd }, $set: updateFields },
        { new: true }
      )
    }

    // If product does not exist yet in catalogue, automatically create it
    if (!updated && (item.productName || item.sku)) {
      const pName = (item.productName && item.productName.trim()) || item.sku || 'Received Material'
      const pSku = (item.sku && item.sku.trim()) ? item.sku.trim().toUpperCase() : `PRD-${Date.now().toString().slice(-6)}`
      const sZone = defaultShade || 'SH-01 (Shade 1: General Stores)'
      const shadeCodeMatch = sZone.match(/SH-?\d{1,2}/i)
      const sId = shadeCodeMatch ? shadeCodeMatch[0].toUpperCase() : 'SH-01'

      const newProd = new Product({
        name: pName,
        sku: pSku,
        category: item.category || 'General Goods',
        brand: item.brand || 'Commercial Grade',
        baseUnit: item.baseUnit || 'Kg',
        outerPackaging: item.packagingUnit || 'Packs',
        packSize: Number(item.packSize) || 1,
        currentStock: qtyToAdd,
        reorderLevel: 50,
        storageZone: sZone,
        shadeId: sId,
        binLocation: item.location || '',
        batchNo: item.batchNo || '',
        expiryDate: item.expiryDate || '',
        mfgDate: item.mfgDate || '',
        labStatus: 'Quarantine / Under Test',
        status: 'Active',
      })
      await newProd.save().catch(() => {})
    }
  }
}

// POST /api/grn — create new GRN
router.post('/', async (req, res) => {
  try {
    const { materials } = req.body
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ message: 'At least 1 material item is required' })
    }

    for (let i = 0; i < materials.length; i++) {
      const item = materials[i]
      if (!item.mfgDate || !item.mfgDate.trim()) {
        return res.status(400).json({
          message: `Manufacturing Date (mfgDate) is mandatory for Item #${i + 1} (${item.productName || 'Material'})`,
        })
      }
      if (!item.expiryDate || !item.expiryDate.trim()) {
        return res.status(400).json({
          message: `Expiry Date (expiryDate) is mandatory for Item #${i + 1} (${item.productName || 'Material'})`,
        })
      }
      if (new Date(item.expiryDate) < new Date(item.mfgDate)) {
        return res.status(400).json({
          message: `Expiry Date cannot be before Manufacturing Date for Item #${i + 1}`,
        })
      }
    }

    const grn = new GRN(req.body)
    await grn.save()

    // If already Completed, increment stock in Product catalog
    if (grn.status === 'Completed' && grn.materials && grn.materials.length > 0) {
      await applyStockUpdates(grn.materials, grn.shade)
    }

    res.status(201).json(grn)
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to create GRN' })
  }
})

// PATCH /api/grn/:id/status — update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const existing = await GRN.findById(req.params.id)
    if (!existing) return res.status(404).json({ message: 'GRN not found' })

    const prevStatus = existing.status
    existing.status = status
    await existing.save()

    // If changed to Completed from another status, update product stock
    if (status === 'Completed' && prevStatus !== 'Completed') {
      await applyStockUpdates(existing.materials, existing.shade)
    }

    res.json(existing)
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update GRN' })
  }
})

// POST /api/grn/allocate-item — allocate put-away location for a material item in GRN
router.post('/allocate-item', async (req, res) => {
  try {
    const { grnNo, batchNo, sku, cellCode, shade, row, col, productName } = req.body
    if (!grnNo || !cellCode) {
      return res.status(400).json({ message: 'grnNo and cellCode are required' })
    }

    const grn = await GRN.findOne({ grnNo })
    if (!grn) return res.status(404).json({ message: `GRN ${grnNo} not found` })

    let itemFound = false
    if (grn.materials && grn.materials.length > 0) {
      for (const mat of grn.materials) {
        if (
          (batchNo && mat.batchNo === batchNo) ||
          (sku && mat.sku && mat.sku.toUpperCase() === sku.toUpperCase()) ||
          (productName && mat.productName && mat.productName.toLowerCase() === productName.toLowerCase())
        ) {
          mat.location = cellCode
          mat.putAwayStatus = 'Completed'
          mat.putAwayAt = new Date()
          itemFound = true
          break
        }
      }
      // If none explicitly matched, allocate first pending item
      if (!itemFound && grn.materials.length > 0) {
        grn.materials[0].location = cellCode
        grn.materials[0].putAwayStatus = 'Completed'
        grn.materials[0].putAwayAt = new Date()
      }
      await grn.save()
    }

    // Sync location into Product catalog
    const prodQuery = []
    if (sku) prodQuery.push({ sku: sku.trim().toUpperCase() })
    if (productName) prodQuery.push({ name: new RegExp(`^${productName.trim()}$`, 'i') })
    if (prodQuery.length > 0) {
      await Product.updateMany(
        { $or: prodQuery },
        {
          $set: {
            binLocation: cellCode,
            shadeId: shade || cellCode.split('-')[0] || '',
            row: row || cellCode.split('-')[1] || 'R01',
            col: col || cellCode.split('-')[2] || 'C01',
          },
        }
      ).catch(() => {})
    }

    res.json({ message: `Item allocated to ${cellCode} successfully`, grn })
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to allocate GRN item' })
  }
})

// DELETE /api/grn/:id — delete GRN
router.delete('/:id', async (req, res) => {
  try {
    const grn = await GRN.findByIdAndDelete(req.params.id)
    if (!grn) return res.status(404).json({ message: 'GRN not found' })
    res.json({ message: 'GRN deleted successfully' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
