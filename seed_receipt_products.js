// seed_receipt_products.js — Adds all 18 products from warehouse paper receipt
const BASE_URL = 'http://localhost:8000/api';

const products = [
  // 1. ATTA
  {
    name: 'Atta (Chakki Fresh Whole Wheat Flour)',
    sku: 'PRD-ATT-001',
    category: 'Grains & Pulses',
    brand: 'Depot Standard',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 80,
    hsnCode: '1101.00',
    description: 'Whole wheat atta flour packed in 50kg standard gunny/PP sacks.',
  },
  // 2. RICE
  {
    name: 'Rice (White / Raw Milled Rice)',
    sku: 'PRD-RIC-001',
    category: 'Grains & Pulses',
    brand: 'Depot Standard',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 100,
    hsnCode: '1006.30',
    description: 'Milled polished grain rice packed in 50kg jute/PP bags.',
  },
  // 3. SUGAR
  {
    name: 'Sugar (Refined Crystal White Sugar)',
    sku: 'PRD-SUG-001',
    category: 'Packaged Food & FMCG',
    brand: 'Commercial Grade',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 60,
    hsnCode: '1701.99',
    description: 'Refined white cane sugar in 50kg double-stitched moisture-proof bags.',
  },
  // 4. REFINED SUNFLOWER OIL
  {
    name: 'Refined Sunflower Oil (15L)',
    sku: 'PRD-OIL-SUN-001',
    category: 'Edible Oils & Liquids',
    brand: 'Apex Pure',
    baseUnit: 'Litre',
    outerPackaging: 'Tin',
    packSize: 15,
    currentStock: 0,
    reorderLevel: 40,
    hsnCode: '1512.19',
    description: 'Refined edible sunflower cooking oil packed in sealed 15L tin containers.',
  },
  // 5. R/M/OIL (Refined / Raw Mustard Oil)
  {
    name: 'Mustard Oil R/M/Oil (Kachi Ghani / Refined 15L)',
    sku: 'PRD-OIL-MST-001',
    category: 'Edible Oils & Liquids',
    brand: 'Kachi Ghani Mustard',
    baseUnit: 'Litre',
    outerPackaging: 'Tin',
    packSize: 15,
    currentStock: 0,
    reorderLevel: 40,
    hsnCode: '1514.91',
    description: 'High-pungency mustard oil packed in standard 15L metal tins.',
  },
  // 6. R/GN/OIL (Refined Groundnut Oil)
  {
    name: 'Refined Groundnut Oil R/GN/Oil (15L)',
    sku: 'PRD-OIL-GNT-001',
    category: 'Edible Oils & Liquids',
    brand: 'Pure Groundnut Oil',
    baseUnit: 'Litre',
    outerPackaging: 'Tin',
    packSize: 15,
    currentStock: 0,
    reorderLevel: 30,
    hsnCode: '1508.90',
    description: 'Cold-filtered groundnut / peanut cooking oil in 15L tin containers.',
  },
  // 7. SALT
  {
    name: 'Salt (Refined Iodized Free-Flowing Salt)',
    sku: 'PRD-SLT-001',
    category: 'Packaged Food & FMCG',
    brand: 'Iodized Grade',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '2501.00',
    description: 'Refined edible iodized salt in 50kg HDPE woven sacks.',
  },
  // 8. DAL CHANA
  {
    name: 'Dal Chana (Bengal Gram Split Pulses)',
    sku: 'PRD-DAL-CHN-001',
    category: 'Grains & Pulses',
    brand: 'Depot Standard Pulses',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '0713.20',
    description: 'Polished cleaned yellow split chana dal in 50kg sacks.',
  },
  // 9. MOONG WHOLE
  {
    name: 'Moong Whole (Whole Green Gram / Sabut Moong)',
    sku: 'PRD-MNG-WHL-001',
    category: 'Grains & Pulses',
    brand: 'Depot Standard Pulses',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '0713.31',
    description: 'Whole green gram beans (Sabut Moong) in 50kg jute gunny bags.',
  },
  // 10. DAL MASUR WHOLE
  {
    name: 'Dal Masur Whole (Whole Red Lentils / Sabut Masoor)',
    sku: 'PRD-DAL-MSR-WHL-001',
    category: 'Grains & Pulses',
    brand: 'Depot Standard Pulses',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '0713.40',
    description: 'Unpolished whole brown/red masoor lentils packed in 50kg woven sacks.',
  },
  // 11. DAL URD CRD
  {
    name: 'Dal Urd CRD (Split Black Gram with Husk / Urad Chilka)',
    sku: 'PRD-DAL-URD-CRD-001',
    category: 'Grains & Pulses',
    brand: 'Depot Standard Pulses',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '0713.31',
    description: 'Crushed/split black gram with husk (Dal Urad Chilka) in 50kg bags.',
  },
  // 12. MOONG DHULI
  {
    name: 'Moong Dhuli (Washed Split Yellow Moong Dal)',
    sku: 'PRD-MNG-DHL-001',
    category: 'Grains & Pulses',
    brand: 'Depot Standard Pulses',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '0713.31',
    description: 'Skinned yellow split moong dal (Moong Dhuli) packed in 50kg bags.',
  },
  // 13. DAL MASUR 'C'
  {
    name: "Dal Masur 'C' (Cleaned Red Split Masoor Dal)",
    sku: 'PRD-DAL-MSR-C-001',
    category: 'Grains & Pulses',
    brand: 'Depot Standard Pulses',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '0713.40',
    description: 'Cleaned split orange masoor dal (Masur Malkha) in 50kg sacks.',
  },
  // 14. DAL URD WHOLE
  {
    name: 'Dal Urd Whole (Whole Black Gram / Sabut Urad)',
    sku: 'PRD-DAL-URD-WHL-001',
    category: 'Grains & Pulses',
    brand: 'Depot Standard Pulses',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '0713.31',
    description: 'Whole black gram lentils (Sabut Urad) in 50kg bags.',
  },
  // 15. BARLEY CRD
  {
    name: 'Barley CRD (Crushed Barley / Jau Cattle Feed)',
    sku: 'PRD-BRL-CRD-001',
    category: 'Animal Feed & Agro',
    brand: 'Agro Feed Standard',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 60,
    hsnCode: '1003.90',
    description: 'Coarse crushed barley grain for commercial feed in 50kg bags.',
  },
  // 16. HAY BAILED
  {
    name: 'Hay Bailed (Compressed Baled Dry Fodder / Hay)',
    sku: 'PRD-HAY-BLD-001',
    category: 'Animal Feed & Agro',
    brand: 'Agro Fodder Standard',
    baseUnit: 'Kg',
    outerPackaging: 'Bale',
    packSize: 40,
    currentStock: 0,
    reorderLevel: 40,
    hsnCode: '1214.90',
    description: 'High-density dry straw/grass hay compressed into 40kg wire-tied bales.',
  },
  // 17. GRAM CRD
  {
    name: 'Gram CRD (Crushed Bengal Gram / Chana Churi)',
    sku: 'PRD-GRM-CRD-001',
    category: 'Animal Feed & Agro',
    brand: 'Agro Feed Standard',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 50,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '2302.50',
    description: 'Nutritious crushed gram husks & kibbled chana churi in 50kg bags.',
  },
  // 18. BRAN
  {
    name: 'Bran (Pure Wheat Bran / Choker Feed)',
    sku: 'PRD-BRN-001',
    category: 'Animal Feed & Agro',
    brand: 'Milling Co-Product',
    baseUnit: 'Kg',
    outerPackaging: 'Bag',
    packSize: 40,
    currentStock: 0,
    reorderLevel: 50,
    hsnCode: '2302.30',
    description: 'Coarse wheat bran flake choker packed in lightweight 40kg bags.',
  },
];

async function seedProducts() {
  console.log('========================================================================');
  console.log('   ADDING RECEIPT PRODUCTS VIA POST /api/product                        ');
  console.log('========================================================================\n');

  let successCount = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      console.log(`> curl -X POST "${BASE_URL}/product" -H "Content-Type: application/json" -d '${JSON.stringify(p)}'`);
      const res = await fetch(`${BASE_URL}/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        console.log(`< HTTP ${res.status}: Created [${i + 1}/18] ${data.name} (SKU: ${data.sku})\n`);
        successCount++;
      } else {
        console.error(`< HTTP ${res.status}: Failed to create ${p.name}:`, data.message, '\n');
      }
    } catch (err) {
      console.error(`Error adding ${p.name}:`, err.message);
    }
  }

  console.log('========================================================================');
  console.log(`RESULT: Successfully added ${successCount} / ${products.length} products to database!`);
  console.log('========================================================================\n');
}

seedProducts();

