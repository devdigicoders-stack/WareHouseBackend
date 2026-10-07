const mongoose = require('mongoose')

const gatePassItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  sku: { type: String, default: '' },
  batchNo: { type: String, default: '' },
  locationCode: { type: String, default: '' },
  qty: { type: Number, required: true },
  unit: { type: String, default: 'Pieces' },
  packQty: { type: Number, default: 0 },
  packUnit: { type: String, default: 'Packs' },
  unitsPerPack: { type: Number, default: 1 },
  remarks: { type: String, default: '' },
}, { _id: false })

const gatePassSchema = new mongoose.Schema({
  passNo: { type: String, unique: true },
  passType: {
    type: String,
    enum: [
      'Material Outward',
      'Material Inward',
      'Inter-Depot Transfer',
      'Disposal / Scrap Outward',
      'Vehicle Movement Only',
      'Commercial Issue'
    ],
    default: 'Material Outward',
  },
  purpose: { type: String, default: 'Customer Delivery' },
  dateTime: { type: Date, default: Date.now },
  refNo: { type: String, default: '' },
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch', default: null },
  dispatchNo: { type: String, default: '' },
  vehicleNo: { type: String, required: true, uppercase: true, trim: true },
  vehicleType: { type: String, default: 'Heavy Commercial Truck' },
  driverName: { type: String, required: true, trim: true },
  driverContact: { type: String, default: '' },
  driverLicense: { type: String, default: '' },
  receiverName: { type: String, default: 'Direct Consignee' },
  receiverAddress: { type: String, default: 'Warehouse Transit Terminal' },
  shadeId: { type: String, default: 'SH-01' },
  location: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Issued', 'Approved', 'Pending', 'Departed', 'Gate Out / Cleared'],
    default: 'Issued',
  },
  labStatus: { type: String, default: 'Passed' },
  labCertNo: { type: String, default: '' },
  authorisedBy: { type: String, default: 'Logistics Manager' },
  materials: [gatePassItemSchema],
  totalQty: { type: Number, default: 0 },
  totalPacks: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
}, { timestamps: true })

gatePassSchema.pre('save', async function () {
  if (this.passNo) return
  const year = new Date().getFullYear()
  const count = await mongoose.model('GatePass').countDocuments()
  this.passNo = `GP-${year}-${String(count + 1).padStart(4, '0')}`
})

module.exports = mongoose.model('GatePass', gatePassSchema)
