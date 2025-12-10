"use client";
import React from 'react';
import Link from 'next/link';
import {
    Zap,
    Activity,
    AlertTriangle,
    PieChart,
    Mic,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { ChatMessage, StockTicker } from './HelperComponents';

const HeroSection = () => {
    return (
        <main className="relative z-10 pt-40 pb-20 px-6 container mx-auto">
            <div className="text-center max-w-4xl mx-auto mb-20">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 backdrop-blur-md shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
                    </span>
                    <span className="text-xs font-bold text-indigo-200 tracking-wide uppercase">Connected to Robinhood & IBKR</span>
                </div>

                <h1 className="text-6xl md:text-7xl font-extrabold leading-tight mb-8 tracking-tight drop-shadow-2xl">
                    Your portfolio is down.<br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 filter drop-shadow-[0_0_25px_rgba(168,85,247,0.4)]">
                        Don't panic sell.
                    </span>
                </h1>

                <p className="text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto mb-12 opacity-90">
                    The brutally honest AI co-pilot that anchors you to your cost basis.
                    It talks you off the ledge when the market bleeds and helps you dig into the details when you're ready.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/auth/signup"
                        className="btn-liquid-primary px-8 py-3.5 rounded-xl text-base font-bold text-white"
                    >
                        Get Started Free
                    </Link>
                    <Link
                        href="#pricing"
                        className="btn-liquid-secondary px-8 py-3.5 rounded-xl text-base font-bold text-white"
                    >
                        View Pricing
                    </Link>
                </div>
            </div>

            {/* 3D Perspective Hero Demo */}
            <div className="relative max-w-7xl mx-auto perspective-container mt-32">

                {/* Center Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>

                {/* Connecting Element (Slowed Pulse) */}
                <div className="hidden md:flex absolute top-1.2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-16 h-16 glass-panel rounded-full items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] border border-white/20 animate-[pulse_15s_infinite]">
                    <Zap className="w-8 h-8 text-amber-400 fill-current drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                </div>

                <div className="grid md:grid-cols-2 gap-8 md:gap-32 items-center">

                    {/* Left: The Panic (Red, Chaotic) - With 3D Tilt */}
                    <div className="relative hero-rotate-right group z-10">
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-red-500 to-orange-600 rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-[1800ms]"></div>
                        <div className="relative bg-[#1a0505]/90 backdrop-blur-xl rounded-[2rem] border border-red-500/30 overflow-hidden shadow-2xl h-[600px] flex flex-col">

                            {/* Window Controls */}
                            <div className="bg-red-950/30 p-4 border-b border-red-900/30 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-orange-500/50"></div>
                                </div>
                                <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Live Volatility
                                </div>
                            </div>

                            {/* Stressful Content */}
                            <div className="p-8 flex-1 flex flex-col">
                                <div className="mb-8 text-center">
                                    <div className="text-sm text-red-300 font-medium mb-2">Total Portfolio Value</div>
                                    <div className="text-5xl font-black text-white flex items-center justify-center gap-3 tracking-tight">
                                        $42,109
                                        <span className="text-2xl font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">-4.2%</span>
                                    </div>
                                    <div className="text-sm text-red-400 mt-3 font-medium bg-red-950/50 inline-block px-4 py-1 rounded-full">
                                        📉 You lost $1,840.20 today
                                    </div>
                                </div>

                                <div className="flex-1 bg-gradient-to-b from-red-900/10 to-transparent rounded-2xl p-2 border border-red-900/20 mb-6 space-y-1">
                                    <div className="px-4 py-2 text-xs font-bold text-red-300 uppercase tracking-wider">Biggest Losers</div>
                                    <StockTicker symbol="NVDA" price="840.20" change="5.4" isPositive={false} />
                                    <StockTicker symbol="TSLA" price="172.50" change="3.1" isPositive={false} />
                                    <StockTicker symbol="AMD" price="160.10" change="2.8" isPositive={false} />
                                </div>

                                <div className="mt-auto bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 items-start">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-200 leading-relaxed">
                                        <strong>Panic Indicator: High.</strong> You have checked your portfolio 14 times in the last hour. Stop it.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: The Solution (Calm, Clarity) - With 3D Tilt */}
                    <div className="relative hero-rotate-left mt-12 md:mt-0 z-20">
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-[2rem] blur opacity-40 group-hover:opacity-60 transition duration-[1800ms]"></div>
                        <div className="relative bg-[#0f0f1a]/90 backdrop-blur-2xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl h-[640px] flex flex-col w-full md:w-[110%] md:-ml-[5%]">

                            {/* Header */}
                            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-white block">StockBuddy</span>
                                        <span className="text-[10px] text-indigo-300 font-mono">AI Co-Pilot • Online</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-all duration-500"><PieChart className="w-4 h-4 text-gray-400" /></button>
                                    <button className="bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-all duration-500"><Mic className="w-4 h-4 text-gray-400" /></button>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-end scrollbar-hide">
                                <ChatMessage
                                    isAi={true}
                                    text="Hey Alex. I notice you're staring at the red charts. The market is down 2% globally, it's not just you."
                                    emotion="Context"
                                />
                                <ChatMessage
                                    isAi={false}
                                    text="I'm freaking out about NVDA. It's down 5%. Should I just sell and buy back lower?"
                                />
                                <ChatMessage
                                    isAi={true}
                                    text="Let's pause. Your cost basis on NVDA is $420. Even at $840, you're up 100%. Nothing changed fundamentally."
                                    emotion="Reality Check"
                                />
                                <ChatMessage
                                    isAi={true}
                                    text="If you sell now, you trigger a taxable event (30% short-term gains). Is paying the IRS worth the temporary relief?"
                                    emotion="Tax Logic"
                                />
                                <ChatMessage
                                    isAi={false}
                                    text="Ugh, taxes. You're right. I'll hold."
                                />
                            </div>

                            {/* Input Area */}
                            <div className="p-5 border-t border-white/5 bg-white/[0.02]">
                                <div className="bg-black/20 rounded-2xl p-1.5 pl-5 flex items-center gap-3 border border-white/10 transition-all duration-500 focus-within:border-indigo-500/50 focus-within:bg-white/5 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                                    <input
                                        type="text"
                                        placeholder="Ask about your positions..."
                                        className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 flex-1"
                                    />
                                    <button className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-all duration-500 hover:scale-105">
                                        <ArrowRight className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    )
}

export default HeroSection;