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

    // Parse shade number, rack number, row, col from any format like SH-01-R01-C01 or SH-01-RK-01-R1-C1
    const sMatch = cellCode.match(/SH[-_]?0?(\d+)/i)
    const rkMatch = cellCode.match(/RK[-_]?0?(\d+)/i)
    const rMatch = cellCode.match(/R0?(\d+)/i)
    const cMatch = cellCode.match(/C0?(\d+)/i)

    const shadeNum = sMatch ? parseInt(sMatch[1]) : 1
    const rkNum = rkMatch ? parseInt(rkMatch[1]) : 1
    const rNum = rMatch ? parseInt(rMatch[1]) : 1
    const cNum = cMatch ? parseInt(cMatch[1]) : 1

    const shadeRegex = new RegExp(`SH[-_]?0?${shadeNum}`, 'i')
    const rackRegex = new RegExp(`RK[-_]?0?${rkNum}`, 'i')

    let rack = await Rack.findOne({ 'cells.code': cellCode })
    let cell = null

    if (rack) {
      cell = rack.cells.find((c) => c.code === cellCode)
    }

    if (!cell) {
      // Find rack by shadeCode AND rackNumber
      rack = await Rack.findOne({ shadeCode: shadeRegex, rackNumber: rackRegex })
      if (!rack) {
        rack = await Rack.findOne({ shadeCode: shadeRegex })
      }
      if (!rack) {
        rack = await Rack.findOne()
      }

      if (rack && rack.cells && rack.cells.length > 0) {
        cell = rack.cells.find((c) => c.row === rNum && c.col === cNum) || rack.cells[0]
      }
    }

    if (cell && rack) {
      cell.status = 'Occupied'
      cell.code = `${rack.shadeCode}-${rack.rackNumber}-R${cell.row}-C${cell.col}`
      cell.productId = productId || cell.productId
      cell.productName = productName || cell.productName
      cell.batchNo = batchNo || cell.batchNo
      cell.currentStock = Number(quantity) || cell.currentStock || 1
      rack.markModified('cells')
      await rack.save()
    }

    // Sync Product model if productName provided
    if (productName) {
      const Product = require('../models/Product')
      await Product.updateMany(
        { $or: [{ name: productName }, { batchNo: batchNo || '' }] },
        { $set: { binLocation: cellCode, shadeId: `SH0${shadeNum}`, row: `R0${rNum}`, col: `C0${cNum}` } }
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
