/*
  Warnings:

  - Added the required column `img` to the `Market` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symbol` to the `Market` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Market" ADD COLUMN     "img" TEXT NOT NULL,
ADD COLUMN     "symbol" TEXT NOT NULL;
