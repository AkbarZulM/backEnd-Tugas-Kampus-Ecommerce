/*
  Warnings:

  - The values [PREPARING] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `transfer_proof_id` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Made the column `bank_name` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `account_number` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `account_name` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `transfer_proof_url` on table `payments` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'ON_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TABLE "order_status_history" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "transfer_proof_id" TEXT NOT NULL,
ALTER COLUMN "bank_name" SET NOT NULL,
ALTER COLUMN "account_number" SET NOT NULL,
ALTER COLUMN "account_name" SET NOT NULL,
ALTER COLUMN "transfer_proof_url" SET NOT NULL;
