import { useAuth } from '../auth/AuthContext';
import { useMemo, useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react';

type ProfileData = {
  department?: string;
  year?: string;
  fatherName?: string;
  rollNumber?: string;
  contact?: string;
  dob?: string;
  busRoute?: string;
};

export default function Profile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfileData(userDoc.data() as ProfileData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const qrData = useMemo(() => {
    const payload = {
      uid: user?.uid ?? 'guest',
      name: user?.displayName ?? 'Student',
      email: user?.email ?? '',
      dob: profileData.dob ?? '',
      fatherName: profileData.fatherName ?? '',
      busRoute: profileData.busRoute ?? '',
      college: 'BIET',
    } as const;
    return encodeURIComponent(JSON.stringify(payload));
  }, [user, profileData]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || !confirmPassword || !currentPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    if (!user || !user.email) {
      setPasswordError('User not authenticated');
      return;
    }

    setChangingPassword(true);

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      
      setTimeout(() => {
        setPasswordSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error changing password:', err);
      if (err.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (err.code === 'auth/weak-password') {
        setPasswordError('New password is too weak');
      } else {
        setPasswordError(err.message || 'Failed to change password');
      }
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-6">
        <div className="flex items-center gap-5">
          <img src={user?.photoURL ?? 'https://i.pravatar.cc/200?img=12'} alt="avatar" className="size-24 rounded-2xl object-cover ring-2 ring-white/60 shadow" />
          <div>
            <div className="text-2xl font-semibold tracking-tight">{user?.displayName ?? 'Student'}</div>
            <div className="text-neutral-500">{user?.email ?? ''}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4">
            <div className="text-sm text-neutral-500">Department</div>
            <div className="mt-1 font-medium">{profileData.department || '—'}</div>
          </div>
          <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4">
            <div className="text-sm text-neutral-500">Year</div>
            <div className="mt-1 font-medium">{profileData.year || '—'}</div>
          </div>
          <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4">
            <div className="text-sm text-neutral-500">Father's Name</div>
            <div className="mt-1 font-medium">{profileData.fatherName || '—'}</div>
          </div>
          <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4">
            <div className="text-sm text-neutral-500">Roll Number</div>
            <div className="mt-1 font-medium">{profileData.rollNumber || '—'}</div>
          </div>
          <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4">
            <div className="text-sm text-neutral-500">Contact</div>
            <div className="mt-1 font-medium">{profileData.contact || '—'}</div>
          </div>
          <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4">
            <div className="text-sm text-neutral-500">Date of Birth</div>
            <div className="mt-1 font-medium">{profileData.dob || '—'}</div>
          </div>
          <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4">
            <div className="text-sm text-neutral-500">Bus Route</div>
            <div className="mt-1 font-medium">{profileData.busRoute || '—'}</div>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Change Password</div>
              <div className="text-sm text-neutral-500">Update your account password</div>
            </div>
            <button
              onClick={() => {
                setShowPasswordChange(!showPasswordChange);
                setPasswordError(null);
                setPasswordSuccess(null);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              {showPasswordChange ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPasswordChange && (
            <form onSubmit={handlePasswordChange} className="card p-5 space-y-4">
              {passwordError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
                  {passwordSuccess}
                </div>
              )}

              {/* Current Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:ring-indigo-400/50 dark:focus:border-indigo-400 transition-all duration-200"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current Password"
                  disabled={changingPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* New Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:ring-indigo-400/50 dark:focus:border-indigo-400 transition-all duration-200"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password (min. 6 characters)"
                  disabled={changingPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:ring-indigo-400/50 dark:focus:border-indigo-400 transition-all duration-200"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  disabled={changingPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Changing Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr,auto] items-center">
          <div className="text-sm text-neutral-500">Profile details are managed by the administration.</div>
          <div className="rounded-2xl bg-white dark:bg-neutral-900 p-4 border border-neutral-200/60 dark:border-neutral-800">
            <div className="text-xs text-neutral-500">Digital ID</div>
            <img alt="qr" className="mt-2 size-28" src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${qrData}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

