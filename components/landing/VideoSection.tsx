"use client";
import React from 'react';
import { Play } from 'lucide-react';

const VideoSection = () => {
    return (
        <section className="relative py-32 px-6 z-20 overflow-hidden">
            <div className="container mx-auto text-center mb-16 relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">See it in action</h2>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg">Watch how StockBuddy analyzes millions of data points to keep you sane.</p>
            </div>

            <div className="container mx-auto relative max-w-6xl">
                {/* Video Glow */}
                <div className="absolute inset-0 bg-indigo-600/30 blur-[100px] rounded-full scale-75 pointer-events-none"></div>

                {/* Glass Molded Container */}
                <div className="video-molded-glass p-3 relative transform hover:scale-[1.01] transition-transform duration-[1500ms]">
                    <div className="relative rounded-[24px] overflow-hidden aspect-video bg-black group cursor-pointer">
                        {/* Mock Video Content */}
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=2560&auto=format&fit=crop')] bg-cover bg-center opacity-60 group-hover:opacity-40 transition-opacity duration-700 scale-105 group-hover:scale-100"></div>

                        {/* Fake UI Elements in Video */}
                        <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80 backdrop-blur-md"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80 backdrop-blur-md"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80 backdrop-blur-md"></div>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/70 uppercase tracking-widest">
                                REC • 00:24
                            </div>
                        </div>

                        {/* Big Play Button (Slowed Hover) */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center group-hover:scale-110 transition-all duration-700 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                                <div className="w-16 h-16 rounded-full bg-white text-indigo-900 flex items-center justify-center shadow-xl">
                                    <Play className="w-6 h-6 fill-current ml-1" />
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black/90 to-transparent"></div>
                        <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                            <div>
                                <div className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider">Live Demo</div>
                                <h3 className="text-2xl md:text-3xl font-bold text-white">Predicting the Crash</h3>
                            </div>
                            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-white/80">
                                <span>Analyzing NVDA</span>
                                <div className="w-12 h-0.5 bg-white/20 rounded-full overflow-hidden">
                                    <div className="w-1/2 h-full bg-indigo-500"></div>
                                </div>
                                <span>01:45</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default VideoSection;