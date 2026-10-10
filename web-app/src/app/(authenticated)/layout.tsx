'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BottomNav } from '@/components/co';

/**
 * The signed-in shell. Desktop: sidebar plus a wide content column. Phone
 * width: no sidebar, and the mobile app's bottom tabs. The middleware already
 * keeps signed-out visitors out; this only reacts to signing out in this tab.
 */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') router.push('/auth/signin');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <SidebarProvider>
      <div className="hidden md:contents">
        <AppSidebar />
      </div>
      <SidebarInset className="bg-co-bg">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
}
