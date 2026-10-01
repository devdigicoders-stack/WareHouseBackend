const express = require('express')
const Partner = require('../models/Partner')

const router = express.Router()

// GET all partners (optional ?type=Supplier or Customer)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.type ? { type: req.query.type } : {}
    const partners = await Partner.find(filter).sort({ name: 1 })
    res.json(partners)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create partner
router.post('/', async (req, res) => {
  try {
    const partner = new Partner(req.body)
    await partner.save()
    res.status(201).json(partner)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT update partner
router.put('/:id', async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!partner) return res.status(404).json({ message: 'Partner not found' })
    res.json(partner)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE partner
router.delete('/:id', async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id)
    if (!partner) return res.status(404).json({ message: 'Partner not found' })
    res.json({ message: 'Partner deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
