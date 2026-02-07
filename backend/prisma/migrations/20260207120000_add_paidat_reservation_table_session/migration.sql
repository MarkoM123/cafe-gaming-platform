-- Add PaymentMethod enum if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MIXED');
  END IF;
END$$;

-- Add paidAt/paymentMethod/paidByUserId to Order (nullable)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidByUserId" TEXT;

-- Add Reservation.tableSessionId and deletedAt (nullable)
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "tableSessionId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_paidByUserId_fkey'
  ) THEN
    ALTER TABLE "Order"
    ADD CONSTRAINT "Order_paidByUserId_fkey"
    FOREIGN KEY ("paidByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Reservation_tableSessionId_fkey'
  ) THEN
    ALTER TABLE "Reservation"
    ADD CONSTRAINT "Reservation_tableSessionId_fkey"
    FOREIGN KEY ("tableSessionId") REFERENCES "TableSession"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Reservation_deletedAt_idx" ON "Reservation"("deletedAt");
CREATE INDEX IF NOT EXISTS "Reservation_tableSessionId_idx" ON "Reservation"("tableSessionId");
