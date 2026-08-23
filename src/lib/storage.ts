/** Resolve a stored path like "products/juice-orange.png" (or a full URL) to a public URL. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const [bucket, ...rest] = path.split('/');
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${rest.join('/')}`;
}
