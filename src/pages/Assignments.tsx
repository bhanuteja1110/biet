import { useState } from 'react';
import { storage } from '../firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../auth/AuthContext';

const initial = [
  { id: '1', subject: 'Maths', title: 'Series & Sequences', due: '2025-10-20', status: 'Pending', marks: null as number | null },
  { id: '2', subject: 'CSE', title: 'React Hooks', due: '2025-10-22', status: 'Pending', marks: 18 },
  { id: '3', subject: 'Physics', title: 'Fluid Mechanics', due: '2025-10-25', status: 'Completed', marks: 20 },
];

export default function Assignments() {
  const { role } = useAuth();
  const [items] = useState(initial);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const key = `assignments/${Date.now()}-${file.name}`;
      const r = ref(storage, key);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      alert(`Uploaded! URL: ${url}`);
    } finally {
      setUploading(false);
      e.currentTarget.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Assignments</div>
        {role !== 'teacher' && role !== 'admin' ? (
          <label className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 cursor-pointer">
            {uploading ? 'Uploading…' : 'Upload Assignment'}
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        ) : (
          <div className="text-sm text-neutral-500">Viewing student assignments</div>
        )}
      </div>
      <div className="grid gap-3">
        {items.map((a) => (
          <div key={a.id} className="card p-4 grid grid-cols-[1fr,auto,auto] items-center gap-3">
            <div>
              <div className="font-medium">{a.title} — <span className="text-neutral-500">{a.subject}</span></div>
              <div className="text-sm text-neutral-500">Due {a.due}</div>
            </div>
            <div className="text-sm text-neutral-500">{a.marks == null ? 'Marks: —' : `Marks: ${a.marks}/20`}</div>
            <div className={`px-3 py-1 rounded-full text-sm text-center ${a.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{a.status}</div>
          </div>
        ))}
      </div>
      {(role === 'teacher' || role === 'admin') && (
        <div className="text-sm text-neutral-500">Teacher/Admin can review submissions and assign marks. (Demo state only)</div>
      )}
    </div>
  );
}


