const express = require('express')
const StockMovement = require('../models/StockMovement')
const Rack = require('../models/Rack')
const Product = require('../models/Product')

const router = express.Router()

// Helper to find and update a cell by location code
async function findCellByLocation(locationCode) {
  if (!locationCode) return { rack: null, cell: null }

  const sMatch = locationCode.match(/SH[-_]?0?(\d+)/i)
  const rkMatch = locationCode.match(/RK[-_]?0?(\d+)/i)
  const rMatch = locationCode.match(/R0?(\d+)/i)
  const cMatch = locationCode.match(/C0?(\d+)/i)

  const shadeNum = sMatch ? parseInt(sMatch[1]) : 1
  const rkNum = rkMatch ? parseInt(rkMatch[1]) : 1
  const rNum = rMatch ? parseInt(rMatch[1]) : 1
  const cNum = cMatch ? parseInt(cMatch[1]) : 1

  const shadeRegex = new RegExp(`SH[-_]?0?${shadeNum}`, 'i')
  const rackRegex = new RegExp(`RK[-_]?0?${rkNum}`, 'i')

  let rack = await Rack.findOne({ 'cells.code': locationCode })
  let cell = null

  if (rack) {
    cell = rack.cells.find((c) => c.code === locationCode)
  }

  if (!cell) {
    rack = await Rack.findOne({ shadeCode: shadeRegex, rackNumber: rackRegex })
    if (!rack) rack = await Rack.findOne({ shadeCode: shadeRegex })
    if (!rack) rack = await Rack.findOne()

    if (rack && rack.cells && rack.cells.length > 0) {
      cell = rack.cells.find((c) => c.row === rNum && c.col === cNum) || rack.cells[0]
    }
  }

  return { rack, cell }
}

// GET /api/stock-movement — fetch all recorded stock movements
router.get('/', async (req, res) => {
  try {
    const movements = await StockMovement.find().sort({ createdAt: -1 })
    res.json(movements)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch stock movements' })
  }
})

// POST /api/stock-movement — record a stock movement & update real rack bins
router.post('/', async (req, res) => {
  try {
    const {
      type = 'Internal',
      productId,
      productName,
      sku,
      batchNo,
      fromLocation,
      toLocation,
      quantity,
      unit = 'Kg',
      packagingSummary = '',
      reason = 'Intra-warehouse stock transfer',
      user = 'Warehouse Manager',
      operator,
    } = req.body

    if (!productName || !batchNo || !toLocation || !quantity) {
      return res.status(400).json({ message: 'Product, Batch, To Location, and Quantity are required' })
    }

    const moveQty = Number(quantity) || 1

    // 1. If Internal or Outward, deduct/clear stock from source bin
    if ((type === 'Internal' || type === 'Outward') && fromLocation) {
      const { rack: fromRack, cell: fromCell } = await findCellByLocation(fromLocation)
      if (fromRack && fromCell) {
        const remainingStock = Math.max(0, (Number(fromCell.currentStock) || 0) - moveQty)
        if (remainingStock <= 0) {
          fromCell.status = 'Empty'
          fromCell.productName = ''
          fromCell.batchNo = ''
          fromCell.currentStock = 0
        } else {
          fromCell.currentStock = remainingStock
        }
        fromRack.markModified('cells')
        await fromRack.save()
      }
    }

    // 2. If Internal or Inward, allocate/add stock to destination bin
    if ((type === 'Internal' || type === 'Inward') && toLocation) {
      const { rack: toRack, cell: toCell } = await findCellByLocation(toLocation)
      if (toRack && toCell) {
        toCell.status = 'Occupied'
        toCell.code = `${toRack.shadeCode}-${toRack.rackNumber}-R${toCell.row}-C${toCell.col}`
        toCell.productName = productName
        toCell.batchNo = batchNo
        toCell.currentStock = moveQty
        toRack.markModified('cells')
        await toRack.save()
      }
    }

    // 3. Sync Product catalog binLocation
    if (productName && toLocation && (type === 'Internal' || type === 'Inward')) {
      await Product.updateMany(
        { $or: [{ name: productName }, { batchNo: batchNo || '' }] },
        { $set: { binLocation: toLocation } }
      ).catch(() => {})
    }

    // 4. Create and save movement record in MongoDB
    const movement = new StockMovement({
      type,
      productId: productId || null,
      productName,
      sku: sku || '',
      batchNo,
      fromLocation: fromLocation || 'Dock / Staging',
      toLocation,
      quantity: moveQty,
      unit,
      packagingSummary: packagingSummary || `${moveQty} ${unit}`,
      reason,
      user: user || 'Warehouse Manager',
      operator: operator || user || 'Storekeeper',
      status: 'Completed',
    })

    await movement.save()
    res.status(201).json({ message: 'Stock movement executed successfully', movement })
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to record stock movement' })
  }
})

// DELETE /api/stock-movement/:id — delete a stock movement record
router.delete('/:id', async (req, res) => {
  try {
    const movement = await StockMovement.findByIdAndDelete(req.params.id)
    if (!movement) return res.status(404).json({ message: 'Movement record not found' })
    res.json({ message: 'Movement deleted successfully', movement })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
