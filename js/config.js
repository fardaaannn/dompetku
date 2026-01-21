/* ============================================
   CONFIG.JS - Firebase Configuration
   ============================================ */

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCFPnr_wwe8a3KsWQFyf9Y_hjj81WzOHtU",
  authDomain: "dompet-ku-web.firebaseapp.com",
  projectId: "dompet-ku-web",
  storageBucket: "dompet-ku-web.firebasestorage.app",
  messagingSenderId: "387540289390",
  appId: "1:387540289390:web:529808a041c73242f3637f",
  measurementId: "G-GEJTCBX0DX",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
  console.log("Persistence warning:", err.code);
});

// RPG Configuration
const RPG_CONFIG = {
  MAX_HEALTH: 5000000,
};

// Export all
export { app, db, auth, provider, RPG_CONFIG };
