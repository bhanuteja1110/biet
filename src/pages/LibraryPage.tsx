import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

type Book = {
  id: string;
  title: string;
  author: string;
  status: string;
  due: string;
};

export default function LibraryPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchBooks = async () => {
      try {
        const q = query(collection(db, 'library'), where('studentId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const booksData: Book[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            booksData.push({
              id: doc.id,
              title: data.title || '',
              author: data.author || '',
              status: data.status || 'Available',
              due: data.due || '—',
            });
          });
          setBooks(booksData);
          setLoading(false);
        });
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching books:', error);
        setLoading(false);
      }
    };

    fetchBooks();
  }, [user]);

  if (loading) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">Loading library...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold mb-3">Library</div>
        {books.length === 0 ? (
          <div className="text-neutral-500">No books issued</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr><th className="py-2">Book</th><th>Author</th><th>Status</th><th>Due</th></tr>
              </thead>
              <tbody>
                {books.map(b => (
                  <tr key={b.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                    <td className="py-2">{b.title}</td>
                    <td>{b.author}</td>
                    <td>{b.status}</td>
                    <td>{b.due}</td>
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

