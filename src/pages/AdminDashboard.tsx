import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Loader from '../components/Loader';

type KPI = {
  label: string;
  value: string | number;
  color: string;
};

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Array<{ title: string; message: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const unsubscribes: Array<() => void> = [];

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[AdminDashboard] Loading timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    try {
      // Fetch total students
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const unsubscribeStudents = onSnapshot(
        studentsQuery,
        (snapshot) => {
          if (!isMounted) return;
          const totalStudents = snapshot.size;

          // Fetch total teachers
          const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
          const unsubscribeTeachers = onSnapshot(
            teachersQuery,
            (teachersSnapshot) => {
              if (!isMounted) return;
              const totalTeachers = teachersSnapshot.size;

              // Fetch total departments
              const departmentsQuery = query(collection(db, 'departments'));
              const unsubscribeDepartments = onSnapshot(
                departmentsQuery,
                (departmentsSnapshot) => {
                  if (!isMounted) return;
                  const totalDepartments = departmentsSnapshot.size;

                  // Fetch active placements
                  const placementsQuery = query(collection(db, 'placements'));
                  const unsubscribePlacements = onSnapshot(
                    placementsQuery,
                    (placementsSnapshot) => {
                      if (!isMounted) return;
                      const activePlacements = placementsSnapshot.size;

                      if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                      }

                      setKpis([
                        { label: 'Total Students', value: totalStudents, color: 'from-purple-500 to-sky-500' },
                        { label: 'Total Teachers', value: totalTeachers, color: 'from-emerald-500 to-teal-500' },
                        { label: 'Total Departments', value: totalDepartments, color: 'from-amber-500 to-rose-500' },
                        { label: 'Active Placements', value: activePlacements, color: 'from-indigo-500 to-purple-500' },
                      ]);
                      setLoading(false);
                    },
                    (error) => {
                      console.error('[AdminDashboard] Error fetching placements:', error);
                      if (isMounted && timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                        setLoading(false);
                      }
                    }
                  );
                  unsubscribes.push(unsubscribePlacements);
                },
                (error) => {
                  console.error('[AdminDashboard] Error fetching departments:', error);
                  if (isMounted && timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                    setLoading(false);
                  }
                }
              );
              unsubscribes.push(unsubscribeDepartments);
            },
            (error) => {
              console.error('[AdminDashboard] Error fetching teachers:', error);
              if (isMounted && timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
                setLoading(false);
              }
            }
          );
          unsubscribes.push(unsubscribeTeachers);
        },
        (error) => {
          console.error('[AdminDashboard] Error fetching students:', error);
          if (isMounted && timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
            setLoading(false);
          }
        }
      );
      unsubscribes.push(unsubscribeStudents);

      // Fetch recent announcements
      const announcementsQuery = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const unsubscribeAnnouncements = onSnapshot(
        announcementsQuery,
        (snapshot) => {
          if (!isMounted) return;
          const items = snapshot.docs.map(doc => ({
            title: doc.data().title || '',
            message: doc.data().message || '',
          }));
          setRecentAnnouncements(items);
        },
        (error) => {
          console.error('[AdminDashboard] Error fetching announcements:', error);
          // Don't set loading to false here as announcements are not critical
        }
      );
      unsubscribes.push(unsubscribeAnnouncements);
    } catch (error) {
      console.error('[AdminDashboard] Error setting up queries:', error);
      if (isMounted && timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col min-h-screen">
      <div className="flex-grow">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="card p-5"
            >
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white bg-gradient-to-r ${k.color}`}
              >
                {k.label}
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight">{k.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <div className="card p-5 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Admin Dashboard</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  Bharat Institute of Engineering & Technology (BIET)
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="font-semibold mb-3">Quick Actions</div>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                <Link to="/admin/students" className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Manage Students
                </Link>
                <Link to="/announcements" className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Announcements
                </Link>
                <Link to="/fees" className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Manage Fees
                </Link>
                <Link to="/placements" className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Placements
                </Link>
                <Link to="/transport" className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Transport
                </Link>
                <Link to="/admin/timetable" className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                  Manage Timetables
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
        Made with <span className="text-red-500 text-lg animate-pulse">❤️</span> by Students for Admins
      </footer>
    </div>
  );
}

