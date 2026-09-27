const mongoose = require('mongoose')

const materialItemSchema = new mongoose.Schema({
  product: { type: String, required: true },
  packageQty: { type: Number, required: true },
  packagingUnit: { type: String, required: true },
  baseUnitEstimate: { type: String, default: '' },
  remarks: { type: String, default: '' },
}, { _id: false })

const gateEntrySchema = new mongoose.Schema({
  passNumber: { type: String, unique: true },
  vehicleNumber: { type: String, required: true },
  vehicleType: { type: String, required: true },
  driverName: { type: String, required: true },
  driverContact: { type: String, required: true },
  supplier: { type: String, required: true },
  challanNo: { type: String, required: true },
  purpose: { type: String, required: true },
  assignedBay: { type: String, required: true },
  inTime: { type: Date, default: Date.now },
  outTime: { type: Date, default: null },
  remarks: { type: String, default: '' },
  materialItems: [materialItemSchema],
  status: {
    type: String,
    enum: ['Waiting at Gate', 'Unloading at Bay', 'GRN In Process', 'Gate Out / Cleared'],
    default: 'Waiting at Gate',
  },
}, { timestamps: true })

// Auto-generate passNumber before save
gateEntrySchema.pre('save', async function () {
  if (this.passNumber) return
  const year = new Date().getFullYear()
  const count = await mongoose.model('GateEntry').countDocuments()
  this.passNumber = `GE-${year}-${String(count + 1).padStart(4, '0')}`
})

module.exports = mongoose.model('GateEntry', gateEntrySchema)
