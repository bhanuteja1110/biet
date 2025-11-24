import { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../auth/AuthContext';
import Loader from '../../components/Loader';
import {
  createAssignment,
  getSubmissionsForAssignment,
  gradeAssignment,
  type Assignment as AssignmentType,
  type AssignmentSubmission
} from '../../utils/firestore';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

type Assignment = {
  id: string;
  subject: string;
  title: string;
  dueDate: Date;
  status: string;
  maxMarks: number;
  description?: string;
};

type Submission = {
  id: string;
  studentName: string;
  fileUrl?: string;
  marks?: number;
  status: string;
  submittedAt: Date;
};

export default function TeacherAssignments() {
  const { user } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    subject: '',
    description: '',
    dueDate: '',
    maxMarks: 20,
  });

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
      setItems([]);
      return;
    }

    // Fetch assignments for the selected department
    // Using department ID as classId for backward compatibility
    const assignmentsQuery = query(
      collection(db, 'assignments'),
      where('classId', '==', selectedDepartment)
    );
    
    const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
      const assignmentsData: Assignment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as AssignmentType;
        assignmentsData.push({
          id: doc.id,
          subject: data.subject || '',
          title: data.title || '',
          dueDate: data.dueDate?.toDate() || new Date(),
          status: data.status || 'active',
          maxMarks: data.maxMarks || 20,
          description: data.description,
        });
      });
      setItems(assignmentsData);
    }, (err) => {
      console.error('Error fetching assignments:', err);
    });

    return () => unsubscribe();
  }, [selectedDepartment]);

  useEffect(() => {
    if (!selectedAssignment) return;

    const q = getSubmissionsForAssignment(selectedAssignment);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const submissionsData: Submission[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as AssignmentSubmission;
        submissionsData.push({
          id: doc.id,
          studentName: data.studentName || '',
          fileUrl: data.fileUrl,
          marks: data.marks,
          status: data.status || 'submitted',
          submittedAt: data.submittedAt?.toDate() || new Date(),
        });
      });
      setSubmissions(submissionsData);
    });
    return () => unsubscribe();
  }, [selectedAssignment]);

  async function handleCreateAssignment() {
    if (!user || !selectedDepartment || !newAssignment.title || !newAssignment.subject || !newAssignment.dueDate) {
      setError('Please fill all required fields and select a department');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Use department ID as classId for backward compatibility
      await createAssignment(
        newAssignment.title,
        newAssignment.subject,
        selectedDepartment,
        new Date(newAssignment.dueDate),
        newAssignment.maxMarks,
        user.uid,
        newAssignment.description
      );
      
      setNewAssignment({
        title: '',
        subject: '',
        description: '',
        dueDate: '',
        maxMarks: 20,
      });
      alert('Assignment created successfully!');
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      setError(err.message || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  }

  async function handleGradeSubmission(submissionId: string, marks: number) {
    if (!user) return;

    setSaving(true);
    try {
      await gradeAssignment(submissionId, marks);
      alert('Marks updated successfully!');
    } catch (err: any) {
      console.error('Error grading assignment:', err);
      setError(err.message || 'Failed to update marks');
    } finally {
      setSaving(false);
    }
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
        <div className="font-semibold mb-4">Create New Assignment</div>
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
          <input
            value={newAssignment.title}
            onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
            placeholder="Assignment Title"
            className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
          <select
            value={newAssignment.subject}
            onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
            className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
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
            <p className="text-xs text-neutral-500 md:col-span-3">Please contact admin to assign subjects.</p>
          )}
          <input
            type="date"
            value={newAssignment.dueDate}
            onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
            className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
          <input
            type="number"
            value={newAssignment.maxMarks}
            onChange={(e) => setNewAssignment({ ...newAssignment, maxMarks: Number(e.target.value) })}
            placeholder="Max Marks"
            className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
          />
          <textarea
            value={newAssignment.description}
            onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            placeholder="Description (optional)"
            className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 md:col-span-2"
            rows={2}
          />
        </div>
        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleCreateAssignment}
          disabled={saving}
          className="mt-4 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Assignment'}
        </button>
      </div>

      <div className="text-lg font-semibold">Your Assignments</div>
      {items.length === 0 ? (
        <div className="text-neutral-500">No assignments created yet</div>
      ) : (
        <div className="grid gap-3">
          {items.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="grid grid-cols-[1fr,auto] items-center gap-3">
                <div>
                  <div className="font-medium">
                    {a.title} — <span className="text-neutral-500">{a.subject}</span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    Due {a.dueDate.toLocaleDateString()}
                  </div>
                  {a.description && (
                    <div className="text-sm text-neutral-500 mt-1">{a.description}</div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedAssignment(selectedAssignment === a.id ? '' : a.id)}
                  className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm"
                >
                  {selectedAssignment === a.id ? 'Hide' : 'View'} Submissions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAssignment && submissions.length > 0 && (
        <div className="card p-5">
          <div className="font-semibold mb-4">Submissions</div>
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <div>
                  <div className="font-medium">{sub.studentName}</div>
                  <div className="text-sm text-neutral-500">
                    Submitted {sub.submittedAt.toLocaleDateString()}
                  </div>
                  {sub.fileUrl && (
                    <a
                      href={sub.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 inline-block"
                    >
                      View Submission
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    defaultValue={sub.marks || 0}
                    max={items.find(a => a.id === selectedAssignment)?.maxMarks || 20}
                    onBlur={(e) => {
                      const marks = Number(e.target.value);
                      if (marks !== sub.marks) {
                        handleGradeSubmission(sub.id, marks);
                      }
                    }}
                    className="w-20 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1"
                    placeholder="Marks"
                  />
                  <span className="text-sm text-neutral-500">
                    /{items.find(a => a.id === selectedAssignment)?.maxMarks || 20}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

