// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importa tus páginas (asegúrate de haberlas creado aunque estén vacías)
import Admin from './pages/Admin';
import Guest from './pages/Guest';
import Wall from './pages/Wall';
import Album from './pages/Album';
import QRScreen from './pages/QRScreen';
import PrintableQR from './pages/PrintableQR';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta para el organizador/creador del evento */}
        <Route path="/" element={<Admin />} />

        {/* Ruta para el invitado (escanear QR lleva aquí) */}
        {/* :eventId es una variable dinámica que usaremos para saber a qué evento subir la foto */}
        <Route path="/evento/:eventId" element={<Guest />} />

        {/* Ruta para la pantalla gigante (Proyector) */}
        <Route path="/pantalla/:eventId" element={<Wall />} />

        {/* NUEVA RUTA: El Álbum Final */}
        <Route path="/album/:eventId" element={<Album />} />

        {/* NUEVA RUTA: Pantalla exclusiva de QR */}
        <Route path="/qr/:eventId" element={<QRScreen />} />

        {/* AGREGAR ESTA RUTA NUEVA: */}
        <Route path="/print-qr/:eventId" element={<PrintableQR />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;