'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ContentItemWithSlides, ContentSlideWithVersions,
  SlideStatus, Comment
} from '@/lib/types';
import {
  getStatusIcon, getStatusLabel, getStatusBgColor,
  getContentTypeLabel, getSupabaseFileUrl, calculateProjectStats
} from '@/lib/utils';

// ============================
// CAROUSEL SWIPER COMPONENT
// ============================
function CarouselSwiper({
  slides,
  onSlideChange,
}: {
  slides: ContentSlideWithVersions[];
  onSlideChange: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  const goTo = (index: number) => {
    if (index < 0 || index >= slides.length) return;
    setCurrentIndex(index);
    onSlideChange(index);
    const container = containerRef.current;
    if (container) {
      const child = container.children[index] as HTMLElement;
      if (child) {
        container.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStart.current - touchEnd.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const childWidth = container.children[0]?.clientWidth || 1;
    const newIndex = Math.round(scrollLeft / childWidth);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      onSlideChange(newIndex);
    }
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
      >
        {slides.map((slide, idx) => (
          <div key={slide.id} className="flex-shrink-0 w-full snap-center">
            <div className="aspect-square bg-[#111118] rounded-2xl overflow-hidden mx-2">
              {slide.active_version && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getSupabaseFileUrl(slide.active_version.file_path)}
                  alt={`Imagem ${idx + 1}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => goTo(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentIndex
                ? 'bg-[var(--color-accent)] w-5'
                : 'bg-zinc-600'
            }`}
          />
        ))}
      </div>

      {/* Arrows (desktop) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => goTo(currentIndex - 1)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur items-center justify-center text-white hover:bg-black/70 transition-colors"
            style={{ display: currentIndex === 0 ? 'none' : undefined }}
          >
            ←
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur items-center justify-center text-white hover:bg-black/70 transition-colors"
            style={{ display: currentIndex === slides.length - 1 ? 'none' : undefined }}
          >
            →
          </button>
        </>
      )}

      {/* Counter */}
      <div className="absolute top-3 right-5 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-white">
        {currentIndex + 1} / {slides.length}
      </div>
    </div>
  );
}


// ============================
// SLIDE APPROVAL CARD
// ============================
function SlideApprovalCard({
  slide,
  index,
  totalSlides,
  projectId,
  contentItemId,
  onUpdate,
}: {
  slide: ContentSlideWithVersions;
  index: number;
  totalSlides?: number;
  projectId: string;
  contentItemId: string;
  onUpdate: () => void;
}) {
  const supabase = createClient();
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeComment, setChangeComment] = useState('');

  const handleApprove = async () => {
    setSaving(true);
    await supabase
      .from('content_slides')
      .update({ status: 'approved' })
      .eq('id', slide.id);

    if (comment.trim()) {
      await supabase.from('comments').insert({
        project_id: projectId,
        content_item_id: contentItemId,
        slide_id: slide.id,
        version_id: slide.active_version_id,
        comment: comment.trim(),
        type: 'observation',
      });
    }

    setSaving(false);
    onUpdate();
  };

  const handleRequestChange = async () => {
    if (!changeComment.trim()) return;
    setSaving(true);

    await supabase
      .from('content_slides')
      .update({ status: 'changes_requested' })
      .eq('id', slide.id);

    await supabase.from('comments').insert({
      project_id: projectId,
      content_item_id: contentItemId,
      slide_id: slide.id,
      version_id: slide.active_version_id,
      comment: changeComment.trim(),
      type: 'change_request',
    });

    setSaving(false);
    setShowChangeRequest(false);
    onUpdate();
  };

  const handleSaveComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    await supabase.from('comments').insert({
      project_id: projectId,
      content_item_id: contentItemId,
      slide_id: slide.id,
      version_id: slide.active_version_id,
      comment: comment.trim(),
      type: 'observation',
    });
    setComment('');
    setSaving(false);
    onUpdate();
  };

  const isApproved = slide.status === 'approved';
  const isChangesRequested = slide.status === 'changes_requested';

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${
      isApproved ? 'border-emerald-500/30 bg-emerald-500/5' :
      isChangesRequested ? 'border-red-500/30 bg-red-500/5' :
      'border-[var(--color-glass-border)] bg-[var(--color-glass)]'
    }`}>
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500">
          Imagem {index + 1}{totalSlides ? ` de ${totalSlides}` : ''}
        </span>
        <span className={`badge ${getStatusBgColor(slide.status)}`}>
          {getStatusIcon(slide.status)} {getStatusLabel(slide.status)}
        </span>
      </div>

      {/* Existing comments */}
      {slide.comments && slide.comments.length > 0 && (
        <div className="mb-3 space-y-2">
          {slide.comments.map(c => (
            <div
              key={c.id}
              className={`text-xs p-2 rounded-lg ${
                c.type === 'change_request'
                  ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                  : 'bg-[var(--color-dark-700)] text-zinc-400'
              }`}
            >
              {c.comment}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {!isApproved && !isChangesRequested && (
        <>
          <div className="mb-3">
            <textarea
              className="input-field text-sm"
              rows={2}
              placeholder="Observação (opcional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {comment.trim() && (
              <button onClick={handleSaveComment} disabled={saving} className="btn btn-secondary btn-sm mt-2 w-full">
                Salvar observação
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={saving}
              className="btn btn-success flex-1"
            >
              ✓ Aprovar
            </button>
            <button
              onClick={() => setShowChangeRequest(true)}
              disabled={saving}
              className="btn btn-danger flex-1"
            >
              ↩ Solicitar alteração
            </button>
          </div>
        </>
      )}

      {/* Change request form */}
      {showChangeRequest && (
        <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
          <p className="text-xs text-red-400 mb-2 font-medium">Explique o que precisa ser alterado:</p>
          <textarea
            className="input-field text-sm"
            rows={3}
            placeholder="Descreva a alteração necessária..."
            value={changeComment}
            onChange={(e) => setChangeComment(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowChangeRequest(false)} className="btn btn-secondary btn-sm flex-1">
              Cancelar
            </button>
            <button
              onClick={handleRequestChange}
              disabled={saving || !changeComment.trim()}
              className="btn btn-danger btn-sm flex-1"
            >
              Enviar solicitação
            </button>
          </div>
        </div>
      )}

      {/* Already handled states */}
      {slide.status === 'awaiting_approval' && (
        <>
          <div className="mb-3">
            <textarea
              className="input-field text-sm"
              rows={2}
              placeholder="Observação (opcional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleApprove} disabled={saving} className="btn btn-success flex-1">
              ✓ Aprovar nova versão
            </button>
            <button onClick={() => setShowChangeRequest(true)} disabled={saving} className="btn btn-danger flex-1">
              ↩ Solicitar nova alteração
            </button>
          </div>
        </>
      )}
    </div>
  );
}


// ============================
// MAIN REVIEW PAGE
// ============================
export default function ReviewPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [projectData, setProjectData] = useState<any>(null);
  const [contentItems, setContentItems] = useState<ContentItemWithSlides[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFinalApproval, setShowFinalApproval] = useState(false);
  const [finalApprovalDone, setFinalApprovalDone] = useState(false);
  const [activeCarouselSlides, setActiveCarouselSlides] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    // Get project by token
    const { data: projects } = await supabase
      .from('projects')
      .select('*, client:clients(name, company_name)')
      .eq('public_token', token);

    if (!projects || projects.length === 0) {
      setError('Projeto não encontrado.');
      setLoading(false);
      return;
    }

    const project = projects[0];
    setProjectData(project);

    if (project.status === 'approved' && project.final_approved_at) {
      setFinalApprovalDone(true);
    }

    // Load content items
    const { data: items } = await supabase
      .from('content_items')
      .select(`
        *,
        content_slides(
          *,
          versions:content_versions!content_versions_slide_id_fkey(*),
          comments(*)
        )
      `)
      .eq('project_id', project.id)
      .order('sort_order', { ascending: true });

    if (items) {
      const sorted = items.map(item => ({
        ...item,
        content_slides: (item.content_slides || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((slide: any) => ({
            ...slide,
            active_version: slide.active_version_id
              ? (slide.versions || []).find((v: any) => v.id === slide.active_version_id) || null
              : null,
            comments: (slide.comments || []).sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
          })),
      }));
      setContentItems(sorted as ContentItemWithSlides[]);
    }

    setLoading(false);
  };

  const handleFinalApproval = async () => {
    await supabase
      .from('projects')
      .update({
        status: 'approved',
        final_approved_at: new Date().toISOString(),
      })
      .eq('id', projectData.id);

    setShowFinalApproval(false);
    setFinalApprovalDone(true);
    loadData();
  };

  // ============================
  // RENDER
  // ============================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-medium text-white mb-2">Link inválido</h1>
          <p className="text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  const stats = calculateProjectStats(contentItems);
  const allApproved = stats.total_slides > 0 && stats.approved === stats.total_slides;

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-glass-border)] bg-[var(--color-dark-900)]/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">{projectData.name}</h1>
              <p className="text-xs text-zinc-500">{projectData.client?.company_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">
                {stats.approved}/{stats.total_slides}
              </p>
              <p className="text-[10px] text-zinc-600">aprovado{stats.approved !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-bar mt-3">
            <div
              className="progress-fill"
              style={{
                width: `${stats.total_slides > 0 ? (stats.approved / stats.total_slides) * 100 : 0}%`,
                background: allApproved ? '#10b981' : undefined,
              }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-10">
        {contentItems.map((item) => (
          <section key={item.id} id={`content-${item.id}`}>
            {/* Content Title */}
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-medium text-white">{item.title}</h2>
              <span className="text-xs text-zinc-600">{getContentTypeLabel(item.type)}</span>
            </div>

            {/* CAROUSEL */}
            {item.type === 'carousel' && item.content_slides.length > 0 && (
              <div>
                <CarouselSwiper
                  slides={item.content_slides as ContentSlideWithVersions[]}
                  onSlideChange={(idx) =>
                    setActiveCarouselSlides(prev => ({ ...prev, [item.id]: idx }))
                  }
                />

                {/* Single approval card - synced with current slide */}
                <div className="mt-4">
                  {(() => {
                    const currentIdx = activeCarouselSlides[item.id] ?? 0;
                    const currentSlide = item.content_slides[currentIdx];
                    if (!currentSlide) return null;
                    return (
                      <SlideApprovalCard
                        key={`${currentSlide.id}-${currentIdx}`}
                        slide={currentSlide as ContentSlideWithVersions}
                        index={currentIdx}
                        totalSlides={item.content_slides.length}
                        projectId={projectData.id}
                        contentItemId={item.id}
                        onUpdate={loadData}
                      />
                    );
                  })()}
                </div>

                {/* Carousel status summary */}
                <div className="mt-3 p-3 glass-card text-center">
                  <p className="text-sm text-zinc-400">
                    {item.content_slides.filter(s => s.status === 'approved').length} de{' '}
                    {item.content_slides.length} imagens aprovadas
                  </p>
                </div>
              </div>
            )}

            {/* SINGLE IMAGE */}
            {item.type === 'single_image' && item.content_slides[0] && (
              <div>
                <div className="rounded-2xl overflow-hidden bg-[#111118] mb-4">
                  {item.content_slides[0].active_version && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getSupabaseFileUrl((item.content_slides[0] as any).active_version?.file_path)}
                      alt={item.title}
                      className="w-full object-contain max-h-[70vh]"
                      loading="lazy"
                    />
                  )}
                </div>
                <SlideApprovalCard
                  slide={item.content_slides[0] as ContentSlideWithVersions}
                  index={0}
                  projectId={projectData.id}
                  contentItemId={item.id}
                  onUpdate={loadData}
                />
              </div>
            )}

            {/* VIDEO */}
            {item.type === 'video' && item.content_slides[0] && (
              <div>
                <div className="rounded-2xl overflow-hidden bg-[#111118] mb-4">
                  {(item.content_slides[0] as any).active_version && (
                    <video
                      src={getSupabaseFileUrl((item.content_slides[0] as any).active_version?.file_path)}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-[70vh]"
                    />
                  )}
                </div>
                <SlideApprovalCard
                  slide={item.content_slides[0] as ContentSlideWithVersions}
                  index={0}
                  projectId={projectData.id}
                  contentItemId={item.id}
                  onUpdate={loadData}
                />
              </div>
            )}

            {/* General comment */}
            {item.general_comment && (
              <div className="mt-3 p-3 bg-[var(--color-dark-700)] rounded-xl">
                <p className="text-xs text-zinc-500 mb-1">Observação geral:</p>
                <p className="text-sm text-zinc-300">{item.general_comment}</p>
              </div>
            )}
          </section>
        ))}

        {/* ========================= */}
        {/* FINAL SUMMARY             */}
        {/* ========================= */}
        <section className="glass-card p-6">
          <h2 className="text-lg font-medium text-white mb-4 text-center">Resumo da revisão</h2>

          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Total de conteúdos</span>
              <span className="text-white font-medium">{stats.total_slides}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-400">✓ Aprovados</span>
              <span className="text-emerald-400 font-medium">{stats.approved}</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-400">○ Pendentes</span>
                <span className="text-yellow-400 font-medium">{stats.pending}</span>
              </div>
            )}
            {stats.changes_requested > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">✕ Alterações solicitadas</span>
                <span className="text-red-400 font-medium">{stats.changes_requested}</span>
              </div>
            )}
            {stats.awaiting_approval > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-400">◐ Aguardando nova aprovação</span>
                <span className="text-amber-400 font-medium">{stats.awaiting_approval}</span>
              </div>
            )}
          </div>

          <div className="progress-bar mb-4">
            <div
              className="progress-fill"
              style={{
                width: `${stats.total_slides > 0 ? (stats.approved / stats.total_slides) * 100 : 0}%`,
                background: allApproved ? '#10b981' : undefined,
              }}
            />
          </div>

          {finalApprovalDone ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-emerald-400 font-medium">Todos os conteúdos foram aprovados!</p>
              <p className="text-xs text-zinc-500 mt-1">Aprovação final enviada.</p>
            </div>
          ) : allApproved ? (
            <div className="text-center">
              <p className="text-emerald-400 mb-4">✓ Todos os conteúdos foram aprovados.</p>
              <button
                onClick={() => setShowFinalApproval(true)}
                className="btn btn-success w-full text-lg py-4"
              >
                Enviar aprovação final
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-amber-400 text-sm">
                Existem conteúdos que precisam de revisão.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Final Approval Confirmation Modal */}
      {showFinalApproval && (
        <div className="modal-overlay">
          <div className="modal-content p-6 mx-4">
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">✅</div>
              <h2 className="text-lg font-medium text-white mb-2">Confirmar aprovação</h2>
              <p className="text-sm text-zinc-400">
                Você confirma que todos os conteúdos foram revisados e aprovados?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalApproval(false)}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalApproval}
                className="btn btn-success flex-1"
              >
                Confirmar aprovação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
