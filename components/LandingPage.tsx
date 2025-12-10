"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    TrendingUp,
} from 'lucide-react';
import GalaxyCanvas from './landing/GalaxyCanvas';
import HeroSection from './landing/HeroSection';
import VideoSection from './landing/VideoSection';
import FeaturesSection from './landing/FeaturesSection';
import PricingSection from './landing/PricingSection';
import Footer from './landing/Footer';


const styles = `
  /* Aurora & Blob Animations - SLOWED DOWN */
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(40px, -60px) scale(1.15); }
    66% { transform: translate(-30px, 30px) scale(0.95); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 75s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  
  /* Glassmorphism Utilities */
  .glass-panel {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  }
  .glass-card-hover {
    transition: all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .glass-card-hover:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-8px);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }

  /* 3D Perspective & Tilt */
  .perspective-container {
    perspective: 2000px;
  }
  .hero-rotate-right {
    transform: rotateY(-10deg) rotateX(4deg);
    transition: transform 1s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .hero-rotate-right:hover {
    transform: rotateY(-3deg) rotateX(1deg) scale(1.02);
  }
  .hero-rotate-left {
    transform: rotateY(10deg) rotateX(4deg);
    transition: transform 1s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .hero-rotate-left:hover {
    transform: rotateY(3deg) rotateX(1deg) scale(1.02);
  }

  /* Liquid Glass Primary Button */
  .btn-liquid-primary {
    background: linear-gradient(135deg, 
      rgba(88, 28, 135, 0.9) 0%, 
      rgba(109, 40, 217, 0.85) 50%, 
      rgba(147, 51, 234, 0.9) 100%);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(168, 85, 247, 0.3);
    box-shadow: 
      0 8px 32px rgba(147, 51, 234, 0.35),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset,
      0 2px 4px rgba(255, 255, 255, 0.1) inset;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .btn-liquid-primary::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, 
      transparent, 
      rgba(255, 255, 255, 0.2), 
      transparent);
    transition: left 0.6s ease;
  }
  .btn-liquid-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.15), transparent 70%);
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  .btn-liquid-primary:hover {
    transform: translateY(-3px) scale(1.02);
    border-color: rgba(192, 132, 252, 0.5);
    box-shadow: 
      0 12px 48px rgba(147, 51, 234, 0.5),
      0 0 80px rgba(168, 85, 247, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  }
  .btn-liquid-primary:hover::before {
    left: 100%;
  }
  .btn-liquid-primary:hover::after {
    opacity: 1;
  }
  .btn-liquid-primary:active {
    transform: translateY(-1px) scale(1);
  }
  
  /* Liquid Glass Secondary Button */
  .btn-liquid-secondary {
    background: linear-gradient(135deg, 
      rgba(30, 27, 75, 0.4) 0%, 
      rgba(55, 48, 107, 0.3) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1.5px solid rgba(139, 92, 246, 0.25);
    box-shadow: 
      0 4px 24px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .btn-liquid-secondary::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, 
      rgba(139, 92, 246, 0.1) 0%, 
      transparent 50%);
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  .btn-liquid-secondary:hover {
    background: linear-gradient(135deg, 
      rgba(55, 48, 107, 0.5) 0%, 
      rgba(76, 29, 149, 0.4) 100%);
    border-color: rgba(168, 85, 247, 0.4);
    transform: translateY(-3px);
    box-shadow: 
      0 8px 32px rgba(139, 92, 246, 0.25),
      0 0 40px rgba(168, 85, 247, 0.15),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }
  .btn-liquid-secondary::before {
    opacity: 1;
  }
  .btn-liquid-secondary:hover::before {
    opacity: 1;
  }
  .btn-liquid-secondary:active {
    transform: translateY(-1px);
  }

  /* Cinematic Video Container */
  .video-molded-glass {
    background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 
      0 20px 50px rgba(0,0,0,0.5),
      inset 0 0 0 1px rgba(255,255,255,0.1),
      inset 0 0 20px rgba(255,255,255,0.05);
    backdrop-filter: blur(20px);
    border-radius: 32px;
  }
`;


const LandingPage = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#0a001f] text-white font-sans overflow-x-hidden selection:bg-indigo-500 selection:text-white">
            <style>{styles}</style>

            <GalaxyCanvas />

            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? 'bg-[#0a001f]/70 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <Link href="/landing" className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-300">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/10">
                            <TrendingUp className="text-white w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                            StockBuddy
                        </span>
                    </Link>
                    <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5 backdrop-blur-md">
                        {[{ name: 'Features', href: '#features' }, { name: 'Pricing', href: '#pricing' }].map((item) => (
                            <Link key={item.name} href={item.href} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-700">
                                {item.name}
                            </Link>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/auth/signin" className="hidden md:block px-5 py-2.5 text-sm font-semibold text-gray-300 hover:text-white transition-all duration-300">
                            Sign In
                        </Link>
                        <Link href="/auth/signup" className="btn-liquid-primary px-6 py-2.5 rounded-full text-sm font-bold text-white">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            <HeroSection />
            <VideoSection />
            <FeaturesSection />
            <PricingSection />
            <Footer />
        </div>
    );
};

export default LandingPage;