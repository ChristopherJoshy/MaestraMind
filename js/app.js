import './firebase-config.js';
import './auth.js';
import './dashboard.js';
import './upload.js';
import './course.js';
import './gemini.js';

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupNavigationListeners();
    checkBrowserSupport();
}

function setupNavigationListeners() {
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('course-view').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
        });
    });
}

function handleError(error, message = 'An error occurred') {
    console.error(error);
    alert(`${message}: ${error.message}`);
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function checkBrowserSupport() {
    const features = {
        localStorage: typeof localStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        fileReader: typeof FileReader !== 'undefined'
    };
    
    const unsupportedFeatures = Object.entries(features)
        .filter(([_, supported]) => !supported)
        .map(([feature]) => feature);
    
    if (unsupportedFeatures.length > 0) {
        alert(`Your browser doesn't support the following features: ${unsupportedFeatures.join(', ')}. Please use a modern browser.`);
        return false;
    }
    
    return true;
}

if (!checkBrowserSupport()) {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h1>Browser Not Supported</h1>
            <p>Your browser doesn't support all the features required for MaestraMind.</p>
            <p>Please use a modern browser like Chrome, Firefox, Safari, or Edge.</p>
        </div>
    `;
}