import { useAuth } from '../auth/AuthContext';
import { useMemo, useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

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

