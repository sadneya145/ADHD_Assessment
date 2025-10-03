// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxKZvWMeHBjr-zFAT0rK2lyqwLWfR2xUY",
  authDomain: "adhdwebapp-cdc78.firebaseapp.com",
  projectId: "adhdwebapp-cdc78",
  storageBucket: "adhdwebapp-cdc78.firebasestorage.app",
  messagingSenderId: "294402206579",
  appId: "1:294402206579:web:16ee32c0f19e2748c2f306",
  measurementId: "G-JBXR0XT8W9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Export the services you need
export { auth, provider, signInWithPopup, db };
export default app;