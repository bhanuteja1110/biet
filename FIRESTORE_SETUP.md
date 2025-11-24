# Firestore Setup Guide

This guide will help you set up your Firestore database for the BIET College Management System.

## Step 1: Deploy Firestore Security Rules

1. Install Firebase CLI (if not already installed):
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project (if not already done):
```bash
firebase init firestore
```

4. Copy the `firestore.rules` file to your project root (if not already there)

5. Deploy the rules:
```bash
firebase deploy --only firestore:rules
```

## Step 2: Create Indexes

Firestore requires composite indexes for certain queries. Create these indexes in the Firebase Console:

### Required Indexes:

1. **attendance collection:**
   - Fields: `studentId` (Ascending), `date` (Descending)
   - Fields: `classId` (Ascending), `date` (Ascending), `studentName` (Ascending)

2. **marks collection:**
   - Fields: `studentId` (Ascending), `subject` (Ascending)
   - Fields: `classId` (Ascending), `subject` (Ascending)

3. **assignments collection:**
   - Fields: `classId` (Ascending), `status` (Ascending), `dueDate` (Ascending)

4. **assignmentSubmissions collection:**
   - Fields: `assignmentId` (Ascending), `submittedAt` (Descending)
   - Fields: `studentId` (Ascending), `submittedAt` (Descending)

5. **exams collection:**
   - Fields: `classId` (Ascending), `date` (Ascending)

6. **users collection:**
   - Fields: `classId` (Ascending), `role` (Ascending), `rollNumber` (Ascending)

### How to Create Indexes:

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Select the collection and add the fields as specified above
4. Click "Create"

Alternatively, you can create indexes automatically by running queries in your app - Firestore will prompt you to create the required indexes.

## Step 3: Initial Data Setup

### Create User Roles

When users sign up, their role should be set in the `users` collection:

```javascript
// Example user document structure
{
  uid: "user-id",
  email: "student@biet.ac.in",
  displayName: "Student Name",
  role: "student", // or "teacher" or "admin"
  classId: "class-id", // Required for students and teachers
  department: "IT",
  year: "1st Year",
  rollNumber: "25E11A1201",
  fatherName: "Father Name",
  contact: "+91 90000 12345",
  dob: "2007-01-01",
  busRoute: "R2",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Create Classes

Create class documents in the `classes` collection:

```javascript
{
  id: "class-id",
  name: "CSE - 1st Year",
  teacherId: "teacher-uid", // Optional
  department: "CSE",
  year: "1st Year",
  createdAt: Timestamp
}
```

### Set User ClassId

After creating classes, update user documents with their `classId`:

```javascript
// Update student/teacher document
await updateDoc(doc(db, 'users', userId), {
  classId: 'class-id'
});
```

## Step 4: Test the Setup

1. Create a test admin user:
   - Sign up with email/password
   - In Firestore Console, manually set `role: "admin"` for that user

2. Create a test class:
   - Add a document to `classes` collection
   - Note the document ID

3. Create test students:
   - Sign up students
   - Set their `classId` and `role: "student"` in Firestore

4. Test attendance marking:
   - Login as teacher/admin
   - Go to Attendance page
   - Mark attendance for students
   - Login as student and verify attendance appears

## Step 5: Production Checklist

- [ ] Firestore rules deployed
- [ ] All required indexes created
- [ ] Initial classes created
- [ ] Admin user created
- [ ] Test data verified
- [ ] Error handling tested
- [ ] Real-time updates working
- [ ] File uploads working (assignments)
- [ ] Security rules tested

## Common Issues

### Issue: "Missing or insufficient permissions"
**Solution:** Check that Firestore rules are deployed and user has correct role set

### Issue: "The query requires an index"
**Solution:** Create the required index as prompted by Firestore, or manually create it in Firebase Console

### Issue: "classId not found"
**Solution:** Ensure users have `classId` field set in their user document

### Issue: "No students in class"
**Solution:** Verify students have `classId` matching the class, and `role: "student"` is set

## Data Structure Reference

### Collections Overview:

- `users` - User profiles and authentication data
- `classes` - Class information
- `attendance` - Attendance records
- `marks` - Student marks/grades
- `assignments` - Assignment details
- `assignmentSubmissions` - Student submissions
- `fees` - Fee structure per student
- `payments` - Payment records
- `exams` - Exam schedule
- `events` - Calendar events
- `announcements` - College announcements
- `messages` - Chat messages
- `placements` - Placement drives
- `library` - Library book records
- `transport/routes/list` - Bus routes

For detailed field structures, see `src/utils/firestore.ts` type definitions.

