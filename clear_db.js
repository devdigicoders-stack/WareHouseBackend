const mongoose = require('mongoose')
const User = require('./models/User')
const Product = require('./models/Product')
const Shade = require('./models/Shade')
const Rack = require('./models/Rack')
const Partner = require('./models/Partner')
const GateEntry = require('./models/GateEntry')
const GRN = require('./models/GRN')
const QualityCheck = require('./models/QualityCheck')
const Dispatch = require('./models/Dispatch')
const StockAdjustment = require('./models/StockAdjustment')
require('dotenv').config()

async function clearAndResetAllData() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB successfully.')

  console.log('\n--- Clearing All Transactional & Master Data Collections ---')

  const gateResult = await GateEntry.deleteMany({})
  console.log(`✅ Cleared Gate Entries: ${gateResult.deletedCount} records deleted.`)

  const grnResult = await GRN.deleteMany({})
  console.log(`✅ Cleared GRN Records: ${grnResult.deletedCount} records deleted.`)

  const qcResult = await QualityCheck.deleteMany({})
  console.log(`✅ Cleared Quality Checks: ${qcResult.deletedCount} records deleted.`)

  const dispatchResult = await Dispatch.deleteMany({})
  console.log(`✅ Cleared Dispatch Orders: ${dispatchResult.deletedCount} records deleted.`)

  const stockAdjResult = await StockAdjustment.deleteMany({})
  console.log(`✅ Cleared Stock Adjustments: ${stockAdjResult.deletedCount} records deleted.`)

  const prodResult = await Product.deleteMany({})
  console.log(`✅ Cleared Products: ${prodResult.deletedCount} records deleted.`)

  const rackResult = await Rack.deleteMany({})
  console.log(`✅ Cleared Racks: ${rackResult.deletedCount} records deleted.`)

  const shadeResult = await Shade.deleteMany({})
  console.log(`✅ Cleared Shades: ${shadeResult.deletedCount} records deleted.`)

  const partnerResult = await Partner.deleteMany({})
  console.log(`✅ Cleared Partners: ${partnerResult.deletedCount} records deleted.`)

  const userResult = await User.deleteMany({})
  console.log(`✅ Cleared Users: ${userResult.deletedCount} records deleted.`)

  console.log('\n--- Initializing Clean Master Baseline (Zero Stock) ---')

  // 1. Create Default Operations User
  await User.create({
    userId: 'WMS-MGR-001',
    name: 'Warehouse Manager',
    role: 'Operations Manager',
    department: 'Central Warehouse Logistics',
    terminal: 'WMS-TERMINAL-01',
    pin: '1947',
    usbToken: 'WMS-SEC-KEY-2026-AUTH-TOKEN',
    isActive: true,
  })
  console.log('👤 Master User initialized (userId: WMS-MGR-001, PIN: 1947)')

  // 2. Initialize 6 Standard Facility Shades & Empty Racks
  const DEFAULT_SHADES = [
    { code: 'SH-01', name: 'Shade 1: Grains & Bulk Pulses', type: 'Grains & Pulses', description: 'Bulk storage for grains, pulses, and agricultural items', manager: 'Rajesh Sharma', status: 'Active' },
    { code: 'SH-02', name: 'Shade 2: Edible Oils & Liquids', type: 'Edible Oils', description: 'Storage for tins, cans, and liquid drums', manager: 'Amit Kumar', status: 'Active' },
    { code: 'SH-03', name: 'Shade 3: FMCG & Packaged Foods', type: 'Packaged FMCG', description: 'Fast moving packaged consumer goods and food boxes', manager: 'Priya Singh', status: 'Active' },
    { code: 'SH-04', name: 'Shade 4: Packaging & Materials', type: 'Packaging Materials', description: 'Cartons, tarpaulins, bags, and packing supplies', manager: 'Suresh Verma', status: 'Active' },
    { code: 'SH-05', name: 'Shade 5: Chemicals & Hygiene', type: 'Chemicals & Hygiene', description: 'Hazardous chemicals, disinfectants, and sanitizers', manager: 'Vikram Gupta', status: 'Active' },
    { code: 'SH-06', name: 'Shade 6: Spares & General Hardware', type: 'Spares & General', description: 'Warehouse spare parts, hydraulic jacks, and hardware', manager: 'Ramesh Yadav', status: 'Active' },
  ]

  for (const shadeData of DEFAULT_SHADES) {
    const createdShade = await Shade.create(shadeData)
    await Rack.create({ shadeId: createdShade._id, shadeCode: createdShade.code, rackNumber: 'RK-01', rows: 4, columns: 5, description: 'Main Storage Rack A', cells: [] })
    await Rack.create({ shadeId: createdShade._id, shadeCode: createdShade.code, rackNumber: 'RK-02', rows: 4, columns: 5, description: 'Main Storage Rack B', cells: [] })
  }
  console.log('🏢 6 Facility Shades and 12 Empty Racks initialized.')

  // 3. Initialize Standard Partners
  await Partner.insertMany([
    { partnerCode: 'SUP-001', name: 'Adani Agri Logistics Ltd', type: 'Supplier', contactPerson: 'Ramesh Agarwal', phone: '+91 98765 43210', email: 'orders@adaniagri.com', city: 'Karnal, Haryana', gstin: '06AAACA1234F1Z5', status: 'Active' },
    { partnerCode: 'SUP-002', name: 'Fortune Agro Oils Corp', type: 'Supplier', contactPerson: 'Deepak Shah', phone: '+91 98234 56789', email: 'supply@fortuneagro.in', city: 'Gandhidham, Gujarat', gstin: '24AAACF9876K1Z9', status: 'Active' },
    { partnerCode: 'CUST-001', name: 'Reliance Retail Mega Hub', type: 'Customer', contactPerson: 'Vikas Malhotra', phone: '+91 91234 56780', email: 'dc.inward@relianceretail.com', city: 'Noida, UP', gstin: '09AAACR5544E1ZX', status: 'Active' },
    { partnerCode: 'CUST-002', name: 'Blinkit Quick Delivery Hub 4', type: 'Customer', contactPerson: 'Anjali Mehra', phone: '+91 99887 76655', email: 'procure@blinkit.com', city: 'Gurugram, HR', gstin: '06AABCB4321H1ZQ', status: 'Active' },
  ])
  console.log('🤝 Standard Suppliers & Customers initialized.')

  // 4. Initialize Clean Products Catalog with 0 Initial Stock
  const CLEAN_PRODUCTS = [
    {
      name: 'Basmati Rice (Grade 1 Special 25kg)',
      sku: 'PRD-RIC-001',
      category: 'Grains & Pulses',
      brand: 'India Gate',
      baseUnit: 'Kg',
      outerPackaging: 'Bag',
      packSize: 25,
      currentStock: 0,
      reorderLevel: 250,
      storageZone: 'Shade 1: Grains & Pulses',
      status: 'Active',
      barcode: '890103001001',
      hsnCode: '1006.30',
      description: 'Premium aged long grain Basmati rice packed in heavy duty 25kg woven bags.',
    },
    {
      name: 'Refined Mustard Oil (15L Tin)',
      sku: 'PRD-OIL-002',
      category: 'Edible Oils & Liquids',
      brand: 'Fortune Foods',
      baseUnit: 'Litre',
      outerPackaging: 'Tin',
      packSize: 15,
      currentStock: 0,
      reorderLevel: 100,
      storageZone: 'Shade 2: Edible Oils',
      status: 'Active',
      barcode: '890103001002',
      hsnCode: '1514.91',
      description: 'First-press refined mustard cooking oil in 15-litre food-grade sealed tin.',
    },
    {
      name: 'Arhar / Toor Dal (Grade A 30kg)',
      sku: 'PRD-DAL-003',
      category: 'Grains & Pulses',
      brand: 'Tata Sampann',
      baseUnit: 'Kg',
      outerPackaging: 'Bag',
      packSize: 30,
      currentStock: 0,
      reorderLevel: 150,
      storageZone: 'Shade 1: Grains & Pulses',
      status: 'Active',
      barcode: '890103001003',
      hsnCode: '0713.60',
      description: 'Unpolished protein-rich Toor dal in standard 30kg commercial packaging.',
    },
    {
      name: 'Corrugated 5-Ply Packaging Cartons',
      sku: 'PRD-BOX-007',
      category: 'Packaging Materials',
      brand: 'PackWell Boxes',
      baseUnit: 'Pieces',
      outerPackaging: 'Bundle',
      packSize: 50,
      currentStock: 0,
      reorderLevel: 200,
      storageZone: 'Shade 4: Packaging & Materials',
      status: 'Active',
      barcode: '890103001007',
      hsnCode: '4819.10',
      description: '5-ply export quality shipping boxes for outer consignment dispatch packaging.',
    }
  ]

  await Product.insertMany(CLEAN_PRODUCTS)
  console.log('📦 Clean product catalog initialized with 0 stock.')

  console.log('\n========================================================')
  console.log('✨ ALL DATABASE TRANSACTIONS & TEST DATA COMPLETELY CLEARED!')
  console.log('========================================================\n')

  await mongoose.disconnect()
  process.exit(0)
}

clearAndResetAllData().catch((err) => {
  console.error('Error clearing data:', err)
  process.exit(1)
})
