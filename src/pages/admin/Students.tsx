import { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../../firebase/firebase';
import { collection, query, onSnapshot, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../auth/AuthContext';
import { Trash2, Plus, X, Upload, User } from 'lucide-react';
import Loader from '../../components/Loader';

type Student = { 
  id: string; 
  name: string; 
  email: string; 
  roll: string; 
  dept: string; 
  year: string; 
  fatherName?: string;
  contact?: string;
  section?: string;
  classId?: string;
  busRoute?: string;
  address?: string;
  photoURL?: string;
  clubIds?: string[];
  uid?: string;
};

type BusRoute = { id: string; route: string; origin: string; time: string; stops: string[] };

export default function AdminStudents() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: '',
    roll: '',
    dept: '',
    year: '',
    fatherName: '',
    contact: '',
    section: '',
    classId: '',
    busRoute: '',
    address: '',
    photoURL: '',
    clubIds: [] as string[],
  });

  const sections = ['A', 'B', 'C', 'D'];

  useEffect(() => {
    // Fetch all departments
    const departmentsQuery = query(collection(db, 'departments'));
    const unsubscribeDepartments = onSnapshot(departmentsQuery, (snapshot) => {
      const departmentsData: { id: string; name: string }[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        departmentsData.push({
          id: doc.id,
          name: data.name || doc.id,
        });
      });
      setDepartments(departmentsData);
      console.log('Departments loaded for students:', departmentsData.length);
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
      console.log('Years loaded for students:', yearsData.length);
    }, (err) => {
      console.error('Error fetching years:', err);
    });

    return () => unsubscribeYears();
  }, []);

  useEffect(() => {
    // Fetch all clubs
    const clubsQuery = query(collection(db, 'clubs'));
    const unsubscribeClubs = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData: { id: string; name: string }[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clubsData.push({
          id: doc.id,
          name: data.name || doc.id,
        });
      });
      setClubs(clubsData);
      console.log('Clubs loaded for students:', clubsData.length);
    }, (err) => {
      console.error('Error fetching clubs:', err);
    });

    return () => unsubscribeClubs();
  }, []);

  useEffect(() => {
    // Fetch bus routes
    const routesQuery = collection(db, 'transport', 'routes', 'list');
    const unsubscribeRoutes = onSnapshot(routesQuery, (snapshot) => {
      const routesData: BusRoute[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        routesData.push({
          id: doc.id,
          route: data.route || doc.id,
          origin: data.origin || '',
          time: data.time || '',
          stops: data.stops || [],
        });
      });
      setBusRoutes(routesData);
      console.log('Bus routes loaded:', routesData.length);
    }, (err) => {
      console.error('Error fetching bus routes:', err);
    });

    return () => unsubscribeRoutes();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const fetchAllUsers = async () => {
      try {
        console.log('Fetching students from Firestore...');
        const allUsersQuery = query(collection(db, 'users'));
        const snapshot = await getDocs(allUsersQuery);
        const studentsData: Student[] = [];
        
        console.log(`Total users found: ${snapshot.size}`);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const roleStr = String(data.role || '').trim().toLowerCase();
          console.log(`User ${doc.id}: role="${roleStr}"`);
          if (roleStr === 'student') {
            studentsData.push({
              id: doc.id,
              name: data.displayName || data.name || '',
              email: data.email || '',
              roll: data.rollNumber || data.roll || '',
              dept: data.department || data.dept || '',
              year: data.year || '',
              fatherName: data.fatherName || '',
              contact: data.contact || '',
              section: data.section || '',
              classId: data.classId || '',
              busRoute: data.busRoute || '',
              address: data.address || '',
              photoURL: data.photoURL || '',
              clubIds: data.clubIds || [],
              uid: doc.id,
            });
          }
        });
        
        console.log(`Students found: ${studentsData.length}`);
        
        if (isMounted) {
          // Clear timeout if data loaded successfully
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          setRows(studentsData);
          setLoading(false);
          if (studentsData.length === 0) {
            setError('No students found. Click "Add Student" to create one.');
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
          setError(`Error: ${err.message || 'Failed to load students. Check console for details.'}`);
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

  async function handleAddStudent() {
    if (!user) return;

    if (!newStudent.name || !newStudent.email || !newStudent.password) {
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
      const userCredential = await createUserWithEmailAndPassword(auth, newStudent.email, newStudent.password);
      const uid = userCredential.user.uid;

      // Update user profile with photo if available
      if (newStudent.photoURL) {
        await updateProfile(userCredential.user, {
          photoURL: newStudent.photoURL,
          displayName: newStudent.name,
        });
      }

      // Create user document in Firestore
      await setDoc(doc(db, 'users', uid), {
        email: newStudent.email,
        displayName: newStudent.name,
        role: 'student',
        rollNumber: newStudent.roll || '',
        department: newStudent.dept || '',
        year: newStudent.year || '',
        fatherName: newStudent.fatherName || '',
        contact: newStudent.contact || '',
        section: newStudent.section || '',
        classId: newStudent.classId || null,
        busRoute: newStudent.busRoute || null,
        address: newStudent.address || null,
        photoURL: newStudent.photoURL || null,
        clubIds: newStudent.clubIds || [],
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
          
          setSuccess(`Student "${newStudent.name}" created successfully!`);
          setNewStudent({ name: '', email: '', password: '', roll: '', dept: '', year: '', fatherName: '', contact: '', section: '', classId: '', busRoute: '', address: '', photoURL: '', clubIds: [] });
          setPreviewImage(null);
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
          setError('Student created but failed to sign you back in. Please refresh the page and login again.');
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
      console.error('Error creating student:', err);
      
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
        setError(err.message || 'Failed to create student');
      }
      setSaving(null);
    }
  }

  async function handleDeleteStudent(studentId: string, studentName: string) {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete student "${studentName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(studentId);
    setError('');
    setSuccess('');

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', studentId));
      setSuccess(`Student "${studentName}" deleted successfully!`);
      setDeleting(null);
    } catch (err: any) {
      console.error('Error deleting student:', err);
      setError(err.message || 'Failed to delete student');
      setDeleting(null);
    }
  }

  // Removed unused function - inline editing is handled differently
  /*
  async function updateStudentField(studentId: string, field: 'name' | 'email' | 'roll' | 'dept' | 'year' | 'fatherName' | 'contact' | 'section', value: string) {
    if (!user) return;

    setSaving(studentId);
    setError('');

    try {
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };
      
      if (field === 'name') {
        updateData.displayName = value;
      } else if (field === 'roll') {
        updateData.rollNumber = value;
      } else if (field === 'dept') {
        updateData.department = value;
      } else {
        updateData[field] = value;
      }

      await updateDoc(doc(db, 'users', studentId), updateData);
      setSaving(null);
    } catch (err: any) {
      console.error('Error updating student:', err);
      setError(`Failed to update: ${err.message}`);
      setSaving(null);
    }
  }
  */

  // Removed unused function
  // function update(idx: number, key: keyof Student, value: string) {
  //   setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  // }

  async function handleImageUpload(file: File) {
    if (!user) return;
    
    setUploadingImage(true);
    setError('');

    try {
      // Create a unique filename
      const fileName = `students/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);

      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      setNewStudent({ ...newStudent, photoURL: downloadURL });
      setPreviewImage(downloadURL);
      setUploadingImage(false);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image: ' + err.message);
      setUploadingImage(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Firebase Storage
      handleImageUpload(file);
    }
  }

  function openAddModal() {
    setEditingStudent(null);
    setNewStudent({ name: '', email: '', password: '', roll: '', dept: '', year: '', fatherName: '', contact: '', section: '', classId: '', busRoute: '', address: '', photoURL: '', clubIds: [] });
    setPreviewImage(null);
    setError('');
    setSuccess('');
    setShowModal(true);
  }

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setNewStudent({
      name: student.name,
      email: student.email,
      password: '', // Don't show password when editing
      roll: student.roll,
      dept: student.dept,
      year: student.year,
      fatherName: student.fatherName || '',
      contact: student.contact || '',
      section: student.section || '',
      classId: student.classId || '',
      busRoute: student.busRoute || '',
      address: student.address || '',
      photoURL: student.photoURL || '',
      clubIds: student.clubIds || [],
    });
    setPreviewImage(student.photoURL || null);
    setError('');
    setSuccess('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingStudent(null);
    setNewStudent({ name: '', email: '', password: '', roll: '', dept: '', year: '', fatherName: '', contact: '', section: '', classId: '', busRoute: '', address: '', photoURL: '', clubIds: [] });
    setPreviewImage(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleToggleClub(clubId: string) {
    setNewStudent({
      ...newStudent,
      clubIds: newStudent.clubIds.includes(clubId)
        ? newStudent.clubIds.filter(id => id !== clubId)
        : [...newStudent.clubIds, clubId],
    });
  }

  async function handleSaveStudent() {
    if (!user) return;

    if (!newStudent.name || !newStudent.email) {
      setError('Please fill in name and email');
      return;
    }

    if (!editingStudent && !newStudent.password) {
      setError('Password is required for new students');
      return;
    }

    if (editingStudent) {
      // Update existing student
      setSaving(editingStudent.id);
      setError('');
      setSuccess('');

      try {
        const updateData: any = {
          displayName: newStudent.name,
          email: newStudent.email,
          rollNumber: newStudent.roll || '',
          department: newStudent.dept || '',
          year: newStudent.year || '',
          fatherName: newStudent.fatherName || '',
          contact: newStudent.contact || '',
          section: newStudent.section || '',
          classId: newStudent.classId || null,
          busRoute: newStudent.busRoute || null,
          address: newStudent.address || null,
          photoURL: newStudent.photoURL || null,
          clubIds: newStudent.clubIds || [],
          updatedAt: serverTimestamp(),
        };

        // Update Firebase Auth profile if photo changed
        if (newStudent.photoURL && auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, {
              photoURL: newStudent.photoURL,
              displayName: newStudent.name,
            });
          } catch (err) {
            console.error('Error updating auth profile:', err);
          }
        }

        await updateDoc(doc(db, 'users', editingStudent.id), updateData);
        setSuccess(`Student "${newStudent.name}" updated successfully!`);
        setSaving(null);
        setTimeout(() => {
          closeModal();
        }, 1500);
      } catch (err: any) {
        console.error('Error updating student:', err);
        setError(err.message || 'Failed to update student');
        setSaving(null);
      }
    } else {
      // Create new student
      await handleAddStudent();
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
          <div className="font-semibold">Students Management</div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm"
          >
            <Plus className="size-4" />
            Add Student
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
            <p>No students found. Click "Add Student" to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Roll</th>
                  <th>Dept</th>
                  <th>Year</th>
                  <th>Section</th>
                  <th>Father's Name</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                    <td className="py-2">{r.name}</td>
                    <td>{r.email}</td>
                    <td>
                      <button
                        onClick={() => openEditModal(r)}
                        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {r.roll || 'N/A'}
                      </button>
                    </td>
                    <td>{r.dept || '—'}</td>
                    <td>{r.year || '—'}</td>
                    <td>{r.section || '—'}</td>
                    <td>{r.fatherName || '—'}</td>
                    <td>{r.contact || '—'}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteStudent(r.id, r.name)}
                        disabled={deleting === r.id}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50"
                        title="Delete student"
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

      {/* Modal for Add/Edit Student */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
              <div className="font-semibold text-lg">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
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

              {/* Profile Image Upload */}
              <div className="flex items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="relative">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-neutral-300 dark:border-neutral-700"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center border-2 border-neutral-300 dark:border-neutral-700">
                      <User className="size-12 text-neutral-400" />
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <div className="text-white text-xs">Uploading...</div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Profile Photo</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="profile-image-input"
                  />
                  <label
                    htmlFor="profile-image-input"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition"
                  >
                    <Upload className="size-4" />
                    {previewImage ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  <p className="text-xs text-neutral-500 mt-1">Max 5MB, JPG/PNG</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Full Name"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  />
                </div>

                {!editingStudent && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Password *</label>
                    <input
                      type="password"
                      className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                      placeholder="Password (min 6 characters)"
                      value={newStudent.password}
                      onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Roll Number</label>
                  <input
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Roll Number"
                    value={newStudent.roll}
                    onChange={(e) => setNewStudent({ ...newStudent, roll: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    value={newStudent.dept}
                    onChange={(e) => setNewStudent({ ...newStudent, dept: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                  {departments.length === 0 && (
                    <p className="text-xs text-neutral-500 mt-1">No departments available. Create departments in Classes page first.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Year</label>
                    <select
                      className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                      value={newStudent.year}
                      onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value })}
                    >
                      <option value="">Select Year</option>
                      {years.map(year => (
                        <option key={year.id} value={year.name}>{year.name}</option>
                      ))}
                    </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Section</label>
                  <select
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    value={newStudent.section}
                    onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                  >
                    <option value="">Select Section</option>
                    {sections.map(section => (
                      <option key={section} value={section}>Section {section}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Father's Name</label>
                  <input
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Father's Name"
                    value={newStudent.fatherName}
                    onChange={(e) => setNewStudent({ ...newStudent, fatherName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Contact Number</label>
                  <input
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Contact Number"
                    value={newStudent.contact}
                    onChange={(e) => setNewStudent({ ...newStudent, contact: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bus Route</label>
                  <select
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    value={newStudent.busRoute}
                    onChange={(e) => setNewStudent({ ...newStudent, busRoute: e.target.value })}
                  >
                    <option value="">Select Bus Route</option>
                    {busRoutes.map(route => (
                      <option key={route.id} value={route.route}>
                        {route.route} - {route.origin} ({route.time})
                      </option>
                    ))}
                  </select>
                  {busRoutes.length === 0 && (
                    <p className="text-xs text-neutral-500 mt-1">No bus routes found. Add routes in Transport page.</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <textarea
                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2 min-h-[80px] resize-none"
                    placeholder="Enter full address"
                    value={newStudent.address}
                    onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Clubs (Select Multiple)</label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg">
                    {clubs.map(club => (
                      <label 
                        key={club.id} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 p-2 rounded transition"
                        onClick={(e) => {
                          // Prevent double toggle when clicking label
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newStudent.clubIds.includes(club.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleClub(club.id);
                          }}
                          className="rounded border-neutral-300 dark:border-neutral-700 cursor-pointer"
                        />
                        <span className="text-sm select-none">{club.name}</span>
                      </label>
                    ))}
                  </div>
                  {clubs.length === 0 && (
                    <p className="text-xs text-neutral-500 mt-1">No clubs available. Create clubs in Classes page first.</p>
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
                  onClick={handleSaveStudent}
                  disabled={saving === 'new' || saving === editingStudent?.id}
                  className="flex-1 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
                >
                  {saving === 'new' || saving === editingStudent?.id
                    ? (editingStudent ? 'Saving...' : 'Creating...')
                    : (editingStudent ? 'Save Changes' : 'Create Student')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

