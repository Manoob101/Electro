const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const customers = await prisma.customer.findMany({
      where,
      include: { _count: { select: { sales: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { items: { include: { product: true } } },
        },
        warranties: {
          include: { product: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Name is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, phone, address } = req.body;
      const customer = await prisma.customer.create({
        data: { name: name.trim(), email: email || null, phone: phone || null, address: address || null },
      });
      res.status(201).json(customer);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }
);

router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { name, email, phone, address },
    });
    res.json(customer);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Customer not found' });
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

module.exports = router;
