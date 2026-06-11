const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
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
      const category = await prisma.category.create({
        data: { name: req.body.name.trim(), description: req.body.description?.trim() || null },
      });
      res.status(201).json(category);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Category already exists' });
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
);

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name?.trim(),
        description: req.body.description?.trim() || null,
      },
    });
    res.json(category);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const count = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (count > 0) return res.status(400).json({ error: 'Cannot delete category with products' });

    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
