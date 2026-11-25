-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(50),
    "preferred_currency" CHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- Hand-added (unit 1.5). Invariant 4: RLS on, with no policies.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- A format guard only: which codes are allowed is the app's list (lib/money/currencies.ts).
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_preferred_currency_format"
  CHECK ("preferred_currency" ~ '^[A-Z]{3}$');

-- An empty name is stored as NULL.
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_display_name_not_blank"
  CHECK ("display_name" IS NULL OR length(btrim("display_name")) > 0);
