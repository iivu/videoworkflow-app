import { Toaster, TooltipProvider } from '@r/ui';
import themeCss from '@r/ui/theme.css?url';
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import globalCss from '#/global.css?url';
import TanStackQueryDevtools from '#/integrations/tanstack-query/devtools';
import { AuthProvider } from '#/providers/auth-provider';
import { ConfirmDialogProvider } from '#/providers/confirm-dialog-provider';
import { ThemeProvider } from '#/providers/theme-provider';
import { VoiceListDialogProvider } from '#/providers/voice-list-dialog-provider';

interface AppRouterContext {
  queryClient: QueryClient;
  breadcrumb?: string | string[];
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem(${import.meta.env.VITE_THEME_STORAGE_KEY});var mode=(stored==='light'||stored==='dark'||stored==='system')?stored:'system';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='system'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='system'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRouteWithContext<AppRouterContext>()({
  staticData: { breadcrumb: '首页' },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, user-scalable=no, maximum-scale=1, minimum-scale=1',
      },
      {
        title: import.meta.env.VITE_APP_NAME,
        description: import.meta.env.VITE_APP_NAME,
        referrer: 'no-referrer',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: themeCss,
      },
      {
        rel: 'stylesheet',
        href: globalCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <TooltipProvider>
      <ConfirmDialogProvider>
        <AuthProvider>
          <ThemeProvider>
            <VoiceListDialogProvider>
              <Outlet />
            </VoiceListDialogProvider>
          </ThemeProvider>
        </AuthProvider>
      </ConfirmDialogProvider>
    </TooltipProvider>
  );
}
