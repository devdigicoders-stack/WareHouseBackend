const express = require('express')
const Product = require('../models/Product')

const router = express.Router()

// GET /api/product — all products
router.get('/', async (req, res) => {
  try {
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
