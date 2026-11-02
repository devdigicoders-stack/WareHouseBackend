const dns = require('dns')
try { dns.setServers(['8.8.8.8', '1.1.1.1']) } catch (e) {}
const mongoose = require('mongoose')
require('dotenv').config()

const Shade = require('./models/Shade')
const Rack = require('./models/Rack')
const Product = require('./models/Product')

async function run() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB Connected successfully.')

  // 1. Define the 4 Shades
  const SHADES_CONFIG = [
    {
      code: 'SH-01',
      name: 'Shade 1: Grains & Pulses',
      type: 'Grains & Pulses',
      description: 'Bulk storage for Atta, Rice, and Pulses',
      manager: 'Rajesh Sharma',
      status: 'Active',
    },
    {
      code: 'SH-02',
      name: 'Shade 2: Edible Oils',
      type: 'Edible Oils',
      description: 'Storage for Sunflower, Mustard, and Groundnut Oils',
      manager: 'Amit Kumar',
      status: 'Active',
    },
    {
      code: 'SH-03',
      name: 'Shade 3: FMCG & Packaged Foods',
      type: 'Packaged FMCG',
      description: 'Storage for Refined Sugar and Free-Flowing Salt',
      manager: 'Priya Singh',
      status: 'Active',
    },
    {
      code: 'SH-04',
      name: 'Shade 4: Animal Feed & Agro',
      type: 'General',
      description: 'Storage for Barley, Baled Hay, Chana Churi, and Bran',
      manager: 'Suresh Verma',
      status: 'Active',
    },
  ]

  // Clear existing shades & racks to ensure clean build
  await Shade.deleteMany({})
  await Rack.deleteMany({})
  console.log('Cleared existing Shades and Racks.')

  // Fetch all 18 products
  const products = await Product.find({})
  console.log(`Found ${products.length} products in database.`)

  const productBySku = {}
  products.forEach((p) => {
    productBySku[p.sku] = p
  })

  // Mapping of 18 products to Shades, Racks, Rows, Columns
  const ALLOCATION_PLAN = {
    'SH-01': [
      { sku: 'PRD-ATT-001', rack: 'RK-01', row: 1, col: 1, qty: 50, batch: 'BAT-2026-ATT-01' },
      { sku: 'PRD-RIC-001', rack: 'RK-01', row: 1, col: 2, qty: 50, batch: 'BAT-2026-RIC-01' },
      { sku: 'PRD-DAL-CHN-001', rack: 'RK-01', row: 1, col: 3, qty: 50, batch: 'BAT-2026-CHN-01' },
      { sku: 'PRD-MNG-WHL-001', rack: 'RK-01', row: 1, col: 4, qty: 50, batch: 'BAT-2026-MNG-01' },
      { sku: 'PRD-DAL-MSR-WHL-001', rack: 'RK-01', row: 1, col: 5, qty: 50, batch: 'BAT-2026-MSR-01' },
      { sku: 'PRD-DAL-URD-CRD-001', rack: 'RK-01', row: 2, col: 1, qty: 50, batch: 'BAT-2026-URD-01' },
      { sku: 'PRD-MNG-DHL-001', rack: 'RK-01', row: 2, col: 2, qty: 50, batch: 'BAT-2026-DHL-01' },
      { sku: 'PRD-DAL-MSR-C-001', rack: 'RK-01', row: 2, col: 3, qty: 50, batch: 'BAT-2026-MSC-01' },
      { sku: 'PRD-DAL-URD-WHL-001', rack: 'RK-01', row: 2, col: 4, qty: 50, batch: 'BAT-2026-URW-01' },
    ],
    'SH-02': [
      { sku: 'PRD-OIL-SUN-001', rack: 'RK-01', row: 1, col: 1, qty: 40, batch: 'BAT-2026-SUN-01' },
      { sku: 'PRD-OIL-MST-001', rack: 'RK-01', row: 1, col: 2, qty: 40, batch: 'BAT-2026-MST-01' },
      { sku: 'PRD-OIL-GNT-001', rack: 'RK-01', row: 1, col: 3, qty: 30, batch: 'BAT-2026-GNT-01' },
    ],
    'SH-03': [
      { sku: 'PRD-SUG-001', rack: 'RK-01', row: 1, col: 1, qty: 60, batch: 'BAT-2026-SUG-01' },
      { sku: 'PRD-SLT-001', rack: 'RK-01', row: 1, col: 2, qty: 50, batch: 'BAT-2026-SLT-01' },
    ],
    'SH-04': [
      { sku: 'PRD-BRL-CRD-001', rack: 'RK-01', row: 1, col: 1, qty: 50, batch: 'BAT-2026-BRL-01' },
      { sku: 'PRD-HAY-BLD-001', rack: 'RK-01', row: 1, col: 2, qty: 40, batch: 'BAT-2026-HAY-01' },
      { sku: 'PRD-GRM-CRD-001', rack: 'RK-01', row: 1, col: 3, qty: 50, batch: 'BAT-2026-GRM-01' },
      { sku: 'PRD-BRN-001', rack: 'RK-01', row: 1, col: 4, qty: 40, batch: 'BAT-2026-BRN-01' },
    ],
  }

  let totalAllocated = 0

  for (const shadeConf of SHADES_CONFIG) {
    const createdShade = await Shade.create(shadeConf)
    console.log(`\nCreated Shade: [${createdShade.code}] ${createdShade.name}`)

    const allocations = ALLOCATION_PLAN[createdShade.code] || []

    // Create RK-01 (4 rows x 6 columns)
    const rack1 = new Rack({
      shadeId: createdShade._id,
      shadeCode: createdShade.code,
      rackNumber: 'RK-01',
      rows: 4,
      columns: 6,
      description: `Primary Storage Rack A (${createdShade.name})`,
      status: 'Active',
    })
    await rack1.save()

    // Create RK-02 (4 rows x 6 columns) - Reserve / Buffer Rack
    const rack2 = new Rack({
      shadeId: createdShade._id,
      shadeCode: createdShade.code,
      rackNumber: 'RK-02',
      rows: 4,
      columns: 6,
      description: `Reserve & Buffer Storage Rack B (${createdShade.name})`,
      status: 'Active',
    })
    await rack2.save()

    // Now allocate items in rack1
    for (const alloc of allocations) {
      const prod = productBySku[alloc.sku]
      if (!prod) {
        console.warn(`Product SKU ${alloc.sku} not found!`)
        continue
      }

      const cellCode = `${createdShade.code}-${alloc.rack}-R${alloc.row}-C${alloc.col}`
      const targetCell = rack1.cells.find((c) => c.row === alloc.row && c.col === alloc.col)

      if (targetCell) {
        targetCell.code = cellCode
        targetCell.status = 'Occupied'
        targetCell.productId = prod._id
        targetCell.productName = prod.name
        targetCell.batchNo = alloc.batch
        targetCell.currentStock = alloc.qty
      }

      // Sync Product model
      prod.storageZone = createdShade.name
      prod.shadeId = createdShade.code
      prod.row = `R0${alloc.row}`
      prod.col = `C0${alloc.col}`
      prod.binLocation = cellCode
      prod.batchNo = alloc.batch
      prod.currentStock = alloc.qty * (prod.packSize || 1) // Base quantity (kg or litres)
      prod.status = 'Active'
      prod.labStatus = 'Passed'
      await prod.save()

      console.log(` -> Allocated [${prod.sku}] ${prod.name} ➔ ${cellCode} (${alloc.qty} packs = ${prod.currentStock} ${prod.baseUnit}) [Batch: ${alloc.batch}]`)
      totalAllocated++
    }

    rack1.markModified('cells')
    await rack1.save()
    console.log(`Saved RK-01 with ${allocations.length} occupied cells and RK-02 with 24 empty buffer cells.`)
  }

  console.log('\n========================================================================')
  console.log(`COMPLETED: Created 4 Shades, 8 Racks, and allocated all ${totalAllocated} / 18 products!`)
  console.log('========================================================================')

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('Error running script:', err)
  process.exit(1)
})

