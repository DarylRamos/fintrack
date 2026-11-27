-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "category_id" UUID;

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_tags" (
    "transaction_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "transaction_tags_pkey" PRIMARY KEY ("transaction_id","tag_id")
);

-- CreateIndex
CREATE INDEX "categories_user_id_type_idx" ON "categories"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_user_id_type_key" ON "categories"("id", "user_id", "type");

-- CreateIndex
CREATE INDEX "tags_user_id_idx" ON "tags"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_id_user_id_key" ON "tags"("id", "user_id");

-- CreateIndex
CREATE INDEX "transaction_tags_user_id_tag_id_idx" ON "transaction_tags"("user_id", "tag_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_category_id_idx" ON "transactions"("user_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_id_user_id_key" ON "transactions"("id", "user_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_user_id_type_fkey" FOREIGN KEY ("category_id", "user_id", "type") REFERENCES "categories"("id", "user_id", "type") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_user_id_fkey" FOREIGN KEY ("transaction_id", "user_id") REFERENCES "transactions"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_user_id_fkey" FOREIGN KEY ("tag_id", "user_id") REFERENCES "tags"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-added (unit 2.3). RLS on with no policies (invariant 4): only the `prisma` role, which bypasses
-- RLS, reads these tables, and the data layer filters every query by user_id.
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction_tags" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "categories" ADD CONSTRAINT "categories_name_not_blank" CHECK (length(btrim("name")) > 0);
ALTER TABLE "tags" ADD CONSTRAINT "tags_name_not_blank" CHECK (length(btrim("name")) > 0);

-- Names are unique per user (and type, for categories) ignoring case. Expression indexes, which Prisma
-- can't express, so they live only here (and in a comment in schema.prisma). The starter-set seed and tag
-- creation rely on them through ON CONFLICT DO NOTHING (createMany's skipDuplicates).
CREATE UNIQUE INDEX "categories_user_id_type_name_key" ON "categories"("user_id", "type", lower("name"));
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags"("user_id", lower("name"));
