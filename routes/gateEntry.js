const express = require('express')
const GateEntry = require('../models/GateEntry')

const router = express.Router()

// GET /api/gate-entry — fetch all entries (latest first)
router.get('/', async (req, res) => {
  try {
    const entries = await GateEntry.find().sort({ createdAt: -1 })
    res.json(entries)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/gate-entry — create new gate entry
router.post('/', async (req, res) => {
  try {
    const entry = new GateEntry(req.body)
    await entry.save()
    res.status(201).json(entry)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PATCH /api/gate-entry/:id/gate-out — mark vehicle as gate out
router.patch('/:id/gate-out', async (req, res) => {
  try {
    const entry = await GateEntry.findByIdAndUpdate(
      req.params.id,
      { status: 'Gate Out / Cleared', outTime: new Date() },
      { new: true }
    )
    if (!entry) return res.status(404).json({ message: 'Entry not found' })
    res.json(entry)
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
