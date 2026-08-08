import { createFileRoute, Outlet } from '@tanstack/react-router';
import { LoginPage } from '#/features/login-page';
import { VoiceCloningDialog } from '#/features/voice-cloning/voice-cloning-dialog';
import { AppLayout } from '#/layouts/app-layout';
import { useAuth } from '#/providers/auth-provider';

export const Route = createFileRoute('/_auth')({
  component: AuthRouteLayout,
});

function AuthRouteLayout() {
  const { status } = useAuth();

  if (status === 'checking') return null;
  if (status === 'unauthenticated') return <LoginPage />;
  return (
    <AppLayout>
      <Outlet />
      <VoiceCloningDialog />
    </AppLayout>
  );
}
