import { useAuth } from '../auth/AuthContext';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { 
  getAssignmentsForStudent,
  getExamsForClass,
  getAttendanceForStudent,
  getUserProfile,
  getAttendanceStats,
  type AttendanceStats
} from '../utils/firestore';
import { onSnapshot, collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Loader from '../components/Loader';

export default function Dashboard() {
  const { user } = useAuth();
  const [studentName, setStudentName] = useState<string>('Student');
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [assignmentsDue, setAssignmentsDue] = useState(0);
  const [upcomingExams, setUpcomingExams] = useState(0);
  const [notifications, setNotifications] = useState<Array<{ title: string; message: string }>>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const initialize = async () => {
      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile?.classId) {
          setClassId(userProfile.classId);
        }
        // Get student's full name from profile
        const fullName = userProfile?.displayName || user?.displayName || 'Student';
        setStudentName(fullName);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to user displayName if profile fetch fails
        setStudentName(user?.displayName || 'Student');
      }
    };

    initialize();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Set a timeout to ensure loading doesn't stay forever
    const loadingTimeout = setTimeout(() => {
      console.warn('Loading timeout - setting loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    // Fetch attendance data from calculated stats in Firestore
    // This works even without classId since we use user.uid directly
    const fetchAttendance = () => {
      const statsRef = getAttendanceStats(user.uid);
      let fallbackUnsubscribes: (() => void)[] = [];
      
      const unsubscribe = onSnapshot(statsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as AttendanceStats;
          setAttendanceStats(data);
          
          // Recalculate overall percentage from subject-wise data if available
          // This ensures we use classes held, not just attendance records
          let calculatedOverallPercent = data.overallPercentage || 0;
          
          if (data.subjectWise && Object.keys(data.subjectWise).length > 0) {
            let totalClassesHeld = 0;
            let totalPresent = 0;
            
            Object.values(data.subjectWise).forEach(stats => {
              const classesHeld = stats.classesHeld || stats.total || 0;
              totalClassesHeld += classesHeld;
              totalPresent += stats.present || 0;
            });
            
            if (totalClassesHeld > 0) {
              calculatedOverallPercent = Math.round((totalPresent / totalClassesHeld) * 100);
            }
          }
          
          setAttendancePercent(calculatedOverallPercent);
          console.log('📊 Attendance stats loaded:', {
            overall: calculatedOverallPercent,
            storedOverall: data.overallPercentage,
            total: data.totalClasses,
            present: data.presentClasses,
            absent: data.absentClasses,
            subjects: Object.keys(data.subjectWise || {}).length
          });
          setLoading(false);
          
          // Clean up fallback listeners if they exist
          fallbackUnsubscribes.forEach(unsub => unsub());
          fallbackUnsubscribes = [];
        } else {
          // No stats yet, calculate from raw attendance records as fallback
          console.log('No attendance stats found, calculating from records...');
          const subjects = ['Maths', 'CSE', 'Physics', 'Chemistry', 'Electronics', 'English'];
          let totalPercent = 0;
          let count = 0;
          let hasData = false;

          fallbackUnsubscribes = subjects.map(subject => {
            const q = getAttendanceForStudent(user.uid, subject);
            return onSnapshot(q, (snapshot) => {
              const total = snapshot.size;
              const present = snapshot.docs.filter(doc => doc.data().present === true).length;
              const percent = total > 0 ? Math.round((present / total) * 100) : 0;
              
              if (total > 0) hasData = true;
              
              // Calculate average across all subjects
              totalPercent += percent;
              count++;
              if (count === subjects.length) {
                const avg = hasData ? Math.round(totalPercent / subjects.length) : 0;
                setAttendancePercent(avg);
                setLoading(false);
              }
            }, (error) => {
              console.error(`Error fetching attendance for subject ${subject}:`, error);
              count++;
              if (count === subjects.length) {
                setLoading(false);
              }
            });
          });
        }
      }, (error) => {
        console.error('Error fetching attendance stats:', error);
        // Try fallback calculation
        console.log('Trying fallback calculation from raw records...');
        const subjects = ['Maths', 'CSE', 'Physics', 'Chemistry', 'Electronics', 'English'];
        let totalPercent = 0;
        let count = 0;
        let hasData = false;

        fallbackUnsubscribes = subjects.map(subject => {
          const q = getAttendanceForStudent(user.uid, subject);
          return onSnapshot(q, (snapshot) => {
            const total = snapshot.size;
            const present = snapshot.docs.filter(doc => doc.data().present === true).length;
            const percent = total > 0 ? Math.round((present / total) * 100) : 0;
            
            if (total > 0) hasData = true;
            
            totalPercent += percent;
            count++;
            if (count === subjects.length) {
              const avg = hasData ? Math.round(totalPercent / subjects.length) : 0;
              setAttendancePercent(avg);
              setLoading(false);
            }
          }, (err) => {
            console.error(`Error in fallback for ${subject}:`, err);
            count++;
            if (count === subjects.length) {
              setLoading(false);
            }
          });
        });
      });

      return () => {
        unsubscribe();
        fallbackUnsubscribes.forEach(unsub => unsub());
      };
    };

    // Fetch assignments due (only if classId exists)
    const fetchAssignments = () => {
      if (!classId) {
        setAssignmentsDue(0);
        return () => {};
      }
      const q = getAssignmentsForStudent(user.uid, classId);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const dueCount = snapshot.docs.filter(doc => {
          const dueDate = doc.data().dueDate as Timestamp;
          if (!dueDate) return false;
          const due = dueDate.toDate();
          return due >= today && due <= nextWeek;
        }).length;
        
        setAssignmentsDue(dueCount);
      }, (error) => {
        console.error('Error fetching assignments:', error);
      });
      return unsubscribe;
    };

    // Fetch upcoming exams (only if classId exists)
    const fetchExams = () => {
      if (!classId) {
        setUpcomingExams(0);
        return () => {};
      }
      const q = getExamsForClass(classId);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const today = new Date();
        const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const examCount = snapshot.docs.filter(doc => {
          const examDate = doc.data().date as Timestamp;
          if (!examDate) return false;
          const date = examDate.toDate();
          return date >= today && date <= nextMonth;
        }).length;
        
        setUpcomingExams(examCount);
      }, (error) => {
        console.error('Error fetching exams:', error);
      });
      return unsubscribe;
    };

    // Fetch recent announcements as notifications
    const fetchNotifications = () => {
      const q = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          title: doc.data().title || '',
          message: doc.data().message || '',
        }));
        setNotifications(items);
      });
      return unsubscribe;
    };

    const unsubAttendance = fetchAttendance();
    const unsubAssignments = fetchAssignments();
    const unsubExams = fetchExams();
    const unsubNotifications = fetchNotifications();

    // Don't set loading to false here - let the fetch functions handle it
    // This ensures loading only ends when data is actually received

    return () => {
      clearTimeout(loadingTimeout);
      if (unsubAttendance) unsubAttendance();
      if (unsubAssignments) unsubAssignments();
      if (unsubExams) unsubExams();
      if (unsubNotifications) unsubNotifications();
    };
  }, [user, classId]);

  useEffect(() => {
    // Always animate, even if attendancePercent is 0
    let frame = 0;
    const durationMs = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setProgress(Math.round(eased * attendancePercent));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [attendancePercent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col">
      <div className="flex-grow">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Attendance', value: `${attendancePercent}%`, sub: 'Overall', color: 'from-purple-500 to-sky-500' },
            { title: 'Assignments Due', value: `${assignmentsDue}`, sub: 'Next 7 days', color: 'from-emerald-500 to-teal-500' },
            { title: 'Upcoming Exams', value: `${upcomingExams}`, sub: 'This month', color: 'from-amber-500 to-rose-500' },
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
          <div className="card p-5 md:col-span-2 flex flex-col" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <div className="text-lg font-semibold">Welcome, {studentName}</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  Bharat Institute of Engineering & Technology (BIET)
                </div>
              </div>
            </div>
            <div className="mt-6 grid place-items-center flex-shrink-0">
              <div
                className="relative size-48 cursor-pointer"
                title="Click to replay"
                onClick={() => setProgress(0)}
              >
                <svg viewBox="0 0 36 36" className="size-full">
                  <path
                    className="text-neutral-200 dark:text-neutral-800"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32"
                  />
                  <path
                    className={progress >= 75 ? 'text-emerald-500' : 'text-rose-500'}
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32"
                    style={{ 
                      strokeDasharray: '100.53, 100.53',
                      strokeDashoffset: `${100.53 - (progress / 100) * 100.53}`,
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      transition: 'stroke-dashoffset 0.3s ease, color 0.3s ease'
                    }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-4xl font-semibold">{progress}%</div>
                    <div className="text-sm text-neutral-500">Attendance</div>
                    {attendanceStats && (() => {
                      // Calculate total classes held from subject-wise data
                      const totalClassesHeld = Object.values(attendanceStats.subjectWise || {}).reduce((sum, stats) => {
                        return sum + (stats.classesHeld || stats.total || 0);
                      }, 0);
                      const totalPresent = Object.values(attendanceStats.subjectWise || {}).reduce((sum, stats) => {
                        return sum + (stats.present || 0);
                      }, 0);
                      return (
                        <div className="text-xs text-neutral-400 mt-1">
                          {totalPresent} / {totalClassesHeld || attendanceStats.totalClasses} classes
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Subject-wise Attendance Details - Scrollable */}
            {attendanceStats && attendanceStats.subjectWise && Object.keys(attendanceStats.subjectWise).length > 0 && (
              <div className="mt-6 flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="font-semibold mb-3 flex-shrink-0">Subject-wise Attendance</div>
                <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide pr-2">
                  {Object.entries(attendanceStats.subjectWise).map(([subject, stats]) => (
                    <div key={subject} className="flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                      <div>
                        <div className="font-medium text-sm">{subject}</div>
                        <div className="text-xs text-neutral-500 mt-1">
                          Present: {stats.present} / Classes Held: {stats.classesHeld || stats.total}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${stats.percentage >= 75 ? 'text-emerald-600' : stats.percentage >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {stats.percentage}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="font-semibold">Notifications</div>
            {notifications.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
                {notifications.map((n, idx) => (
                  <li key={idx} className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-neutral-500 mt-1">{n.message}</div>
                  </li>
                ))}
            </ul>
            ) : (
              <div className="mt-3 text-sm text-neutral-500">No notifications</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="text-center font-semibold text-base text-neutral-600 dark:text-neutral-300 mt-10 pb-6">
        Made with <span className="text-red-500 text-lg animate-pulse">❤️</span> by Students for Students
      </footer>
    </div>
  );
}
