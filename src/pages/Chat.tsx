import { useEffect, useRef, useState } from 'react';
import { db } from '../firebase/firebase';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';

type Message = {
  id: string;
  uid: string;
  name: string;
  text: string;
  createdAt?: any;
};

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const next: Message[] = [];
      snap.forEach((d) => next.push({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }));
      setMessages(next);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    });
    return () => unsub();
  }, []);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        uid: user?.uid ?? 'anon',
        name: user?.displayName ?? 'Student',
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-rows-[1fr,auto] h-[70vh] card p-0 overflow-hidden">
      <div className="overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.uid === user?.uid ? 'ml-auto bg-indigo-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
            <div className="text-xs opacity-70">{m.name}</div>
            <div className="text-sm">{m.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={onSend} className="p-3 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
        <button disabled={sending} className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">Send</button>
      </form>
    </div>
  );
}

