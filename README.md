# Dry Sand Plant Management System

A web-based, single-plant management system built with React, Firebase, and deployed to Vercel.

## Tech Stack

- **Frontend**: React (Create React App)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage
- **Routing**: react-router-dom
- **Deployment**: Vercel (free tier)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/ysinghaniya83-creator/drysand-plant-system.git
   cd drysand-plant-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your Firebase project credentials:
   - Go to [Firebase Console](https://console.firebase.google.com/) → Your project → Project settings → Your apps → Web
   - Copy the config values into `.env`

4. **Enable Firebase services**
   - Enable **Authentication** (Email/Password provider)
   - Enable **Firestore Database**
   - Enable **Storage**

5. **Start development server**
   ```bash
   npm start
   ```
   The app will open at `http://localhost:3000`.

## Deployment to Vercel

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Import Project** → select your GitHub repo.
3. In the **Environment Variables** section, add all variables from your `.env` file.
4. Click **Deploy**.

The `vercel.json` file already configures rewrites so React Router works correctly.

## Modules (19 total)

| # | Module | Status |
|---|--------|--------|
| 1 | Dashboard | ✅ |
| 2 | Weighbridge (Inward & Outward) | ✅ |
| 3 | Production | ✅ |
| 4 | Sales (Loose & Bag) | ✅ |
| 5 | Purchase & Bills | Coming Soon |
| 6 | Bagging | Coming Soon |
| 7 | Expenses | Coming Soon |
| 8 | Accounts | Coming Soon |
| 9 | Profit | Coming Soon |
| 10 | Closing Stock | Coming Soon |
| 11 | Vehicles | Coming Soon |
| 12 | Employees | Coming Soon |
| 13 | Reports | Coming Soon |
| 14 | Masters | Coming Soon |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REACT_APP_FIREBASE_API_KEY` | Firebase API key |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `REACT_APP_FIREBASE_APP_ID` | Firebase app ID |