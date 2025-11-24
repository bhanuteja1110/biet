# Quick Fix: Missing or Insufficient Permissions

## The Problem
Your Firestore security rules are blocking all access. The rules need to be deployed to Firebase.

## Solution: Deploy Rules (Choose One Method)

### ⚡ Method 1: Firebase Console (Fastest - 2 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **biet-16d1b**
3. Click **Firestore Database** → **Rules** tab
4. **Copy** the entire content from `firestore.rules` file in your project
5. **Paste** it in the rules editor
6. Click **Publish** button
7. ✅ Done! Rules are now active

### 🔧 Method 2: Firebase CLI (Recommended for Production)

```bash
# 1. Install Firebase CLI (if not installed)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Initialize (if not done before)
firebase init firestore
# - Select existing project: biet-16d1b
# - Use existing firestore.rules
# - Use existing firestore.indexes.json

# 4. Deploy rules
firebase deploy --only firestore:rules
```

## What Changed?

The `firestore.rules` file has been updated with:
- ✅ Proper role-based access control
- ✅ Students can read their own data
- ✅ Teachers can manage their class
- ✅ Admins have full access
- ✅ Handles users without roles (for initial setup)

## After Deploying Rules

1. **Refresh your app** in the browser
2. **Try logging in** again
3. The permission error should be gone!

## Still Getting Errors?

### Check These:

1. **User Role Not Set:**
   - Go to Firestore → `users` collection
   - Find your user document (by uid from Authentication)
   - Add field: `role: "student"` (or "teacher" or "admin")

2. **User Document Missing:**
   - Create a document in `users` collection with your uid
   - Add fields: `email`, `displayName`, `role`

3. **Not Authenticated:**
   - Make sure you're logged in
   - Check Firebase Authentication tab

## Temporary Development Rules (⚠️ INSECURE)

If you need to test quickly and don't care about security:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING:** This allows any logged-in user to read/write everything. Only use for development!

## Need More Help?

- Check browser console for specific error messages
- Verify you're logged in (check Firebase Auth)
- Verify user role is set in Firestore
- See `DEPLOY_RULES.md` for detailed instructions

