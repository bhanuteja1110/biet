import { useState } from 'react';

type Student = { id: string; name: string; email: string; roll: string; dept: string; year: string };
const seed: Student[] = [
  { id: 'S1', name: 'Aarav Sharma', email: 'aarav@biet.ac.in', roll: '25E11A1201', dept: 'IT', year: '1st' },
  { id: 'S2', name: 'Isha Patel', email: 'isha@biet.ac.in', roll: '25E11A1202', dept: 'CSE', year: '1st' },
];

export default function AdminStudents() {
  const [rows, setRows] = useState(seed);

  function update(idx: number, key: keyof Student, value: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  }

  return (
    <div className="card p-5">
      <div className="font-semibold mb-3">Students</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr><th className="py-2">Name</th><th>Email</th><th>Roll</th><th>Dept</th><th>Year</th></tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id} className="border-top border-neutral-200/60 dark:border-neutral-800">
                <td className="py-2"><input className="w-40 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.name} onChange={(e)=>update(idx,'name', e.target.value)} /></td>
                <td><input className="w-56 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.email} onChange={(e)=>update(idx,'email', e.target.value)} /></td>
                <td><input className="w-36 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.roll} onChange={(e)=>update(idx,'roll', e.target.value)} /></td>
                <td><input className="w-24 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.dept} onChange={(e)=>update(idx,'dept', e.target.value)} /></td>
                <td><input className="w-20 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.year} onChange={(e)=>update(idx,'year', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-sm text-neutral-500">Changes are local for demo. Hook up to Firestore to persist.</div>
      </div>
    </div>
  );
}


