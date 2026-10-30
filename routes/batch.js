const express = require('express')
const Batch = require('../models/Batch')
const Product = require('../models/Product')
const GRN = require('../models/GRN')

const router = express.Router()

// Auto-seed batches from existing GRN materials and Product models if collection is empty
async function autoSeedBatchesIfEmpty() {
  try {
    const count = await Batch.countDocuments()
    if (count > 0) return

    const [grns, products] = await Promise.all([
      GRN.find(),
      Product.find()
    ])

    const createdBatches = []
    const seenBatchNumbers = new Set()

    // 1. Seed from inwarded GRN materials
    for (const g of grns) {
      if (!g.materials || !Array.isArray(g.materials)) continue
      for (const m of g.materials) {
        const bNo = (m.batchNo || `BTH-${g.grnNo?.slice(-4) || '2026'}`).trim().toUpperCase()
        if (seenBatchNumbers.has(bNo)) continue
        seenBatchNumbers.add(bNo)

        const matchedProd = products.find(p => p.sku === m.sku || p.name === m.productName)

        const expDateStr = m.expiryDate || '2028-12-31'
        const expTime = new Date(expDateStr).getTime()
        const daysLeft = Math.round((expTime - Date.now()) / (1000 * 3600 * 24))
        let status = 'Active'
        if (daysLeft < 0) status = 'Expired'
        else if (daysLeft <= 60) status = 'Expiring Soon'

        createdBatches.push({
          batchNo: bNo,
          productId: matchedProd?._id || null,
          productName: m.productName || matchedProd?.name || 'Inward Commodity',
          sku: m.sku || matchedProd?.sku || 'SKU-GEN',
          mfgDate: m.mfgDate || new Date(g.createdAt || Date.now()).toISOString().split('T')[0],
          expiryDate: expDateStr,
          qty: m.packageQty || matchedProd?.currentStock || 100,
          unit: m.packagingUnit || matchedProd?.baseUnit || 'Bags',
          location: g.shade || matchedProd?.storageZone || 'Shade 1 (General Stores)',
          status,
          supplier: g.supplierName || 'Inward Vendor',
          grnNo: g.grnNo || ''
        })
      }
    }

    // 2. Also check registered products with lot/batch numbers
    for (const p of products) {
      if (p.batchNo && p.batchNo !== '—' && !seenBatchNumbers.has(p.batchNo.trim().toUpperCase())) {
        const bNo = p.batchNo.trim().toUpperCase()
        seenBatchNumbers.add(bNo)

        const expDateStr = p.expiryDate || '2028-12-31'
        const expTime = new Date(expDateStr).getTime()
        const daysLeft = Math.round((expTime - Date.now()) / (1000 * 3600 * 24))
        let status = 'Active'
        if (daysLeft < 0) status = 'Expired'
        else if (daysLeft <= 60) status = 'Expiring Soon'

        createdBatches.push({
          batchNo: bNo,
          productId: p._id,
          productName: p.name,
          sku: p.sku,
          mfgDate: p.mfgDate || new Date(p.createdAt || Date.now()).toISOString().split('T')[0],
          expiryDate: expDateStr,
          qty: p.currentStock || 100,
          unit: p.baseUnit || 'Kg',
          location: p.storageZone || 'Shade 1 (General Stores)',
          status
        })
      }
    }

    if (createdBatches.length > 0) {
      await Batch.insertMany(createdBatches).catch(() => {})
    }
  } catch (err) {
    console.warn('Batch auto-seed notice:', err.message)
  }
}

// GET all batches from MongoDB Atlas
router.get('/', async (req, res) => {
  try {
    await autoSeedBatchesIfEmpty()
    const batches = await Batch.find().sort({ createdAt: -1 })

    // Map dynamic days remaining for live accuracy
    const mapped = batches.map(b => {
      const expTime = new Date(b.expiryDate).getTime()
      const daysLeft = !isNaN(expTime) ? Math.round((expTime - Date.now()) / (1000 * 3600 * 24)) : 365
      let computedStatus = b.status
      if (computedStatus !== 'Quarantine') {
        if (daysLeft < 0) computedStatus = 'Expired'
        else if (daysLeft <= 60) computedStatus = 'Expiring Soon'
        else computedStatus = 'Active'
      }

      return {
        ...b.toObject(),
        daysLeft,
        status: computedStatus
      }
    })

    res.json(mapped)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create a new batch in MongoDB Atlas
router.post('/', async (req, res) => {
  try {
    const { batchNo, productName, sku, mfgDate, expiryDate, qty, unit, location, productId } = req.body

    if (!batchNo || !batchNo.trim()) {
      return res.status(400).json({ message: 'Batch Number is mandatory.' })
    }
    if (!productName || !productName.trim()) {
      return res.status(400).json({ message: 'Product Name is mandatory.' })
    }

    const cleanBatchNo = batchNo.trim().toUpperCase()

    // Check duplicate
    const existing = await Batch.findOne({ batchNo: cleanBatchNo })
    if (existing) {
      return res.status(400).json({ message: `Batch ${cleanBatchNo} already exists in warehouse registry.` })
    }

    // Locate product if not passed
    let prod = null
    if (productId) prod = await Product.findById(productId)
    if (!prod && sku) prod = await Product.findOne({ sku: sku.trim().toUpperCase() })
    if (!prod && productName) prod = await Product.findOne({ name: new RegExp(`^${productName.trim()}$`, 'i') })

    const expTime = new Date(expiryDate).getTime()
    const daysLeft = !isNaN(expTime) ? Math.round((expTime - Date.now()) / (1000 * 3600 * 24)) : 365
    let status = req.body.status || 'Active'
    if (status !== 'Quarantine') {
      if (daysLeft < 0) status = 'Expired'
      else if (daysLeft <= 60) status = 'Expiring Soon'
      else status = 'Active'
    }

    const batch = new Batch({
      batchNo: cleanBatchNo,
      productId: prod?._id || productId || null,
      productName: productName.trim(),
      sku: sku || prod?.sku || `SKU-${Date.now().toString().slice(-4)}`,
      mfgDate: mfgDate || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || '2028-12-31',
      qty: Math.max(1, Number(qty) || 100),
      unit: unit || prod?.baseUnit || 'Bags',
      location: location || prod?.storageZone || 'Shade 1 (General Stores)',
      status,
      notes: req.body.notes || ''
    })

    await batch.save()

    // Sync batch to Product if matched
    if (prod) {
      prod.batchNo = cleanBatchNo
      if (expiryDate) prod.expiryDate = expiryDate
      if (mfgDate) prod.mfgDate = mfgDate
      await prod.save().catch(() => {})
    }

    res.status(201).json(batch)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT update existing batch in MongoDB Atlas
router.put('/:id', async (req, res) => {
  try {
    const { batchNo, productName, sku, mfgDate, expiryDate, qty, unit, location, status } = req.body
    const updateData = {}
    if (batchNo) updateData.batchNo = batchNo.trim().toUpperCase()
    if (productName) updateData.productName = productName.trim()
    if (sku) updateData.sku = sku.trim().toUpperCase()
    if (mfgDate) updateData.mfgDate = mfgDate
    if (expiryDate) updateData.expiryDate = expiryDate
    if (qty !== undefined) updateData.qty = Math.max(1, Number(qty))
    if (unit) updateData.unit = unit
    if (location) updateData.location = location
    if (status) updateData.status = status

    const batch = await Batch.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true })
    if (!batch) return res.status(404).json({ message: 'Batch not found' })

    // Sync with product if available
    let prod = null
    if (batch.productId) prod = await Product.findById(batch.productId)
    if (!prod && batch.sku) prod = await Product.findOne({ sku: batch.sku })
    if (prod) {
      if (updateData.batchNo) prod.batchNo = updateData.batchNo
      if (updateData.expiryDate) prod.expiryDate = updateData.expiryDate
      if (updateData.mfgDate) prod.mfgDate = updateData.mfgDate
      await prod.save().catch(() => {})
    }

    res.json(batch)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE a batch from MongoDB Atlas
router.delete('/:id', async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id)
    if (!batch) return res.status(404).json({ message: 'Batch not found' })
    res.json({ message: `Batch ${batch.batchNo} deleted successfully.` })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

