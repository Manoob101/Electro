const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

const warrantyInclude = {
  product: { include: { category: true } },
  customer: true,
  saleItem: { include: { sale: true } },
};

router.get('/', async (req, res) => {
  try {
    const { status, customerId, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { serialNumber: { contains: search } },
        { invoiceNo: { contains: search } },
        { customer: { name: { contains: search } } },
        { product: { name: { contains: search } } },
      ];
    }

    const warranties = await prisma.warranty.findMany({
      where,
      include: warrantyInclude,
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const updatedWarranties = warranties.map((w) => {
      if (w.status === 'active' && new Date(w.endDate) < now) {
        return { ...w, status: 'expired' };
      }
      return w;
    });

    res.json(updatedWarranties);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch warranties' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const warranty = await prisma.warranty.findUnique({
      where: { id: req.params.id },
      include: warrantyInclude,
    });
    if (!warranty) return res.status(404).json({ error: 'Warranty not found' });
    res.json(warranty);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch warranty' });
  }
});

router.post('/check', async (req, res) => {
  try {
    const { serialNumber, invoiceNo, productId } = req.body;

    if (!serialNumber && !invoiceNo) {
      return res.status(400).json({ error: 'Provide serialNumber or invoiceNo' });
    }

    const where = {};
    if (serialNumber) where.serialNumber = serialNumber;
    else if (invoiceNo && productId) { where.invoiceNo = invoiceNo; where.productId = productId; }
    else if (invoiceNo) where.invoiceNo = invoiceNo;

    const warranties = await prisma.warranty.findMany({
      where,
      include: warrantyInclude,
    });

    if (!warranties.length) return res.status(404).json({ error: 'No warranty found' });

    const now = new Date();
    const result = warranties.map((w) => {
      const isExpired = new Date(w.endDate) < now;
      const daysRemaining = Math.ceil((new Date(w.endDate) - now) / (1000 * 60 * 60 * 24));
      return {
        ...w,
        status: w.status === 'active' && isExpired ? 'expired' : w.status,
        daysRemaining: isExpired ? 0 : daysRemaining,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check warranty' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const warranty = await prisma.warranty.update({
      where: { id: req.params.id },
      data: { status, notes },
      include: warrantyInclude,
    });
    res.json(warranty);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Warranty not found' });
    res.status(500).json({ error: 'Failed to update warranty' });
  }
});

router.put('/:id/claim', async (req, res) => {
  try {
    const { notes } = req.body;
    const warranty = await prisma.warranty.update({
      where: { id: req.params.id },
      data: { status: 'claimed', claimedAt: new Date(), notes: notes || null },
      include: warrantyInclude,
    });
    res.json(warranty);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Warranty not found' });
    res.status(500).json({ error: 'Failed to claim warranty' });
  }
});

module.exports = router;
