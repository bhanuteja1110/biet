import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';
import { getExamsForClass, createExam, getUserProfile, type Exam } from '../utils/firestore';
import { onSnapshot, Timestamp } from 'firebase/firestore';

export default function Exams() {
  const { role, user } = useAuth();
  const [schedule, setSchedule] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classId, setClassId] = useState<string>('');
  const [error, setError] = useState('');

  const [newExam, setNewExam] = useState({
    subject: '',
    date: '',
    time: '10:00 - 01:00',
  });

  const subjectsList = ['Maths', 'CSE', 'Physics', 'Chemistry', 'Electronics', 'English'];

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile?.classId) {
          setClassId(userProfile.classId);
        }
      } catch (error) {
        console.error('Error fetching user class:', error);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!classId) return;

    const q = getExamsForClass(classId);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examsData: Exam[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        examsData.push({
          id: doc.id,
          subject: data.subject || '',
          date: data.date as Timestamp,
          time: data.time || '',
          classId: data.classId,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
        });
      });
      setSchedule(examsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classId]);

  const editable = role === 'teacher' || role === 'admin';

  async function handleAddExam() {
    if (!user || !newExam.subject || !newExam.date) {
      setError('Please fill all fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createExam(
        newExam.subject,
        new Date(newExam.date),
        newExam.time,
        user.uid,
        classId
      );
      setNewExam({ subject: '', date: '', time: '10:00 - 01:00' });
      alert('Exam added successfully!');
    } catch (err: any) {
      console.error('Error creating exam:', err);
      setError(err.message || 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">Loading exams...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {editable && (
        <div className="card p-5">
          <div className="font-semibold mb-4">Add New Exam</div>
          <div className="grid gap-4 md:grid-cols-3">
            <select
              value={newExam.subject}
              onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })}
              className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            >
              <option value="">Select Subject</option>
              {subjectsList.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
            <input
              type="date"
              value={newExam.date}
              onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
              className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
            />
            <div className="flex gap-2">
              <input
                value={newExam.time}
                onChange={(e) => setNewExam({ ...newExam, time: e.target.value })}
                placeholder="Time"
                className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />
              <button
                onClick={handleAddExam}
                disabled={saving || !newExam.subject || !newExam.date}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-3 p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="card p-5">
        <div className="font-semibold mb-3">Exam Time Table</div>
        {schedule.length === 0 ? (
          <div className="text-neutral-500">No exams scheduled</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Time</th>
                  <th>Subject</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                    <td className="py-2">
                      {r.date instanceof Timestamp ? r.date.toDate().toLocaleDateString() : String(r.date)}
                    </td>
                    <td>{r.time}</td>
                    <td>{r.subject}</td>
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
