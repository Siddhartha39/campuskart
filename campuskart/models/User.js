const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  role: String,
  college: String,
  email: String,
  phone: String,
  password: String
});

module.exports = mongoose.model('User', userSchema);
