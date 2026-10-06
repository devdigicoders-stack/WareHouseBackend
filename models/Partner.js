const mongoose = require('mongoose')

const partnerSchema = new mongoose.Schema({
  partnerCode: { type: String, unique: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Supplier', 'Customer', 'Transporter'], required: true },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  gstin: { type: String, default: '', uppercase: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true })

partnerSchema.pre('save', async function () {
  if (this.partnerCode) return
  const count = await mongoose.model('Partner').countDocuments()
  const prefix = this.type === 'Supplier' ? 'SUP' : this.type === 'Transporter' ? 'TRN' : 'CUS'
  this.partnerCode = `${prefix}-${String(count + 1).padStart(4, '0')}`
})

module.exports = mongoose.model('Partner', partnerSchema)
