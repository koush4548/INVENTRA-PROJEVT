const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    barcode: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: 'General'
    },
    quantity: {
      type: Number,
      default: 0
    },
    costPrice: {
      type: Number,
      default: 0
    },
    sellPrice: {
      type: Number,
      default: 0
    },
    warehouse: {
      type: String,
      default: 'Main'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);