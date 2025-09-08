/*
  Warnings:

  - A unique constraint covering the columns `[executedAt,id]` on the table `Trade` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Trade_id_executedAt_key";

-- CreateIndex
CREATE UNIQUE INDEX "Trade_executedAt_id_key" ON "public"."Trade"("executedAt", "id");
