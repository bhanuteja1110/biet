# Firestore Database Initialization Guide

Since you don't have any collections in Cloud Firestore, follow these steps to set up your database.

## Option 1: Manual Setup (Recommended for First Time)

### Step 1: Create Collections in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `biet-16d1b`
3. Go to **Firestore Database**
4. Click **Start collection** or **Create database** (if first time)

### Step 2: Create Initial Collections

Create these collections by adding documents:

#### 1. **classes** collection
- Click **Start collection** → Name: `classes`
- Add document with ID: `class-cse-1st-year`
- Fields:
  ```
  name: "CSE - 1st Year" (string)
  department: "CSE" (string)
  year: "1st Year" (string)
  createdAt: (timestamp - click "timestamp" button)
  ```

#### 2. **transport/routes/list** collection
- Create collection: `transport`
- Add document: `routes`
- Add subcollection: `list`
- Add documents with IDs: `R1`, `R2`, `R3`
- For each route, add fields:
  ```
  route: "R1" (string)
  origin: "Kompally" (string)
  time: "07:15" (string)
  stops: ["Suchitra", "Bollaram", "Patancheru"] (array)
  updatedAt: (timestamp)
  ```

#### 3. **placements** collection
- Create collection: `placements`
- Add a sample document with auto ID
- Fields:
  ```
  company: "TCS" (string)
  role: "Software Engineer" (string)
  date: "2025-12-05" (string)
  ctc: "₹ 7 LPA" (string)
  apply: "https://nextstep.tcs.com" (string)
  createdAt: (timestamp)
  ```

### Step 3: Set Up User Roles

After users sign up:

1. Go to **Firestore Database** → `users` collection
2. For each user, add/update document with their `uid` (from Authentication)
3. Add fields:
   ```
   email: "user@example.com" (string)
   displayName: "User Name" (string)
   role: "student" | "teacher" | "admin" (string)
   classId: "class-cse-1st-year" (string) - for students and teachers
   department: "CSE" (string) - optional
   year: "1st Year" (string) - optional
   rollNumber: "25E11A1201" (string) - for students
   createdAt: (timestamp)
   ```

## Option 2: Use Initialization Script

1. Open browser console on your app
2. Run:
```javascript
import { initializeFirestore } from './src/utils/initFirestore';
await initializeFirestore();
```

Or create a temporary page to run it.

## Option 3: Use Firebase CLI (Advanced)

Create a file `init-data.json` and import it using Firebase CLI.

## Quick Setup Checklist

- [ ] Create `classes` collection with at least one class
- [ ] Create `transport/routes/list` collection with routes
- [ ] Create `placements` collection (optional)
- [ ] Set user roles in `users` collection
- [ ] Set `classId` for students and teachers
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`

## Testing

After setup:
1. Login as admin → Should see Admin Dashboard
2. Login as teacher → Should see Teacher Dashboard  
3. Login as student → Should see Student Dashboard
4. Try marking attendance as teacher
5. Check if student sees the attendance update

## Common Issues

**Blank screen:**
- Check browser console for errors
- Verify user has `role` set in Firestore
- Verify `classId` is set for teachers/students

**"Missing or insufficient permissions":**
- Deploy Firestore rules
- Check user role is set correctly

**"No students in class":**
- Verify students have `classId` matching the class
- Verify students have `role: "student"`

