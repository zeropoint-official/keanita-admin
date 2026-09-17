'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/shared/form-field';
import { fmtNum } from '@/lib/format';
import { uploadCodes } from '../../actions';

/** Split pasted text / CSV content into candidate codes. */
const parseCodes = (text: string) => text.split(/[\s,;]+/).filter(Boolean);

export function CodesPanel({ campaignId, total, assigned }: { campaignId: string; total: number; assigned: number }) {
  const router = useRouter();
  const [batch, setBatch] = useState('');
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = (codes: string[]) => start(async () => {
    const r = await uploadCodes(campaignId, batch, codes);
    if (!r.ok) { toast.error(r.error); return; }
    const { added, skipped } = r.data as { added: number; skipped: number };
    toast.success(`Προστέθηκαν ${fmtNum(added)} κωδικοί${skipped ? ` (${fmtNum(skipped)} διπλότυποι αγνοήθηκαν)` : ''}`);
    setText('');
    router.refresh();
  });

  const onFile = async (f: File) => {
    const content = await f.text();
    const codes = parseCodes(content);
    if (!codes.length) { toast.error('Το αρχείο δεν περιέχει κωδικούς'); return; }
    submit(codes);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Κωδικοί κουπονιών</CardTitle>
        <p className="text-sm text-muted-foreground tabular-nums">
          {fmtNum(total)} σύνολο · {fmtNum(total - assigned)} διαθέσιμοι · {fmtNum(assigned)} δοσμένοι
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[240px_1fr]">
        <div className="space-y-4">
          <Field label="Ετικέτα παρτίδας" hint='π.χ. "KFC Οκτώβριος"'>
            <Input value={batch} onChange={(e) => setBatch(e.target.value)} />
          </Field>
          <input ref={fileInput} type="file" accept=".csv,.txt" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
          <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={() => fileInput.current?.click()}>
            <Upload className="h-4 w-4 mr-1" />Αρχείο CSV
          </Button>
        </div>
        <div className="space-y-2">
          <Field label="Επικόλληση κωδικών" hint="Ένας ανά γραμμή (ή χωρισμένοι με κόμμα) — τα διπλότυπα αγνοούνται">
            <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'KFC30-A1B2\nKFC30-C3D4\n…'} />
          </Field>
          <Button type="button" disabled={pending || !parseCodes(text).length} onClick={() => submit(parseCodes(text))}
            className="bg-[#E60C10] hover:bg-[#c50a0d]">
            {pending ? 'Ανέβασμα…' : `Προσθήκη ${fmtNum(parseCodes(text).length)} κωδικών`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
