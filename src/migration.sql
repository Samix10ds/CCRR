-- ============================================================
-- CCRR MIGRATION — esegui tutto nell'SQL Editor di Supabase
-- ============================================================

-- Fix CRITICO: author_id NULL sulle idee esistenti
UPDATE ideas SET author_id = user_id WHERE author_id IS NULL AND user_id IS NOT NULL;

-- Colonne mancanti su ideas
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS is_votable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Colonne per rank nei profili
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_ideas INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS special_rank TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- Fix ruolo mod
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user','mod','admin'));

-- Fix reports: tipi multipli
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'user';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS preset TEXT DEFAULT NULL;

-- Tabella commenti
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS commenti
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comments_select ON comments;
DROP POLICY IF EXISTS comments_insert ON comments;
DROP POLICY IF EXISTS comments_delete ON comments;
CREATE POLICY comments_select ON comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY comments_delete ON comments FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod','admin'))
);

-- Trigger: aggiorna comments_count automaticamente
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ideas SET comments_count = comments_count + 1 WHERE id = NEW.idea_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ideas SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.idea_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS comments_count_trigger ON comments;
CREATE TRIGGER comments_count_trigger
  AFTER INSERT OR DELETE ON comments FOR EACH ROW
  EXECUTE FUNCTION update_comments_count();

-- Trigger: aggiorna approved_ideas nel profilo
CREATE OR REPLACE FUNCTION update_approved_ideas()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE profiles SET approved_ideas = approved_ideas + 1
    WHERE id = COALESCE(NEW.author_id, NEW.user_id);
  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE profiles SET approved_ideas = GREATEST(approved_ideas - 1, 0)
    WHERE id = COALESCE(NEW.author_id, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS approved_ideas_trigger ON ideas;
CREATE TRIGGER approved_ideas_trigger
  AFTER UPDATE OF status ON ideas FOR EACH ROW
  EXECUTE FUNCTION update_approved_ideas();

-- RLS ideas: tutti gli utenticati vedono tutte le idee
DROP POLICY IF EXISTS ideas_select ON ideas;
DROP POLICY IF EXISTS "Idee approvate visibili a tutti" ON ideas;
CREATE POLICY ideas_select ON ideas FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS ideas update: mod e admin possono modificare
DROP POLICY IF EXISTS ideas_update ON ideas;
DROP POLICY IF EXISTS "Admin gestisce idee" ON ideas;
CREATE POLICY ideas_update ON ideas FOR UPDATE USING (
  auth.uid() = COALESCE(author_id, user_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod','admin'))
);

-- Realtime per commenti
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
