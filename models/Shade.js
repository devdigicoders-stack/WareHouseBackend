const mongoose = require('mongoose')

const shadeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true },
  description: { type: String, default: '' },
  manager: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Maintenance', 'Inactive'], default: 'Active' },
}, { timestamps: true })

module.exports = mongoose.model('Shade', shadeSchema)
