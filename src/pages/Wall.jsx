import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from "react-qr-code"; 
import './Wall.css';

export default function Wall() {
  const { eventId } = useParams();
  
  const [fotos, setFotos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [heroItem, setHeroItem] = useState(null);
  
  const [heroPaso, setHeroPaso] = useState({ tipo: 'foto', url: '' });
  
  const colaPasosRef = useRef([]);
  const isHeroPlayingRef = useRef(false);
  const heroTimeoutRef = useRef(null);
  const preCargaTimeoutRef = useRef(null); 

  // Estado para manejar los 3 tiempos del ciclo (0 = Esquinas, 1 = Ticker, 2 = QR Central)
  const [faseCiclo, setFaseCiclo] = useState(0);
  const faseCicloRef = useRef(0); // Referencia mutable para leer el valor exacto dentro de los timeouts

  const idsMostradosRef = useRef(new Set());
  const isFirstLoad = useRef(true);

  const urlInvitado = `${window.location.origin}/evento/${eventId}`;

  // Mantener la referencia sincronizada con el estado real
  useEffect(() => {
    faseCicloRef.current = faseCiclo;
  }, [faseCiclo]);

  useEffect(() => {
    const q = query(collection(db, `eventos/${eventId}/contenido`), orderBy('fecha', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const contenidoAprobado = todos.filter(item => item.estado !== 'pendiente');
      
      const feedFotos = contenidoAprobado.filter(item => item.urlImagen);
      const feedMensajes = contenidoAprobado.filter(item => item.mensaje && item.mensaje.trim() !== "");

      if (isFirstLoad.current) {
        contenidoAprobado.forEach(item => idsMostradosRef.current.add(item.id));
        isFirstLoad.current = false;
      } else {
        const nuevosAprobados = contenidoAprobado.filter(item => !idsMostradosRef.current.has(item.id));
        
        if (nuevosAprobados.length > 0) {
          activarHeroMode(nuevosAprobados); 
          nuevosAprobados.forEach(item => idsMostradosRef.current.add(item.id));
        }
      }

      setFotos(feedFotos);
      setMensajes(feedMensajes);
    });

    return () => unsubscribe();
  }, [eventId]);

  const activarHeroMode = (nuevosItems) => {
    let nuevosPasos = [];

    nuevosItems.forEach(item => {
      if (item.urlImagen) {
        let urls = [];
        if (Array.isArray(item.urlImagen)) {
          urls = item.urlImagen;
        } else if (typeof item.urlImagen === 'string' && item.urlImagen.includes(',')) {
          urls = item.urlImagen.split(',').map(url => url.trim());
        } else {
          urls = [item.urlImagen];
        }
        urls.forEach(url => nuevosPasos.push({ tipo: 'foto', url: url, itemOriginal: item }));
      }

      if (item.mensaje && item.mensaje.trim() !== "") {
        nuevosPasos.push({ tipo: 'mensaje', url: '', itemOriginal: item });
      }
    });

    colaPasosRef.current.push(...nuevosPasos);

    if (!isHeroPlayingRef.current) {
      procesarSiguienteHero();
    }
  };

  const procesarSiguienteHero = () => {
    // Si la fase es 2 (Tiempo 3 - QR Gigante), pausamos el Hero Mode hasta que termine.
    if (faseCicloRef.current === 2) {
      isHeroPlayingRef.current = false;
      return; 
    }

    if (colaPasosRef.current.length === 0) {
      isHeroPlayingRef.current = false;
      setHeroItem(null);
      return;
    }

    isHeroPlayingRef.current = true;
    const siguientePaso = colaPasosRef.current.shift(); 

    preCargaTimeoutRef.current = setTimeout(() => {
      setHeroItem(siguientePaso.itemOriginal);
      setHeroPaso({ tipo: siguientePaso.tipo, url: siguientePaso.url });

      const duracion = siguientePaso.tipo === 'foto' ? 25000 : 25000;

      heroTimeoutRef.current = setTimeout(() => {
        procesarSiguienteHero();
      }, duracion);
    }, 4000); 
  };

  // Si salimos del Tiempo 3 (fase 2) y hay elementos esperando en la fila, activamos el Hero
  useEffect(() => {
    if (faseCiclo !== 2 && !isHeroPlayingRef.current && colaPasosRef.current.length > 0) {
      procesarSiguienteHero();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faseCiclo]);

  useEffect(() => {
    return () => {
      if (heroTimeoutRef.current) clearTimeout(heroTimeoutRef.current);
      if (preCargaTimeoutRef.current) clearTimeout(preCargaTimeoutRef.current);
    };
  }, []);

  const getClaseTexto = (txt) => {
    if (!txt) return '';
    if (txt.length > 300) return 'texto-xl';      
    if (txt.length > 150) return 'texto-l';       
    return 'texto-s';                             
  };

  useEffect(() => {
    if (fotos.length < 2) return;
    const intervalo = setInterval(() => {
      setHeroItem(currentHero => {
        if (!currentHero) setIndiceActual(prev => (prev + 1) % fotos.length);
        return currentHero;
      });
    }, 20000); 
    return () => clearInterval(intervalo);
  }, [fotos.length]);

  // CAMBIO: Ciclo de 3 tiempos con duraciones independientes
  useEffect(() => {
    let duracion = 180000; // Valor de seguridad
    if (faseCiclo === 0) duracion = 400000; // 5 minutos para Tiempo 1 (QR y Logo en Esquinas)
    if (faseCiclo === 1) duracion = 400000; // 5 minutos para Tiempo 2 (Ticker Mensajes Inferior)
    if (faseCiclo === 2) duracion = 180000; // 2 minutos para Tiempo 3 (QR Gigante Central)

    const timeoutFases = setTimeout(() => {
      setFaseCiclo(prev => (prev + 1) % 3);
    }, duracion);

    return () => clearTimeout(timeoutFases);
  }, [faseCiclo]);

  const fotoActual = fotos[indiceActual % fotos.length];

  const IconoMensaje = () => (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
      <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16ZM7 9H17V11H7V9ZM7 12H14V14H7V12Z" />
    </svg>
  );

  return (
    <div className="wall-container">
      
      <div className="fairy-dust"></div>

      {/* ÁREA CENTRAL: Muestra Fotos Normales, o el Hero. Oculto solo en Fase 2 (Tiempo 3) */}
      {/* CAMBIO Z-INDEX: Le agregamos style con zIndex superior para que tape al QR del Tiempo 1 */}
      {faseCiclo !== 2 && (
        <div className="slideshow-area" style={{ zIndex: heroItem ? 200 : 10 }}>
          <AnimatePresence mode="wait">
            {heroItem ? (
              // --- MODO HERO (INTERRUMPE LA GALERÍA Y SE PONE POR ENCIMA DE TODO) ---
              heroPaso.tipo === 'foto' ? (
                <motion.img 
                  key={`hero-foto-${heroPaso.url}`} 
                  src={heroPaso.url} 
                  className="active-slide" 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  onLoad={(e) => {
                    if (e.target.naturalWidth > e.target.naturalHeight) {
                      e.target.classList.add('foto-horizontal-slide');
                    }
                  }}
                />
              ) : (
                <motion.div 
                  key={`hero-msg-${heroItem.id}`}
                  className="hero-text-card card-blue"
                  initial={{ scale: 0.8, y: 50, opacity: 0 }} 
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="hero-card-circle"><IconoMensaje /></div>
                  <h1 className={`hero-big-text ${getClaseTexto(heroItem.mensaje)}`}>
                    "{heroItem.mensaje}"
                  </h1>
                  <div className="hero-author-line">
                    — {heroItem.autor || 'Invitado'}
                  </div>
                </motion.div>
              )
            ) : fotoActual ? (
              // --- MODO SLIDESHOW NORMAL ---
              <motion.img
                key={`slide-${fotoActual.id}`} src={fotoActual.urlImagen} className="active-slide"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 1 }}
                onLoad={(e) => {
                  if (e.target.naturalWidth > e.target.naturalHeight) {
                    e.target.classList.add('foto-horizontal-slide');
                  }
                }}
              />
            ) : (
              <div style={{color: 'white', textAlign: 'center', zIndex: 10}}>
                <h1>Esperando recuerdos...</h1>
                <p>Escanea el QR y sube tu foto (requiere aprobación)</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ELEMENTOS SUPERPUESTOS SEGÚN LA FASE DEL CICLO */}
      <AnimatePresence>
        
        {/* TIEMPO 1: QR Inferior y Logo Inferior */}
        {faseCiclo === 0 && (
          <>
            <motion.div 
              className="wall-qr-container"
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <div className="wall-qr-box">
                <QRCode 
                  value={urlInvitado} 
                  size={140} 
                  fgColor="#2e003e" 
                />
              </div>
            </motion.div>

            <motion.div 
              className="wall-brand-container"
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.1 }}
            >
              <span className="wall-logo-bold">Snap</span>
              <span className="wall-logo-script">Wall</span>
            </motion.div>
          </>
        )}

        {/* TIEMPO 2: Ticker de Mensajes (Footer) */}
        {faseCiclo === 1 && mensajes.length > 0 && (
          <motion.div 
            className="footer-ticker"
            initial={{ y: 80 }} 
            animate={{ y: 0 }} 
            exit={{ y: 80 }} 
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div className="ticker-track">
              {mensajes.map((m) => (<div key={m.id} className="ticker-item"><span className="ticker-text">{m.mensaje}</span><span className="ticker-author">({m.autor || 'Invitado'})</span></div>))}
              {mensajes.map((m) => (<div key={`dup-${m.id}`} className="ticker-item"><span className="ticker-text">{m.mensaje}</span><span className="ticker-author">({m.autor || 'Invitado'})</span></div>))}
            </div>
          </motion.div>
        )}

        {/* TIEMPO 3: QR GIGANTE CENTRAL */}
        {faseCiclo === 2 && (
          <motion.div 
            className="qr-central-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div 
              className="hero-text-card card-blue"
              style={{ padding: '60px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}
              initial={{ scale: 0.8, y: 50, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
                <span className="wall-logo-bold" style={{ fontSize: '4.5rem' }}>Snap</span>
                <span className="wall-logo-script" style={{ fontSize: '5.5rem' }}>Wall</span>
              </div>
              
              <div style={{ background: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
                <QRCode 
                  value={urlInvitado} 
                  size={400} 
                  fgColor="#2e003e" 
                />
              </div>

              <h2 style={{ fontFamily: "'Segoe UI', sans-serif", fontSize: '2.5rem', color: 'white', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                ¡Escanea para subir tus fotos!
              </h2>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}