import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { livestreamApi } from '@/lib/api/livestream';

interface Props {
  params: Promise<{ companySlug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companySlug } = await params;
  
  try {
    // Use getCompanyPage for company info with subscriber count
    const companyPageData = await livestreamApi.getCompanyPage(companySlug);
    const company = companyPageData.company;
    
    // Check if there's a live stream
    const isLive = companyPageData.livestream?.is_live ?? false;
    const streamTitle = companyPageData.livestream?.title;
    const viewerCount = companyPageData.livestream?.viewer_count;
    
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
        url: `https://volantislive.com/${companySlug}`,
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
    };
  } catch {
    // Company not found
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