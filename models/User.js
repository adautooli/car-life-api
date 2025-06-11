const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName:  { type: String, required: true },
  birthday: { type: Date, required: false },
  profileImage: { type: String, required: false },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true }
});

module.exports = mongoose.model('User', UserSchema);
