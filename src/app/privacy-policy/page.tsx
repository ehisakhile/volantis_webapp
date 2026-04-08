import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Privacy Policy - Volantislive",
  description: "Learn about how Volantislive collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 md:pt-32">
        <Container>
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-navy-900 mb-8">
              Privacy Policy
            </h1>

            <div className="prose prose-lg max-w-none text-navy-700">
              <p className="text-sm text-navy-600 mb-8">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">1. Information We Collect</h2>
                <p className="mb-4">
                  We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Name and contact information</li>
                  <li>Account credentials and profile information</li>
                  <li>Audio content you create or upload</li>
                  <li>Communication preferences</li>
                </ul>
                
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">2. How We Use Your Information</h2>
                <p className="mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and manage your account</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Communicate with you about products, services, and promotions</li>
                  <li>Monitor and analyze usage patterns and trends</li>
                  <li>Protect against fraud and unauthorized access</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">3. Information Sharing and Disclosure</h2>
                <p className="mb-4">
                  We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>With service providers who assist us in operating our platform</li>
                  <li>When required by law or to protect our rights</li>
                  <li>In connection with a business transfer or acquisition</li>
                  <li>With your explicit consent</li>
                </ul>
                <p className="font-semibold text-navy-900">
                  We never share your personal information with third parties for their marketing purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">4. Data Security</h2>
                <p className="mb-4">
                  We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and authentication requirements</li>
                  <li>Secure data storage and backup systems</li>
                </ul>
                <p>
                  However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">5. Data Retention</h2>
                <p className="mb-4">
                  We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law. When we no longer need your information, we will securely delete or anonymize it.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">6. Your Data Rights</h2>
                <p className="mb-4">
                  Depending on your location, you may have certain rights regarding your personal information:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                  <li><strong>Opt-out:</strong> Opt out of certain data processing activities</li>
                </ul>
                <p>
                  To exercise these rights, please contact us using the information provided below.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">7. Children's Privacy</h2>
                <p className="mb-4">
                  Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information promptly.
                </p>
                <p>
                  For users between 13 and 18 years of age, we recommend that you discuss our Privacy Policy with a parent or guardian before using our services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">8. Cookies and Tracking</h2>
                <p className="mb-4">
                  We use cookies and similar technologies to enhance your experience with our services. You can control cookie settings through your browser preferences, though disabling cookies may affect the functionality of our platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">9. International Data Transfers</h2>
                <p className="mb-4">
                  Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">10. Changes to This Privacy Policy</h2>
                <p className="mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of our services after such changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">11. Contact Information</h2>
                <p className="mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-navy-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> notifiications@volantislive.com</p>
                  <p><strong>Address:</strong> Volantislive, Nigeria</p>
                </div>
              </section>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}