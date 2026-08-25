import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCHQ1pKjl_5YbSQjY0JxoiCwiC02rJbl7I",
  authDomain: "student-management-syste-93369.firebaseapp.com",
  projectId: "student-management-syste-93369",
  storageBucket: "student-management-syste-93369.firebasestorage.app",
  messagingSenderId: "379935297879",
  appId: "1:379935297879:web:6e61c7e58a9be540be6e12",
  measurementId: "G-CC2G0JLS9Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
