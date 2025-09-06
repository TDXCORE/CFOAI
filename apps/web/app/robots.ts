import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Use environment variable or fallback for build time
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://cfoai.vercel.app');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
