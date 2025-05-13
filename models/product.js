const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  cost: {
    type: Number,
    required: true,
    default: 0
  },
  stockQuantity: {
    type: Number,
    required: true,
    default: 0
  },
  location: {
    zone: {
      type: String,
      default: 'A'
    },
    rack: {
      type: String,
      default: '01'
    },
    shelf: {
      type: String,
      default: '01'
    }
  },
  minStockLevel: {
    type: Number,
    default: 5
  },
  supplier: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Обновление даты при изменении товара
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);