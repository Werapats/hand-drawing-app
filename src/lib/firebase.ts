import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAt3w06-GraxhFPClss1OHhHHtefNL-YIM",
  authDomain: "hand-drawing-app-7a89b.firebaseapp.com",
  projectId: "hand-drawing-app-7a89b",
  storageBucket: "hand-drawing-app-7a89b.firebasestorage.app",
  messagingSenderId: "867490819617",
  appId: "1:867490819617:web:2c8697db0bd111dd5b7d60"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };