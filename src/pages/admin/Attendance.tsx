import { useAuth } from '../../auth/AuthContext';
import { useState, useEffect } from 'react';
import { 
  getStudentsInClass, 
  markAttendance,
  type UserProfile
} from '../../utils/firestore';
import { onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import Loader from '../../components/Loader';

type Student = { id: string; name: string; present: boolean; rollNumber?: string; classId?: string };
type Class = { id: string; name: string };

export default function AdminAttendance() {
  const { user } = useAuth();
  const [roster, setRoster] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string>('');

  const subjectsList = ['Maths', 'CSE', 'Physics', 'Chemistry', 'Electronics', 'English'];

  useEffect(() => {
    // Fetch all departments (replacing classes)
    const departmentsQuery = query(collection(db, 'departments'));
    const unsubscribeDepartments = onSnapshot(departmentsQuery, (snapshot) => {
      const classesData: Class[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        classesData.push({
          id: doc.id,
          name: data.name || doc.id,
        });
      });
      setClasses(classesData);
      if (classesData.length > 0 && !selectedClass) {
        setSelectedClass(classesData[0].id);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching departments:', err);
      setError('Failed to load departments. Please create departments in Classes page.');
      setLoading(false);
    });

    return () => unsubscribeDepartments();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setRoster([]);
      return;
    }

    const q = getStudentsInClass(selectedClass);
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log(`Found ${snapshot.size} students in class ${selectedClass}`);
        const students: Student[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as UserProfile;
          students.push({
            id: doc.id,
            name: data.displayName || data.email || '',
            rollNumber: data.rollNumber,
            present: false,
            classId: selectedClass,
          });
        });
        setRoster(students);
        if (students.length === 0) {
          setError('No students found in this class. Make sure students have classId set to match the selected class.');
        } else {
          setError('');
        }
      },
      (err) => {
        console.error('Error fetching students:', err);
        if (err.code === 'failed-precondition') {
          setError('Firestore index required. Please create an index for users collection with fields: classId, role');
        } else {
          setError(`Error loading students: ${err.message}`);
        }
      }
    );

    return () => unsubscribe();
  }, [selectedClass]);

  const summary = {
    total: roster.length,
    present: roster.filter(s => s.present).length,
    percent: roster.length > 0 ? Math.round((roster.filter(s => s.present).length / roster.length) * 100) : 0
  };

  async function handleSaveAttendance() {
    if (!user || !selectedClass || !selectedSubject) {
      setError('Please select class and subject');
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

      await markAttendance(selectedClass, selectedDate, records, user.uid);
      
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

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold mb-4">Mark Attendance (Admin)</div>
        
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            >
              <option value="">Select Class</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
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
          <div className="text-neutral-500">No students found. Select a class first.</div>
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
              disabled={saving || !selectedSubject || !selectedClass || roster.length === 0}
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

