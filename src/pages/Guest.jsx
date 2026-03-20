import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import './Guest.css';

// Componente reutilizable para el Footer
const Footer = () => (
  <footer className="guest-footer">
    {/* CORRECCIÓN: Un solo className unificado */}
    <div translate="no" className="notranslate footer-brand">
      <span className="guest-title-bold">Snap</span>
      <span className="guest-title-script">Wall</span>
    </div>
    <div className="footer-bottom-row">
      <div className="footer-credits">Este es un servicio hecho por CirceHathaway</div>
      <div className="footer-socials">
        <a href="#" className="footer-social-link" title="Instagram">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        </a>
        <a href="#" className="footer-social-link" title="Facebook">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
        </a>
        <a href="#" className="footer-social-link" title="WhatsApp">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path><path d="M10 10l.01 .011"></path><path d="M14 14l.01 .011"></path><path d="M10 14a4 4 0 0 0 4 -4"></path></svg>
        </a>
      </div>
    </div>
  </footer>
);

export default function Guest() {
  const { eventId } = useParams();
  
  const [eventoActivo, setEventoActivo] = useState(true);
  const [cargandoEvento, setCargandoEvento] = useState(true);

  const [imagenes, setImagenes] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [nombre, setNombre] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const verificarEstadoEvento = async () => {
      try {
        const docRef = doc(db, "eventos", eventId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setEventoActivo(docSnap.data().activo !== false);
        } else {
          setEventoActivo(false);
        }
      } catch (error) {
        console.error("Error verificando evento:", error);
      } finally {
        setCargandoEvento(false);
      }
    };
    
    verificarEstadoEvento();
  }, [eventId]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImagenes(filesArray);
    }
  };

  const subirACloudinary = async (file) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "social_wall_preset"); 
    data.append("cloud_name", "dnxwqihwe"); 

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/dnxwqihwe/image/upload`, 
      { method: "POST", body: data }
    );
    const fileData = await res.json();
    return fileData.secure_url;
  };

  const enviarContenido = async (e) => {
    e.preventDefault();
    if (imagenes.length === 0 && !mensaje.trim()) return;

    setSubiendo(true);

    try {
      const collectionRef = collection(db, `eventos/${eventId}/contenido`);
      const autorFinal = nombre.trim() !== "" ? nombre : "Invitado";

      if (imagenes.length > 0) {
        const promesasDeSubida = imagenes.map(async (img, index) => {
          const url = await subirACloudinary(img);
          const esPrimeraFoto = index === 0;
          return addDoc(collectionRef, {
            tipo: 'foto',
            urlImagen: url,
            mensaje: esPrimeraFoto ? mensaje : "", 
            autor: autorFinal,
            fecha: serverTimestamp(),
            estado: 'pendiente' 
          });
        });
        await Promise.all(promesasDeSubida);
      } else {
        await addDoc(collectionRef, {
          tipo: 'texto',
          mensaje: mensaje,
          autor: autorFinal,
          fecha: serverTimestamp(),
          estado: 'pendiente' 
        });
      }

      setImagenes([]);
      setMensaje('');
      setNombre('');
      if (fileInputRef.current) fileInputRef.current.value = "";
      alert("¡Enviado con éxito! 🚀 (Esperando aprobación del moderador)");

    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al subir.");
    } finally {
      setSubiendo(false);
    }
  };

  const isFormEmpty = imagenes.length === 0 && !mensaje.trim();

  // PANTALLA DE CARGA
  if (cargandoEvento) {
    return (
      <div className="guest-container loading-container">
         <div className="spinner"></div>
      </div>
    );
  }

  // PANTALLA EVENTO FINALIZADO
  if (!eventoActivo) {
    return (
      <div className="guest-container">
        <div className="guest-main-content">
          <div translate="no" className="notranslate guest-logo">
            <span className="guest-title-bold">Snap</span>
            <span className="guest-title-script">Wall</span>
          </div>
          <div className="guest-card" style={{textAlign: 'center', padding: '50px 30px'}}>
            <h2 style={{fontSize: '2rem', margin: '0 0 10px 0'}}>✨ Evento Finalizado</h2>
            <p style={{color: '#aaa', lineHeight: '1.5', marginBottom: '30px'}}>
              La recepción de fotos y mensajes ha terminado. <br/>
              ¡Gracias por ser parte de este momento tan especial!
            </p>
            <Link to={`/album/${eventId}`} style={{textDecoration: 'none'}}>
              <button className="guest-submit-btn">
                📂 Ver Álbum Digital
              </button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // PANTALLA NORMAL (ACTIVO)
  return (
    <div className="guest-container">
      <div className="guest-main-content">
        
        {/* LOGO FUERA DE LA TARJETA CON TIPOGRAFÍA DIVIDIDA */}
        <div translate="no" className="notranslate guest-logo">
          <span className="guest-title-bold">Snap</span>
          <span className="guest-title-script">Wall</span>
        </div>

        <div className="guest-card">
          <h2 className="guest-title">👋 ¡Comparte este momento con nosotros!</h2>
          <form onSubmit={enviarContenido} className="guest-form">
            <div className="guest-upload-box" onClick={() => fileInputRef.current.click()}>
              <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="guest-file-input" />
              <span className="guest-upload-icon">📸</span>
              <p className="guest-upload-text">
                {imagenes.length > 0 ? `¡${imagenes.length} fotos listas!` : "Tocar para subir fotos"}
              </p>
            </div>
            <div className="guest-textarea-container">
              <textarea placeholder="Escribe una dedicatoria..." value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={442} className="guest-textarea" />
              <div className="guest-char-counter">{mensaje.length} / 442</div>
            </div>
            {mensaje.trim().length > 0 && (
              <div className="guest-name-container">
                <label className="guest-label">¿Quién escribe?</label>
                <input type="text" placeholder="Tu nombre (Opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} className="guest-input" />
              </div>
            )}
            <button type="submit" disabled={subiendo || isFormEmpty} className={`guest-submit-btn ${subiendo ? 'btn-uploading' : ''}`}>
              {subiendo ? (
                <div className="spinner-container">
                  <span className="spinner"></span>
                  <span>Subiendo magia...</span>
                </div>
              ) : ('Enviar a la Pantalla 🚀')}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}