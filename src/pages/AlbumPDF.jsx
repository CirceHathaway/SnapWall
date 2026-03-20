import { useEffect, useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import './AlbumPDF.css';

export default function AlbumPDF({ fotos, nombreEvento, onComplete }) {
  const pdfContainerRef = useRef(null);
  const [progreso, setProgreso] = useState('✨ Analizando proporciones de las fotos...');
  const [paginas, setPaginas] = useState([]);
  const [listoParaImprimir, setListoParaImprimir] = useState(false);

  // TRUCO INFALIBLE: Evita que el navegador bloquee las fotos de Firebase por estar en caché
  const obtenerUrlSegura = (url) => {
    if (!url) return '';
    return `${url}${url.includes('?') ? '&' : '?'}nocache=${Date.now()}`;
  };

  useEffect(() => {
    const prepararLibro = async () => {
      try {
        const fotosProcesadas = await Promise.all(
          fotos.map(async (f) => {
            if (!f.urlImagen) return { ...f, tipoLayout: 'solo-texto' };

            return new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                const esHorizontal = img.width > img.height;
                const tieneMensaje = Boolean(f.mensaje && f.mensaje.trim() !== "");
                
                let tipoLayout = '';
                if (tieneMensaje) {
                  tipoLayout = 'foto-mensaje'; 
                } else {
                  tipoLayout = esHorizontal ? 'foto-horizontal' : 'foto-vertical'; 
                }
                
                resolve({ ...f, tipoLayout });
              };
              img.onerror = () => resolve({ ...f, tipoLayout: 'foto-horizontal' }); 
              img.src = obtenerUrlSegura(f.urlImagen);
            });
          })
        );

        setProgreso('Armando las hojas del álbum...');
        let paginasArmadas = [];
        let paginaActual = null;

        const guardarPagina = () => {
          if (paginaActual) {
            paginasArmadas.push(paginaActual);
            paginaActual = null;
          }
        };

        fotosProcesadas.forEach((item) => {
          if (item.tipoLayout === 'foto-mensaje') {
            guardarPagina();
            paginasArmadas.push({ tipo: 'unica', items: [item] });
          } 
          else if (item.tipoLayout === 'foto-vertical' || item.tipoLayout === 'foto-horizontal') {
            if (paginaActual && paginaActual.tipo === 'doble-foto' && paginaActual.items.length < 2) {
              paginaActual.items.push(item);
            } else {
              guardarPagina();
              paginaActual = { tipo: 'doble-foto', items: [item] };
            }
          } 
          else if (item.tipoLayout === 'solo-texto') {
            if (paginaActual && paginaActual.tipo === 'grilla-textos' && paginaActual.items.length < 3) {
              paginaActual.items.push(item);
            } else {
              guardarPagina();
              paginaActual = { tipo: 'grilla-textos', items: [item] };
            }
          }
        });
        guardarPagina();

        setPaginas(paginasArmadas);
        setListoParaImprimir(true);

      } catch (error) {
        console.error("Error al preparar fotos", error);
        onComplete();
      }
    };

    prepararLibro();
  }, [fotos, onComplete]);

  useEffect(() => {
    if (!listoParaImprimir) return;

    const generarPDF = async () => {
      setProgreso('Renderizando en alta calidad (puede tardar un poco)...');
      
      // Esperamos 4 segundos para asegurar que hasta la última foto termine de cargar en el DOM
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      setProgreso('Creando el archivo PDF final...');

      const elemento = pdfContainerRef.current;
      const opciones = {
        margin: 0,
        filename: `${nombreEvento.replace(/\s+/g, '_')}_Album.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          allowTaint: true,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          scrollY: 0
        },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
      };

      try {
        await html2pdf().set(opciones).from(elemento).save();
      } catch (error) {
        console.error("Error al compilar PDF:", error);
        alert("Hubo un error al generar el documento.");
      } finally {
        onComplete();
      }
    };

    generarPDF();
  }, [listoParaImprimir, nombreEvento, onComplete]);

  const IconoMensaje = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#b91646">
      <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16ZM7 9H17V11H7V9ZM7 12H14V14H7V12Z" />
    </svg>
  );

  return (
    <div className="pdf-export-wrapper">
      
      <div className="pdf-loading-overlay">
        <div className="pdf-loading-card">
          <div className="loader"></div>
          <h2>{progreso}</h2>
          <p>No cierres esta ventana.</p>
        </div>
      </div>

      <div className="pdf-generator-container" ref={pdfContainerRef}>
        
        {/* PORTADA: Usamos ruta relativa directa a public */}
        <div className="pdf-a4-page">
          <img src="/portada-pdf.jpg" className="pdf-bg-image" alt="Portada" />
        </div>

        {paginas.map((pagina, indexPagina) => (
          <div key={`pdf-page-${indexPagina}`} className="pdf-a4-page">
            
            {/* FONDO: Usamos ruta relativa directa a public */}
            <img src="/fondo-pdf.jpg" className="pdf-bg-image" alt="Fondo" />
            
            <div className="pdf-content-area">
              
              {pagina.tipo === 'doble-foto' && (
                <div className="pdf-layout-doble">
                  {pagina.items.map(item => (
                    <div key={item.id} className="pdf-photo-box">
                      <img src={obtenerUrlSegura(item.urlImagen)} alt="Recuerdo" crossOrigin="anonymous" />
                    </div>
                  ))}
                </div>
              )}

              {pagina.tipo === 'unica' && pagina.items.map(item => (
                <div key={item.id} className="pdf-layout-unica">
                  <div className="pdf-photo-box-grande">
                    <img src={obtenerUrlSegura(item.urlImagen)} alt="Recuerdo" crossOrigin="anonymous" />
                  </div>
                  <div className="pdf-cartel-mensaje">
                    <div className="pdf-cartel-circulo"><IconoMensaje /></div>
                    <div className="pdf-cartel-texto">"{item.mensaje}"</div>
                    <div className="pdf-cartel-autor">— {item.autor || 'Invitado'}</div>
                  </div>
                </div>
              ))}

              {pagina.tipo === 'grilla-textos' && (
                <div className="pdf-layout-textos">
                  {pagina.items.map(item => (
                    <div key={item.id} className="pdf-cartel-mensaje">
                      <div className="pdf-cartel-circulo"><IconoMensaje /></div>
                      <div className="pdf-cartel-texto">"{item.mensaje}"</div>
                      <div className="pdf-cartel-autor">— {item.autor || 'Invitado'}</div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

    </div>
  );
}