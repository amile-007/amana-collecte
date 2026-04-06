-- ============================================================
-- AMANA Collecte — Trigger création automatique de profil
-- À exécuter dans le SQL Editor Supabase APRÈS schema.sql
-- ============================================================
-- Ce trigger crée automatiquement une ligne dans public.profiles
-- à chaque inscription d'un utilisateur via Supabase Auth.
-- Les métadonnées (nom, prénom, téléphone, rôle) sont lues
-- depuis raw_user_meta_data, passées lors du signUp.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, nom, prenom, telephone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'nom',
    NEW.raw_user_meta_data->>'prenom',
    NEW.raw_user_meta_data->>'telephone'
  );
  RETURN NEW;
END;
$$;

-- Déclenché après chaque nouvel utilisateur dans auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
