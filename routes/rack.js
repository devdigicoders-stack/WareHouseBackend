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

// Get all cells across all racks
router.get('/cells/all', async (req, res) => {
  try {
    const racks = await Rack.find().populate('shadeId')
    const allCells = []
    racks.forEach((rack) => {
      if (rack.cells && Array.isArray(rack.cells)) {
        rack.cells.forEach((cell) => {
          allCells.push({
            rackId: rack._id,
            rackNumber: rack.rackNumber,
            shadeId: rack.shadeId,
            shadeCode: rack.shadeCode,
            ...cell.toObject(),
          })
        })
      }
    })
    res.json(allCells)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Allocate stock to a cell by cellCode
router.post('/allocate-cell', async (req, res) => {
  try {
    const { cellCode, productId, productName, batchNo, quantity } = req.body
    if (!cellCode) return res.status(400).json({ message: 'cellCode is required' })

    let rack = await Rack.findOne({ 'cells.code': cellCode })
    let cell = null

    if (rack) {
      cell = rack.cells.find((c) => c.code === cellCode)
    } else {
      // Extract shade prefix (e.g. "SH01" from "SH01-R01-C01" or "SH-01-R01-C01")
      const cleanShade = cellCode.split('-')[0].replace(/[^a-zA-Z0-9]/g, '')
      rack = await Rack.findOne({ $or: [{ shadeCode: cleanShade }, { shadeCode: new RegExp(cleanShade, 'i') }] })

      if (!rack) {
        // Find any active shade or rack
        rack = await Rack.findOne()
      }

      if (rack) {
        // Try finding cell by row/col numbers or add cell
        const parts = cellCode.split('-')
        const rNum = parseInt((parts[parts.length - 2] || '1').replace(/\D/g, '')) || 1
        const cNum = parseInt((parts[parts.length - 1] || '1').replace(/\D/g, '')) || 1
        cell = rack.cells.find((c) => c.row === rNum && c.col === cNum) || rack.cells[0]
      }
    }

    if (cell && rack) {
      cell.status = 'Occupied'
      cell.productId = productId || cell.productId
      cell.productName = productName || cell.productName
      cell.batchNo = batchNo || cell.batchNo
      cell.currentStock = Number(quantity) || cell.currentStock || 1
      await rack.save()
    }

    // Sync Product model if productName provided
    if (productName) {
      const Product = require('../models/Product')
      await Product.updateMany(
        { $or: [{ name: productName }, { batchNo: batchNo || '' }] },
        { $set: { binLocation: cellCode } }
      ).catch(() => {})
    }

    res.json({ message: `Cell ${cellCode} allocated successfully`, cell, rack })
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
