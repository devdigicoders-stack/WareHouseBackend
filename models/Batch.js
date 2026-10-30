const mongoose = require('mongoose')

const batchSchema = new mongoose.Schema({
  batchNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, required: true, trim: true },
  sku: { type: String, default: '', trim: true, uppercase: true },
  mfgDate: { type: String, default: '' },
  expiryDate: { type: String, default: '' },
  qty: { type: Number, default: 100 },
  unit: { type: String, default: 'Bags' },
  location: { type: String, default: 'Shade 1 (General Stores)' },
  shadeId: { type: String, default: 'SH01' },
  status: {
    type: String,
    enum: ['Active', 'Expiring Soon', 'Expired', 'Quarantine'],
    default: 'Active'
  },
  supplier: { type: String, default: '' },
  grnNo: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true })

module.exports = mongoose.model('Batch', batchSchema)

