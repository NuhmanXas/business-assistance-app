// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    UserCredential,
} from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHog9NdrbIoo21itcsY6i1Z90-fdo_K6E",
  authDomain: "business-assistance-app.firebaseapp.com",
  projectId: "business-assistance-app",
  storageBucket: "business-assistance-app.appspot.com",
  messagingSenderId: "223209751525",
  appId: "1:223209751525:web:03a1678a058979bf19a50c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long-polling to avoid WebChannel transport errors
// (useful in some React Native / Expo environments where WebChannel fails)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Initialize Auth
const auth = getAuth(app);

// Helper: create user with email & password
async function signUpWithEmail(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

// Helper: sign in with email & password
async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

// Helper: sign out
async function signOutUser(): Promise<void> {
  return signOut(auth);
}

// Helper: send password reset email
async function sendPasswordReset(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

export { app, auth, db, sendPasswordReset, signInWithEmail, signOutUser, signUpWithEmail };

