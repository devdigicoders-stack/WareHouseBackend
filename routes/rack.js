const express = require('express')
const router = express.Router()
const Rack = require('../models/Rack')
const Shade = require('../models/Shade')

// Get all racks (optionally filter by shadeId)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.shadeId ? { shadeId: req.query.shadeId } : {}
    const racks = await Rack.find(filter).sort({ rackNumber: 1 })
    res.json(racks)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get single rack
router.get('/:id', async (req, res) => {
  try {
    const rack = await Rack.findById(req.params.id)
    if (!rack) return res.status(404).json({ message: 'Rack not found' })
    res.json(rack)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Create rack (cells auto-generated via pre-save hook)
router.post('/', async (req, res) => {
  try {
    const shade = await Shade.findById(req.body.shadeId)
    if (!shade) return res.status(404).json({ message: 'Shade not found' })

    const rack = new Rack({
      ...req.body,
      shadeCode: shade.code,
    })
    const saved = await rack.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// Update rack metadata (not cells)
router.put('/:id', async (req, res) => {
  try {
    const { cells, ...updateData } = req.body
    const updated = await Rack.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
    if (!updated) return res.status(404).json({ message: 'Rack not found' })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// Update a specific cell inside a rack
router.patch('/:id/cell', async (req, res) => {
  try {
    const { cellCode, ...cellUpdate } = req.body
    const rack = await Rack.findById(req.params.id)
    if (!rack) return res.status(404).json({ message: 'Rack not found' })

    const cell = rack.cells.find((c) => c.code === cellCode)
    if (!cell) return res.status(404).json({ message: 'Cell not found' })

    Object.assign(cell, cellUpdate)
    await rack.save()
    res.json(rack)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// Delete rack
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Rack.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Rack not found' })
    res.json({ message: 'Rack deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
