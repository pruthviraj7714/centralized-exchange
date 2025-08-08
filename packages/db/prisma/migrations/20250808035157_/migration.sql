/*
  Warnings:

  - A unique constraint covering the columns `[userId,asset]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_asset_key" ON "public"."Wallet"("userId", "asset");
