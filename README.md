# SafaiMitra SaaS Platform

SafaiMitra is a comprehensive washroom hygiene management system built for governments, hotels, and public infrastructure.

## Project Structure
- `/safaimitra-web` - React Admin Dashboard (Vite, TailwindCSS)
- `/safaimitra-mobile` - React Native Mobile App (Expo)
- `/safaimitra-functions` - Firebase Cloud Functions

## Setup Instructions

### 1. Firebase Project Setup
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Firestore Database**, **Storage**, and **Authentication** (Email/Password & Anonymous).
3. Update `.firebaserc` with your actual project ID.
4. Get your Firebase web configuration and replace the dummy values in `safaimitra-web/.env` and `safaimitra-mobile/.env`.

### 2. Deploy Firebase Rules
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 3. Running Web Admin
```bash
cd safaimitra-web
npm install
npm run dev
```

### 4. Running Mobile App
```bash
cd safaimitra-mobile
npm install
npx expo start
```
