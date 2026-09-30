'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Client, Project, ContentItem, ContentSlide } from '@/lib/types';
import { formatDate, getProjectStatusLabel, getStatusBgColor, calculateProjectStats } from '@/lib/utils';
import Link from 'next/link';

interface ProjectWithItems extends Project {
  content_items: (ContentItem & { content_slides: ContentSlide[] })[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<ProjectWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', reference: '', description: '' });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientData) setClient(clientData);

    const { data: projectsData } = await supabase
      .from('projects')
      .select(`
        *,
        content_items(
          *,
          content_slides(*)
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (projectsData) setProjects(projectsData as ProjectWithItems[]);
    setLoading(false);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        client_id: clientId,
        name: formData.name,
        reference: formData.reference || null,
        description: formData.description || null,
        admin_id: user.id,
        status: 'draft',
      })
      .select()
      .single();

    setSaving(false);
    setShowModal(false);

    if (data) {
      router.push(`/admin/projects/${data.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Cliente não encontrado.</p>
        <Link href="/admin/clients" className="btn btn-primary mt-4">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
        <Link href="/admin/clients" className="hover:text-white transition-colors">Clientes</Link>
        <span>/</span>
        <span className="text-white">{client.company_name}</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">{client.company_name}</h1>
          <p className="text-zinc-500 mt-1">{client.name}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Novo Projeto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4">📁</div>
          <h2 className="text-lg font-medium text-white mb-2">Nenhum projeto</h2>
          <p className="text-zinc-500 mb-6">Crie o primeiro projeto para este cliente.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            + Criar projeto
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => {
            const stats = calculateProjectStats((project.content_items || []) as any);

            return (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                className="glass-card p-5 card-hover block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium">{project.name}</h3>
                    {project.reference && (
                      <p className="text-sm text-zinc-500 mt-0.5">{project.reference}</p>
                    )}
                    <p className="text-xs text-zinc-600 mt-1">{formatDate(project.created_at)}</p>
                  </div>

                  <span className={`badge ${getStatusBgColor(project.status as any)}`}>
                    {getProjectStatusLabel(project.status)}
                  </span>
                </div>

                {stats.total_slides > 0 && (
                  <div className="mt-4 flex items-center gap-4 text-xs">
                    <span className="text-zinc-500">{stats.total_slides} conteúdo{stats.total_slides !== 1 ? 's' : ''}</span>
                    {stats.approved > 0 && <span className="text-emerald-400">✓ {stats.approved}</span>}
                    {stats.pending > 0 && <span className="text-yellow-400">○ {stats.pending}</span>}
                    {stats.changes_requested > 0 && <span className="text-red-400">✕ {stats.changes_requested}</span>}
                    <div className="flex-1 progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${stats.total_slides > 0 ? (stats.approved / stats.total_slides) * 100 : 0}%`,
                          background: stats.approved === stats.total_slides ? '#10b981' : undefined,
                        }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium text-white mb-6">Novo Projeto</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nome do projeto</label>
                <input
                  className="input-field"
                  placeholder="Conteúdos — Outubro 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Referência / Mês (opcional)</label>
                <input
                  className="input-field"
                  placeholder="Outubro 2026"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Descrição (opcional)</label>
                <textarea
                  className="input-field"
                  placeholder="Detalhes do projeto..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Criando...' : 'Criar projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
