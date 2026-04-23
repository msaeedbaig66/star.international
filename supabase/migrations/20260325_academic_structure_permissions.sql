-- Fix permissions for academic structure tables
-- Ensures anon/authenticated can read active options via RLS
-- and service_role can manage records from admin APIs.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON TABLE public.sector_types, public.institutions, public.departments TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.sector_types, public.institutions, public.departments TO service_role;

DROP POLICY IF EXISTS sector_types_read_active ON public.sector_types;
CREATE POLICY sector_types_read_active ON public.sector_types
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS institutions_read_active ON public.institutions;
CREATE POLICY institutions_read_active ON public.institutions
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS departments_read_active ON public.departments;
CREATE POLICY departments_read_active ON public.departments
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);
