# MaestraMind: AI-Powered Adaptive Learning App

MaestraMind is a solo-developer-friendly adaptive learning web application that allows users to upload one or multiple notes. The app uses Google's Gemini API to analyze these notes and automatically generate an adaptive learning curriculum tailored to the user's needs.

## Features

- ✨ Upload Multiple Notes (text input or file)
- 🔍 Gemini AI-Powered Note Analysis
- 📚 Auto-Generated Courses and Topics
- 🧠 Personalized Adaptive Learning Paths
- 📈 Real-Time Progress Tracking
- 📝 AI-Generated Summaries, Flashcards, and Quizzes
- 🧑‍🎓 Smart Recommendations based on user behavior
- 🔐 Firebase Google Authentication and Firestore Integration

## Tech Stack

- **Frontend**: HTML/CSS/JavaScript
- **Backend**: Gemini API (handled in Firebase Functions or client SDK)
- **Database**: Firebase Firestore
- **Auth**: Firebase Google Authentication
- **Storage**: Firebase Storage
- **Hosting**: Firebase Hosting or GitHub Pages

## Getting Started

### Prerequisites

- A Google account
- A Firebase project
- A Gemini API key

### Installation

1. Clone this repository
2. Install dependencies with `npm install`
3. Create a `.env` file in the root directory with your Firebase and Gemini API keys:
   ```
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Build the application with `npm run build`
5. For GitHub Pages deployment:
   - Update the `homepage` field in package.json with your GitHub username
   - Run `npm run deploy` to deploy to GitHub Pages
   - Set up repository secrets in GitHub for your environment variables

## GitHub Pages Deployment

To deploy this application to GitHub Pages, follow these steps:

1. Create a GitHub repository for your project
2. Push your code to the repository
3. Set up repository secrets in GitHub:
   - Go to your repository settings
   - Click on "Secrets and variables" → "Actions"
   - Add the following secrets:
     - FIREBASE_API_KEY
     - FIREBASE_AUTH_DOMAIN
     - FIREBASE_PROJECT_ID
     - FIREBASE_STORAGE_BUCKET
     - FIREBASE_MESSAGING_SENDER_ID
     - FIREBASE_APP_ID
     - FIREBASE_MEASUREMENT_ID
     - GEMINI_API_KEY
4. Update the `homepage` field in package.json with your GitHub username and repository name
5. Run `npm run deploy` or push to the main branch to trigger the GitHub Actions workflow

## How It Works

1. Users sign in with their Google account
2. Users upload their study notes (text or files)
3. The Gemini AI analyzes the notes and generates:
   - Course structure and topics
   - Summaries for each topic
   - Flashcards for key concepts
   - Quizzes to test understanding
4. Users can navigate through the generated course
5. Progress is tracked in real-time
6. Users can take quizzes and review flashcards to reinforce learning

## Project Structure

```
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Styles for the application
├── js/
│   ├── app.js              # Main application script
│   ├── auth.js             # Authentication module
│   ├── dashboard.js        # Dashboard module
│   ├── upload.js           # Upload module
│   ├── course.js           # Course module
│   ├── gemini.js           # Gemini AI integration
│   └── firebase-config.js  # Firebase configuration
├── firebase-setup.md       # Firebase setup guide
└── README.md               # Project documentation
```

## Customization

You can customize the application by:

- Modifying the styles in `css/styles.css`
- Updating the Gemini prompts in `js/gemini.js`
- Adding new features to the application

## Future Enhancements

- Sharing courses with other users
- More interactive learning elements
- Mobile app version
- Integration with other learning platforms
- Advanced analytics and insights

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google's Gemini API for powering the AI features
- Firebase for providing the backend infrastructure
- The open-source community for inspiration and resources

---

"Your notes. Your learning. AI-optimized."