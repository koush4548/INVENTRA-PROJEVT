const express = require('express');
const Product = require('../models/Product');
const Audit = require('../models/Audit');
const Sale = require('../models/Sale');
const Setting = require('../models/Setting');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const barcode = String(req.body.barcode || '').trim();
    const category = String(req.body.category || 'General').trim();
    const quantity = Number(req.body.quantity || 0);
    const costPrice = Number(req.body.costPrice || 0);
    const sellPrice = Number(req.body.sellPrice || 0);
    const warehouse = String(req.body.warehouse || 'Main').trim();

    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const product = await Product.create({
      name,
      barcode,
      category,
      quantity,
      costPrice,
      sellPrice,
      warehouse,
      userId: req.user.id
    });

    await Audit.create({
      type: 'PRODUCT',
      userId: req.user.id,
      productName: name,
      details: `Added with quantity ${quantity}`
    });

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updatedData = {
      name: String(req.body.name || '').trim(),
      barcode: String(req.body.barcode || '').trim(),
      category: String(req.body.category || 'General').trim(),
      quantity: Number(req.body.quantity || 0),
      costPrice: Number(req.body.costPrice || 0),
      sellPrice: Number(req.body.sellPrice || 0),
      warehouse: String(req.body.warehouse || 'Main').trim()
    };

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updatedData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await Audit.create({
      type: 'PRODUCT',
      userId: req.user.id,
      productName: product.name,
      details: `Updated with quantity ${product.quantity}`
    });

    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await Audit.create({
      type: 'PRODUCT',
      userId: req.user.id,
      productName: product.name,
      details: 'Deleted'
    });

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.get('/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user.id });
    const setting = await Setting.findOne({ userId: req.user.id });

    const lowStockLimit = setting?.lowStockLimit ?? 5;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await Sale.aggregate([
      {
        $match: {
          userId: req.user.id,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$grandTotal' }
        }
      }
    ]);

    const totalProducts = products.length;
    const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
    const lowStock = products.filter((p) => p.quantity <= lowStockLimit).length;
    const inventoryValue = products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);

    res.json({
      totalProducts,
      totalQuantity,
      lowStock,
      inventoryValue,
      todaySales: todaySales[0]?.revenue || 0,
      lowStockLimit
    });
  } catch (error) {
    res.status(500).json({ error: 'Dashboard error' });
  }
});

module.exports = router;