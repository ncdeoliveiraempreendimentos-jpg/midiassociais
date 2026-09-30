// Force all admin routes to be dynamic (never statically prerendered)
export const dynamic = 'force-dynamic';

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return children;
}
