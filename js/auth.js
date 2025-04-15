import { auth, db, googleProvider, signInWithPopup } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { loadUserCourses } from './dashboard.js';

let currentUser = null;

const loadingOverlay = document.createElement('div');
loadingOverlay.className = 'loading-overlay hidden';
loadingOverlay.innerHTML = `
    <div class="loading-spinner"></div>
    <p id="loading-message">Loading...</p>
`;
document.body.appendChild(loadingOverlay);
const loadingMessage = document.getElementById('loading-message');

document.addEventListener('DOMContentLoaded', () => {
    initAuthUI();
});

function initAuthUI() {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const getStartedBtn = document.getElementById('get-started-btn');
    
    if (loginButton) loginButton.addEventListener('click', signInWithGoogle);
    if (logoutButton) logoutButton.addEventListener('click', signOut);
    if (getStartedBtn) getStartedBtn.addEventListener('click', signInWithGoogle);
}

let landingPage;
let dashboard;

async function signInWithGoogle() {
    try {
        loadingOverlay.classList.remove('hidden');
        loadingMessage.textContent = 'Signing in...';
        
        const result = await signInWithPopup(auth, googleProvider);
        
        loadingOverlay.classList.add('hidden');
        showNotification('Success', 'Signed in successfully!', 'success');
    } catch (error) {
        console.error('Error during sign in:', error);
        loadingOverlay.classList.add('hidden');
        showNotification('Error', 'Failed to sign in. Please try again.', 'error');
    }
}

async function signOut() {
    try {
        loadingOverlay.classList.remove('hidden');
        loadingMessage.textContent = 'Signing out...';
        
        await firebaseSignOut(auth);
        
        loadingOverlay.classList.add('hidden');
        showNotification('Success', 'Signed out successfully', 'success');
    } catch (error) {
        console.error('Error during sign out:', error);
        loadingOverlay.classList.add('hidden');
        showNotification('Error', 'Failed to sign out. Please try again.', 'error');
    }
}

async function handleAuthStateChange(user) {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userProfile = document.getElementById('user-profile');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');
    landingPage = document.getElementById('landing-page');
    dashboard = document.getElementById('dashboard');
    
    if (!loginButton || !logoutButton || !landingPage || !dashboard) {
        console.warn('Auth UI elements not found, auth state change handling delayed');
        return;
    }
    
    if (user) {
        currentUser = user;
        
        if (loginButton) loginButton.classList.add('hidden');
        if (logoutButton) logoutButton.classList.remove('hidden');
        if (userProfile) userProfile.classList.remove('hidden');
        
        if (userPhoto) userPhoto.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email) + '&background=4361ee&color=fff';
        if (userName) userName.textContent = user.displayName || user.email;
        
        landingPage.classList.add('hidden');
        dashboard.classList.remove('hidden');
        
        try {
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: serverTimestamp()
            };
            
            if (!docSnap.exists()) {
                userData.createdAt = serverTimestamp();
                userData.role = 'user';
                userData.preferences = {
                    theme: 'light',
                    notifications: true
                };
                
                await setDoc(userRef, userData);
                showNotification('Welcome', 'Your account has been created successfully!', 'success');
            } else {
                await updateDoc(userRef, userData);
            }
            
            const today = new Date().toDateString();
            localStorage.setItem('lastLoginDate', today);
            
            if (!localStorage.getItem('studyStreak')) {
                localStorage.setItem('studyStreak', '1');
            }
            
            loadUserCourses();
        } catch (error) {
            console.error('Error checking user document:', error);
            showNotification('Error', 'Failed to load user data', 'error');
        }
    } else {
        currentUser = null;
        
        if (loginButton) loginButton.classList.remove('hidden');
        if (logoutButton) logoutButton.classList.add('hidden');
        if (userProfile) userProfile.classList.add('hidden');
        
        if (landingPage) landingPage.classList.remove('hidden');
        if (dashboard) dashboard.classList.add('hidden');
        
        const uploadSection = document.getElementById('upload-section');
        const courseView = document.getElementById('course-view');
        const studyTimer = document.getElementById('study-timer');
        
        if (uploadSection) uploadSection.classList.add('hidden');
        if (courseView) courseView.classList.add('hidden');
        if (studyTimer) studyTimer.classList.add('hidden');
    }
}

onAuthStateChanged(auth, handleAuthStateChange);

export { currentUser };