require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const Shade = require('./models/Shade');
const Rack = require('./models/Rack');
const Product = require('./models/Product');
const GRN = require('./models/GRN');

async function clearStorage() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully for storage reset.');

    // 1. Delete all Racks and their Cells (Rows & Columns)
    const rackCount = await Rack.countDocuments();
    const rackRes = await Rack.deleteMany({});
    console.log(`Deleted ${rackRes.deletedCount} racks (and all their Rows, Columns & Cells).`);

    // 2. Delete all Shades
    const shadeCount = await Shade.countDocuments();
    const shadeRes = await Shade.deleteMany({});
    console.log(`Deleted ${shadeRes.deletedCount} shades.`);

    // 3. Clear location references in Product collection
    const prodRes = await Product.updateMany({}, {
      $set: {
        binLocation: '',
        row: '',
        col: '',
        shadeId: '',
        storageZone: 'Unassigned (Awaiting Manual Setup)'
      }
    });
    console.log(`Reset location references on ${prodRes.modifiedCount} products.`);

    // 4. Clear location references in GRN materials
    const grnRes = await GRN.updateMany({}, {
      $set: {
        shade: 'Unassigned',
        shadeId: null,
        'materials.$[].location': '',
        'materials.$[].putAwayStatus': 'Pending'
      }
    });
    console.log(`Reset storage references on ${grnRes.modifiedCount} GRN documents.`);

    console.log('\nSTORAGE SYSTEM IS NOW COMPLETELY FRESH AND EMPTY (0 Shades, 0 Racks, 0 Rows/Columns).');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing storage:', err.message);
    process.exit(1);
  }
}

clearStorage();

