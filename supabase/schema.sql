-- ============================================
-- ReviewFlow — Schema SQL para Supabase
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS
-- ============================================

-- Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  notes TEXT,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projetos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reference TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'changes_requested')),
  public_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  final_approved_at TIMESTAMPTZ,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens de conteúdo (carrossel, imagem única, vídeo)
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('carousel', 'single_image', 'video')),
  sort_order INT NOT NULL DEFAULT 0,
  general_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slides (cada imagem de um carrossel, ou o único arquivo de imagem/vídeo)
CREATE TABLE content_slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  active_version_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested', 'awaiting_approval')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Versões dos arquivos
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slide_id UUID NOT NULL REFERENCES content_slides(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  version_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar FK para active_version_id depois de criar content_versions
ALTER TABLE content_slides
ADD CONSTRAINT fk_active_version
FOREIGN KEY (active_version_id) REFERENCES content_versions(id) ON DELETE SET NULL;

-- Comentários
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  slide_id UUID REFERENCES content_slides(id) ON DELETE CASCADE,
  version_id UUID REFERENCES content_versions(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'observation' CHECK (type IN ('observation', 'change_request', 'general')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_public_token ON projects(public_token);
CREATE INDEX idx_content_items_project_id ON content_items(project_id);
CREATE INDEX idx_content_items_sort_order ON content_items(project_id, sort_order);
CREATE INDEX idx_content_slides_content_item_id ON content_slides(content_item_id);
CREATE INDEX idx_content_slides_sort_order ON content_slides(content_item_id, sort_order);
CREATE INDEX idx_content_versions_slide_id ON content_versions(slide_id);
CREATE INDEX idx_comments_project_id ON comments(project_id);
CREATE INDEX idx_comments_slide_id ON comments(slide_id);
CREATE INDEX idx_comments_is_read ON comments(is_read);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_content_slides_updated_at
  BEFORE UPDATE ON content_slides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- CLIENTS: apenas admin autenticado
CREATE POLICY "Admin can manage clients"
  ON clients FOR ALL
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

-- PROJECTS: admin pode tudo; leitura pública via token (usando funções RPC)
CREATE POLICY "Admin can manage projects"
  ON projects FOR ALL
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Public can read projects by token"
  ON projects FOR SELECT
  USING (true);

-- CONTENT_ITEMS: admin pode tudo; leitura pública via project
CREATE POLICY "Admin can manage content items"
  ON content_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = content_items.project_id AND projects.admin_id = auth.uid()
    )
  );

CREATE POLICY "Public can read content items"
  ON content_items FOR SELECT
  USING (true);

-- CONTENT_SLIDES: admin pode tudo; leitura pública
CREATE POLICY "Admin can manage content slides"
  ON content_slides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      JOIN projects p ON p.id = ci.project_id
      WHERE ci.id = content_slides.content_item_id AND p.admin_id = auth.uid()
    )
  );

CREATE POLICY "Public can read content slides"
  ON content_slides FOR SELECT
  USING (true);

-- CONTENT_VERSIONS: admin pode tudo; leitura pública
CREATE POLICY "Admin can manage content versions"
  ON content_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_slides cs
      JOIN content_items ci ON ci.id = cs.content_item_id
      JOIN projects p ON p.id = ci.project_id
      WHERE cs.id = content_versions.slide_id AND p.admin_id = auth.uid()
    )
  );

CREATE POLICY "Public can read content versions"
  ON content_versions FOR SELECT
  USING (true);

-- COMMENTS: admin pode ler e atualizar; público pode inserir e ler
CREATE POLICY "Admin can manage comments"
  ON comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = comments.project_id AND projects.admin_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert comments"
  ON comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read comments"
  ON comments FOR SELECT
  USING (true);

-- CONTENT_SLIDES: público pode atualizar status
CREATE POLICY "Public can update slide status"
  ON content_slides FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- PROJECTS: público pode atualizar status (para aprovação final)
CREATE POLICY "Public can update project status"
  ON projects FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Execute separadamente no Supabase Dashboard:
-- 1. Criar bucket "project-files" (público)
-- 2. Adicionar policy: 
--    - SELECT: permitir para todos (anon, authenticated)
--    - INSERT: permitir para authenticated
--    - UPDATE: permitir para authenticated
--    - DELETE: permitir para authenticated

-- ============================================
-- FUNÇÕES RPC
-- ============================================

-- Buscar projeto pelo token público (para a página do cliente)
CREATE OR REPLACE FUNCTION get_project_by_token(token TEXT)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  name TEXT,
  reference TEXT,
  description TEXT,
  status TEXT,
  public_token TEXT,
  final_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  client_name TEXT,
  client_company TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.client_id,
    p.name,
    p.reference,
    p.description,
    p.status,
    p.public_token,
    p.final_approved_at,
    p.created_at,
    c.name AS client_name,
    c.company_name AS client_company
  FROM projects p
  JOIN clients c ON c.id = p.client_id
  WHERE p.public_token = token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
