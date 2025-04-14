# Firebase Setup for GitHub Pages

When deploying your MaestraMind application to GitHub Pages, you need to configure Firebase to allow authentication from your GitHub Pages domain.

## Configure Firebase Authentication for GitHub Pages

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to "Authentication" in the left sidebar
4. Click on the "Settings" tab
5. Scroll down to "Authorized domains"
6. Add your GitHub Pages domain: `yourusername.github.io`
7. Click "Add"

## Configure CORS for Firebase Storage

If you're using Firebase Storage, you need to configure CORS to allow requests from your GitHub Pages domain:

1. Install the Firebase CLI if you haven't already: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Create a file named `cors.json` with the following content:

```json
[
  {
    "origin": ["https://yourusername.github.io"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

4. Run the following command to update the CORS configuration:

```
gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET_NAME
```

Replace `YOUR_STORAGE_BUCKET_NAME` with your actual Firebase Storage bucket name (e.g., `maestramind-fcc89.appspot.com`).

## Update Firebase Security Rules

Make sure your Firebase Security Rules allow access from your GitHub Pages domain:

### Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /notes/{noteId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
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
    match /notes/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```