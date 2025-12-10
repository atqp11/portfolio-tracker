"use client";
import React from 'react';
import { Heart, Sparkles, type LucideIcon } from 'lucide-react';

interface ChatMessageProps {
    isAi: boolean;
    text: string;
    emotion?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ isAi, text, emotion }) => (
    <div className={`flex gap-3 mb-4 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAi ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30' : 'bg-gray-700'}`}>
            {isAi ? <Sparkles className="w-4 h-4 text-white" /> : <div className="w-full h-full rounded-full bg-gray-600" />}
        </div>
        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md ${isAi ? 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none' : 'bg-indigo-600/90 text-white rounded-tr-none shadow-lg shadow-indigo-900/20'
            }`}>
            {text}
            {emotion && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-900/40 px-2 py-1 rounded-full w-fit border border-indigo-500/20">
                    <Heart className="w-3 h-3" /> {emotion}
                </div>
            )}
        </div>
    </div>
);

interface StockTickerProps {
    symbol: string;
    price: string;
    change: string;
    isPositive: boolean;
}

export const StockTicker: React.FC<StockTickerProps> = ({ symbol, price, change, isPositive }) => (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 group hover:bg-white/5 px-2 rounded-lg transition-colors duration-700 cursor-pointer">
        <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-inner ${isPositive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {symbol.substring(0, 2)}
            </div>
            <div>
                <div className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors duration-700">{symbol}</div>
                <div className="text-xs text-gray-500">12 shares</div>
            </div>
        </div>
        <div className="text-right">
            <div className="font-medium text-sm text-white">${price}</div>
            <div className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{change}%
            </div>
        </div>
    </div>
);

interface BentoCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    className?: string;
    gradient: string;
}

export const BentoCard: React.FC<BentoCardProps> = ({ title, description, icon: Icon, className, gradient }) => (
    <div className={`glass-panel rounded-[2rem] p-8 relative overflow-hidden group glass-card-hover ${className}`}>
        {/* Background Gradient Blob */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity duration-700`}></div>

        <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-700 shadow-lg shadow-black/20">
                <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">{description}</p>
        </div>

        {/* Bottom highlight */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    </div>
);