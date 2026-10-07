const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  category: { type: String, required: true },
  brand: { type: String, default: 'Standard Commercial' },
  baseUnit: { type: String, required: true },
  outerPackaging: { type: String, default: 'Packs' },
  packSize: { type: Number, default: 1, min: 1 },
  currentStock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 50 },
  storageZone: { type: String, default: '' },
  shadeId: { type: String, default: '' },
  row: { type: String, default: 'R01' },
  col: { type: String, default: 'C01' },
  binLocation: { type: String, default: '' },
  batchNo: { type: String, default: '' },
  expiryDate: { type: String, default: '' },
  mfgDate: { type: String, default: '' },
  labStatus: { type: String, default: 'Passed' },
  labCertNo: { type: String, default: '' },
  reservedQty: { type: Number, default: 0 },
  barcode: { type: String, default: '' },
  hsnCode: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, default: 'Active' },
}, { timestamps: true })

module.exports = mongoose.model('Product', productSchema)
