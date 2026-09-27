const mongoose = require('mongoose')

const cellSchema = new mongoose.Schema({
  code: { type: String, required: true },   // e.g. SH01-RK01-R1-C1
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  status: { type: String, enum: ['Empty', 'Occupied', 'Blocked', 'Reserved'], default: 'Empty' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, default: '' },
  batchNo: { type: String, default: '' },
  currentStock: { type: Number, default: 0 },
}, { _id: false })

const rackSchema = new mongoose.Schema({
  shadeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shade', required: true },
  shadeCode: { type: String, required: true },
  rackNumber: { type: String, required: true },  // e.g. RK-01
  rows: { type: Number, required: true, min: 1, max: 20 },
  columns: { type: Number, required: true, min: 1, max: 20 },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  cells: [cellSchema],
}, { timestamps: true })

// Auto-generate cells before save
rackSchema.pre('save', function () {
  if (this.cells && this.cells.length > 0) return
  const cells = []
  for (let r = 1; r <= this.rows; r++) {
    for (let c = 1; c <= this.columns; c++) {
      cells.push({
        code: `${this.shadeCode}-${this.rackNumber}-R${r}-C${c}`,
        row: r,
        col: c,
        status: 'Empty',
        productId: null,
        productName: '',
        batchNo: '',
        currentStock: 0,
      })
    }
  }
  this.cells = cells
})

module.exports = mongoose.model('Rack', rackSchema)
