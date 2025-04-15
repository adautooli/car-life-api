const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  placa: {
    type: String,
    required: true,
    unique: true
  },
  modelo: {
    type: String,
    required: true
  },
  ano: {
    type: Number,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  previousOwners: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      name: String
    }
  ],
  transferHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OwnershipTransfer'
    }
  ]
});

module.exports = mongoose.model('Car', carSchema);
