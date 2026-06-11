const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // --- Users ---
  const adminPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@electropos.com' },
    update: {},
    create: {
      email: 'admin@electropos.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@electropos.com' },
    update: {},
    create: {
      email: 'cashier@electropos.com',
      password: cashierPassword,
      name: 'Cashier User',
      role: 'cashier',
    },
  });

  console.log(`Created users: ${admin.email}, ${cashier.email}`);

  // --- Categories ---
  const categoryNames = [
    { name: 'Smartphones', description: 'Mobile phones and smartphones' },
    { name: 'Laptops', description: 'Laptops and notebooks' },
    { name: 'TVs', description: 'Televisions and displays' },
    { name: 'Accessories', description: 'Electronics accessories and peripherals' },
    { name: 'Home Appliances', description: 'Home electrical appliances' },
  ];

  const categories = {};
  for (const cat of categoryNames) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categories[cat.name] = created;
  }

  console.log(`Created ${Object.keys(categories).length} categories`);

  // --- Suppliers ---
  const supplierData = [
    {
      name: 'TechDistrib Ltd',
      contact: 'James Carter',
      email: 'orders@techdistrib.com',
      phone: '+1-800-555-0101',
      address: '100 Tech Park, Silicon Valley, CA 94025',
    },
    {
      name: 'ElectroSupply Co',
      contact: 'Sarah Kim',
      email: 'supply@electrosupply.com',
      phone: '+1-800-555-0202',
      address: '250 Supply Drive, Austin, TX 78701',
    },
  ];

  const suppliers = {};
  for (const sup of supplierData) {
    const existing = await prisma.supplier.findFirst({ where: { name: sup.name } });
    if (existing) {
      suppliers[sup.name] = existing;
    } else {
      const created = await prisma.supplier.create({ data: sup });
      suppliers[sup.name] = created;
    }
  }

  console.log(`Created ${Object.keys(suppliers).length} suppliers`);

  // --- Products ---
  const productData = [
    {
      name: 'Samsung Galaxy S23',
      description: '6.1" AMOLED display, 128GB storage, 5G capable',
      sku: 'SMSG-S23-128',
      barcode: '8901234567890',
      categoryId: categories['Smartphones'].id,
      supplierId: suppliers['TechDistrib Ltd'].id,
      price: 799.99,
      costPrice: 560.00,
      stock: 25,
      minStock: 5,
      warrantyMonths: 12,
    },
    {
      name: 'Apple iPhone 15',
      description: '6.1" Super Retina XDR, 128GB, A16 Bionic chip',
      sku: 'APPL-IP15-128',
      barcode: '8901234567891',
      categoryId: categories['Smartphones'].id,
      supplierId: suppliers['TechDistrib Ltd'].id,
      price: 999.99,
      costPrice: 720.00,
      stock: 18,
      minStock: 5,
      warrantyMonths: 12,
    },
    {
      name: 'Dell XPS 15',
      description: '15.6" OLED touch, Intel Core i7, 16GB RAM, 512GB SSD',
      sku: 'DELL-XPS15-I7',
      barcode: '8901234567892',
      categoryId: categories['Laptops'].id,
      supplierId: suppliers['TechDistrib Ltd'].id,
      price: 1499.99,
      costPrice: 1050.00,
      stock: 10,
      minStock: 3,
      warrantyMonths: 24,
    },
    {
      name: 'HP Pavilion 15',
      description: '15.6" FHD, AMD Ryzen 5, 8GB RAM, 256GB SSD',
      sku: 'HP-PAV15-R5',
      barcode: '8901234567893',
      categoryId: categories['Laptops'].id,
      supplierId: suppliers['ElectroSupply Co'].id,
      price: 649.99,
      costPrice: 440.00,
      stock: 15,
      minStock: 4,
      warrantyMonths: 12,
    },
    {
      name: 'Sony Bravia 55" 4K TV',
      description: '55" 4K UHD LED Smart TV, Google TV, Dolby Vision',
      sku: 'SONY-BRAV55-4K',
      barcode: '8901234567894',
      categoryId: categories['TVs'].id,
      supplierId: suppliers['TechDistrib Ltd'].id,
      price: 1199.99,
      costPrice: 820.00,
      stock: 8,
      minStock: 2,
      warrantyMonths: 24,
    },
    {
      name: 'LG OLED 65" TV',
      description: '65" OLED 4K Smart TV, webOS, Dolby Atmos',
      sku: 'LG-OLED65-4K',
      barcode: '8901234567895',
      categoryId: categories['TVs'].id,
      supplierId: suppliers['ElectroSupply Co'].id,
      price: 2199.99,
      costPrice: 1550.00,
      stock: 4,
      minStock: 2,
      warrantyMonths: 24,
    },
    {
      name: 'Apple AirPods Pro (2nd Gen)',
      description: 'Active Noise Cancellation, Transparency mode, USB-C',
      sku: 'APPL-APP-2GEN',
      barcode: '8901234567896',
      categoryId: categories['Accessories'].id,
      supplierId: suppliers['TechDistrib Ltd'].id,
      price: 249.99,
      costPrice: 165.00,
      stock: 30,
      minStock: 8,
      warrantyMonths: 12,
    },
    {
      name: 'Logitech MX Master 3S Mouse',
      description: 'Ergonomic wireless mouse, 8K DPI, silent clicks',
      sku: 'LOGI-MXM3S-BLK',
      barcode: '8901234567897',
      categoryId: categories['Accessories'].id,
      supplierId: suppliers['ElectroSupply Co'].id,
      price: 99.99,
      costPrice: 58.00,
      stock: 3,
      minStock: 5,
      warrantyMonths: 12,
    },
    {
      name: 'Dyson V15 Detect Vacuum',
      description: 'Cordless vacuum, laser dust detection, HEPA filtration',
      sku: 'DSON-V15-DET',
      barcode: '8901234567898',
      categoryId: categories['Home Appliances'].id,
      supplierId: suppliers['ElectroSupply Co'].id,
      price: 699.99,
      costPrice: 480.00,
      stock: 6,
      minStock: 3,
      warrantyMonths: 24,
    },
    {
      name: 'Samsung 65L Microwave',
      description: 'Convection microwave oven, 65L, smart sensor cooking',
      sku: 'SMSG-MW65L-CNV',
      barcode: '8901234567899',
      categoryId: categories['Home Appliances'].id,
      supplierId: suppliers['TechDistrib Ltd'].id,
      price: 349.99,
      costPrice: 230.00,
      stock: 2,
      minStock: 3,
      warrantyMonths: 12,
    },
  ];

  for (const product of productData) {
    const existing = await prisma.product.findUnique({ where: { sku: product.sku } });
    if (!existing) {
      await prisma.product.create({ data: product });
    }
  }

  console.log(`Created ${productData.length} products`);
  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
