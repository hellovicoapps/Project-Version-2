import { Shield, Lock, Eye, Globe, Mail, Phone, Building, CheckCircle2, AlertCircle, ArrowLeft, FileText, UserCheck, Share2, Database, Trash2, RefreshCw } from "lucide-react";
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

export default function PrivacyPolicy() {
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
        <h1 className="text-5xl font-bold text-black tracking-tight leading-tight">Privacy Policy</h1>
        <p className="text-black text-lg">Last Updated: March 3, 2026 • Effective: March 3, 2026</p>
      </div>

      <div className="space-y-16">
        <Section title="1. Introduction">
          <p>Welcome to Vico AI ("we," "our," or "us"). Vico AI provides an AI-powered voice receptionist service that helps businesses manage incoming calls, book appointments, and collect customer information through natural voice conversations.</p>
          <p>This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile application, and AI voice services (collectively, the "Service"). Please read this Privacy Policy carefully. By using the Service, you agree to the collection and use of information in accordance with this policy.</p>
        </Section>

        <Section title="2. Information We Collect">
          <SubSection title="2.1 Information You Provide Directly">
            <ul className="space-y-2">
              {[
                { label: "Account Information", detail: "When you register for an account, we collect your name, email address, password, and optionally your profile picture." },
                { label: "Business Information", detail: "Business name, operating hours, services offered, location, and frequently asked questions." },
                { label: "Customer Contact Information", detail: "Names, phone numbers, and email addresses of your customers who interact with our voice AI service." },
                { label: "Knowledge Base Content", detail: "Text, Q&A pairs, and files you upload to train your AI receptionist." }
              ].map((item, i) => (
                <li key={i}>
                  <strong className="text-black">{item.label}:</strong> {item.detail}
                </li>
              ))}
            </ul>
          </SubSection>

          <SubSection title="2.2 Information Collected Automatically">
            <ul className="space-y-2">
              {[
                { label: "Voice Recordings and Transcripts", detail: "Audio recordings and text transcriptions of calls made through our AI voice service." },
                { label: "Call Metadata", detail: "Call duration, timestamps, call status, and outcomes." },
                { label: "Usage Data", detail: "Information about how you interact with our Service, including features used, pages visited, and actions taken." },
                { label: "Device Information", detail: "Browser type, operating system, device identifiers, and IP address." },
                { label: "Cookies and Tracking Technologies", detail: "We use cookies and similar technologies to maintain your session and improve your experience." }
              ].map((item, i) => (
                <li key={i}>
                  <strong className="text-black">{item.label}:</strong> {item.detail}
                </li>
              ))}
            </ul>
          </SubSection>

          <SubSection title="2.3 Information from Third Parties">
            <ul className="space-y-2">
              {[
                { label: "Google OAuth", detail: "If you sign in using Google, we receive your name, email address, and profile picture from Google." },
                { label: "Google Calendar", detail: "If you connect your Google Calendar, we access calendar availability to book appointments on your behalf." },
                { label: "Integration Partners", detail: "Information from services you connect, such as Botcake/Facebook Messenger for customer notifications." }
              ].map((item, i) => (
                <li key={i}>
                  <strong className="text-black">{item.label}:</strong> {item.detail}
                </li>
              ))}
            </ul>
          </SubSection>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information we collect solely for the following purposes related to providing and improving our Service:</p>
          <ul className="space-y-2">
            {[
              "Service Delivery: To provide and maintain our AI voice receptionist service, process calls, book appointments, and manage your account.",
              "AI Personalization: We use your business information and knowledge base content to generate responses for your AI receptionist. This content is used only to provide your configured service. We do not use your business content to train shared or public AI models.",
              "Service Communications: To send you essential service updates, security alerts, and support messages directly related to your use of our Service.",
              "Service Improvement: To understand how our Service is used and improve functionality and user experience.",
              "Legal Compliance: To comply with legal obligations and protect our rights.",
              "Security: To detect, prevent, and address fraud, abuse, and security issues."
            ].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <div className="pt-4">
            <p className="font-bold">We do NOT use your information for:</p>
            <ul className="list-disc list-inside">
              <li>Advertising or marketing purposes unrelated to our Service</li>
              <li>Selling to third parties</li>
              <li>Training general-purpose AI models</li>
              <li>Any purpose unrelated to providing or improving the Vico AI service</li>
            </ul>
          </div>
        </Section>

        <Section title="4. How We Share Your Information">
          <p>We may share your information in the following circumstances:</p>
          <ul className="space-y-2">
            {[
              "Service Providers: With third-party vendors who perform services on our behalf (e.g., Google Cloud for AI processing, PayPal for payments, email service providers).",
              "Business Transfers: In connection with a merger, acquisition, or sale of assets.",
              "Legal Requirements: When required by law, court order, or government request.",
              "Protection of Rights: To protect the rights, property, or safety of Vico AI, our users, or others.",
              "With Your Consent: When you have given us explicit permission to share your information."
            ].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="font-bold">We do not sell your personal information to third parties.</p>
        </Section>

        <Section title="5. Data Retention">
          <p>We retain your information for as long as your account is active or as needed to provide you services. Specifically:</p>
          <ul className="space-y-2">
            {[
              "Account Data: Retained until you delete your account.",
              "Call Recordings and Transcripts: Retained for 90 days, unless you configure a different retention period.",
              "Usage Records: Retained for 7 years for tax and legal compliance.",
              "Anonymized Analytics: May be retained indefinitely in aggregate form."
            ].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p>You can request deletion of your data at any time by contacting us or using the account deletion feature in your dashboard settings.</p>
        </Section>

        <Section title="6. Data Security">
          <p>We implement appropriate technical and organizational security measures to protect your information, including:</p>
          <ul className="space-y-2">
            {[
              "Encryption of data in transit (TLS/SSL) and at rest",
              "Secure authentication with JWT tokens and session management",
              "Rate limiting to prevent abuse and brute-force attacks",
              "Regular security audits and vulnerability assessments",
              "Access controls and authentication for administrative functions",
              "Secure password hashing using industry-standard algorithms"
            ].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="text-sm italic">While we strive to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.</p>
        </Section>

        <Section title="7. Your Rights and Choices">
          <p>Depending on your location, you may have the following rights:</p>
          <ul className="space-y-4">
            {[
              { label: "Access", detail: "Request a copy of your personal data." },
              { label: "Correction", detail: "Request correction of inaccurate data." },
              { label: "Deletion", detail: "Request deletion of your personal data." },
              { label: "Portability", detail: "Request your data in a portable format." },
              { label: "Objection", detail: "Object to certain processing of your data." },
              { label: "Withdrawal of Consent", detail: "Withdraw consent where processing is based on consent." }
            ].map((item, i) => (
              <li key={i}>
                <strong className="block">{item.label}</strong>
                <span className="text-sm">{item.detail}</span>
              </li>
            ))}
          </ul>
          <p>To exercise these rights, please contact us at the email address provided below. We will respond to your request within 30 days.</p>
        </Section>

        <Section title="8. Google API Services User Data Policy">
          <p>Vico AI's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-black underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
          
          <SubSection title="8.1 What Google Data We Access">
            <ul className="space-y-2">
              <li><strong>Google Sign-In:</strong> Your name, email address, and profile picture for authentication purposes only.</li>
              <li><strong>Google Calendar:</strong> Your calendar availability and events to check scheduling conflicts and create appointment bookings on your behalf.</li>
              <li><strong>Gmail (Send Only):</strong> Permission to send booking confirmation emails to your customers on your behalf.</li>
            </ul>
          </SubSection>

          <SubSection title="8.2 How We Use Google User Data">
            <p>Google user data is used exclusively to provide and improve the core functionality of Vico AI:</p>
            <ul className="space-y-2">
              <li>To authenticate and identify you when you sign in</li>
              <li>To check your calendar availability when customers request appointments</li>
              <li>To create calendar events for confirmed bookings</li>
              <li>To send booking confirmation emails to your customers</li>
            </ul>
          </SubSection>

          <SubSection title="8.3 Limited Use Disclosure">
            <p>Vico AI strictly adheres to Google's Limited Use requirements:</p>
            <ul className="space-y-2">
              <li>We ONLY use Google user data to provide or improve user-facing features that are prominent in our application's user interface.</li>
              <li>We do NOT use Google user data for advertising purposes.</li>
              <li>We do NOT use Google user data for retargeting, remarketing, or interest-based advertising.</li>
              <li>We do NOT sell Google user data to third parties.</li>
              <li>We do NOT use Google user data for purposes unrelated to providing or improving Vico AI's core functionality.</li>
              <li>We do NOT transfer Google user data to third parties except as necessary to provide our Service, comply with laws, or with your explicit consent.</li>
            </ul>
          </SubSection>

          <SubSection title="8.4 Human Access to Google Data">
            <p>Human access to Google user data is limited to:</p>
            <ul className="space-y-2">
              <li>Situations where access is necessary to respond to your support request</li>
              <li>Security investigations or compliance with legal requirements</li>
              <li>Where you have provided explicit consent</li>
            </ul>
            <p className="text-sm italic">All employees with potential access to Google user data are bound by confidentiality obligations.</p>
          </SubSection>

          <SubSection title="8.5 Revoking Access">
            <p>You can revoke Vico AI's access to your Google data at any time by:</p>
            <ul className="space-y-2">
              <li>Disconnecting your Google Calendar from your Vico AI dashboard settings</li>
              <li>Visiting your Google Account permissions and removing Vico AI</li>
              <li>Deleting your Vico AI account</li>
            </ul>
          </SubSection>
        </Section>

        <Section title="9. International Data Transfers">
          <p>Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country. We take appropriate safeguards to ensure that your personal information remains protected in accordance with this Privacy Policy.</p>
        </Section>

        <Section title="10. Children's Privacy">
          <p>Our Service is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If we become aware that we have collected personal information from a child under 16, we will take steps to delete that information.</p>
        </Section>

        <Section title="11. Changes to This Privacy Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. For significant changes, we will provide additional notice, such as an email notification. Your continued use of the Service after any changes constitutes acceptance of the updated Privacy Policy.</p>
        </Section>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-black tracking-tight">12. Contact Us</h2>
          <p className="text-black text-lg leading-relaxed">If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
          <div className="space-y-2">
            <p className="text-black font-medium">Email: hello.vicoapps@gmail.com</p>
            <p className="text-black font-medium">Address: Pasig City, Metro Manila, Philippines</p>
          </div>
          <p className="text-black text-sm pt-8 italic">By using Vico AI, you acknowledge that you have read and understood this Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}
