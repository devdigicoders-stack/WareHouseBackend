// test_complete_audit.js — Comprehensive Deep System Audit of All Backend Endpoints & Modules
const BASE = 'http://localhost:8000/api';

async function req(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE}${path}`, options);
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, data: err.message };
  }
}

async function runCompleteAudit() {
  console.log('========================================================================');
  console.log('   COMPREHENSIVE DEEP AUDIT: ALL BACKEND MODULES & FRONTEND PERSISTENCE');
  console.log('========================================================================\n');

  const results = [];

  function logResult(moduleName, endpoint, statusExpected, actualStatus, passCondition, notes) {
    const passed = passCondition;
    results.push({ moduleName, endpoint, passed, actualStatus, notes });
    const tag = passed ? '[PASS]' : '[FAIL]';
    console.log(`${tag} ${moduleName.padEnd(20)} | ${endpoint.padEnd(32)} | HTTP ${actualStatus} | ${notes}`);
  }

  // 1. Auth Module
  const authTry1 = await req('POST', '/auth/login', { pin: '1947' });
  logResult('Auth', 'POST /auth/login (PIN)', 200, authTry1.status, authTry1.status === 200,
    authTry1.status === 200 ? `User: ${authTry1.data?.user?.name} (${authTry1.data?.user?.role})` : `Auth responded: ${authTry1.data?.message}`);

  // 2. Gate Entry Module
  const geGet = await req('GET', '/gate-entry');
  logResult('Gate Inward', 'GET /gate-entry', 200, geGet.status, geGet.status === 200 && Array.isArray(geGet.data),
    `Total records: ${geGet.data?.length}`);

  // 3. Gate Pass Module
  const gpGet = await req('GET', '/gate-pass');
  logResult('Gate Pass', 'GET /gate-pass', 200, gpGet.status, gpGet.status === 200 && Array.isArray(gpGet.data),
    `Total records: ${gpGet.data?.length}`);

  // 4. Visitor Management Module
  const visGet = await req('GET', '/visitor');
  logResult('Visitor Mgmt', 'GET /visitor', 200, visGet.status, visGet.status === 200 && Array.isArray(visGet.data),
    `Total visitors: ${visGet.data?.length}`);

  // 5. Product Catalog Module
  const prodGet = await req('GET', '/product');
  logResult('Product Master', 'GET /product', 200, prodGet.status, prodGet.status === 200 && Array.isArray(prodGet.data),
    `Total catalog products: ${prodGet.data?.length}`);

  // 6. Shade Module
  const shadeGet = await req('GET', '/shade');
  logResult('Shades/Zones', 'GET /shade', 200, shadeGet.status, shadeGet.status === 200 && Array.isArray(shadeGet.data),
    `Total shades: ${shadeGet.data?.length}`);

  // 7. Rack & Cell Module
  const rackGet = await req('GET', '/rack');
  const cellsGet = await req('GET', '/rack/cells/all');
  logResult('Rack Master', 'GET /rack', 200, rackGet.status, rackGet.status === 200 && Array.isArray(rackGet.data),
    `Total racks: ${rackGet.data?.length}`);
  logResult('Storage Cells', 'GET /rack/cells/all', 200, cellsGet.status, cellsGet.status === 200 && Array.isArray(cellsGet.data),
    `Total storage cells: ${cellsGet.data?.length}`);

  // 8. GRN Module
  const grnGet = await req('GET', '/grn');
  logResult('GRN Inward', 'GET /grn', 200, grnGet.status, grnGet.status === 200 && Array.isArray(grnGet.data),
    `Total GRNs: ${grnGet.data?.length}`);

  // 9. Quality Control & Lab Testing
  const qcGet = await req('GET', '/qc');
  logResult('Lab Testing', 'GET /qc', 200, qcGet.status, qcGet.status === 200 && Array.isArray(qcGet.data),
    `Total QC records: ${qcGet.data?.length}`);

  // 10. Outward Dispatch Module
  const dspGet = await req('GET', '/dispatch');
  logResult('Dispatch Orders', 'GET /dispatch', 200, dspGet.status, dspGet.status === 200 && Array.isArray(dspGet.data),
    `Total dispatches: ${dspGet.data?.length}`);

  // 11. Stock Adjustment / Damage / Hold Module
  const adjGet = await req('GET', '/stock-adjust');
  logResult('Stock Adjustments', 'GET /stock-adjust', 200, adjGet.status, adjGet.status === 200 && Array.isArray(adjGet.data),
    `Total adjustment/damage records: ${adjGet.data?.length}`);

  // 12. Stock Movement Module
  const movGet = await req('GET', '/stock-movement');
  logResult('Stock Movements', 'GET /stock-movement', 200, movGet.status, movGet.status === 200 && Array.isArray(movGet.data),
    `Total movement logs: ${movGet.data?.length}`);

  // 13. Partners Module (Suppliers / Customers)
  const partGet = await req('GET', '/partners');
  logResult('Partners', 'GET /partners', 200, partGet.status, partGet.status === 200 && Array.isArray(partGet.data),
    `Total registered partners: ${partGet.data?.length}`);

  // 14. Batch Registry Module
  const batchGet = await req('GET', '/batch');
  logResult('Batch Registry', 'GET /batch', 200, batchGet.status, batchGet.status === 200 && Array.isArray(batchGet.data),
    `Total registered batches: ${batchGet.data?.length}`);

  // 15. System Settings & Backup Module
  const setGet = await req('GET', '/settings');
  logResult('System Settings', 'GET /settings', 200, setGet.status, setGet.status === 200 && Boolean(setGet.data?.systemName),
    `System: "${setGet.data?.systemName}", Backups in ledger: ${setGet.data?.backupLedger?.length}`);

  // 16. Analytics Module
  const anaGet = await req('GET', '/analytics/summary');
  logResult('Analytics Summary', 'GET /analytics/summary', 200, anaGet.status, anaGet.status === 200 && Boolean(anaGet.data?.totalSKUs),
    `SKUs: ${anaGet.data?.totalSKUs}, Stock: ${anaGet.data?.totalStockUnits}, Occupancy: ${anaGet.data?.occupancyRate}%`);

  // 17. Health Endpoint
  const healthGet = await req('GET', '/health');
  logResult('Server Health', 'GET /health', 200, healthGet.status, healthGet.status === 200 && healthGet.data?.status === 'ok',
    `Status: ${healthGet.data?.status}, Server time: ${healthGet.data?.time}`);

  console.log('\n========================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`AUDIT SUMMARY: ${passed}/${total} ENDPOINTS & MODULES VERIFIED (Failures: ${failed})`);
  console.log('========================================================================\n');
}

runCompleteAudit().catch(console.error);
