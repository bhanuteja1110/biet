import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { initializeFirestore } from '../../utils/initFirestore';

export default function Initialize() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const addStatus = (message: string) => {
    setStatus(prev => [...prev, message]);
  };

  async function handleInitialize() {
    if (!user) {
      setError('Please login first');
      return;
    }

    if (role !== 'admin') {
      setError('Only admins can initialize the database. Please set your role to "admin" in Firestore users collection.');
      return;
    }

    setLoading(true);
    setError('');
    setStatus(['Initializing...']);

    try {
      addStatus('Step 1: Setting user as admin...');
      const result = await initializeFirestore();
      if (result) {
        addStatus('✅ Initialization Complete!');
        addStatus('');
        addStatus('Created:');
        addStatus('✓ User profile set as admin');
        addStatus('✓ Sample class created');
        addStatus('✓ Initial collections ready');
        addStatus('');
        addStatus('Next Steps:');
        addStatus('1. Create more users in Firebase Console → Authentication');
        addStatus('2. Set user roles in Firestore → users collection');
        addStatus('3. Set classId for students and teachers');
        addStatus('');
        addStatus('Note: Some optional items (timetable, transport routes) may need');
        addStatus('additional permissions. You can create them manually if needed.');
      } else {
        setError('Initialization failed. Check console for details.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initialize database';
      setError(errorMessage);
      addStatus(`❌ Error: ${errorMessage}`);
      console.error('Initialization Error:', err);
      
      // Show helpful message for permission errors
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        addStatus('');
        addStatus('💡 Solution:');
        addStatus('1. Go to Firebase Console → Firestore → Rules');
        addStatus('2. Copy content from firestore.rules file');
        addStatus('3. Paste and click Publish');
        addStatus('4. Try again');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">Please login first</div>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="card p-5">
        <div className="text-rose-600 mb-3">
          ⚠️ Only admins can initialize the database
        </div>
        <div className="text-sm text-neutral-500">
          To become an admin:
          <ol className="list-decimal ml-5 mt-2">
            <li>Go to Firebase Console → Firestore → users collection</li>
            <li>Find your user document (by your uid: {user.uid})</li>
            <li>Add or update field: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">role: "admin"</code></li>
            <li>Refresh this page</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="font-semibold mb-4">Initialize Firestore Database</div>
        <p className="text-sm text-neutral-500 mb-4">
          This will create initial collections and sample data. Only run this once.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleInitialize}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
        >
          {loading ? 'Initializing...' : 'Initialize Database'}
        </button>

        {status.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm">
            {status.map((msg, idx) => (
              <div key={idx} className={msg.startsWith('✅') ? 'text-green-600 font-semibold' : ''}>
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

