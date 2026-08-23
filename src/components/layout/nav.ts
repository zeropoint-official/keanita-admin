import {
  LayoutDashboard, Users, CalendarDays, Home, Package, Store, Puzzle, Smile,
  Star, Gift, Bell, Settings, type LucideIcon,
} from 'lucide-react';

export interface NavItem { href: string; label: string; icon: LucideIcon }
export interface NavGroup { title: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { title: 'Γενικά', items: [
    { href: '/', label: 'Επισκόπηση', icon: LayoutDashboard },
    { href: '/members', label: 'Μέλη', icon: Users },
  ]},
  { title: 'Περιεχόμενο', items: [
    { href: '/events', label: 'Εκδηλώσεις & Σεμινάρια', icon: CalendarDays },
    { href: '/home-screen', label: 'Αρχική οθόνη', icon: Home },
    { href: '/products', label: 'Προϊόντα', icon: Package },
    { href: '/stores', label: 'Καταστήματα & Εκπτώσεις', icon: Store },
    { href: '/activities', label: 'Δραστηριότητες', icon: Puzzle },
    { href: '/characters', label: 'Χαρακτήρες', icon: Smile },
  ]},
  { title: 'Kids Club', items: [
    { href: '/rewards', label: 'Πόντοι KP', icon: Star },
    { href: '/gifts', label: 'Δώρα & Εξαργυρώσεις', icon: Gift },
    { href: '/notifications', label: 'Ειδοποιήσεις', icon: Bell },
  ]},
  { title: 'Σύστημα', items: [
    { href: '/settings', label: 'Ρυθμίσεις & Σελίδες', icon: Settings },
  ]},
];
