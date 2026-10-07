const mongoose = require('mongoose')

const stockMovementSchema = new mongoose.Schema({
  refNo: { type: String, unique: true },
  dateTime: { type: Date, default: Date.now },
  type: {
    type: String,
    enum: ['Internal', 'Inward', 'Outward', 'Adjust'],
    default: 'Internal',
  },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, required: true },
  sku: { type: String, default: '' },
  batchNo: { type: String, required: true },
  fromLocation: { type: String, default: 'Dock / Inward' },
  toLocation: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'Kg' },
  packagingSummary: { type: String, default: '' },
  reason: { type: String, default: 'Intra-warehouse stock transfer' },
  user: { type: String, default: 'Warehouse Manager' },
  operator: { type: String, default: 'Storekeeper' },
  status: {
    type: String,
    enum: ['Completed', 'Pending', 'Cancelled'],
    default: 'Completed',
  },
}, { timestamps: true })

// Auto-generate refNo before save: MOV-YYYY-0001
stockMovementSchema.pre('save', async function () {
  if (this.refNo) return
  const year = new Date().getFullYear()
  const count = await mongoose.model('StockMovement').countDocuments()
  this.refNo = `MOV-${year}-${String(count + 1).padStart(4, '0')}`
})

module.exports = mongoose.model('StockMovement', stockMovementSchema)
