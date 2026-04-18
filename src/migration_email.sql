-- Aggiungi colonna email ai profili
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Aggiorna RLS: permetti lettura anonima dell'email per il lookup al login
CREATE POLICY "Lookup email anonimo" ON profiles
  FOR SELECT USING (TRUE);

-- (Rimuovi la vecchia policy se esiste)
DROP POLICY IF EXISTS "Profilo visibile a tutti gli autenticati" ON profiles;
