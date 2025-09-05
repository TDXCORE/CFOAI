import { use } from 'react';
import { cookies } from 'next/headers';
import {
  Page,
  PageLayoutStyle,
  PageMobileNavigation,
  PageNavigation,
} from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { navigationConfig } from '~/config/navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireAuthContext } from '~/lib/auth/server';

// CFO AI dashboard imports
import { DashboardSidebar } from './_components/dashboard-sidebar';
import { DashboardMobileNavigation } from './_components/dashboard-mobile-navigation';
import { DashboardHeader } from './_components/dashboard-header';
import { TenantProvider } from './_components/tenant-provider';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: {
    tenant?: string;
  };
}

function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const authContext = use(requireAuthContext(params.tenant));
  const style = use(getLayoutStyle());

  if (style === 'sidebar') {
    return (
      <TenantProvider value={authContext}>
        <SidebarLayout>{children}</SidebarLayout>
      </TenantProvider>
    );
  }

  return (
    <TenantProvider value={authContext}>
      <HeaderLayout>{children}</HeaderLayout>
    </TenantProvider>
  );
}

export default withI18n(DashboardLayout);

function SidebarLayout({ children }: React.PropsWithChildren) {
  const sidebarMinimized = navigationConfig.sidebarCollapsed;

  return (
    <SidebarProvider defaultOpen={!sidebarMinimized}>
      <Page style={'sidebar'}>
        <PageNavigation>
          <DashboardSidebar />
        </PageNavigation>

        <PageMobileNavigation className={'flex items-center justify-between'}>
          <MobileNavigation />
        </PageMobileNavigation>

        <main className="flex-1 overflow-hidden">
          <DashboardHeader />
          <div className="h-full overflow-auto p-6">
            {children}
          </div>
        </main>
      </Page>
    </SidebarProvider>
  );
}

function HeaderLayout({ children }: React.PropsWithChildren) {
  return (
    <Page style={'header'}>
      <PageNavigation>
        <DashboardHeader />
      </PageNavigation>

      <PageMobileNavigation className={'flex items-center justify-between'}>
        <MobileNavigation />
      </PageMobileNavigation>

      <main className="flex-1 overflow-hidden p-6">
        {children}
      </main>
    </Page>
  );
}

function MobileNavigation() {
  return (
    <>
      <AppLogo />
      <DashboardMobileNavigation />
    </>
  );
}

async function getLayoutStyle() {
  const cookieStore = await cookies();

  return (
    (cookieStore.get('layout-style')?.value as PageLayoutStyle) ??
    navigationConfig.style
  );
}