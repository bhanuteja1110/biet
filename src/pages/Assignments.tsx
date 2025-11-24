import { useState, useEffect } from 'react';
import { storage } from '../firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../auth/AuthContext';
import {
  getAssignmentsForStudent,
  getAssignmentsForClass,
  createAssignment,
  submitAssignment,
  getSubmissionsForAssignment,
  gradeAssignment,
  getUserProfile,
  type Assignment as AssignmentType,
  type AssignmentSubmission
} from '../utils/firestore';
import { onSnapshot } from 'firebase/firestore';
import Loader from '../components/Loader';

type Assignment = {
  id: string;
  subject: string;
  title: string;
  dueDate: Date;
  status: string;
  marks: number | null;
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

export default function Assignments() {
  const { role, user } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classId, setClassId] = useState<string>('');
  const [error, setError] = useState('');

  // Create assignment form
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    subject: '',
    description: '',
    dueDate: '',
    maxMarks: 20,
  });

  const subjectsList = ['Maths', 'CSE', 'Physics', 'Chemistry', 'Electronics', 'English'];

  useEffect(() => {
    if (!user) return;

    const fetchUserDepartment = async () => {
      try {
        const userProfile = await getUserProfile(user.uid);
        // Use department field (which is the department ID) as classId for querying assignments
        // Assignments are stored with classId = department ID
        const departmentId = userProfile?.department || userProfile?.classId;
        if (departmentId) {
          setClassId(departmentId);
          console.log('Student department/classId:', departmentId);
        } else {
          console.warn('No department found for student');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user department:', error);
        setLoading(false);
      }
    };

    fetchUserDepartment();
  }, [user]);

  useEffect(() => {
    if (!user || !classId) {
      if (!classId && user) {
        // If no classId but user exists, stop loading
        setLoading(false);
      }
      return;
    }

    if (role === 'teacher' || role === 'admin') {
      // Fetch assignments for class
      const q = getAssignmentsForClass(classId);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const assignmentsData: Assignment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as AssignmentType;
          assignmentsData.push({
            id: doc.id,
            subject: data.subject || '',
            title: data.title || '',
            dueDate: data.dueDate?.toDate() || new Date(),
            status: data.status || 'active',
            marks: null,
            maxMarks: data.maxMarks || 20,
            description: data.description,
          });
        });
        setItems(assignmentsData);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Fetch assignments for student using department ID (stored as classId in assignments)
      console.log('Fetching assignments for student with classId/department:', classId);
      const q = getAssignmentsForStudent(user.uid, classId);
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log(`Found ${snapshot.docs.length} assignments for student`);
        const assignmentsData: Assignment[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as AssignmentType;
          
          // Get submission for this assignment
          const { getSubmissionsForStudent } = await import('../utils/firestore');
          const submissionQuery = getSubmissionsForStudent(user.uid);
          const { getDocs } = await import('firebase/firestore');
          const submissionSnapshot = await getDocs(submissionQuery);
          
          let submission: AssignmentSubmission | null = null;
          submissionSnapshot.forEach((subDoc) => {
            const subData = subDoc.data();
            if ((subData as any).assignmentId === docSnap.id) {
              submission = { 
                id: subDoc.id, 
                assignmentId: (subData as any).assignmentId || '',
                studentId: (subData as any).studentId || '',
                studentName: (subData as any).studentName || '',
                marks: (subData as any).marks,
                status: (subData as any).status || 'submitted',
                submittedAt: (subData as any).submittedAt,
                fileUrl: (subData as any).fileUrl,
              };
            }
          });

          const submissionMarks: number | null = submission ? ((submission as AssignmentSubmission).marks ?? null) : null;

          assignmentsData.push({
            id: docSnap.id,
            subject: data.subject || '',
            title: data.title || '',
            dueDate: data.dueDate?.toDate() || new Date(),
            status: submission ? 'Completed' : 'Pending',
            marks: submissionMarks,
            maxMarks: data.maxMarks || 20,
            description: data.description,
          });
        }
        
        setItems(assignmentsData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching assignments:', error);
        setError('Failed to load assignments. Please check your department assignment.');
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user, role, classId]);

  useEffect(() => {
    if (!selectedAssignment || role !== 'teacher' && role !== 'admin') return;

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
  }, [selectedAssignment, role]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, assignmentId: string) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploading(true);
    setError('');

    try {
      const key = `assignments/${user.uid}/${Date.now()}-${file.name}`;
      const r = ref(storage, key);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);

      await submitAssignment(assignmentId, user.uid, user.displayName || user.email || 'Student', url);
      alert('Assignment submitted successfully!');
    } catch (err: any) {
      console.error('Error uploading assignment:', err);
      setError(err.message || 'Failed to submit assignment');
    } finally {
      setUploading(false);
      e.currentTarget.value = '';
    }
  }

  async function handleCreateAssignment() {
    if (!user || !classId || !newAssignment.title || !newAssignment.subject || !newAssignment.dueDate) {
      setError('Please fill all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createAssignment(
        newAssignment.title,
        newAssignment.subject,
        classId,
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
      <div className="card p-5 flex items-center justify-center min-h-[200px]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Assignments</div>
        {role !== 'teacher' && role !== 'admin' && (
          <div className="text-sm text-neutral-500">Submit your assignments here</div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {(role === 'teacher' || role === 'admin') && (
        <div className="card p-5">
          <div className="font-semibold mb-4">Create New Assignment</div>
          <div className="grid gap-4 md:grid-cols-2">
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
            >
              <option value="">Select Subject</option>
              {subjectsList.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
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
      )}

      {items.length === 0 ? (
        <div className="text-neutral-500">No assignments available</div>
      ) : (
        <div className="grid gap-3">
          {items.map((a) => {
            const isOverdue = a.dueDate < new Date() && a.status === 'Pending';
            return (
              <div key={a.id} className="card p-4">
                <div className="grid grid-cols-[1fr,auto,auto] items-center gap-3">
                  <div>
                    <div className="font-medium">
                      {a.title} — <span className="text-neutral-500">{a.subject}</span>
                    </div>
                    <div className="text-sm text-neutral-500">
                      Due {a.dueDate.toLocaleDateString()} {isOverdue && <span className="text-rose-600">(Overdue)</span>}
                    </div>
                    {a.description && (
                      <div className="text-sm text-neutral-500 mt-1">{a.description}</div>
                    )}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {a.marks == null ? 'Marks: —' : `Marks: ${a.marks}/${a.maxMarks}`}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm text-center ${
                    a.status === 'Completed' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' 
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}>
                    {a.status}
                  </div>
                </div>
                
                {role !== 'teacher' && role !== 'admin' && a.status === 'Pending' && (
                  <div className="mt-3">
                    <label className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 cursor-pointer inline-block">
                      {uploading ? 'Uploading…' : 'Submit Assignment'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleUpload(e, a.id)}
                        accept=".pdf,.doc,.docx"
                      />
                    </label>
                  </div>
                )}

                {(role === 'teacher' || role === 'admin') && (
                  <div className="mt-3">
                    <button
                      onClick={() => setSelectedAssignment(selectedAssignment === a.id ? '' : a.id)}
                      className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm"
                    >
                      {selectedAssignment === a.id ? 'Hide' : 'View'} Submissions
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
