'use client';
import { useEffect } from 'react';

/** Tries to open the app once on phones, and offers a button either way. */
export function OpenApp({ href }: { href: string }) {
  useEffect(() => {
    if (/android|iphone|ipad|ipod/i.test(navigator.userAgent)) window.location.href = href;
  }, [href]);
  return (
    <a
      href={href}
      className="mt-6 inline-block w-full rounded-2xl bg-[#E60C10] px-6 py-4 text-base font-bold text-white hover:bg-[#c50a0d]"
    >
      Άνοιγμα εφαρμογής
    </a>
  );
}
