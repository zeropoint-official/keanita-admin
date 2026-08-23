'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/shared/form-field';
import { fmtDateTime } from '@/lib/format';
import { savePage } from './actions';

export interface PageRow { slug: string; title: string; body_md: string; updated_at: string | null }

const PAGE_LABEL: Record<string, string> = { terms: 'Όροι χρήσης', about: 'Η ιστορία μας', privacy: 'Πολιτική απορρήτου' };

function PageEditor({ page }: { page: PageRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body_md);

  const save = () => start(async () => {
    const r = await savePage(page.slug, { title, body_md: body });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    router.refresh();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{PAGE_LABEL[page.slug] ?? page.slug} <span className="text-xs font-normal text-muted-foreground">/{page.slug}</span></CardTitle>
        <CardDescription>Τελευταία ενημέρωση: {page.updated_at ? fmtDateTime(page.updated_at) : '—'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Τίτλος" required><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Περιεχόμενο" hint="Markdown (επικεφαλίδες με #, λίστες με -, έντονα με **κείμενο**).">
          <Textarea rows={18} className="font-mono text-xs" value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Button onClick={save} disabled={pending} className="bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </CardContent>
    </Card>
  );
}

export function PagesTab({ pages }: { pages: PageRow[] }) {
  return <div className="space-y-6">{pages.map((p) => <PageEditor key={p.slug} page={p} />)}</div>;
}
