import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsf7OqI7y66648HNvstkKNbY6rnU-zVHw",
  authDomain: "notes-marketplace-c1189.firebaseapp.com",
  projectId: "notes-marketplace-c1189",
  storageBucket: "notes-marketplace-c1189.firebasestorage.app",
  messagingSenderId: "953587908764",
  appId: "1:953587908764:web:bce314de590c4630996d59"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);