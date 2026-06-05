/*
# Fix mutable search_path on update_updated_at_column function

1. Security Fix
- The `public.update_updated_at_column` function has a mutable search_path, which is a security risk.
- Fix by dropping with CASCADE (removes dependent triggers), then recreating the function with `SET search_path = ''`.
- Recreate all three triggers on profiles, captain_details, and rides.

2. Triggers recreated
- update_profiles_updated_at on profiles
- update_captain_details_updated_at on captain_details
- update_rides_updated_at on rides
*/

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_captain_details_updated_at
  BEFORE UPDATE ON captain_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON rides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
