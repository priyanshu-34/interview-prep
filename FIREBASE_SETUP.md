# Firebase setup (required for bookmarks, notes, activity)

If notes/bookmarks/Mark done don’t persist, the app is probably missing a **Firestore database** or **Auth**. Follow these steps in order.

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com).
2. Click **Add project** (or use an existing project).
3. Name it (e.g. `dsa-tracker`) and continue. Disable Google Analytics if you don’t need it.

## 2. Create a Firestore database

**This is required.** Without it, no API calls for notes/bookmarks/activity will work.

1. In the left sidebar, open **Build → Firestore Database**.
2. Click **Create database**.
3. Choose **Start in test mode** (for development). You can lock down rules later.
4. Pick a Firestore location (e.g. `us-central1`). This cannot be changed later.
5. Click **Enable**. Wait until the database is created (you’ll see the Firestore Data tab with an empty collection list).

## 3. Enable Authentication

1. In the left sidebar, open **Build → Authentication**.
2. Click **Get started**.
3. Open the **Sign-in method** tab.
4. Enable **Anonymous** (for “Continue as Guest”).
5. Enable **Google** (for “Sign in with Google”) and set a support email. Save.

## 4. Register your app and get config

1. In Project overview (gear icon) → **Project settings**.
2. Under **Your apps**, click the **Web** icon (`</>`).
3. Register the app (e.g. nickname “DSA Tracker”). Don’t enable Firebase Hosting yet unless you want it.
4. Copy the `firebaseConfig` object. You’ll map it to `.env`:

| Config key   | .env variable                 |
|-------------|-------------------------------|
| `apiKey`    | `VITE_FIREBASE_API_KEY`       |
| `authDomain`| `VITE_FIREBASE_AUTH_DOMAIN`   |
| `projectId` | `VITE_FIREBASE_PROJECT_ID`    |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId`     | `VITE_FIREBASE_APP_ID`        |

5. In the project root, create `.env` (copy from `.env.example`) and fill every `VITE_FIREBASE_*` value. No quotes needed:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

6. Restart the dev server after changing `.env` (`npm run dev`).

## 5. (Optional) Set Firestore rules

In **Firestore Database → Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish**. This allows each signed-in user to read/write only their own `users/{uid}/...` data.

## 6. Authorized domains (if Google sign-in fails)

1. In **Authentication** → **Settings** (or **Sign-in method** tab) → scroll to **Authorized domains**.
2. Ensure **localhost** is listed (for dev).
3. If you deploy the app, add your production domain (e.g. `your-app.vercel.app`) to the list.
4. Without the correct domain, Google sign-in will be blocked or redirect will fail.

## 7. Check that it works

1. Open the app, then open browser **Developer Tools → Console**.
2. Sign in (Guest or Google).
3. Add a note and save, or click **Mark done** on a question.
4. If something fails, you should see a red error in the console (e.g. permission denied, or that the database was not found). If you see no error and no request in the **Network** tab to `firestore.googleapis.com`, then either you’re not signed in or the Firebase config (e.g. `projectId`) is wrong.

## Summary checklist (and if Google sign-in fails)

- [ ] Firebase project created  
- [ ] **Firestore Database** created (Build → Firestore Database → Create database)  
- [ ] **Authentication** enabled (Anonymous + Google)  
- [ ] Web app registered and `.env` filled with all `VITE_FIREBASE_*` values  
- [ ] Dev server restarted after editing `.env`  
- [ ] Signed in in the app (Guest or Google) before saving notes / marking done
- [ ] If Google sign-in fails: **Authentication → Settings → Authorized domains** includes `localhost` (and your deployed domain if any)  
