require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const statements = [
  `DO $$ BEGIN CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'POS_FICOHSA', 'POS_BAC', 'TRANSFER'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "StockLocation" AS ENUM ('BODEGA', 'BARRA', 'ABIERTO', 'MERMA'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'TRANSFER', 'MERMA', 'ADJUSTMENT'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "VenueZone" AS ENUM ('ASTRO', 'STUDIO54', 'GARDEN'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'CASH_SESSION_OPENED'`,
  `ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'CASH_SESSION_CLOSED'`,
  `ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'EXPENSE_CREATED'`,
  `ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'STOCK_ADJUSTED'`,
  `ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'WAITER_ZONE_ASSIGNED'`,
  `ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'SALE'`,
  `CREATE TABLE IF NOT EXISTS "cash_registers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultFloat" DECIMAL(10,2) NOT NULL DEFAULT 4000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "cash_registers" ADD COLUMN IF NOT EXISTS "venueZone" "VenueZone"`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "cash_registers_slug_key" ON "cash_registers"("slug")`,
  `CREATE TABLE IF NOT EXISTS "cash_sessions" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedByUserId" TEXT NOT NULL,
    "closedByUserId" TEXT,
    "deliveredByName" TEXT,
    "receivedByName" TEXT,
    "openingFloat" DECIMAL(10,2) NOT NULL,
    "salesCash" DECIMAL(10,2),
    "salesPosFicohsa" DECIMAL(10,2),
    "salesPosBac" DECIMAL(10,2),
    "salesTransfer" DECIMAL(10,2),
    "countedCash" DECIMAL(10,2),
    "systemTotal" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "notes" TEXT,
    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "cash_sessions_registerId_status_idx" ON "cash_sessions"("registerId", "status")`,
  `CREATE INDEX IF NOT EXISTS "cash_sessions_openedAt_idx" ON "cash_sessions"("openedAt")`,
  `CREATE TABLE IF NOT EXISTS "expenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses"("date")`,
  `CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses"("category")`,
  `CREATE TABLE IF NOT EXISTS "stock_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "presentation" TEXT,
    "category" TEXT,
    "supplier" TEXT,
    "supplierPhone" TEXT,
    "location" "StockLocation" NOT NULL,
    "venueZone" "VenueZone",
    "deductOnSale" BOOLEAN NOT NULL DEFAULT true,
    "quantity" DECIMAL(12,2) NOT NULL,
    "cost" DECIMAL(10,2),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "venueZone" "VenueZone"`,
  `ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "deductOnSale" BOOLEAN NOT NULL DEFAULT true`,
  `CREATE INDEX IF NOT EXISTS "stock_items_location_idx" ON "stock_items"("location")`,
  `CREATE INDEX IF NOT EXISTS "stock_items_venueZone_idx" ON "stock_items"("venueZone")`,
  `CREATE INDEX IF NOT EXISTS "stock_items_category_idx" ON "stock_items"("category")`,
  `CREATE INDEX IF NOT EXISTS "stock_items_name_idx" ON "stock_items"("name")`,
  `CREATE INDEX IF NOT EXISTS "stock_items_expiresAt_idx" ON "stock_items"("expiresAt")`,
  `CREATE INDEX IF NOT EXISTS "stock_items_productId_venueZone_idx" ON "stock_items"("productId", "venueZone")`,
  `CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantityChange" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "stock_movements_stockItemId_createdAt_idx" ON "stock_movements"("stockItemId", "createdAt")`,
  `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod"`,
  `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "cashSessionId" TEXT`,
  `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "venueZone" "VenueZone"`,
  `CREATE INDEX IF NOT EXISTS "accounts_cashSessionId_idx" ON "accounts"("cashSessionId")`,
  `CREATE INDEX IF NOT EXISTS "accounts_paymentMethod_idx" ON "accounts"("paymentMethod")`,
  `CREATE INDEX IF NOT EXISTS "accounts_venueZone_idx" ON "accounts"("venueZone")`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stockItemId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "orders_stockItemId_idx" ON "orders"("stockItemId")`,
  `CREATE TABLE IF NOT EXISTS "waiter_zone_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "zone" "VenueZone" NOT NULL,
    "businessDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waiter_zone_assignments_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "waiter_zone_assignments_userId_businessDate_key" ON "waiter_zone_assignments"("userId", "businessDate")`,
  `CREATE INDEX IF NOT EXISTS "waiter_zone_assignments_businessDate_zone_idx" ON "waiter_zone_assignments"("businessDate", "zone")`,
]

const fks = [
  `DO $$ BEGIN ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "accounts" ADD CONSTRAINT "accounts_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "orders" ADD CONSTRAINT "orders_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TABLE "waiter_zone_assignments" ADD CONSTRAINT "waiter_zone_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$`,
]

async function run(sql) {
  try {
    await prisma.$executeRawUnsafe(sql)
    console.log('ok')
  } catch (e) {
    console.warn('warn:', e.message.split('\n')[0])
  }
}

async function main() {
  for (const sql of statements) {
    process.stdout.write(sql.slice(0, 70).replace(/\s+/g, ' ') + '... ')
    await run(sql)
  }
  for (const sql of fks) {
    process.stdout.write('fk... ')
    await run(sql)
  }
  const registers = [
    { slug: 'cover', name: 'Caja Cover', venueZone: null },
    { slug: 'astro', name: 'Caja Astro', venueZone: 'ASTRO' },
    { slug: 'studio54', name: 'Caja Studio54', venueZone: 'STUDIO54' },
    { slug: 'garden', name: 'Caja Garden', venueZone: 'GARDEN' },
    { slug: 'eventos', name: 'Caja Eventos', venueZone: null },
  ]
  for (const r of registers) {
    await prisma.cashRegister.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug, name: r.name, defaultFloat: 4000, venueZone: r.venueZone },
      update: { name: r.name, isActive: true, venueZone: r.venueZone },
    })
    console.log('register', r.slug)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
