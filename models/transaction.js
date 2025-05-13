const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['in', 'out', 'move', 'adjustment'],
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  barcode: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  fromLocation: {
    zone: String,
    rack: String,
    shelf: String
  },
  toLocation: {
    zone: String,
    rack: String,
    shelf: String
  },
  reason: {
    type: String,
    default: ''
  },
  documentNumber: {
    type: String,
    default: ''
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Создать уникальный номер документа перед сохранением
transactionSchema.pre('save', function(next) {
  // Если номер документа не установлен, генерируем его
  if (!this.documentNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    this.documentNumber = `TRX-${year}${month}${day}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);