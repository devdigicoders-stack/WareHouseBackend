const mongoose = require('mongoose')

const visitorSchema = new mongoose.Schema({
  passNo: { type: String, unique: true },
  visitorName: { type: String, required: true, trim: true },
  company: { type: String, default: 'Direct Client Representative', trim: true },
  contactNo: { type: String, required: true, trim: true },
  purpose: { type: String, required: true },
  personToMeet: { type: String, required: true },
  idProof: { type: String, default: 'Aadhaar Card' },
  idNumber: { type: String, default: 'VERIFIED-ON-GATE' },
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date, default: null },
  status: {
    type: String,
    enum: ['Inside', 'Checked Out', 'Pending'],
    default: 'Inside',
  },
  validTill: { type: String, default: 'Today, 06:00 PM' },
  remarks: { type: String, default: '' },
  officerName: { type: String, default: 'Security Officer' },
}, { timestamps: true })

visitorSchema.pre('save', async function () {
  if (this.passNo) return
  const year = new Date().getFullYear()
  const count = await mongoose.model('Visitor').countDocuments()
  this.passNo = `V-${year}-${String(count + 1).padStart(4, '0')}`
})

module.exports = mongoose.model('Visitor', visitorSchema)
