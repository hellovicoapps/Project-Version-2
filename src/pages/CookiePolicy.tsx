import { ArrowLeft } from "lucide-react";
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

export default function CookiePolicy() {
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
        <h1 className="text-5xl font-bold text-black tracking-tight leading-tight">Cookie Policy</h1>
        <p className="text-black text-lg">Last updated: March 3, 2026. We use cookies to improve your experience on our platform.</p>
      </div>

      <div className="space-y-16">
        <Section title="What are Cookies?">
          <p>Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.</p>
          <p>Cookies help us understand how you interact with our platform, which features you use most, and how we can improve your overall experience.</p>
        </Section>

        <Section title="How We Use Cookies">
          <p>We use cookies for several purposes, including:</p>
          <ul className="space-y-2">
            {[
              "Essential cookies: Necessary for the platform to function properly",
              "Performance cookies: To analyze how users interact with our platform",
              "Functionality cookies: To remember your preferences and settings",
              "Targeting cookies: To deliver relevant advertisements and content",
              "Social media cookies: To allow you to share content on social networks"
            ].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Managing Cookies">
          <p>You can control and manage cookies in your browser settings. Most browsers allow you to block or delete cookies, but this may affect the functionality of our platform.</p>
          <p>For more information on how to manage cookies, please visit your browser's help center or visit <a href="https://www.allaboutcookies.org" className="text-black underline">www.allaboutcookies.org</a>.</p>
        </Section>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-black tracking-tight">Need Help?</h2>
          <p className="text-black text-lg leading-relaxed">If you have any questions about our Cookie Policy, please contact our support team.</p>
          <div className="space-y-2">
            <p className="text-black font-medium">Email: hello.vicoapps@gmail.com</p>
            <p className="text-black font-medium">Address: Pasig City, Metro Manila, Philippines</p>
          </div>
        </div>
      </div>
    </div>
  );
}
