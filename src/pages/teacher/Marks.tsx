import { useAuth } from '../../auth/AuthContext';
import { useState, useEffect } from 'react';
import { 
  getMarksForStudent, 
  updateMark, 
  createMark,
  type Mark,
  type UserProfile
} from '../../utils/firestore';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import Loader from '../../components/Loader';

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

export default function TeacherMarks() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTeacherData = async () => {
      try {
        // Fetch teacher profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          setError('Teacher profile not found. Please contact admin.');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const departmentIds = userData.departmentIds || [];
        const subjects = userData.subjects || [];

        if (departmentIds.length === 0) {
          setError('No departments assigned. Please contact admin to assign departments.');
          setLoading(false);
          return;
        }

        // Fetch department names
        const departmentsData: { id: string; name: string }[] = [];
        for (const deptId of departmentIds) {
          try {
            const deptDoc = await getDoc(doc(db, 'departments', deptId));
            if (deptDoc.exists()) {
              departmentsData.push({
                id: deptId,
                name: deptDoc.data().name || deptId,
              });
            } else {
              departmentsData.push({ id: deptId, name: deptId });
            }
          } catch (err) {
            console.error(`Error fetching department ${deptId}:`, err);
            departmentsData.push({ id: deptId, name: deptId });
          }
        }

        setDepartments(departmentsData);
        // Only use assigned subjects, no fallback
        setTeacherSubjects(subjects || []);
        
        if (subjects.length === 0) {
          setError('No subjects assigned. Please contact admin to assign subjects to your account.');
        }
        
        // Auto-select first department
        if (departmentsData.length > 0 && !selectedDepartment) {
          setSelectedDepartment(departmentsData[0].id);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching teacher data:', error);
        setError('Error loading teacher information. Please refresh the page.');
        setLoading(false);
      }
    };

    // Set timeout to stop loading after 5 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    fetchTeacherData();

    return () => clearTimeout(timeout);
  }, [user]);

  useEffect(() => {
    if (!selectedDepartment) {
      setStudents([]);
      setSelectedStudent('');
      return;
    }

    const fetchStudents = async () => {
      try {
        // Get the selected department name
        const selectedDept = departments.find(d => d.id === selectedDepartment);
        const deptName = selectedDept?.name || selectedDepartment;

        // Fetch all students
        const allUsersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const snapshot = await getDocs(allUsersQuery);
        
        const studentsData: UserProfile[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const studentDept = data.department || data.dept || '';
          
          // Match student's department with selected department (by ID or name)
          if (studentDept === selectedDepartment || studentDept === deptName) {
            studentsData.push({ 
              uid: doc.id, 
              ...data 
            } as UserProfile);
          }
        });

        setStudents(studentsData);
        if (studentsData.length > 0 && !selectedStudent) {
          setSelectedStudent(studentsData[0].uid);
        }
        if (studentsData.length === 0) {
          setError(`No students found in ${deptName} department.`);
        } else {
          setError('');
        }
      } catch (err: any) {
        console.error('Error fetching students:', err);
        setError(`Error loading students: ${err.message}`);
      }
    };

    fetchStudents();
  }, [selectedDepartment, departments]);

  useEffect(() => {
    if (!selectedStudent) return;

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
    });

    return () => unsubscribeMarks();
  }, [selectedStudent]);

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
    if (!user || !selectedStudent || !selectedSubject || !selectedDepartment) {
      setError('Please select department, student, and subject');
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
      // Use department ID as classId for backward compatibility with marks records
      await createMark(
        selectedStudent,
        student.displayName || student.email,
        selectedDepartment,
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
      row[key] = Math.max(0, Math.min(100, value));
      row.total = row.internal + row.external;
      row.grade = calculateGrade(row.total);
      next[idx] = row;
      return next;
    });
  }

  if (loading) {
    return (
      <div className="card p-5">
        <Loader />
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">No departments assigned. Please contact admin to assign departments.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold mb-4">Manage Marks</div>
        
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedStudent(''); // Reset student when department changes
              }}
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-1">Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              disabled={!selectedDepartment}
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
                disabled={!selectedStudent}
              >
                <option value="">Select Subject</option>
                {teacherSubjects.filter(subj => !rows.find(r => r.subject === subj)).map(subj => (
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

      <div className="card p-5">
        <div className="font-semibold mb-3">
          Marks {selectedStudent && (
            <span className="text-xs text-neutral-500">
              - {students.find(s => s.uid === selectedStudent)?.displayName || 'Student'}
            </span>
          )}
        </div>
        {rows.length === 0 ? (
          <div className="text-neutral-500">No marks available. Select a student and add subjects.</div>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.subject} className="border-t border-neutral-200/60 dark:border-neutral-800">
                    <td className="py-2 font-medium">{r.subject}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-20 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1"
                        value={r.internal}
                        onChange={(e) => updateRow(idx, 'internal', Number(e.target.value || 0))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-20 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1"
                        value={r.external}
                        onChange={(e) => updateRow(idx, 'external', Number(e.target.value || 0))}
                      />
                    </td>
                    <td className="font-semibold">{r.total}</td>
                    <td className="font-semibold">{r.grade}</td>
                    {r.id && (
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

