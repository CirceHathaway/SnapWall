import React, { useEffect, useRef } from 'react';
import sunIcon from '../assets/image_1.png'; 
import './SplashScreen.css';

// --- COMPONENTE DE EFECTOS ---
function BackgroundEffects() {
  const firefliesRef = useRef(null);
  const lanternsRef = useRef(null);

  useEffect(() => {
    // --- ANIMACIÓN LINTERNAS CON IMAGEN ---
    function createLantern() {
      if (!lanternsRef.current) return;
      
      const lantern = document.createElement('div');
      lantern.classList.add('lantern');
      lantern.style.left = Math.random() * 95 + 'vw';
      
      const widthSize = Math.random() * 40 + 50; 
      lantern.style.width = widthSize + 'px';
      lantern.style.height = (widthSize * 1.3) + 'px'; 
      lantern.style.animationDuration = (Math.random() * 10 + 12) + 's';
      lantern.style.animationDelay = Math.random() * 3 + 's';
      
      // Inyectamos la imagen de la linterna
      const img = document.createElement('img');
      img.src = '/lantern.png';
      img.className = 'lantern-img';
      lantern.appendChild(img);

      lanternsRef.current.appendChild(lantern);
      
      setTimeout(() => { 
        if (lantern.parentNode) lantern.remove(); 
      }, 25000);
    }

    for(let i = 0; i < 5; i++) createLantern();
    const lanternInterval = setInterval(createLantern, 2500);

    // --- ANIMACIÓN LUCIÉRNAGAS ---
    function createFirefly() {
      if (!firefliesRef.current) return;
      
      const firefly = document.createElement('div');
      firefly.classList.add('firefly');
      firefly.style.left = Math.random() * 100 + 'vw';
      firefly.style.top = Math.random() * 100 + 'vh';
      
      const moveX = (Math.random() * 200 - 100) + 'px'; 
      const moveY = (Math.random() * 200 - 100) + 'px';
      firefly.style.setProperty('--moveX', moveX);
      firefly.style.setProperty('--moveY', moveY);
      firefly.style.animationDuration = (Math.random() * 3 + 2) + 's';
      
      firefliesRef.current.appendChild(firefly);
      
      setTimeout(() => { 
        if (firefly.parentNode) firefly.remove(); 
      }, 5000);
    }
    
    const fireflyInterval = setInterval(createFirefly, 300);

    return () => {
      clearInterval(lanternInterval);
      clearInterval(fireflyInterval);
    };
  }, []);

  return (
    <>
      <div className="firefly-container" ref={firefliesRef}></div>
      <div className="lantern-container" ref={lanternsRef}></div>
    </>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function SplashScreen() {
  
  return (
    <div className="splash-overlay">
      <div className="fairy-dust"></div>
      
      {/* CAPA DE EFECTOS: Luciérnagas y linternas con imagen */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
        <BackgroundEffects />
      </div>
      
      {/* CONTENIDO CENTRAL */}
      <div className="splash-content" style={{ position: 'relative', zIndex: 10 }}>
        <img src={sunIcon} alt="Sol Dorado" className="splash-sun" />
        <h1 className="splash-title">Mis XV Años</h1>
        <h2 className="splash-name">Melanie</h2>
      </div>
    </div>
  );
}