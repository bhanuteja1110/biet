import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Hardwired config provided by user for BIET project
const firebaseConfig = {
  apiKey: "AIzaSyACeOsWl1ZNK8Qf9bAsl3bi2BlfcYPzQT0",
  authDomain: "biet-16d1b.firebaseapp.com",
  projectId: "biet-16d1b",
  storageBucket: "biet-16d1b.firebasestorage.app",
  messagingSenderId: "542214630853",
  appId: "1:542214630853:web:4ab37517b9c11e9f132fac",
  measurementId: "G-1QH78VHRXJ"
} as const;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Optional analytics when supported (browsers only)
void isSupported().then((ok) => {
  if (ok) getAnalytics(app);
});


