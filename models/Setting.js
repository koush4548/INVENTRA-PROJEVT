const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: ''
    },
    storeLocation: {
      type: String,
      default: ''
    },
    currency: {
      type: String,
      default: '₹'
    },
    lowStockLimit: {
      type: Number,
      default: 5
    },
    notificationEmail: {
      type: String,
      default: ''
    },
    invoicePrefix: {
      type: String,
      default: 'INV'
    },
    theme: {
      type: String,
      default: 'dark'
    },
    accentColor: {
      type: String,
      default: '#6d7cff'
    },
    lowStockAlerts: {
      type: Boolean,
      default: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);