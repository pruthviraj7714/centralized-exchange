/*
  Warnings:

  - Made the column `price` on table `Market` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Market" ALTER COLUMN "price" SET NOT NULL;
