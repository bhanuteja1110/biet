import { useAuth } from '../../auth/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { markAttendance } from '../../utils/firestore';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import Loader from '../../components/Loader';

type Student = { id: string; name: string; present: boolean; rollNumber?: string; department?: string };

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [roster, setRoster] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const rosterRef = useRef<Student[]>([]);

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
      setRoster([]);
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
        
        const students: Student[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const studentDept = data.department || data.dept || '';
          
          // Match student's department with selected department (by ID or name)
          if (studentDept === selectedDepartment || studentDept === deptName) {
            students.push({
              id: doc.id,
              name: data.displayName || data.name || data.email || '',
              rollNumber: data.rollNumber || data.roll,
              department: studentDept,
              present: false,
            });
          }
        });

        rosterRef.current = students;
        // Initialize all as absent first
        setRoster(students.map(s => ({ ...s, present: false })));
        
        // Fetch existing attendance if subject and date are already selected
        if (selectedSubject && selectedDate && students.length > 0) {
          fetchExistingAttendanceForRoster(students, selectedDepartment, selectedSubject, selectedDate);
        }
        
        if (students.length === 0) {
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

  // Helper function to fetch existing attendance
  const fetchExistingAttendanceForRoster = async (
    studentsList: Student[],
    deptId: string,
    subject: string,
    date: string
  ) => {
    try {
      // Fetch attendance records for this date, subject, and classId (department)
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('classId', '==', deptId),
        where('subject', '==', subject),
        where('date', '==', date)
      );

      const snapshot = await getDocs(attendanceQuery);
      const attendanceMap = new Map<string, boolean>();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        attendanceMap.set(data.studentId, data.present === true);
      });

      // Update roster with existing attendance data
      const updatedRoster = studentsList.map(student => ({
        ...student,
        present: attendanceMap.get(student.id) || false,
      }));
      
      rosterRef.current = updatedRoster;
      setRoster(updatedRoster);
    } catch (err: any) {
      console.error('Error fetching existing attendance:', err);
      // If query fails, just set all as absent
      const updatedRoster = studentsList.map(s => ({ ...s, present: false }));
      rosterRef.current = updatedRoster;
      setRoster(updatedRoster);
    }
  };

  // Fetch existing attendance when date/subject changes (but department/roster is already loaded)
  useEffect(() => {
    if (!selectedDepartment || !selectedSubject || !selectedDate) {
      // Reset roster to all absent when filters are cleared
      if (rosterRef.current.length > 0 && (!selectedSubject || !selectedDate)) {
        const resetRoster = rosterRef.current.map(s => ({ ...s, present: false }));
        rosterRef.current = resetRoster;
        setRoster(resetRoster);
      }
      return;
    }

    // Use ref to avoid dependency on roster state
    if (rosterRef.current.length > 0) {
      fetchExistingAttendanceForRoster(rosterRef.current, selectedDepartment, selectedSubject, selectedDate);
    }
  }, [selectedSubject, selectedDate]);

  const summary = {
    total: roster.length,
    present: roster.filter(s => s.present).length,
    percent: roster.length > 0 ? Math.round((roster.filter(s => s.present).length / roster.length) * 100) : 0
  };

  async function handleSaveAttendance() {
    if (!user || !selectedDepartment || !selectedSubject) {
      setError('Please select a department and subject');
      return;
    }

    if (roster.length === 0) {
      setError('No students in selected department');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Validate student IDs
      const records = roster.map(s => {
        if (!s.id) {
          throw new Error(`Student ${s.name} has no ID. Please refresh the page.`);
        }
        return {
          studentId: s.id, // This should be the document ID (uid) from users collection
          studentName: s.name,
          present: s.present,
          subject: selectedSubject,
        };
      });

      console.log('Marking attendance:', {
        department: selectedDepartment,
        date: selectedDate,
        subject: selectedSubject,
        recordsCount: records.length,
        teacherId: user.uid,
        sampleRecord: records[0] // Log first record for debugging
      });

      // Use department ID as classId for backward compatibility with attendance records
      await markAttendance(selectedDepartment, selectedDate, records, user.uid);
      
      console.log('✅ Attendance marked successfully in Firestore');
      
      setRoster(prev => prev.map(s => ({ ...s, present: false })));
      setError('');
      setSuccess(`Attendance marked successfully for ${records.length} students!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('❌ Error marking attendance:', err);
      const errorMessage = err.message || 'Failed to mark attendance. Check console for details.';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  }

  function toggleStudentPresence(idx: number, present: boolean) {
    setRoster(prev => {
      const updated = prev.map((s, i) => i === idx ? { ...s, present } : s);
      rosterRef.current = updated;
      return updated;
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
        <div className="font-semibold mb-4">Mark Attendance</div>
        
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              disabled={teacherSubjects.length === 0}
            >
              <option value="">Select Subject</option>
              {teacherSubjects.length > 0 ? (
                teacherSubjects.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))
              ) : (
                <option value="" disabled>No subjects assigned</option>
              )}
            </select>
            {teacherSubjects.length === 0 && (
              <p className="text-xs text-neutral-500 mt-1">Please contact admin to assign subjects.</p>
            )}
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
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-sm">
            {success}
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
              disabled={saving || !selectedSubject || !selectedDepartment || roster.length === 0}
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

