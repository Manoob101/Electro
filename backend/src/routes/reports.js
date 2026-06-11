const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(verifyToken);

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todaySalesAgg,
      todaySalesCount,
      monthSalesAgg,
      monthSalesCount,
      totalProducts,
      allProducts,
      recentSales,
    ] = await Promise.all([
      prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: todayStart }, paymentStatus: { not: 'refunded' } } }),
      prisma.sale.count({ where: { createdAt: { gte: todayStart }, paymentStatus: { not: 'refunded' } } }),
      prisma.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: monthStart }, paymentStatus: { not: 'refunded' } } }),
      prisma.sale.count({ where: { createdAt: { gte: monthStart }, paymentStatus: { not: 'refunded' } } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, stock: true, minStock: true } }),
      prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          customer: { select: { name: true } },
          user: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    const lowStockProducts = allProducts.filter((p) => p.stock <= p.minStock);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topItemsRaw = await prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, total: true },
      where: { sale: { createdAt: { gte: thirtyDaysAgo }, paymentStatus: { not: 'refunded' } } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProducts = await Promise.all(
      topItemsRaw.map(async (item) => {
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { name: true, sku: true } });
        return { ...product, totalSold: item._sum.quantity, totalRevenue: item._sum.total };
      })
    );

    const paymentMethodGroups = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      _sum: { total: true },
      _count: true,
      where: { createdAt: { gte: todayStart }, paymentStatus: { not: 'refunded' } },
    });

    res.json({
      todaySales: { total: todaySalesAgg._sum.total || 0, count: todaySalesCount },
      thisMonthSales: { total: monthSalesAgg._sum.total || 0, count: monthSalesCount },
      totalProducts,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 5),
      recentSales,
      topProducts,
      salesByPaymentMethod: paymentMethodGroups,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/sales-chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startDate }, paymentStatus: { not: 'refunded' } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      grouped[key] = { date: key, total: 0, count: 0 };
    }

    for (const sale of sales) {
      const key = sale.createdAt.toISOString().split('T')[0];
      if (grouped[key]) {
        grouped[key].total += sale.total;
        grouped[key].count += 1;
      }
    }

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales chart data' });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, supplier: true },
      orderBy: { name: 'asc' },
    });

    const result = products.map((p) => ({
      ...p,
      stockStatus: p.stock === 0 ? 'out_of_stock' : p.stock <= p.minStock ? 'low_stock' : 'in_stock',
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory report' });
  }
});

module.exports = router;
