# Firebase Setup Guide for MaestraMind

This guide will help you set up Firebase for your MaestraMind application.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "MaestraMind")
4. Follow the setup wizard (you can disable Google Analytics if you prefer)
5. Click "Create project"

## 2. Enable Authentication

1. In the Firebase Console, select your project
2. Go to "Authentication" in the left sidebar
3. Click "Get started"
4. Go to the "Sign-in method" tab
5. Enable "Google" as a sign-in provider
6. Configure the OAuth consent screen if prompted
7. Save your changes

## 3. Set Up Firestore Database

1. In the Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Start in production mode (or test mode if you're just experimenting)
4. Choose a location for your database (pick one close to your users)
5. Click "Enable"

## 4. Set Up Firebase Storage

1. In the Firebase Console, go to "Storage"
2. Click "Get started"
3. Accept the default security rules (you can modify them later)
4. Choose a location for your storage bucket
5. Click "Done"

## 5. Register Your Web App

1. In the Firebase Console, click the gear icon next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" and click the web icon (</>) 
4. Register your app with a nickname (e.g., "MaestraMind Web")
5. You can skip the Firebase Hosting setup for now
6. Click "Register app"
7. Copy the Firebase configuration object

## 6. Update Your Environment Variables

1. Create a `.env` file in the root of your project
2. Add your Firebase and Gemini API keys to the file:

```
FIREBASE_API_KEY=YOUR_API_KEY
FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
FIREBASE_APP_ID=YOUR_APP_ID
FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

## 7. Set Up Gemini API (Google AI Studio)

1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Sign in with your Google account
3. Get an API key for Gemini
4. Update the Gemini API key in your application (in a production app, you would use Firebase Functions to securely store this key)

## 8. Deploy Your Application

### Option 1: Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize Firebase in your project: `firebase init`
   - Select Hosting
   - Select your Firebase project
   - Specify "public" as your public directory
   - Configure as a single-page app: Yes
4. Deploy your app: `firebase deploy`

### Option 2: GitHub Pages

1. Create a GitHub repository
2. Push your code to the repository
3. Go to repository Settings > Pages
4. Select the main branch as the source
5. Click Save

## 9. Security Rules

For production use, you should update your Firestore and Storage security rules to properly secure your application. Here are some example rules:

### Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read and write their own notes
    match /notes/{noteId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Users can read and write their own courses
    match /courses/{courseId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

### Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can read and write their own files
    match /notes/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 10. Next Steps

- Implement the Gemini API integration
- Add more features like sharing courses with others
- Implement progress tracking and analytics
- Add more interactive elements to the learning experience