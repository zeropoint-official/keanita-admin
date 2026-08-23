import { format, formatDistanceToNow, differenceInYears } from 'date-fns';
import { el } from 'date-fns/locale';

export const fmtDate = (d: string | Date | null | undefined, f = 'd MMM yyyy') => (d ? format(new Date(d), f, { locale: el }) : '—');
export const fmtDateTime = (d: string | Date | null | undefined) => fmtDate(d, 'd MMM yyyy, HH:mm');
export const fmtAgo = (d: string | Date | null | undefined) => (d ? formatDistanceToNow(new Date(d), { locale: el, addSuffix: true }) : '—');
export const ageOf = (dob: string | Date | null | undefined) => (dob ? differenceInYears(new Date(), new Date(dob)) : null);
export const fmtNum = (n: number | null | undefined) => (n ?? 0).toLocaleString('el-GR');
