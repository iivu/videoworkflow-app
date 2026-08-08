import {
  Separator,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@r/ui';
import { Link, useLocation, useMatches } from '@tanstack/react-router';
import { AudioLinesIcon, VideoIcon } from 'lucide-react';
import { useMemo } from 'react';
import { BreadcrumbBar } from '#/components/breadcrumb-bar';
import { Now } from '#/components/now';
import { ThemeSwitch } from '#/components/theme-switch';
import { UserProfileDropdown } from '#/components/user-profile-dropdown';

const CONTENT_NAV_ITEMS = [{ to: '/videos', label: '视频库', icon: VideoIcon }];
const CREATIVE_NAV_ITEMS = [{ to: '/audios', label: '音频', icon: AudioLinesIcon }];

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="floating">
        <AppLayoutSidebarHeader />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>内容</SidebarGroupLabel>
            <SidebarMenu>
              {CONTENT_NAV_ITEMS.map((item) => (
                <AppLayoutSidebarMenuItem key={item.to} nav={item} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>创作</SidebarGroupLabel>
            <SidebarMenu>
              {CREATIVE_NAV_ITEMS.map((item) => (
                <AppLayoutSidebarMenuItem key={item.to} nav={item} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <ApplayoutHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppLayoutSidebarHeader() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
            <div className="flex size-8 items-center justify-center rounded-md bg-background shrink-0">{/* <img src={Logo} alt="logo" className="size-full rounded-sm" /> */}</div>
            <div className="flex flex-col flex-1 text-start text-sm leading-relaxed">
              <span className="truncate font-semibold">{import.meta.env.VITE_APP_NAME}</span>
              <span className="truncate text-xs">
                <Now />
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}

type AppLayoutSidebarMenuItemProps = {
  nav: (typeof CONTENT_NAV_ITEMS)[number] | (typeof CREATIVE_NAV_ITEMS)[number];
};
function AppLayoutSidebarMenuItem({ nav }: AppLayoutSidebarMenuItemProps) {
  const currentPath = useLocation({ select: (l) => l.pathname });
  const isActive = currentPath.startsWith(nav.to);
  const Icon = nav.icon;

  return (
    <SidebarMenuItem key={nav.to}>
      <SidebarMenuButton isActive={isActive} tooltip={nav.label} className="relative">
        <Icon />
        <span>{nav.label}</span>
        <Link to={nav.to} className="absolute inset-0" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ApplayoutHeader() {
  const matches = useMatches();

  const crumbs = useMemo(
    () =>
      matches.flatMap((m) => {
        const breadcrumb = m.context.breadcrumb ?? m.staticData.breadcrumb;
        if (!breadcrumb) return [];
        return Array.isArray(breadcrumb) ? breadcrumb : [breadcrumb];
      }),
    [matches],
  );

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-4 px-4 transition-[width,height] ease-linear sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <SidebarTrigger variant="outline" className="size-7" />
      <Separator orientation="vertical" className="my-3" />
      <BreadcrumbBar crumbs={crumbs} />
      <div className="flex ml-auto items-center justify-between gap-4">
        <ThemeSwitch />
        <UserProfileDropdown />
      </div>
    </header>
  );
}
