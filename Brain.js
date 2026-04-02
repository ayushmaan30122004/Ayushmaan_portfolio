(() => {
  'use strict';

  // Change this to true only if you want to fully respect reduced-motion and stop background animation
  const STRICT_REDUCED_MOTION = false;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldReduceMotion = STRICT_REDUCED_MOTION && prefersReducedMotion;

  const revealElements = document.querySelectorAll('.reveal');

  if (shouldReduceMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach((el) => el.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach((el) => observer.observe(el));
  }

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  let animationFrameId = null;
  let documentHidden = false;
  let activeCleanup = null;

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function startLoop(loopFn) {
    stopAnimation();

    function frame() {
      if (documentHidden) {
        animationFrameId = null;
        return;
      }
      loopFn();
      animationFrameId = requestAnimationFrame(frame);
    }

    animationFrameId = requestAnimationFrame(frame);
  }

  function cleanupCurrentMode() {
    stopAnimation();
    if (typeof activeCleanup === 'function') {
      activeCleanup();
      activeCleanup = null;
    }
  }

  function handleVisibilityChange() {
    documentHidden = document.hidden;
    if (!documentHidden && typeof window.__portfolioRestartBackground === 'function' && !animationFrameId) {
      window.__portfolioRestartBackground();
    } else if (documentHidden) {
      stopAnimation();
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  function init2DFallback() {
    cleanupCurrentMode();

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.style.display = 'none';
      return;
    }

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 60 : 100;
    const particles = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let pointerX = 0;
    let pointerY = 0;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let time = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seedParticles() {
      particles.length = 0;
      for (let i = 0; i < particleCount; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          r: Math.random() * 1.8 + 0.8
        });
      }
    }

    function onPointerMove(e) {
      targetPointerX = e.clientX;
      targetPointerY = e.clientY;
    }

    function drawBackground() {
      ctx.clearRect(0, 0, width, height);

      const driftX = Math.sin(time * 0.001) * width * 0.08;
      const driftY = Math.cos(time * 0.0012) * height * 0.06;

      const grad = ctx.createRadialGradient(
        width * 0.3 + driftX,
        height * 0.2 + driftY,
        0,
        width * 0.3 + driftX,
        height * 0.2 + driftY,
        Math.max(width, height) * 0.85
      );
      grad.addColorStop(0, 'rgba(125, 211, 252, 0.14)');
      grad.addColorStop(0.45, 'rgba(167, 139, 250, 0.09)');
      grad.addColorStop(1, 'rgba(5, 8, 22, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    function drawParticles() {
      time += 16;
      pointerX += (targetPointerX - pointerX) * 0.04;
      pointerY += (targetPointerY - pointerY) * 0.04;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        const dx = pointerX - p.x;
        const dy = pointerY - p.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 24000) {
          const force = 1 - distSq / 24000;
          p.vx -= dx * force * 0.000025;
          p.vy -= dy * force * 0.000025;
        }

        p.vx += Math.sin((time * 0.001) + p.y * 0.01) * 0.002;
        p.vy += Math.cos((time * 0.0012) + p.x * 0.01) * 0.002;

        p.x += p.vx;
        p.y += p.vy;

        p.vx *= 0.994;
        p.vy *= 0.994;

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];

        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 115) {
            ctx.strokeStyle = `rgba(125, 211, 252, ${0.13 * (1 - dist / 115)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        ctx.beginPath();
        ctx.fillStyle = 'rgba(139, 213, 255, 0.9)';
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function render() {
      drawBackground();
      drawParticles();
    }

    resize();
    seedParticles();

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onPointerMove, { passive: true });

    activeCleanup = () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onPointerMove);
    };

    window.__portfolioRestartBackground = () => {
      cleanupCurrentMode();
      init2DFallback();
    };

    if (shouldReduceMotion) {
      render();
      return;
    }

    startLoop(render);
  }

  function initThreeScene() {
    cleanupCurrentMode();

    if (!window.THREE) {
      init2DFallback();
      return;
    }

    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.position.z = 8;

    const isMobile = window.innerWidth < 768;
    const particlesCount = isMobile ? 900 : 1500;
    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < positions.length; i += 1) {
      positions[i] = (Math.random() - 0.5) * 22;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.06 : 0.045,
      color: 0x8bd5ff,
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let lastMoveTime = 0;
    let autoTime = 0;

    function onMouseMove(e) {
      const now = performance.now();
      if (now - lastMoveTime < 16) return;

      lastMoveTime = now;
      targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }

    function render() {
      autoTime += 0.01;

      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      stars.rotation.y += 0.0016;
      stars.rotation.x += 0.00055;

      stars.position.x = Math.sin(autoTime * 0.8) * 0.18;
      stars.position.y = Math.cos(autoTime * 0.6) * 0.12;

      camera.position.x += ((mouseX * 0.5) + Math.sin(autoTime * 0.7) * 0.25 - camera.position.x) * 0.03;
      camera.position.y += ((mouseY * 0.28) + Math.cos(autoTime * 0.5) * 0.12 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    activeCleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };

    window.__portfolioRestartBackground = () => {
      cleanupCurrentMode();
      initThreeScene();
    };

    if (shouldReduceMotion) {
      render();
      return;
    }

    startLoop(render);
  }

  function loadScriptSequentially(urls, onSuccess, onFailure) {
    let index = 0;

    function tryNext() {
      if (window.THREE) {
        onSuccess();
        return;
      }

      if (index >= urls.length) {
        onFailure();
        return;
      }

      const url = urls[index++];
      const script = document.createElement('script');
      script.src = url;
      script.async = true;

      script.onload = () => {
        if (window.THREE) onSuccess();
        else tryNext();
      };

      script.onerror = tryNext;
      document.head.appendChild(script);
    }

    tryNext();
  }

  function bootBackground() {
    if (window.THREE) {
      initThreeScene();
      return;
    }

    loadScriptSequentially(
      [
        './vendor/three.min.js',
        'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
        'https://unpkg.com/three@0.160.0/build/three.min.js'
      ],
      initThreeScene,
      init2DFallback
    );
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootBackground();
  } else {
    window.addEventListener('DOMContentLoaded', bootBackground, { once: true });
  }
})();