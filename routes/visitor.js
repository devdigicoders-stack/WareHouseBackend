const express = require('express')
const Visitor = require('../models/Visitor')

const router = express.Router()

// GET /api/visitor — fetch all visitor records (latest first)
router.get('/', async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ createdAt: -1 })
    res.json(visitors)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error fetching visitors' })
  }
})

// GET /api/visitor/:id — fetch single visitor
router.get('/:id', async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' })
    res.json(visitor)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// POST /api/visitor — register new visitor
router.post('/', async (req, res) => {
  try {
    const { visitorName, contactNo, company, purpose, personToMeet, idProof, idNumber, remarks } = req.body

    if (!visitorName || !visitorName.trim()) {
      return res.status(400).json({ message: 'Visitor Name is required' })
    }

    const cleanPhone = (contactNo || '').replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ message: 'Contact Phone Number must be exactly 10 digits' })
    }

    const visitor = new Visitor({
      visitorName: visitorName.trim(),
      contactNo: cleanPhone,
      company: (company || 'Direct Client Representative').trim(),
      purpose: purpose || 'Material Inspection',
      personToMeet: personToMeet || 'Anil Sharma (Warehouse Manager)',
      idProof: idProof || 'Aadhaar Card',
      idNumber: (idNumber || 'VERIFIED-ON-GATE').trim(),
      status: req.body.status || 'Inside',
      remarks: remarks || '',
      validTill: req.body.validTill || 'Today, 06:00 PM',
      entryTime: new Date(),
    })

    await visitor.save()
    res.status(201).json(visitor)
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to register visitor' })
  }
})

// PATCH /api/visitor/:id/checkout — mark visitor as checked out
router.patch('/:id/checkout', async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Checked Out',
        exitTime: new Date(),
      },
      { new: true }
    )
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' })
    res.json(visitor)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// PATCH /api/visitor/:id/status — update visitor status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, remarks } = req.body || {}
    const updateData = {}
    if (status) {
      updateData.status = status
      if (status === 'Checked Out') {
        updateData.exitTime = new Date()
      } else if (status === 'Inside') {
        updateData.exitTime = null
      }
    }
    if (remarks) updateData.remarks = remarks

    const visitor = await Visitor.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' })
    res.json(visitor)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// DELETE /api/visitor/:id — delete visitor record
router.delete('/:id', async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id)
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' })
    res.json({ message: 'Visitor deleted successfully', visitor })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

module.exports = router
