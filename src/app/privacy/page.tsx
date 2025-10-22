import {Breadcrumb} from '@/components/breadcrumb';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Tour Insights Hub - How we collect, use, and protect your data',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  const lastUpdated = 'January 20, 2025';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Breadcrumb items={[{label: 'Privacy Policy'}]} className="mb-6" />

        <h1 className="text-4xl font-headline font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Welcome to Tour Insights Hub ("we," "our," or "us"). We are committed to protecting your
              personal information and your right to privacy. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you visit our website and use
              our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-2">2.1 Personal Information</h3>
            <p>We may collect personal information that you voluntarily provide to us when you:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Submit feedback or reviews</li>
              <li>Create an account</li>
              <li>Contact us via email or contact forms</li>
              <li>Subscribe to our newsletter</li>
            </ul>
            <p>This information may include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name</li>
              <li>Email address</li>
              <li>Country of residence</li>
              <li>Tour preferences and feedback</li>
              <li>Photos you upload (if you choose to submit them)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Automatically Collected Information</h3>
            <p>When you visit our website, we automatically collect certain information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Pages you visit and time spent on each page</li>
              <li>Referring website addresses</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and maintain our services</li>
              <li>Improve and personalize your experience</li>
              <li>Respond to your comments, questions, and provide customer support</li>
              <li>Send you marketing communications (with your consent)</li>
              <li>Analyze usage patterns and improve our website</li>
              <li>Prevent fraud and enhance security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How We Share Your Information</h2>
            <p>We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Service Providers:</strong> We use third-party service providers (like Firebase,
                Google Analytics) to help us operate our website
              </li>
              <li>
                <strong>Legal Requirements:</strong> If required by law or to protect our rights
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition
              </li>
              <li>
                <strong>With Your Consent:</strong> When you explicitly agree to share information
              </li>
            </ul>
            <p className="mt-4">
              <strong>We do not sell your personal information to third parties.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our website and store
              certain information. You can control cookies through your browser settings.
            </p>
            <p>Types of cookies we use:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for website functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your
              personal information. However, no method of transmission over the Internet is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Privacy Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Request corrections to inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
              <li><strong>Portability:</strong> Request transfer of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at the email provided in the Contact section.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
            <p>
              Our services are not directed to individuals under the age of 13. We do not knowingly
              collect personal information from children. If you believe we have collected information
              from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of
              residence. We take appropriate safeguards to ensure your data is treated securely and in
              accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our privacy practices, please contact
              us at:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p><strong>Email:</strong> privacy@tourinsightshub.com</p>
              <p><strong>Website:</strong> {process.env.NEXT_PUBLIC_SITE_URL || 'https://tourinsightshub.com'}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
