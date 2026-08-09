// Firebase Configuration
// Replace these values with your Firebase project configuration
// Get these from: Firebase Console -> Project Settings -> General -> Your apps

const firebaseConfig = {
  apiKey: "AIzaSyDA7AVDeQm0SH8CmDGTDhMobgputkk27io",
  authDomain: "hostel-shop-1787d.firebaseapp.com",
  databaseURL: "https://hostel-shop-1787d-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "hostel-shop-1787d",
  storageBucket: "hostel-shop-1787d.firebasestorage.app",
  messagingSenderId: "27905891594",
  appId: "1:27905891594:web:2122a2ff41f2eaa9d5eef3"
};

// Initialize Firebase Realtime Database
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

