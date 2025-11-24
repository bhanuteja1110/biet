import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';
import { 
  getMarksForStudent, 
  getMarksForClass, 
  updateMark, 
  createMark,
  getStudentsInClass,
  type Mark,
  type UserProfile
} from '../utils/firestore';
import { onSnapshot } from 'firebase/firestore';

type MarkRow = {
  id?: string;
  studentId?: string;
  studentName?: string;
  subject: string;
  internal: number;
  external: number;
  total: number;
  grade: string;
};

function calculateGrade(total: number): string {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B+';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  return 'F';
}

export default function Marks() {
  const { role, user } = useAuth();
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classId, setClassId] = useState<string>('');
  const [error, setError] = useState('');

  const subjectsList = ['Maths', 'CSE', 'Physics', 'Chemistry', 'Electronics', 'English'];

  useEffect(() => {
    if (!user) return;

    const fetchUserClass = async () => {
      try {
        const { getUserProfile } = await import('../utils/firestore');
        const userDoc = await getUserProfile(user.uid);
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
          // Fetch students in class
          const studentsQuery = getStudentsInClass(classId);
          const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
            const studentsData: UserProfile[] = [];
            snapshot.forEach((doc) => {
              studentsData.push({ uid: doc.id, ...doc.data() } as UserProfile);
            });
            setStudents(studentsData);
            if (studentsData.length > 0 && !selectedStudent) {
              setSelectedStudent(studentsData[0].uid);
            }
          });

          // Fetch marks for selected student
          if (selectedStudent) {
            const marksQuery = getMarksForStudent(selectedStudent);
            const unsubscribeMarks = onSnapshot(marksQuery, (snapshot) => {
              const marksData: MarkRow[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data() as Mark;
                marksData.push({
                  id: doc.id,
                  studentId: data.studentId,
                  subject: data.subject,
                  internal: data.internal,
                  external: data.external,
                  total: data.internal + data.external,
                  grade: data.grade,
                });
              });
              setRows(marksData);
              setLoading(false);
            });
            return () => {
              unsubscribeStudents();
              unsubscribeMarks();
            };
          }
        } else {
          setLoading(false);
        }
      });
    } else {
      // Fetch marks for student
      const marksQuery = getMarksForStudent(user.uid);
      const unsubscribe = onSnapshot(marksQuery, (snapshot) => {
        const marksData: MarkRow[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Mark;
          marksData.push({
            id: doc.id,
            subject: data.subject,
            internal: data.internal,
            external: data.external,
            total: data.internal + data.external,
            grade: data.grade,
          });
        });
        setRows(marksData);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user, role, classId, selectedStudent]);

  const editable = role === 'teacher' || role === 'admin';

  async function handleUpdateMark(row: MarkRow) {
    if (!user || !row.id) return;

    setSaving(true);
    setError('');

    try {
      const total = row.internal + row.external;
      const grade = calculateGrade(total);

      await updateMark(row.id, {
        internal: row.internal,
        external: row.external,
        grade,
      }, user.uid);
    } catch (err: any) {
      console.error('Error updating mark:', err);
      setError(err.message || 'Failed to update mark');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateMark() {
    if (!user || !selectedStudent || !selectedSubject || !classId) {
      setError('Please fill all fields');
      return;
    }

    const student = students.find(s => s.uid === selectedStudent);
    if (!student) {
      setError('Student not found');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createMark(
        selectedStudent,
        student.displayName || student.email,
        classId,
        selectedSubject,
        0,
        0,
        'F',
        user.uid
      );
      setSelectedSubject('');
    } catch (err: any) {
      console.error('Error creating mark:', err);
      setError(err.message || 'Failed to create mark');
    } finally {
      setSaving(false);
    }
  }

  function updateRow(idx: number, key: 'internal' | 'external', value: number) {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[idx] };
      row[key] = Math.max(0, Math.min(100, value)); // Clamp between 0-100
      row.total = row.internal + row.external;
      row.grade = calculateGrade(row.total);
      next[idx] = row;
      return next;
    });
  }

  if (loading) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">Loading marks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {editable && (
        <div className="card p-5">
          <div className="font-semibold mb-4">Manage Marks</div>
          
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="block text-sm text-neutral-500 mb-1">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              >
                <option value="">Select Student</option>
                {students.map(s => (
                  <option key={s.uid} value={s.uid}>
                    {s.displayName || s.email} {s.rollNumber && `(${s.rollNumber})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-500 mb-1">Add New Subject</label>
              <div className="flex gap-2">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                >
                  <option value="">Select Subject</option>
                  {subjectsList.filter(subj => !rows.find(r => r.subject === subj)).map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
                <button
                  onClick={handleCreateMark}
                  disabled={saving || !selectedSubject || !selectedStudent}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="card p-5">
        <div className="font-semibold mb-3">
          Marks {editable && selectedStudent && (
            <span className="text-xs text-neutral-500">
              - {students.find(s => s.uid === selectedStudent)?.displayName || 'Student'}
            </span>
          )}
        </div>
        {rows.length === 0 ? (
          <div className="text-neutral-500">No marks available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-2">Subject</th>
                  <th>Internal</th>
                  <th>External</th>
                  <th>Total</th>
                  <th>Grade</th>
                  {editable && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.subject} className="border-t border-neutral-200/60 dark:border-neutral-800">
                    <td className="py-2 font-medium">{r.subject}</td>
                    <td>
                      {editable ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-20 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1"
                          value={r.internal}
                          onChange={(e) => updateRow(idx, 'internal', Number(e.target.value || 0))}
                        />
                      ) : (
                        r.internal
                      )}
                    </td>
                    <td>
                      {editable ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-20 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1"
                          value={r.external}
                          onChange={(e) => updateRow(idx, 'external', Number(e.target.value || 0))}
                        />
                      ) : (
                        r.external
                      )}
                    </td>
                    <td className="font-semibold">{r.total}</td>
                    <td className="font-semibold">{r.grade}</td>
                    {editable && r.id && (
                      <td>
                        <button
                          onClick={() => handleUpdateMark(r)}
                          disabled={saving}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
