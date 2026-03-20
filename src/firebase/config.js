// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// REEMPLAZA ESTO CON TUS DATOS DE LA CONSOLA DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDrJKV8jWVmxrZpFMy2-CuA_Qw3ABrw8Is",
  authDomain: "albumdigital-4b458.firebaseapp.com",
  projectId: "albumdigital-4b458",
  storageBucket: "albumdigital-4b458.firebasestorage.app",
  messagingSenderId: "46660478537",
  appId: "1:46660478537:web:38353f85adeb457c7dc198"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios para usarlos en toda la app
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);