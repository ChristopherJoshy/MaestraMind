import { auth, db } from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { loadUserCourses } from './dashboard.js';

let currentUser = null;

const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userProfile = document.getElementById('user-profile');
const userPhoto = document.getElementById('user-photo');
const userName = document.getElementById('user-name');
const getStartedBtn = document.getElementById('get-started-btn');

const landingPage = document.getElementById('landing-page');
const dashboard = document.getElementById('dashboard');

function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .catch(error => {
            console.error('Error during sign in:', error);
            alert('Failed to sign in. Please try again.');
        });
}

function signOut() {
    firebaseSignOut(auth)
        .catch(error => {
            console.error('Error during sign out:', error);
        });
}

function handleAuthStateChange(user) {
    if (user) {
        currentUser = user;
        
        loginButton.classList.add('hidden');
        logoutButton.classList.remove('hidden');
        userProfile.classList.remove('hidden');
        
        userPhoto.src = user.photoURL || 'https://via.placeholder.com/32';
        userName.textContent = user.displayName || user.email;
        
        landingPage.classList.add('hidden');
        dashboard.classList.remove('hidden');
        
        const userRef = doc(db, 'users', user.uid);
        getDoc(userRef).then(docSnap => {
            if (!docSnap.exists()) {
                setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: serverTimestamp()
                });
            }
        }).then(() => {
            loadUserCourses();
        }).catch(error => {
            console.error('Error checking user document:', error);
        });
    } else {
        currentUser = null;
        
        loginButton.classList.remove('hidden');
        logoutButton.classList.add('hidden');
        userProfile.classList.add('hidden');
        
        landingPage.classList.remove('hidden');
        dashboard.classList.add('hidden');
        
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('course-view').classList.add('hidden');
    }
}

loginButton.addEventListener('click', signInWithGoogle);
logoutButton.addEventListener('click', signOut);
getStartedBtn.addEventListener('click', signInWithGoogle);

onAuthStateChanged(auth, handleAuthStateChange);

export { currentUser };