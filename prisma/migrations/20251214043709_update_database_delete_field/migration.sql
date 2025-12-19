/*
  Warnings:

  - You are about to drop the column `delivered_time` on the `deliveries` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_notes` on the `deliveries` table. All the data in the column will be lost.
  - You are about to drop the column `pickup_time` on the `deliveries` table. All the data in the column will be lost.
  - You are about to drop the column `proof_of_delivery_url` on the `deliveries` table. All the data in the column will be lost.
  - You are about to drop the column `discount_type` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `usage_limit` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `actual_delivery_time` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_delivery_time` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `packaging_fee` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `service_fee` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_reference` on the `payments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "payments_payment_reference_idx";

-- DropIndex
DROP INDEX "payments_payment_reference_key";

-- AlterTable
ALTER TABLE "deliveries" DROP COLUMN "delivered_time",
DROP COLUMN "delivery_notes",
DROP COLUMN "pickup_time",
DROP COLUMN "proof_of_delivery_url";

-- AlterTable
ALTER TABLE "discounts" DROP COLUMN "discount_type",
DROP COLUMN "usage_limit";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "actual_delivery_time",
DROP COLUMN "estimated_delivery_time",
DROP COLUMN "packaging_fee",
DROP COLUMN "service_fee",
DROP COLUMN "storeId";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "payment_reference";
