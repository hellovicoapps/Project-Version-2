import { Shield, Lock, Eye, Globe, Mail, Phone, Building, CheckCircle2, AlertCircle, FileText, ArrowLeft, Activity, UserPlus, CreditCard, Ban, Database, Cpu, RefreshCw, Scale, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants";

const Section = ({ title, children }: any) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold text-black tracking-tight">{title}</h2>
    <div className="space-y-4 text-black leading-relaxed text-lg">
      {children}
    </div>
  </div>
);

const SubSection = ({ title, children }: any) => (
  <div className="space-y-2">
    <h3 className="text-xl font-bold text-black tracking-tight">{title}</h3>
    <div className="space-y-2 text-black">
      {children}
    </div>
  </div>
);

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 py-20 px-6 bg-white min-h-screen">
      <Link 
        to={ROUTES.HOME}
        className="fixed top-8 left-8 z-50 flex items-center space-x-2 text-black hover:underline transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Home</span>
      </Link>

      <div className="space-y-4">
        <h1 className="text-5xl font-bold text-black tracking-tight leading-tight">Terms of Service</h1>
        <p className="text-black text-lg">Last Updated: February 25, 2026 • Effective: February 25, 2026</p>
      </div>

      <div className="space-y-16">
        <Section title="1. Agreement to Terms">
          <p>These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Vico AI ("Company," "we," "us," or "our") governing your access to and use of the Vico AI website, applications, and AI voice receptionist services (collectively, the "Service").</p>
          <p>By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Service. These Terms apply to all visitors, users, and others who access or use the Service.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>Vico AI provides an artificial intelligence-powered voice receptionist service that enables businesses to:</p>
          <ul className="space-y-2">
            {[
              "Automatically answer incoming customer calls using AI voice technology",
              "Collect customer information through natural voice conversations",
              "Book appointments and integrate with calendar services",
              "Send confirmation emails and notifications",
              "Manage customer inquiries, complaints, and follow-up requests",
              "Access call transcripts, recordings, and analytics",
              "Train the AI with business-specific knowledge and FAQs"
            ].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="3. Account Registration and Security">
          <SubSection title="3.1 Account Creation">
            <p>To use certain features of the Service, you must register for an account. You may register using your email address and password, or through Google OAuth authentication. You agree to provide accurate, current, and complete information during registration.</p>
          </SubSection>
          <SubSection title="3.2 Account Security">
            <p>You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other security breach. We are not liable for any loss or damage arising from your failure to protect your account credentials.</p>
          </SubSection>
          <SubSection title="3.3 Account Requirements">
            <p>You must be at least 18 years old and have the legal authority to enter into these Terms. If you are using the Service on behalf of a business or organization, you represent that you have the authority to bind that entity to these Terms.</p>
          </SubSection>
        </Section>

        <Section title="4. Acceptable Use Policy">
          <p>You agree not to use the Service to:</p>
          <ul className="space-y-2">
            {[
              "Violate any applicable laws or regulations",
              "Infringe upon the intellectual property rights of others",
              "Transmit any malicious code, viruses, or harmful data",
              "Engage in fraudulent, deceptive, or misleading practices",
              "Harass, abuse, or harm another person",
              "Interfere with or disrupt the integrity or performance of the Service",
              "Attempt to gain unauthorized access to the Service or its related systems"
            ].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="5. User Content and Data">
          <SubSection title="5.1 Your Content">
            <p>You retain ownership of all content you submit to the Service, including business information, knowledge base content, and customer data. By submitting content, you grant us a limited license to use, process, and store that content solely to provide the Service to you.</p>
          </SubSection>
          <SubSection title="6.2 Call Recordings">
            <p>You are responsible for complying with all applicable laws regarding call recording, including obtaining any required consent from callers. You agree to configure your AI receptionist to provide appropriate notice of recording where required by law.</p>
          </SubSection>
          <SubSection title="6.3 Data Responsibility">
            <p>You are responsible for the accuracy and legality of all data you provide to the Service. You represent that you have all necessary rights and consents to share any personal data with us and to use our Service in connection with your business operations.</p>
          </SubSection>
        </Section>

        <Section title="6. Intellectual Property Rights">
          <SubSection title="6.1 Our Intellectual Property">
            <p>The Service, including all software, AI models, algorithms, designs, text, graphics, and other content provided by us, is owned by Vico AI or our licensors and is protected by intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without our prior written consent.</p>
          </SubSection>
          <SubSection title="6.2 Limited License">
            <p>Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your internal business purposes.</p>
          </SubSection>
          <SubSection title="6.3 Feedback">
            <p>If you provide us with feedback, suggestions, or ideas about the Service, you grant us the right to use that feedback without restriction or compensation to you.</p>
          </SubSection>
        </Section>

        <Section title="7. Third-Party Services">
          <p>The Service may integrate with third-party services, including:</p>
          <ul className="space-y-2">
            <li><strong>Google Services:</strong> For authentication, calendar integration, and AI processing</li>
            <li><strong>PayPal:</strong> For payment processing</li>
            <li><strong>Messenger Integrations:</strong> For customer notifications</li>
          </ul>
          <p>Your use of third-party services is subject to their respective terms and privacy policies. We are not responsible for the availability, accuracy, or practices of third-party services.</p>
        </Section>

        <Section title="8. Service Availability and Modifications">
          <SubSection title="8.1 Availability">
            <p>We strive to provide reliable service but do not guarantee uninterrupted or error-free operation. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.</p>
          </SubSection>
          <SubSection title="8.2 Modifications">
            <p>We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.</p>
          </SubSection>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p className="uppercase">The service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
          <p>We do not warrant that the Service will be uninterrupted, secure, or error-free, that defects will be corrected, or that the AI responses will be accurate or appropriate for your specific needs.</p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p className="uppercase">To the maximum extent permitted by law, in no event shall Vico AI, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.</p>
          <p>Our total liability for any claims arising from or related to these Terms or the Service shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.</p>
        </Section>

        <Section title="11. Indemnification">
          <p>You agree to defend, indemnify, and hold harmless Vico AI and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with:</p>
          <ul className="space-y-2">
            <li>Your access to or use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights, including privacy or intellectual property rights</li>
            <li>Any content you submit to the Service</li>
          </ul>
        </Section>

        <Section title="12. Termination">
          <p>We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.</p>
          <p>You may terminate your account at any time by using the account deletion feature in your settings or by contacting us. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.</p>
        </Section>

        <Section title="13. Governing Law and Dispute Resolution">
          <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Vico AI is incorporated, without regard to its conflict of law provisions.</p>
          <p>Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with applicable arbitration rules, except that either party may seek injunctive or other equitable relief in any court of competent jurisdiction.</p>
        </Section>

        <Section title="14. Changes to Terms">
          <p>We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this page and updating the "Last Updated" date. For significant changes, we will provide additional notice, such as an email notification.</p>
          <p>Your continued use of the Service after any changes constitutes acceptance of the new Terms. If you do not agree to the new Terms, you must stop using the Service.</p>
        </Section>

        <Section title="15. General Provisions">
          <ul className="space-y-4">
            {[
              { label: "Entire Agreement", detail: "These Terms constitute the entire agreement between you and Vico AI regarding the Service." },
              { label: "Severability", detail: "If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in effect." },
              { label: "Waiver", detail: "Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights." },
              { label: "Assignment", detail: "You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations without restriction." }
            ].map((item, i) => (
              <li key={i}>
                <strong className="block">{item.label}</strong>
                <span className="text-sm">{item.detail}</span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-black tracking-tight">16. Contact Information</h2>
          <p className="text-black text-lg leading-relaxed">If you have any questions about these Terms of Service, please contact us:</p>
          <div className="space-y-2">
            <p className="text-black font-medium">Email: hello.vicoapps@gmail.com</p>
            <p className="text-black font-medium">Address: Pasig City, Metro Manila, Philippines</p>
          </div>
          <p className="text-black text-sm pt-8 italic">By using Vico AI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
        </div>
      </div>
    </div>
  );
}
