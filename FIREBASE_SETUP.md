# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select an existing project
3. Follow the setup wizard
4. Once created, click on the project

## Step 2: Enable Authentication

1. In the Firebase Console, go to **Authentication** in the left sidebar
2. Click **Get Started**
3. Go to the **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click **Save**

## Step 3: Create Firestore Database

1. In the Firebase Console, go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (we'll add security rules next)
4. Select a location for your database
5. Click **Enable**

## Step 4: Set Up Security Rules

1. In Firestore Database, go to the **Rules** tab
2. Replace the rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Worksheets collection
    match /worksheets/{worksheetId} {
      // Users can only read their own worksheets
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      
      // Allow users to create worksheets with their own userId
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      
      // Allow users to update only their own worksheets (and keep the same userId)
      allow update: if request.auth != null 
        && resource.data.userId == request.auth.uid
        && request.resource.data.userId == request.auth.uid;
      
      // Allow users to delete only their own worksheets
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

3. Click **Publish**

## Step 5: Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select **Project settings**
3. Scroll down to **Your apps** section
4. Click the **Web** icon (`</>`)
5. Register your app (give it a nickname like "The Work App")
6. Copy the `firebaseConfig` object

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 6: Configure in Your App

1. Open `index.html`
2. Add the Firebase SDK scripts (before your `app.js` script)
3. Add your Firebase config in `app.js` or create a `firebase-config.js` file

See `SYNC_IMPLEMENTATION.md` for integration instructions.

## Testing

1. Open your app in a browser
2. Click "Sign Up" and create an account
3. Create a worksheet
4. Open the app in another browser/device
5. Sign in with the same account
6. Your worksheet should appear after sync completes

## Troubleshooting

### "Firebase SDK not loaded"
- Make sure you've included the Firebase scripts in your HTML
- Check the browser console for script loading errors

### "Permission denied" errors
- Verify your Firestore security rules are published
- Make sure the user is authenticated before accessing data

### Sync not working
- Check browser console for errors
- Verify you're signed in (check the UI)
- Check network tab to see if requests are being made
- Verify Firebase config is correct

