import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { livestreamApi } from '@/lib/api/livestream';
import { getCompanyFromRequest, shouldUseSubdomains, getBaseDomain } from '@/lib/subdomain';

interface Props {
  params: Promise<{ companySlug: string }>;
  children: React.ReactNode;
}

function getCompanyUrl(companySlug: string, useSubdomains: boolean, baseDomain: string): string {
  if (useSubdomains) {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const port = process.env.NODE_ENV === 'development' ? ':3000' : '';
    return `${protocol}://${companySlug}.${baseDomain}${port}`;
  }
  return `https://volantislive.com/${companySlug}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companySlug } = await params;
  const headerList = await headers();
  const useSubdomains = shouldUseSubdomains();
  const baseDomain = getBaseDomain();
  
  try {
    const companyPageData = await livestreamApi.getCompanyPage(companySlug);
    const company = companyPageData.company;
    
    const isLive = companyPageData.livestream?.is_live ?? false;
    const streamTitle = companyPageData.livestream?.title;
    const viewerCount = companyPageData.livestream?.viewer_count;
    
    const companyUrl = getCompanyUrl(companySlug, useSubdomains, baseDomain);
    
    let title = `${company.name} | Volantislive`;
    let description = company.description 
      ? `${company.description} - Listen live on Volantislive`
      : `Listen to live audio streaming from ${company.name} on Volantislive. Streamed live on Volantislive - Africa's leading audio streaming platform.`;
    
    if (isLive && streamTitle) {
      title = `${streamTitle} 🔴 LIVE | ${company.name} | Volantislive`;
      description = `${streamTitle} - Listen now! ${viewerCount ? `${viewerCount.toLocaleString()} listeners` : ''} - Live on Volantislive`;
    }
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'en_NG',
        siteName: 'Volantislive',
        url: companyUrl,
        ...(company.logo_url && {
          images: [{
            url: company.logo_url,
            width: 200,
            height: 200,
            alt: company.name,
          }],
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
      alternates: {
        canonical: companyUrl,
      },
    };
  } catch {
    return {
      title: 'Channel Not Found | Volantislive',
      description: 'This channel does not exist on Volantislive. Discover live audio streaming from churches and creators across Africa.',
    };
  }
}

export default async function CompanyLayout({ params, children }: Props) {
  const { companySlug } = await params;
  
  // Validate company exists - this will throw if not found
  try {
    await livestreamApi.getCompanyPage(companySlug);
  } catch {
    notFound();
  }
  
  return (
    <>
      {children}
    </>
  );
}