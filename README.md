# DSA Tracker

A React-based DSA (Data Structures & Algorithms) tracker for Striver-style question lists. Track progress, bookmark questions, add notes, and view analytics with a GitHub-style activity heatmap. Uses Firebase (Auth + Firestore) for persistence—no custom backend.

## Features

- **Topic-wise dashboard** – Browse by topic (Arrays, Linked List, DP, etc.) with progress per topic
- **Cumulative view** – All questions with filters (topic, solved, bookmarked)
- **Bookmarks & notes** – Per-question bookmarks and notes synced to Firebase
- **Mark as done** – Record completions for today; powers heatmap and streaks
- **Analytics** – Activity heatmap, total solved, current/longest streak, recent activity
- **Dark / light mode** – Toggle with persistence
- **Track-extensible** – Data model supports adding System Design or other tracks later

## Setup

1. **Clone and install**

   ```bash
   cd dsa-tracker
   npm install
   ```

2. **Firebase (required for bookmarks, notes, activity)**

   **Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md)** for step-by-step instructions. You must:

   - Create a project at [Firebase Console](https://console.firebase.google.com)
   - **Create a Firestore database** (Build → Firestore Database → Create database). Without this, no data is saved.
   - Enable **Authentication**: Anonymous and Google sign-in
   - Copy the project config (Project settings → Your apps) and create `.env`:

   ```bash
   cp .env.example .env
   # Edit .env and set VITE_FIREBASE_* variables
   ```

   - **Deploy Firestore rules** (required for bookmarks and "Mark as done" to save):

   ```bash
   npx firebase-tools use interview-dsa   # or your project ID
   npm run deploy:rules
   ```

   Use the contents of `firestore.rules` in the Firebase Console → Firestore → Rules if you don’t use the CLI.

3. **Question data**

   The app reads from `src/data/tracks.json`, `topics.json`, and `questions.json`. These are generated from the parent repo’s `leet.js` file:

   ```bash
   node scripts/convert-leet.mjs
   ```

   Ensure `leet.js` lives at `../leet.js` relative to the repo (or update the path in `scripts/convert-leet.mjs`).

4. **Run**

   ```bash
   npm run dev
   ```

   Open the URL shown (e.g. http://localhost:5173).

## Scripts

- `npm run dev` – Start dev server
- `npm run build` – Production build
- `npm run preview` – Preview production build
- `node scripts/convert-leet.mjs` – Regenerate `src/data/*.json` from `../leet.js`

## Deployment

Build and deploy the `dist/` folder to Firebase Hosting, Vercel, or Netlify. No backend required; all state is in Firebase.

## Data format

- **Tracks** – `id`, `name`, `order`
- **Topics** – `id`, `trackId`, `name`, `order`
- **Questions** – `id`, `trackId`, `title`, `topicId`, `difficulty`, `gfgLink`, `leetcodeLink`, `youtubeLink`, `order`

To add System Design later, add a new track and topics/questions with the same schema.
