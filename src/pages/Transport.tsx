import { useAuth } from '../auth/AuthContext';
import { useState } from 'react';

const seed = [
  { route: 'R1', origin: 'Kompally', time: '07:15', stops: ['Suchitra', 'Bollaram', 'Patancheru'] },
  { route: 'R2', origin: 'Kukatpally', time: '07:20', stops: ['JNTU', 'Miyapur', 'BHEL'] },
  { route: 'R3', origin: 'LB Nagar', time: '07:10', stops: ['Dilshuknagar', 'Kothapet', 'Chaderghat'] },
];

export default function Transport() {
  const { role } = useAuth();
  const [routes, setRoutes] = useState(seed);
  const editable = role === 'admin';

  function update(idx: number, key: 'origin' | 'time', value: string) {
    setRoutes(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold">College Bus Routes {editable && <span className="text-xs text-neutral-500">(admin editable)</span>}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((r, idx) => (
            <div key={r.route} className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4 space-y-1">
              <div className="font-medium">{r.route}</div>
              <div className="text-sm">
                Origin: {editable ? (
                  <input className="ml-2 w-40 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.origin} onChange={(e)=>update(idx,'origin', e.target.value)} />
                ) : r.origin}
              </div>
              <div className="text-sm">
                Departure: {editable ? (
                  <input className="ml-2 w-28 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" value={r.time} onChange={(e)=>update(idx,'time', e.target.value)} />
                ) : r.time}
              </div>
              <div className="mt-2 text-sm">Stops: {r.stops.join(', ')}</div>
            </div>
          ))}
        </div>
        {editable && <div className="mt-3 text-sm text-neutral-500">Changes are local for demo. Hook up to Firestore to persist.</div>}
      </div>
    </div>
  );
}


