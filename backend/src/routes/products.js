const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

const productInclude = {
  category: true,
  supplier: true,
};

router.get('/', async (req, res) => {
  try {
    const { search, categoryId, lowStock } = req.query;

    const where = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { name: 'asc' },
    });

    const result = lowStock === 'true'
      ? products.filter((p) => p.stock <= p.minStock)
      : products;

    res.json(result);
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/barcode/:barcode', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { barcode: req.params.barcode },
      include: productInclude,
    });

    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('Barcode lookup error:', err);
    res.status(500).json({ error: 'Failed to fetch product by barcode' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        ...productInclude,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post(
  '/',
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('costPrice').optional().isFloat({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
    body('minStock').optional().isInt({ min: 0 }),
    body('warrantyMonths').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        name, description, sku, barcode, categoryId, supplierId,
        price, costPrice, stock, minStock, warrantyMonths, imageUrl,
      } = req.body;

      const existingSku = await prisma.product.findUnique({ where: { sku } });
      if (existingSku) {
        return res.status(409).json({ error: 'SKU already exists' });
      }

      if (barcode) {
        const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
        if (existingBarcode) {
          return res.status(409).json({ error: 'Barcode already exists' });
        }
      }

      const product = await prisma.product.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          sku: sku.trim(),
          barcode: barcode?.trim() || null,
          categoryId: categoryId || null,
          supplierId: supplierId || null,
          price: parseFloat(price),
          costPrice: parseFloat(costPrice) || 0,
          stock: parseInt(stock) || 0,
          minStock: parseInt(minStock) || 5,
          warrantyMonths: parseInt(warrantyMonths) || 0,
          imageUrl: imageUrl || null,
        },
        include: productInclude,
      });

      if (product.stock > 0) {
        await prisma.stockMovement.create({
          data: {
            productId: product.id,
            type: 'in',
            quantity: product.stock,
            notes: 'Initial stock on product creation',
          },
        });
      }

      res.status(201).json(product);
    } catch (err) {
      console.error('Create product error:', err);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

router.put(
  '/:id',
  requireAdmin,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('costPrice').optional().isFloat({ min: 0 }),
    body('minStock').optional().isInt({ min: 0 }),
    body('warrantyMonths').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const {
        name, description, sku, barcode, categoryId, supplierId,
        price, costPrice, minStock, warrantyMonths, imageUrl, isActive,
      } = req.body;

      if (sku && sku !== existing.sku) {
        const skuConflict = await prisma.product.findUnique({ where: { sku } });
        if (skuConflict) {
          return res.status(409).json({ error: 'SKU already exists' });
        }
      }

      if (barcode && barcode !== existing.barcode) {
        const barcodeConflict = await prisma.product.findUnique({ where: { barcode } });
        if (barcodeConflict) {
          return res.status(409).json({ error: 'Barcode already exists' });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (sku !== undefined) updateData.sku = sku.trim();
      if (barcode !== undefined) updateData.barcode = barcode?.trim() || null;
      if (categoryId !== undefined) updateData.categoryId = categoryId || null;
      if (supplierId !== undefined) updateData.supplierId = supplierId || null;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (costPrice !== undefined) updateData.costPrice = parseFloat(costPrice);
      if (minStock !== undefined) updateData.minStock = parseInt(minStock);
      if (warrantyMonths !== undefined) updateData.warrantyMonths = parseInt(warrantyMonths);
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: productInclude,
      });

      res.json(product);
    } catch (err) {
      console.error('Update product error:', err);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Product deactivated successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

router.post(
  '/:id/adjust-stock',
  requireAdmin,
  [
    body('type').isIn(['in', 'out', 'adjustment']).withMessage('Type must be in, out, or adjustment'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { type, quantity, notes, reference } = req.body;
      const qty = parseInt(quantity);

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product || !product.isActive) {
        return res.status(404).json({ error: 'Product not found' });
      }

      let newStock;
      if (type === 'in') {
        newStock = product.stock + qty;
      } else if (type === 'out') {
        if (product.stock < qty) {
          return res.status(400).json({ error: 'Insufficient stock' });
        }
        newStock = product.stock - qty;
      } else {
        newStock = qty;
      }

      const [updatedProduct, movement] = await prisma.$transaction([
        prisma.product.update({
          where: { id },
          data: { stock: newStock },
          include: productInclude,
        }),
        prisma.stockMovement.create({
          data: {
            productId: id,
            type,
            quantity: qty,
            reference: reference || null,
            notes: notes || null,
          },
        }),
      ]);

      res.json({ product: updatedProduct, movement });
    } catch (err) {
      console.error('Adjust stock error:', err);
      res.status(500).json({ error: 'Failed to adjust stock' });
    }
  }
);

module.exports = router;
