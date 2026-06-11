const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken, requireAdmin);

const userSelect = { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true };

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { name: 'asc' } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty(),
    body('role').isIn(['admin', 'cashier']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password, name, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name: name.trim(), role },
        select: userSelect,
      });
      res.status(201).json(user);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

router.put('/:id', async (req, res) => {
  try {
    const { name, role, password } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (role) updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: userSelect,
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.put('/:id/toggle-active', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
      select: userSelect,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle user' });
  }
});

module.exports = router;
