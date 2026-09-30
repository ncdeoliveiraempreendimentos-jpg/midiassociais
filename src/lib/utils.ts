import { SlideStatus, ProjectStats, ContentItemWithSlides } from './types';

export function getStatusColor(status: SlideStatus): string {
  switch (status) {
    case 'approved':
      return 'text-emerald-400';
    case 'changes_requested':
      return 'text-red-400';
    case 'awaiting_approval':
      return 'text-amber-400';
    case 'pending':
    default:
      return 'text-yellow-400';
  }
}

export function getStatusBgColor(status: SlideStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    case 'changes_requested':
      return 'bg-red-500/10 border-red-500/30 text-red-400';
    case 'awaiting_approval':
      return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    case 'pending':
    default:
      return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
  }
}

export function getStatusIcon(status: SlideStatus): string {
  switch (status) {
    case 'approved':
      return '✓';
    case 'changes_requested':
      return '✕';
    case 'awaiting_approval':
      return '◐';
    case 'pending':
    default:
      return '○';
  }
}

export function getStatusLabel(status: SlideStatus): string {
  switch (status) {
    case 'approved':
      return 'Aprovado';
    case 'changes_requested':
      return 'Alteração solicitada';
    case 'awaiting_approval':
      return 'Aguardando aprovação';
    case 'pending':
    default:
      return 'Pendente';
  }
}

export function getProjectStatusLabel(status: string): string {
  switch (status) {
    case 'approved':
      return 'Aprovado';
    case 'in_review':
      return 'Em revisão';
    case 'changes_requested':
      return 'Alterações solicitadas';
    case 'draft':
    default:
      return 'Rascunho';
  }
}

export function calculateProjectStats(items: ContentItemWithSlides[]): ProjectStats {
  let total_slides = 0;
  let approved = 0;
  let pending = 0;
  let changes_requested = 0;
  let awaiting_approval = 0;

  items.forEach(item => {
    item.content_slides?.forEach(slide => {
      total_slides++;
      switch (slide.status) {
        case 'approved':
          approved++;
          break;
        case 'changes_requested':
          changes_requested++;
          break;
        case 'awaiting_approval':
          awaiting_approval++;
          break;
        default:
          pending++;
      }
    });
  });

  return {
    total_items: items.length,
    total_slides,
    approved,
    pending,
    changes_requested,
    awaiting_approval,
  };
}

export function getContentTypeLabel(type: string): string {
  switch (type) {
    case 'carousel':
      return 'Carrossel';
    case 'single_image':
      return 'Imagem Única';
    case 'video':
      return 'Vídeo';
    default:
      return type;
  }
}

export function getContentTypeIcon(type: string): string {
  switch (type) {
    case 'carousel':
      return '📸';
    case 'single_image':
      return '🖼️';
    case 'video':
      return '🎬';
    default:
      return '📄';
  }
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSupabaseFileUrl(filePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-files/${filePath}`;
}
