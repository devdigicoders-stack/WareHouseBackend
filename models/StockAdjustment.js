const mongoose = require('mongoose')

const stockAdjustmentSchema = new mongoose.Schema({
  adjNumber: { type: String, unique: true },
  type: {
    type: String,
    enum: ['Cycle Count Adjustment', 'Damage / Rejection', 'Quality Hold', 'Hold Release', 'Internal Transfer'],
    required: true
  },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, required: true },
  sku: { type: String, default: '' },
  batchNo: { type: String, default: '' },
  locationCode: { type: String, default: '' },
  targetLocationCode: { type: String, default: '' },
  previousQty: { type: Number, default: 0 },
  adjustedQty: { type: Number, required: true },
  variance: { type: Number, default: 0 },
  unit: { type: String, default: 'Kg' },
  reason: { type: String, required: true },
  reportedBy: { type: String, default: 'Inventory Controller' },
  status: {
    type: String,
    enum: ['Pending Approval', 'Approved / Executed', 'Rejected'],
    default: 'Approved / Executed'
  }
}, { timestamps: true })

stockAdjustmentSchema.pre('save', async function () {
  if (this.adjNumber) return
  const year = new Date().getFullYear()
  const count = await mongoose.model('StockAdjustment').countDocuments()
  this.adjNumber = `ADJ-${year}-${String(count + 1).padStart(4, '0')}`
})

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema)
