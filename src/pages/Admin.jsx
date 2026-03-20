import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import QRCode from "react-qr-code";
import './Admin.css';

export default function Admin() {
  const [nombreEvento, setNombreEvento] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [correo, setCorreo] = useState('');
  const [fechaEvento, setFechaEvento] = useState('');
  const [tematica, setTematica] = useState('');
  const [comentario, setComentario] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [eventoId, setEventoId] = useState(null);
  const [listaEventos, setListaEventos] = useState([]);
  
  const [fotosAprobadas, setFotosAprobadas] = useState([]);
  const [fotosPendientes, setFotosPendientes] = useState([]);
  const [hayNuevoPendiente, setHayNuevoPendiente] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [selectedEventData, setSelectedEventData] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "eventos"), orderBy("fechaCreacion", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListaEventos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe;
  }, []);

  useEffect(() => {
    if (!eventoId) return;
    
    const q = query(collection(db, `eventos/${eventoId}/contenido`), orderBy('fecha', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const pendientes = docs.filter(d => d.estado === 'pendiente');
      const aprobadas = docs.filter(d => d.estado !== 'pendiente');

      if (pendientes.length > fotosPendientes.length) {
          setHayNuevoPendiente(true);
          setTimeout(() => setHayNuevoPendiente(false), 5000); 
      }

      setFotosPendientes(pendientes);
      setFotosAprobadas(aprobadas);
    });

    return () => unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId]);

  const crearEvento = async (e) => {
    e.preventDefault();
    if (!nombreEvento || !nombreCliente || !correo || !fechaEvento || !tematica) {
        alert("Por favor, completa los campos obligatorios.");
        return;
    }
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "eventos"), {
        nombre: nombreEvento,
        datosCliente: { nombreApellido: nombreCliente, correo, fechaEvento, tematica, comentario: comentario || "Sin comentarios" },
        fechaCreacion: serverTimestamp(),
        activo: true, 
        configuracion: { marco: null, colorFondo: "#000" }
      });
      setEventoId(docRef.id);
      setNombreEvento(''); setNombreCliente(''); setCorreo(''); setFechaEvento(''); setTematica(''); setComentario('');
      setIsCreateModalOpen(false);
    } catch (error) { 
        console.error(error); 
        alert("Error al crear el evento");
    } finally { setLoading(false); }
  };

  const borrarEvento = async (idAEliminar) => {
    if (window.confirm("🚨 ¿Estás seguro de eliminar TODO el evento? Se borrarán los datos del cliente, fotos y mensajes. Esto no se puede deshacer.")) {
      try {
        const contenidoRef = collection(db, `eventos/${idAEliminar}/contenido`);
        const snapshot = await getDocs(contenidoRef);
        const promesasBorrado = snapshot.docs.map(docSnap => deleteDoc(doc(db, `eventos/${idAEliminar}/contenido`, docSnap.id)));
        await Promise.all(promesasBorrado);
        await deleteDoc(doc(db, "eventos", idAEliminar));
        if (eventoId === idAEliminar) setEventoId(null);
      } catch (error) { console.error(error); }
    }
  };

  const finalizarEvento = async () => {
    try {
      const docRef = doc(db, "eventos", eventoId);
      await updateDoc(docRef, { activo: false }); 
      setIsFinishModalOpen(false);
    } catch (error) { console.error(error); }
  };
  
  const aprobarContenido = async (id) => {
      try {
          const docRef = doc(db, `eventos/${eventoId}/contenido`, id);
          await updateDoc(docRef, { estado: 'aprobado' });
      } catch (error) {
          console.error("Error al aprobar:", error);
      }
  };

  const aprobarTodo = async () => {
      if (window.confirm(`¿Estás seguro de aprobar los ${fotosPendientes.length} elementos pendientes al mismo tiempo?`)) {
          try {
              const promesas = fotosPendientes.map(f => 
                  updateDoc(doc(db, `eventos/${eventoId}/contenido`, f.id), { estado: 'aprobado' })
              );
              await Promise.all(promesas);
          } catch (error) {
              console.error("Error al aprobar todo:", error);
              alert("Hubo un error al aprobar todo el contenido.");
          }
      }
  };

  const rechazarContenido = async (id) => {
      try {
          await deleteDoc(doc(db, `eventos/${eventoId}/contenido`, id));
      } catch (error) {
          console.error("Error al rechazar:", error);
      }
  };

  const borrarTodo = async (id) => {
    if (window.confirm("⚠️ ¿Eliminar de la galería pública?")) {
      await deleteDoc(doc(db, `eventos/${eventoId}/contenido`, id));
    }
  };

  const borrarSoloFoto = async (item) => {
    if (window.confirm("¿Quitar solo la imagen?")) {
      await updateDoc(doc(db, `eventos/${eventoId}/contenido`, item.id), { urlImagen: null, tipo: 'texto' });
    }
  };

  const borrarSoloTexto = async (item) => {
    if (window.confirm("¿Quitar solo el mensaje?")) {
      await updateDoc(doc(db, `eventos/${eventoId}/contenido`, item.id), { mensaje: "" });
    }
  };

  const eventoActual = listaEventos.find(e => e.id === eventoId);
  const urlInvitado = eventoId ? `${window.location.origin}/evento/${eventoId}` : '';
  const urlPrint = eventoId ? `${window.location.origin}/print-qr/${eventoId}` : '';
  const urlAlbum = eventoId ? `${window.location.origin}/album/${eventoId}` : '';

  const compartirAlbum = () => {
    navigator.clipboard.writeText(urlAlbum);
    alert("¡Link del álbum copiado!");
  };

  return (
    <div className="admin-container">
      <div className="admin-content">
        
        <div className="admin-header">
          <h1 className="admin-title">Panel Admin 👮‍♂️</h1>
          {eventoId && <button onClick={() => setEventoId(null)} className="btn-back">← Volver</button>}
        </div>

        {!eventoId ? (
          <div className="home-grid">
            <div className="admin-card create-section" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px'}}>
              <h3 style={{marginTop:0, marginBottom: '20px'}}>✨ Crear Nuevo Evento</h3>
              <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary" style={{width: 'auto', padding: '15px 40px', fontSize: '1.1rem'}}>Crear +</button>
            </div>
            <div>
              <h3 style={{color:'#aaa', marginTop:0}}>📅 Tus Eventos ({listaEventos.length})</h3>
              <div className="event-list-grid">
                {listaEventos.map(evento => (
                  <div key={evento.id} className="event-card-item" style={{ position: 'relative' }}>
                    <button onClick={() => borrarEvento(evento.id)} className="btn-delete-event" title="Eliminar Evento Permanentemente">🗑️</button>
                    <div>
                      <strong style={{fontSize:'1.1rem', color:'white', display:'block', paddingRight:'30px'}}>
                          {evento.nombre} {!evento.activo && <span style={{color:'#ef4444', fontSize:'0.8rem'}}>(Finalizado)</span>}
                      </strong>
                      <div style={{fontSize:'0.8rem', color:'#888'}}>ID: {evento.id}</div>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        <div className="btn-actions">
                            <button onClick={() => { setSelectedEventData(evento); setIsDataModalOpen(true); }} className="btn-outline" style={{flex: 1, borderColor: '#3b82f6', color: '#3b82f6'}}>📋 + Datos</button>
                            <Link to={`/album/${evento.id}`} target="_blank" style={{flex: 1}}>
                                <button className="btn-outline" style={{width: '100%'}}>📂 Álbum</button>
                            </Link>
                        </div>
                        <button onClick={() => setEventoId(evento.id)} className="btn-manage" style={{width: '100%'}}>Gestionar ➡️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div> 
        ) : (
          <>
            {hayNuevoPendiente && (
                <div className="alert-new-content">
                    🔔 ¡Nuevo contenido de invitado esperando moderación!
                </div>
            )}

            <div className="admin-card dashboard-panel">
              <div className="qr-wrapper"><QRCode value={urlInvitado} size={140} /></div>
              <div className="info-wrapper">
                <h2 style={{marginTop:0}}>
                    {eventoActual?.nombre}
                    {eventoActual?.activo === false && <span style={{color:'#ef4444', fontSize:'1rem', marginLeft:'10px'}}>[FINALIZADO]</span>}
                </h2>
                <div className="links-container">
                    <div className="link-row">
                        <span className="link-label">Link Invitados:</span>
                        <a href={urlInvitado} target="_blank" className="link-blue">Abrir Link ↗</a>
                    </div>
                    <div className="link-row">
                        <span className="link-label">QR para Imprimir:</span>
                        <a href={urlPrint} target="_blank" className="link-green">⬇️ Descargar archivo QR</a>
                    </div>
                </div>
                <div className="action-buttons-grid">
                  {eventoActual?.activo !== false ? (
                      <>
                        <Link to={`/pantalla/${eventoId}`} target="_blank" style={{textDecoration:'none'}}><button className="big-btn btn-purple">🖥️ Pantalla</button></Link>
                        <Link to={`/qr/${eventoId}`} target="_blank" style={{textDecoration:'none'}}><button className="big-btn btn-yellow">📲 QR Proyector</button></Link>
                        <Link to={`/album/${eventoId}`} target="_blank" style={{textDecoration:'none'}}><button className="big-btn btn-blue">📂 Álbum</button></Link>
                        <button className="big-btn btn-red" onClick={() => setIsFinishModalOpen(true)}>🛑 Finalizar</button>
                      </>
                  ) : (
                      <>
                        <button className="big-btn btn-green" onClick={compartirAlbum}>🔗 Compartir Álbum</button>
                        <Link to={`/album/${eventoId}`} target="_blank" style={{textDecoration:'none'}}><button className="big-btn btn-blue">📂 Ver Álbum</button></Link>
                      </>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* SECCIÓN 1: BANDEJA DE MODERACIÓN (PENDIENTES) */}
            {/* ========================================== */}
            {fotosPendientes.length > 0 && (
                <div className="moderation-section">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px'}}>
                        <h3 className="section-title text-yellow" style={{ border: 'none', margin: 0, padding: 0 }}>
                            👀 Pendientes de Aprobación ({fotosPendientes.length})
                        </h3>
                        
                        {/* CAMBIO AQUÍ: flex: 'none' anula el estiramiento y ajusta el botón a la derecha */}
                        {fotosPendientes.length > 1 && (
                            <button onClick={aprobarTodo} className="btn-mod-approve" style={{ flex: 'none', width: 'auto', padding: '8px 15px', fontSize: '0.9rem' }}>
                                ✅ Aprobar Todo
                            </button>
                        )}
                    </div>
                    
                    <p style={{color: '#aaa', marginBottom: '20px', marginTop: '-10px'}}>
                        Revisa el contenido antes de enviarlo a la pantalla.
                    </p>
                    
                    <div className="gallery-grid">
                      {fotosPendientes.map(f => (
                        <div key={f.id} className={`gallery-card pending-card ${!f.urlImagen ? 'text-only-card' : ''}`}>
                          
                          {f.urlImagen && (
                            <div className="card-image-container">
                               <img src={f.urlImagen} alt="Recuerdo" loading="lazy" />
                               {f.mensaje && (
                                 <button className="mini-delete-img" onClick={() => borrarSoloFoto(f)} title="Eliminar solo la imagen">❌ Foto</button>
                               )}
                            </div>
                          )}
                          
                          {f.mensaje && (
                            <div className="card-message-body">
                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                 <p>"{f.mensaje}"</p>
                                 {f.urlImagen && (
                                   <button className="mini-delete-text" onClick={() => borrarSoloTexto(f)} title="Eliminar solo el texto">✖</button>
                                 )}
                              </div>
                            </div>
                          )}
                          
                          <div className="card-footer moderation-footer">
                            <div className="author-info">
                              <div className="avatar-circle" style={{background: '#f59e0b'}}>{f.autor ? f.autor.charAt(0).toUpperCase() : 'I'}</div>
                              <span className="author-name">{f.autor || 'Invitado'}</span>
                            </div>
                            
                            <div className="moderation-buttons">
                                <button onClick={() => rechazarContenido(f.id)} className="btn-mod-reject" title="Eliminar todo">❌ Rechazar</button>
                                <button onClick={() => aprobarContenido(f.id)} className="btn-mod-approve" title="Enviar a la pantalla">✅ Aprobar</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
            )}


            {/* ========================================== */}
            {/* SECCIÓN 2: GALERÍA PÚBLICA (APROBADOS)     */}
            {/* ========================================== */}
            <h3 className="section-title" style={{marginTop: '40px'}}>
                📡 Galería Pública ({fotosAprobadas.length})
            </h3>
            
            <div className="gallery-grid">
              {fotosAprobadas.map(f => (
                <div key={f.id} className={`gallery-card ${!f.urlImagen ? 'text-only-card' : ''}`}>
                  {f.urlImagen && (
                    <div className="card-image-container">
                       <img src={f.urlImagen} alt="Recuerdo" loading="lazy" />
                       {f.mensaje && <button className="mini-delete-img" onClick={() => borrarSoloFoto(f)} title="Eliminar solo la imagen">❌ Foto</button>}
                    </div>
                  )}
                  {f.mensaje && (
                    <div className="card-message-body">
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                         <p>"{f.mensaje}"</p>
                         {f.urlImagen && <button className="mini-delete-text" onClick={() => borrarSoloTexto(f)} title="Eliminar solo el texto">✖</button>}
                      </div>
                    </div>
                  )}
                  <div className="card-footer">
                    <div className="author-info">
                      <div className="avatar-circle">{f.autor ? f.autor.charAt(0).toUpperCase() : 'I'}</div>
                      <span className="author-name">{f.autor || 'Invitado'}</span>
                    </div>
                    <button onClick={() => borrarTodo(f.id)} className="icon-delete-btn" title="Eliminar de la galería">🗑️</button>
                  </div>
                </div>
              ))}
              
              {fotosAprobadas.length === 0 && (
                  <p style={{color: '#666', fontStyle: 'italic', gridColumn: '1 / -1'}}>No hay contenido aprobado todavía.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL CREACIÓN */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h2 style={{margin: 0}}>Crear Nuevo Evento</h2>
                <button className="btn-close-modal" onClick={() => setIsCreateModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={crearEvento} className="admin-form">
                <div className="form-group">
                    <label>Nombre del Evento (Público) *</label>
                    <input type="text" value={nombreEvento} onChange={(e) => setNombreEvento(e.target.value)} placeholder="Ej: Boda de Laura y Juan" className="admin-input" required />
                </div>
                <div className="form-group">
                    <label>Nombre y Apellido del Cliente *</label>
                    <input type="text" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Ej: Juan Perez" className="admin-input" required />
                </div>
                <div className="form-group">
                    <label>Correo Electrónico *</label>
                    <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Ej: cliente@email.com" className="admin-input" required />
                </div>
                <div className="form-row">
                    <div className="form-group" style={{flex: 1}}>
                        <label>Fecha del Evento *</label>
                        <input type="date" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} className="admin-input" required />
                    </div>
                    <div className="form-group" style={{flex: 1}}>
                        <label>Temática *</label>
                        <input type="text" value={tematica} onChange={(e) => setTematica(e.target.value)} placeholder="Ej: Rapunzel, Blanco y Negro" className="admin-input" required />
                    </div>
                </div>
                <div className="form-group">
                    <label>Comentario (Opcional)</label>
                    <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Notas adicionales..." className="admin-input" rows="3"></textarea>
                </div>
                <button type="submit" disabled={loading} className="btn-primary" style={{marginTop: '10px'}}>
                    {loading ? 'Creando...' : 'Guardar Evento'}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER DATOS */}
      {isDataModalOpen && selectedEventData && (
        <div className="modal-overlay" onClick={() => setIsDataModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h2 style={{margin: 0}}>Datos del Cliente</h2>
                <button className="btn-close-modal" onClick={() => setIsDataModalOpen(false)}>✕</button>
            </div>
            <div className="data-view-container">
                <div className="data-item">
                    <span className="data-label">Evento:</span>
                    <span className="data-value">{selectedEventData.nombre}</span>
                </div>
                {selectedEventData.datosCliente ? (
                    <>
                        <div className="data-item">
                            <span className="data-label">Cliente:</span>
                            <span className="data-value">{selectedEventData.datosCliente.nombreApellido}</span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Correo:</span>
                            <span className="data-value">{selectedEventData.datosCliente.correo}</span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Fecha:</span>
                            <span className="data-value">{selectedEventData.datosCliente.fechaEvento}</span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Temática:</span>
                            <span className="data-value">{selectedEventData.datosCliente.tematica}</span>
                        </div>
                        <div className="data-item" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                            <span className="data-label" style={{marginBottom: '5px'}}>Comentarios:</span>
                            <div className="data-value comment-box">{selectedEventData.datosCliente.comentario}</div>
                        </div>
                    </>
                ) : (
                    <div style={{padding: '20px', textAlign: 'center', color: '#888'}}>
                        Este evento no posee datos extendidos del cliente.
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR EVENTO */}
      {isFinishModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFinishModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{textAlign: 'center'}}>
            <h2 style={{marginTop: 0, color: '#ef4444'}}>🛑 Finalizar Evento</h2>
            <p style={{color: '#ccc', lineHeight: '1.6', margin: '20px 0'}}>
                ¿Estás seguro de finalizar <strong>{eventoActual?.nombre}</strong>?<br/><br/>
                Al hacer esto, <strong>se bloqueará la subida de nuevas fotos y mensajes</strong> por parte de los invitados. Podrás compartir el Álbum Final con el cliente.
            </p>
            <div style={{display: 'flex', gap: '15px', marginTop: '30px'}}>
                <button className="btn-outline" style={{flex: 1}} onClick={() => setIsFinishModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" style={{flex: 1, background: '#ef4444'}} onClick={finalizarEvento}>Sí, Finalizar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}