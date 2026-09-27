const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()

// POST /api/auth/login - PIN login
router.post('/login', async (req, res) => {
  try {
    const { pin } = req.body
    if (!pin || pin.length !== 4) {
      return res.status(400).json({ message: 'Valid 4-digit PIN required' })
    }

    const user = await User.findOne({ isActive: true })
    if (!user) {
      return res.status(401).json({ message: 'No active user found' })
    }

    const isMatch = await user.comparePin(pin)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid PIN. Please try again.' })
    }

    const token = jwt.sign(
      { id: user._id, userId: user.userId },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        department: user.department,
        terminal: user.terminal,
        authMethod: 'PIN',
        loginTime: new Date().toISOString(),
      },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/auth/login-usb - USB Key File login
router.post('/login-usb', async (req, res) => {
  try {
    const { fileContent } = req.body
    if (!fileContent) {
      return res.status(400).json({ message: 'USB key file content required' })
    }

    // Match file content against env secret (trim whitespace/newlines)
    if (fileContent.trim() !== process.env.USB_FILE_SECRET.trim()) {
      return res.status(401).json({ message: 'Invalid token. Access denied.' })
    }

    const user = await User.findOne({ isActive: true })
    if (!user) {
      return res.status(401).json({ message: 'No active user found' })
    }

    const token = jwt.sign(
      { id: user._id, userId: user.userId },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        department: user.department,
        terminal: user.terminal,
        authMethod: 'USB Token',
        loginTime: new Date().toISOString(),
      },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/auth/me - verify token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-pin')
    if (!user) return res.status(401).json({ message: 'User not found' })
    res.json({ user })
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
})

module.exports = router
