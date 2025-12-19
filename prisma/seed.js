import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database for your food store...");

  // Create sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "KSAPT-001" },
      update: {},
      create: {
        sku: "KSAPT-001",
        name: "Kopi Susu Aren + Peach Oolong Milk Tea",
        description: "Kopi susu dengan aren dan peach oolong milk tea",
        price: 29200,
        cost: 15000,
        stock: 100,
        category: "Minuman",
        imageUrl: "/images/kopi-susu-aren.jpg",
      },
    }),

    prisma.product.upsert({
      where: { sku: "AMERICANO-001" },
      update: {},
      create: {
        sku: "AMERICANO-001",
        name: "Americano",
        description: "Kopi hitam americano",
        price: 18000,
        cost: 8000,
        stock: 50,
        category: "Minuman",
      },
    }),

    prisma.product.upsert({
      where: { sku: "LATTE-001" },
      update: {},
      create: {
        sku: "LATTE-001",
        name: "Latte",
        description: "Kopi latte",
        price: 22000,
        cost: 10000,
        stock: 50,
        category: "Minuman",
      },
    }),
  ]);

  // Create admin account (YOU)
  const admin = await prisma.admin.upsert({
    where: { email: "admin@tomoro.com" },
    update: {},
    create: {
      name: "Admin Tomoro",
      email: "admin@tomoro.com",
      phone: "082112345679",
      passwordHash: "$2b$10$YourHashedPasswordHere", // bcrypt hash of "admin123"
      role: "owner",
    },
  });

  console.log("✅ Seeding completed!");
  console.log(`🏪 Store: ${store.name}`);
  console.log(`📦 Products: ${products.length} products created`);
  console.log(`👑 Admin: ${admin.name} (${admin.email})`);
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
