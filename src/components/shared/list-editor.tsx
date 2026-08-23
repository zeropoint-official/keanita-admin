'use client';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Editable list of strings (highlights, ingredients …). */
export function StringListEditor({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input value={v} placeholder={placeholder} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, ''])}><Plus className="h-4 w-4 mr-1" />Προσθήκη</Button>
    </div>
  );
}

/** Editable list of {label,value} pairs (nutrition) or {emoji,label} (highlights). */
export function PairListEditor<K1 extends string, K2 extends string>({ value, onChange, keys, placeholders }: {
  value: Record<K1 | K2, string>[]; onChange: (v: Record<K1 | K2, string>[]) => void; keys: [K1, K2]; placeholders?: [string, string];
}) {
  const [a, b] = keys;
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex gap-2">
          <Input value={row[a]} placeholder={placeholders?.[0]} className="w-1/3" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, [a]: e.target.value } : x)))} />
          <Input value={row[b]} placeholder={placeholders?.[1]} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, [b]: e.target.value } : x)))} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { [a]: '', [b]: '' } as Record<K1 | K2, string>])}><Plus className="h-4 w-4 mr-1" />Προσθήκη</Button>
    </div>
  );
}
