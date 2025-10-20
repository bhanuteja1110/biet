import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { Link, useNavigate } from 'react-router-dom';

export default function Signup() {
  const [name, setName] = useState('Student');
  const [email, setEmail] = useState('student@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm card p-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl gradient-accent" />
          <div className="text-lg font-semibold">Create your account</div>
        </div>
        <div className="mt-6 grid gap-3">
          <input className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          <input className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <button disabled={loading} className="mt-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">{loading ? 'Creating…' : 'Create account'}</button>
        </div>
        <div className="mt-4 text-sm">
          Already have an account? <Link to="/auth/login" className="underline">Login</Link>
        </div>
      </form>
    </div>
  );
}


