/*
  Warnings:

  - A unique constraint covering the columns `[walletId,idempotencyKey]` on the table `WalletLedger` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Wallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `asset` to the `WalletLedger` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `WalletLedger` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WalletLedger_idempotencyKey_key";

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WalletLedger" ADD COLUMN     "asset" TEXT NOT NULL,
ADD COLUMN     "sequence" BIGSERIAL NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "WalletLedger_walletId_sequence_idx" ON "WalletLedger"("walletId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedger_walletId_idempotencyKey_key" ON "WalletLedger"("walletId", "idempotencyKey");
