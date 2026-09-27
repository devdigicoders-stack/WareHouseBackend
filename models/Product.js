const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  category: { type: String, required: true },
  brand: { type: String, default: 'Standard Commercial' },
  baseUnit: { type: String, required: true },
  outerPackaging: { type: String, required: true },
  packSize: { type: Number, required: true, min: 1 },
  currentStock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 50 },
  storageZone: { type: String, default: '' },
  barcode: { type: String, default: '' },
  hsnCode: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Low Stock', 'Out of Stock'], default: 'Active' },
}, { timestamps: true })

module.exports = mongoose.model('Product', productSchema)
