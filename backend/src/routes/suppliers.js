const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.post(
  '/',
  requireAdmin,
  [body('name').trim().notEmpty().withMessage('Name is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, contact, email, phone, address } = req.body;
      const supplier = await prisma.supplier.create({
        data: { name: name.trim(), contact, email, phone, address },
      });
      res.status(201).json(supplier);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }
);

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, contact, email, phone, address } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: { name, contact, email, phone, address },
    });
    res.json(supplier);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Supplier not found' });
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const count = await prisma.product.count({ where: { supplierId: req.params.id } });
    if (count > 0) {
      await prisma.product.updateMany({
        where: { supplierId: req.params.id },
        data: { supplierId: null },
      });
    }
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Supplier not found' });
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

module.exports = router;
