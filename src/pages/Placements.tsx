import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

type Drive = {
  id: string;
  company: string;
  role: string;
  date: string;
  ctc: string;
  apply: string;
};

export default function Placements() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrives = async () => {
      try {
        const q = query(collection(db, 'placements'), orderBy('date', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const drivesData: Drive[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            drivesData.push({
              id: doc.id,
              company: data.company || '',
              role: data.role || '',
              date: data.date || '',
              ctc: data.ctc || '',
              apply: data.apply || '#',
            });
          });
          setDrives(drivesData);
          setLoading(false);
        });
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching placements:', error);
        setLoading(false);
      }
    };

    fetchDrives();
  }, []);

  if (loading) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">Loading placements...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold">Placement Drives</div>
        {drives.length === 0 ? (
          <div className="mt-3 text-neutral-500">No placement drives available</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr><th className="py-2">Company</th><th>Role</th><th>Date</th><th>CTC</th><th>Apply</th></tr>
              </thead>
              <tbody>
                {drives.map((d) => (
                  <tr key={d.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                    <td className="py-2">{d.company}</td>
                    <td>{d.role}</td>
                    <td>{d.date}</td>
                    <td>{d.ctc}</td>
                    <td><a href={d.apply} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">Apply</a></td>
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

