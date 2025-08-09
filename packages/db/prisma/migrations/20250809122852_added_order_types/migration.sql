/*
  Warnings:

  - Added the required column `type` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ORDER_TYPE" AS ENUM ('LIMIT', 'MARKET');

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "type" "public"."ORDER_TYPE" NOT NULL,
ALTER COLUMN "price" SET DEFAULT 0;
