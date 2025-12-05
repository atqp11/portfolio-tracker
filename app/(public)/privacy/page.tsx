'use client';

import Link from 'next/link';
import { Shield, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';

// --- CSS for High-End Visuals ---
const styles = `
  /* Aurora & Blob Animations */
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 15s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  
  /* Glassmorphism Utilities */
  .glass-panel {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  }

  .text-gradient {
    background: linear-gradient(to right, #fff, #a5b4fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 font-sans">
      <style>{styles}</style>

      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45vw] h-[45vw] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="glass-panel rounded-2xl p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gradient">
                Privacy Policy
              </h1>
              <p className="text-gray-400 mt-1">
                Last Updated: January 2024
              </p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white prose-a:text-indigo-400 hover:prose-a:text-indigo-300">
            <div className="space-y-12">
              {/* Section 1 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">1.</span> Introduction
                </h2>
                <p className="leading-relaxed">
                  Portfolio Tracker ("we," "us," "our," or "Company") operates the Portfolio Tracker
                  website and application (collectively, the "Service"). We are committed to protecting your 
                  personal information and your right to privacy. This Privacy Policy explains our
                  practices regarding the collection, use, and disclosure of your information when you use our Service.
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">2.</span> Information We Collect
                </h2>
                
                <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
                  <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    2.1 Information You Provide
                  </h3>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Name, email address, and password when you create an account</li>
                    <li>Additional profile information (preferences, subscription tier)</li>
                    <li>Payment information (processed securely through Stripe)</li>
                    <li>Stock holdings, portfolio composition, and transaction history</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    2.2 Information Collected Automatically
                  </h3>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Pages viewed, time spent on pages, and navigation patterns</li>
                    <li>Browser type, operating system, and device information</li>
                    <li>IP address and general geographic location</li>
                    <li>Session cookies for authentication and preferences</li>
                  </ul>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">3.</span> How We Use Information
                </h2>
                <p className="mb-4">We use collected information for the following purposes:</p>
                <ul className="grid md:grid-cols-2 gap-4">
                  {[
                    "Creating and maintaining your account",
                    "Processing subscriptions and payments",
                    "Delivering portfolio tracking features",
                    "Providing AI-powered financial insights",
                    "Analyzing usage patterns to improve features",
                    "Detecting and preventing fraud"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-indigo-400 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">4.</span> Data Sharing
                </h2>
                <p className="mb-4">
                  We do <strong className="text-indigo-300">NOT</strong> sell your personal information. We may share information with trusted service
                  providers to help us operate our business:
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <strong className="text-white block mb-1">Stripe</strong>
                    <span className="text-sm text-gray-400">For secure payment processing (PCI-DSS compliant)</span>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <strong className="text-white block mb-1">Vercel</strong>
                    <span className="text-sm text-gray-400">For hosting and global deployment</span>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <strong className="text-white block mb-1">Google</strong>
                    <span className="text-sm text-gray-400">For analytics and authentication services</span>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <strong className="text-white block mb-1">Supabase</strong>
                    <span className="text-sm text-gray-400">For secure database and user authentication</span>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">5.</span> Data Security
                </h2>
                <div className="flex gap-4 items-start bg-indigo-500/10 p-6 rounded-xl border border-indigo-500/20">
                  <Lock className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />
                  <p className="text-gray-300 m-0">
                    We implement appropriate technical and organizational security measures to protect
                    your personal information. However, please also remember that we cannot guarantee
                    that the internet itself is 100% secure. Although we will do our best to protect
                    your personal information, transmission of personal information to and from our
                    Service is at your own risk.
                  </p>
                </div>
              </section>

              {/* Contact */}
              <section className="border-t border-white/10 pt-8">
                <h2 className="text-xl font-semibold text-white mb-4">Contact Us</h2>
                <p>
                  If you have questions or comments about this policy, you may email us at{' '}
                  <a href="mailto:support@portfoliotracker.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    support@portfoliotracker.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
