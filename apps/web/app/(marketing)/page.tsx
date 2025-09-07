import Image from 'next/image';
import Link from 'next/link';

import { ArrowRightIcon, LayoutDashboard } from 'lucide-react';

import {
  CtaButton,
  FeatureCard,
  FeatureGrid,
  FeatureShowcase,
  FeatureShowcaseIconContainer,
  Hero,
  Pill,
} from '@kit/ui/marketing';
import { Trans } from '@kit/ui/trans';

function Home() {
  return (
    <div className={'mt-4 flex flex-col space-y-24 py-14'}>
      <div className={'container mx-auto'}>
        <Hero
          pill={
            <Pill label={'New'}>
              <span>CFO AI - Colombian Tax Management</span>
            </Pill>
          }
          title={
            <>
              <span>CFO AI Platform</span>
              <span>para Empresas Colombianas</span>
            </>
          }
          subtitle={
            <span>
              Automatiza el procesamiento de facturas y gestión de impuestos colombianos 
              con inteligencia artificial. Simplifica tu contabilidad empresarial.
            </span>
          }
          cta={<MainCallToActionButton />}
          image={
            <Image
              priority
              className={
                'dark:border-primary/10 rounded-2xl border border-gray-200'
              }
              width={3558}
              height={2222}
              src={`/images/dashboard.webp`}
              alt={`CFO AI Dashboard`}
            />
          }
        />
      </div>

      <div className={'container mx-auto'}>
        <div
          className={'flex flex-col space-y-16 xl:space-y-32 2xl:space-y-36'}
        >
          <FeatureShowcase
            heading={
              <>
                <b className="font-semibold dark:text-white">
                  Plataforma CFO AI
                </b>
                .{' '}
                <span className="text-muted-foreground font-normal">
                  Automatiza tu gestión fiscal colombiana con IA avanzada.
                </span>
              </>
            }
            icon={
              <FeatureShowcaseIconContainer>
                <LayoutDashboard className="h-5" />
                <span>Gestión Integral</span>
              </FeatureShowcaseIconContainer>
            }
          >
            <FeatureGrid>
              <FeatureCard
                className={'relative col-span-2 overflow-hidden'}
                label={'Procesamiento Automático'}
                description={`Procesa facturas automáticamente desde Outlook con OCR e IA.`}
              />

              <FeatureCard
                className={
                  'relative col-span-2 w-full overflow-hidden lg:col-span-1'
                }
                label={'Cálculos Fiscales'}
                description={`IVA, ReteFuente, ReteIVA y ICA calculados automáticamente.`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden lg:col-span-1'}
                label={'Integración Contable'}
                description={`Conecta con Siigo, World Office y SAP.`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden'}
                label={'Cumplimiento DIAN'}
                description={`Genera reportes UBL para cumplir con regulaciones colombianas.`}
              />
            </FeatureGrid>
          </FeatureShowcase>
        </div>
      </div>
    </div>
  );
}

export default Home;

function MainCallToActionButton() {
  return (
    <div className={'flex space-x-4'}>
      <CtaButton>
        <Link href={'/auth/sign-up'}>
          <span className={'flex items-center space-x-0.5'}>
            <span>Comenzar</span>

            <ArrowRightIcon
              className={
                'animate-in fade-in slide-in-from-left-8 h-4' +
                ' zoom-in fill-mode-both delay-1000 duration-1000'
              }
            />
          </span>
        </Link>
      </CtaButton>

      <CtaButton variant={'link'}>
        <Link href={'/auth/sign-in'}>
          Iniciar Sesión
        </Link>
      </CtaButton>
    </div>
  );
}
