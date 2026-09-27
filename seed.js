const mongoose = require('mongoose')
const User = require('./models/User')
const Product = require('./models/Product')
require('dotenv').config()

const PRODUCTS = [
  {
    name: 'Basmati Rice (Grade 1 Special 25kg)',
    sku: 'PRD-RIC-001',
    category: 'Grains & Pulses',
    brand: 'India Gate',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 25,
    currentStock: 1250,
    reorderLevel: 250,
    storageZone: 'Shade 2 (Food & Grains)',
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
    currentStock: 450,
    reorderLevel: 100,
    storageZone: 'Shade 2 (Food & Grains)',
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
    currentStock: 900,
    reorderLevel: 150,
    storageZone: 'Shade 2 (Food & Grains)',
    status: 'Active',
    barcode: '890103001003',
    hsnCode: '0713.60',
    description: 'Unpolished protein-rich Toor dal in standard 30kg commercial packaging.',
  },
  {
    name: 'Industrial First Aid Safety Kit',
    sku: 'PRD-MED-004',
    category: 'Safety & First Aid',
    brand: 'Sanjivani Healthcare',
    baseUnit: 'Pieces',
    outerPackaging: 'Box',
    packSize: 1,
    currentStock: 85,
    reorderLevel: 20,
    storageZone: 'Shade 6 (Textiles & Medical)',
    status: 'Active',
    barcode: '890103001004',
    hsnCode: '3006.50',
    description: 'Comprehensive workplace safety kit with bandages, burn gel, and antiseptics.',
  },
  {
    name: 'Industrial Lubricant 15W-40 (20L)',
    sku: 'PRD-LUB-005',
    category: 'Maintenance & Spares',
    brand: 'Castrol Industrial',
    baseUnit: 'Litre',
    outerPackaging: 'Drum / Barrel',
    packSize: 20,
    currentStock: 40,
    reorderLevel: 80,
    storageZone: 'Shade 4 (Chemical & Hazardous)',
    status: 'Low Stock',
    barcode: '890103001005',
    hsnCode: '2710.19',
    description: 'Heavy duty commercial forklift and fleet engine lubricant in 20L barrels.',
  },
  {
    name: 'Heavy Duty Waterproof Tarpaulin',
    sku: 'PRD-TAR-006',
    category: 'Packaging & Materials',
    brand: 'Silpaulin Premium',
    baseUnit: 'Pieces',
    outerPackaging: 'Bundle',
    packSize: 5,
    currentStock: 150,
    reorderLevel: 30,
    storageZone: 'Shade 1 (General Stores)',
    status: 'Active',
    barcode: '890103001006',
    hsnCode: '6306.12',
    description: '24x18 ft multi-layered cross laminated waterproof cargo protective sheets.',
  },
  {
    name: 'Corrugated 5-Ply Packaging Cartons',
    sku: 'PRD-BOX-007',
    category: 'Packaging & Materials',
    brand: 'PackWell Boxes',
    baseUnit: 'Pieces',
    outerPackaging: 'Bundle',
    packSize: 50,
    currentStock: 1200,
    reorderLevel: 200,
    storageZone: 'Shade 1 (General Stores)',
    status: 'Active',
    barcode: '890103001007',
    hsnCode: '4819.10',
    description: '5-ply export quality shipping boxes for outer consignment dispatch packaging.',
  },
  {
    name: 'Industrial Surface Disinfectant 5L',
    sku: 'PRD-CHM-008',
    category: 'Hygiene & Chemicals',
    brand: 'Lizol Pro Solutions',
    baseUnit: 'Pieces',
    outerPackaging: 'Box',
    packSize: 4,
    currentStock: 15,
    reorderLevel: 30,
    storageZone: 'Shade 4 (Chemical & Hazardous)',
    status: 'Low Stock',
    barcode: '890103001008',
    hsnCode: '3808.94',
    description: 'Surface cleaner and disinfectant solution in 5-litre HDPE containers.',
  },
]

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected')

  // Seed user
  const existingUser = await User.findOne({ userId: 'WMS-MGR-001' })
  if (!existingUser) {
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
    console.log('Default user created: userId=WMS-MGR-001, PIN=1947')
  } else {
    console.log('User already exists, skipping.')
  }

  // Seed products
  const existingProducts = await Product.countDocuments()
  if (existingProducts === 0) {
    await Product.insertMany(PRODUCTS)
    console.log(`${PRODUCTS.length} products seeded into Product master.`)
  } else {
    console.log(`Products already exist (${existingProducts}), skipping.`)
  }

  // Seed Shades & Racks
  const Shade = require('./models/Shade')
  const Rack = require('./models/Rack')

  const existingShades = await Shade.countDocuments()
  if (existingShades === 0) {
    const DEFAULT_SHADES = [
      { code: 'SH-01', name: 'Shade 1: Grains & Pulses', type: 'Grains & Pulses', description: 'Bulk storage for grains, pulses, and agricultural items', manager: 'Rajesh Sharma', status: 'Active' },
      { code: 'SH-02', name: 'Shade 2: Edible Oils', type: 'Edible Oils', description: 'Storage for tins, cans, and liquid drums', manager: 'Amit Kumar', status: 'Active' },
      { code: 'SH-03', name: 'Shade 3: FMCG & Packaged Foods', type: 'Packaged FMCG', description: 'Fast moving packaged consumer goods and food boxes', manager: 'Priya Singh', status: 'Active' },
      { code: 'SH-04', name: 'Shade 4: Packaging & Materials', type: 'Packaging Materials', description: 'Cartons, tarpaulins, bags, and packing supplies', manager: 'Suresh Verma', status: 'Active' },
      { code: 'SH-05', name: 'Shade 5: Chemicals & Hygiene', type: 'Chemicals & Hygiene', description: 'Hazardous chemicals, disinfectants, and sanitizers', manager: 'Vikram Gupta', status: 'Active' },
      { code: 'SH-06', name: 'Shade 6: Spares & General Hardware', type: 'Spares & General', description: 'Warehouse spare parts, hydraulic jacks, and hardware', manager: 'Ramesh Yadav', status: 'Active' },
    ]

    for (const shadeData of DEFAULT_SHADES) {
      const createdShade = await Shade.create(shadeData)
      // Seed 2 racks for each shade (4 rows x 5 cols each = 20 cells per rack)
      await Rack.create({ shadeId: createdShade._id, shadeCode: createdShade.code, rackNumber: 'RK-01', rows: 4, columns: 5, description: 'Main Storage Rack A' })
      await Rack.create({ shadeId: createdShade._id, shadeCode: createdShade.code, rackNumber: 'RK-02', rows: 4, columns: 5, description: 'Main Storage Rack B' })
    }
    console.log('6 Shades and 12 Racks (240 Cells) seeded successfully.')
  } else {
    console.log(`Shades already exist (${existingShades}), skipping.`)
  }

  process.exit(0)
}

seed().catch((err) => { console.error(err); process.exit(1) })

