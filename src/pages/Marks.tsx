import { useAuth } from '../auth/AuthContext';
import { useState } from 'react';

const dataSeed = [
  { subject: 'Maths', internal: 24, external: 68, total: 92, grade: 'A+' },
  { subject: 'CSE', internal: 22, external: 60, total: 82, grade: 'A' },
  { subject: 'Physics', internal: 18, external: 52, total: 70, grade: 'B+' },
  { subject: 'Chemistry', internal: 20, external: 48, total: 68, grade: 'B' },
];

export default function Marks() {
  const { role } = useAuth();
  const [rows, setRows] = useState(dataSeed);

  const editable = role === 'teacher' || role === 'admin';

  function updateRow(idx: number, key: 'internal' | 'external', value: number) {
    setRows(r => {
      const next = [...r];
      const row = { ...next[idx] } as any;
      row[key] = value;
      row.total = row.internal + row.external;
      next[idx] = row;
      return next;
    });
  }

  return (
    <div className="card p-5">
      <div className="font-semibold mb-3">Marks {editable && <span className="text-xs text-neutral-500">(editable)</span>}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr>
              <th className="py-2">Subject</th>
              <th>Internal</th>
              <th>External</th>
              <th>Total</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.subject} className="border-t border-neutral-200/60 dark:border-neutral-800">
                <td className="py-2">{r.subject}</td>
                <td>
                  {editable ? (
                    <input type="number" className="w-20 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.internal} onChange={(e)=>updateRow(idx,'internal', Number(e.target.value||0))} />
                  ) : (
                    r.internal
                  )}
                </td>
                <td>
                  {editable ? (
                    <input type="number" className="w-20 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.external} onChange={(e)=>updateRow(idx,'external', Number(e.target.value||0))} />
                  ) : (
                    r.external
                  )}
                </td>
                <td>{r.total}</td>
                <td>{r.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {editable && <div className="mt-3 text-sm text-neutral-500">Changes are local for demo. Hook up to Firestore to persist.</div>}
      </div>
    </div>
  );
}


