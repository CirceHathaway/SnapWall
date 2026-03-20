import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore'; 
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import AlbumPDF from './AlbumPDF'; // IMPORTAMOS EL MOTOR SEPARADO
import './Album.css';

export default function Album() {
  const { eventId } = useParams();
  const [fotos, setFotos] = useState([]);
  const [nombreEvento, setNombreEvento] = useState(''); 
  const [cargando, setCargando] = useState(true);
  
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [textModalOpen, setTextModalOpen] = useState(false);

  const [descargandoZip, setDescargandoZip] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false); // CONTROL DEL PDF

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const eventDocRef = doc(db, "eventos", eventId);
        const eventSnap = await getDoc(eventDocRef);
        if (eventSnap.exists()) {
          setNombreEvento(eventSnap.data().nombre);
        }

        const q = query(collection(db, `eventos/${eventId}/contenido`), orderBy('fecha', 'asc'));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFotos(docs);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [eventId]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const items = document.querySelectorAll('.masonry-item');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [fotos]);

  const formatearTitulo = (titulo) => {
    if (!titulo) return { parte1: '', parte2: '' };
    const indiceDe = titulo.toLowerCase().lastIndexOf(" de ");
    if (indiceDe !== -1) {
      return { parte1: titulo.substring(0, indiceDe + 4).trim(), parte2: titulo.substring(indiceDe + 4).trim() };
    }
    const primerEspacio = titulo.indexOf(" ");
    if (primerEspacio !== -1) {
      return { parte1: titulo.substring(0, primerEspacio).trim(), parte2: titulo.substring(primerEspacio + 1).trim() };
    }
    return { parte1: titulo, parte2: '' };
  };

  const { parte1, parte2 } = formatearTitulo(nombreEvento || "Nuestros Recuerdos");

  const getColorClass = (index, hasText) => {
    const colors = ['green', 'red', 'yellow'];
    const color = colors[index % colors.length];
    return hasText ? `album-label-${color}` : `album-full-frame-${color}`;
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setTextModalOpen(false);
    document.body.style.overflow = 'auto';
  };

  const nextImage = useCallback((e) => {
    if(e) e.stopPropagation();
    setLightboxIndex((prev) => (prev + 1) % fotos.length);
  }, [fotos.length]);

  const prevImage = useCallback((e) => {
    if(e) e.stopPropagation();
    setLightboxIndex((prev) => (prev - 1 + fotos.length) % fotos.length);
  }, [fotos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, nextImage, prevImage]);

  const currentItem = lightboxIndex !== null ? fotos[lightboxIndex] : null;

  const renderMessage = (msg) => {
    const limit = 80;
    if (msg.length <= limit) return <span>"{msg}"</span>;
    return (
      <span>
        "{msg.substring(0, limit)}..." 
        <span className="read-more-link" onClick={(e) => { e.stopPropagation(); setTextModalOpen(true); }}>
           Ver más
        </span>
      </span>
    );
  };

  const descargarFotoDirecta = async (url, id) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Recuerdo-${id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      window.open(url, '_blank'); 
    }
  };

  const generarZIP = async () => {
    setDescargandoZip(true);
    try {
      const zip = new JSZip();
      const carpeta = zip.folder("Recuerdos");
      const fotosConUrl = fotos.filter(f => f.urlImagen);

      await Promise.all(fotosConUrl.map(async (foto, index) => {
        try {
          const res = await fetch(foto.urlImagen, { mode: 'cors' });
          const blob = await res.blob();
          carpeta.file(`Foto_${index + 1}.jpg`, blob);
        } catch (e) {
          console.error("Error zipeando imagen", e);
        }
      }));

      const contenidoZip = await zip.generateAsync({ type: "blob" });
      saveAs(contenidoZip, `${nombreEvento.replace(/\s+/g, '_')}_Fotos.zip`);
    } catch (error) {
      alert("Hubo un error al generar el ZIP.");
    } finally {
      setDescargandoZip(false);
    }
  };

  return (
    <div className="album-container">
      
      <div className="album-background-decorations">
        <img src="/adorno1.png" alt="" className="bg-decor top-left" />
        <img src="/adorno2.png" alt="" className="bg-decor bottom-right" />
        <img src="/adorno3.png" alt="" className="bg-decor bottom-left" />
      </div>

      <div className="album-header">
        <h1 className="album-title">
          <span className="title-bold">{parte1}</span>
          {parte2 && <span className="title-script">{parte2}</span>}
        </h1>
        
        <p className="album-subtitle">
          {cargando ? 'Cargando magia...' : 'Un Viaje a Través de Momentos Inolvidables'}
        </p>

        <div className="css-separator">
          <div className="separator-diamond"></div>
          <div className="separator-line-group">
            <div className="separator-line"></div>
            <div className="separator-line"></div>
          </div>
          <div className="separator-center-star">
            <div className="star-circle">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#b91646">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
              </svg>
            </div>
          </div>
          <div className="separator-line-group">
            <div className="separator-line"></div>
            <div className="separator-line"></div>
          </div>
          <div className="separator-diamond"></div>
        </div>

        {fotos.length > 0 && (
          <div className="album-action-buttons">
            <button onClick={generarZIP} disabled={descargandoZip} className="btn-export zip-btn">
              {descargandoZip ? '📦 Empaquetando fotos...' : '📦 Descargar Todas las Fotos (.ZIP)'}
            </button>
            <button onClick={() => setGenerandoPdf(true)} disabled={generandoPdf} className="btn-export pdf-btn">
              {generandoPdf ? '📄 Creando tu PDF...' : '📄 Guardar Álbum Visual (.PDF)'}
            </button>
          </div>
        )}
      </div>

      <div className="masonry-grid">
        {fotos.map((item, index) => {
          const hasText = Boolean(item.mensaje && item.mensaje.trim() !== "");
          return (
            <div 
              key={item.id} 
              className={`masonry-item ${!item.urlImagen ? 'album-custom-text-card' : ''}`} 
              onClick={() => openLightbox(index)}
            >
              {item.urlImagen ? (
                <div className={`album-photo-frame ${getColorClass(index, hasText)}`}>
                  <div className="album-photo-wrapper">
                    <img src={item.urlImagen} alt="Recuerdo" className="album-photo" loading="lazy" crossOrigin="anonymous" />
                  </div>
                  {hasText && (
                    <div className="album-item-footer">
                      <div className="album-item-message">"{item.mensaje}"</div>
                      <div className="album-item-author">— {item.autor || 'Invitado'}</div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                   <div className="album-layer-papel"></div>
                   <img src="/florSuperior.png" className="album-layer-adorno album-flor-sup-der" alt="" loading="lazy" />
                   <img src="/florDerecho.png" className="album-layer-adorno album-flor-inf-der" alt="" loading="lazy" />
                   <img src="/florInferior.png" className="album-layer-adorno album-flor-inf-izq" alt="" loading="lazy" />
                   <img src="/iconCarta.png" className="album-layer-adorno album-icon-carta" alt="" loading="lazy" />
                   <div className="album-text-content-overlay">
                      <div className="album-text-only-message">"{item.mensaje}"</div>
                      <div className="album-text-only-author">— {item.autor || 'Invitado'}</div>
                   </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {currentItem && (
        <div className="lightbox-overlay"> 
          <div className="lightbox-top-bar" onClick={(e) => e.stopPropagation()}>
            {currentItem.urlImagen && (
              <button onClick={() => descargarFotoDirecta(currentItem.urlImagen, currentItem.id)} className="icon-btn" title="Descargar Original">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            )}
            <button className="icon-btn close-variant" onClick={closeLightbox}>✕</button>
          </div>

          <button className="nav-btn prev-btn" onClick={prevImage}>❮</button>
          <button className="nav-btn next-btn" onClick={nextImage}>❯</button>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {currentItem.urlImagen ? (
              <img src={currentItem.urlImagen} className="lightbox-img" alt="Full size" />
            ) : (
              <div className="lightbox-text-only">"{currentItem.mensaje}"</div>
            )}
            
            {(currentItem.mensaje || currentItem.autor) && (
              <div className="lightbox-details">
                {currentItem.urlImagen && currentItem.mensaje && (
                  <div className="lightbox-message">{renderMessage(currentItem.mensaje)}</div>
                )}
                <div className="lightbox-author">— {currentItem.autor || 'Invitado'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {textModalOpen && currentItem && (
        <div className="text-modal-overlay"> 
          <div className="text-modal-card" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTextModalOpen(false)} style={{position:'absolute', top:'10px', right:'15px', background:'none', border:'none', color:'#333', fontSize:'1.5rem', cursor:'pointer'}}>✕</button>
            <div className="text-modal-content">"{currentItem.mensaje}"</div>
            <div style={{fontFamily: "'Segoe UI', sans-serif", fontSize: '0.9rem', color: '#5a4a42', fontWeight: 'bold', textTransform: 'uppercase'}}>— {currentItem.autor || 'Invitado'}</div>
          </div>
        </div>
      )}

      {/* AQUÍ LLAMAMOS AL MOTOR SEPARADO DE PDF */}
      {generandoPdf && (
        <AlbumPDF 
          fotos={fotos} 
          nombreEvento={nombreEvento} 
          onComplete={() => setGenerandoPdf(false)} 
        />
      )}

    </div>
  );
}