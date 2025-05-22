const express = require('express');
const router = express.Router();
const multer = require('multer');
const Product = require('../models/Product');

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Add new product
router.post('/add', upload.single('image'), async (req, res) => {
  const product = new Product({
    ...req.body,
    imageUrl: '/uploads/' + req.file.filename
  });
  await product.save();
  res.json({ message: 'Product posted successfully!' });
});

// Get all products
router.get('/all', async (req, res) => {
  const products = await Product.find().sort({ datePosted: -1 });
  res.json(products);
});

module.exports = router;
