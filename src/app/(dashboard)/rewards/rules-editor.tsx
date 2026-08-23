'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PairListEditor } from '@/components/shared/list-editor';
import { saveRules, POINTS_REASONS, type PointsReason } from './actions';

export interface Rule { key: PointsReason; label: string; points: number; daily_cap: number | null; is_active: boolean; config: Record<string, unknown> }

const DEFAULT_LABELS: Record<PointsReason, string> = {
  daily_login: 'Ημερήσια είσοδος', streak_bonus: 'Μπόνους σερί', game: 'Παιχνίδι', event_rsvp: 'Συμμετοχή σε εκδήλωση',
  profile_complete: 'Συμπλήρωση προφίλ', qr_scan: 'Σάρωση QR', gift_redeem: 'Εξαργύρωση δώρου', refund: 'Επιστροφή πόντων',
  manual: 'Χειροκίνητη προσαρμογή', birthday: 'Γενέθλια', expiry: 'Λήξη πόντων',
};

type Tier = { days: string; points: string };
const tiersToPairs = (cfg: Record<string, unknown>): Tier[] => Object.entries((cfg.tiers as Record<string, number>) ?? {}).map(([days, points]) => ({ days, points: String(points) })).sort((a, b) => Number(a.days) - Number(b.days));
const pairsToTiers = (pairs: Tier[]) => Object.fromEntries(pairs.filter((p) => p.days.trim() && p.points.trim()).map((p) => [String(parseInt(p.days, 10)), parseInt(p.points, 10)]));

export function RulesEditor({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<Rule[]>(() => POINTS_REASONS.map((key) => rules.find((r) => r.key === key) ?? { key, label: DEFAULT_LABELS[key], points: 0, daily_cap: null, is_active: true, config: {} }));
  const [tiers, setTiers] = useState<Tier[]>(() => tiersToPairs(rows.find((r) => r.key === 'streak_bonus')?.config ?? {}));

  const patch = (key: PointsReason, p: Partial<Rule>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const save = () => start(async () => {
    const payload = rows.map((r) => (r.key === 'streak_bonus' ? { ...r, config: { ...r.config, tiers: pairsToTiers(tiers) } } : r));
    const res = await saveRules(payload);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success('Οι κανόνες αποθηκεύτηκαν');
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ενέργεια</TableHead><TableHead>Ετικέτα</TableHead><TableHead className="w-28">Πόντοι</TableHead>
              <TableHead className="w-32">Ημερήσιο όριο</TableHead><TableHead className="w-24">Ενεργό</TableHead><TableHead>Ρυθμίσεις</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.key}</TableCell>
                <TableCell><Input value={r.label} onChange={(e) => patch(r.key, { label: e.target.value })} /></TableCell>
                <TableCell><Input type="number" value={r.points} onChange={(e) => patch(r.key, { points: Number(e.target.value) })} /></TableCell>
                <TableCell><Input type="number" min={0} placeholder="—" value={r.daily_cap ?? ''} onChange={(e) => patch(r.key, { daily_cap: e.target.value === '' ? null : Number(e.target.value) })} /></TableCell>
                <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => patch(r.key, { is_active: !!v })} /></TableCell>
                <TableCell className="min-w-72">
                  {r.key === 'streak_bonus' && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Κλιμάκια σερί: ημέρες → πόντοι</p>
                      <PairListEditor value={tiers} onChange={setTiers} keys={['days', 'points']} placeholders={['7', '30']} />
                    </div>
                  )}
                  {r.key === 'game' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Μπόνους ολοκλήρωσης</span>
                      <Input type="number" min={0} className="w-28" value={Number(r.config.completion_bonus ?? 0)} onChange={(e) => patch(r.key, { config: { ...r.config, completion_bonus: Number(e.target.value) } })} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending} className="bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση κανόνων'}</Button>
      </div>
    </div>
  );
}
