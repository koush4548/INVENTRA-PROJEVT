const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['USER', 'PRODUCT'],
      required: true
    },
    username: {
      type: String,
      default: ''
    },
    productName: {
      type: String,
      default: ''
    },
    details: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Audit', auditSchema);