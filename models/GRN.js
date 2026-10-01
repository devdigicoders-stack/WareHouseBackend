const mongoose = require('mongoose')

const grnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, required: true },
  sku: { type: String, default: '' },
  packageQty: { type: Number, required: true, min: 1 },
  packagingUnit: { type: String, default: 'Bags' },
  packSize: { type: Number, default: 1 },
  totalBaseQty: { type: Number, default: 0 },
  baseUnit: { type: String, default: 'Kg' },
  batchNo: { type: String, default: '' },
  mfgDate: { type: String, default: '' },
  expiryDate: { type: String, default: '' },
  remarks: { type: String, default: '' },
}, { _id: false })

const grnSchema = new mongoose.Schema({
  grnNo: { type: String, unique: true },
  dateTime: { type: Date, default: Date.now },
  poNo: { type: String, required: true, trim: true, uppercase: true },
  supplier: { type: String, required: true, trim: true },
  vehicleNo: { type: String, required: true, trim: true, uppercase: true },
  gateEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'GateEntry', default: null },
  shadeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shade', default: null },
  shade: { type: String, default: 'General Storage' },
  itemsCount: { type: Number, default: 1 },
  totalQty: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Completed', 'In Process', 'Pending', 'Rejected'],
    default: 'Completed',
  },
  receivedBy: { type: String, default: 'Warehouse Manager' },
  remarks: { type: String, default: '' },
  materials: [grnItemSchema],
}, { timestamps: true })

// Auto-generate grnNo before saving
grnSchema.pre('save', async function () {
  if (this.grnNo) return
  const year = new Date().getFullYear()
  const count = await mongoose.model('GRN').countDocuments()
  this.grnNo = `GRN-${year}-${String(count + 1).padStart(4, '0')}`
})

module.exports = mongoose.model('GRN', grnSchema)
