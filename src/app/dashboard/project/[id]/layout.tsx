'use client';

import React, { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { 
  Database as DbIcon, 
  Folder, 
  Users, 
  Lightning, 
  Copy,
  House,
  ShieldCheck,
  Code,
  Gear,
  CaretUpDown,
  Bell
} from '@phosphor-icons/react';

import { 
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import Link from 'next/link';

const navItems = [
  { title: "Overview", icon: House, href: "" },
  { title: "Database", icon: DbIcon, href: "/database" },
  { title: "Authentication", icon: Users, href: "/auth" },
  { title: "Storage", icon: Folder, href: "/storage" },
  { title: "Edge Functions", icon: Lightning, href: "/functions" },
  { title: "Security", icon: ShieldCheck, href: "/security" },
  { title: "API Keys", icon: Code, href: "/api-keys" },
  { title: "Settings", icon: Gear, href: "/settings" },
]

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id;
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('U');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('filybase-auth-session');
      if (raw) {
        const session = JSON.parse(raw);
        const name = session.user?.name || session.user?.email || 'User';
        setUserName(name);
        setUserInitial(name.charAt(0).toUpperCase());
      }
    } catch {}
  }, []);

  const getActiveState = (itemHref: string) => {
    const base = `/dashboard/project/${id}`;
    if (itemHref === "") return pathname === base;
    return pathname.startsWith(base + itemHref);
  };

  const getPageTitle = () => {
    const activeItem = navItems.find(item => getActiveState(item.href));
    return activeItem?.title || "Overview";
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-[#2c2c2e]">
        <SidebarHeader className="h-16 flex flex-row items-center justify-start px-4 border-b border-[#2c2c2e] gap-3">
           <Link href="/" className="flex items-center gap-3">
             <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
             <span className="font-bold tracking-tight text-lg group-data-[collapsible=icon]:hidden">FilyBase</span>
           </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2">Project Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Link href={`/dashboard/project/${id}${item.href}`}>
                      <SidebarMenuButton 
                        tooltip={item.title} 
                        isActive={getActiveState(item.href)}
                        className="hover:bg-[#10b981]/10 hover:text-[#10b981] data-[active=true]:bg-[#10b981]/10 data-[active=true]:text-[#10b981]"
                      >
                        <item.icon size={20} weight={getActiveState(item.href) ? "bold" : "light"} />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-[#2c2c2e] p-4">
            <SidebarMenuButton className="w-full justify-between gap-3 h-12 hover:bg-[#2c2c2e]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-offset-2 ring-offset-[#1c1c1e] ring-transparent">
                  {userInitial}
                </div>
                <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                  <span className="text-xs font-bold">{userName}</span>
                  <span className="text-[10px] text-muted-foreground">Personal Project</span>
                </div>
              </div>
              <CaretUpDown size={16} className="group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <main className="min-h-screen bg-[#121214] text-white selection:bg-[#10b981] selection:text-white">
          <header className="h-16 border-b border-[#2c2c2e] bg-[#121214]/50 backdrop-blur-xl sticky top-0 z-40 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <SidebarTrigger className="text-muted-foreground hover:text-white" />
               <div className="h-4 w-[1px] bg-[#2c2c2e]" />
               <h2 className="text-sm font-bold tracking-tight text-muted-foreground">{getPageTitle()}</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-[#1c1c1e] px-3 py-1.5 rounded-md border border-[#2c2c2e] text-[11px] font-mono text-muted-foreground group cursor-pointer hover:border-[#10b981]/50 transition-colors">
                <Copy size={12} />
                <span>{id}</span>
              </div>
              <button className="p-2 text-muted-foreground hover:text-white transition-colors">
                 <Bell size={18} />
              </button>
            </div>
          </header>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
