# Deploy Firestore Security Rules

## Quick Fix for "Missing or insufficient permissions" Error

The current `firestore.rules` file has been updated with proper security rules. You need to deploy them to Firebase.

## Method 1: Using Firebase CLI (Recommended)

### Step 1: Install Firebase CLI (if not installed)
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Initialize Firebase (if not already done)
```bash
firebase init firestore
```
- Select your existing project: `biet-16d1b`
- Use existing `firestore.rules` file
- Use existing `firestore.indexes.json` file

### Step 4: Deploy Rules
```bash
firebase deploy --only firestore:rules
```

## Method 2: Using Firebase Console (Quick Fix)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `biet-16d1b`
3. Go to **Firestore Database** → **Rules** tab
4. Copy the entire content from `firestore.rules` file
5. Paste it in the rules editor
6. Click **Publish**

## What the Rules Do

The updated rules allow:

✅ **Authenticated users** can:
- Read their own data
- Read class information
- Read announcements, exams, assignments

✅ **Students** can:
- Read their own attendance, marks, fees
- Submit assignments
- Create payment records

✅ **Teachers** can:
- Read/write attendance for their class
- Read/write marks for their class
- Create assignments and exams
- Create announcements

✅ **Admins** can:
- Full access to all collections
- Create/update/delete any data
- Manage classes, users, etc.

## Testing After Deployment

1. Try logging in as a student
2. Check if you can see Dashboard data
3. Try viewing attendance, assignments, etc.

If you still get permission errors:
- Check browser console for specific error messages
- Verify user has `role` field set in Firestore `users` collection
- Verify user is authenticated (check Firebase Auth)

## Temporary Development Rules (NOT for Production)

If you need to test quickly, you can temporarily use these rules (⚠️ **INSECURE - Only for development**):

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

**⚠️ WARNING:** These rules allow any authenticated user to read/write everything. Only use for development/testing!

## Need Help?

- Check Firebase Console → Firestore → Rules for any syntax errors
- Check browser console for specific permission errors
- Verify user authentication status
- Verify user role is set correctly in Firestore

