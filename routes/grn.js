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
async function applyStockUpdates(materials) {
  if (!Array.isArray(materials)) return
  for (const item of materials) {
    const qtyToAdd = Number(item.totalBaseQty) || Number(item.packageQty) || 0
    const updateFields = {
      status: 'Active',
      labStatus: 'Quarantine / Under Test',
    }
    if (item.batchNo) updateFields.batchNo = item.batchNo
    if (item.mfgDate) updateFields.mfgDate = item.mfgDate
    if (item.expiryDate) updateFields.expiryDate = item.expiryDate

    if (item.productId) {
      if (qtyToAdd > 0) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { currentStock: qtyToAdd },
          $set: updateFields,
        })
      }
    } else if (item.sku) {
      if (qtyToAdd > 0) {
        await Product.findOneAndUpdate(
          { sku: item.sku },
          { $inc: { currentStock: qtyToAdd }, $set: updateFields }
        )
      }
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
      await applyStockUpdates(grn.materials)
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
      await applyStockUpdates(existing.materials)
    }

    res.json(existing)
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update GRN' })
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
