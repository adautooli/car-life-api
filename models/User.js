const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName:       { type: String, required: true },
  birthday:       { type: Date, required: false },
  email:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  profileImageUrl:{ type: String, required: false }  // <- URL no Cloudinary
});

module.exports = mongoose.model('User', UserSchema);
