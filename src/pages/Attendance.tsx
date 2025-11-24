import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '../auth/AuthContext';
import { useMemo, useState, useEffect } from 'react';
import { 
  getStudentsInClass, 
  markAttendance, 
  getAttendanceForStudent,
  calculateAttendancePercentage,
  getAttendanceForClass,
  getAttendanceStats,
  type UserProfile,
  type AttendanceRecord,
  type AttendanceStats
} from '../utils/firestore';
import { onSnapshot, query, where, collection, doc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Loader from '../components/Loader';

function colorFor(p: number) {
  if (p > 75) return '#10b981';
  if (p >= 60) return '#f59e0b';
  return '#ef4444';
}

type Student = { id: string; name: string; present: boolean; rollNumber?: string };
type SubjectAttendance = { 
  name: string; 
  percent: number;
  present: number;
  classesHeld: number;
};

export default function Attendance() {
  const { role, user } = useAuth();
  const [roster, setRoster] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<SubjectAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [classId, setClassId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const subjectsList = ['Maths', 'CSE', 'Physics', 'Chemistry', 'Electronics', 'English'];

  useEffect(() => {
    if (!user) return;

    // Get user's classId
    const fetchUserClass = async () => {
      try {
        const userDoc = await import('../utils/firestore').then(m => m.getUserProfile(user.uid));
        if (userDoc?.classId) {
          setClassId(userDoc.classId);
        }
      } catch (error) {
        console.error('Error fetching user class:', error);
      }
    };

    if (role === 'teacher' || role === 'admin') {
      fetchUserClass().then(() => {
        if (classId) {
          // Fetch student roster for teachers/admins
          const q = getStudentsInClass(classId);
          const unsubscribe = onSnapshot(q, (snapshot) => {
            const students: Student[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data() as UserProfile;
              students.push({
                id: doc.id,
                name: data.displayName || data.email || '',
                rollNumber: data.rollNumber,
                present: false,
              });
            });
            setRoster(students);
            setLoading(false);
          });
          return () => unsubscribe();
        } else {
          setLoading(false);
        }
      });
    } else {
      // Fetch subject-wise attendance for students from calculated stats
      const fetchAttendance = () => {
        try {
          const statsRef = getAttendanceStats(user.uid);
          const unsubscribe = onSnapshot(statsRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as AttendanceStats;
              
              // Convert subjectWise object to array
              const subjectArray: SubjectAttendance[] = Object.keys(data.subjectWise || {}).map(subject => {
                const stats = data.subjectWise[subject];
                return {
                  name: subject,
                  percent: stats.percentage || 0,
                  present: stats.present || 0,
                  classesHeld: stats.classesHeld || stats.total || 0,
                };
              });
              
              setSubjects(subjectArray);
              console.log('📊 Attendance stats loaded for student:', {
                overall: data.overallPercentage,
                total: data.totalClasses,
                present: data.presentClasses,
                absent: data.absentClasses,
                subjects: subjectArray.length
              });
              setLoading(false);
            } else {
              // Fallback: calculate from raw attendance records
              console.log('No attendance stats found, calculating from records...');
              const attendanceQueries = subjectsList.map(subject => 
                getAttendanceForStudent(user.uid, subject)
              );

              const unsubscribeFunctions = attendanceQueries.map((q, index) => 
                onSnapshot(q, (snapshot) => {
                  const subject = subjectsList[index];
                  const total = snapshot.size;
                  const present = snapshot.docs.filter(doc => doc.data().present === true).length;
                  const percent = total > 0 ? Math.round((present / total) * 100) : 0;

                  setSubjects(prev => {
                    const updated = [...prev];
                    const existingIndex = updated.findIndex(s => s.name === subject);
                    if (existingIndex >= 0) {
                      updated[existingIndex] = { name: subject, percent };
                    } else {
                      updated.push({ name: subject, percent });
                    }
                    return updated;
                  });
                  setLoading(false);
                })
              );

              return () => unsubscribeFunctions.forEach(unsub => unsub());
            }
          }, (error) => {
            console.error('Error fetching attendance stats:', error);
            setLoading(false);
          });

          return unsubscribe;
        } catch (error) {
          console.error('Error fetching attendance:', error);
          setLoading(false);
        }
      };
      fetchAttendance();
    }
  }, [user, role, classId]);

  const summary = useMemo(() => {
    const total = roster.length;
    const present = roster.filter(s => s.present).length;
    return { total, present, percent: Math.round((present / Math.max(1, total)) * 100) };
  }, [roster]);

  async function handleSaveAttendance() {
    if (!user || !classId || !selectedSubject) {
      setError('Please select a subject');
      return;
    }

    if (roster.length === 0) {
      setError('No students in class');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const records = roster.map(s => ({
        studentId: s.id,
        studentName: s.name,
        present: s.present,
        subject: selectedSubject,
      }));

      await markAttendance(classId, selectedDate, records, user.uid);
      
      // Reset roster to default (all absent)
      setRoster(prev => prev.map(s => ({ ...s, present: false })));
      alert('Attendance marked successfully!');
    } catch (err: any) {
      console.error('Error marking attendance:', err);
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  }

  function toggleStudentPresence(idx: number, present: boolean) {
    setRoster(prev => prev.map((s, i) => i === idx ? { ...s, present } : s));
  }

  if (loading) {
    return (
      <div className="card p-5">
        <Loader />
      </div>
    );
  }

  if (role === 'teacher' || role === 'admin') {
    return (
      <div className="space-y-4">
        <div className="card p-5">
          <div className="font-semibold mb-4">Mark Attendance</div>
          
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="block text-sm text-neutral-500 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              >
                <option value="">Select Subject</option>
                {subjectsList.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-500 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          <div className="text-sm text-neutral-500 mb-3">
            Present: {summary.present}/{summary.total} ({summary.percent}%)
          </div>

          {roster.length === 0 ? (
            <div className="text-neutral-500">No students found in your class</div>
          ) : (
            <>
              <div className="mt-3 grid gap-2 max-h-96 overflow-y-auto">
                {roster.map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2">
                    <div className="font-medium text-sm">
                      {s.name} {s.rollNumber && `(${s.rollNumber})`}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStudentPresence(idx, false)}
                        className={`px-3 py-1 rounded-lg text-sm transition ${!s.present ? 'bg-rose-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => toggleStudentPresence(idx, true)}
                        className={`px-3 py-1 rounded-lg text-sm transition ${s.present ? 'bg-emerald-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                      >
                        Present
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveAttendance}
                disabled={saving || !selectedSubject || roster.length === 0}
                className="mt-4 w-full px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">No attendance data available</div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-5">
        <div className="font-semibold mb-4">Subject-wise Attendance</div>
        <ul className="mt-4 space-y-2 text-sm">
          {subjects.map((s) => (
            <li key={s.name} className="rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{s.name}</span>
                <span style={{ color: colorFor(s.percent) }} className="font-semibold">{s.percent}%</span>
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Present: {s.present} / Classes Held: {s.classesHeld}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-5">
        <div className="font-semibold">Weekly Trend</div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjects}>
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="percent" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
