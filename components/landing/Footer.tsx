"use client";
import React from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="relative z-10 py-20 bg-[#0a001f] overflow-hidden">
            {/* Liquid glass background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient orbs for depth */}
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-600/15 rounded-full blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-[150px]" />
            </div>
            
            {/* Glass panel container */}
            <div className="container mx-auto px-6 relative">
                <div 
                    className="relative rounded-3xl p-10 md:p-12"
                    style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }}
                >
                    {/* Inner glow effect */}
                    <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12 relative z-10">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/10">
                                    <TrendingUp className="text-white w-5 h-5" />
                                </div>
                                <span className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                                    StockBuddy
                                </span>
                            </div>
                            <p className="text-gray-400 max-w-sm leading-relaxed">
                                The antidote to financial anxiety. Built for long-term investors who want to sleep at night.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                            <div>
                                <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Product</h4>
                                <ul className="space-y-3 text-sm text-gray-400">
                                    <li><a href="#features" className="hover:text-indigo-300 transition-colors duration-300">Features</a></li>
                                    <li><Link href="/pricing" className="hover:text-indigo-300 transition-colors duration-300">Pricing</Link></li>
                                    <li><a href="#" className="hover:text-indigo-300 transition-colors duration-300">Mobile App</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Company</h4>
                                <ul className="space-y-3 text-sm text-gray-400">
                                    <li><a href="#" className="hover:text-indigo-300 transition-colors duration-300">Manifesto</a></li>
                                    <li><a href="#" className="hover:text-indigo-300 transition-colors duration-300">Blog</a></li>
                                    <li><a href="#" className="hover:text-indigo-300 transition-colors duration-300">Careers</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Legal</h4>
                                <ul className="space-y-3 text-sm text-gray-400">
                                    <li><Link href="/privacy" className="hover:text-indigo-300 transition-colors duration-300">Privacy Policy</Link></li>
                                    <li><Link href="/terms" className="hover:text-indigo-300 transition-colors duration-300">Terms of Service</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        <div className="text-gray-500 text-sm">
                            © 2025 StockBuddy Inc. Not financial advice.
                        </div>
                        <div className="flex gap-6">
                            <a href="#" className="text-gray-400 hover:text-indigo-300 transition-colors duration-300 text-sm font-medium">Twitter</a>
                            <a href="#" className="text-gray-400 hover:text-indigo-300 transition-colors duration-300 text-sm font-medium">Discord</a>
                            <a href="#" className="text-gray-400 hover:text-indigo-300 transition-colors duration-300 text-sm font-medium">LinkedIn</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;