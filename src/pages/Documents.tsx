import { useEffect, useState } from 'react';
import { storage, db } from '../firebase/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';

type DocItem = {
  id: string;
  name: string;
  url: string;
  type: 'id-card' | 'certificate' | 'other';
  createdAt?: any;
};

export default function Documents() {
  const { user } = useAuth();
  const [items, setItems] = useState<DocItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocItem['type']>('certificate');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/documents`), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const next: DocItem[] = [];
      snap.forEach((d) => next.push({ id: d.id, ...(d.data() as Omit<DocItem, 'id'>) }));
      setItems(next);
    });
    return () => unsub();
  }, [user]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!user || !file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload PDF files only');
      return;
    }
    setUploading(true);
    try {
      const key = `documents/${user.uid}/${Date.now()}-${file.name}`;
      const r = ref(storage, key);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await addDoc(collection(db, `users/${user.uid}/documents`), {
        name: file.name,
        url,
        type: docType,
        storagePath: key,
        createdAt: serverTimestamp(),
      });
    } finally {
      setUploading(false);
      e.currentTarget.value = '';
    }
  }

  async function onDelete(item: DocItem & { storagePath?: string }) {
    if (!user) return;
    const ok = confirm(`Delete ${item.name}?`);
    if (!ok) return;
    const storagePath = (item as any).storagePath as string | undefined;
    if (storagePath) await deleteObject(ref(storage, storagePath));
    await deleteDoc(doc(db, `users/${user.uid}/documents/${item.id}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Documents</div>
        <div className="flex items-center gap-2">
          <select className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" value={docType} onChange={(e) => setDocType(e.target.value as any)}>
            <option value="id-card">ID Card</option>
            <option value="certificate">Certificate</option>
            <option value="other">Other</option>
          </select>
          <label className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 cursor-pointer">
            {uploading ? 'Uploading…' : 'Upload PDF'}
            <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} />
          </label>
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((d) => (
          <div key={d.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{d.name}</div>
              <div className="text-sm text-neutral-500">{d.type.toUpperCase()}</div>
            </div>
            <div className="flex items-center gap-2">
              <a href={d.url} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">View</a>
              <button onClick={() => onDelete(d as any)} className="px-3 py-1 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card p-4 text-neutral-500">No documents uploaded yet.</div>
        )}
      </div>
    </div>
  );
}

