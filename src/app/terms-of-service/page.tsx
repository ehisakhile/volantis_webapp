import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Terms of Service - Volantislive",
  description: "Read our terms of service and usage guidelines for Volantislive platform.",
};

export default function TermsOfServicePage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 md:pt-32">
        <Container>
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-navy-900 mb-8">
              Terms of Service
            </h1>

            <div className="prose prose-lg max-w-none text-navy-700">
              <p className="text-sm text-navy-600 mb-8">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">1. Acceptance of Terms</h2>
                <p className="mb-4">
                  By accessing and using Volantislive ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">2. Eligibility</h2>
                <p className="mb-4">
                  You must be at least 13 years old to use our Service. By using our Service, you represent and warrant that you meet this age requirement and have the legal capacity to enter into this agreement.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">3. Account Registration</h2>
                <p className="mb-4">
                  To access certain features of our Service, you must register for an account. When you register, you agree to:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain and update your information</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Be responsible for all activities under your account</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">4. User Content</h2>
                <p className="mb-4">
                  Our Service allows you to create, upload, and share audio content. You retain ownership of your content, but by posting it, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with the Service.
                </p>
                <p className="mb-4">
                  You are solely responsible for your content and agree not to post material that:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Infringes on intellectual property rights</li>
                  <li>Contains harmful or malicious code</li>
                  <li>Violates applicable laws or regulations</li>
                  <li>Is defamatory, obscene, or offensive</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">5. Prohibited Conduct</h2>
                <p className="mb-4">
                  You agree not to engage in any of the following prohibited activities:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Violating any applicable laws or regulations</li>
                  <li>Impersonating others or providing false information</li>
                  <li>Harassing, threatening, or abusing other users</li>
                  <li>Reverse engineering or attempting to extract source code</li>
                  <li>Using the Service for commercial purposes without authorization</li>
                  <li>Distributing malware or engaging in hacking activities</li>
                  <li>Spamming or sending unsolicited communications</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">6. Intellectual Property</h2>
                <p className="mb-4">
                  The Service and its original content, features, and functionality are and will remain the exclusive property of Volantislive and its licensors. The Service is protected by copyright, trademark, and other laws.
                </p>
                <p>
                  You may not reproduce, distribute, modify, or create derivative works of our intellectual property without express written permission.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">7. Privacy</h2>
                <p className="mb-4">
                  Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">8. Disclaimer of Warranties</h2>
                <p className="mb-4">
                  THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
                <p>
                  WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">9. Limitation of Liability</h2>
                <p className="mb-4">
                  IN NO EVENT SHALL VOLANTISLIVE, ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
                </p>
                <p>
                  OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THE SERVICE SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">10. Indemnification</h2>
                <p className="mb-4">
                  You agree to defend, indemnify, and hold harmless Volantislive and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Your use and access of the Service</li>
                  <li>Your violation of any term of these Terms</li>
                  <li>Your violation of any third-party right, including without limitation any copyright, property, or privacy right</li>
                  <li>Any claim that your content caused damage to a third party</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">11. Termination</h2>
                <p className="mb-4">
                  We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                </p>
                <p>
                  Upon termination, your right to use the Service will cease immediately. All provisions of the Terms which by their nature should survive termination shall survive, including, without limitation, ownership provisions, warranty disclaimers, and limitations of liability.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">12. Changes to Terms</h2>
                <p className="mb-4">
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                </p>
                <p>
                  What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">13. Governing Law</h2>
                <p className="mb-4">
                  These Terms shall be interpreted and governed by the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">14. Contact Information</h2>
                <p className="mb-4">
                  If you have any questions about these Terms, please contact us:
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