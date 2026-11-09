import type { Metadata } from 'next';
import { OpenApp } from './open-app';

export const metadata: Metadata = {
  title: 'Το email σου επιβεβαιώθηκε · ΚΕΑΝΙΤΑ',
  robots: { index: false },
};

/**
 * Public landing page for the signup confirmation link (launch checklist A7).
 * Supabase has already confirmed the email before redirecting here; this page
 * just hands the parent back to the app — on a phone it opens it automatically
 * (forwarding ?code=… so the app can sign them straight in), on a computer it
 * tells them to open the app on their phone.
 */
export default async function EmailConfirmedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === 'string') qs.set(k, v);
  const failed = typeof params.error === 'string' || typeof params.error_code === 'string';
  const appUrl = `keanita://confirmed${qs.size ? `?${qs.toString()}` : ''}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF8EB] px-6 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_8px_30px_rgba(45,45,58,0.08)]">
        <div className="text-6xl" aria-hidden>{failed ? '⏰' : '🎉'}</div>
        <h1 className="mt-4 text-2xl font-extrabold text-[#2D2D3A]">
          {failed ? 'Ο σύνδεσμος έληξε' : 'Το email σου επιβεβαιώθηκε!'}
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-[#5A5A66]">
          {failed
            ? 'Ο σύνδεσμος επιβεβαίωσης δεν ισχύει πια. Άνοιξε την εφαρμογή και συνδέσου — αν χρειαστεί, θα σου στείλουμε νέο.'
            : 'Καλώς ήρθες στο ΚΕΑΝΙΤΑ Kids Club. Άνοιξε την εφαρμογή στο κινητό σου για να συνεχίσεις.'}
        </p>
        <OpenApp href={failed ? 'keanita://login' : appUrl} />
        <p className="mt-6 text-xs text-[#8E8E9A]">
          Είσαι σε υπολογιστή; Απλώς άνοιξε την εφαρμογή ΚΕΑΝΙΤΑ στο κινητό σου και συνδέσου.
        </p>
      </div>
    </main>
  );
}
