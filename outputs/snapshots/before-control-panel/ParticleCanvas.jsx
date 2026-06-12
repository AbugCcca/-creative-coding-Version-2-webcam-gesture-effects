import { useEffect, useRef } from 'react';

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const value = Number.parseInt(cleanHex, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function createParticle(width, height) {
  const angle = randomBetween(0, Math.PI * 2);

  return {
    x: randomBetween(0, width),
    y: randomBetween(0, height),
    targetAngle: angle,
    targetDistance: randomBetween(0, 1),
    size: randomBetween(1.2, 3.6),
    drift: randomBetween(0.002, 0.01),
  };
}

export default function ParticleCanvas({ settings }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const animationRef = useRef(0);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Resize the canvas for crisp rendering on high-DPI screens.
    function resizeCanvas() {
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * pixelRatio;
      canvas.height = window.innerHeight * pixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    // Keep the particle array in sync with the current UI count.
    function syncParticleCount() {
      const { particleCount } = settingsRef.current;
      const particles = particlesRef.current;

      while (particles.length < particleCount) {
        particles.push(createParticle(window.innerWidth, window.innerHeight));
      }

      if (particles.length > particleCount) {
        particles.length = particleCount;
      }
    }

    // Move each particle toward a soft target around the pointer.
    function updateParticle(particle, index, time) {
      const { speed, radius } = settingsRef.current;
      const mouse = mouseRef.current;
      const swirl = time * particle.drift + index * 0.08;
      const angle = particle.targetAngle + Math.sin(swirl) * 0.75;
      const pulse = 0.72 + Math.sin(time * 0.0015 + index) * 0.28;
      const distance = particle.targetDistance * radius * pulse;
      const targetX = mouse.x + Math.cos(angle) * distance;
      const targetY = mouse.y + Math.sin(angle) * distance;
      const ease = 0.018 * speed;

      particle.x += (targetX - particle.x) * ease;
      particle.y += (targetY - particle.y) * ease;
    }

    // Draw particles with additive glow for a luminous canvas look.
    function drawParticles(time) {
      const { color } = settingsRef.current;
      const { r, g, b } = hexToRgb(color);
      const particles = particlesRef.current;

      context.fillStyle = 'rgba(0, 0, 0, 0.16)';
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);
      context.globalCompositeOperation = 'lighter';

      particles.forEach((particle, index) => {
        updateParticle(particle, index, time);

        const glow = context.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 7,
        );

        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
        glow.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.28)`);
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        context.fillStyle = glow;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * 7, 0, Math.PI * 2);
        context.fill();
      });

      context.globalCompositeOperation = 'source-over';
    }

    // Run the animation loop with requestAnimationFrame.
    function animate(time) {
      syncParticleCount();
      drawParticles(time);
      animationRef.current = requestAnimationFrame(animate);
    }

    // Store the current pointer position for the particle target.
    function handlePointerMove(event) {
      mouseRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    resizeCanvas();
    syncParticleCount();
    animationRef.current = requestAnimationFrame(animate);

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
}
