import React, { useEffect, useRef } from "react";
import { ZoyaTheme } from "../services/geminiService";

interface LiveWallpaperProps {
  theme: ZoyaTheme;
  state: "idle" | "listening" | "processing" | "speaking";
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  swaySpeed?: number;
  swayRange?: number;
  swayOffset?: number;
  rotation?: number;
  rotationSpeed?: number;
  type?: "petal" | "sparkle" | "streak" | "ember" | "binary";
  value?: string;
}

export default function LiveWallpaper({ theme, state }: LiveWallpaperProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const maxParticles = theme === "enemy" ? 70 : theme === "anime" ? 65 : 50;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Helper to get active speed multiplier depending on voice state
    const getSpeedMultiplier = () => {
      if (state === "listening") return 1.8;
      if (state === "processing") return 2.2;
      if (state === "speaking") return 1.5;
      return 1.0;
    };

    const createParticle = (initBottom: boolean = false): Particle => {
      const w = canvas.width;
      const h = canvas.height;
      const size = Math.random() * (theme === "enemy" ? 4 : theme === "anime" ? 5 : 3) + 2;
      
      let x = Math.random() * w;
      let y = initBottom ? h + 20 : Math.random() * h;
      let speedX = 0;
      let speedY = 0;
      let color = "";
      let type: "petal" | "sparkle" | "streak" | "ember" | "binary" = "sparkle";
      
      const swaySpeed = Math.random() * 0.02 + 0.01;
      const swayRange = Math.random() * 1.5 + 0.5;
      const swayOffset = Math.random() * Math.PI * 2;
      const rotation = Math.random() * Math.PI * 2;
      const rotationSpeed = (Math.random() - 0.5) * 0.03;

      if (theme === "anime") {
        // Anime Theme: Falling Sakura Petals & Glowing Crimson/Pink Sparkles
        const isPetal = Math.random() > 0.45;
        type = isPetal ? "petal" : "sparkle";

        // Spawn from top
        if (!initBottom) y = Math.random() * h;
        else y = -20;

        speedY = Math.random() * 0.8 + 0.4; // Falls slowly
        speedX = (Math.random() - 0.3) * 0.5; // Slight drift to the right

        if (isPetal) {
          // Beautiful high-fidelity pink/rose colors to complement the 8K anime image
          const pinks = [
            "rgba(244, 114, 182, 0.75)", // pink-400
            "rgba(251, 113, 133, 0.75)", // rose-400
            "rgba(219, 39, 119, 0.7)",  // pink-600
            "rgba(244, 63, 94, 0.7)",    // rose-500
            "rgba(225, 29, 72, 0.75)",   // rose-600
          ];
          color = pinks[Math.floor(Math.random() * pinks.length)];
        } else {
          // Glowing crimson red and soft white sparkles (representing glowing eye energy reflections)
          const sparkles = [
            "rgba(239, 68, 68, 0.85)",   // red-500
            "rgba(251, 113, 133, 0.9)",  // rose-400
            "rgba(255, 255, 255, 0.9)",  // pure white highlight
          ];
          color = sparkles[Math.floor(Math.random() * sparkles.length)];
        }
      } else if (theme === "enemy") {
        // Enemy Theme: Rising Embers and Hacker Binary Streams
        const isEmber = Math.random() > 0.4;
        type = isEmber ? "ember" : "binary";

        // Spawn from bottom
        if (!initBottom) y = Math.random() * h;
        else y = h + 20;

        speedY = -(Math.random() * 1.2 + 0.5); // Rises upwards
        speedX = (Math.random() - 0.5) * 0.6; // Slight wind
        
        if (isEmber) {
          const reds = [
            "rgba(239, 68, 68, 0.85)",   // red-500
            "rgba(220, 38, 38, 0.75)",   // red-600
            "rgba(245, 158, 11, 0.8)",   // amber-500
            "rgba(153, 27, 27, 0.8)",    // red-800
          ];
          color = reds[Math.floor(Math.random() * reds.length)];
        } else {
          const binaryOptions = ["0", "1", "☠", "☣", "⚡"];
          const binaryVal = binaryOptions[Math.floor(Math.random() * binaryOptions.length)];
          color = "rgba(220, 38, 38, 0.65)"; // Savage red data streams
          return {
            x,
            y,
            size: Math.random() * 8 + 8,
            speedX: 0,
            speedY: -(Math.random() * 1.5 + 0.8),
            opacity: Math.random() * 0.5 + 0.2,
            color,
            type: "binary",
            value: binaryVal,
          };
        }
      } else {
        // Automobile Theme: Fast Speedways
        type = "streak";
        
        // Spawn from left
        if (!initBottom) x = Math.random() * w;
        else x = -100;
        
        speedX = Math.random() * 4 + 2; // Sleek horizontal speed
        speedY = (Math.random() - 0.5) * 0.1; // Straight path
        
        const blues = [
          "rgba(6, 182, 212, 0.6)",  // cyan-500
          "rgba(56, 189, 248, 0.6)",  // sky-400
          "rgba(139, 92, 246, 0.5)",  // violet-500
        ];
        color = blues[Math.floor(Math.random() * blues.length)];
      }

      return {
        x,
        y,
        size,
        speedX,
        speedY,
        opacity: Math.random() * 0.6 + 0.2,
        color,
        swaySpeed,
        swayRange,
        swayOffset,
        rotation,
        rotationSpeed,
        type,
      };
    };

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle(false));
    }

    const drawPetal = (p: Particle) => {
      if (!ctx || !p.rotation) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      
      ctx.beginPath();
      ctx.fillStyle = p.color;
      // Draw a cute cherry blossom leaf shape
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-p.size * 1.5, -p.size, -p.size, p.size, 0, p.size * 1.5);
      ctx.bezierCurveTo(p.size, p.size, p.size * 1.5, -p.size, 0, 0);
      ctx.fill();
      
      // Petal crease line
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 0.8;
      ctx.moveTo(0, 0);
      ctx.lineTo(0, p.size * 1.2);
      ctx.stroke();

      ctx.restore();
    };

    const drawSparkle = (p: Particle) => {
      if (!ctx) return;
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = p.color;
      
      // Simple 4-point star flare
      const cx = p.x;
      const cy = p.y;
      const r = p.size;
      
      ctx.moveTo(cx, cy - r);
      ctx.quadraticCurveTo(cx, cy, cx + r, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy + r);
      ctx.quadraticCurveTo(cx, cy, cx - r, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy - r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawStreak = (p: Particle) => {
      if (!ctx) return;
      ctx.beginPath();
      // Streaks are drawn as glowing speedlines
      const grad = ctx.createLinearGradient(p.x - p.size * 15, p.y, p.x, p.y);
      grad.addColorStop(0, "rgba(0, 0, 0, 0)");
      grad.addColorStop(1, p.color);
      
      ctx.strokeStyle = grad;
      ctx.lineWidth = p.size * 0.4;
      ctx.moveTo(p.x - p.size * 15, p.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };

    const drawEmber = (p: Particle) => {
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = p.size * 3;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    };

    const drawBinary = (p: Particle) => {
      if (!ctx || !p.value) return;
      ctx.fillStyle = p.color;
      ctx.font = `${p.size}px monospace`;
      ctx.fillText(p.value, p.x, p.y);
    };

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mult = getSpeedMultiplier();

      particles.forEach((p, idx) => {
        // Move particle
        if (theme === "anime") {
          // Elegant drift with horizontal sine sway
          if (p.swayOffset !== undefined && p.swaySpeed !== undefined && p.swayRange !== undefined) {
            p.swayOffset += p.swaySpeed;
            p.x += (p.speedX + Math.sin(p.swayOffset) * p.swayRange) * mult;
          } else {
            p.x += p.speedX * mult;
          }
          p.y += p.speedY * mult;
          
          if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
            p.rotation += p.rotationSpeed * mult;
          }
        } else if (theme === "enemy") {
          // Floating upwards with mild random jitter
          p.y += p.speedY * mult;
          p.x += (p.speedX + (Math.random() - 0.5) * 0.2) * mult;
        } else {
          // Sleek speedy horizontal travel
          p.x += p.speedX * mult;
          p.y += p.speedY * mult;
        }

        // Draw depending on type
        if (p.type === "petal") {
          drawPetal(p);
        } else if (p.type === "sparkle") {
          drawSparkle(p);
        } else if (p.type === "streak") {
          drawStreak(p);
        } else if (p.type === "ember") {
          drawEmber(p);
        } else if (p.type === "binary") {
          drawBinary(p);
        }

        // Check bounds and recycle
        let outOfBounds = false;
        if (theme === "anime") {
          if (p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
            outOfBounds = true;
          }
        } else if (theme === "enemy") {
          if (p.y < -20 || p.x < -20 || p.x > canvas.width + 20) {
            outOfBounds = true;
          }
        } else {
          if (p.x > canvas.width + 100) {
            outOfBounds = true;
          }
        }

        if (outOfBounds) {
          particles[idx] = createParticle(true);
        }
      });

      animationFrameId = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [theme, state]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-700"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
