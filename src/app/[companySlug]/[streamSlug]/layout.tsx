import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { livestreamApi } from '@/lib/api/livestream';

interface Props {
  params: Promise<{ companySlug: string; streamSlug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companySlug, streamSlug } = await params;
  
  try {
    // Get stream data
    let streamData;
    try {
      streamData = await livestreamApi.getLivestream(streamSlug);
    } catch {
      // Fallback: fetch from company streams
      const companyStreams = await livestreamApi.getCompanyStreams(companySlug, 50, 0, true);
      streamData = companyStreams.find(s => s.slug === streamSlug);
    }
    
    if (!streamData) {
      return {
        title: 'Stream Not Found | Volantislive',
        description: 'This live stream does not exist or has ended. Discover other live audio streaming from churches and creators across Africa.',
      };
    }
    
    // Get company info for the description
    let companyName = companySlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    let companyLogo = null;
    try {
      const companyPageData = await livestreamApi.getCompanyPage(companySlug);
      companyName = companyPageData.company.name;
      companyLogo = companyPageData.company.logo_url;
    } catch {
      // Use fallback company name
    }
    
    // Build dynamic metadata
    const isLive = streamData.is_active;
    let title = '';
    let description = '';
    
    if (isLive) {
      title = `${streamData.title} 🔴 LIVE | ${companyName} | Volantislive`;
      description = streamData.description 
        ? `${streamData.description} - Listen now! ${streamData.viewer_count ? `${streamData.viewer_count.toLocaleString()} listeners` : ''} - Live on Volantislive`
        : `Listen to the live stream "${streamData.title}" from ${companyName}. Streamed live on Volantislive - Africa's leading audio streaming platform.`;
    } else {
      title = `${streamData.title} | ${companyName} | Volantislive`;
      description = streamData.description 
        ? `${streamData.description} - Listen to this stream on Volantislive`
        : `Listen to "${streamData.title}" from ${companyName} on Volantislive - Africa's leading audio streaming platform.`;
    }
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'video.other',
        locale: 'en_NG',
        siteName: 'Volantislive',
        url: `https://volantislive.com/${companySlug}/${streamSlug}`,
        ...(streamData.thumbnail_url && {
          images: [{
            url: streamData.thumbnail_url,
            width: 1280,
            height: 720,
            alt: streamData.title,
          }],
        }),
        ...(companyLogo && !streamData.thumbnail_url && {
          images: [{
            url: companyLogo,
            width: 200,
            height: 200,
            alt: companyName,
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
    // Stream not found
    return {
      title: 'Stream Not Found | Volantislive',
      description: 'This live stream does not exist or has ended. Discover other live audio streaming from churches and creators across Africa.',
    };
  }
}

export default async function StreamLayout({ params, children }: Props) {
  const { companySlug, streamSlug } = await params;
  
  // Validate stream exists - try to get stream data
  try {
    let streamData;
    try {
      streamData = await livestreamApi.getLivestream(streamSlug);
    } catch {
      const companyStreams = await livestreamApi.getCompanyStreams(companySlug, 50, 0, true);
      streamData = companyStreams.find(s => s.slug === streamSlug);
    }
    
    if (!streamData) {
      notFound();
    }
  } catch {
    notFound();
  }
  
  return (
    <>
      {children}
    </>
  );
}