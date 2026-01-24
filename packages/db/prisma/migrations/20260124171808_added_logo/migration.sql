/*
  Warnings:

  - Added the required column `logo` to the `Market` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "logo" TEXT NOT NULL;
