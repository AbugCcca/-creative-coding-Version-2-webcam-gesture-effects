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

function containParticle(particle, width, height) {
  const margin = 120;

  if (particle.x < -margin || particle.x > width + margin) {
    particle.vx *= -0.42;
    particle.x = Math.max(-margin, Math.min(width + margin, particle.x));
  }

  if (particle.y < -margin || particle.y > height + margin) {
    particle.vy *= -0.42;
    particle.y = Math.max(-margin, Math.min(height + margin, particle.y));
  }
}

function createParticle(width, height) {
  const angle = randomBetween(0, Math.PI * 2);

  return {
    x: randomBetween(0, width),
    y: randomBetween(0, height),
    vx: 0,
    vy: 0,
    targetAngle: angle,
    targetDistance: randomBetween(0, 1),
    orbitSpeed: randomBetween(0.55, 1.65),
    size: randomBetween(1.2, 3.6),
    drift: randomBetween(0.002, 0.01),
  };
}

export default function ParticleCanvas({ settings }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const explosionRef = useRef({ x: 0, y: 0, startedAt: -Infinity });
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
      const { mode, speed, spread, attraction } = settingsRef.current;
      const mouse = mouseRef.current;
      const swirl = time * particle.drift + index * 0.08;
      const angle = particle.targetAngle + Math.sin(swirl) * 0.75;
      const pulse = 0.72 + Math.sin(time * 0.0015 + index) * 0.28;
      const distance = particle.targetDistance * spread * pulse;
      const dx = particle.x - mouse.x;
      const dy = particle.y - mouse.y;
      const pointerDistance = Math.hypot(dx, dy) || 1;
      const force = Math.max(0, 1 - pointerDistance / (spread * 1.8));
      const ease = 0.018 * speed * attraction;
      let targetX = mouse.x + Math.cos(angle) * distance;
      let targetY = mouse.y + Math.sin(angle) * distance;

      if (mode === 'repel') {
        targetX = particle.x + (dx / pointerDistance) * spread * force;
        targetY = particle.y + (dy / pointerDistance) * spread * force;
      }

      if (mode === 'orbit') {
        const orbitAngle =
          particle.targetAngle + time * 0.0017 * speed * particle.orbitSpeed + index * 0.018;
        const innerRadius = spread * 0.38;
        const outerRadius = spread * 1.15;
        const ringBias = Math.pow(particle.targetDistance, 2.35);
        const ringPulse = 1 + Math.sin(time * 0.0012 + index * 0.7) * 0.035;
        const orbitDistance = (innerRadius + (outerRadius - innerRadius) * ringBias) * ringPulse;

        targetX = mouse.x + Math.cos(orbitAngle) * orbitDistance;
        targetY = mouse.y + Math.sin(orbitAngle) * orbitDistance;
      }

      if (mode === 'flow') {
        const flowAngle = Math.sin(time * 0.00035 + particle.targetAngle * 3) * Math.PI;
        particle.vx += Math.cos(flowAngle) * 0.012 * speed;
        particle.vy += Math.sin(flowAngle + index * 0.01) * 0.012 * speed;
      } else {
        particle.vx += (targetX - particle.x) * ease;
        particle.vy += (targetY - particle.y) * ease;
      }

      if (mode === 'explosion') {
        const explosion = explosionRef.current;
        const elapsed = time - explosion.startedAt;

        if (elapsed >= 0 && elapsed < 720) {
          const blastDx = particle.x - explosion.x;
          const blastDy = particle.y - explosion.y;
          const blastDistance = Math.hypot(blastDx, blastDy) || 1;
          const shockRadius = 80 + elapsed * 1.08;
          const shockFalloff = Math.max(0, 1 - Math.abs(blastDistance - shockRadius) / 180);
          const blastForce = shockFalloff * (1 - elapsed / 720) * 3.6 * speed;

          particle.vx += (blastDx / blastDistance) * blastForce;
          particle.vy += (blastDy / blastDistance) * blastForce;
        }

        particle.vx += (targetX - particle.x) * ease * 0.08;
        particle.vy += (targetY - particle.y) * ease * 0.08;
      }

      particle.vx *= mode === 'flow' ? 0.965 : 0.9;
      particle.vy *= mode === 'flow' ? 0.965 : 0.9;
      particle.x += particle.vx;
      particle.y += particle.vy;

      containParticle(particle, window.innerWidth, window.innerHeight);
    }

    // Draw particles with additive glow for a luminous canvas look.
    function drawParticles(time) {
      const { color, trail, size } = settingsRef.current;
      const { r, g, b } = hexToRgb(color);
      const particles = particlesRef.current;
      const fadeAlpha = 0.24 - trail * 0.18;

      context.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
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
          particle.size * 7 * size,
        );

        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
        glow.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.28)`);
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        context.fillStyle = glow;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * 7 * size, 0, Math.PI * 2);
        context.fill();
      });

      if (settingsRef.current.mode === 'explosion') {
        const explosion = explosionRef.current;
        const elapsed = time - explosion.startedAt;

        if (elapsed >= 0 && elapsed < 720) {
          const progress = elapsed / 720;
          const ringRadius = 80 + elapsed * 1.08;

          context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.42 * (1 - progress)})`;
          context.lineWidth = 2 + 8 * (1 - progress);
          context.beginPath();
          context.arc(explosion.x, explosion.y, ringRadius, 0, Math.PI * 2);
          context.stroke();
        }
      }

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

    function handlePointerDown(event) {
      mouseRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (settingsRef.current.mode !== 'explosion') {
        return;
      }

      explosionRef.current = {
        x: event.clientX,
        y: event.clientY,
        startedAt: performance.now(),
      };

      particlesRef.current.forEach((particle) => {
        const dx = particle.x - event.clientX;
        const dy = particle.y - event.clientY;
        const distance = Math.hypot(dx, dy) || 1;
        const blast = Math.max(0.55, 1 - distance / 620) * 42 * settingsRef.current.speed;

        particle.vx += (dx / distance) * blast;
        particle.vy += (dy / distance) * blast;
      });
    }

    resizeCanvas();
    syncParticleCount();
    animationRef.current = requestAnimationFrame(animate);

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
}
