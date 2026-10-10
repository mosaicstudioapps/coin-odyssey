'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronsUpDown, LogOut, Plus, Settings } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NAV_ITEMS, ThemeChoice, isActivePath } from '@/components/co';

/** Desktop navigation. On phone widths the bottom bar (BottomNav) takes over. */
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <Sidebar>
      <SidebarHeader className="gap-4 p-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-1 pt-1">
          <Image src="/app-icon.png" alt="" width={28} height={28} className="rounded-[7px]" priority />
          <span className="font-display text-[19px] tracking-[-0.01em] text-co-fg">Coin Odyssey</span>
        </Link>
        <Link
          href="/collection/add"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-co-gold px-4 py-2.5 text-sm font-medium text-co-gold-fg transition hover:brightness-105"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add coin
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActivePath(pathname, item.path)} tooltip={item.name}>
                    <Link href={item.path}>
                      <item.icon className="h-4 w-4" strokeWidth={1.6} />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-3">
        <ThemeChoice compact />
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-co-gold font-display text-[15px] text-co-gold-fg">
                      {user.email?.[0]?.toUpperCase() ?? 'C'}
                    </span>
                    <span className="max-w-[150px] truncate text-left text-sm text-co-fg">{user.email}</span>
                    <ChevronsUpDown className="ml-auto h-4 w-4 text-co-fg3" aria-hidden />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-[--radix-dropdown-menu-trigger-width]">
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
