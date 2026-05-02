const mongoose = require('mongoose');

const bomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // The item that gets created
  finishedGood: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
    unique: true // Usually, one finished good has one active BOM recipe
  },
  // The raw materials required to build ONE finished good
  components: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    quantityRequired: {
      type: Number,
      required: true,
      min: [0.001, 'Quantity must be greater than zero']
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('BOM', bomSchema);