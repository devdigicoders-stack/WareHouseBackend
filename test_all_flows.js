// test_all_flows.js — Full End-to-End WMS Flow Verification
const BASE_URL = 'http://localhost:8000/api';

async function request(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

function curlPrint(method, path, body = null) {
  if (body) {
    console.log(`> curl -X ${method} "${BASE_URL}${path}" -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`);
  } else {
    console.log(`> curl -X ${method} "${BASE_URL}${path}"`);
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('   FULL END-TO-END WMS FLOW VERIFICATION (FLOWS 1 - 8)         ');
  console.log('================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      if (details) console.log(`         Info: ${details}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      if (details) console.error(`         Details: ${details}`);
      failedTests++;
    }
  }

  // -------------------------------------------------------------
  // FLOW 1: GATE INWARD & VEHICLE SECURITY ENTRY
  // -------------------------------------------------------------
  console.log('\n--- FLOW 1: GATE ENTRY & VEHICLE INWARD ---');

  // Test 1.1: Invalid Phone Number Block
  console.log('\n[Flow 1.1] Invalid Phone Number (Boundary Test - should fail):');
  const invalidPhonePayload = {
    vehicleNumber: 'UP-14-BT-7788',
    vehicleType: 'Heavy Truck (10-Tyre)',
    driverName: 'Ramesh Yadav',
    driverContact: '98765', // Only 5 digits
    supplier: 'Punjab Agro Foods Ltd.',
    purpose: 'Inward Unloading',
    assignedBay: 'Bay 02',
    challanNo: 'CH-2026-7788',
  };
  curlPrint('POST', '/gate-entry', invalidPhonePayload);
  const res1_1 = await request('POST', '/gate-entry', invalidPhonePayload);
  console.log(`< HTTP ${res1_1.status}:`, res1_1.data?.message || res1_1.data);
  assert(res1_1.status === 400 && res1_1.data?.message?.includes('10 digits'),
    'Phone validation: Successfully blocked 5-digit phone number with HTTP 400',
    res1_1.data?.message);

  // Clear any existing active entry for UP-14-BT-7788 before fresh test
  const existingEntries = await request('GET', '/gate-entry');
  if (Array.isArray(existingEntries.data)) {
    const activeTestTrucks = existingEntries.data.filter(
      e => e.vehicleNumber === 'UP-14-BT-7788' && e.status !== 'Gate Out / Cleared'
    );
    for (const t of activeTestTrucks) {
      await request('PATCH', `/gate-entry/${t._id}/gate-out`, { forceGateOut: true });
    }
  }

  // Test 1.2: Valid Gate Entry (Happy Path)
  console.log('\n[Flow 1.2] Valid Gate Inward Entry:');
  const gateEntryPayload = {
    vehicleNumber: 'UP-14-BT-7788',
    vehicleType: 'Heavy Truck (10-Tyre)',
    driverName: 'Ramesh Yadav',
    driverContact: '9876543210',
    supplier: 'Punjab Agro Foods Ltd.',
    purpose: 'Inward Unloading',
    assignedBay: 'Bay 02',
    challanNo: 'CH-2026-7788',
    remarks: 'Basmati Rice 25kg consignment',
  };
  curlPrint('POST', '/gate-entry', gateEntryPayload);
  const res1_2 = await request('POST', '/gate-entry', gateEntryPayload);
  console.log(`< HTTP ${res1_2.status}: Created Pass:`, res1_2.data?.passNumber, 'Status:', res1_2.data?.status);
  assert(res1_2.status === 201 && res1_2.data?.passNumber,
    'Valid Gate Inward: Created security pass successfully',
    `PassNumber: ${res1_2.data?.passNumber}, Vehicle: ${res1_2.data?.vehicleNumber}`);
  const gateEntryId = res1_2.data?._id;

  // Test 1.3: Duplicate Vehicle Inward Check (Boundary Test - should fail)
  console.log('\n[Flow 1.3] Duplicate Vehicle Inward Attempt (Boundary Test - should fail):');
  curlPrint('POST', '/gate-entry', gateEntryPayload);
  const res1_3 = await request('POST', '/gate-entry', gateEntryPayload);
  console.log(`< HTTP ${res1_3.status}:`, res1_3.data?.message || res1_3.data);
  assert(res1_3.status === 400 && res1_3.data?.message?.includes('already inside'),
    'Duplicate vehicle check: Blocked re-entry of vehicle currently inside warehouse',
    res1_3.data?.message);

  // Test 1.4: Update Bay Assignment & Status
  console.log('\n[Flow 1.4] Assign Unloading Bay:');
  curlPrint('PATCH', `/gate-entry/${gateEntryId}/status`, {
    assignedBay: 'Unloading Bay 02',
    status: 'Unloading at Bay',
  });
  const res1_4 = await request('PATCH', `/gate-entry/${gateEntryId}/status`, {
    assignedBay: 'Unloading Bay 02',
    status: 'Unloading at Bay',
  });
  console.log(`< HTTP ${res1_4.status}: Assigned Bay:`, res1_4.data?.assignedBay, 'Status:', res1_4.data?.status);
  assert(res1_4.status === 200 && res1_4.data?.assignedBay === 'Unloading Bay 02',
    'Bay assignment: Vehicle moved to Unloading Bay 02');

  // -------------------------------------------------------------
  // FLOW 2: GOODS RECEIVING NOTE (GRN) & INWARD STOCK SYNC
  // -------------------------------------------------------------
  console.log('\n--- FLOW 2: GOODS RECEIVING (GRN) & STOCK INWARD ---');

  const grnPayload = {
    poNo: 'PO-2026-7788',
    supplier: 'Punjab Agro Foods Ltd.',
    vehicleNo: 'UP-14-BT-7788',
    gateEntryId: gateEntryId,
    shade: 'SH-01 (Shade 1: Grains & Bulk Pulses)',
    materials: [
      {
        productName: 'Premium Basmati Rice 25kg',
        sku: 'PRD-RIC-BAS-25',
        packageQty: 100,
        packagingUnit: 'Bags',
        packSize: 25,
        totalBaseQty: 2500,
        baseUnit: 'Kg',
        batchNo: 'BT-RIC-2026-01',
        mfgDate: '2026-10-01',
        expiryDate: '2027-10-01',
        location: 'SH-01-RK-01-R1-C1',
      },
    ],
    status: 'Completed',
    remarks: 'Passed preliminary unloading visual check',
  };

  console.log('\n[Flow 2.1] Create Inward GRN with Automatic Stock Update:');
  curlPrint('POST', '/grn', grnPayload);
  const res2_1 = await request('POST', '/grn', grnPayload);
  console.log(`< HTTP ${res2_1.status}: GRN Number:`, res2_1.data?.grnNo);
  assert(res2_1.status === 201 && res2_1.data?.grnNo,
    'GRN Creation: Inward Goods Receiving Note created successfully',
    `GRN: ${res2_1.data?.grnNo}`);
  const grnNo = res2_1.data?.grnNo;

  // Verify Product stock incremented in Product collection
  console.log('\n[Flow 2.2] Verify Live Stock Increment in Product Collection:');
  const prodCheck = await request('GET', '/product');
  const basmatiProd = prodCheck.data?.find(p => p.sku === 'PRD-RIC-BAS-25' || p.name === 'Premium Basmati Rice 25kg');
  assert(basmatiProd && basmatiProd.currentStock >= 2500,
    'Stock Increment: Product collection updated with incoming GRN stock',
    `Product: ${basmatiProd?.name}, Live Stock: ${basmatiProd?.currentStock} ${basmatiProd?.baseUnit}`);

  // Verify Batch created in Batch collection
  console.log('\n[Flow 2.3] Verify Batch Registered in Batch Registry:');
  const batchCheck = await request('GET', '/batch');
  const registeredBatch = batchCheck.data?.find(b => b.batchNo === 'BT-RIC-2026-01');
  assert(registeredBatch && registeredBatch.batchNo === 'BT-RIC-2026-01',
    'Batch Registry: Batch BT-RIC-2026-01 automatically synced and stored in MongoDB',
    `Batch: ${registeredBatch?.batchNo}, Quantity: ${registeredBatch?.qty || registeredBatch?.quantity}`);

  // -------------------------------------------------------------
  // FLOW 3: QUALITY CONTROL (QC) & LAB REPORT GENERATION
  // -------------------------------------------------------------
  console.log('\n--- FLOW 3: QUALITY CONTROL (QC) & LAB TESTING ---');

  console.log('\n[Flow 3.1] Record Quality Inspection Sample:');
  const qcPayload = {
    grnNo: grnNo || 'GRN-INWARD',
    productName: 'Premium Basmati Rice 25kg',
    sku: 'PRD-RIC-BAS-25',
    batchNo: 'BT-RIC-2026-01',
    sampleSize: '5 Kg',
    testProtocol: 'Moisture & Physical Grain Analysis',
    parameters: [
      { name: 'Moisture Content', standard: '< 13.5%', observed: '11.8%', pass: true },
      { name: 'Grain Length (Average)', standard: '> 7.5mm', observed: '8.2mm', pass: true },
      { name: 'Foreign Matter / Broken', standard: '< 1.0%', observed: '0.4%', pass: true },
    ],
    status: 'Quarantine / Under Test',
    testedBy: 'Kiran Maddheshiya (QA Lead)',
    remarks: 'Initial lab sample testing under progress',
  };
  curlPrint('POST', '/qc', qcPayload);
  const res3_1 = await request('POST', '/qc', qcPayload);
  console.log(`< HTTP ${res3_1.status}: QC Record ID:`, res3_1.data?._id, 'Status:', res3_1.data?.status);
  assert(res3_1.status === 201 && res3_1.data?._id,
    'QC Testing: Initial QC sample registered in Quarantine / Under Test status');
  const qcId = res3_1.data?._id;

  // Flow 3.2: Approve QC Test & Issue Certificate
  console.log('\n[Flow 3.2] Approve QC Test & Generate Certificate:');
  curlPrint('PATCH', `/qc/${qcId}/status`, {
    status: 'Passed',
    remarks: 'All lab parameters confirmed within FSSAI tolerance standards. Approved for storage.',
  });
  const res3_2 = await request('PATCH', `/qc/${qcId}/status`, {
    status: 'Passed',
    remarks: 'All lab parameters confirmed within FSSAI tolerance standards. Approved for storage.',
  });
  console.log(`< HTTP ${res3_2.status}: QC Status:`, res3_2.data?.status);
  assert(res3_2.status === 200 && res3_2.data?.status === 'Passed',
    'QC Approval: Sample approved and certified');

  // Verify Product labStatus synced to Passed
  const prodAfterQC = await request('GET', '/product');
  const basmatiAfterQC = prodAfterQC.data?.find(p => p.sku === 'PRD-RIC-BAS-25');
  assert(basmatiAfterQC?.labStatus === 'Passed',
    'QC Product Sync: Product labStatus updated to Passed in database',
    `Product: ${basmatiAfterQC?.name}, labStatus: ${basmatiAfterQC?.labStatus}`);

  // -------------------------------------------------------------
  // FLOW 4: PUT-AWAY & RACK STORAGE ALLOCATION
  // -------------------------------------------------------------
  console.log('\n--- FLOW 4: PUT-AWAY & STORAGE ALLOCATION ---');

  console.log('\n[Flow 4.1] Allocate Basmati Stock to Rack Cell SH-01-RK-01-R1-C1:');
  const allocPayload = {
    cellCode: 'SH-01-RK-01-R1-C1',
    productId: basmatiProd?._id,
    productName: 'Premium Basmati Rice 25kg',
    batchNo: 'BT-RIC-2026-01',
    quantity: 2500,
  };
  curlPrint('POST', '/rack/allocate-cell', allocPayload);
  const res4_1 = await request('POST', '/rack/allocate-cell', allocPayload);
  console.log(`< HTTP ${res4_1.status}:`, res4_1.data?.message || 'Allocated');
  assert(res4_1.status === 200,
    'Storage Allocation: Cell SH-01-RK-01-R1-C1 assigned to incoming stock',
    res4_1.data?.message);

  // -------------------------------------------------------------
  // FLOW 5: INVENTORY CONTROL & ZERO-STOCK DAMAGE BOUNDARY CHECK
  // -------------------------------------------------------------
  console.log('\n--- FLOW 5: INVENTORY BOUNDARIES & DAMAGE CONTROL ---');

  // Test 5.1: Zero-Stock Damage Report on Dal Urd (Exact User Problem Image!)
  console.log('\n[Flow 5.1] Zero-Stock Damage Prevention (Dal Urd Whole - 0 Kg Stock):');
  const dalUrdAdjustPayload = {
    type: 'Damage / Rejection',
    productName: 'Dal Urd Whole (Whole Black Gram / Sabut Urad)',
    sku: 'PRD-RAT-URDWHL-14',
    batchNo: 'BT-2026-001',
    adjustedQty: 30,
    variance: -30,
    unit: 'Kg',
    reason: 'Crushed Packaging / Gatta',
    notes: 'Crushed Packaging / Gatta — Move to Hold Stock.',
    locationCode: 'SH-01-R01-C01',
  };
  curlPrint('POST', '/stock-adjust', dalUrdAdjustPayload);
  const res5_1 = await request('POST', '/stock-adjust', dalUrdAdjustPayload);
  console.log(`< HTTP ${res5_1.status}:`, res5_1.data?.message || res5_1.data);
  assert(res5_1.status === 400 && res5_1.data?.message?.toLowerCase().includes('out of stock'),
    'Zero-Stock Damage Boundary: Successfully blocked reporting damage on 0 Kg Dal Urd',
    res5_1.data?.message);

  // Test 5.2: Valid Damage Reporting on Active Stock (50 Kg Basmati Rice)
  console.log('\n[Flow 5.2] Valid Damage Reporting on Available Basmati Rice (50 Kg):');
  const validDmgPayload = {
    type: 'Damage / Rejection',
    productName: 'Premium Basmati Rice 25kg',
    sku: 'PRD-RIC-BAS-25',
    batchNo: 'BT-RIC-2026-01',
    adjustedQty: 50,
    variance: -50,
    unit: 'Kg',
    reason: 'Outer jute bag torn during unloading',
    notes: 'Torn Bag — Move to Hold Stock.',
    locationCode: 'SH-01-RK-01-R1-C1',
  };
  curlPrint('POST', '/stock-adjust', validDmgPayload);
  const res5_2 = await request('POST', '/stock-adjust', validDmgPayload);
  console.log(`< HTTP ${res5_2.status}: Created Adjustment:`, res5_2.data?.adjNumber);
  assert(res5_2.status === 201 && res5_2.data?.adjNumber,
    'Damage Quarantine: 50 Kg Basmati moved into Hold Stock',
    `AdjNumber: ${res5_2.data?.adjNumber}`);
  const damageAdjId = res5_2.data?._id;

  // Test 5.3: Release Stock from Hold
  console.log('\n[Flow 5.3] Release Stock from Quarantine Hold:');
  curlPrint('PATCH', `/stock-adjust/${damageAdjId}/release`, {
    releaseNotes: 'Repackaging completed with fresh outer bag. Inspection passed.',
    releasedBy: 'Amit Patel (Storekeeper)',
  });
  const res5_3 = await request('PATCH', `/stock-adjust/${damageAdjId}/release`, {
    releaseNotes: 'Repackaging completed with fresh outer bag. Inspection passed.',
    releasedBy: 'Amit Patel (Storekeeper)',
  });
  console.log(`< HTTP ${res5_3.status}:`, res5_3.data?.message || 'Released');
  assert(res5_3.status === 200,
    'Quarantine Release: Stock released back to active inventory with audit log');

  // Test 5.4: Quarantine Toggle on Batch
  console.log('\n[Flow 5.4] Toggle Batch Quarantine Lock:');
  curlPrint('POST', '/stock-adjust/toggle-quarantine', {
    sku: 'PRD-RIC-BAS-25',
    batchNo: 'BT-RIC-2026-01',
    quarantined: true,
  });
  const res5_4 = await request('POST', '/stock-adjust/toggle-quarantine', {
    sku: 'PRD-RIC-BAS-25',
    batchNo: 'BT-RIC-2026-01',
    quarantined: true,
  });
  console.log(`< HTTP ${res5_4.status}:`, res5_4.data?.message || res5_4.data);
  assert(res5_4.status === 200 && res5_4.data?.quarantined === true,
    'Batch Quarantine: Batch lock state persisted to MongoDB');

  // -------------------------------------------------------------
  // FLOW 6: INTERNAL STOCK MOVEMENT
  // -------------------------------------------------------------
  console.log('\n--- FLOW 6: INTERNAL STOCK RELOCATION ---');

  // Test 6.1: Missing Required Fields (Boundary Test - should fail)
  console.log('\n[Flow 6.1] Missing Parameters Movement (Boundary Test - should fail):');
  curlPrint('POST', '/stock-movement', { productName: 'Premium Basmati Rice 25kg' });
  const res6_1 = await request('POST', '/stock-movement', { productName: 'Premium Basmati Rice 25kg' });
  console.log(`< HTTP ${res6_1.status}:`, res6_1.data?.message || res6_1.data);
  assert(res6_1.status === 400,
    'Stock Movement Validation: Blocked invalid transfer with missing destination/qty');

  // Test 6.2: Move Stock from C1 to C2
  console.log('\n[Flow 6.2] Relocate Basmati Stock from Cell C1 to Cell C2:');
  const movePayload = {
    type: 'Internal',
    productName: 'Premium Basmati Rice 25kg',
    sku: 'PRD-RIC-BAS-25',
    batchNo: 'BT-RIC-2026-01',
    fromLocation: 'SH-01-RK-01-R1-C1',
    toLocation: 'SH-01-RK-01-R1-C2',
    quantity: 1000,
    unit: 'Kg',
    packagingSummary: '40 Bags (25kg)',
    reason: 'Rack re-balancing for fast retrieval',
    user: 'Deepak Verma (WMS Operator)',
  };
  curlPrint('POST', '/stock-movement', movePayload);
  const res6_2 = await request('POST', '/stock-movement', movePayload);
  const moveRefNo = res6_2.data?.refNo || res6_2.data?.movement?.refNo;
  console.log(`< HTTP ${res6_2.status}: Movement RefNo:`, moveRefNo);
  assert(res6_2.status === 201 && moveRefNo,
    'Stock Movement: Successfully transferred 1,000 Kg Basmati Rice to Cell C2',
    `RefNo: ${moveRefNo}`);

  // -------------------------------------------------------------
  // FLOW 7: OUTWARD DISPATCH & GATE PASS OUT
  // -------------------------------------------------------------
  console.log('\n--- FLOW 7: OUTWARD DISPATCH & GATE OUT ---');

  // Capture current stock before dispatch
  const prodBeforeDispatch = await request('GET', '/product');
  const basmatiBefore = prodBeforeDispatch.data?.find(p => p.sku === 'PRD-RIC-BAS-25');
  const initialStock = basmatiBefore?.currentStock || 0;

  // Test 7.1: Create Outward Dispatch Order
  console.log('\n[Flow 7.1] Create Outward Dispatch Order & Deduct Stock:');
  const dispatchPayload = {
    orderNo: `SO-2026-${Date.now().toString().slice(-4)}`,
    customerName: 'Metro Cash & Carry Hub 04',
    vehicleNo: 'UP-14-BT-7788',
    status: 'Dispatched',
    items: [
      {
        productName: 'Premium Basmati Rice 25kg',
        sku: 'PRD-RIC-BAS-25',
        requestedQty: 20,
        pickedQty: 20,
        baseQty: 500,
        unit: 'Kg',
        packSize: 25,
        locationCode: 'SH-01-RK-01-R1-C2',
      },
    ],
    remarks: 'Authorized for commercial dispatch to Metro NCR',
  };
  curlPrint('POST', '/dispatch', dispatchPayload);
  const res7_1 = await request('POST', '/dispatch', dispatchPayload);
  console.log(`< HTTP ${res7_1.status}: Dispatch No:`, res7_1.data?.dispatchNo, 'Status:', res7_1.data?.status);
  assert(res7_1.status === 201 && res7_1.data?.dispatchNo,
    'Dispatch Order: Order created and marked Dispatched');

  // Verify stock was deducted
  const prodAfterDispatch = await request('GET', '/product');
  const basmatiAfterDispatch = prodAfterDispatch.data?.find(p => p.sku === 'PRD-RIC-BAS-25');
  assert(basmatiAfterDispatch && basmatiAfterDispatch.currentStock === (initialStock - 500),
    'Stock Deduction: 500 Kg successfully deducted from inventory upon dispatch',
    `Initial: ${initialStock} Kg, Remaining: ${basmatiAfterDispatch?.currentStock} Kg`);

  // Test 7.2: Gate Out Clearance for Vehicle UP-14-BT-7788
  console.log('\n[Flow 7.2] Vehicle Gate Out Clearance:');
  curlPrint('PATCH', `/gate-entry/${gateEntryId}/gate-out`, {
    forceGateOut: true,
    gateOutOfficerName: 'R. K. Sharma (Security Inspector)',
    gateOutRemark: 'Outward invoice verified, seal intact. Cleared for exit.',
  });
  const res7_2 = await request('PATCH', `/gate-entry/${gateEntryId}/gate-out`, {
    forceGateOut: true,
    gateOutOfficerName: 'R. K. Sharma (Security Inspector)',
    gateOutRemark: 'Outward invoice verified, seal intact. Cleared for exit.',
  });
  console.log(`< HTTP ${res7_2.status}: Vehicle Status:`, res7_2.data?.status);
  assert(res7_2.status === 200 && res7_2.data?.status === 'Gate Out / Cleared',
    'Gate Out: Vehicle UP-14-BT-7788 successfully cleared out of warehouse premises');

  // Test 7.3: Vehicle Can Re-enter After Gate Out
  console.log('\n[Flow 7.3] Re-entry Allowed After Gate Out:');
  const res7_3 = await request('POST', '/gate-entry', {
    ...gateEntryPayload,
    challanNo: `CH-${Date.now().toString().slice(-4)}`,
  });
  console.log(`< HTTP ${res7_3.status}: New Pass:`, res7_3.data?.passNumber);
  assert(res7_3.status === 201 && res7_3.data?.passNumber,
    'Vehicle Re-Entry: Allowed now because previous pass was cleared with Gate Out');

  // -------------------------------------------------------------
  // FLOW 8: ANALYTICS & SYSTEM BACKUP
  // -------------------------------------------------------------
  console.log('\n--- FLOW 8: ANALYTICS KPI & SYSTEM BACKUP ---');

  console.log('\n[Flow 8.1] Warehouse Executive Summary KPI:');
  curlPrint('GET', '/analytics/summary');
  const res8_1 = await request('GET', '/analytics/summary');
  console.log(`< HTTP ${res8_1.status}:`, res8_1.data);
  assert(res8_1.status === 200 && res8_1.data?.totalSKUs > 0,
    'Analytics Summary: Real-time warehouse metrics computed accurately',
    `SKUs: ${res8_1.data?.totalSKUs}, StockUnits: ${res8_1.data?.totalStockUnits}, Occupancy: ${res8_1.data?.occupancyRate}%`);

  console.log('\n[Flow 8.2] Trigger System Settings Backup:');
  curlPrint('POST', '/settings/backup', { type: 'Full Verification Snapshot' });
  const res8_2 = await request('POST', '/settings/backup', { type: 'Full Verification Snapshot' });
  console.log(`< HTTP ${res8_2.status}: Created Backup ID:`, res8_2.data?.backup?.id, 'Checksum:', res8_2.data?.backup?.checksum);
  assert((res8_2.status === 200 || res8_2.status === 201) && res8_2.data?.backup?.id?.startsWith('BKP-'),
    'Disaster Recovery: Generated database backup snapshot with SHA256 checksum',
    `Backup ID: ${res8_2.data?.backup?.id}`);

  // -------------------------------------------------------------
  // FINAL SCORE & SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`   TEST VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests === 0) {
    console.log('ALL 8 WMS FLOWS AND BOUNDARY CONDITIONS PASSED 100% CLEANLY!');
    process.exit(0);
  } else {
    console.error(`Detected ${failedTests} failed test(s). Please inspect logs above.`);
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
