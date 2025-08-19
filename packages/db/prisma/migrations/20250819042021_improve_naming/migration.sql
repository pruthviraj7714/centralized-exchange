/*
  Warnings:

  - The values [PARTIAL] on the enum `ORDER_STATUS` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ORDER_STATUS_new" AS ENUM ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" TYPE "public"."ORDER_STATUS_new" USING ("status"::text::"public"."ORDER_STATUS_new");
ALTER TYPE "public"."ORDER_STATUS" RENAME TO "ORDER_STATUS_old";
ALTER TYPE "public"."ORDER_STATUS_new" RENAME TO "ORDER_STATUS";
DROP TYPE "public"."ORDER_STATUS_old";
COMMIT;
