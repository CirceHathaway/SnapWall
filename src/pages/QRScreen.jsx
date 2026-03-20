import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from "react-qr-code";
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import './QRScreen.css';

export default function QRScreen() {
  const { eventId } = useParams();
  const [nombreEvento, setNombreEvento] = useState('');
  
  const urlInvitado = `${window.location.origin}/evento/${eventId}`;

  useEffect(() => {
    const obtenerNombreEvento = async () => {
      if (!eventId) return;
      try {
        const docRef = doc(db, "eventos", eventId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNombreEvento(docSnap.data().nombre);
        }
      } catch (error) {
        console.error("Error al obtener nombre:", error);
      }
    };
    obtenerNombreEvento();
  }, [eventId]);

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

  const { parte1, parte2 } = formatearTitulo(nombreEvento || "Bienvenidos");

  return (
    <div className="qr-screen-container">
      
      <div className="fairy-dust"></div>

      <div className="event-header">
        <h1 className="event-title">
          {/* Clases únicas para evitar choques con el Álbum */}
          <span className="qr-title-bold">{parte1}</span>
          {parte2 && <span className="qr-title-script">{parte2}</span>}
        </h1>
      </div>

      <div className="split-layout">
        
        <div className="left-panel">
          <div className="qr-frame-static">
            <div className="qr-white-box">
              <QRCode 
                value={urlInvitado} 
                size={400} 
                fgColor="#2e003e" 
              />
            </div>
            <div className="qr-gold-glow"></div>
          </div>
        </div>

        <div className="right-panel">
          <h2 className="instruction-text">
            Escanea el QR y comparte tu foto o mensaje en la pantalla.
          </h2>
          <div className="decoration-line"></div>
        </div>

      </div>

    </div>
  );
}