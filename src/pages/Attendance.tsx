import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '../auth/AuthContext';
import { useMemo, useState } from 'react';

const subjects = [
  { name: 'Maths', percent: 82 },
  { name: 'Physics', percent: 74 },
  { name: 'Chemistry', percent: 59 },
  { name: 'CSE', percent: 91 },
  { name: 'Electronics', percent: 67 },
];

function colorFor(p: number) {
  if (p > 75) return '#10b981';
  if (p >= 60) return '#f59e0b';
  return '#ef4444';
}

type Student = { id: string; name: string; present: boolean };

const rosterSeed: Student[] = [
  { id: 'S1', name: 'Aarav Sharma', present: true },
  { id: 'S2', name: 'Isha Patel', present: false },
  { id: 'S3', name: 'Rohit Verma', present: true },
  { id: 'S4', name: 'Neha Gupta', present: true },
  { id: 'S5', name: 'Vikram Rao', present: false },
];

export default function Attendance() {
  const { role } = useAuth();
  const [roster, setRoster] = useState<Student[]>(rosterSeed);
  const summary = useMemo(() => {
    const total = roster.length;
    const present = roster.filter(s => s.present).length;
    return { total, present, percent: Math.round((present / Math.max(1, total)) * 100) };
  }, [roster]);

  if (role === 'teacher' || role === 'admin') {
    return (
      <div className="space-y-4">
        <div className="card p-5">
          <div className="font-semibold">Mark Attendance</div>
          <div className="text-sm text-neutral-500 mt-1">Present: {summary.present}/{summary.total} ({summary.percent}%)</div>
          <div className="mt-3 grid gap-2">
            {roster.map((s, idx) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2">
                <div className="font-medium text-sm">{s.name}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setRoster(r => r.map((x,i)=> i===idx?{...x, present:false}:x))} className={`px-3 py-1 rounded-lg ${!s.present ? 'bg-rose-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>Absent</button>
                  <button onClick={() => setRoster(r => r.map((x,i)=> i===idx?{...x, present:true}:x))} className={`px-3 py-1 rounded-lg ${s.present ? 'bg-emerald-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}>Present</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-neutral-500">Changes are local for demo. Hook up to Firestore to persist.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-5">
        <div className="font-semibold">Subject-wise Attendance</div>
        <ul className="mt-4 space-y-2 text-sm">
          {subjects.map((s) => (
            <li key={s.name} className="flex items-center justify-between rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2">
              <span>{s.name}</span>
              <span style={{ color: colorFor(s.percent) }}>{s.percent}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-5">
        <div className="font-semibold">Weekly Trend</div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjects}>
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="percent" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card p-5 md:col-span-2">
        <div className="font-semibold">Club Attendance</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { club: 'Coding Club', percent: 88 },
            { club: 'Robotics', percent: 72 },
            { club: 'Literary', percent: 64 },
          ].map((c) => (
            <div key={c.club} className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4 flex items-center justify-between">
              <div className="font-medium">{c.club}</div>
              <div className="text-sm" style={{ color: colorFor(c.percent) }}>{c.percent}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


