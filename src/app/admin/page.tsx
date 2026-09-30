'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project, Client, ContentItem, ContentSlide } from '@/lib/types';
import { getProjectStatusLabel, formatDate, getStatusBgColor, calculateProjectStats } from '@/lib/utils';
import Link from 'next/link';

interface ProjectWithClient extends Project {
  client: Client;
  content_items: (ContentItem & { content_slides: ContentSlide[] })[];
  unread_count: number;
}

export default function AdminDashboard() {
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(*),
        content_items(
          *,
          content_slides(*)
        )
      `)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      // Get unread counts
      const { data: unreadData } = await supabase
        .from('comments')
        .select('project_id')
        .eq('is_read', false);

      const unreadCounts: Record<string, number> = {};
      unreadData?.forEach(c => {
        unreadCounts[c.project_id] = (unreadCounts[c.project_id] || 0) + 1;
      });

      const projectsWithUnread = data.map(p => ({
        ...p,
        unread_count: unreadCounts[p.id] || 0,
      }));

      setProjects(projectsWithUnread as ProjectWithClient[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-zinc-500 mt-1">Visão geral dos seus projetos</p>
        </div>
        <Link href="/admin/clients" className="btn btn-primary">
          + Novo Projeto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-lg font-medium text-white mb-2">Nenhum projeto ainda</h2>
          <p className="text-zinc-500 mb-6">Comece criando um cliente e adicionando seu primeiro projeto.</p>
          <Link href="/admin/clients" className="btn btn-primary">
            Criar primeiro cliente
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
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
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-medium truncate">{project.name}</h3>
                      {project.unread_count > 0 && (
                        <span className="flex items-center gap-1.5 text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">
                          <span className="notification-dot" />
                          {project.unread_count} nova{project.unread_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">{project.client?.company_name}</p>
                    {project.reference && (
                      <p className="text-xs text-zinc-600 mt-1">{project.reference}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`badge ${getStatusBgColor(project.status as any)}`}>
                      {getProjectStatusLabel(project.status)}
                    </span>
                    <span className="text-xs text-zinc-600">{formatDate(project.created_at)}</span>
                  </div>
                </div>

                {stats.total_slides > 0 && (
                  <div className="mt-4 flex items-center gap-4 text-xs">
                    <span className="text-zinc-500">
                      {stats.total_slides} conteúdo{stats.total_slides !== 1 ? 's' : ''}
                    </span>
                    {stats.approved > 0 && (
                      <span className="text-emerald-400">✓ {stats.approved}</span>
                    )}
                    {stats.pending > 0 && (
                      <span className="text-yellow-400">○ {stats.pending}</span>
                    )}
                    {stats.changes_requested > 0 && (
                      <span className="text-red-400">✕ {stats.changes_requested}</span>
                    )}
                    {stats.awaiting_approval > 0 && (
                      <span className="text-amber-400">◐ {stats.awaiting_approval}</span>
                    )}

                    {/* Progress bar */}
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
    </div>
  );
}
