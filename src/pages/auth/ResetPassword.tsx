import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { Link } from 'react-router-dom';

export default function ResetPassword() {
  const [email, setEmail] = useState('student@example.com');
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    await sendPasswordResetEmail(auth, email);
    setStatus('Reset email sent. Check your inbox.');
  }

  return (
    <div className="min-h-dvh grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm card p-6">
        <div className="text-lg font-semibold">Reset Password</div>
        <div className="mt-6 grid gap-3">
          <input className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          {status && <div className="text-sm text-emerald-600">{status}</div>}
          <button className="mt-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">Send reset link</button>
        </div>
        <div className="mt-4 text-sm">
          <Link className="underline" to="/auth/login">Back to login</Link>
        </div>
      </form>
    </div>
  );
}

