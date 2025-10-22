import {Breadcrumb} from '@/components/breadcrumb';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Tour Insights Hub - Rules and guidelines for using our platform',
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  const lastUpdated = 'January 20, 2025';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Breadcrumb items={[{label: 'Terms of Service'}]} className="mb-6" />

        <h1 className="text-4xl font-headline font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              Welcome to Tour Insights Hub. By accessing or using our website and services, you agree to
              be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do
              not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p>
              Tour Insights Hub provides a platform for travelers to share feedback, read reviews, and
              discover tour experiences. Our services include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Submitting and viewing tour reviews and feedback</li>
              <li>Browsing tour information and stories</li>
              <li>Accessing travel-related content and resources</li>
              <li>Participating in our community</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>

            <h3 className="text-xl font-semibold mb-2">3.1 Account Creation</h3>
            <p>You may need to create an account to access certain features. You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">3.2 Account Termination</h3>
            <p>
              We reserve the right to suspend or terminate your account if you violate these Terms or
              engage in conduct that we deem inappropriate.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Content</h2>

            <h3 className="text-xl font-semibold mb-2">4.1 Content Ownership</h3>
            <p>
              You retain ownership of any content you submit (reviews, comments, photos). However, by
              submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use,
              display, and distribute your content on our platform.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">4.2 Content Guidelines</h3>
            <p>You agree that your content will not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be false, misleading, or deceptive</li>
              <li>Infringe on intellectual property rights</li>
              <li>Contain hate speech, harassment, or discrimination</li>
              <li>Include spam or unauthorized advertising</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Contain viruses or malicious code</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">4.3 Content Moderation</h3>
            <p>
              We reserve the right to review, edit, or remove any content that violates these Terms or
              that we deem inappropriate, at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Prohibited Activities</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use our services for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper functioning of our services</li>
              <li>Harvest or collect user information without consent</li>
              <li>Impersonate another person or entity</li>
              <li>Submit fake or misleading reviews</li>
              <li>Use automated tools (bots) to access our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p>
              All content on Tour Insights Hub, including text, graphics, logos, and software, is owned by
              us or our licensors and is protected by copyright, trademark, and other intellectual
              property laws. You may not use our intellectual property without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Third-Party Links and Services</h2>
            <p>
              Our website may contain links to third-party websites or services. We are not responsible
              for the content, privacy policies, or practices of third-party sites. You access third-party
              sites at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
            <p>
              Our services are provided "as is" and "as available" without warranties of any kind, either
              express or implied. We do not guarantee that our services will be uninterrupted, secure, or
              error-free.
            </p>
            <p className="mt-4">
              <strong>We do not endorse or verify the accuracy of user-submitted content.</strong> You
              use information from reviews and feedback at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Tour Insights Hub and its affiliates, officers,
              directors, employees, and agents shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from your use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Tour Insights Hub from any claims, damages, losses,
              or expenses (including legal fees) arising from your use of our services or violation of
              these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Dispute Resolution</h2>

            <h3 className="text-xl font-semibold mb-2">11.1 Governing Law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Your
              Jurisdiction], without regard to its conflict of law provisions.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">11.2 Arbitration</h3>
            <p>
              Any disputes arising from these Terms or your use of our services shall be resolved through
              binding arbitration, except where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material
              changes by posting the updated Terms on our website and updating the "Last updated" date.
              Your continued use of our services after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Severability</h2>
            <p>
              If any provision of these Terms is found to be invalid or unenforceable, the remaining
              provisions will continue to be valid and enforceable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p><strong>Email:</strong> legal@tourinsightshub.com</p>
              <p><strong>Website:</strong> {process.env.NEXT_PUBLIC_SITE_URL || 'https://tourinsightshub.com'}</p>
            </div>
          </section>

          <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg mt-8">
            <p className="text-sm">
              <strong>Important Notice:</strong> These Terms of Service are a template and should be
              reviewed by a legal professional before being used in production. Adjust the jurisdiction,
              arbitration clauses, and other legal terms to match your specific requirements and local
              laws.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
