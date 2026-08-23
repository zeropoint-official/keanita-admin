import { Smartphone, Apple, Globe, Activity, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { fmtNum } from '@/lib/format';

function Stat({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF0EE] text-[#E60C10]"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{fmtNum(value)}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function DevicesStats({ total, ios, android, web, recent }: { total: number; ios: number; android: number; web: number; recent: number }) {
  const pct = total ? Math.round((recent / total) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Bell} label="Σύνολο συσκευών" value={total} hint="Εγγεγραμμένα push tokens" />
        <Stat icon={Apple} label="iOS" value={ios} />
        <Stat icon={Smartphone} label="Android" value={android} />
        <Stat icon={Globe} label="Web" value={web} />
        <Stat icon={Activity} label="Ενεργές 30 ημερών" value={recent} hint={`${pct}% του συνόλου`} />
      </div>
      <p className="text-xs text-muted-foreground">Κάθε συσκευή καταχωρείται αυτόματα όταν ο χρήστης αποδεχτεί τις ειδοποιήσεις στην εφαρμογή. «Ενεργές» = εμφανίστηκαν τις τελευταίες 30 ημέρες.</p>
    </div>
  );
}
