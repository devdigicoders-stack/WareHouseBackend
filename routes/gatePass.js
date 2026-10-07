const express = require('express')
const router = express.Router()
const GatePass = require('../models/GatePass')
const Dispatch = require('../models/Dispatch')

// GET all gate passes
router.get('/', async (req, res) => {
  try {
    const { type, status, search } = req.query
    const query = {}
    if (type && type !== 'ALL') query.passType = type
    if (status && status !== 'ALL') query.status = status
    if (search) {
      query.$or = [
        { passNo: { $regex: search, $options: 'i' } },
        { vehicleNo: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { receiverName: { $regex: search, $options: 'i' } },
        { refNo: { $regex: search, $options: 'i' } },
        { dispatchNo: { $regex: search, $options: 'i' } },
      ]
    }

    const passes = await GatePass.find(query).sort({ createdAt: -1 })
    res.json(passes)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET single pass by ID
router.get('/:id', async (req, res) => {
  try {
    const pass = await GatePass.findById(req.params.id)
    if (!pass) return res.status(404).json({ message: 'Gate pass not found' })
    res.json(pass)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create gate pass
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body }

    const isOutward = data.passType === 'Material Outward' || data.passType === 'Commercial Issue'

    let linkedDispatch = null
    if (data.dispatchId) {
      linkedDispatch = await Dispatch.findById(data.dispatchId)
    } else if (data.dispatchNo) {
      linkedDispatch = await Dispatch.findOne({ dispatchNo: data.dispatchNo })
    } else if (data.refNo) {
      linkedDispatch = await Dispatch.findOne({
        $or: [{ dispatchNo: data.refNo }, { orderNo: data.refNo }]
      })
    }

    // STRICT VALIDATION: For Outward Gate Pass, an authorized Dispatch Slip MUST exist!
    if (isOutward && !linkedDispatch) {
      return res.status(400).json({
        message: 'Validation Error: An authorized Dispatch Order Slip is required before issuing a Gate Pass for outward material. Please ensure the dispatch order is created first in the Outward Issue module.'
      })
    }

    if (linkedDispatch) {
      data.dispatchId = linkedDispatch._id
      data.dispatchNo = linkedDispatch.dispatchNo
      if (!data.vehicleNo) data.vehicleNo = linkedDispatch.vehicleNo
      if (!data.driverName) data.driverName = linkedDispatch.driverName
      if (!data.receiverName) data.receiverName = linkedDispatch.customerName
      if (!data.receiverAddress) data.receiverAddress = linkedDispatch.destination
      if (!data.refNo) data.refNo = linkedDispatch.orderNo
      linkedDispatch.status = 'Gate Out / Cleared'
      await linkedDispatch.save()
    }

    // Auto-calculate totals
    if (Array.isArray(data.materials)) {
      data.totalQty = data.materials.reduce((sum, m) => sum + (Number(m.qty) || 0), 0)
      data.totalPacks = data.materials.reduce((sum, m) => sum + (Number(m.packQty) || 0), 0)
    }

    const gatePass = new GatePass(data)
    await gatePass.save()
    res.status(201).json(gatePass)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PATCH update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, remarks } = req.body
    const pass = await GatePass.findById(req.params.id)
    if (!pass) return res.status(404).json({ message: 'Gate pass not found' })

    pass.status = status || pass.status
    if (remarks) pass.remarks = remarks
    await pass.save()

    // If linked to dispatch and departed, sync dispatch status
    if (pass.dispatchId && (status === 'Departed' || status === 'Gate Out / Cleared')) {
      await Dispatch.findByIdAndUpdate(pass.dispatchId, { status: 'Gate Out / Cleared' })
    }

    res.json(pass)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE gate pass
router.delete('/:id', async (req, res) => {
  try {
    const pass = await GatePass.findByIdAndDelete(req.params.id)
    if (!pass) return res.status(404).json({ message: 'Gate pass not found' })
    res.json({ message: 'Gate pass deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
