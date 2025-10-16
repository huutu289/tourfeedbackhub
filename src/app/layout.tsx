import type { Metadata } from 'next';
import Script from 'next/script';
import { Playfair_Display, PT_Sans } from 'next/font/google';
import './globals.css';
import '@/lib/polyfills';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { getSiteSettings } from '@/lib/content-service';
import { getMenu } from '@/lib/nav';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-headline',
  display: 'swap',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
  display: 'swap',
});

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
  const locale = siteSettings.defaultLanguage || 'en';
  const [headerMenu, footerMenu] = await Promise.all([
    getMenu('header', locale),
    getMenu('footer', locale),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {searchConsoleVerification && (
          <meta name="google-site-verification" content={searchConsoleVerification} />
        )}
        <Script id="crypto-polyfill" strategy="beforeInteractive">
          {`
            (function() {
              if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
                crypto.randomUUID = function() {
                  if (typeof crypto.getRandomValues === 'function') {
                    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, function(c) {
                      var num = parseInt(c, 10);
                      return (num ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (num / 4)))).toString(16);
                    });
                  }
                  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = (Math.random() * 16) | 0;
                    var v = c === 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                  });
                };
              }
            })();
          `}
        </Script>
      </head>
      <body
        className={cn(
          playfair.variable,
          ptSans.variable,
          'min-h-screen bg-background font-body antialiased'
        )}
      >
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
            <Header menu={headerMenu.items ?? []} siteSettings={siteSettings} />
            <main className="flex-1">{children}</main>
            <Footer menu={footerMenu.items ?? []} siteSettings={siteSettings} />
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
