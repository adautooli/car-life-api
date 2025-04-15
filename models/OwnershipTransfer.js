const mongoose = require('mongoose');

const reasonEnum = [
  'Document',
  'Financial',
  'Legal',
  'Mechanical',
  'Aesthetic',
  'Electrical',
  'Accident',
  'Auction'
];

const OwnershipTransferSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'pending'
  },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  rejectionReason: {
    type: String,
    enum: reasonEnum,
    required: function () {
      return this.status === 'rejected';
    }
  }
});

module.exports = mongoose.model('OwnershipTransfer', OwnershipTransferSchema);
