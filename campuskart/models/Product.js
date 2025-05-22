const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  description: String,
  price: Number,
  sellerName: String,
  sellerRole: String,
  sellerCollege: String,
  sellerPhone: String,
  condition: String,
  imageUrl: String,
  datePosted: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
