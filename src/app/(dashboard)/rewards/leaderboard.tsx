import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtNum } from '@/lib/format';

export interface BalanceRow { user_id: string | null; balance: number | null; lifetime_earned: number | null; profiles: { firstname: string | null; lastname: string | null } | null }

const name = (r: BalanceRow) => `${r.profiles?.firstname ?? ''} ${r.profiles?.lastname ?? ''}`.trim() || r.user_id?.slice(0, 8) || '—';

function Board({ title, rows, field }: { title: string; rows: BalanceRow[]; field: 'balance' | 'lifetime_earned' }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead>Μέλος</TableHead><TableHead className="text-right">KP</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length ? rows.map((r, i) => (
              <TableRow key={r.user_id ?? i}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{name(r)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(r[field])}</TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">Δεν υπάρχουν δεδομένα.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function Leaderboard({ byBalance, byLifetime }: { byBalance: BalanceRow[]; byLifetime: BalanceRow[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Board title="Top 50 — Τρέχον υπόλοιπο" rows={byBalance} field="balance" />
      <Board title="Top 50 — Συνολικά κερδισμένοι" rows={byLifetime} field="lifetime_earned" />
    </div>
  );
}
