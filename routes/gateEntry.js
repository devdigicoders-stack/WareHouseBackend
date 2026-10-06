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
    const { vehicleNumber, driverContact, challanNo, remarks, officerRemark } = req.body

    // 1. Phone number validation (10 digits)
    const cleanPhone = (driverContact || '').replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ message: 'Driver phone number must be exactly 10 digits' })
    }

    // 2. Challan / PO validation
    if (!challanNo || challanNo.trim().length < 3) {
      return res.status(400).json({ message: 'Valid Challan / PO number is required (min 3 chars)' })
    }

    // 3. Duplicate vehicle check: prevent duplicate entry if vehicle is already inside
    const cleanVehicleNo = (vehicleNumber || '').trim().toUpperCase()
    const activeEntry = await GateEntry.findOne({
      vehicleNumber: cleanVehicleNo,
      status: { $ne: 'Gate Out / Cleared' },
    })

    if (activeEntry) {
      return res.status(400).json({
        message: `Vehicle ${cleanVehicleNo} is already inside warehouse premises (Pass: ${activeEntry.passNumber}). Clear Gate Out first before re-entry.`,
      })
    }

    const entry = new GateEntry({
      ...req.body,
      vehicleNumber: cleanVehicleNo,
      officerRemark: officerRemark || remarks || '',
    })
    await entry.save()
    res.status(201).json(entry)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PATCH /api/gate-entry/:id/gate-out — mark vehicle as gate out with officer details & remarks
router.patch('/:id/gate-out', async (req, res) => {
  try {
    const { remark, gateOutRemark, officerName, gateOutOfficerName, officerId, gateOutOfficerId } = req.body || {}
    const outRemark = gateOutRemark || remark || ''
    const outOfficer = gateOutOfficerName || officerName || 'Security Officer'
    const outId = gateOutOfficerId || officerId || 'SEC-01'

    const entry = await GateEntry.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Gate Out / Cleared',
        outTime: new Date(),
        gateOutRemark: outRemark,
        gateOutOfficerName: outOfficer,
        gateOutOfficerId: outId,
      },
      { new: true }
    )
    if (!entry) return res.status(404).json({ message: 'Entry not found' })
    res.json(entry)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

module.exports = router
