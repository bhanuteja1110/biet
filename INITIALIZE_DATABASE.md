# How to Initialize Your Firestore Database

You're getting "Missing or insufficient permissions" because the initialization script needs authentication. Here are 3 ways to fix this:

## ✅ Method 1: Use the App (Recommended)

1. **Login to your app** (create an account if needed)
2. **Set yourself as admin:**
   - Go to Firebase Console → Firestore → `users` collection
   - Create/update document with your uid (from Authentication)
   - Add field: `role: "admin"`
3. **In the app**, go to `/admin/initialize` (or click "Initialize DB" in admin menu)
4. **Click "Initialize Database"** button
5. ✅ Done!

## ✅ Method 2: Use Updated HTML File (With Login)

1. **Open `init-firestore.html`** in your browser
2. **Login** with your Firebase account credentials
3. **Click "Initialize Firestore"** button
4. ✅ Done!

## ✅ Method 3: Manual Setup in Firebase Console

### Step 1: Create Classes Collection

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **biet-16d1b**
3. Go to **Firestore Database**
4. Click **Start collection**
5. Collection ID: `classes`
6. Document ID: `class-cse-1st-year`
7. Add fields:
   - `name`: "CSE - 1st Year" (string)
   - `department`: "CSE" (string)
   - `year`: "1st Year" (string)
   - `createdAt`: (timestamp - click timestamp button)
8. Click **Save**

### Step 2: Create Transport Routes

1. Create collection: `transport`
2. Add document: `routes`
3. Add subcollection: `list`
4. Add documents with IDs: `R1`, `R2`, `R3`
5. For each route, add:
   - `route`: "R1" (string)
   - `origin`: "Kompally" (string)
   - `time`: "07:15" (string)
   - `stops`: ["Suchitra", "Bollaram", "Patancheru"] (array)
   - `updatedAt`: (timestamp)

### Step 3: Create Placements Collection

1. Create collection: `placements`
2. Add document (auto ID)
3. Add fields:
   - `company`: "TCS" (string)
   - `role`: "Software Engineer" (string)
   - `date`: "2025-12-05" (string)
   - `ctc`: "₹ 7 LPA" (string)
   - `apply`: "https://nextstep.tcs.com" (string)
   - `createdAt`: (timestamp)

### Step 4: Set User Roles

1. Go to **Firestore** → `users` collection
2. For each user (by their uid from Authentication):
   - Create document with their uid
   - Add fields:
     - `email`: user's email (string)
     - `displayName`: user's name (string)
     - `role`: "student" | "teacher" | "admin" (string) ⚠️ **REQUIRED**
     - `classId`: "class-cse-1st-year" (string) - for students & teachers
     - `rollNumber`: "25E11A1201" (string) - for students

## Quick Fix for Permission Error

The permission error happens because:
1. Firestore rules require authentication
2. The initialization script wasn't authenticated

**Solution:** Use Method 1 (the app) or Method 2 (updated HTML with login) - both now handle authentication properly!

## After Initialization

1. ✅ Collections are created
2. ✅ Sample data is added
3. ✅ Your account is set as admin (if using Method 1 or 2)
4. ✅ You can now use the app normally

## Troubleshooting

**Still getting permission errors?**
- Make sure you're logged in
- Check your user has `role: "admin"` in Firestore
- Verify Firestore rules are deployed (see `DEPLOY_RULES.md`)

**Can't see Initialize page?**
- Make sure your role is set to "admin" in Firestore
- Refresh the page after setting role
- Check browser console for errors

