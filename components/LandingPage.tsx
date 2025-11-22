"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Heart, Brain, BarChart3, MessageCircle, Zap,
  Menu, X, ArrowRight, Play, Shield, TrendingUp,
  Clock, CheckCircle, AlertTriangle, ChevronRight, Mic,
  PieChart, Activity, Globe, Smartphone, Lock, Sparkles,
  type LucideIcon
} from 'lucide-react';

// --- CSS for High-End Visuals & 3D Effects ---
const styles = `
  /* Aurora & Blob Animations - SLOWED DOWN */
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(40px, -60px) scale(1.15); }
    66% { transform: translate(-30px, 30px) scale(0.95); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 15s infinite;
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

  /* Liquid Button */
  .btn-liquid {
    background: rgba(99, 102, 241, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
    position: relative;
    overflow: hidden;
  }
  .btn-liquid::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: 1s;
  }
  .btn-liquid:hover::before {
    left: 100%;
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

// --- Canvas Component: Galaxy Flow ---

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

const GalaxyCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width: number, height: number;

    // Configuration
    const PARTICLE_COUNT = 120;
    const CONNECTION_DISTANCE = 150;
    const MOUSE_DISTANCE = 200;
    // Extremely slow speed for majestic flow
    const PARTICLE_SPEED = 0.05;

    let particles: Particle[] = [];
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          // Use the very slow speed
          vx: (Math.random() - 0.5) * PARTICLE_SPEED, 
          vy: (Math.random() - 0.5) * PARTICLE_SPEED, 
          size: Math.random() * 2 + 1,
          color: Math.random() > 0.6 
            ? `rgba(251, 191, 36, ${Math.random() * 0.5 + 0.2})` // Amber
            : `rgba(167, 139, 250, ${Math.random() * 0.5 + 0.2})` // Purple
        });
      }
    };

    const draw = () => {
      // Trail effect
      ctx.fillStyle = 'rgba(10, 0, 31, 0.1)'; 
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse interaction (gentle push/pull)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < MOUSE_DISTANCE) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (MOUSE_DISTANCE - distance) / MOUSE_DISTANCE;
          // Dramatically reduced influence of mouse for a slow, subtle effect
          p.vx += forceDirectionX * force * 0.005; 
          p.vy += forceDirectionY * force * 0.005;
        }

        // Draw Particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Connections (Glowing lines)
        for (let j = i; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          if (dist < CONNECTION_DISTANCE) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist/CONNECTION_DISTANCE * 0.8})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      // Draw Glowing Orbs (Sunlight effect)
      const time = Date.now() * 0.0003; 
      const orbX = width * 0.5 + Math.sin(time) * 200;
      const orbY = height * 0.3 + Math.cos(time * 0.5) * 100;
      
      const gradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, 400);
      gradient.addColorStop(0, 'rgba(251, 191, 36, 0.08)'); // Inner gold
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.05)'); // Middle purple
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Noise Overlay for texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      {/* Deep Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a001f] via-transparent to-[#0a001f] pointer-events-none"></div>
    </div>
  );
};

// --- Helper Components ---

interface ChatMessageProps {
  isAi: boolean;
  text: string;
  emotion?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ isAi, text, emotion }) => (
  <div className={`flex gap-3 mb-4 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAi ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30' : 'bg-gray-700'}`}>
      {isAi ? <Sparkles className="w-4 h-4 text-white" /> : <div className="w-full h-full rounded-full bg-gray-600" />}
    </div>
    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md ${
      isAi ? 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none' : 'bg-indigo-600/90 text-white rounded-tr-none shadow-lg shadow-indigo-900/20'
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

const StockTicker: React.FC<StockTickerProps> = ({ symbol, price, change, isPositive }) => (
  <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 group hover:bg-white/5 px-2 rounded-lg transition-colors duration-700 cursor-pointer">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-inner ${isPositive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
        {symbol.substring(0,2)}
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

const BentoCard: React.FC<BentoCardProps> = ({ title, description, icon: Icon, className, gradient }) => (
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

// --- Main Application ---

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
      
      {/* 1. Custom Canvas Background */}
      <GalaxyCanvas />

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? 'bg-[#0a001f]/70 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/10">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              StockBuddy
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5 backdrop-blur-md">
            {['Philosophy', 'Live Research', 'Pricing'].map((item) => (
              <a key={item} href="#" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-700">
                {item}
              </a>
            ))}
          </div>
          <Link href="/dashboard" className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm hover:bg-indigo-50 transition-colors border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            Access Beta
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
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

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
             <button className="btn-liquid px-10 py-4 rounded-full font-bold text-lg text-white hover:-translate-y-1 transition-transform duration-700 flex items-center gap-2 group">
                Get My Free Co-Pilot <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-700" />
             </button>
             <button className="flex items-center gap-2 px-8 py-4 rounded-full text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-700 border border-transparent hover:border-white/10">
                <Play className="w-4 h-4 fill-current" /> Watch Demo
             </button>
          </div>
        </div>

        {/* 3D Perspective Hero Demo */}
        <div className="relative max-w-7xl mx-auto perspective-container mt-32">
          
          {/* Center Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
          
          {/* Connecting Element (Slowed Pulse) */}
          <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-16 h-16 glass-panel rounded-full items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] border border-white/20 animate-[pulse_3s_infinite]">
             <Zap className="w-8 h-8 text-amber-400 fill-current drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-32 items-center">
            
            {/* Left: The Panic (Red, Chaotic) - With 3D Tilt */}
            <div className="relative hero-rotate-right group z-10">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-red-500 to-orange-600 rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-[1200ms]"></div>
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
              <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-[2rem] blur opacity-40 group-hover:opacity-60 transition duration-[1200ms]"></div>
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
                     <button className="bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors duration-700"><PieChart className="w-4 h-4 text-gray-400" /></button>
                     <button className="bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors duration-700"><Mic className="w-4 h-4 text-gray-400" /></button>
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
                   <div className="bg-black/20 rounded-2xl p-1.5 pl-5 flex items-center gap-3 border border-white/10 transition-colors duration-700 focus-within:border-indigo-500/50 focus-within:bg-white/5 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                      <input 
                        type="text" 
                        placeholder="Ask about your positions..." 
                        className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 flex-1"
                      />
                      <button className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-all duration-700 hover:scale-105">
                         <ArrowRight className="w-5 h-5 text-white" />
                      </button>
                   </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Cinematic Video Showcase */}
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

      {/* Bento Grid Features */}
      <section className="relative py-32 px-6 z-10">
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

      {/* Footer */}
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
                       <li><a href="#" className="hover:text-indigo-400 transition-colors">Features</a></li>
                       <li><a href="#" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
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
    </div>
  );
};

export default LandingPage;