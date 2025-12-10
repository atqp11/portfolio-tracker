"use client";
import React from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="relative z-10 py-20 border-t border-white/5 bg-[#020205]">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="text-indigo-500 w-8 h-8" />
                            <span className="font-bold text-2xl tracking-tight">StockBuddy</span>
                        </div>
                        <p className="text-gray-500 max-w-sm leading-relaxed">
                            The antidote to financial anxiety. Built for long-term investors who want to sleep at night.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                        <div>
                            <h4 className="font-bold text-white mb-4">Product</h4>
                            <ul className="space-y-3 text-sm text-gray-500">
                                <li><a href="#features" className="hover:text-indigo-400 transition-colors">Features</a></li>
                                <li><Link href="/pricing" className="hover:text-indigo-400 transition-colors">Pricing</Link></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Mobile App</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-4">Company</h4>
                            <ul className="space-y-3 text-sm text-gray-500">
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Manifesto</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-indigo-400 transition-colors">Careers</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-4">Legal</h4>
                            <ul className="space-y-3 text-sm text-gray-500">
                                <li><Link href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
                                <li><Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-gray-600 text-sm">
                        © 2025 StockBuddy Inc. Not financial advice.
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="text-gray-500 hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="text-gray-500 hover:text-white transition-colors">Discord</a>
                        <a href="#" className="text-gray-500 hover:text-white transition-colors">LinkedIn</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;