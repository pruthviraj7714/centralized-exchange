/*
  Warnings:

  - You are about to drop the column `img` on the `Market` table. All the data in the column will be lost.
  - Added the required column `logo` to the `Market` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Market" DROP COLUMN "img",
ADD COLUMN     "logo" TEXT NOT NULL;
