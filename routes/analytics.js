const express = require('express')
const Product = require('../models/Product')
const GateEntry = require('../models/GateEntry')
const GRN = require('../models/GRN')
const Dispatch = require('../models/Dispatch')
const Rack = require('../models/Rack')
const QualityCheck = require('../models/QualityCheck')

const router = express.Router()

// GET /api/analytics/summary — warehouse executive summary KPI
router.get('/summary', async (req, res) => {
  try {
    const [
      totalProducts,
      gateEntries,
      grnRecords,
      dispatches,
      racks,
      qcRecords
    ] = await Promise.all([
      Product.find(),
      GateEntry.find(),
      GRN.find(),
      Dispatch.find(),
      Rack.find(),
      QualityCheck.find()
    ])

    // Compute stock & items
    let totalStockUnits = 0
    let lowStockCount = 0
    totalProducts.forEach((p) => {
      totalStockUnits += (p.currentStock || 0)
      if (p.currentStock <= (p.reorderLevel || 50)) {
        lowStockCount++
      }
    })

    // Compute cell capacity
    let totalCells = 0
    let occupiedCells = 0
    racks.forEach((r) => {
      if (r.cells && Array.isArray(r.cells)) {
        totalCells += r.cells.length
        occupiedCells += r.cells.filter((c) => c.status === 'Occupied' || c.status === 'Reserved').length
      }
    })

    const occupancyRate = totalCells > 0 ? Math.round((occupiedCells / totalCells) * 100) : 0

    // Today's counts
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayGateIn = gateEntries.filter((g) => g.createdAt && g.createdAt.toISOString().startsWith(todayStr)).length
    const todayGRN = grnRecords.filter((g) => g.createdAt && g.createdAt.toISOString().startsWith(todayStr)).length
    const pendingDispatches = dispatches.filter((d) => d.status !== 'Dispatched' && d.status !== 'Gate Out / Cleared').length

    res.json({
      totalSKUs: totalProducts.length,
      totalStockUnits,
      lowStockCount,
      totalCells,
      occupiedCells,
      occupancyRate,
      totalGateEntries: gateEntries.length,
      todayGateIn,
      totalGRNs: grnRecords.length,
      todayGRN,
      totalDispatches: dispatches.length,
      pendingDispatches,
      totalQCTests: qcRecords.length,
      passedQCRate: qcRecords.length > 0 ? Math.round((qcRecords.filter((q) => q.status === 'Passed').length / qcRecords.length) * 100) : 100
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
