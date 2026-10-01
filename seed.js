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
    currentStock: 450,
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
    currentStock: 900,
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
    currentStock: 1200,
    reorderLevel: 200,
    storageZone: 'Shade 4: Packaging & Materials',
    status: 'Active',
    barcode: '890103001007',
    hsnCode: '4819.10',
    description: '5-ply export quality shipping boxes for outer consignment dispatch packaging.',
  }
]

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('MongoDB connected')

  // 1. Seed user
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
  }

  // 2. Seed products
  const existingProducts = await Product.countDocuments()
  if (existingProducts === 0) {
    await Product.insertMany(PRODUCTS)
    console.log(`${PRODUCTS.length} products seeded.`)
  }

  // 3. Seed Shades & Racks
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
      await Rack.create({ shadeId: createdShade._id, shadeCode: createdShade.code, rackNumber: 'RK-01', rows: 4, columns: 5, description: 'Main Storage Rack A' })
      await Rack.create({ shadeId: createdShade._id, shadeCode: createdShade.code, rackNumber: 'RK-02', rows: 4, columns: 5, description: 'Main Storage Rack B' })
    }
    console.log('6 Shades and 12 Racks seeded.')
  }

  // 4. Seed Partners (Suppliers & Customers)
  const existingPartners = await Partner.countDocuments()
  if (existingPartners === 0) {
    await Partner.insertMany([
      { partnerCode: 'SUP-001', name: 'Adani Agri Logistics Ltd', type: 'Supplier', contactPerson: 'Ramesh Agarwal', phone: '+91 98765 43210', email: 'orders@adaniagri.com', city: 'Karnal, Haryana', gstin: '06AAACA1234F1Z5', status: 'Active' },
      { partnerCode: 'SUP-002', name: 'Fortune Agro Oils Corp', type: 'Supplier', contactPerson: 'Deepak Shah', phone: '+91 98234 56789', email: 'supply@fortuneagro.in', city: 'Gandhidham, Gujarat', gstin: '24AAACF9876K1Z9', status: 'Active' },
      { partnerCode: 'CUST-001', name: 'Reliance Retail Mega Hub', type: 'Customer', contactPerson: 'Vikas Malhotra', phone: '+91 91234 56780', email: 'dc.inward@relianceretail.com', city: 'Noida, UP', gstin: '09AAACR5544E1ZX', status: 'Active' },
      { partnerCode: 'CUST-002', name: 'Blinkit Quick Delivery Hub 4', type: 'Customer', contactPerson: 'Anjali Mehra', phone: '+91 99887 76655', email: 'procure@blinkit.com', city: 'Gurugram, HR', gstin: '06AABCB4321H1ZQ', status: 'Active' },
    ])
    console.log('Default Partners seeded.')
  }

  // 5. Seed sample Gate Entry if none
  const existingGate = await GateEntry.countDocuments()
  if (existingGate === 0) {
    await GateEntry.create({
      vehicleNumber: 'UP-32-AB-1947',
      vehicleType: 'Heavy Multi-Axle (16 Wheeler)',
      driverName: 'Satnam Singh',
      driverContact: '+91 98765 00001',
      supplier: 'Adani Agri Logistics Ltd',
      challanNo: 'CH-2026-8891',
      purpose: 'Raw Material Delivery (PO Inward)',
      assignedBay: 'Bay-02 (Central Inward Dock)',
      status: 'Waiting at Gate',
      materialItems: [
        { product: 'Basmati Rice (Grade 1 Special 25kg)', packageQty: 50, packagingUnit: 'Bags', baseUnitEstimate: '1250 Kg', remarks: 'Sealed truck delivery' }
      ]
    })
    console.log('Sample Gate Entry seeded.')
  }

  // 6. Seed sample QC if none
  const existingQC = await QualityCheck.countDocuments()
  if (existingQC === 0) {
    await QualityCheck.create({
      grnNo: 'GRN-2026-0001',
      productName: 'Basmati Rice (Grade 1 Special 25kg)',
      sku: 'PRD-RIC-001',
      batchNo: 'BAT-2026-RIC-01',
      sampleSize: '500g composite sample',
      testedBy: 'Senior QC Chemist',
      parameters: [
        { name: 'Moisture Content', standard: 'Max 12.5%', observed: '11.2%', pass: true },
        { name: 'Broken Grain %', standard: 'Max 2.0%', observed: '1.4%', pass: true },
        { name: 'Foreign Matter', standard: 'Nil', observed: 'Nil', pass: true },
        { name: 'Aroma & Color', standard: 'Characteristic Aromatic', observed: 'Standard Passed', pass: true }
      ],
      status: 'Passed',
      remarks: 'Certified fit for grade 1 storage and bulk distribution.'
    })
    console.log('Sample QC record seeded.')
  }

  // 7. Seed sample Outward Dispatch if none
  const existingDispatch = await Dispatch.countDocuments()
  if (existingDispatch === 0) {
    await Dispatch.create({
      orderNo: 'SO-2026-9041',
      customerName: 'Reliance Retail Mega Hub',
      destination: 'Distribution Center Sector 63, Noida',
      vehicleNo: 'DL-1L-AA-5544',
      driverName: 'Mohd. Imran',
      driverContact: '+91 98711 22334',
      totalPackages: 20,
      totalBaseQty: 500,
      baseUnit: 'Kg',
      status: 'QR Verified / Ready',
      dispatchedBy: 'Warehouse Manager',
      items: [
        {
          productName: 'Basmati Rice (Grade 1 Special 25kg)',
          sku: 'PRD-RIC-001',
          batchNo: 'BAT-2026-RIC-01',
          locationCode: 'SH01-RK01-R1-C1',
          packagingUnit: 'Bags',
          packSize: 25,
          requestedQty: 20,
          pickedQty: 20,
          verified: true
        }
      ]
    })
    console.log('Sample Outward Dispatch seeded.')
  }

  console.log('Warehouse database fully seeded and synchronized!')
  process.exit(0)
}

seed().catch((err) => { console.error(err); process.exit(1) })
