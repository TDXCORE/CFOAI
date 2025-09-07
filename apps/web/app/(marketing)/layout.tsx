import { SiteFooter } from '~/(marketing)/_components/site-footer';
import { SiteHeader } from '~/(marketing)/_components/site-header';

function SiteLayout(props: React.PropsWithChildren) {
  // Simplified layout without server-side auth check
  // Auth will be handled at component level when needed
  
  return (
    <div className={'flex min-h-[100vh] flex-col'}>
      <SiteHeader user={null} />

      {props.children}

      <SiteFooter />
    </div>
  );
}

export default SiteLayout;
