/*
  Warnings:

  - A unique constraint covering the columns `[clientOrderId,userId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Order_clientOrderId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientOrderId_userId_key" ON "Order"("clientOrderId", "userId");
