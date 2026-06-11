const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

const saleInclude = {
  customer: true,
  user: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      product: { include: { category: true } },
      warranty: true,
    },
  },
};

function generateInvoiceNo() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${ymd}-${rand}`;
}

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, customerId, paymentMethod, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (customerId) where.customerId = customerId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({ sales, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List sales error:', err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: saleInclude,
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

router.post(
  '/',
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
    body('paymentMethod').isIn(['cash', 'card', 'upi', 'bank_transfer']).withMessage('Invalid payment method'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { items, customerId, discount = 0, tax = 0, paymentMethod, paymentStatus = 'paid', notes } = req.body;

    try {
      // Validate stock for all items
      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.isActive) {
          return res.status(400).json({ error: `Product not found: ${item.productId}` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
        }
      }

      // Generate unique invoice number
      let invoiceNo = generateInvoiceNo();
      let attempts = 0;
      while (attempts < 5) {
        const existing = await prisma.sale.findUnique({ where: { invoiceNo } });
        if (!existing) break;
        invoiceNo = generateInvoiceNo();
        attempts++;
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => {
        const itemTotal = item.unitPrice * item.quantity - (item.discount || 0);
        return sum + itemTotal;
      }, 0);
      const total = subtotal - parseFloat(discount) + parseFloat(tax);

      // Get warranty months for each item from product
      const productMap = {};
      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        productMap[item.productId] = product;
      }

      const sale = await prisma.$transaction(async (tx) => {
        const newSale = await tx.sale.create({
          data: {
            invoiceNo,
            customerId: customerId || null,
            userId: req.user.id,
            subtotal: parseFloat(subtotal.toFixed(2)),
            discount: parseFloat(discount),
            tax: parseFloat(tax),
            total: parseFloat(total.toFixed(2)),
            paymentMethod,
            paymentStatus,
            notes: notes || null,
          },
        });

        const now = new Date();

        for (const item of items) {
          const product = productMap[item.productId];
          const itemWarrantyMonths = item.warrantyMonths ?? product.warrantyMonths;
          const itemTotal = item.unitPrice * item.quantity - (item.discount || 0);

          const saleItem = await tx.saleItem.create({
            data: {
              saleId: newSale.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: parseFloat(item.unitPrice),
              discount: parseFloat(item.discount || 0),
              total: parseFloat(itemTotal.toFixed(2)),
              warrantyMonths: itemWarrantyMonths,
              serialNumber: item.serialNumber || null,
            },
          });

          // Deduct stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'out',
              quantity: item.quantity,
              reference: invoiceNo,
              notes: `Sale: ${invoiceNo}`,
            },
          });

          // Create warranty record if applicable
          if (itemWarrantyMonths > 0) {
            const endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + itemWarrantyMonths);

            await tx.warranty.create({
              data: {
                saleItemId: saleItem.id,
                productId: item.productId,
                customerId: customerId || null,
                serialNumber: item.serialNumber || null,
                invoiceNo,
                startDate: now,
                endDate,
                status: 'active',
              },
            });
          }
        }

        return newSale;
      });

      const fullSale = await prisma.sale.findUnique({
        where: { id: sale.id },
        include: saleInclude,
      });

      res.status(201).json(fullSale);
    } catch (err) {
      console.error('Create sale error:', err);
      res.status(500).json({ error: 'Failed to create sale' });
    }
  }
);

router.post('/:id/refund', async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.paymentStatus === 'refunded') return res.status(400).json({ error: 'Sale already refunded' });

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: sale.id },
        data: { paymentStatus: 'refunded' },
      });

      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'in',
            quantity: item.quantity,
            reference: sale.invoiceNo,
            notes: `Refund: ${sale.invoiceNo}`,
          },
        });
      }

      await tx.warranty.updateMany({
        where: { invoiceNo: sale.invoiceNo },
        data: { status: 'void' },
      });
    });

    res.json({ message: 'Sale refunded successfully' });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

module.exports = router;
