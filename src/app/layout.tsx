import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { getSiteSettings } from '@/lib/content-service';

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const searchConsoleVerification = process.env.NEXT_PUBLIC_SEARCH_CONSOLE_VERIFICATION;

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings();
  return {
    title: siteSettings.heroTitle,
    description: siteSettings.heroSubtitle,
    alternates: {
      canonical: '/',
      languages: siteSettings.languages.reduce<Record<string, string>>((acc, lang) => {
        acc[lang] = lang === siteSettings.defaultLanguage ? '/' : `/${lang}`;
        return acc;
      }, {}),
    },
    openGraph: {
      title: siteSettings.heroTitle,
      description: siteSettings.heroSubtitle,
      images: siteSettings.heroMediaUrl ? [{ url: siteSettings.heroMediaUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: siteSettings.heroTitle,
      description: siteSettings.heroSubtitle,
      images: siteSettings.heroMediaUrl ? [siteSettings.heroMediaUrl] : undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();

  return (
    <html lang={siteSettings.defaultLanguage} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {searchConsoleVerification && (
          <meta name="google-site-verification" content={searchConsoleVerification} />
        )}
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        {gaMeasurementId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
            <Script id="ga4-setup" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
        <FirebaseClientProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer contact={siteSettings.contact} />
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
