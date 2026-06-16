import { useEffect, useRef } from 'react';
import { getEffectForCombo } from '../utils/effectsMap.js';

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function lerp(current, target, amount) {
  return current + (target - current) * amount;
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
    sparkle: randomBetween(0, Math.PI * 2),
  };
}

function isTrackedHand(hand) {
  return hand && hand.landmarks?.length > 0 && hand.x > 0 && hand.y > 0;
}

function getActiveHands(leftHand, rightHand) {
  return [leftHand, rightHand].filter(isTrackedHand);
}

function getCenterPoint(leftHand, rightHand, mousePoint, comboKey) {
  const activeHands = getActiveHands(leftHand, rightHand);

  if (comboKey === '0-0') {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }

  if (activeHands.length === 2) {
    return {
      x: (activeHands[0].x + activeHands[1].x) / 2,
      y: (activeHands[0].y + activeHands[1].y) / 2,
    };
  }

  if (activeHands.length === 1) {
    return {
      x: activeHands[0].x,
      y: activeHands[0].y,
    };
  }

  return mousePoint;
}

function getHandsDistance(leftHand, rightHand) {
  if (!isTrackedHand(leftHand) || !isTrackedHand(rightHand)) {
    return 220;
  }

  return Math.hypot(leftHand.x - rightHand.x, leftHand.y - rightHand.y);
}

function drawNeonText(context, text, x, y, size, rgb, accentRgb, time) {
  const breath = 0.86 + Math.sin(time * 0.003) * 0.14;
  const particleCount = Math.max(18, Math.floor(text.length * 5));

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `800 ${size * breath}px Inter, ui-sans-serif, system-ui, sans-serif`;

  [
    { blur: 34, alpha: 0.34, color: accentRgb },
    { blur: 18, alpha: 0.42, color: rgb },
    { blur: 6, alpha: 0.78, color: rgb },
  ].forEach((layer) => {
    context.shadowColor = `rgba(${layer.color.r}, ${layer.color.g}, ${layer.color.b}, ${layer.alpha})`;
    context.shadowBlur = layer.blur;
    context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.58 + layer.alpha * 0.38})`;
    context.fillText(text, x, y);
  });

  context.globalCompositeOperation = 'lighter';
  for (let i = 0; i < particleCount; i += 1) {
    const angle = i * 2.399 + time * 0.0008;
    const width = text.length * size * 0.22;
    const radiusBias = 0.18 + ((i * 37) % 83) / 100;
    const heightBias = 0.16 + ((i * 19) % 56) / 100;
    const px = x + Math.cos(angle) * width * radiusBias;
    const py = y + Math.sin(angle * 1.7) * size * heightBias;
    const radius = 1.1 + Math.sin(time * 0.006 + i) * 0.55;

    context.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.42)`;
    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawHeartBeam(context, center, rgb, accentRgb, time) {
  const scale = Math.max(3.2, Math.min(7, window.innerWidth * 0.005));

  context.save();
  context.translate(center.x, center.y);
  context.scale(scale, scale);
  context.globalCompositeOperation = 'lighter';
  context.lineCap = 'round';
  context.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.9)`;
  context.shadowBlur = 24;
  context.beginPath();

  for (let i = 0; i <= 140; i += 1) {
    const t = (i / 140) * Math.PI * 2;
    const pulse = 1 + Math.sin(time * 0.003 + i * 0.03) * 0.025;
    const x = 16 * Math.sin(t) ** 3 * pulse;
    const y = -(
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)
    ) * pulse;

    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.86)`;
  context.lineWidth = 1.6;
  context.stroke();
  context.restore();
}

function updateParticle(particle, index, time, center, settings, effect, beamRadius) {
  const { speed, spread, attraction } = settings;
  const swirl = time * particle.drift + index * 0.08;
  const angle = particle.targetAngle + Math.sin(swirl) * 0.75;
  const pulse = 0.72 + Math.sin(time * 0.0015 + index) * 0.28;
  const distance = particle.targetDistance * spread * pulse;
  const dx = particle.x - center.x;
  const dy = particle.y - center.y;
  const pointerDistance = Math.hypot(dx, dy) || 1;
  const force = Math.max(0, 1 - pointerDistance / (spread * 1.8));
  const ease = 0.018 * speed * attraction;
  let targetX = center.x + Math.cos(angle) * distance;
  let targetY = center.y + Math.sin(angle) * distance;
  let damping = 0.9;

  if (effect === 'repel') {
    targetX = particle.x + (dx / pointerDistance) * spread * force;
    targetY = particle.y + (dy / pointerDistance) * spread * force;
  }

  if (effect === 'orbit' || effect === 'heart' || effect === 'hello' || effect === 'xi') {
    const orbitAngle =
      particle.targetAngle + time * 0.0017 * speed * particle.orbitSpeed + index * 0.018;
    const innerRadius = spread * 0.38;
    const outerRadius = spread * 1.15;
    const ringBias = Math.pow(particle.targetDistance, 2.35);
    const ringPulse = 1 + Math.sin(time * 0.0012 + index * 0.7) * 0.035;
    const orbitDistance = (innerRadius + (outerRadius - innerRadius) * ringBias) * ringPulse;

    targetX = center.x + Math.cos(orbitAngle) * orbitDistance;
    targetY = center.y + Math.sin(orbitAngle) * orbitDistance;
  }

  if (effect === 'rotatingBeam') {
    const beamAngle = time * 0.0018 * speed + particle.targetAngle * 0.18;
    const along = (particle.targetDistance - 0.5) * beamRadius * 2.1;
    const wave = Math.sin(time * 0.004 + index * 0.17) * beamRadius * 0.08;
    const lane = Math.sin(index * 1.91) * 16;

    targetX =
      center.x +
      Math.cos(beamAngle) * along +
      Math.cos(beamAngle + Math.PI / 2) * (lane + wave);
    targetY =
      center.y +
      Math.sin(beamAngle) * along +
      Math.sin(beamAngle + Math.PI / 2) * (lane + wave);
    damping = 0.88;
  }

  if (effect === 'flow') {
    const flowAngle = Math.sin(time * 0.00035 + particle.targetAngle * 3) * Math.PI;
    particle.vx += Math.cos(flowAngle) * 0.012 * speed;
    particle.vy += Math.sin(flowAngle + index * 0.01) * 0.012 * speed;
    damping = 0.965;
  } else {
    particle.vx += (targetX - particle.x) * ease;
    particle.vy += (targetY - particle.y) * ease;
  }

  particle.vx *= damping;
  particle.vy *= damping;
  particle.x += particle.vx;
  particle.y += particle.vy;

  containParticle(particle, window.innerWidth, window.innerHeight);
}

export default function ARCanvas({
  leftHand,
  rightHand,
  comboKey,
  specialGesture,
  inputMode,
  mousePoint,
  mousePointRef,
  handsRef,
  settings,
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(0);
  const propsRef = useRef({
    leftHand,
    rightHand,
    comboKey,
    specialGesture,
    inputMode,
    mousePoint,
    mousePointRef,
    settings,
  });
  const smoothPointRef = useRef(mousePoint);

  useEffect(() => {
    propsRef.current = {
      leftHand,
      rightHand,
      comboKey,
      specialGesture,
      inputMode,
      mousePoint,
      mousePointRef,
      settings,
    };
  }, [leftHand, rightHand, comboKey, specialGesture, inputMode, mousePoint, mousePointRef, settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    function resizeCanvas() {
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * pixelRatio;
      canvas.height = window.innerHeight * pixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function syncParticleCount() {
      const { particleCount } = propsRef.current.settings;
      const particles = particlesRef.current;

      while (particles.length < particleCount) {
        particles.push(createParticle(window.innerWidth, window.innerHeight));
      }

      if (particles.length > particleCount) {
        particles.length = particleCount;
      }
    }

    function drawParticles(time, center, effect, beamRadius) {
      const { color, accent, trail, size } = propsRef.current.settings;
      const rgb = hexToRgb(color);
      const accentRgb = hexToRgb(accent);
      const particles = particlesRef.current;
      const fadeAlpha = 0.24 - trail * 0.18;

      context.globalCompositeOperation = 'destination-out';
      context.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);
      context.globalCompositeOperation = 'lighter';

      particles.forEach((particle, index) => {
        updateParticle(particle, index, time, center, propsRef.current.settings, effect, beamRadius);

        const glow = context.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 7 * size,
        );
        const shimmer = 0.78 + Math.sin(time * 0.005 + particle.sparkle) * 0.17;
        const mix = effect === 'rotatingBeam' ? index % 3 === 0 : index % 7 === 0;
        const drawRgb = mix ? accentRgb : rgb;

        glow.addColorStop(0, `rgba(${drawRgb.r}, ${drawRgb.g}, ${drawRgb.b}, ${0.95 * shimmer})`);
        glow.addColorStop(0.35, `rgba(${drawRgb.r}, ${drawRgb.g}, ${drawRgb.b}, 0.28)`);
        glow.addColorStop(1, `rgba(${drawRgb.r}, ${drawRgb.g}, ${drawRgb.b}, 0)`);

        context.fillStyle = glow;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * 7 * size, 0, Math.PI * 2);
        context.fill();
      });

      if (effect === 'rotatingBeam') {
        const beamAngle = time * 0.0018 * propsRef.current.settings.speed;
        const beamLength = beamRadius * 1.2;

        context.strokeStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.38)`;
        context.lineWidth = 2.5 + Math.sin(time * 0.006) * 1.4;
        context.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.92)`;
        context.shadowBlur = 28;
        context.beginPath();
        context.moveTo(center.x - Math.cos(beamAngle) * beamLength, center.y - Math.sin(beamAngle) * beamLength);
        context.lineTo(center.x + Math.cos(beamAngle) * beamLength, center.y + Math.sin(beamAngle) * beamLength);
        context.stroke();
      }

      context.globalCompositeOperation = 'source-over';
    }

    function draw(time) {
      syncParticleCount();

      const liveHands = handsRef?.current ?? propsRef.current;
      const liveLeftHand = liveHands.leftHand ?? propsRef.current.leftHand;
      const liveRightHand = liveHands.rightHand ?? propsRef.current.rightHand;
      const liveComboKey = liveHands.comboKey ?? propsRef.current.comboKey;
      const liveSpecialGesture = liveHands.specialGesture ?? propsRef.current.specialGesture;
      const liveMousePoint = propsRef.current.mousePointRef?.current ?? propsRef.current.mousePoint;
      const targetCenter = getCenterPoint(liveLeftHand, liveRightHand, liveMousePoint, liveComboKey);
      const smoothPoint = smoothPointRef.current;
      const effect = getEffectForCombo(liveComboKey, liveSpecialGesture);
      const beamRadius = Math.max(120, Math.min(460, getHandsDistance(liveLeftHand, liveRightHand) * 0.74));
      const rgb = hexToRgb(propsRef.current.settings.color);
      const accentRgb = hexToRgb(propsRef.current.settings.accent);

      smoothPoint.x = lerp(smoothPoint.x, targetCenter.x, 0.18);
      smoothPoint.y = lerp(smoothPoint.y, targetCenter.y, 0.18);

      drawParticles(time, smoothPoint, effect, beamRadius);

      if (effect === 'hello') {
        drawNeonText(
          context,
          'Hello World',
          window.innerWidth / 2,
          window.innerHeight / 2,
          Math.max(34, Math.min(86, window.innerWidth * 0.066)),
          rgb,
          accentRgb,
          time,
        );
      }

      if (effect === 'xi') {
        drawNeonText(
          context,
          "I'm Xi",
          smoothPoint.x,
          smoothPoint.y - 28,
          Math.max(30, Math.min(72, window.innerWidth * 0.054)),
          rgb,
          accentRgb,
          time,
        );
      }

      if (effect === 'heart') {
        drawHeartBeam(context, smoothPoint, rgb, accentRgb, time);
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    resizeCanvas();
    syncParticleCount();
    animationRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [handsRef]);

  return <canvas ref={canvasRef} className="ar-canvas" aria-hidden="true" />;
}
