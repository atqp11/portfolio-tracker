"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Zap } from 'lucide-react';

// --- CSS for High-End Visuals & 3D Effects ---
const styles = `
  /* Aurora & Blob Animations */
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(40px, -60px) scale(1.15); }
    66% { transform: translate(-30px, 30px) scale(0.95); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  
  /* Glassmorphism Utilities */
  .glass-panel {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  }
`;

// --- Canvas Component: Galaxy Flow ---
const GalaxyCanvas: React.FC = () => {
  // Explicitly typing the canvas reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const PARTICLE_SPEED = 0.05; 
    const MOUSE_INFLUENCE = 0.005;

    // Define Particle interface for type safety
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }

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
          p.vx += forceDirectionX * force * MOUSE_INFLUENCE; 
          p.vy += forceDirectionY * force * MOUSE_INFLUENCE;
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

      // Draw Glowing Orbs (Aurora effect)
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

    // Type the mouse event handler
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

// --- Main Application Component (Coming Soon) ---

const ComingSoonPage: React.FC = () => {
  const router = useRouter();

  // Explicitly typing state variables
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Client-side email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Typing the form submission event
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        // Redirect to thank you page after a brief delay
        setTimeout(() => {
          router.push(`/thank-you?email=${encodeURIComponent(email)}`);
        }, 1500);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a001f] text-white font-sans overflow-x-hidden relative flex items-center justify-center">
      <style>{styles}</style>
      
      {/* Background Canvas */}
      <GalaxyCanvas />

      {/* Main Content */}
      <main className="relative z-10 p-6 max-w-2xl mx-auto text-center">
        
        {/* Title/Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
            <Zap className="w-8 h-8 text-amber-400 fill-current drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              StockBuddy
            </span>
        </div>

        <h1 className="text-7xl md:text-8xl font-extrabold leading-tight mb-6 tracking-tighter drop-shadow-2xl">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 filter drop-shadow-[0_0_25px_rgba(168,85,247,0.4)]">
            Coming Soon
          </span>
        </h1>
        
        <p className="text-xl text-gray-300 leading-relaxed mb-12 opacity-90 max-w-xl mx-auto">
          The AI financial co-pilot is being tuned for launch. Don't miss the beta invite.
        </p>

        {/* Email Capture Form (Glassmorphism) */}
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl max-w-lg mx-auto">
            {submitted ? (
                <div className="p-4 text-center text-lg font-medium text-green-300 flex items-center justify-center gap-3">
                    <Mail className="w-6 h-6" /> You're on the list! Thank you.
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Name Field (Optional) */}
                    <input
                        type="text"
                        placeholder="Your name (optional)"
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                        className="w-full px-5 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />

                    {/* Email Field */}
                    <input
                        type="email"
                        placeholder="Enter your best email address"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        required
                        className="w-full px-5 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-base hover:bg-indigo-500 transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Joining...
                            </>
                        ) : (
                            <>
                                Notify Me <Zap className="w-4 h-4 fill-current" />
                            </>
                        )}
                    </button>
                </div>
            )}
        </form>

        <p className="mt-8 text-sm text-gray-600">
            Estimated Launch: Q4 2025
        </p>
      </main>

      {/* Footer / Copyright */}
      <footer className="absolute bottom-4 text-gray-700 text-xs z-10">
          © 2025 StockBuddy Inc. All Rights Reserved.
      </footer>
    </div>
  );
};

export default ComingSoonPage;