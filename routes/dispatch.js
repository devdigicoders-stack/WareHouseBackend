const express = require('express')
const Dispatch = require('../models/Dispatch')
const Product = require('../models/Product')
const Rack = require('../models/Rack')

const router = express.Router()

// GET all dispatches
router.get('/', async (req, res) => {
  try {
    const dispatches = await Dispatch.find().sort({ createdAt: -1 })
    res.json(dispatches)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET single dispatch
router.get('/:id', async (req, res) => {
  try {
    const dispatch = await Dispatch.findById(req.params.id)
    if (!dispatch) return res.status(404).json({ message: 'Dispatch not found' })
    res.json(dispatch)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Helper to deduct stock when dispatch is finalized
async function processDispatchStockDeduction(items) {
  if (!Array.isArray(items)) return
  for (const item of items) {
    const qtyToDeduct = Number(item.pickedQty) || Number(item.requestedQty) || 0
    if (qtyToDeduct > 0) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { currentStock: -qtyToDeduct }
        })
      } else if (item.sku) {
        await Product.findOneAndUpdate(
          { sku: item.sku },
          { $inc: { currentStock: -qtyToDeduct } }
        )
      }

      // If locationCode provided, also deduct from cell
      if (item.locationCode) {
        const rack = await Rack.findOne({ 'cells.code': item.locationCode })
        if (rack) {
          const cell = rack.cells.find((c) => c.code === item.locationCode)
          if (cell) {
            cell.currentStock = Math.max(0, (cell.currentStock || 0) - qtyToDeduct)
            if (cell.currentStock === 0) {
              cell.status = 'Empty'
              cell.productId = null
              cell.productName = ''
              cell.batchNo = ''
            }
            await rack.save()
          }
        }
      }
    }
  }
}

// POST create dispatch order / picklist
router.post('/', async (req, res) => {
  try {
    const dispatch = new Dispatch(req.body)
    await dispatch.save()
    res.status(201).json(dispatch)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PATCH update status (e.g. 'Dispatched' or 'Gate Out / Cleared')
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, remarks } = req.body
    const existing = await Dispatch.findById(req.params.id)
    if (!existing) return res.status(404).json({ message: 'Dispatch not found' })

    const prevStatus = existing.status
    existing.status = status
    if (remarks) existing.remarks = remarks
    await existing.save()

    // When status changes to Dispatched, deduct inventory
    if (status === 'Dispatched' && prevStatus !== 'Dispatched' && prevStatus !== 'Gate Out / Cleared') {
      await processDispatchStockDeduction(existing.items)
    }

    res.json(existing)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// POST verify item QR scan
router.post('/:id/verify-item', async (req, res) => {
  try {
    const { sku, batchNo, locationCode } = req.body
    const dispatch = await Dispatch.findById(req.params.id)
    if (!dispatch) return res.status(404).json({ message: 'Dispatch not found' })

    const item = dispatch.items.find(
      (i) => (i.sku === sku || !sku) && (i.batchNo === batchNo || !batchNo)
    )
    if (item) {
      item.verified = true
      item.pickedQty = item.requestedQty
      if (locationCode) item.locationCode = locationCode
      await dispatch.save()
      return res.json({ message: 'Item verified successfully', dispatch })
    }

    res.status(404).json({ message: 'Item matching scan not found in this dispatch order' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT update dispatch
router.put('/:id', async (req, res) => {
  try {
    const updated = await Dispatch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!updated) return res.status(404).json({ message: 'Dispatch not found' })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE dispatch
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Dispatch.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Dispatch not found' })
    res.json({ message: 'Dispatch deleted successfully', id: req.params.id })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
