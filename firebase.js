import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfdCRfqhDwMmmDpBIGrALeO2OuYtO7lss",
  authDomain: "project-management-spartans.firebaseapp.com",
  projectId: "project-management-spartans",
  storageBucket: "project-management-spartans.firebasestorage.app",
  messagingSenderId: "293677712914",
  appId: "1:293677712914:web:57cee829d671615c527acb"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;