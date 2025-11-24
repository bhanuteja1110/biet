import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  getAssignmentsForClass,
  createAssignment,
  getSubmissionsForAssignment,
  gradeAssignment
} from '../../utils/firestore';
import { onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import Loader from '../../components/Loader';

type Assignment = {
  id: string;
  subject: string;
  title: string;
  dueDate: Date;
  status: string;
  maxMarks: number;
  description?: string;
  classId: string;
};

type Submission = {
  id: string;
  studentName: string;
  fileUrl?: string;
  marks?: number;
  status: string;
  submittedAt: Date;
};

type Class = { id: string; name: string };

export default function AdminAssignments() {
  const { user } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
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

  const subjectsList = ['Maths', 'CSE', 'Physics', 'Chemistry', 'Electronics', 'English'];

  useEffect(() => {
    // Fetch all departments (replacing classes)
    const departmentsQuery = query(collection(db, 'departments'));
    const unsubscribeDepartments = onSnapshot(departmentsQuery, (snapshot) => {
      const classesData: Class[] = [];
      snapshot.forEach((doc) => {
        classesData.push({
          id: doc.id,
          name: doc.data().name || doc.id,
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
    if (!selectedClass) return;

    const q = getAssignmentsForClass(selectedClass);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assignmentsData: Assignment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        assignmentsData.push({
          id: doc.id,
          subject: data.subject || '',
          title: data.title || '',
          dueDate: data.dueDate?.toDate() || new Date(),
          status: data.status || 'active',
          maxMarks: data.maxMarks || 20,
          description: data.description,
          classId: selectedClass,
        });
      });
      setItems(assignmentsData);
    });
    return () => unsubscribe();
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedAssignment) return;

    const q = getSubmissionsForAssignment(selectedAssignment);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const submissionsData: Submission[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
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
    if (!user || !selectedClass || !newAssignment.title || !newAssignment.subject || !newAssignment.dueDate) {
      setError('Please fill all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createAssignment(
        newAssignment.title,
        newAssignment.subject,
        selectedClass,
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

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold mb-4">Create New Assignment (Admin)</div>
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
            className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 md:col-span-3"
            rows={2}
          />
        </div>
        {error && (
          <div className="mb-3 p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleCreateAssignment}
          disabled={saving || !selectedClass}
          className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Assignment'}
        </button>
      </div>

      {selectedClass && (
        <>
          <div className="text-lg font-semibold">Assignments for {classes.find(c => c.id === selectedClass)?.name}</div>
          {items.length === 0 ? (
            <div className="text-neutral-500">No assignments for this class</div>
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
        </>
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

