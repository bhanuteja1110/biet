import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Loader from '../components/Loader';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [teacherData, setTeacherData] = useState<{
    name: string;
    email: string;
    departmentIds: string[];
    yearIds: string[];
    subjects: string[];
    departments: string[];
    years: string[];
  }>({
    name: '',
    email: '',
    departmentIds: [],
    yearIds: [],
    subjects: [],
    departments: [],
    years: [],
  });
  const [totalStudents, setTotalStudents] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Array<{ title: string; message: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const initialize = async () => {
      try {
        // Fetch teacher profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          console.error('Teacher profile not found in Firestore');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const departmentIds = userData.departmentIds || [];
        const yearIds = userData.yearIds || [];
        const subjects = userData.subjects || [];

        // Fetch department names
        const departments: string[] = [];
        if (departmentIds.length > 0) {
          for (const deptId of departmentIds) {
            try {
              const deptDoc = await getDoc(doc(db, 'departments', deptId));
              if (deptDoc.exists()) {
                departments.push(deptDoc.data().name || deptId);
              } else {
                departments.push(deptId);
              }
            } catch (err) {
              console.error(`Error fetching department ${deptId}:`, err);
              departments.push(deptId);
            }
          }
        }

        // Fetch year names
        const years: string[] = [];
        if (yearIds.length > 0) {
          for (const yearId of yearIds) {
            try {
              const yearDoc = await getDoc(doc(db, 'years', yearId));
              if (yearDoc.exists()) {
                years.push(yearDoc.data().name || yearId);
              } else {
                years.push(yearId);
              }
            } catch (err) {
              console.error(`Error fetching year ${yearId}:`, err);
              years.push(yearId);
            }
          }
        }
        
        // Set teacher data
        setTeacherData({
          name: userData.displayName || user?.displayName || 'Teacher',
          email: userData.email || user?.email || '',
          departmentIds,
          yearIds,
          subjects,
          departments,
          years,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching teacher profile:', error);
        setLoading(false);
      }
    };

    // Set timeout to stop loading after 5 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    initialize();

    return () => clearTimeout(timeout);
  }, [user]);

  useEffect(() => {
    if (!user || teacherData.departmentIds.length === 0) {
      // If no departments assigned, still fetch announcements
      const announcementsQuery = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          title: doc.data().title || '',
          message: doc.data().message || '',
        }));
        setRecentAnnouncements(items);
      });

      return () => unsubscribeAnnouncements();
    }

    // Fetch total students in assigned departments
    const fetchStudents = async () => {
      try {
        // Get all students whose department matches any of the teacher's assigned departments
        const allUsersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const snapshot = await getDocs(allUsersQuery);
        let count = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const studentDept = data.department || data.dept || '';
          // Check if student's department matches any of teacher's assigned departments
          if (teacherData.departmentIds.some(deptId => {
            // Check if department name matches or department ID matches
            return studentDept === deptId || 
                   teacherData.departments.some(deptName => deptName === studentDept);
          })) {
            count++;
          }
        });
        
        setTotalStudents(count);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();

    // Fetch pending assignment submissions for teacher's subjects/departments
    const fetchPendingSubmissions = async () => {
      try {
        // Get all assignments (we'll filter by teacher's subjects if needed)
        const assignmentsQuery = query(collection(db, 'assignments'));
        const snapshot = await getDocs(assignmentsQuery);
        let totalPending = 0;
        
        for (const assignmentDoc of snapshot.docs) {
          const assignmentId = assignmentDoc.id;
          const submissionsQuery = query(
            collection(db, 'assignmentSubmissions'),
            where('assignmentId', '==', assignmentId),
            where('status', '==', 'submitted')
          );
          const submissionsSnapshot = await getDocs(submissionsQuery);
          totalPending += submissionsSnapshot.size;
        }
        
        setPendingSubmissions(totalPending);
      } catch (error) {
        console.error('Error fetching submissions:', error);
      }
    };

    fetchPendingSubmissions();

    // Fetch today's attendance count for students in assigned departments
    const today = new Date().toISOString().split('T')[0];
    const fetchTodayAttendance = async () => {
      try {
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('date', '==', today),
          where('present', '==', true)
        );
        const snapshot = await getDocs(attendanceQuery);
        
        // Count only students in teacher's assigned departments
        let count = 0;
        for (const attDoc of snapshot.docs) {
          const attData = attDoc.data();
          const studentId = attData.studentId;
          
          // Get student's department
          try {
            const studentDoc = await getDoc(doc(db, 'users', studentId));
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              const studentDept = studentData.department || studentData.dept || '';
              if (teacherData.departmentIds.some(deptId => {
                return studentDept === deptId || 
                       teacherData.departments.some(deptName => deptName === studentDept);
              })) {
                count++;
              }
            }
          } catch (err) {
            console.error('Error fetching student data:', err);
          }
        }
        
        setTodayAttendance(count);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    };

    fetchTodayAttendance();

    // Fetch recent announcements
    const announcementsQuery = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        title: doc.data().title || '',
        message: doc.data().message || '',
      }));
      setRecentAnnouncements(items);
    });

    return () => {
      unsubscribeAnnouncements();
    };
  }, [user, teacherData.departmentIds, teacherData.departments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (teacherData.departmentIds.length === 0) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">No departments assigned. Please contact admin to assign departments.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col min-h-screen">
      <div className="flex-grow">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Total Students', value: totalStudents.toString(), sub: 'In your class', color: 'from-purple-500 to-sky-500' },
            { title: 'Pending Submissions', value: pendingSubmissions.toString(), sub: 'To grade', color: 'from-emerald-500 to-teal-500' },
            { title: 'Today\'s Attendance', value: `${todayAttendance}/${totalStudents}`, sub: 'Present students', color: 'from-amber-500 to-rose-500' },
          ].map((c) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="card p-5"
            >
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white bg-gradient-to-r ${c.color}`}
              >
                {c.title}
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight">{c.value}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{c.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <div className="card p-5 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Welcome, {teacherData.name}</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  Bharat Institute of Engineering & Technology (BIET)
                </div>
                {teacherData.departments.length > 0 && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Assigned Departments: {teacherData.departments.join(', ')}
                  </div>
                )}
                {teacherData.years.length > 0 && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Years: {teacherData.years.join(', ')}
                  </div>
                )}
                {teacherData.subjects.length > 0 && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Subjects: {teacherData.subjects.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6">
              <div className="font-semibold mb-3">Quick Actions</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link to="/teacher/attendance" className="px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Mark Attendance
                </Link>
                <Link to="/teacher/assignments" className="px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Create Assignment
                </Link>
                <Link to="/teacher/marks" className="px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Update Marks
                </Link>
                <Link to="/announcements" className="px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Post Announcement
                </Link>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="font-semibold">Recent Announcements</div>
            {recentAnnouncements.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm">
                {recentAnnouncements.map((n, idx) => (
                  <li key={idx} className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-neutral-500 mt-1">{n.message}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 text-sm text-neutral-500">No announcements</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="text-center font-semibold text-base text-neutral-600 dark:text-neutral-300 mt-10 pb-6">
        Made with <span className="text-red-500 text-lg animate-pulse">❤️</span> by Students for Teachers
      </footer>
    </div>
  );
}
