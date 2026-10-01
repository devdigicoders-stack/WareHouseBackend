const mongoose = require('mongoose')

const qcSchema = new mongoose.Schema({
  qcNumber: { type: String, unique: true },
  grnNo: { type: String, required: true },
  productName: { type: String, required: true },
  sku: { type: String, default: '' },
  batchNo: { type: String, required: true },
  sampleSize: { type: String, default: '500g / 1 Unit' },
  testedBy: { type: String, default: 'QC Lab Chemist' },
  parameters: [{
    name: { type: String, required: true },
    standard: { type: String, default: '' },
    observed: { type: String, default: '' },
    pass: { type: Boolean, default: true }
  }],
  status: {
    type: String,
    enum: ['Passed', 'Failed / Rejected', 'Quarantine / Under Test'],
    default: 'Passed'
  },
  remarks: { type: String, default: 'All sensory and physical parameters within specification limits.' },
  certificateNo: { type: String, default: '' },
  testDate: { type: Date, default: Date.now }
}, { timestamps: true })

qcSchema.pre('save', async function () {
  if (this.qcNumber) return
  const year = new Date().getFullYear()
  const count = await mongoose.model('QualityCheck').countDocuments()
  this.qcNumber = `QC-${year}-${String(count + 1).padStart(4, '0')}`
  if (!this.certificateNo) {
    this.certificateNo = `COA-${year}-${String(count + 101).padStart(5, '0')}`
  }
})

module.exports = mongoose.model('QualityCheck', qcSchema)
