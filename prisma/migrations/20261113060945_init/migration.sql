-- Invariant 4: RLS is on for every table in public, with no policies.
-- Prisma creates _prisma_migrations itself, not from a model, so this migration enables RLS on it.
-- The guard keeps the migration valid in the shadow database, where the table may not exist.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
