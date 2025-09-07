import { Footer } from '@kit/ui/marketing';

import { AppLogo } from '~/components/app-logo';

export function SiteFooter() {
  return (
    <Footer
      logo={<AppLogo className="w-[85px] md:w-[95px]" />}
      description={<span>Plataforma de gestión fiscal colombiana con inteligencia artificial</span>}
      copyright={
        <span>
          © {new Date().getFullYear()} CFO AI. Todos los derechos reservados.
        </span>
      }
      sections={[
        {
          heading: 'Comenzar',
          links: [
            {
              href: '/auth/sign-in',
              label: <span>Iniciar Sesión</span>,
            },
            {
              href: '/auth/sign-up',
              label: <span>Registrarse</span>,
            },
          ],
        },
        {
          heading: <span>Legal</span>,
          links: [
            {
              href: '/terms-of-service',
              label: <span>Términos de Servicio</span>,
            },
            {
              href: '/privacy-policy',
              label: <span>Política de Privacidad</span>,
            },
            {
              href: '/cookie-policy',
              label: <span>Política de Cookies</span>,
            },
          ],
        },
      ]}
    />
  );
}
