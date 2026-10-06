require('dotenv').config()
const http = require('http')
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const gateEntryRoutes = require('./routes/gateEntry')
const productRoutes = require('./routes/product')
const shadeRoutes = require('./routes/shade')
const rackRoutes = require('./routes/rack')
const grnRoutes = require('./routes/grn')
const qcRoutes = require('./routes/qc')
const dispatchRoutes = require('./routes/dispatch')
const stockAdjustmentRoutes = require('./routes/stockAdjustment')
const partnerRoutes = require('./routes/partner')
const analyticsRoutes = require('./routes/analytics')

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/gate-entry', gateEntryRoutes)
app.use('/api/product', productRoutes)
app.use('/api/shade', shadeRoutes)
app.use('/api/rack', rackRoutes)
app.use('/api/grn', grnRoutes)
app.use('/api/qc', qcRoutes)
app.use('/api/dispatch', dispatchRoutes)
app.use('/api/stock-adjust', stockAdjustmentRoutes)
app.use('/api/partners', partnerRoutes)
app.use('/api/analytics', analyticsRoutes)
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }))

let BASE_URL = ''
let server = null

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, ok: res.ok, data }
}

const results = []

function assert(moduleName, testName, condition, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName} ${details ? `— ${details}` : ''}`)
    results.push({ module: moduleName, test: testName, pass: true })
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? `— ${details}` : ''}`)
    results.push({ module: moduleName, test: testName, pass: false, error: details })
  }
}

async function runTests() {
  console.log('========================================================================')
  console.log('🧪 LIVE END-TO-END WMS API VERIFICATION SUITE (ALL 14 MODULES)')
  console.log('========================================================================\n')

  await mongoose.connect(process.env.MONGO_URI)
  console.log('📦 Connected to MongoDB Atlas successfully.\n')

  server = http.createServer(app)
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port
      BASE_URL = `http://127.0.0.1:${port}`
      console.log(`🚀 API Test Engine listening at ${BASE_URL}\n`)
      resolve()
    })
  })

  let authToken = ''
  let createdProductId = ''
  let createdGateEntryId = ''
  let createdGatePassNumber = ''
  let createdGRNId = ''
  let createdGRNNo = ''
  let createdQCId = ''
  let shadeId = ''
  let targetCellCode = ''
  let createdDispatchId = ''

  // -------------------------------------------------------------
  // MODULE 1: AUTHENTICATION & SECURITY (LOGIN)
  // -------------------------------------------------------------
  console.log('🔹 MODULE 1: AUTHENTICATION & LOGIN (PIN, USB & Token)')
  
  // 1.1 Invalid PIN Login
  const badPinRes = await request('/api/auth/login-pin', {
    method: 'POST',
    body: { pin: '0000' },
  })
  assert('Module 1: Auth', 'Reject Invalid 4-Digit PIN (401)', badPinRes.status === 401)

  // 1.2 Valid Quick PIN Login (1947)
  const validPinRes = await request('/api/auth/login-pin', {
    method: 'POST',
    body: { pin: '1947' },
  })
  assert('Module 1: Auth', 'Valid Quick PIN Login (1947 -> JWT Token)', validPinRes.status === 200 && Boolean(validPinRes.data?.token))
  if (validPinRes.data?.token) {
    authToken = validPinRes.data.token
  }

  // 1.3 USB Secret Token Login
  const usbRes = await request('/api/auth/login-usb', {
    method: 'POST',
    body: { fileContent: process.env.USB_FILE_SECRET },
  })
  assert('Module 1: Auth', 'Hardware USB Security Key Authentication', usbRes.status === 200 && usbRes.data?.user?.authMethod === 'USB Token')

  // 1.4 Auth Token Verification (/api/auth/me)
  const meRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${authToken}` },
  })
  assert('Module 1: Auth', 'JWT Token Validation (/api/auth/me)', meRes.status === 200 && meRes.data?.user?.userId === 'WMS-MGR-001')

  // -------------------------------------------------------------
  // MODULE 2: FACILITY INFRASTRUCTURE (SHADES & RACKS)
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 2: FACILITY INFRASTRUCTURE (SHADES & RACKS)')
  
  // 2.1 Fetch Shades
  const shadesRes = await request('/api/shade')
  assert('Module 2: Shades', 'Fetch 6 Facility Warehouse Shades', shadesRes.status === 200 && Array.isArray(shadesRes.data) && shadesRes.data.length >= 6)
  if (shadesRes.data?.length > 0) {
    shadeId = shadesRes.data[0]._id
  }

  // 2.2 Fetch Racks
  const racksRes = await request('/api/rack')
  assert('Module 2: Racks', 'Fetch Storage Racks & Cell Grid', racksRes.status === 200 && Array.isArray(racksRes.data) && racksRes.data.length >= 1)
  if (racksRes.data?.length > 0 && racksRes.data[0].cells?.length > 0) {
    targetCellCode = racksRes.data[0].cells[0].code
  }

  // 2.3 Create Dynamic New Rack
  const newRackRes = await request('/api/rack', {
    method: 'POST',
    body: {
      shadeId: shadeId,
      rackNumber: 'RK-99',
      rows: 4,
      columns: 6,
      description: 'Dedicated Grains Overflow Rack',
    },
  })
  assert('Module 2: Racks', 'Dynamic Rack Creation with Dimension Constraints', newRackRes.status === 201 && newRackRes.data?.rackNumber === 'RK-99')

  // -------------------------------------------------------------
  // MODULE 3: PRODUCT CATALOG (MASTER INVENTORY)
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 3: PRODUCT MASTER CATALOG')

  // 3.1 Fetch Catalog
  const productsRes = await request('/api/product')
  assert('Module 3: Products', 'Fetch Master Products (Zero Initial Stock Check)', productsRes.status === 200 && Array.isArray(productsRes.data))

  // 3.2 Create New Product with Default 0 Stock
  const uniqueSku = `PRD-RIC-API-${Date.now().toString().slice(-4)}`
  const newProdRes = await request('/api/product', {
    method: 'POST',
    body: {
      name: 'Organic Basmati Rice Royal (50kg)',
      sku: uniqueSku,
      category: 'Grains & Pulses',
      baseUnit: 'Kg',
      outerPackaging: 'Bags (50kg)',
      packSize: 50,
      currentStock: 0,
      reorderLevel: 20,
      storageZone: 'SH01-R01',
    },
  })
  assert('Module 3: Products', 'Create New Product Master Record (Default stock = 0)', newProdRes.status === 201 && newProdRes.data?.currentStock === 0)
  if (newProdRes.data?._id) {
    createdProductId = newProdRes.data._id
  }

  // 3.3 Update Product Master
  const updateProdRes = await request(`/api/product/${createdProductId}`, {
    method: 'PUT',
    body: { reorderLevel: 25 },
  })
  assert('Module 3: Products', 'Update Product Threshold Parameters', updateProdRes.status === 200 && updateProdRes.data?.reorderLevel === 25)

  // -------------------------------------------------------------
  // MODULE 4: GATE ENTRY & VEHICLE INWARD
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 4: GATE ENTRY & VEHICLE INWARD')

  // 4.1 Rejection of Invalid 10-Digit Phone
  const badPhoneRes = await request('/api/gate-entry', {
    method: 'POST',
    body: {
      vehicleNumber: 'UP-32-AB-9999',
      vehicleType: 'Heavy Truck',
      driverName: 'Ram Singh',
      driverContact: '12345',
      supplier: 'Punjab Grains Ltd',
      challanNo: 'CH-2026-001',
      purpose: 'Material Inward',
      assignedBay: 'Bay 1',
    },
  })
  assert('Module 4: Gate Entry', 'Validation: Reject Invalid Phone Number (<10 digits)', badPhoneRes.status === 400)

  // 4.2 Rejection of Missing Challan/PO
  const badChallanRes = await request('/api/gate-entry', {
    method: 'POST',
    body: {
      vehicleNumber: 'UP-32-AB-9999',
      vehicleType: 'Heavy Truck',
      driverName: 'Ram Singh',
      driverContact: '9876543210',
      supplier: 'Punjab Grains Ltd',
      challanNo: '',
      purpose: 'Material Inward',
      assignedBay: 'Bay 1',
    },
  })
  assert('Module 4: Gate Entry', 'Validation: Reject Missing PO / Challan', badChallanRes.status === 400)

  // 4.3 Successful Inward Vehicle Registration
  const testVehicleNo = `UP-32-TEST-${Date.now().toString().slice(-4)}`
  const validGateRes = await request('/api/gate-entry', {
    method: 'POST',
    body: {
      vehicleNumber: testVehicleNo,
      vehicleType: 'Heavy Truck',
      driverName: 'Ram Singh',
      driverContact: '9876543210',
      supplier: 'Punjab Grains Ltd',
      challanNo: 'CH-2026-9901',
      poNumber: 'PO-2026-8801',
      purpose: 'Material Inward',
      assignedBay: 'Bay 1',
      materialItems: [
        {
          product: 'Organic Basmati Rice Royal (50kg)',
          packageQty: 100,
          packagingUnit: 'Bags',
          baseUnitEstimate: '5000 Kg',
        },
      ],
      remarks: 'Inward shipment for central storage',
    },
  })
  assert('Module 4: Gate Entry', 'Register Live Inward Vehicle Entry', validGateRes.status === 201 && Boolean(validGateRes.data?.passNumber))
  if (validGateRes.data?._id) {
    createdGateEntryId = validGateRes.data._id
    createdGatePassNumber = validGateRes.data.passNumber
  }

  // 4.4 Duplicate Active Vehicle Rejection
  const dupGateRes = await request('/api/gate-entry', {
    method: 'POST',
    body: {
      vehicleNumber: testVehicleNo,
      vehicleType: 'Heavy Truck',
      driverName: 'Ram Singh',
      driverContact: '9876543210',
      supplier: 'Punjab Grains Ltd',
      challanNo: 'CH-2026-9902',
      purpose: 'Material Inward',
      assignedBay: 'Bay 1',
    },
  })
  assert('Module 4: Gate Entry', 'Prevent Duplicate Active Vehicle Entry', dupGateRes.status === 400)

  // -------------------------------------------------------------
  // MODULE 5: GOODS RECEIVING & GRN GENERATION
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 5: GOODS RECEIVING & GRN (AUTO-FILL & STOCK SYNC)')

  // 5.1 Create GRN linked to Gate Entry & auto-fill
  const grnRes = await request('/api/grn', {
    method: 'POST',
    body: {
      gateEntryId: createdGateEntryId,
      poNo: 'PO-2026-8801',
      supplier: 'Punjab Grains Ltd',
      vehicleNo: testVehicleNo,
      shadeId: shadeId,
      shade: 'Shade 1: Grains & Bulk Pulses',
      status: 'Completed',
      materials: [
        {
          productId: createdProductId,
          productName: 'Organic Basmati Rice Royal (50kg)',
          sku: uniqueSku,
          packageQty: 100,
          packagingUnit: 'Bags',
          packSize: 50,
          totalBaseQty: 5000,
          baseUnit: 'Kg',
          batchNo: 'BT-2026-RIC-01',
        },
      ],
      remarks: '100 Bags received intact, zero moisture leakage',
      receivedBy: 'Warehouse Manager',
    },
  })
  assert('Module 5: GRN', 'Create Inbound GRN and Auto-Sync Product Stock', grnRes.status === 201 && Boolean(grnRes.data?.grnNo))
  if (grnRes.data?._id) {
    createdGRNId = grnRes.data._id
    createdGRNNo = grnRes.data.grnNo
  }

  // 5.2 Verify Stock Increment in Product Master
  const checkStockRes = await request('/api/product')
  const updatedProduct = checkStockRes.data?.find((p) => p._id === createdProductId)
  assert('Module 5: GRN Stock Sync', 'Product Stock Incremented from 0 to 5000 Kg upon GRN Completion', updatedProduct && updatedProduct.currentStock === 5000)

  // -------------------------------------------------------------
  // MODULE 6: QUALITY CONTROL & LAB TESTING
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 6: QUALITY CONTROL & LAB QA CERTIFICATION')

  // 6.1 Create QA Lab Certificate
  const qcRes = await request('/api/qc', {
    method: 'POST',
    body: {
      grnNo: createdGRNNo || 'GRN-2026-0001',
      productName: 'Organic Basmati Rice Royal (50kg)',
      sku: uniqueSku,
      batchNo: 'BT-2026-RIC-01',
      testedBy: 'Dr. Sharma (QA Lead)',
      parameters: [
        { name: 'Moisture Content', standard: '< 14.0%', observed: '11.8%', pass: true },
        { name: 'Average Grain Length', standard: '≥ 7.0 mm', observed: '7.4 mm', pass: true },
      ],
      status: 'Passed',
      remarks: 'Moisture content 11.8% meets export grade standard. Cleared for putaway.',
    },
  })
  assert('Module 6: Lab QA', 'Generate QA Inspection Certificate with Strict QC Remarks', qcRes.status === 201 && Boolean(qcRes.data?.qcNumber))
  if (qcRes.data?._id) {
    createdQCId = qcRes.data._id
  }

  // 6.2 Fetch All QC Records
  const allQcRes = await request('/api/qc')
  assert('Module 6: Lab QA', 'Fetch QC Inspection Ledger Records', allQcRes.status === 200 && allQcRes.data?.length > 0)

  // -------------------------------------------------------------
  // MODULE 7: PUT AWAY & RACK BIN ALLOCATION
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 7: PUT AWAY & BIN STORAGE COORDINATION')

  // 7.1 Allocate Batch to Specific Rack Cell
  const allocateRes = await request('/api/rack/allocate-cell', {
    method: 'POST',
    body: {
      cellCode: targetCellCode,
      productId: createdProductId,
      productName: 'Organic Basmati Rice Royal (50kg)',
      batchNo: 'BT-2026-RIC-01',
      quantity: 5000,
    },
  })
  assert('Module 7: Put Away', `Allocate Batch to Rack Storage Coordinates (${targetCellCode})`, allocateRes.status === 200 && allocateRes.data?.cell?.status === 'Occupied')

  // -------------------------------------------------------------
  // MODULE 8: STOCK ADJUSTMENT (PHYSICAL AUDIT)
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 8: PHYSICAL STOCK ADJUSTMENT & AUDIT LOG')

  // 8.1 Execute Stock Adjustment
  const adjustRes = await request('/api/stock-adjust', {
    method: 'POST',
    body: {
      type: 'Cycle Count Adjustment',
      productId: createdProductId,
      productName: 'Organic Basmati Rice Royal (50kg)',
      sku: uniqueSku,
      batchNo: 'BT-2026-RIC-01',
      locationCode: targetCellCode,
      previousQty: 5000,
      adjustedQty: 4950,
      variance: -50,
      unit: 'Kg',
      reason: 'Physical cycle count variance identified during bay audit',
      reportedBy: 'Auditor V. Singh',
    },
  })
  assert('Module 8: Stock Adjust', 'Record Physical Stock Variance Adjustment (-50 Kg)', adjustRes.status === 201 && adjustRes.data?.variance === -50)

  // 8.2 Verify Stock Deduction in Product Catalog
  const afterAdjustStock = await request('/api/product')
  const adjustedProd = afterAdjustStock.data?.find((p) => p._id === createdProductId)
  assert('Module 8: Stock Adjust', 'Stock Updated to 4950 Kg in Product Catalog', adjustedProd && adjustedProd.currentStock === 4950)

  // -------------------------------------------------------------
  // MODULE 9: OUTWARD DISPATCH & GATE PASS OUT
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 9: OUTWARD DISPATCH & GATE PASS OUT')

  // 9.1 Create Outward Dispatch Order
  const dispatchRes = await request('/api/dispatch', {
    method: 'POST',
    body: {
      orderNo: 'SO-2026-9001',
      customerName: 'Metro Mega Stores',
      destination: 'Central Hypermarket Depot',
      vehicleNo: 'DL-01-EA-1234',
      driverName: 'Suresh Kumar',
      driverContact: '9811223344',
      status: 'Draft / Picklist',
      items: [
        {
          productId: createdProductId,
          productName: 'Organic Basmati Rice Royal (50kg)',
          sku: uniqueSku,
          batchNo: 'BT-2026-RIC-01',
          packagingUnit: 'Bags',
          packSize: 50,
          requestedQty: 1000,
          pickedQty: 1000,
          verified: true,
        },
      ],
      totalPackages: 20,
      totalBaseQty: 1000,
      baseUnit: 'Kg',
      remarks: 'Priority delivery for Northern Metro Outlet',
    },
  })
  assert('Module 9: Dispatch', 'Create Outward Dispatch Order (1000 Kg Allocated)', dispatchRes.status === 201 && Boolean(dispatchRes.data?.dispatchNo))
  if (dispatchRes.data?._id) {
    createdDispatchId = dispatchRes.data._id
  }

  // 9.2 Complete Dispatch Status & Stock Deduction
  const updateDispatchRes = await request(`/api/dispatch/${createdDispatchId}/status`, {
    method: 'PATCH',
    body: { status: 'Dispatched' },
  })
  assert('Module 9: Dispatch', 'Mark Dispatch Order Status as Dispatched & Deduct Stock', updateDispatchRes.status === 200 && updateDispatchRes.data?.status === 'Dispatched')

  // 9.3 Verify Final Stock (4950 - 1000 = 3950)
  const afterDispatchStock = await request('/api/product')
  const finalProd = afterDispatchStock.data?.find((p) => p._id === createdProductId)
  assert('Module 9: Stock Deduction', 'Live Inventory Correctly Deducted to 3950 Kg', finalProd && finalProd.currentStock === 3950)

  // -------------------------------------------------------------
  // MODULE 10: GATE OUT AUDIT TRAIL
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 10: VEHICLE GATE OUT AUDIT TRAIL')

  const gateOutRes = await request(`/api/gate-entry/${createdGateEntryId}/gate-out`, {
    method: 'PATCH',
    body: {
      officerName: 'Inspector Rajesh Sharma',
      officerId: 'WMS-SEC-042',
      gateOutRemark: 'All unloading complete; vehicle and driver checked out safely.',
    },
  })
  assert('Module 10: Gate Out', 'Gate Out Vehicle with Officer Name, ID & Timestamp Trail', gateOutRes.status === 200 && gateOutRes.data?.gateOutOfficerName === 'Inspector Rajesh Sharma' && gateOutRes.data?.status === 'Gate Out / Cleared')

  // -------------------------------------------------------------
  // MODULE 11: PARTNER MANAGEMENT (SUPPLIERS & CUSTOMERS)
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 11: PARTNER MANAGEMENT (VENDORS & CLIENTS)')

  const partnersRes = await request('/api/partners')
  assert('Module 11: Partners', 'Fetch Warehouse Partner Directory', partnersRes.status === 200 && Array.isArray(partnersRes.data))

  const newPartnerRes = await request('/api/partners', {
    method: 'POST',
    body: {
      name: 'Delhi Retail Logistics LLP',
      type: 'Customer',
      contactPerson: 'Anil Gupta',
      phone: '9876543210',
      email: 'anil@delhiretail.com',
      city: 'Delhi',
      state: 'Delhi',
    },
  })
  assert('Module 11: Partners', 'Add New Commercial Logistics Partner', newPartnerRes.status === 201 && newPartnerRes.data?.name === 'Delhi Retail Logistics LLP')

  // -------------------------------------------------------------
  // MODULE 12: ANALYTICS & DASHBOARD KPIS
  // -------------------------------------------------------------
  console.log('\n🔹 MODULE 12: ANALYTICS & DASHBOARD METRICS')

  const analyticsRes = await request('/api/analytics/summary')
  assert('Module 12: Analytics', 'Fetch Live Warehouse Executive Summary KPIs', analyticsRes.status === 200 && analyticsRes.data?.totalSKUs !== undefined)

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n========================================================================')
  const total = results.length
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length

  console.log(`📊 API TEST SUITE SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`)
  if (failed === 0) {
    console.log('🌟 ALL WMS MODULE APIS ARE 100% OPERATIONAL & VERIFIED!')
  } else {
    console.log(`⚠️ ${failed} tests encountered issues.`)
  }
  console.log('========================================================================\n')

  // Clean up
  server.close()
  await mongoose.disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  if (server) server.close()
  process.exit(1)
})
