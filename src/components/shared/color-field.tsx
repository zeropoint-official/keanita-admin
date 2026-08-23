'use client';
import { Input } from '@/components/ui/input';

const PALETTE = ['#E60C10', '#E84D3D', '#F5820D', '#F5A623', '#FBD40D', '#53B41A', '#6BBF6A', '#1E9A3D', '#12AEEB', '#5DADE2', '#9B7FD4', '#9C2BB4'];

export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 rounded border p-0.5 cursor-pointer" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-28 font-mono text-xs" />
      <div className="flex gap-1 flex-wrap">
        {PALETTE.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} className="h-5 w-5 rounded-full border border-black/10" style={{ background: c }} title={c} />
        ))}
      </div>
    </div>
  );
}
