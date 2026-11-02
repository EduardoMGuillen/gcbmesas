-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MESERO', 'CAJERO', 'TAQUILLA', 'COCINA', 'BAR', 'CLIENTE_TICKETERA');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "LogAction" AS ENUM ('ACCOUNT_OPENED', 'ACCOUNT_CLOSED', 'ORDER_CREATED', 'ORDER_CANCELLED', 'ORDER_REJECTED', 'PRODUCT_ADDED', 'PRODUCT_UPDATED', 'PRODUCT_ACTIVATED', 'PRODUCT_DEACTIVATED', 'PRODUCT_DELETED', 'TABLE_CREATED', 'TABLE_UPDATED', 'TABLE_DELETED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'LOGIN', 'LOGOUT', 'EVENT_CREATED', 'EVENT_UPDATED', 'ENTRY_SOLD', 'ENTRY_USED', 'PAYMENT_REFUNDED', 'ATTENDANCE_MARK', 'CYBERSOURCE_PAYMENT_AUDIT', 'CASH_SESSION_OPENED', 'CASH_SESSION_CLOSED', 'EXPENSE_CREATED', 'STOCK_ADJUSTED', 'WAITER_ZONE_ASSIGNED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'POS_FICOHSA', 'POS_BAC', 'TRANSFER');

-- CreateEnum
CREATE TYPE "StockLocation" AS ENUM ('BODEGA', 'BARRA', 'ABIERTO', 'MERMA');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'TRANSFER', 'MERMA', 'ADJUSTMENT', 'SALE');

-- CreateEnum
CREATE TYPE "VenueZone" AS ENUM ('ASTRO', 'STUDIO54', 'GARDEN');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AttendanceMarkType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPrepStatus" AS ENUM ('NONE', 'QUEUED', 'PREPARING', 'READY');

-- CreateEnum
CREATE TYPE "PrepCategoryDestination" AS ENUM ('COCINA', 'BAR');

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientSelfOrderingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "invoiceLegalName" TEXT,
    "invoiceTradeName" TEXT,
    "invoiceRtn" TEXT,
    "invoiceAddress" TEXT,
    "invoicePhone" TEXT,
    "invoiceEmail" TEXT,
    "invoiceCaiBlock" TEXT,
    "invoiceFooterNote" TEXT,
    "invoiceIsvPercent" DECIMAL(5,2),

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MESERO',
    "notifyEntrySales" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waiter_zone_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "zone" "VenueZone" NOT NULL,
    "businessDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiter_zone_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bar_cajero_watches" (
    "id" TEXT NOT NULL,
    "barUserId" TEXT NOT NULL,
    "cajeroId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bar_cajero_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prep_category_stations" (
    "category" TEXT NOT NULL,
    "station" "PrepCategoryDestination" NOT NULL,

    CONSTRAINT "prep_category_stations_pkey" PRIMARY KEY ("category")
);

-- CreateTable
CREATE TABLE "user_event_assignments" (
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_event_assignments_pkey" PRIMARY KEY ("userId","eventId")
);

-- CreateTable
CREATE TABLE "cajero_mesero_watches" (
    "id" TEXT NOT NULL,
    "cajeroId" TEXT NOT NULL,
    "meseroId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajero_mesero_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_prep_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_prep_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "p256dh" TEXT,
    "auth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT,
    "qrUrl" TEXT,
    "shortcode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "initialBalance" DECIMAL(10,2) NOT NULL,
    "currentBalance" DECIMAL(10,2) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedByUserId" TEXT,
    "clientName" TEXT,
    "paymentMethod" "PaymentMethod",
    "cashSessionId" TEXT,
    "venueZone" "VenueZone",

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "emoji" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresPrep" BOOLEAN NOT NULL DEFAULT true,
    "isTaxExempt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "servedByUserId" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "served" BOOLEAN NOT NULL DEFAULT false,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "prepStatus" "OrderPrepStatus" NOT NULL DEFAULT 'NONE',
    "stockItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tableId" TEXT,
    "action" "LogAction" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_payment_rejections" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "httpStatus" INTEGER NOT NULL,
    "reasonCategory" TEXT NOT NULL,
    "friendlyMessage" TEXT NOT NULL,
    "rawMessage" TEXT NOT NULL,
    "eventId" TEXT,
    "paymentReference" TEXT,
    "clientEmail" TEXT,

    CONSTRAINT "online_payment_rejections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "coverPrice" DECIMAL(10,2) NOT NULL,
    "paypalPrice" DECIMAL(10,2),
    "maxEntries" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishOnLcb" BOOLEAN NOT NULL DEFAULT true,
    "publishOnCbtickets" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "venueName" TEXT,
    "venueAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "numberOfEntries" INTEGER NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "qrToken" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" TEXT,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_marks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "type" "AttendanceMarkType" NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION NOT NULL,
    "selfieUrl" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "userAgent" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_marks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_settings" (
    "id" INTEGER NOT NULL,
    "referenceLatitude" DOUBLE PRECISION NOT NULL,
    "referenceLongitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "maxAccuracyMeters" INTEGER NOT NULL DEFAULT 200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultFloat" DECIMAL(10,2) NOT NULL DEFAULT 4000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "venueZone" "VenueZone",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
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
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
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
    "salePrice" DECIMAL(10,2),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantityChange" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halloween_contestants" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "instagramUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "halloween_contestants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "waiter_zone_assignments_businessDate_zone_idx" ON "waiter_zone_assignments"("businessDate", "zone");

-- CreateIndex
CREATE UNIQUE INDEX "waiter_zone_assignments_userId_businessDate_key" ON "waiter_zone_assignments"("userId", "businessDate");

-- CreateIndex
CREATE INDEX "bar_cajero_watches_barUserId_idx" ON "bar_cajero_watches"("barUserId");

-- CreateIndex
CREATE INDEX "bar_cajero_watches_cajeroId_idx" ON "bar_cajero_watches"("cajeroId");

-- CreateIndex
CREATE UNIQUE INDEX "bar_cajero_watches_barUserId_cajeroId_key" ON "bar_cajero_watches"("barUserId", "cajeroId");

-- CreateIndex
CREATE INDEX "user_event_assignments_eventId_idx" ON "user_event_assignments"("eventId");

-- CreateIndex
CREATE INDEX "cajero_mesero_watches_cajeroId_idx" ON "cajero_mesero_watches"("cajeroId");

-- CreateIndex
CREATE INDEX "cajero_mesero_watches_meseroId_idx" ON "cajero_mesero_watches"("meseroId");

-- CreateIndex
CREATE UNIQUE INDEX "cajero_mesero_watches_cajeroId_meseroId_key" ON "cajero_mesero_watches"("cajeroId", "meseroId");

-- CreateIndex
CREATE INDEX "user_prep_categories_userId_idx" ON "user_prep_categories"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_prep_categories_userId_category_key" ON "user_prep_categories"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tables_qrUrl_key" ON "tables"("qrUrl");

-- CreateIndex
CREATE UNIQUE INDEX "tables_shortcode_key" ON "tables"("shortcode");

-- CreateIndex
CREATE INDEX "accounts_status_createdAt_idx" ON "accounts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "accounts_tableId_status_idx" ON "accounts"("tableId", "status");

-- CreateIndex
CREATE INDEX "accounts_cashSessionId_idx" ON "accounts"("cashSessionId");

-- CreateIndex
CREATE INDEX "accounts_paymentMethod_idx" ON "accounts"("paymentMethod");

-- CreateIndex
CREATE INDEX "accounts_venueZone_idx" ON "accounts"("venueZone");

-- CreateIndex
CREATE INDEX "orders_accountId_idx" ON "orders"("accountId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_servedByUserId_idx" ON "orders"("servedByUserId");

-- CreateIndex
CREATE INDEX "orders_stockItemId_idx" ON "orders"("stockItemId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_served_rejected_createdAt_idx" ON "orders"("served", "rejected", "createdAt");

-- CreateIndex
CREATE INDEX "orders_accountId_rejected_idx" ON "orders"("accountId", "rejected");

-- CreateIndex
CREATE INDEX "orders_prepStatus_createdAt_idx" ON "orders"("prepStatus", "createdAt");

-- CreateIndex
CREATE INDEX "logs_userId_idx" ON "logs"("userId");

-- CreateIndex
CREATE INDEX "logs_tableId_idx" ON "logs"("tableId");

-- CreateIndex
CREATE INDEX "logs_action_idx" ON "logs"("action");

-- CreateIndex
CREATE INDEX "logs_createdAt_idx" ON "logs"("createdAt");

-- CreateIndex
CREATE INDEX "online_payment_rejections_createdAt_idx" ON "online_payment_rejections"("createdAt");

-- CreateIndex
CREATE INDEX "online_payment_rejections_reasonCategory_idx" ON "online_payment_rejections"("reasonCategory");

-- CreateIndex
CREATE INDEX "online_payment_rejections_eventId_idx" ON "online_payment_rejections"("eventId");

-- CreateIndex
CREATE INDEX "online_payment_rejections_paymentReference_idx" ON "online_payment_rejections"("paymentReference");

-- CreateIndex
CREATE INDEX "events_isActive_idx" ON "events"("isActive");

-- CreateIndex
CREATE INDEX "events_date_idx" ON "events"("date");

-- CreateIndex
CREATE INDEX "events_publishOnLcb_idx" ON "events"("publishOnLcb");

-- CreateIndex
CREATE INDEX "events_publishOnCbtickets_idx" ON "events"("publishOnCbtickets");

-- CreateIndex
CREATE UNIQUE INDEX "entries_qrToken_key" ON "entries"("qrToken");

-- CreateIndex
CREATE INDEX "entries_eventId_idx" ON "entries"("eventId");

-- CreateIndex
CREATE INDEX "entries_qrToken_idx" ON "entries"("qrToken");

-- CreateIndex
CREATE INDEX "entries_status_idx" ON "entries"("status");

-- CreateIndex
CREATE INDEX "entries_createdAt_idx" ON "entries"("createdAt");

-- CreateIndex
CREATE INDEX "entries_eventId_usedAt_idx" ON "entries"("eventId", "usedAt");

-- CreateIndex
CREATE INDEX "attendance_marks_userId_markedAt_idx" ON "attendance_marks"("userId", "markedAt");

-- CreateIndex
CREATE INDEX "attendance_marks_role_markedAt_idx" ON "attendance_marks"("role", "markedAt");

-- CreateIndex
CREATE INDEX "attendance_marks_type_markedAt_idx" ON "attendance_marks"("type", "markedAt");

-- CreateIndex
CREATE INDEX "attendance_marks_createdAt_idx" ON "attendance_marks"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_slug_key" ON "cash_registers"("slug");

-- CreateIndex
CREATE INDEX "cash_sessions_registerId_status_idx" ON "cash_sessions"("registerId", "status");

-- CreateIndex
CREATE INDEX "cash_sessions_openedAt_idx" ON "cash_sessions"("openedAt");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "stock_items_location_idx" ON "stock_items"("location");

-- CreateIndex
CREATE INDEX "stock_items_venueZone_idx" ON "stock_items"("venueZone");

-- CreateIndex
CREATE INDEX "stock_items_category_idx" ON "stock_items"("category");

-- CreateIndex
CREATE INDEX "stock_items_name_idx" ON "stock_items"("name");

-- CreateIndex
CREATE INDEX "stock_items_expiresAt_idx" ON "stock_items"("expiresAt");

-- CreateIndex
CREATE INDEX "stock_items_productId_venueZone_idx" ON "stock_items"("productId", "venueZone");

-- CreateIndex
CREATE INDEX "stock_movements_stockItemId_createdAt_idx" ON "stock_movements"("stockItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "halloween_contestants_nationalId_key" ON "halloween_contestants"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "halloween_contestants_instagramUrl_key" ON "halloween_contestants"("instagramUrl");

-- CreateIndex
CREATE INDEX "halloween_contestants_createdAt_idx" ON "halloween_contestants"("createdAt");

-- AddForeignKey
ALTER TABLE "waiter_zone_assignments" ADD CONSTRAINT "waiter_zone_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bar_cajero_watches" ADD CONSTRAINT "bar_cajero_watches_barUserId_fkey" FOREIGN KEY ("barUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bar_cajero_watches" ADD CONSTRAINT "bar_cajero_watches_cajeroId_fkey" FOREIGN KEY ("cajeroId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_event_assignments" ADD CONSTRAINT "user_event_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_event_assignments" ADD CONSTRAINT "user_event_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajero_mesero_watches" ADD CONSTRAINT "cajero_mesero_watches_cajeroId_fkey" FOREIGN KEY ("cajeroId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajero_mesero_watches" ADD CONSTRAINT "cajero_mesero_watches_meseroId_fkey" FOREIGN KEY ("meseroId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_prep_categories" ADD CONSTRAINT "user_prep_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_servedByUserId_fkey" FOREIGN KEY ("servedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_payment_rejections" ADD CONSTRAINT "online_payment_rejections_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_marks" ADD CONSTRAINT "attendance_marks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

