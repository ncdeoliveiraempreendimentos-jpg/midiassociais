'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Project, Client, ContentItem, ContentSlide, ContentVersion, Comment,
  ContentType, SlideStatus, ContentItemWithSlides, ContentSlideWithVersions
} from '@/lib/types';
import {
  formatDate, formatDateTime, getProjectStatusLabel, getStatusBgColor,
  getStatusIcon, getStatusLabel, getContentTypeLabel, getContentTypeIcon,
  calculateProjectStats, getSupabaseFileUrl
} from '@/lib/utils';
import Link from 'next/link';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================
// Sortable Item Component
// ============================
function SortableContentItem({
  item,
  onDelete,
  onEdit,
  onOpen,
  unreadCount,
}: {
  item: ContentItemWithSlides;
  onDelete: () => void;
  onEdit: () => void;
  onOpen: () => void;
  unreadCount: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const slides = item.content_slides || [];
  const approved = slides.filter(s => s.status === 'approved').length;
  const total = slides.length;

  return (
    <div ref={setNodeRef} style={style} className="glass-card p-4 card-hover">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="drag-handle shrink-0 touch-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>

        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getContentTypeIcon(item.type)}</span>
            <h4 className="text-white font-medium truncate">{item.title}</h4>
            {unreadCount > 0 && (
              <span className="notification-dot shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>{getContentTypeLabel(item.type)}</span>
            {total > 0 && <span>{approved}/{total} aprovado{approved !== 1 ? 's' : ''}</span>}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="btn btn-secondary btn-icon" title="Editar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button onClick={onDelete} className="btn btn-danger btn-icon" title="Excluir">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================
// Sortable Slide Thumbnail
// ============================
function SortableSlideThumbnail({
  slide,
  index,
  onClick,
  onReplace,
  onDelete,
}: {
  slide: ContentSlideWithVersions;
  index: number;
  onClick: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fileUrl = slide.active_version
    ? getSupabaseFileUrl(slide.active_version.file_path)
    : '';
  const isVideo = slide.active_version?.file_type?.startsWith('video/');

  return (
    <div ref={setNodeRef} style={style} className="shrink-0 w-[140px] group relative">
      <div
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing"
      >
        <div className="aspect-square rounded-xl overflow-hidden border border-[var(--color-glass-border)] bg-[var(--color-dark-700)] relative">
          {fileUrl && !isVideo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          )}
          {fileUrl && isVideo && (
            <video src={fileUrl} className="w-full h-full object-cover" muted playsInline />
          )}
          {/* Status badge */}
          <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            slide.status === 'approved' ? 'bg-emerald-500 text-white' :
            slide.status === 'changes_requested' ? 'bg-red-500 text-white' :
            slide.status === 'awaiting_approval' ? 'bg-amber-500 text-white' :
            'bg-zinc-600 text-zinc-300'
          }`}>
            {getStatusIcon(slide.status)}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">#{index + 1}</span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onClick} className="p-1 text-zinc-500 hover:text-white" title="Ver">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" /><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            </svg>
          </button>
          <button onClick={onReplace} className="p-1 text-zinc-500 hover:text-amber-400" title="Substituir">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-1 text-zinc-500 hover:text-red-400" title="Excluir">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================
// MAIN PROJECT PAGE
// ============================
export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [contentItems, setContentItems] = useState<ContentItemWithSlides[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modal states
  const [showAddContent, setShowAddContent] = useState(false);
  const [showEditContent, setShowEditContent] = useState<ContentItemWithSlides | null>(null);
  const [showSlideDetail, setShowSlideDetail] = useState<{item: ContentItemWithSlides, slide: ContentSlideWithVersions} | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState<ContentSlideWithVersions | null>(null);
  const [editContentTitle, setEditContentTitle] = useState('');

  // Filter
  const [filter, setFilter] = useState<'all' | SlideStatus>('all');

  // Link copied
  const [linkCopied, setLinkCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    // Load project
    const { data: projectData } = await supabase
      .from('projects')
      .select('*, client:clients(*)')
      .eq('id', projectId)
      .single();

    if (projectData) {
      setProject(projectData);
      setClient(projectData.client);
    }

    // Load content items with slides and versions
    const { data: itemsData, error: itemsError } = await supabase
      .from('content_items')
      .select(`
        *,
        content_slides(
          *,
          versions:content_versions!content_versions_slide_id_fkey(*)
        )
      `)
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('Error loading items:', itemsError);
    }

    if (itemsData) {
      // Sort slides and resolve active_version from versions array
      const sorted = itemsData.map(item => ({
        ...item,
        content_slides: (item.content_slides || [])
          .sort((a: ContentSlide, b: ContentSlide) => a.sort_order - b.sort_order)
          .map((slide: any) => ({
            ...slide,
            active_version: slide.active_version_id
              ? (slide.versions || []).find((v: any) => v.id === slide.active_version_id) || null
              : null,
          })),
      }));
      setContentItems(sorted as ContentItemWithSlides[]);
    }

    // Load comments
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (commentsData) setComments(commentsData);

    // Mark comments as read
    await supabase
      .from('comments')
      .update({ is_read: true })
      .eq('project_id', projectId)
      .eq('is_read', false);

    setLoading(false);
  };

  // ============================
  // ADD CONTENT
  // ============================
  const handleAddContent = async (type: ContentType) => {
    setShowAddContent(false);
    const title = type === 'carousel' ? `Carrossel ${contentItems.filter(i => i.type === 'carousel').length + 1}` :
                  type === 'video' ? `Vídeo ${contentItems.filter(i => i.type === 'video').length + 1}` :
                  `Criativo ${contentItems.filter(i => i.type === 'single_image').length + 1}`;

    const { data } = await supabase
      .from('content_items')
      .insert({
        project_id: projectId,
        title,
        type,
        sort_order: contentItems.length,
      })
      .select()
      .single();

    if (data) {
      // If single image or video, trigger file input immediately
      const newItem: ContentItemWithSlides = { ...data, content_slides: [] };
      setContentItems(prev => [...prev, newItem]);

      // Auto open file picker for single items
      if (type === 'single_image' || type === 'video') {
        setTimeout(() => triggerFileUpload(data.id, type), 100);
      } else {
        setTimeout(() => triggerFileUpload(data.id, type), 100);
      }
    }
  };

  // ============================
  // FILE UPLOAD
  // ============================
  const triggerFileUpload = (contentItemId: string, type: ContentType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = type === 'carousel';
    input.accept = type === 'video' ? 'video/*' : 'image/*';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      await uploadFiles(contentItemId, Array.from(files));
    };
    input.click();
  };

  const uploadFiles = async (contentItemId: string, files: File[]) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const item = contentItems.find(i => i.id === contentItemId);
      const currentSlideCount = item?.content_slides?.length || 0;
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const filePath = `projects/${projectId}/${contentItemId}/slide-${currentSlideCount + i}/v1.${ext}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setUploadError(`Erro ao enviar "${file.name}": ${uploadError.message}`);
          continue;
        }

        // Create slide
        const { data: slideData, error: slideError } = await supabase
          .from('content_slides')
          .insert({
            content_item_id: contentItemId,
            sort_order: currentSlideCount + i,
            status: 'pending',
          })
          .select()
          .single();

        if (slideError) {
          console.error('Slide error:', slideError);
          setUploadError(`Erro ao criar slide: ${slideError.message}`);
          continue;
        }

        if (slideData) {
          // Create version
          const { data: versionData, error: versionError } = await supabase
            .from('content_versions')
            .insert({
              slide_id: slideData.id,
              file_path: filePath,
              file_name: file.name,
              file_type: file.type,
              version_number: 1,
            })
            .select()
            .single();

          if (versionError) {
            console.error('Version error:', versionError);
            setUploadError(`Erro ao criar versão: ${versionError.message}`);
            continue;
          }

          if (versionData) {
            // Update slide with active version
            await supabase
              .from('content_slides')
              .update({ active_version_id: versionData.id })
              .eq('id', slideData.id);
          }
          successCount++;
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      if (successCount === 0 && files.length > 0) {
        setUploadError('Nenhum arquivo foi enviado com sucesso. Verifique o console do navegador para detalhes.');
      }
    } catch (err: any) {
      console.error('Upload exception:', err);
      setUploadError(`Erro inesperado: ${err.message}`);
    }

    setUploading(false);
    setUploadProgress(0);

    // Update project status if draft
    if (project?.status === 'draft') {
      await supabase
        .from('projects')
        .update({ status: 'in_review' })
        .eq('id', projectId);
    }

    loadProject();
  };

  // ============================
  // REPLACE FILE
  // ============================
  const handleReplaceFile = (slideId: string, contentItemId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);

      // Get current version number
      const { data: versions } = await supabase
        .from('content_versions')
        .select('version_number')
        .eq('slide_id', slideId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_number || 0) + 1;
      const ext = file.name.split('.').pop();
      const filePath = `projects/${projectId}/${contentItemId}/${slideId}/v${nextVersion}.${ext}`;

      // Upload
      await supabase.storage
        .from('project-files')
        .upload(filePath, file, { upsert: true });

      // Create new version
      const { data: versionData } = await supabase
        .from('content_versions')
        .insert({
          slide_id: slideId,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          version_number: nextVersion,
        })
        .select()
        .single();

      if (versionData) {
        // Update slide
        await supabase
          .from('content_slides')
          .update({
            active_version_id: versionData.id,
            status: 'awaiting_approval',
          })
          .eq('id', slideId);
      }

      setUploading(false);
      loadProject();
    };
    input.click();
  };

  // ============================
  // DRAG AND DROP - CONTENT ITEMS
  // ============================
  const handleDragEndItems = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = contentItems.findIndex(i => i.id === active.id);
    const newIndex = contentItems.findIndex(i => i.id === over.id);

    const newItems = arrayMove(contentItems, oldIndex, newIndex);
    setContentItems(newItems);

    // Update sort orders
    for (let i = 0; i < newItems.length; i++) {
      await supabase
        .from('content_items')
        .update({ sort_order: i })
        .eq('id', newItems[i].id);
    }
  };

  // ============================
  // DRAG AND DROP - SLIDES
  // ============================
  const handleDragEndSlides = async (event: DragEndEvent, itemId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const item = contentItems.find(i => i.id === itemId);
    if (!item) return;

    const slides = item.content_slides || [];
    const oldIndex = slides.findIndex(s => s.id === active.id);
    const newIndex = slides.findIndex(s => s.id === over.id);

    const newSlides = arrayMove(slides, oldIndex, newIndex);
    setContentItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, content_slides: newSlides } : i)
    );

    for (let i = 0; i < newSlides.length; i++) {
      await supabase
        .from('content_slides')
        .update({ sort_order: i })
        .eq('id', newSlides[i].id);
    }
  };

  // ============================
  // DELETE
  // ============================
  const handleDeleteContent = async (itemId: string) => {
    if (!confirm('Excluir este conteúdo e todas as imagens?')) return;
    await supabase.from('content_items').delete().eq('id', itemId);
    loadProject();
  };

  const handleDeleteSlide = async (slideId: string) => {
    if (!confirm('Excluir este slide?')) return;
    await supabase.from('content_slides').delete().eq('id', slideId);
    loadProject();
  };

  // ============================
  // EDIT CONTENT TITLE
  // ============================
  const handleEditTitle = async () => {
    if (!showEditContent) return;
    await supabase
      .from('content_items')
      .update({ title: editContentTitle })
      .eq('id', showEditContent.id);
    setShowEditContent(null);
    loadProject();
  };

  // ============================
  // COPY LINK
  // ============================
  const copyLink = () => {
    const url = `${window.location.origin}/review/${project?.public_token}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ============================
  // REOPEN PROJECT
  // ============================
  const handleReopenProject = async () => {
    if (!confirm('Reabrir este projeto? Os conteúdos poderão ser alterados novamente.')) return;
    await supabase
      .from('projects')
      .update({ status: 'in_review', final_approved_at: null })
      .eq('id', projectId);
    loadProject();
  };

  // ============================
  // RENDER
  // ============================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project || !client) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Projeto não encontrado.</p>
      </div>
    );
  }

  const stats = calculateProjectStats(contentItems);

  // Filter items
  const filteredItems = filter === 'all'
    ? contentItems
    : contentItems.map(item => ({
        ...item,
        content_slides: item.content_slides.filter(s => s.status === filter),
      })).filter(item => item.content_slides.length > 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6 flex-wrap">
        <Link href="/admin/clients" className="hover:text-white transition-colors">Clientes</Link>
        <span>/</span>
        <Link href={`/admin/clients/${client.id}`} className="hover:text-white transition-colors">
          {client.company_name}
        </Link>
        <span>/</span>
        <span className="text-white">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl md:text-2xl font-semibold text-white">{project.name}</h1>
              <span className={`badge ${getStatusBgColor(project.status as any)}`}>
                {getProjectStatusLabel(project.status)}
              </span>
            </div>
            {project.reference && <p className="text-sm text-zinc-500">{project.reference}</p>}
            {project.description && <p className="text-sm text-zinc-400 mt-1">{project.description}</p>}
            {project.final_approved_at && (
              <p className="text-xs text-emerald-400 mt-2">
                ✓ Aprovado pelo cliente em {formatDateTime(project.final_approved_at)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {/* Link */}
            <div className="flex items-center gap-2">
              <code className="text-xs text-zinc-500 bg-[var(--color-dark-700)] px-3 py-2 rounded-lg truncate max-w-[200px]">
                /review/{project.public_token?.slice(0, 12)}...
              </code>
              <button onClick={copyLink} className="btn btn-primary btn-sm">
                {linkCopied ? '✓ Copiado!' : 'Copiar link'}
              </button>
            </div>

            {project.status === 'approved' && (
              <button onClick={handleReopenProject} className="btn btn-warning btn-sm">
                Reabrir projeto
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats.total_slides > 0 && (
          <div className="mt-5 pt-5 border-t border-[var(--color-glass-border)]">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <span className="text-zinc-400">{stats.total_slides} conteúdo{stats.total_slides !== 1 ? 's' : ''}</span>
              <span className="text-emerald-400">✓ {stats.approved} aprovado{stats.approved !== 1 ? 's' : ''}</span>
              <span className="text-yellow-400">○ {stats.pending} pendente{stats.pending !== 1 ? 's' : ''}</span>
              {stats.changes_requested > 0 && (
                <span className="text-red-400">✕ {stats.changes_requested} alteraç{stats.changes_requested !== 1 ? 'ões' : 'ão'}</span>
              )}
              {stats.awaiting_approval > 0 && (
                <span className="text-amber-400">◐ {stats.awaiting_approval} aguardando</span>
              )}
            </div>
            <div className="progress-bar mt-3">
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
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
            <span className="text-sm text-zinc-400">Enviando arquivos...</span>
          </div>
          <div className="progress-bar mt-3">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-400">⚠️ {uploadError}</p>
            <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
          </div>
        </div>
      )}

      {/* Filters + Add button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'changes_requested', 'awaiting_approval'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f === 'all' ? 'Todos' :
               f === 'pending' ? '○ Pendentes' :
               f === 'approved' ? '✓ Aprovados' :
               f === 'changes_requested' ? '✕ Alterações' :
               '◐ Aguardando'}
            </button>
          ))}
        </div>

        <button onClick={() => setShowAddContent(true)} className="btn btn-primary">
          + Adicionar conteúdo
        </button>
      </div>

      {/* Content Items */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndItems}>
        <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id}>
                <SortableContentItem
                  item={item}
                  onDelete={() => handleDeleteContent(item.id)}
                  onEdit={() => { setShowEditContent(item); setEditContentTitle(item.title); }}
                  onOpen={() => {}}
                  unreadCount={comments.filter(c => c.content_item_id === item.id && !c.is_read).length}
                />

                {/* Slides thumbnails */}
                {item.content_slides && item.content_slides.length > 0 && (
                  <div className="ml-8 mt-2 mb-4">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEndSlides(e, item.id)}
                    >
                      <SortableContext items={item.content_slides.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {item.content_slides.map((slide, idx) => (
                            <SortableSlideThumbnail
                              key={slide.id}
                              slide={slide as ContentSlideWithVersions}
                              index={idx}
                              onClick={() => setShowSlideDetail({ item, slide: slide as ContentSlideWithVersions })}
                              onReplace={() => handleReplaceFile(slide.id, item.id)}
                              onDelete={() => handleDeleteSlide(slide.id)}
                            />
                          ))}

                          {/* Add more slides button */}
                          {item.type === 'carousel' && (
                            <div
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const files = Array.from(e.dataTransfer.files);
                                if (files.length > 0) {
                                  await uploadFiles(item.id, files);
                                }
                              }}
                              onClick={() => triggerFileUpload(item.id, 'carousel')}
                              className="shrink-0 w-[140px] aspect-square rounded-xl border-2 border-dashed border-[var(--color-glass-border)] flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                              <span className="text-[10px]">Adicionar</span>
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {/* Comments for this content */}
                    {comments.filter(c => c.content_item_id === item.id).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {comments
                          .filter(c => c.content_item_id === item.id)
                          .slice(0, 3)
                          .map(comment => (
                            <div key={comment.id} className="flex items-start gap-2 text-xs">
                              <span className={comment.type === 'change_request' ? 'text-red-400' : 'text-zinc-500'}>
                                {comment.type === 'change_request' ? '✕' : '💬'}
                              </span>
                              <div>
                                <p className="text-zinc-400">{comment.comment}</p>
                                <span className="text-zinc-600">{formatDateTime(comment.created_at)}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state for items without slides */}
                {(!item.content_slides || item.content_slides.length === 0) && (
                  <div className="ml-8 mt-2 mb-4">
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          await uploadFiles(item.id, files);
                        }
                      }}
                      onClick={() => triggerFileUpload(item.id, item.type)}
                      className="upload-zone w-full max-w-xs cursor-pointer"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-zinc-500">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                      <p className="text-xs text-zinc-500">
                        Clique ou arraste {item.type === 'video' ? 'um vídeo' : 'imagens'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {contentItems.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4">📎</div>
          <h2 className="text-lg font-medium text-white mb-2">Nenhum conteúdo</h2>
          <p className="text-zinc-500 mb-6">Adicione carrosséis, imagens ou vídeos para este projeto.</p>
          <button onClick={() => setShowAddContent(true)} className="btn btn-primary">
            + Adicionar conteúdo
          </button>
        </div>
      )}

      {/* ========================= */}
      {/* MODALS                    */}
      {/* ========================= */}

      {/* Add Content Modal */}
      {showAddContent && (
        <div className="modal-overlay" onClick={() => setShowAddContent(false)}>
          <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium text-white mb-6">Adicionar Conteúdo</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleAddContent('carousel')}
                className="w-full glass-card p-4 text-left card-hover flex items-center gap-4"
              >
                <span className="text-2xl">📸</span>
                <div>
                  <p className="text-white font-medium">Carrossel</p>
                  <p className="text-xs text-zinc-500">Múltiplas imagens</p>
                </div>
              </button>
              <button
                onClick={() => handleAddContent('single_image')}
                className="w-full glass-card p-4 text-left card-hover flex items-center gap-4"
              >
                <span className="text-2xl">🖼️</span>
                <div>
                  <p className="text-white font-medium">Imagem Única</p>
                  <p className="text-xs text-zinc-500">Um criativo</p>
                </div>
              </button>
              <button
                onClick={() => handleAddContent('video')}
                className="w-full glass-card p-4 text-left card-hover flex items-center gap-4"
              >
                <span className="text-2xl">🎬</span>
                <div>
                  <p className="text-white font-medium">Vídeo</p>
                  <p className="text-xs text-zinc-500">Arquivo de vídeo</p>
                </div>
              </button>
            </div>
            <button onClick={() => setShowAddContent(false)} className="btn btn-secondary w-full mt-4">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Edit Content Title Modal */}
      {showEditContent && (
        <div className="modal-overlay" onClick={() => setShowEditContent(null)}>
          <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium text-white mb-6">Editar Conteúdo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Título</label>
                <input
                  className="input-field"
                  value={editContentTitle}
                  onChange={(e) => setEditContentTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowEditContent(null)} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button onClick={handleEditTitle} className="btn btn-primary flex-1">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide Detail Modal */}
      {showSlideDetail && (
        <div className="modal-overlay" onClick={() => setShowSlideDetail(null)}>
          <div
            className="modal-content p-0 max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="bg-[var(--color-dark-700)] rounded-t-[20px] overflow-hidden">
              {showSlideDetail.slide.active_version?.file_type?.startsWith('video/') ? (
                <video
                  src={getSupabaseFileUrl(showSlideDetail.slide.active_version.file_path)}
                  controls
                  className="w-full max-h-[60vh] object-contain"
                />
              ) : showSlideDetail.slide.active_version ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getSupabaseFileUrl(showSlideDetail.slide.active_version.file_path)}
                  alt=""
                  className="w-full max-h-[60vh] object-contain"
                />
              ) : null}
            </div>

            <div className="p-5">
              {/* Status */}
              <div className="flex items-center justify-between mb-4">
                <span className={`badge ${getStatusBgColor(showSlideDetail.slide.status)}`}>
                  {getStatusIcon(showSlideDetail.slide.status)} {getStatusLabel(showSlideDetail.slide.status)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowVersionHistory(showSlideDetail.slide);
                      setShowSlideDetail(null);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Histórico ({showSlideDetail.slide.versions?.length || 0})
                  </button>
                  <button
                    onClick={() => {
                      handleReplaceFile(showSlideDetail.slide.id, showSlideDetail.item.id);
                      setShowSlideDetail(null);
                    }}
                    className="btn btn-warning btn-sm"
                  >
                    Substituir
                  </button>
                </div>
              </div>

              {/* Comments */}
              {comments.filter(c => c.slide_id === showSlideDetail.slide.id).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-zinc-400">Observações</h4>
                  {comments
                    .filter(c => c.slide_id === showSlideDetail.slide.id)
                    .map(comment => (
                      <div key={comment.id} className="bg-[var(--color-dark-700)] rounded-lg p-3">
                        <p className="text-sm text-zinc-300">{comment.comment}</p>
                        <span className="text-xs text-zinc-600 mt-1 block">{formatDateTime(comment.created_at)}</span>
                      </div>
                    ))}
                </div>
              )}

              <button onClick={() => setShowSlideDetail(null)} className="btn btn-secondary w-full mt-4">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="modal-overlay" onClick={() => setShowVersionHistory(null)}>
          <div className="modal-content p-6 max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium text-white mb-6">Histórico de Versões</h2>
            <div className="space-y-3">
              {(showVersionHistory.versions || [])
                .sort((a, b) => b.version_number - a.version_number)
                .map(version => (
                  <div key={version.id} className="glass-card p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-dark-700)] shrink-0">
                        {version.file_type?.startsWith('video/') ? (
                          <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getSupabaseFileUrl(version.file_path)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">Versão {version.version_number}</p>
                        <p className="text-xs text-zinc-500">{version.file_name}</p>
                        <p className="text-xs text-zinc-600">{formatDateTime(version.created_at)}</p>
                      </div>
                      {version.id === showVersionHistory.active_version_id && (
                        <span className="badge bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                          Ativa
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            <button onClick={() => setShowVersionHistory(null)} className="btn btn-secondary w-full mt-4">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
