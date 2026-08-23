'use client';
import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { mediaUrl } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface Props {
  bucket: string;
  value: string | null | undefined;        // stored path "bucket/file" or URL
  onChange: (path: string | null) => void;
  accept?: string;                          // default images
  aspect?: string;                          // tailwind aspect class
  label?: string;
}

/** Uploads directly to Supabase Storage (RLS: staff editor+) and returns "bucket/filename". */
export function ImageUpload({ bucket, value, onChange, accept = 'image/*', aspect = 'aspect-video', label = 'Ανέβασε εικόνα' }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const isImage = accept.startsWith('image');

  async function upload(file: File) {
    setBusy(true);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await createClient().storage.from(bucket).upload(name, file, { upsert: false, contentType: file.type });
    setBusy(false);
    if (error) return toast.error('Αποτυχία ανεβάσματος: ' + error.message);
    onChange(`${bucket}/${name}`);
  }

  return (
    <div>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      {value ? (
        <div className={cn('relative rounded-lg overflow-hidden border bg-muted', isImage && aspect, !isImage && 'p-3')}>
          {isImage
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={mediaUrl(value)} alt="" className="h-full w-full object-contain" />
            : <p className="text-sm truncate">{value.split('/').pop()}</p>}
          <div className="absolute top-2 right-2 flex gap-1">
            <button type="button" onClick={() => input.current?.click()} className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium shadow">Αλλαγή</button>
            <button type="button" onClick={() => onChange(null)} className="rounded-md bg-white/90 p-1 shadow"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => input.current?.click()}
          className={cn('w-full rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-[#E60C10] hover:text-[#E60C10] transition-colors grid place-items-center', isImage ? aspect : 'py-6')}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center gap-2"><ImagePlus className="h-4 w-4" />{label}</span>}
        </button>
      )}
    </div>
  );
}
