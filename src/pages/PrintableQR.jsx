import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from "react-qr-code";

export default function PrintableQR() {
  const { eventId } = useParams();
  const urlParaInvitados = `${window.location.origin}/evento/${eventId}`;
  const svgRef = useRef(null);

  const descargarQR = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    // Mantenemos tamaño grande (1000px) para que la IMPRESIÓN salga nítida
    // aunque en pantalla se vea más chico.
    const size = 1000; 
    canvas.width = size;
    canvas.height = size;

    const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, size, size);
      
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR-Mesa-${eventId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = url;
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#121212', // FONDO NEGRO
      fontFamily: 'sans-serif',
      overflow: 'hidden' // EVITAR SCROLL
    }}>
      
      <div style={{
        background: 'white', 
        padding: '30px 40px', // Padding reducido para que entre mejor
        borderRadius: '20px', 
        boxShadow: '0 0 30px rgba(255,255,255,0.1)', // Sombra sutil blanca
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '90%',
        maxHeight: '90vh' // Asegura que nunca sea más alto que la pantalla
      }}>
        <h2 style={{marginTop:0, color:'#333', marginBottom: '5px', fontSize: '1.5rem'}}>QR para Imprimir</h2>
        <p style={{color:'#666', marginBottom:'20px', maxWidth: '300px', fontSize: '0.9rem'}}>
          Descarga este código para poner en las mesas.
        </p>
        
        {/* QR LIMPIO - Tamaño visual ajustado a 250 para que no desborde */}
        <div style={{background:'white', padding:'5px', border: '1px solid #eee'}}>
            <QRCode 
              value={urlParaInvitados} 
              size={250} 
              ref={svgRef}
              fgColor="#000000"
              bgColor="#ffffff"
            />
        </div>

        <div style={{marginTop: '25px', display:'flex', gap:'15px', flexWrap: 'wrap', justifyContent: 'center'}}>
          <button 
            onClick={descargarQR}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            ⬇️ Descargar PNG
          </button>

          <button 
            onClick={() => window.print()}
            style={{
              padding: '10px 20px',
              background: '#4b5563',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Estilos para ocultar botones y fondo negro al imprimir con Ctrl+P */}
      <style>{`
        @media print {
          body { background: white; margin: 0; padding: 0; }
          body * { visibility: hidden; }
          svg, svg * { visibility: visible; }
          /* Centrar el QR en la hoja al imprimir */
          svg { 
            position: absolute; 
            left: 50%; 
            top: 40%; 
            transform: translate(-50%, -50%); 
            width: 400px; 
            height: 400px; 
          }
        }
      `}</style>
    </div>
  );
}