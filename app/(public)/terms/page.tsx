'use client';

import Link from 'next/link';
import { Scale, FileText, AlertTriangle, ShieldCheck, ArrowLeft, Gavel } from 'lucide-react';

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

export default function TermsPage() {
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
              <Scale className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gradient">
                Terms of Service
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
                  <span className="text-indigo-400">1.</span> Agreement to Terms
                </h2>
                <p className="leading-relaxed">
                  By accessing and using Portfolio Tracker ("the Service"), you agree to be bound by these
                  Terms of Service. If you do not agree to abide by the above, please do not use this
                  service.
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">2.</span> Use License
                </h2>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <p className="mb-4">
                    Permission is granted to temporarily download one copy of the materials (information or
                    software) on Portfolio Tracker for personal, non-commercial transitory viewing only.
                    This is the grant of a license, not a transfer of title, and under this license you may
                    not:
                  </p>
                  <ul className="grid gap-3">
                    {[
                      "Modify or copy the materials",
                      "Use the materials for any commercial purpose or public display",
                      "Attempt to decompile or reverse engineer any software",
                      "Remove any copyright or other proprietary notations",
                      "Transfer the materials to another person or 'mirror' the materials",
                      "Use automated tools (bots, scrapers, etc.) to access the Service"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">3.</span> Disclaimer
                </h2>
                <div className="space-y-4">
                  <p>
                    The materials on Portfolio Tracker are provided "as is". Portfolio Tracker makes no
                    warranties, expressed or implied, and hereby disclaims and negates all other warranties
                    including, without limitation, implied warranties or conditions of merchantability,
                    fitness for a particular purpose, or non-infringement of intellectual property or other
                    violation of rights.
                  </p>
                  <div className="bg-indigo-500/10 p-4 rounded-lg border border-indigo-500/20 flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-1" />
                    <p className="text-sm m-0">
                      The financial information provided by Portfolio Tracker is for informational purposes
                      only. It is not intended as professional financial, investment, or tax advice. Users
                      should consult with qualified financial advisors before making investment decisions.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">4.</span> Limitations
                </h2>
                <p>
                  In no event shall Portfolio Tracker or its suppliers be liable for any damages
                  (including, without limitation, damages for loss of data or profit, or due to business
                  interruption) arising out of the use or inability to use the materials on Portfolio
                  Tracker, even if Portfolio Tracker or an authorized representative has been notified
                  orally or in writing of the possibility of such damage.
                </p>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">5.</span> Subscription and Billing
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    "Subscription charges will be billed to your designated payment method monthly",
                    "All prices are in USD unless otherwise stated",
                    "We reserve the right to change pricing with 30 days' notice",
                    "If you cancel, you retain access through the end of your billing period",
                    "Refunds are available within 7 days of purchase",
                    "All charges are non-refundable after the 7-day trial period"
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-lg border border-white/5">
                      <span className="block text-indigo-400 text-lg mb-2">•</span>
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">6.</span> Termination
                </h2>
                <p>
                  Portfolio Tracker may terminate or suspend your account immediately, without prior
                  notice or liability, for any reason whatsoever, including but not limited to if you
                  breach the Terms.
                </p>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                  <span className="text-indigo-400">7.</span> Governing Law
                </h2>
                <div className="flex items-center gap-3">
                  <Gavel className="w-5 h-5 text-indigo-400" />
                  <p className="m-0">
                    These terms and conditions are governed by and construed in accordance with the laws of
                    the jurisdiction in which the Company is established.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
