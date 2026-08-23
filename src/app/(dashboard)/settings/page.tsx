import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsForm, type SettingField } from './settings-form';
import { PagesTab, type PageRow } from './pages-tab';
import { StaffTab, type StaffRow } from './staff-tab';
import { bool, num, str, type SettingsMap } from './settings-schema';

const CONTACT: SettingField[] = [
  { key: 'contact_email', label: 'Email', kind: 'text' },
  { key: 'contact_phone', label: 'Τηλέφωνο', kind: 'text' },
  { key: 'contact_address', label: 'Διεύθυνση', kind: 'text', span: true },
  { key: 'contact_hours', label: 'Ώρες λειτουργίας', kind: 'text', span: true, placeholder: 'Δευ–Παρ 09:00–17:00' },
  { key: 'emergency_phone', label: 'Τηλέφωνο έκτακτης ανάγκης', kind: 'text' },
  { key: 'social_facebook', label: 'Facebook', kind: 'text', placeholder: 'https://facebook.com/…' },
  { key: 'social_instagram', label: 'Instagram', kind: 'text', placeholder: 'https://instagram.com/…' },
  { key: 'social_youtube', label: 'YouTube', kind: 'text', placeholder: 'https://youtube.com/…' },
];
const KIDS: SettingField[] = [
  { key: 'kid_max_age', label: 'Μέγιστη ηλικία παιδιού', kind: 'number', hint: 'Σε έτη' },
  { key: 'points_expiry_months', label: 'Λήξη πόντων (μήνες)', kind: 'number', hint: '0 = δεν λήγουν' },
  { key: 'membership_tier_label', label: 'Ετικέτα βαθμίδας μέλους', kind: 'text', span: true },
  { key: 'kid_auto_approve', label: 'Αυτόματη έγκριση παιδιών', kind: 'switch', hint: 'Οι νέες εγγραφές παιδιών εγκρίνονται χωρίς έλεγχο.' },
];
const BIRTHDAY: SettingField[] = [
  { key: 'birthday_push_enabled', label: 'Push γενεθλίων', kind: 'switch', hint: 'Αποστολή ειδοποίησης στα γενέθλια κάθε παιδιού.' },
  { key: 'birthday_message', label: 'Μήνυμα γενεθλίων', kind: 'textarea', hint: 'Το {name} αντικαθίσταται με το όνομα του παιδιού.' },
  { key: 'birthday_points', label: 'Πόντοι γενεθλίων', kind: 'number' },
  { key: 'event_reminder_days', label: 'Υπενθύμιση εκδήλωσης (ημέρες πριν)', kind: 'number' },
  { key: 'birthday_video_url', label: 'Βίντεο γενεθλίων', kind: 'file', accept: 'video/*', bucket: 'settings' },
  { key: 'intro_video_url', label: 'Εισαγωγικό βίντεο', kind: 'file', accept: 'video/*', bucket: 'settings' },
];
const APP: SettingField[] = [
  { key: 'min_app_version', label: 'Ελάχιστη έκδοση εφαρμογής', kind: 'text', placeholder: '1.0.0' },
  { key: 'maintenance_mode', label: 'Λειτουργία συντήρησης', kind: 'switch', hint: 'Η εφαρμογή δείχνει μήνυμα συντήρησης σε όλα τα μέλη.' },
];

const PAGE_SLUGS = ['terms', 'about', 'privacy'];
const PAGE_TITLES: Record<string, string> = { terms: 'Όροι χρήσης', about: 'Η ιστορία μας', privacy: 'Πολιτική απορρήτου' };

export default async function SettingsPage() {
  const me = await requireStaff('viewer');
  const supabase = await createClient();
  const [{ data: settingsRows }, { data: pages }, { data: staff }] = await Promise.all([
    supabase.from('app_settings').select('key, value'),
    supabase.from('pages').select('slug, title, body_md, updated_at').in('slug', PAGE_SLUGS),
    supabase.from('staff').select('id, full_name, role, created_at').order('created_at'),
  ]);
  const s: SettingsMap = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]));

  const pageRows: PageRow[] = PAGE_SLUGS.map((slug) => pages?.find((p) => p.slug === slug) ?? { slug, title: PAGE_TITLES[slug], body_md: '', updated_at: null });

  return (
    <div>
      <PageHeader title="Ρυθμίσεις & Σελίδες" description="Στοιχεία επικοινωνίας, κανόνες Kids Club, ειδοποιήσεις, στατικές σελίδες και προσωπικό." />
      <Tabs defaultValue="contact">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="contact">Επικοινωνία</TabsTrigger>
          <TabsTrigger value="kids">Kids Club</TabsTrigger>
          <TabsTrigger value="birthday">Γενέθλια & Υπενθυμίσεις</TabsTrigger>
          <TabsTrigger value="app">Εφαρμογή</TabsTrigger>
          <TabsTrigger value="pages">Σελίδες</TabsTrigger>
          <TabsTrigger value="staff">Προσωπικό</TabsTrigger>
        </TabsList>
        <TabsContent value="contact">
          <SettingsForm title="Επικοινωνία" description="Εμφανίζονται στη σελίδα επικοινωνίας της εφαρμογής." fields={CONTACT}
            initial={Object.fromEntries(CONTACT.map((f) => [f.key, str(s, f.key)]))} />
        </TabsContent>
        <TabsContent value="kids">
          <SettingsForm title="Kids Club" fields={KIDS} initial={{
            kid_max_age: num(s, 'kid_max_age', 12), points_expiry_months: num(s, 'points_expiry_months', 0),
            membership_tier_label: str(s, 'membership_tier_label'), kid_auto_approve: bool(s, 'kid_auto_approve'),
          }} />
        </TabsContent>
        <TabsContent value="birthday">
          <SettingsForm title="Γενέθλια & Υπενθυμίσεις" fields={BIRTHDAY} initial={{
            birthday_push_enabled: bool(s, 'birthday_push_enabled'), birthday_message: str(s, 'birthday_message'),
            birthday_points: num(s, 'birthday_points', 0), event_reminder_days: num(s, 'event_reminder_days', 1),
            birthday_video_url: str(s, 'birthday_video_url'), intro_video_url: str(s, 'intro_video_url'),
          }} />
        </TabsContent>
        <TabsContent value="app">
          <SettingsForm title="Εφαρμογή" fields={APP} initial={{ min_app_version: str(s, 'min_app_version'), maintenance_mode: bool(s, 'maintenance_mode') }} />
        </TabsContent>
        <TabsContent value="pages"><PagesTab pages={pageRows} /></TabsContent>
        <TabsContent value="staff"><StaffTab rows={(staff ?? []) as StaffRow[]} me={{ id: me.id, email: me.email }} isAdmin={me.role === 'admin'} /></TabsContent>
      </Tabs>
    </div>
  );
}
