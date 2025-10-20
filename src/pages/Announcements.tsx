import { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { useAuth } from '../auth/AuthContext';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';

type Announcement = {
  id: string;
  title: string;
  message: string;
  createdAt?: any;
};

export default function Announcements() {
  const { role } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const next: Announcement[] = [];
      snap.forEach((d) => next.push({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }));
      setItems(next);
    });
    return () => unsub();
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        message: message.trim(),
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setMessage('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold">Announcements</div>
        {(role === 'teacher' || role === 'admin') ? (
          <form onSubmit={onAdd} className="mt-4 grid gap-3 md:grid-cols-[1fr,1fr,auto]">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
            <button disabled={loading} className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">{loading ? 'Posting…' : 'Post'}</button>
          </form>
        ) : (
          <div className="mt-2 text-sm text-neutral-500">Only teachers and admins can post announcements.</div>
        )}
      </div>

      <div className="grid gap-3">
        {items.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="font-medium">{a.title}</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{a.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


