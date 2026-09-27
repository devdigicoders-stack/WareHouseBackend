require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const gateEntryRoutes = require('./routes/gateEntry')
const productRoutes = require('./routes/product')
const shadeRoutes = require('./routes/shade')
const rackRoutes = require('./routes/rack')

const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/gate-entry', gateEntryRoutes)
app.use('/api/product', productRoutes)
app.use('/api/shade', shadeRoutes)
app.use('/api/rack', rackRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  })
