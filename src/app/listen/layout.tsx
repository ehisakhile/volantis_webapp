import { Metadata } from 'next';

interface Props {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: 'Listen Live | Volantislive - Discover Live Audio Streams',
  description: 'Discover and listen to live audio streaming from churches, events, and creators across Africa. Stream on any connection with Volantislive - ultra-low bandwidth audio streaming.',
  keywords: ['listen live', 'live audio streaming', 'church live stream', 'Africa streaming', 'low bandwidth audio', 'live radio', 'volantislive'],
  openGraph: {
    title: 'Listen Live | Volantislive',
    description: 'Discover and listen to live audio streaming from churches, events, and creators across Africa. Stream on any connection with Volantislive.',
    type: 'website',
    locale: 'en_NG',
    siteName: 'Volantislive',
    url: 'https://volantislive.com/listen',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Listen Live | Volantislive',
    description: 'Discover and listen to live audio streaming from churches, events, and creators across Africa.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ListenLayout({ children }: Props) {
  return (
    <>
      {children}
    </>
  );
}