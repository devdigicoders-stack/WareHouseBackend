const mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema(
  {
    systemName: { type: String, default: 'Warehouse Management System' },
    organization: { type: String, default: 'Central Warehouse Logistics & Supply Chain' },
    timezone: { type: String, default: 'Asia/Kolkata (GMT +05:30)' },
    dateFormat: { type: String, default: 'DD MMM YYYY (16 Sep 2026)' },
    timeFormat: { type: String, default: '12 Hour (AM/PM)' },
    defaultLanguage: { type: String, default: 'English' },
    logoUrl: { type: String, default: '/logo.png' },

    // Security Policies
    twoFactorAuth: { type: Boolean, default: true },
    sessionTimeout: { type: String, default: '30 Minutes' },
    passwordExpiry: { type: String, default: '90 Days' },
    loginAttemptLimit: { type: String, default: '5 Attempts' },

    // Notifications
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      lowStock: { type: Boolean, default: true },
      expiry: { type: Boolean, default: true },
      announcements: { type: Boolean, default: true },
    },

    // System Preferences
    preferences: {
      autoGenerateTxNo: { type: Boolean, default: true },
      requireApprovalAdjustments: { type: Boolean, default: true },
      enableQualityCheck: { type: Boolean, default: true },
      enableLocationTracking: { type: Boolean, default: true },
      allowNegativeStock: { type: Boolean, default: false },
      enableAuditTrail: { type: Boolean, default: true },
    },

    // Appearance
    themeMode: { type: String, default: 'light' },

    // Backups
    lastBackupDate: { type: String, default: '15 Sep 2026, 11:30 PM' },
    backupLedger: [
      {
        id: { type: String },
        date: { type: String },
        size: { type: String },
        type: { type: String },
        status: { type: String, default: 'Success' },
        checksum: { type: String },
      },
    ],
  },
  { timestamps: true }
)

module.exports = mongoose.model('Settings', settingsSchema)

