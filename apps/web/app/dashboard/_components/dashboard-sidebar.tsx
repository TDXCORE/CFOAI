'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  Upload, 
  Eye, 
  Download, 
  Settings, 
  BarChart3,
  Mail,
  Calculator,
  Users,
  Shield,
  HelpCircle
} from 'lucide-react';
import { cn } from '@kit/ui/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@kit/ui/shadcn-sidebar';
import { AppLogo } from '~/components/app-logo';
import { useTenant } from './tenant-provider';

const navigationItems = [
  {
    title: 'Procesamiento',
    items: [
      {
        title: 'Bandeja de Entrada',
        href: '/dashboard/inbox',
        icon: FileText,
        description: 'Facturas pendientes de procesar'
      },
      {
        title: 'Subir Archivos',
        href: '/dashboard/upload',
        icon: Upload,
        description: 'Cargar facturas manualmente'
      },
      {
        title: 'Cola de Revisión',
        href: '/dashboard/review',
        icon: Eye,
        description: 'Revisar y aprobar facturas'
      }
    ]
  },
  {
    title: 'Reportes y Exportación',
    items: [
      {
        title: 'Panel de Control',
        href: '/dashboard',
        icon: BarChart3,
        description: 'Métricas y estadísticas'
      },
      {
        title: 'Exportaciones',
        href: '/dashboard/exports',
        icon: Download,
        description: 'Exportar a sistemas contables'
      },
      {
        title: 'Calculadora de Impuestos',
        href: '/dashboard/tax-calculator',
        icon: Calculator,
        description: 'Calcular impuestos manualmente'
      }
    ]
  },
  {
    title: 'Configuración',
    items: [
      {
        title: 'Integración Outlook',
        href: '/dashboard/settings/outlook',
        icon: Mail,
        description: 'Configurar correo electrónico'
      },
      {
        title: 'Usuarios y Roles',
        href: '/dashboard/settings/users',
        icon: Users,
        description: 'Gestionar equipo'
      },
      {
        title: 'Configuración General',
        href: '/dashboard/settings',
        icon: Settings,
        description: 'Ajustes del sistema'
      }
    ]
  }
];

const bottomItems = [
  {
    title: 'Auditoría',
    href: '/dashboard/audit',
    icon: Shield,
    description: 'Registro de cambios'
  },
  {
    title: 'Ayuda',
    href: '/dashboard/help',
    icon: HelpCircle,
    description: 'Documentación y soporte'
  }
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { tenant } = useTenant();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <AppLogo />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{tenant.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{tenant.plan}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || 
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.description}
                      >
                        <Link href={item.href}>
                          <Icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.description}
                >
                  <Link href={item.href}>
                    <Icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}