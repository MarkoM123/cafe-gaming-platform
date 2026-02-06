-- Add order number fields (nullable first for backfill)
ALTER TABLE "Order" ADD COLUMN "orderDateKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "orderNumber" INTEGER;

-- Backfill existing orders
UPDATE "Order"
SET "orderDateKey" = to_char("createdAt", 'YYYY-MM-DD')
WHERE "orderDateKey" IS NULL;

WITH ranked AS (
  SELECT
    "id",
    "orderDateKey",
    ROW_NUMBER() OVER (PARTITION BY "orderDateKey" ORDER BY "createdAt", "id") AS rn
  FROM "Order"
)
UPDATE "Order" o
SET "orderNumber" = r.rn
FROM ranked r
WHERE o."id" = r."id";

-- Daily counter table
CREATE TABLE "OrderDailyCounter" (
  "dateKey" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL,
  CONSTRAINT "OrderDailyCounter_pkey" PRIMARY KEY ("dateKey")
);

-- Seed counters from existing orders
INSERT INTO "OrderDailyCounter" ("dateKey", "nextNumber")
SELECT "orderDateKey", MAX("orderNumber") + 1
FROM "Order"
GROUP BY "orderDateKey";

-- Enforce not-null and uniqueness
ALTER TABLE "Order" ALTER COLUMN "orderDateKey" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET NOT NULL;

CREATE UNIQUE INDEX "Order_orderDateKey_orderNumber_key"
ON "Order"("orderDateKey", "orderNumber");
