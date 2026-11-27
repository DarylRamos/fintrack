-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('income', 'expense');

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "occurred_on" DATE NOT NULL,
    "description" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_user_id_occurred_on_created_at_idx" ON "transactions"("user_id", "occurred_on" DESC, "created_at" DESC);

-- Hand-added (unit 2.2). RLS on with no policies (invariant 4): only the `prisma` role, which bypasses
-- RLS, reads the table, and the data layer filters every query by user_id.
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;

-- Amounts are above 0 and below 10^12 (unit 2.1's limit); the type gives the direction.
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_range" CHECK ("amount" > 0 AND "amount" < 1000000000000);

-- A format guard only: which codes are allowed is the app's list (lib/money/currencies.ts).
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_description_not_blank" CHECK (length(btrim("description")) > 0);
