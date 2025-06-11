const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema({
  plate: { type: String, required: true, unique: true },
  model: { type: String, required: true },
  modelYear: { type: Number, required: true },
  manufactureYear: { type: Number, required: true },
  color: { type: String, required: true },
  mileage: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  previousOwners: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      _id: false
    }
  ],
  transferHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer'
    }
  ]
});

module.exports = mongoose.model('Car', CarSchema);
