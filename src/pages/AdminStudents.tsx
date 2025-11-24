import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';

type Student = { id: string; name: string; email: string; roll: string; dept: string; year: string; classId?: string };

type Class = { id: string; name: string };

export default function AdminStudents() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Fetch all classes
    const classesQuery = query(collection(db, 'classes'));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classesData: Class[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        classesData.push({
          id: doc.id,
          name: data.name || doc.id,
        });
      });
      setClasses(classesData);
    });

    return () => unsubscribeClasses();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setError('');
        // Try query with index first
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        const unsubscribe = onSnapshot(q, 
          (snapshot) => {
            const studentsData: Student[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              studentsData.push({
                id: doc.id,
                name: data.displayName || data.name || '',
                email: data.email || '',
                roll: data.rollNumber || data.roll || '',
                dept: data.department || data.dept || '',
                year: data.year || '',
                classId: data.classId || '',
              });
            });
            setRows(studentsData);
            setLoading(false);
            if (studentsData.length === 0) {
              setError('No students found. Make sure users have role: "student" (lowercase) in Firestore.');
            }
          },
          (err) => {
            console.error('Query error:', err);
            // If query fails (likely index issue), try fetching all and filtering
            if (err.code === 'failed-precondition') {
              setError('Firestore index required. Fetching all users and filtering...');
              fetchAllUsers();
            } else {
              setError(`Error: ${err.message}`);
              setLoading(false);
            }
          }
        );
        return unsubscribe;
      } catch (error: any) {
        console.error('Error fetching students:', error);
        setError(`Error: ${error.message}`);
        setLoading(false);
      }
    };

    // Fallback: fetch all users and filter client-side
    const fetchAllUsers = async () => {
      try {
        const allUsersQuery = query(collection(db, 'users'));
        const snapshot = await getDocs(allUsersQuery);
        const studentsData: Student[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Filter for students client-side
          if (data.role === 'student') {
            studentsData.push({
              id: doc.id,
              name: data.displayName || data.name || '',
              email: data.email || '',
              roll: data.rollNumber || data.roll || '',
              dept: data.department || data.dept || '',
              year: data.year || '',
              classId: data.classId || '',
            });
          }
        });
        setRows(studentsData);
        setLoading(false);
        if (studentsData.length === 0) {
          setError('No students found. Check: 1) User has role: "student" (exact lowercase), 2) User document exists in Firestore users collection');
        } else {
          setError('');
        }
      } catch (err: any) {
        console.error('Error fetching all users:', err);
        setError(`Error: ${err.message}`);
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  async function updateStudentClass(studentId: string, newClassId: string) {
    if (!user) return;

    setSaving(studentId);
    setError('');

    try {
      await updateDoc(doc(db, 'users', studentId), {
        classId: newClassId || null,
        updatedAt: serverTimestamp(),
      });
      setSaving(null);
    } catch (err: any) {
      console.error('Error updating student class:', err);
      setError(`Failed to update: ${err.message}`);
      setSaving(null);
    }
  }

  async function updateStudentField(studentId: string, field: 'name' | 'email' | 'roll' | 'dept' | 'year', value: string) {
    if (!user) return;

    setSaving(studentId);
    setError('');

    try {
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };
      
      if (field === 'name') {
        updateData.displayName = value;
      } else if (field === 'roll') {
        updateData.rollNumber = value;
      } else if (field === 'dept') {
        updateData.department = value;
      } else {
        updateData[field] = value;
      }

      await updateDoc(doc(db, 'users', studentId), updateData);
      setSaving(null);
    } catch (err: any) {
      console.error('Error updating student:', err);
      setError(`Failed to update: ${err.message}`);
      setSaving(null);
    }
  }

  function update(idx: number, key: keyof Student, value: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  }

  if (loading) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold mb-3">Students</div>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-sm">
            {error}
          </div>
        )}

        {rows.length === 0 && !loading ? (
          <div className="text-neutral-500">
            <p>No students found.</p>
            <p className="text-xs mt-2">Troubleshooting:</p>
            <ul className="text-xs list-disc ml-5 mt-1">
              <li>Check Firestore → users collection</li>
              <li>Verify role field is exactly: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">"student"</code> (lowercase, in quotes)</li>
              <li>Check browser console (F12) for errors</li>
            </ul>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Roll</th>
                <th>Dept</th>
                <th>Year</th>
                <th>Class ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                  <td className="py-2">
                    <input 
                      className="w-40 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" 
                      value={r.name} 
                      onChange={(e) => update(idx, 'name', e.target.value)}
                      onBlur={() => updateStudentField(r.id, 'name', r.name)}
                      disabled={saving === r.id}
                    />
                  </td>
                  <td>
                    <input 
                      className="w-56 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" 
                      value={r.email} 
                      onChange={(e) => update(idx, 'email', e.target.value)}
                      onBlur={() => updateStudentField(r.id, 'email', r.email)}
                      disabled={saving === r.id}
                    />
                  </td>
                  <td>
                    <input 
                      className="w-36 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" 
                      value={r.roll} 
                      onChange={(e) => update(idx, 'roll', e.target.value)}
                      onBlur={() => updateStudentField(r.id, 'roll', r.roll)}
                      disabled={saving === r.id}
                    />
                  </td>
                  <td>
                    <input 
                      className="w-24 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" 
                      value={r.dept} 
                      onChange={(e) => update(idx, 'dept', e.target.value)}
                      onBlur={() => updateStudentField(r.id, 'dept', r.dept)}
                      disabled={saving === r.id}
                    />
                  </td>
                  <td>
                    <input 
                      className="w-20 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" 
                      value={r.year} 
                      onChange={(e) => update(idx, 'year', e.target.value)}
                      onBlur={() => updateStudentField(r.id, 'year', r.year)}
                      disabled={saving === r.id}
                    />
                  </td>
                  <td>
                    <select
                      className="w-48 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-sm"
                      value={r.classId || ''}
                      onChange={(e) => {
                        update(idx, 'classId', e.target.value);
                        updateStudentClass(r.id, e.target.value);
                      }}
                      disabled={saving === r.id}
                    >
                      <option value="">No Class Assigned</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {saving === r.id && (
                      <span className="ml-2 text-xs text-neutral-500">Saving...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="card p-5">
          <div className="text-sm text-neutral-500">
            <p className="font-semibold mb-2">Debug Info:</p>
            <p>Found {rows.length} student(s)</p>
            <p className="text-xs mt-2">If students are missing, check:</p>
            <ul className="text-xs list-disc ml-5 mt-1">
              <li>Firestore → users collection</li>
              <li>Role field is exactly: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">"student"</code></li>
              <li>Document ID matches user's uid from Authentication</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

