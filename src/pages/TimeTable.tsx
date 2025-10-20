import { useAuth } from '../auth/AuthContext';
import { useState } from 'react';

const rowsSeed = [
  { day: 'Mon', slots: ['Maths', 'CSE', 'Physics', 'Library'] },
  { day: 'Tue', slots: ['Chemistry', 'CSE Lab', 'Electronics', 'Sports'] },
  { day: 'Wed', slots: ['CSE', 'Maths', 'English', 'Workshop'] },
  { day: 'Thu', slots: ['Physics', 'CSE', 'Library', 'Seminar'] },
  { day: 'Fri', slots: ['CSE', 'Chemistry', 'Electronics', 'Club'] },
];

export default function TimeTable() {
  const { role } = useAuth();
  const [rows, setRows] = useState(rowsSeed);
  const editable = role === 'teacher' || role === 'admin';

  function updateCell(dayIdx: number, slotIdx: number, value: string) {
    setRows(prev => {
      const next = prev.map(r => ({ ...r, slots: [...r.slots] }));
      next[dayIdx].slots[slotIdx] = value;
      return next;
    });
  }

  return (
    <div className="card p-5">
      <div className="font-semibold mb-3">Time Table {editable && <span className="text-xs text-neutral-500">(editable)</span>}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr>
              <th className="py-2">Day</th>
              <th>Period 1</th>
              <th>Period 2</th>
              <th>Period 3</th>
              <th>Period 4</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, dayIdx) => (
              <tr key={r.day} className="border-t border-neutral-200/60 dark:border-neutral-800">
                <td className="py-2 font-medium">{r.day}</td>
                {r.slots.map((s, slotIdx) => (
                  <td key={slotIdx}>
                    {editable ? (
                      <input className="w-32 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={s} onChange={(e)=>updateCell(dayIdx, slotIdx, e.target.value)} />
                    ) : (
                      s
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && <div className="mt-3 text-sm text-neutral-500">Changes are local for demo. Hook up to Firestore to persist.</div>}
      </div>
    </div>
  );
}


