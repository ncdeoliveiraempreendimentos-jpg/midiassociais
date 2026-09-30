// Database types for ReviewFlow

export type ContentType = 'carousel' | 'single_image' | 'video';
export type SlideStatus = 'pending' | 'approved' | 'changes_requested' | 'awaiting_approval';
export type ProjectStatus = 'draft' | 'in_review' | 'approved' | 'changes_requested';
export type CommentType = 'observation' | 'change_request' | 'general';

export interface Client {
  id: string;
  name: string;
  company_name: string;
  notes: string | null;
  admin_id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  reference: string | null;
  description: string | null;
  status: ProjectStatus;
  public_token: string;
  final_approved_at: string | null;
  admin_id: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  content_items?: ContentItem[];
}

export interface ContentItem {
  id: string;
  project_id: string;
  title: string;
  type: ContentType;
  sort_order: number;
  general_comment: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  content_slides?: ContentSlide[];
}

export interface ContentSlide {
  id: string;
  content_item_id: string;
  sort_order: number;
  active_version_id: string | null;
  status: SlideStatus;
  created_at: string;
  updated_at: string;
  // Joined
  active_version?: ContentVersion | null;
  versions?: ContentVersion[];
  comments?: Comment[];
}

export interface ContentVersion {
  id: string;
  slide_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  version_number: number;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  content_item_id: string | null;
  slide_id: string | null;
  version_id: string | null;
  comment: string;
  type: CommentType;
  is_read: boolean;
  created_at: string;
}

// Helper types for API responses
export type ProjectWithDetails = Omit<Project, 'content_items'> & {
  client: Client;
  content_items: ContentItemWithSlides[];
  unread_comments_count?: number;
};

export type ContentItemWithSlides = Omit<ContentItem, 'content_slides'> & {
  content_slides: ContentSlideWithVersions[];
};

export type ContentSlideWithVersions = Omit<ContentSlide, 'active_version' | 'versions' | 'comments'> & {
  active_version: ContentVersion | null;
  versions: ContentVersion[];
  comments: Comment[];
};

// Stats
export interface ProjectStats {
  total_items: number;
  total_slides: number;
  approved: number;
  pending: number;
  changes_requested: number;
  awaiting_approval: number;
}
