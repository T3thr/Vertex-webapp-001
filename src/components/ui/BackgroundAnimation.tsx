// src/components/ui/BackgroundAnimation.tsx
"use client";

import { useEffect, useRef } from 'react';

export default function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Particle class
    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        
        // Use primary color with opacity
        const opacity = Math.random() * 0.3 + 0.1;
        this.color = `rgba(37, 99, 235, ${opacity})`;
      }

      update(canvasWidth: number, canvasHeight: number) {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce off edges
        if (this.x > canvasWidth || this.x < 0) {
          this.speedX = -this.speedX;
        }
        if (this.y > canvasHeight || this.y < 0) {
          this.speedY = -this.speedY;
        }
      }

      draw(context: CanvasRenderingContext2D) {
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fill();
      }
    }

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();

    // Create particles
    let particlesArray: Particle[] = [];
    let animationFrameId: number;

    const initParticles = () => {
      const particleCount = Math.min(Math.floor(canvas.width * canvas.height / 12000), 100);
      particlesArray = Array.from({ length: particleCount }, () => new Particle(canvas.width, canvas.height));
    };

    // Connect particles with lines if they're close enough
    const connectParticles = (context: CanvasRenderingContext2D, particles: Particle[]) => {
      const maxDistance = 150;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = 1 - (distance / maxDistance);
            context.strokeStyle = `rgba(37, 99, 235, ${opacity * 0.15})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(particles[i].x, particles[i].y);
            context.lineTo(particles[j].x, particles[j].y);
            context.stroke();
          }
        }
      }
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (const particle of particlesArray) {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx);
      }
      
      connectParticles(ctx, particlesArray);
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    // Initialize
    initParticles();
    animate();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 -z-10" 
      style={{ pointerEvents: 'none' }}
    />
  );
}