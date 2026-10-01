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

module.exports = mongoose.model('Partner', partnerSchema)
