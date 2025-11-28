'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/20 border-4 border-green-500 mb-6">
            <svg
              className="w-12 h-12 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            You're On The List!
          </h1>
          <p className="text-xl text-gray-300">
            Thank you for joining our waitlist
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 md:p-12 shadow-2xl">
          {/* Confirmation Message */}
          <div className="text-center mb-8">
            {email && (
              <div className="inline-block px-6 py-3 bg-blue-500/20 border border-blue-400 rounded-lg mb-6">
                <p className="text-blue-300 font-medium">
                  Confirmation sent to: <span className="font-bold">{email}</span>
                </p>
              </div>
            )}

            <h2 className="text-2xl font-bold text-white mb-4">
              What Happens Next?
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              We're working hard to bring you the best portfolio tracking experience.
              We'll send you an email as soon as we're ready to launch!
            </p>
          </div>

          {/* Next Steps */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold">1</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Check Your Email</h3>
                <p className="text-gray-400 text-sm">
                  We've sent a confirmation to your inbox. Make sure to whitelist us!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Stay Tuned</h3>
                <p className="text-gray-400 text-sm">
                  We'll notify you when Portfolio Tracker is ready to launch
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold">3</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Get Early Access</h3>
                <p className="text-gray-400 text-sm">
                  As a waitlist member, you'll get priority access when we launch
                </p>
              </div>
            </div>
          </div>

          {/* Features Preview */}
          <div className="border-t border-gray-700 pt-8">
            <h3 className="text-xl font-bold text-white text-center mb-4">
              What You'll Get
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Real-time portfolio tracking</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>AI-powered insights</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Advanced risk analytics</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Investment thesis tracking</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-8 pt-8 border-t border-gray-700">
            <p className="text-gray-400 mb-4">
              Changed your mind or want to update your email?
            </p>
            <Link
              href="/coming-soon"
              className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Update My Information
            </Link>
          </div>
        </div>

        {/* Social Sharing (Optional) */}
        <div className="text-center mt-8">
          <p className="text-gray-400 mb-4">Help us spread the word!</p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700">
              Share on Twitter
            </button>
            <button className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700">
              Share on LinkedIn
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 Portfolio Tracker. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
