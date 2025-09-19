// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4XQlIrsEBuVk2ijCWSNu0_LGmUAswO6g",
  authDomain: "astudy-web.firebaseapp.com",
  databaseURL: "https://astudy-web-default-rtdb.firebaseio.com",
  projectId: "astudy-web",
  storageBucket: "astudy-web.firebasestorage.app",
  messagingSenderId: "772421294410",
  appId: "1:772421294410:web:cb78df53a11c2c87f1c9b3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Make Firebase services globally available
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseAuthFunctions = {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
window.firebaseDbFunctions = {
  doc,
  setDoc,
  getDoc,
  onSnapshot
};

export { auth, db };