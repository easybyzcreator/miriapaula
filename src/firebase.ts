import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCi10Vkkb-63y4IFVZA1iDPkWdwqTO4_3Q",
  authDomain: "app-miria-paula.firebaseapp.com",
  projectId: "app-miria-paula",
  storageBucket: "app-miria-paula.firebasestorage.app",
  messagingSenderId: "284199144622",
  appId: "1:284199144622:web:a4fb664ab894a23618713f",
  measurementId: "G-SD3L0PXJF3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

