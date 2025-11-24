import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../../auth/AuthContext';
import { Trash2, Plus, X } from 'lucide-react';
import Loader from '../../components/Loader';

type Teacher = { 
  id: string; 
  name: string; 
  email: string; 
  departmentIds: string[]; 
  yearIds: string[]; // Changed from year?: string to yearIds: string[]
  subjects?: string[];
  uid?: string; // Firebase Auth uid
};

type Department = { id: string; name: string };

export default function AdminTeachers() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState('');

  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    password: '',
    yearIds: [] as string[],
    departmentIds: [] as string[],
    subjects: [] as string[],
  });


  useEffect(() => {
    // Fetch all departments
    const departmentsQuery = query(collection(db, 'departments'));
    const unsubscribeDepartments = onSnapshot(departmentsQuery, (snapshot) => {
      const departmentsData: Department[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        departmentsData.push({
          id: doc.id,
          name: data.name || doc.id,
        });
      });
      setDepartments(departmentsData);
      console.log('Departments loaded:', departmentsData.length);
    }, (err) => {
      console.error('Error fetching departments:', err);
    });

    return () => unsubscribeDepartments();
  }, []);

  useEffect(() => {
    // Fetch all years
    const yearsQuery = query(collection(db, 'years'));
    const unsubscribeYears = onSnapshot(yearsQuery, (snapshot) => {
      const yearsData: { id: string; name: string }[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        yearsData.push({
          id: doc.id,
          name: data.name || doc.id,
        });
      });
      setYears(yearsData);
      console.log('Years loaded for teachers:', yearsData.length);
    }, (err) => {
      console.error('Error fetching years:', err);
    });

    return () => unsubscribeYears();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const fetchAllUsers = async () => {
      try {
        console.log('Fetching all users and filtering for teachers...');
        const allUsersQuery = query(collection(db, 'users'));
        const snapshot = await getDocs(allUsersQuery);
        const teachersData: Teacher[] = [];
        
        console.log(`Total users found: ${snapshot.size}`);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const roleStr = String(data.role || '').trim().toLowerCase();
          console.log(`User ${doc.id}: role="${roleStr}"`);
          if (roleStr === 'teacher') {
            teachersData.push({
              id: doc.id,
              name: data.displayName || data.name || '',
              email: data.email || '',
              departmentIds: data.departmentIds || (data.departmentId ? [data.departmentId] : []) || [],
              yearIds: data.yearIds || (data.year ? [data.year] : []) || [], // Support both old and new format
              subjects: data.subjects || [],
              uid: doc.id, // In Firestore, doc.id is the uid
            });
          }
        });
        
        console.log(`Teachers found: ${teachersData.length}`);
        
        if (isMounted) {
          // Clear timeout if data loaded successfully
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          setRows(teachersData);
          setLoading(false);
          if (teachersData.length === 0) {
            setError('No teachers found. Click "Add Teacher" to create one.');
          } else {
            setError('');
          }
        }
      } catch (err: any) {
        console.error('Error fetching all users:', err);
        if (isMounted) {
          // Clear timeout on error
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          setError(`Error: ${err.message || 'Failed to load teachers. Check console for details.'}`);
          setLoading(false);
        }
      }
    };

    // Add timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Loading timeout - stopping loading state');
        setLoading(false);
        setError('Loading took too long. Please refresh the page or check your connection.');
      }
    }, 10000); // 10 second timeout

    fetchAllUsers();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  async function handleAddTeacher() {
    if (!user) return;

    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
      setError('Please fill in name, email, and password');
      return;
    }

    // Store admin credentials before creating new user
    const adminEmail = user.email;
    const adminUid = user.uid;
    
    // Get admin's password from session storage if available, otherwise prompt
    let adminPassword = sessionStorage.getItem('admin_password');
    if (!adminPassword) {
      adminPassword = prompt('Please enter your admin password to continue (needed to keep you logged in):');
      if (!adminPassword) {
        setError('Password required to create user while staying logged in');
        return;
      }
      sessionStorage.setItem('admin_password', adminPassword);
    }

    setSaving('new');
    setError('');
    setSuccess('');

    // Set transitioning flag to prevent redirects during user creation
    // This must be set BEFORE any auth operations
    if ((window as any).__setAuthTransitioning) {
      (window as any).__setAuthTransitioning(true);
    }

    try {
      // Create user in Firebase Authentication (this will automatically sign in the new user)
      const userCredential = await createUserWithEmailAndPassword(auth, newTeacher.email, newTeacher.password);
      const uid = userCredential.user.uid;

      // Create user document in Firestore
      await setDoc(doc(db, 'users', uid), {
        email: newTeacher.email,
        displayName: newTeacher.name,
        role: 'teacher',
        yearIds: newTeacher.yearIds || [],
        departmentIds: newTeacher.departmentIds || [],
        subjects: newTeacher.subjects || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Immediately sign out the newly created user (we don't need them signed in)
      await signOut(auth);

      // Sign admin back in immediately (no waiting)
      if (adminEmail && adminPassword) {
        try {
          // Sign admin back in
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          
          // Clear transitioning flag immediately after sign-in (don't wait)
          if ((window as any).__setAuthTransitioning) {
            (window as any).__setAuthTransitioning(false);
          }
          
          setSuccess(`Teacher "${newTeacher.name}" created successfully!`);
          setNewTeacher({ name: '', email: '', password: '', yearIds: [], departmentIds: [], subjects: [] });
          setSaving(null);
          setTimeout(() => {
            closeModal();
          }, 1500);
        } catch (signInErr: any) {
          console.error('Error signing admin back in:', signInErr);
          // Clear transitioning flag on error
          if ((window as any).__setAuthTransitioning) {
            (window as any).__setAuthTransitioning(false);
          }
          setError('Teacher created but failed to sign you back in. Please refresh the page and login again.');
          setSaving(null);
        }
      } else {
        // Clear transitioning flag
        if ((window as any).__setAuthTransitioning) {
          (window as any).__setAuthTransitioning(false);
        }
        setError('Admin credentials missing. Please login again.');
        setSaving(null);
      }
    } catch (err: any) {
      console.error('Error creating teacher:', err);
      
      // Clear transitioning flag on error
      if ((window as any).__setAuthTransitioning) {
        (window as any).__setAuthTransitioning(false);
      }
      
      // If user creation failed, make sure admin is still signed in
      if (adminEmail && adminPassword) {
        try {
          // Check if we're still signed in as admin
          if (auth.currentUser?.uid !== adminUid) {
            await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          }
        } catch (signInErr) {
          console.error('Error ensuring admin is signed in:', signInErr);
        }
      }
      
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email.');
      } else {
        setError(err.message || 'Failed to create teacher');
      }
      setSaving(null);
    }
  }

  async function handleDeleteTeacher(teacherId: string, teacherName: string) {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete teacher "${teacherName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(teacherId);
    setError('');
    setSuccess('');

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', teacherId));
      
      // Note: We can't delete from Firebase Auth without admin SDK
      // The user will remain in Auth but won't be able to login without the password
      setSuccess(`Teacher "${teacherName}" deleted successfully!`);
      setDeleting(null);
    } catch (err: any) {
      console.error('Error deleting teacher:', err);
      setError(err.message || 'Failed to delete teacher');
      setDeleting(null);
    }
  }

  function openAddModal() {
    setEditingTeacher(null);
    setNewTeacher({ name: '', email: '', password: '', yearIds: [], departmentIds: [], subjects: [] });
    setNewSubject('');
    setError('');
    setSuccess('');
    setShowModal(true);
  }

  function openEditModal(teacher: Teacher) {
    setEditingTeacher(teacher);
    setNewTeacher({
      name: teacher.name,
      email: teacher.email,
      password: '', // Don't show password when editing
      yearIds: teacher.yearIds || [],
      departmentIds: teacher.departmentIds || [],
      subjects: teacher.subjects || [],
    });
    setNewSubject('');
    setError('');
    setSuccess('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingTeacher(null);
    setNewTeacher({ name: '', email: '', password: '', yearIds: [], departmentIds: [], subjects: [] });
    setNewSubject('');
    setError('');
  }

  function handleAddSubject() {
    if (newSubject.trim() && !newTeacher.subjects.includes(newSubject.trim())) {
      setNewTeacher({
        ...newTeacher,
        subjects: [...newTeacher.subjects, newSubject.trim()],
      });
      setNewSubject('');
    }
  }

  function handleRemoveSubject(subject: string) {
    setNewTeacher({
      ...newTeacher,
      subjects: newTeacher.subjects.filter(s => s !== subject),
    });
  }

  function handleToggleDepartment(departmentId: string) {
    setNewTeacher({
      ...newTeacher,
      departmentIds: newTeacher.departmentIds.includes(departmentId)
        ? newTeacher.departmentIds.filter(id => id !== departmentId)
        : [...newTeacher.departmentIds, departmentId],
    });
  }

  function handleToggleYear(yearId: string) {
    setNewTeacher({
      ...newTeacher,
      yearIds: newTeacher.yearIds.includes(yearId)
        ? newTeacher.yearIds.filter(id => id !== yearId)
        : [...newTeacher.yearIds, yearId],
    });
  }

  async function handleSaveTeacher() {
    if (!user) return;

    if (!newTeacher.name || !newTeacher.email) {
      setError('Please fill in name and email');
      return;
    }

    if (!editingTeacher && !newTeacher.password) {
      setError('Password is required for new teachers');
      return;
    }

    if (editingTeacher) {
      // Update existing teacher
      setSaving(editingTeacher.id);
      setError('');
      setSuccess('');

      try {
        const updateData: any = {
          displayName: newTeacher.name,
          email: newTeacher.email,
          yearIds: newTeacher.yearIds || [],
          departmentIds: newTeacher.departmentIds || [],
          subjects: newTeacher.subjects || [],
          updatedAt: serverTimestamp(),
        };

        await updateDoc(doc(db, 'users', editingTeacher.id), updateData);
        setSuccess(`Teacher "${newTeacher.name}" updated successfully!`);
        setSaving(null);
        setTimeout(() => {
          closeModal();
        }, 1500);
      } catch (err: any) {
        console.error('Error updating teacher:', err);
        setError(err.message || 'Failed to update teacher');
        setSaving(null);
      }
    } else {
      // Create new teacher
      await handleAddTeacher();
    }
  }

  if (loading) {
    return (
      <div className="card p-5">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">Teachers Management</div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm"
          >
            <Plus className="size-4" />
            Add Teacher
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-sm">
            {success}
          </div>
        )}

        {rows.length === 0 && !loading ? (
          <div className="text-neutral-500">
            <p>No teachers found. Click "Add Teacher" to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Years</th>
                  <th>Assigned Classes</th>
                  <th>Subjects</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                    <td className="py-2">{r.name}</td>
                    <td>
                      <button
                        onClick={() => openEditModal(r)}
                        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {r.email}
                      </button>
                    </td>
                    <td>
                      {r.yearIds && r.yearIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.yearIds.map(yearId => {
                            const yearData = years.find(y => y.id === yearId || y.name === yearId);
                            return yearData ? (
                              <span key={yearId} className="px-2 py-1 text-xs rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                {yearData.name}
                              </span>
                            ) : (
                              <span key={yearId} className="px-2 py-1 text-xs rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                {yearId}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-neutral-500">No years assigned</span>
                      )}
                    </td>
                    <td>
                      {r.departmentIds && r.departmentIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.departmentIds.map(deptId => {
                            const deptData = departments.find(d => d.id === deptId);
                            return deptData ? (
                              <span key={deptId} className="px-2 py-1 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                {deptData.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <span className="text-neutral-500">No departments assigned</span>
                      )}
                    </td>
                    <td>
                      {r.subjects && r.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.subjects.map((subject, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              {subject}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-500">No subjects</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteTeacher(r.id, r.name)}
                        disabled={deleting === r.id}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50"
                        title="Delete teacher"
                      >
                        {deleting === r.id ? (
                          <span className="text-xs">Deleting...</span>
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit Teacher */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
              <div className="font-semibold text-lg">
                {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
              </div>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-sm">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Full Name"
                    value={newTeacher.name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Email"
                    value={newTeacher.email}
                    onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  />
                </div>

                {!editingTeacher && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Password *</label>
                    <input
                      type="password"
                      className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                      placeholder="Password (min 6 characters)"
                      value={newTeacher.password}
                      onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Assigned Years (Select Multiple)</label>
                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg">
                    {years.map(year => (
                      <label 
                        key={year.id} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 p-2 rounded transition"
                        onClick={(e) => {
                          // Prevent double toggle when clicking label
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newTeacher.yearIds.includes(year.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleYear(year.id);
                          }}
                          className="rounded border-neutral-300 dark:border-neutral-700 cursor-pointer"
                        />
                        <span className="text-sm select-none">{year.name}</span>
                      </label>
                    ))}
                  </div>
                  {years.length === 0 && (
                    <p className="text-xs text-neutral-500 mt-1">No years available. Create years in Classes page first.</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Assigned Departments (Select Multiple)</label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg">
                    {departments.map(dept => (
                      <label 
                        key={dept.id} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 p-2 rounded transition"
                        onClick={(e) => {
                          // Prevent double toggle when clicking label
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newTeacher.departmentIds.includes(dept.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleDepartment(dept.id);
                          }}
                          className="rounded border-neutral-300 dark:border-neutral-700 cursor-pointer"
                        />
                        <span className="text-sm select-none">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                  {departments.length === 0 && (
                    <p className="text-xs text-neutral-500 mt-1">No departments available. Create departments in Classes page first.</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Subjects Taught</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="flex-1 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                      placeholder="Enter subject name"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubject();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddSubject}
                      className="px-4 py-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    >
                      Add
                    </button>
                  </div>
                  {newTeacher.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newTeacher.subjects.map((subject, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm"
                        >
                          {subject}
                          <button
                            onClick={() => handleRemoveSubject(subject)}
                            className="hover:text-blue-900 dark:hover:text-blue-100"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTeacher}
                  disabled={saving === 'new' || saving === editingTeacher?.id}
                  className="flex-1 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
                >
                  {saving === 'new' || saving === editingTeacher?.id
                    ? (editingTeacher ? 'Saving...' : 'Creating...')
                    : (editingTeacher ? 'Save Changes' : 'Create Teacher')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
