const express = require('express')
const Product = require('../models/Product')
const GRN = require('../models/GRN')

const router = express.Router()

// Auto-sync completed GRN items to ensure no inwarded items are missing from Product catalog
async function syncInwardedGrnProducts() {
  try {
    const grns = await GRN.find({ status: 'Completed' })
    for (const g of grns) {
      if (!g.materials || !Array.isArray(g.materials)) continue
      for (const m of g.materials) {
        if (!m.productName && !m.sku) continue
        const qty = Number(m.totalBaseQty) || (Number(m.packageQty) * (Number(m.packSize) || 1)) || Number(m.packageQty) || 0
        const query = []
        if (m.sku && m.sku.trim()) query.push({ sku: m.sku.trim().toUpperCase() })
        if (m.productName && m.productName.trim()) query.push({ name: new RegExp(`^${m.productName.trim()}$`, 'i') })

        let prod = query.length > 0 ? await Product.findOne({ $or: query }) : null
        const sZone = g.shade || 'SH-01 (Shade 1: General Stores)'
        const shadeCodeMatch = sZone.match(/SH-?\d{1,2}/i)
        const sId = shadeCodeMatch ? shadeCodeMatch[0].toUpperCase() : 'SH-01'

        if (!prod) {
          // Create product in catalog
          const newSku = (m.sku && m.sku.trim()) ? m.sku.trim().toUpperCase() : `PRD-${Date.now().toString().slice(-6)}`
          prod = new Product({
            name: m.productName || m.sku,
            sku: newSku,
            category: 'General Goods',
            brand: 'Commercial Grade',
            baseUnit: m.baseUnit || 'Kg',
            outerPackaging: m.packagingUnit || 'Packs',
            packSize: Number(m.packSize) || 1,
            currentStock: qty,
            reorderLevel: 50,
            storageZone: sZone,
            shadeId: sId,
            binLocation: m.location || '',
            batchNo: m.batchNo || '',
            expiryDate: m.expiryDate || '',
            mfgDate: m.mfgDate || '',
            labStatus: 'Quarantine / Under Test',
            status: 'Active',
          })
          await prod.save().catch(() => {})
        } else {
          // Update product if stock is 0 or batch/location is missing
          const updates = {}
          if (prod.currentStock === 0 && qty > 0) {
            updates.currentStock = qty
          }
          if (m.batchNo && (!prod.batchNo || prod.batchNo === '—')) {
            updates.batchNo = m.batchNo
          }
          if (m.location && !prod.binLocation) {
            updates.binLocation = m.location
          }
          if (m.expiryDate && !prod.expiryDate) {
            updates.expiryDate = m.expiryDate
          }
          if (m.mfgDate && !prod.mfgDate) {
            updates.mfgDate = m.mfgDate
          }
          if (Object.keys(updates).length > 0) {
            await Product.findByIdAndUpdate(prod._id, { $set: updates }).catch(() => {})
          }
        }
      }
    }
  } catch (err) {
    console.warn('Inward GRN auto-sync notice:', err.message)
  }
}

// GET /api/product — all products (with automatic inward sync)
router.get('/', async (req, res) => {
  try {
    await syncInwardedGrnProducts()
    const products = await Product.find().sort({ createdAt: -1 })
    res.json(products)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/product — create product
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body }
    if (!data.labStatus) {
      data.labStatus = 'Pending QC'
    }
    if (!data.labCertNo) {
      data.labCertNo = ''
    }
    if (data.currentStock === undefined || data.currentStock === null) {
      data.currentStock = 0
    }
    const product = new Product(data)
    await product.save()
    res.status(201).json(product)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT /api/product/:id — update product
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json(product)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE /api/product/:id — delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ message: 'Product deleted' })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
