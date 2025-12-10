"use client";
import React, { useRef, useEffect } from 'react';

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
        const PARTICLE_SPEED = 0.01;

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
                    p.vx += forceDirectionX * force * 0.001;
                    p.vy += forceDirectionY * force * 0.001;
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
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < CONNECTION_DISTANCE) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist / CONNECTION_DISTANCE * 0.8})`;
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

export default GalaxyCanvas;