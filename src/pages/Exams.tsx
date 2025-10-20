import { useAuth } from '../auth/AuthContext';
import { useState } from 'react';

const scheduleSeed = [
  { date: '2025-11-10', time: '10:00 - 01:00', subject: 'Mathematics' },
  { date: '2025-11-12', time: '10:00 - 01:00', subject: 'CSE' },
  { date: '2025-11-15', time: '10:00 - 01:00', subject: 'Physics' },
];

export default function Exams() {
  const { role } = useAuth();
  const [schedule, setSchedule] = useState(scheduleSeed);
  const editable = role === 'teacher' || role === 'admin';

  function update(idx: number, key: 'date' | 'time' | 'subject', value: string) {
    setSchedule(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  }

  function addRow() {
    setSchedule(prev => [...prev, { date: '2025-12-01', time: '10:00 - 01:00', subject: 'New Subject' }]);
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Exam Time Table {editable && <span className="text-xs text-neutral-500">(editable)</span>}</div>
          {editable && <button onClick={addRow} className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm">Add Exam</button>}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr><th className="py-2">Date</th><th>Time</th><th>Subject</th></tr>
            </thead>
            <tbody>
              {schedule.map((r, idx) => (
                <tr key={idx} className="border-t border-neutral-200/60 dark:border-neutral-800">
                  <td className="py-2">
                    {editable ? (
                      <input className="w-36 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.date} onChange={(e)=>update(idx,'date', e.target.value)} />
                    ) : r.date}
                  </td>
                  <td>
                    {editable ? (
                      <input className="w-36 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.time} onChange={(e)=>update(idx,'time', e.target.value)} />
                    ) : r.time}
                  </td>
                  <td>
                    {editable ? (
                      <input className="w-48 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.subject} onChange={(e)=>update(idx,'subject', e.target.value)} />
                    ) : r.subject}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {editable && <div className="mt-3 text-sm text-neutral-500">Changes are local for demo. Hook up to Firestore to persist.</div>}
        </div>
      </div>
    </div>
  );
}


