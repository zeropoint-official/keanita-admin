import { LogoutButton } from './logout-button';
import type { Staff } from '@/lib/auth';

const ROLE_LABEL = { admin: 'Διαχειριστής', editor: 'Συντάκτης', viewer: 'Προβολή' };

export function Header({ staff }: { staff: Staff }) {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-end px-6 gap-4">
      <div className="text-right">
        <p className="text-sm font-medium">{staff.full_name ?? staff.email}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABEL[staff.role]}</p>
      </div>
      <LogoutButton />
    </header>
  );
}
