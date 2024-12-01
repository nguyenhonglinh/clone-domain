import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD2_Xro_oMPyQGeaQx3p54C7EUyUR1Afug",
  authDomain: "clone-domain.firebaseapp.com",
  projectId: "clone-domain",
  storageBucket: "clone-domain.firebasestorage.app",
  messagingSenderId: "173178827417",
  appId: "1:173178827417:web:928ace63c79d45b5b77e08",
  measurementId: "G-3S7PV7H0LS",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
