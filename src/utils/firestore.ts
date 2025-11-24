import { db } from '../firebase/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  query, 
  where, 
  getDocs, 
  onSnapshot,
  orderBy, 
  limit,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

// =========================
// Type Definitions
// =========================

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'teacher' | 'admin';
  photoURL?: string;
  department?: string;
  year?: string;
  rollNumber?: string;
  fatherName?: string;
  contact?: string;
  dob?: string;
  busRoute?: string;
  classId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  subject: string;
  date: string; // YYYY-MM-DD
  present: boolean;
  markedBy: string; // teacher/admin uid
  createdAt: Timestamp;
}

export interface Mark {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  subject: string;
  internal: number;
  external: number;
  grade: string;
  semester?: string;
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description?: string;
  classId: string;
  dueDate: Timestamp;
  maxMarks: number;
  createdBy: string;
  createdAt: Timestamp;
  status: 'active' | 'completed';
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  fileUrl?: string;
  submittedAt: Timestamp;
  marks?: number;
  status: 'submitted' | 'graded';
}

export interface TimeTable {
  id?: string;
  departmentId: string;
  yearId: string;
  rows: Array<{
    day: string;
    slots: Array<{
      subject?: string;
      club?: string;
    }>;
  }>;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
}

export interface Fee {
  id: string;
  studentId: string;
  total: number;
  academicYear: string;
  createdAt: Timestamp;
}

export interface Payment {
  id: string;
  studentId: string;
  feeId: string;
  amount: number;
  date: string;
  mode: string;
  receipt: string;
  createdAt: Timestamp;
}

export interface Exam {
  id: string;
  classId?: string;
  subject: string;
  date: Timestamp;
  time: string;
  duration?: number;
  createdBy: string;
  createdAt: Timestamp;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  start: Timestamp;
  end: Timestamp;
  type: 'exam' | 'holiday' | 'event';
  createdBy: string;
  createdAt: Timestamp;
}

export interface TransportRoute {
  id: string;
  route: string;
  origin: string;
  time: string;
  stops: string[];
  updatedAt: Timestamp;
}

export interface Placement {
  id: string;
  company: string;
  role: string;
  date: string;
  ctc: string;
  apply: string;
  description?: string;
  createdAt: Timestamp;
}

export interface LibraryBook {
  id: string;
  studentId: string;
  title: string;
  author: string;
  status: 'Issued' | 'Available' | 'Reserved';
  due: string;
  issuedAt?: Timestamp;
}

// =========================
// User Functions
// =========================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return { uid, ...userDoc.data() } as UserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// =========================
// Attendance Functions
// =========================

export function getAttendanceForStudent(studentId: string, subject?: string) {
  let q = query(
    collection(db, 'attendance'),
    where('studentId', '==', studentId),
    orderBy('date', 'desc')
  );
  if (subject) {
    q = query(q, where('subject', '==', subject));
  }
  return q;
}

export function getAttendanceForClass(classId: string, date: string) {
  return query(
    collection(db, 'attendance'),
    where('classId', '==', classId),
    where('date', '==', date),
    orderBy('studentName')
  );
}

export async function markAttendance(
  classId: string,
  date: string,
  records: Array<{ studentId: string; studentName: string; present: boolean; subject: string }>,
  markedBy: string
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error('No attendance records to save');
  }

  const subject = records[0].subject;
  if (!subject) {
    throw new Error('Subject is required for attendance records');
  }

  const batch = writeBatch(db);
  
  try {
    // First, delete existing attendance records for this date, subject, and classId
    // to avoid duplicates. We'll delete records for each student individually to avoid composite index issues
    const studentIds = records.map(r => r.studentId);
    
    for (const studentId of studentIds) {
      try {
        const existingQuery = query(
          collection(db, 'attendance'),
          where('studentId', '==', studentId),
          where('classId', '==', classId),
          where('date', '==', date),
          where('subject', '==', subject)
        );
        
        const existingSnapshot = await getDocs(existingQuery);
        existingSnapshot.forEach((doc) => {
          const data = doc.data();
          // Only delete if marked by current user or if we're an admin
          // This prevents permission errors when trying to delete other teachers' records
          if (data.markedBy === markedBy) {
            batch.delete(doc.ref);
          }
        });
      } catch (queryError: any) {
        // If query fails (e.g., missing index), log but continue
        console.warn(`Could not query existing attendance for student ${studentId}:`, queryError.message);
        // Continue with creating new records
      }
    }
    
    // Record that a class was held for this subject (only once per date/subject/class)
    // Check if class already recorded for this date/subject/class
    // Note: This query might require a composite index, so we'll handle errors gracefully
    let classHeldExists = false;
    try {
      const existingClassHeldQuery = query(
        collection(db, 'classesHeld'),
        where('classId', '==', classId),
        where('subject', '==', subject),
        where('date', '==', date)
      );
      const existingClassHeldSnapshot = await getDocs(existingClassHeldQuery);
      classHeldExists = !existingClassHeldSnapshot.empty;
    } catch (queryError: any) {
      // If query fails (e.g., missing composite index), we'll still try to create the record
      // Firestore will prevent duplicates if needed
      console.warn('Could not check existing class held (may need composite index):', queryError.message);
      console.warn('Continuing anyway - Firestore will handle duplicates if any');
    }
    
    // Only record class held if it doesn't already exist
    // If we couldn't check, we'll still try to create it (Firestore will handle duplicates)
    if (!classHeldExists) {
      const classHeldRef = doc(collection(db, 'classesHeld'));
      batch.set(classHeldRef, {
        classId,
        subject,
        date,
        markedBy,
        createdAt: serverTimestamp(),
      });
    }
    
    // Now create new attendance records
    records.forEach((record) => {
      const attendanceRef = doc(collection(db, 'attendance'));
      batch.set(attendanceRef, {
        studentId: record.studentId,
        studentName: record.studentName,
        classId,
        subject: record.subject,
        date,
        present: record.present,
        markedBy,
        createdAt: serverTimestamp(),
      });
    });
    
    await batch.commit();
    console.log(`✅ Attendance marked for ${records.length} students on ${date} for subject ${subject}`);
    
    // Calculate and update attendance statistics for each student
    // Do this asynchronously after batch commit to avoid blocking
    for (const record of records) {
      calculateAndUpdateAttendanceStats(record.studentId).catch(err => {
        console.error(`Error updating attendance stats for student ${record.studentId}:`, err);
      });
    }
  } catch (error: any) {
    console.error('❌ Error in markAttendance:', error);
    throw new Error(`Failed to save attendance: ${error.message}`);
  }
}

// Get classes held count for a subject in a class
export async function getClassesHeldCount(classId: string, subject: string): Promise<number> {
  try {
    const classesHeldQuery = query(
      collection(db, 'classesHeld'),
      where('classId', '==', classId),
      where('subject', '==', subject)
    );
    const snapshot = await getDocs(classesHeldQuery);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting classes held count:', error);
    return 0;
  }
}

// Calculate and store attendance statistics for a student
export async function calculateAndUpdateAttendanceStats(studentId: string): Promise<void> {
  try {
    // Get user profile to get classId (department)
    const userProfile = await getUserProfile(studentId);
    const classId = userProfile?.department || userProfile?.dept || '';
    
    // Get all attendance records for this student
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId)
    );
    
    const snapshot = await getDocs(attendanceQuery);
    
    // Get all classes held for each subject in this student's class
    const classesHeldQuery = classId ? query(
      collection(db, 'classesHeld'),
      where('classId', '==', classId)
    ) : null;
    
    const classesHeldSnapshot = classesHeldQuery ? await getDocs(classesHeldQuery) : null;
    
    // Count classes held per subject
    const classesHeldBySubject: Record<string, number> = {};
    if (classesHeldSnapshot) {
      classesHeldSnapshot.forEach((doc) => {
        const data = doc.data();
        const subject = data.subject || 'Unknown';
        classesHeldBySubject[subject] = (classesHeldBySubject[subject] || 0) + 1;
      });
    }
    
    if (snapshot.empty) {
      // No attendance records, set stats to 0 but include classes held
      const subjectWise: Record<string, { total: number; present: number; absent: number; percentage: number; classesHeld: number }> = {};
      Object.keys(classesHeldBySubject).forEach(subject => {
        subjectWise[subject] = {
          total: 0,
          present: 0,
          absent: 0,
          percentage: 0,
          classesHeld: classesHeldBySubject[subject],
        };
      });
      
      await setDoc(doc(db, 'attendanceStats', studentId), {
        studentId,
        totalClasses: 0,
        presentClasses: 0,
        absentClasses: 0,
        overallPercentage: 0,
        subjectWise,
        lastUpdated: serverTimestamp(),
      });
      return;
    }
    
    // Calculate statistics
    let totalClasses = 0;
    let presentClasses = 0;
    let absentClasses = 0;
    const subjectWise: Record<string, { total: number; present: number; absent: number; percentage: number; classesHeld: number }> = {};
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isPresent = data.present === true;
      const subject = data.subject || 'Unknown';
      
      totalClasses++;
      if (isPresent) {
        presentClasses++;
      } else {
        absentClasses++;
      }
      
      // Subject-wise calculation
      if (!subjectWise[subject]) {
        subjectWise[subject] = { 
          total: 0, 
          present: 0, 
          absent: 0, 
          percentage: 0,
          classesHeld: classesHeldBySubject[subject] || 0,
        };
      }
      subjectWise[subject].total++;
      if (isPresent) {
        subjectWise[subject].present++;
      } else {
        subjectWise[subject].absent++;
      }
    });
    
    // Add subjects that have classes held but no attendance records yet
    Object.keys(classesHeldBySubject).forEach(subject => {
      if (!subjectWise[subject]) {
        subjectWise[subject] = {
          total: 0,
          present: 0,
          absent: 0,
          percentage: 0,
          classesHeld: classesHeldBySubject[subject],
        };
      } else {
        // Update classesHeld count
        subjectWise[subject].classesHeld = classesHeldBySubject[subject];
      }
    });
    
    // Calculate percentages
    const overallPercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
    
    // Calculate subject-wise percentages
    Object.keys(subjectWise).forEach(subject => {
      const stats = subjectWise[subject];
      // Use classesHeld as total if available, otherwise use total attendance records
      const totalForPercentage = stats.classesHeld > 0 ? stats.classesHeld : stats.total;
      stats.percentage = totalForPercentage > 0 ? Math.round((stats.present / totalForPercentage) * 100) : 0;
    });
    
    // Store in Firestore
    await setDoc(doc(db, 'attendanceStats', studentId), {
      studentId,
      totalClasses,
      presentClasses,
      absentClasses,
      overallPercentage,
      subjectWise,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    
    console.log(`✅ Updated attendance stats for student ${studentId}: ${overallPercentage}%`);
  } catch (error: any) {
    console.error(`❌ Error calculating attendance stats for student ${studentId}:`, error);
    throw error;
  }
}

export function calculateAttendancePercentage(studentId: string, subject: string): Promise<number> {
  return new Promise((resolve) => {
    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId),
      where('subject', '==', subject)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const total = snapshot.size;
      const present = snapshot.docs.filter(doc => doc.data().present === true).length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      unsubscribe();
      resolve(percentage);
    });
  });
}

// Get attendance statistics for a student from Firestore
export function getAttendanceStats(studentId: string) {
  return doc(db, 'attendanceStats', studentId);
}

// Interface for attendance statistics
export interface AttendanceStats {
  studentId: string;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  overallPercentage: number;
  subjectWise: Record<string, {
    total: number;
    present: number;
    absent: number;
    percentage: number;
    classesHeld: number; // Total classes held for this subject
  }>;
  lastUpdated: Timestamp;
}

export interface ClassHeld {
  id: string;
  classId: string; // department ID
  subject: string;
  date: string; // YYYY-MM-DD
  period?: number; // Optional: which period (1-5)
  day?: string; // Optional: which day (Mon-Sat)
  markedBy: string; // teacher/admin uid
  createdAt: Timestamp;
}

// =========================
// Marks Functions
// =========================

export function getMarksForStudent(studentId: string) {
  return query(
    collection(db, 'marks'),
    where('studentId', '==', studentId),
    orderBy('subject')
  );
}

export function getMarksForClass(classId: string, subject?: string) {
  let q = query(
    collection(db, 'marks'),
    where('classId', '==', classId)
  );
  if (subject) {
    q = query(q, where('subject', '==', subject));
  }
  return q;
}

export async function updateMark(
  markId: string,
  data: { internal: number; external: number; grade: string },
  updatedBy: string
): Promise<void> {
  await updateDoc(doc(db, 'marks', markId), {
    ...data,
    total: data.internal + data.external,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}

export async function createMark(
  studentId: string,
  studentName: string,
  classId: string,
  subject: string,
  internal: number,
  external: number,
  grade: string,
  updatedBy: string
): Promise<string> {
  const markRef = doc(collection(db, 'marks'));
  await setDoc(markRef, {
    studentId,
    studentName,
    classId,
    subject,
    internal,
    external,
    total: internal + external,
    grade,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
  return markRef.id;
}

// =========================
// Assignment Functions
// =========================

export function getAssignmentsForStudent(studentId: string, classId: string) {
  return query(
    collection(db, 'assignments'),
    where('classId', '==', classId),
    where('status', '==', 'active'),
    orderBy('dueDate', 'asc')
  );
}

export function getAssignmentsForClass(classId: string) {
  return query(
    collection(db, 'assignments'),
    where('classId', '==', classId),
    orderBy('createdAt', 'desc')
  );
}

export async function createAssignment(
  title: string,
  subject: string,
  classId: string,
  dueDate: Date,
  maxMarks: number,
  createdBy: string,
  description?: string
): Promise<string> {
  const assignmentRef = doc(collection(db, 'assignments'));
  await setDoc(assignmentRef, {
    title,
    subject,
    description,
    classId,
    dueDate: Timestamp.fromDate(dueDate),
    maxMarks,
    createdBy,
    status: 'active',
    createdAt: serverTimestamp(),
  });
  return assignmentRef.id;
}

export function getSubmissionsForAssignment(assignmentId: string) {
  return query(
    collection(db, 'assignmentSubmissions'),
    where('assignmentId', '==', assignmentId),
    orderBy('submittedAt', 'desc')
  );
}

export function getSubmissionsForStudent(studentId: string) {
  return query(
    collection(db, 'assignmentSubmissions'),
    where('studentId', '==', studentId),
    orderBy('submittedAt', 'desc')
  );
}

export async function submitAssignment(
  assignmentId: string,
  studentId: string,
  studentName: string,
  fileUrl?: string
): Promise<string> {
  const submissionRef = doc(collection(db, 'assignmentSubmissions'));
  await setDoc(submissionRef, {
    assignmentId,
    studentId,
    studentName,
    fileUrl,
    status: 'submitted',
    submittedAt: serverTimestamp(),
  });
  return submissionRef.id;
}

export async function gradeAssignment(
  submissionId: string,
  marks: number
): Promise<void> {
  await updateDoc(doc(db, 'assignmentSubmissions', submissionId), {
    marks,
    status: 'graded',
  });
}

// =========================
// TimeTable Functions
// =========================

// Get timetable by department and year
export async function getTimeTableByDeptYear(departmentId: string, yearId: string): Promise<TimeTable | null> {
  const timetablesQuery = query(
    collection(db, 'timetables'),
    where('departmentId', '==', departmentId),
    where('yearId', '==', yearId),
    limit(1)
  );
  const snapshot = await getDocs(timetablesQuery);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as TimeTable;
}

// Get or create timetable for department and year
export async function getOrCreateTimeTable(departmentId: string, yearId: string): Promise<TimeTable> {
  const existing = await getTimeTableByDeptYear(departmentId, yearId);
  if (existing) return existing;
  
  // Create default empty timetable with 5 periods and Saturday
  const defaultRows = [
    { day: 'Mon', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Tue', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Wed', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Thu', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Fri', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Sat', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
  ];
  
  const newTimetable: Omit<TimeTable, 'id'> = {
    departmentId,
    yearId,
    rows: defaultRows,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  const docRef = await addDoc(collection(db, 'timetables'), newTimetable);
  return { id: docRef.id, ...newTimetable };
}

// Update timetable
export async function updateTimeTable(timetableId: string, rows: TimeTable['rows']): Promise<void> {
  await updateDoc(doc(db, 'timetables', timetableId), {
    rows,
    updatedAt: serverTimestamp(),
  });
}

// Save timetable (create or update)
export async function saveTimeTable(departmentId: string, yearId: string, rows: TimeTable['rows']): Promise<void> {
  const existing = await getTimeTableByDeptYear(departmentId, yearId);
  if (existing && existing.id) {
    await updateTimeTable(existing.id, rows);
  } else {
    const newTimetable: Omit<TimeTable, 'id'> = {
      departmentId,
      yearId,
      rows,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    await addDoc(collection(db, 'timetables'), newTimetable);
  }
}

// Legacy function for backward compatibility
export async function getTimeTable(classId: string): Promise<TimeTable | null> {
  const timetableDoc = await getDoc(doc(db, 'classes', classId, 'config', 'timetable'));
  if (!timetableDoc.exists()) return null;
  return timetableDoc.data() as TimeTable;
}

// =========================
// Fees Functions
// =========================

export function getFeesForStudent(studentId: string) {
  return query(
    collection(db, 'fees'),
    where('studentId', '==', studentId)
  );
}

export function getPaymentsForStudent(studentId: string) {
  return query(
    collection(db, 'payments'),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );
}

export async function createFee(
  studentId: string,
  total: number,
  academicYear: string
): Promise<string> {
  const feeRef = doc(collection(db, 'fees'));
  await setDoc(feeRef, {
    studentId,
    total,
    academicYear,
    createdAt: serverTimestamp(),
  });
  return feeRef.id;
}

export async function recordPayment(
  studentId: string,
  feeId: string,
  amount: number,
  date: string,
  mode: string,
  receipt: string
): Promise<string> {
  const paymentRef = doc(collection(db, 'payments'));
  await setDoc(paymentRef, {
    studentId,
    feeId,
    amount,
    date,
    mode,
    receipt,
    createdAt: serverTimestamp(),
  });
  return paymentRef.id;
}

// =========================
// Exam Functions
// =========================

export function getExamsForClass(classId?: string) {
  if (classId) {
    return query(
      collection(db, 'exams'),
      where('classId', '==', classId),
      orderBy('date', 'asc')
    );
  }
  return query(
    collection(db, 'exams'),
    orderBy('date', 'asc')
  );
}

export async function createExam(
  subject: string,
  date: Date,
  time: string,
  createdBy: string,
  classId?: string,
  duration?: number
): Promise<string> {
  const examRef = doc(collection(db, 'exams'));
  await setDoc(examRef, {
    subject,
    date: Timestamp.fromDate(date),
    time,
    duration,
    classId,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return examRef.id;
}

// =========================
// Event Functions
// =========================

export function getEvents() {
  return query(
    collection(db, 'events'),
    orderBy('start', 'asc')
  );
}

export async function createEvent(
  title: string,
  start: Date,
  end: Date,
  type: 'exam' | 'holiday' | 'event',
  createdBy: string,
  description?: string
): Promise<string> {
  const eventRef = doc(collection(db, 'events'));
  await setDoc(eventRef, {
    title,
    description,
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    type,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return eventRef.id;
}

// =========================
// Transport Functions
// =========================

export function getTransportRoutes() {
  return query(
    collection(db, 'transport', 'routes', 'list'),
    orderBy('route')
  );
}

export async function updateTransportRoute(
  routeId: string,
  data: Partial<TransportRoute>
): Promise<void> {
  await updateDoc(doc(db, 'transport', 'routes', 'list', routeId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// =========================
// Placement Functions
// =========================

export function getPlacements() {
  return query(
    collection(db, 'placements'),
    orderBy('date', 'asc')
  );
}

export async function createPlacement(
  company: string,
  role: string,
  date: string,
  ctc: string,
  apply: string,
  description?: string
): Promise<string> {
  const placementRef = doc(collection(db, 'placements'));
  await setDoc(placementRef, {
    company,
    role,
    date,
    ctc,
    apply,
    description,
    createdAt: serverTimestamp(),
  });
  return placementRef.id;
}

// =========================
// Library Functions
// =========================

export function getLibraryBooksForStudent(studentId: string) {
  return query(
    collection(db, 'library'),
    where('studentId', '==', studentId),
    orderBy('issuedAt', 'desc')
  );
}

export async function issueBook(
  studentId: string,
  title: string,
  author: string,
  due: string
): Promise<string> {
  const bookRef = doc(collection(db, 'library'));
  await setDoc(bookRef, {
    studentId,
    title,
    author,
    status: 'Issued',
    due,
    issuedAt: serverTimestamp(),
  });
  return bookRef.id;
}

// =========================
// Class Functions
// =========================

export function getStudentsInClass(classId: string) {
  // Try with orderBy first, but handle index errors gracefully
  try {
    return query(
      collection(db, 'users'),
      where('classId', '==', classId),
      where('role', '==', 'student'),
      orderBy('rollNumber')
    );
  } catch (error) {
    // If orderBy fails (no index), return query without orderBy
    return query(
      collection(db, 'users'),
      where('classId', '==', classId),
      where('role', '==', 'student')
    );
  }
}

// Deprecated: Teachers now use departmentIds instead of classId
// This function is kept for backward compatibility but may not work if classes collection is deleted
export function getClassesForTeacher(teacherId: string) {
  // Return empty query result - teachers should use departmentIds from their user profile
  return query(collection(db, 'departments'), where('__name__', '==', '__nonexistent__'));
}
