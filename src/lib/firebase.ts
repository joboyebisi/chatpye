import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getAuthDomains } from '@/config/domains';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

// Initialize Firebase only once
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // Connect to emulators in development
    if (process.env.NODE_ENV === 'development') {
      try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('Connected to Firestore emulator');
      } catch (error) {
        console.warn('Failed to connect to Firestore emulator, using production database:', error);
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);
}

// Initialize auth only in browser context
if (typeof window !== 'undefined') {
  try {
    auth = getAuth(app);
    
    // Connect to auth emulator in development
    if (process.env.NODE_ENV === 'development') {
      try {
        connectAuthEmulator(auth, 'http://localhost:9099');
        console.log('Connected to Auth emulator');
      } catch (error) {
        console.warn('Failed to connect to Auth emulator, using production auth:', error);
      }
    }

    // Verify domain in development
    if (process.env.NODE_ENV === 'development') {
      const currentDomain = window.location.hostname;
      const allowedDomains = getAuthDomains();
      
      if (!allowedDomains.includes(currentDomain)) {
        console.warn(
          `Current domain (${currentDomain}) is not in the list of authorized domains. ` +
          'Please add it to Firebase Console > Authentication > Settings > Authorized domains'
        );
      }
    }
  } catch (error) {
    console.error('Failed to initialize Auth:', error);
    auth = {} as Auth;
  }
} else {
  auth = {} as Auth;
}

export { app, db, auth }; 