const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Operations Manager' },
  department: { type: String, default: 'Central Warehouse Logistics' },
  terminal: { type: String, default: 'WMS-TERMINAL-01' },
  pin: { type: String, required: true },
  usbToken: { type: String, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

userSchema.pre('save', async function () {
  if (!this.isModified('pin')) return
  this.pin = await bcrypt.hash(this.pin, 10)
})

userSchema.methods.comparePin = function (enteredPin) {
  return bcrypt.compare(enteredPin, this.pin)
}

module.exports = mongoose.model('User', userSchema)
