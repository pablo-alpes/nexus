'use client';

import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-600">
                Nexus Cloud
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-700 hover:text-primary-600">
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using Nexus Cloud ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Nexus Cloud is a compliance management tool designed to assist organizations in identifying and managing compliance requirements 
                related to the Digital Operational Resilience Act (DORA) and other applicable regulations.
              </p>
              <p className="text-gray-700 leading-relaxed">
                The Service provides:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Questionnaire-based control identification</li>
                <li>Automated gap analysis</li>
                <li>Remediation planning tools</li>
                <li>Evidence management capabilities</li>
                <li>Compliance tracking and reporting</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Important Disclaimers</h2>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <h3 className="font-semibold text-yellow-800 mb-2">3.1 No Legal or Regulatory Advice</h3>
                <p className="text-yellow-700 text-sm">
                  Nexus Cloud is a <strong>tool to assist with compliance management</strong>. It does not provide legal, regulatory, or compliance advice. 
                  The Service is not a substitute for professional legal or compliance consultation.
                </p>
              </div>

              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <h3 className="font-semibold text-red-800 mb-2">3.2 No Guarantee of Compliance</h3>
                <p className="text-red-700 text-sm">
                  <strong>Nexus Cloud does not guarantee compliance</strong> with DORA, ISO standards, or any other regulations. 
                  The Service provides recommendations and tools based on automated analysis, but:
                </p>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1 mt-2 ml-4">
                  <li>Compliance is your sole responsibility</li>
                  <li>You must validate all identified controls and requirements</li>
                  <li>You must consult with qualified compliance experts</li>
                  <li>You must ensure accuracy of all information entered into the Service</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">3.3 Automated Analysis Limitations</h3>
                <p className="text-blue-700 text-sm">
                  The Service uses automated rule engines and algorithms to identify applicable controls and analyze compliance gaps. 
                  These automated processes:
                </p>
                <ul className="list-disc list-inside text-blue-700 text-sm space-y-1 mt-2 ml-4">
                  <li>May not capture all applicable requirements for your specific situation</li>
                  <li>May include controls that are not applicable to your organization</li>
                  <li>May miss controls that are applicable but not identified by the questionnaire</li>
                  <li>Are based on general interpretations of regulations, not legal advice</li>
                </ul>
              </div>

              <h3 className="font-semibold text-gray-900 mb-2 mt-6">3.4 "As Is" Service</h3>
              <p className="text-gray-700 leading-relaxed">
                The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, 
                including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. User Responsibilities</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are solely responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Ensuring Compliance:</strong> You are responsible for ensuring your organization's compliance with all applicable regulations, including DORA</li>
                <li><strong>Accuracy of Information:</strong> You must provide accurate, complete, and up-to-date information when using the Service</li>
                <li><strong>Review and Validation:</strong> You must review and validate all identified controls, requirements, and gap analyses</li>
                <li><strong>Professional Consultation:</strong> You must consult with qualified legal, compliance, or regulatory experts as needed</li>
                <li><strong>Regular Updates:</strong> You must regularly update your compliance status and information in the Service</li>
                <li><strong>Evidence Management:</strong> You are responsible for maintaining appropriate evidence and documentation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>To the maximum extent permitted by law:</strong>
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Nexus Cloud, its operators, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Nexus Cloud shall not be liable for any compliance failures, regulatory violations, fines, penalties, or legal actions resulting from your use of the Service</li>
                <li>Nexus Cloud shall not be liable for any errors, omissions, or inaccuracies in the Service's automated analysis or recommendations</li>
                <li>Nexus Cloud's total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to indemnify, defend, and hold harmless Nexus Cloud, its operators, affiliates, and their respective officers, 
                directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, or expenses (including 
                reasonable attorneys' fees) arising out of or relating to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms of Service</li>
                <li>Your organization's compliance failures or regulatory violations</li>
                <li>Any inaccurate or incomplete information you provide to the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Data and Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Your use of the Service is also governed by our Privacy Policy. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>Ensuring compliance with data protection regulations when uploading evidence or information</li>
                <li>Not uploading sensitive or confidential information without proper authorization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Modifications to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                Nexus Cloud reserves the right to modify these Terms of Service at any time. We will notify users of material changes 
                via email or through the Service. Your continued use of the Service after such modifications constitutes acceptance of 
                the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <p className="text-gray-700 leading-relaxed">
                Nexus Cloud reserves the right to suspend or terminate your access to the Service at any time, with or without cause 
                or notice, for any reason including violation of these Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms of Service shall be governed by and construed in accordance with applicable laws, without regard to 
                conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us through the Service or at the contact 
                information provided in your account.
              </p>
            </section>

            <div className="bg-gray-100 p-6 rounded-lg mt-8">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>By using Nexus Cloud, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</strong> 
                You understand that Nexus Cloud is a tool to assist with compliance management and does not guarantee compliance. 
                You are solely responsible for ensuring your organization's compliance with all applicable regulations.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              href="/"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
