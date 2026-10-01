const mongoose = require('mongoose')

const dispatchItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, required: true },
  sku: { type: String, default: '' },
  batchNo: { type: String, default: '' },
  locationCode: { type: String, default: '' },
  packagingUnit: { type: String, default: 'Bags' },
  packSize: { type: Number, default: 1 },
  requestedQty: { type: Number, required: true },
  pickedQty: { type: Number, default: 0 },
  verified: { type: Boolean, default: false }
}, { _id: false })

const dispatchSchema = new mongoose.Schema({
  dispatchNo: { type: String, unique: true },
  orderNo: { type: String, required: true, uppercase: true },
  customerName: { type: String, required: true },
  destination: { type: String, required: true },
  vehicleNo: { type: String, required: true, uppercase: true },
  driverName: { type: String, required: true },
  driverContact: { type: String, required: true },
  dispatchDate: { type: Date, default: Date.now },
  items: [dispatchItemSchema],
  totalPackages: { type: Number, default: 0 },
  totalBaseQty: { type: Number, default: 0 },
  baseUnit: { type: String, default: 'Kg' },
  gatePassNo: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Draft / Picklist', 'Picking In Progress', 'QR Verified / Ready', 'Dispatched', 'Gate Out / Cleared'],
    default: 'Draft / Picklist'
  },
  dispatchedBy: { type: String, default: 'Warehouse Manager' },
  remarks: { type: String, default: '' }
}, { timestamps: true })

dispatchSchema.pre('save', async function () {
  if (!this.dispatchNo) {
    const year = new Date().getFullYear()
    const count = await mongoose.model('Dispatch').countDocuments()
    this.dispatchNo = `DSP-${year}-${String(count + 1).padStart(4, '0')}`
  }
  if (!this.gatePassNo) {
    const year = new Date().getFullYear()
    const count = await mongoose.model('Dispatch').countDocuments()
    this.gatePassNo = `GPO-${year}-${String(count + 1).padStart(4, '0')}`
  }
})

module.exports = mongoose.model('Dispatch', dispatchSchema)
