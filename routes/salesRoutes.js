const express = require('express');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Audit = require('../models/Audit');
const Setting = require('../models/Setting');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

async function makeInvoiceNo(userId) {
  const setting = await Setting.findOne({ userId });
  const prefix = setting?.invoicePrefix || 'INV';

  const now = new Date();
  const stamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  return `${prefix}-${stamp}`;
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const sales = await Sale.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ sales });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const cartItems = Array.isArray(req.body.items) ? req.body.items : [];
    const customerName = String(req.body.customerName || 'Walk-in Customer').trim();

    if (!cartItems.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const finalItems = [];
    let grandTotal = 0;
    let totalItems = 0;

    for (const item of cartItems) {
      const quantity = Number(item.quantity || 0);

      if (!item.productId || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid cart item' });
      }

      const product = await Product.findOne({
        _id: item.productId,
        userId: req.user.id
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (product.quantity < quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      const price = Number(product.sellPrice || 0);
      const total = price * quantity;

      product.quantity -= quantity;
      await product.save();

      finalItems.push({
        productId: product._id,
        productName: product.name,
        quantity,
        price,
        total
      });

      totalItems += quantity;
      grandTotal += total;

      await Audit.create({
        type: 'PRODUCT',
        userId: req.user.id,
        productName: product.name,
        details: `Sold quantity ${quantity}`
      });
    }

    const sale = await Sale.create({
      invoiceNo: await makeInvoiceNo(req.user.id),
      items: finalItems,
      customerName,
      grandTotal,
      totalItems,
      userId: req.user.id
    });

    res.json({ sale });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete sale' });
  }
});

router.get('/analytics/summary', authMiddleware, async (req, res) => {
  try {
    const sales = await Sale.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalOrders = sales.length;
    const totalItemsSold = sales.reduce((sum, s) => sum + s.totalItems, 0);

    const productCount = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        productCount[item.productName] = (productCount[item.productName] || 0) + item.quantity;
      }
    }

    let topProduct = '-';
    let maxQty = 0;
    for (const [name, qty] of Object.entries(productCount)) {
      if (qty > maxQty) {
        maxQty = qty;
        topProduct = name;
      }
    }

    const latestSales = sales.slice(0, 5).map((sale) => ({
      invoiceNo: sale.invoiceNo,
      amount: sale.grandTotal,
      date: sale.createdAt
    }));

    res.json({
      totalRevenue,
      totalOrders,
      totalItemsSold,
      topProduct,
      latestSales
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;