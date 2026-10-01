const express = require('express')
const QualityCheck = require('../models/QualityCheck')

const router = express.Router()

// GET all QC records
router.get('/', async (req, res) => {
  try {
    const records = await QualityCheck.find().sort({ createdAt: -1 })
    res.json(records)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET single QC record
router.get('/:id', async (req, res) => {
  try {
    const record = await QualityCheck.findById(req.params.id)
    if (!record) return res.status(404).json({ message: 'QC Record not found' })
    res.json(record)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create QC record
router.post('/', async (req, res) => {
  try {
    const qc = new QualityCheck(req.body)
    await qc.save()
    res.status(201).json(qc)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PATCH update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, remarks } = req.body
    const record = await QualityCheck.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(remarks && { remarks }) },
      { new: true }
    )
    if (!record) return res.status(404).json({ message: 'QC Record not found' })
    res.json(record)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

module.exports = router
