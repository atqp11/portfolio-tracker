"use client";
import React from 'react';
import {
    Shield,
    Brain,
    Mic,
    Lock,
    Globe,
    Smartphone
} from 'lucide-react';
import { BentoCard } from './HelperComponents';

const FeaturesSection = () => {
    return (
        <section id="features" className="relative py-32 px-6 z-10">
            <div className="container mx-auto max-w-7xl">
                <div className="mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Everything you need to<br />invest with confidence.</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">

                    {/* Large Card */}
                    <BentoCard
                        className="md:col-span-2 md:row-span-2"
                        title="The Cost Basis Anchor"
                        description="Anxiety comes from looking at the Daily P&L. Peace comes from looking at your Total Return. StockBuddy anchors every conversation in your entry price, reminding you of the long game."
                        icon={Shield}
                        gradient="from-blue-500 to-indigo-500"
                    />

                    {/* Tall Card */}
                    <BentoCard
                        className="md:row-span-2"
                        title="Deep Research"
                        description="Why is TSLA down? We scrape real-time news, earnings transcripts, and insider sentiment instantly."
                        icon={Brain}
                        gradient="from-purple-500 to-pink-500"
                    />

                    {/* Standard Card */}
                    <BentoCard
                        title="Voice Brief"
                        description="Get a 60-second personalized audio summary every Sunday morning."
                        icon={Mic}
                        gradient="from-amber-500 to-orange-500"
                    />

                    {/* Standard Card */}
                    <BentoCard
                        title="Bank Security"
                        description="Read-only access via Plaid. We cannot touch your money."
                        icon={Lock}
                        gradient="from-green-500 to-emerald-500"
                    />

                    {/* Wide Card */}
                    <BentoCard
                        className="md:col-span-2"
                        title="Global Sentiment Analysis"
                        description="We scan news from 140+ countries in real-time to gauge market fear and greed before it hits the charts."
                        icon={Globe}
                        gradient="from-cyan-500 to-blue-500"
                    />

                    {/* Standard Card */}
                    <BentoCard
                        title="Mobile First"
                        description="Trade and chat on the go with our native iOS and Android apps."
                        icon={Smartphone}
                        gradient="from-rose-500 to-red-500"
                    />
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;