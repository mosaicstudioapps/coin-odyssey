"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import {
  LayoutDashboard,
  ScanLine,
  Coins,
  BookOpen,
  Trophy,
  Settings,
  Plus,
  LogOut,
  ChevronsUpDown,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

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
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

// The mobile app's sections, in its tab order. Achievements lives on the
// mobile Dashboard; a desktop sidebar has room to list it directly.
const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Scan", path: "/scan", icon: ScanLine },
  { name: "Collection", path: "/collection", icon: Coins },
  { name: "Albums", path: "/albums", icon: BookOpen },
  { name: "Achievements", path: "/achievements", icon: Trophy },
  { name: "Settings", path: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        {/* Logo */}
        <div className="flex justify-center px-2 py-3">
          <Image
            src="/images/CoinOdyssey_Logo_Final.png"
            alt="Coin Odyssey"
            width={160}
            height={53}
            priority
            className="w-auto h-auto"
          />
        </div>

        {/* Add Coin Button */}
        <Button asChild className="w-full mt-2" size="sm">
          <Link href="/collection/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Coin
          </Link>
        </Button>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.path ||
                  (item.path !== "/dashboard" &&
                    pathname.startsWith(item.path))

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                    >
                      <Link href={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.user_metadata?.avatar_url}
                        alt={user.email ?? "User"}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user.email?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 leading-none text-left">
                      <span className="font-semibold text-sm truncate max-w-[140px]">
                        {user.user_metadata?.full_name ?? user.email}
                      </span>
                      {user.user_metadata?.full_name && (
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {user.email}
                        </span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  className="w-[--radix-dropdown-menu-trigger-width]"
                >
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
