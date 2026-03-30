import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCiFHcFtE1dDzr_i4stfeIFTp_9Z4tvDHw",
  authDomain: "codexnenec.firebaseapp.com",
  projectId: "codexnenec",
  storageBucket: "codexnenec.firebasestorage.app",
  messagingSenderId: "235738310467",
  appId: "1:235738310467:web:aee8b7fd6df80fd5fb31f6",
  measurementId: "G-YDBQDDN2MV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("Múltiplas abas abertas, persistência offline do Firestore desabilitada nesta.");
    } else if (err.code == 'unimplemented') {
      console.warn("Navegador não suporta persistência offline do Firestore.");
    }
  });
} catch (e) {
  console.error("Erro ao configurar persistência Firestore:", e);
}

export { app, analytics, auth, db, storage };
