'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Coins, LayoutDashboard, ScanLine, Settings, Trophy, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  /** Shown in the phone-width bottom bar. Achievements lives on the dashboard there, as on mobile. */
  inBottomBar: boolean;
}

/** The mobile app's sections in its tab order. The sidebar and bottom bar both read this. */
export const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, inBottomBar: true },
  { name: 'Scan', path: '/scan', icon: ScanLine, inBottomBar: true },
  { name: 'Collection', path: '/collection', icon: Coins, inBottomBar: true },
  { name: 'Albums', path: '/albums', icon: BookOpen, inBottomBar: true },
  { name: 'Achievements', path: '/achievements', icon: Trophy, inBottomBar: false },
  { name: 'Settings', path: '/settings', icon: Settings, inBottomBar: true },
];

export function isActivePath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Phone-width navigation: the mobile app's floating pill of five tabs. Hidden from md up. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-3.5 pt-3 md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <ul className="flex rounded-full border border-co-line bg-co-bg2 p-1.5 shadow-lg">
        {NAV_ITEMS.filter(item => item.inBottomBar).map(item => {
          const active = isActivePath(pathname, item.path);
          const scan = item.path === '/scan';
          const Icon = item.icon;
          return (
            <li key={item.path} className="flex-1">
              <Link
                href={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2',
                  active && (scan ? 'bg-co-gold' : 'bg-co-bg4')
                )}
              >
                <Icon
                  className={cn(scan ? 'h-[19px] w-[19px]' : 'h-[17px] w-[17px]', active ? (scan ? 'text-co-gold-fg' : 'text-co-fg') : 'text-co-fg3')}
                  strokeWidth={1.6}
                  aria-hidden
                />
                <span
                  className={cn(
                    'font-mono text-[9.5px] uppercase tracking-[0.06em]',
                    active ? (scan ? 'text-co-gold-fg' : 'text-co-fg') : 'text-co-fg3'
                  )}
                >
                  {item.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
