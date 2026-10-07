require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const gateEntryRoutes = require('./routes/gateEntry')
const productRoutes = require('./routes/product')
const shadeRoutes = require('./routes/shade')
const rackRoutes = require('./routes/rack')
const grnRoutes = require('./routes/grn')
const qcRoutes = require('./routes/qc')
const dispatchRoutes = require('./routes/dispatch')
const stockAdjustmentRoutes = require('./routes/stockAdjustment')
const partnerRoutes = require('./routes/partner')
const analyticsRoutes = require('./routes/analytics')
const gatePassRoutes = require('./routes/gatePass')

const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/gate-entry', gateEntryRoutes)
app.use('/api/gate-pass', gatePassRoutes)
app.use('/api/product', productRoutes)
app.use('/api/shade', shadeRoutes)
app.use('/api/rack', rackRoutes)
app.use('/api/grn', grnRoutes)
app.use('/api/qc', qcRoutes)
app.use('/api/dispatch', dispatchRoutes)
app.use('/api/stock-adjust', stockAdjustmentRoutes)
app.use('/api/partners', partnerRoutes)
app.use('/api/analytics', analyticsRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }))

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully')
    const port = process.env.PORT || 5000
    app.listen(port, () => {
      console.log(`Warehouse backend server running on port ${port}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  })
