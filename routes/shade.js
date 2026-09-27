const express = require('express')
const router = express.Router()
const Shade = require('../models/Shade')

router.get('/', async (req, res) => {
  try {
    const shades = await Shade.find().sort({ createdAt: 1 })
    res.json(shades)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const shade = new Shade(req.body)
    const saved = await shade.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const updated = await Shade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!updated) return res.status(404).json({ message: 'Shade not found' })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Shade.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Shade not found' })
    res.json({ message: 'Shade deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
