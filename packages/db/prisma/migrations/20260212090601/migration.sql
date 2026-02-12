/*
  Warnings:

  - You are about to drop the column `type` on the `WalletLedger` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `WalletLedger` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `asset` to the `WalletLedger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `balanceBefore` to the `WalletLedger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `direction` to the `WalletLedger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entryType` to the `WalletLedger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referenceType` to the `WalletLedger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `WalletLedger` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LEDGER_DIRECTION" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "LEDGER_ENTRY_TYPE" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRADE_EXECUTION', 'TRADE_FEE', 'ORDER_LOCK', 'ORDER_UNLOCK', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LEDGER_REFERENCE_TYPE" AS ENUM ('TRADE', 'ORDER', 'WITHDRAWAL', 'DEPOSIT', 'SYSTEM');

-- AlterEnum
ALTER TYPE "ORDER_STATUS" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "WalletLedger" DROP COLUMN "type",
ADD COLUMN     "asset" TEXT NOT NULL,
ADD COLUMN     "balanceBefore" DECIMAL(36,18) NOT NULL,
ADD COLUMN     "direction" "LEDGER_DIRECTION" NOT NULL,
ADD COLUMN     "entryType" "LEDGER_ENTRY_TYPE" NOT NULL,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "referenceType" "LEDGER_REFERENCE_TYPE" NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "LEDGER_TYPE";

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedger_idempotencyKey_key" ON "WalletLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletLedger_userId_createdAt_idx" ON "WalletLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedger_referenceId_idx" ON "WalletLedger"("referenceId");

-- AddForeignKey
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
