/*
  Warnings:

  - You are about to drop the column `balance` on the `Wallet` table. All the data in the column will be lost.
  - Added the required column `available` to the `Wallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locked` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Wallet" DROP COLUMN "balance",
ADD COLUMN     "available" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "locked" DOUBLE PRECISION NOT NULL;
