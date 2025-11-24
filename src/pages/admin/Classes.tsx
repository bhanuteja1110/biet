import { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../auth/AuthContext';
import { Trash2, Plus } from 'lucide-react';
import Loader from '../../components/Loader';

type Department = { 
  id: string; 
  name: string;
};

type Year = { 
  id: string; 
  name: string;
};

type Club = { 
  id: string; 
  name: string;
};

export default function AdminClasses() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'departments' | 'years' | 'clubs'>('departments');
  const [rows, setRows] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [yearsSaving, setYearsSaving] = useState<string | null>(null);
  const [clubsSaving, setClubsSaving] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddYearForm, setShowAddYearForm] = useState(false);
  const [showAddClubForm, setShowAddClubForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingYear, setDeletingYear] = useState<string | null>(null);
  const [deletingClub, setDeletingClub] = useState<string | null>(null);

  const [newDepartment, setNewDepartment] = useState({
    name: '',
  });

  const [newYear, setNewYear] = useState({
    name: '',
  });

  const [newClub, setNewClub] = useState({
    name: '',
  });

  useEffect(() => {
    const departmentsQuery = query(collection(db, 'departments'), orderBy('name'));
    const unsubscribe = onSnapshot(departmentsQuery, (snapshot) => {
      const departmentsData: Department[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        departmentsData.push({
          id: doc.id,
          name: data.name || doc.id,
        });
      });
      setRows(departmentsData);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching departments:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const yearsQuery = query(collection(db, 'years'), orderBy('name'));
    const unsubscribe = onSnapshot(yearsQuery, (snapshot) => {
      const yearsData: Year[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        yearsData.push({
          id: doc.id,
          name: data.name || doc.id,
        });
      });
      setYears(yearsData);
      setYearsLoading(false);
    }, (err) => {
      console.error('Error fetching years:', err);
      setError(`Error: ${err.message}`);
      setYearsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const clubsQuery = query(collection(db, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData: Club[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clubsData.push({
          id: doc.id,
          name: data.name || doc.id,
        });
      });
      setClubs(clubsData);
      setClubsLoading(false);
    }, (err) => {
      console.error('Error fetching clubs:', err);
      setError(`Error: ${err.message}`);
      setClubsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleAddDepartment() {
    if (!user) return;

    if (!newDepartment.name) {
      setError('Please enter a department name');
      return;
    }

    setSaving('new');
    setError('');
    setSuccess('');

    try {
      // Generate department ID from name (lowercase, replace spaces with hyphens)
      const departmentId = newDepartment.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      await setDoc(doc(db, 'departments', departmentId), {
        name: newDepartment.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(`Department "${newDepartment.name}" created successfully!`);
      setNewDepartment({ name: '' });
      setShowAddForm(false);
      setSaving(null);
    } catch (err: any) {
      console.error('Error creating department:', err);
      setError(err.message || 'Failed to create department');
      setSaving(null);
    }
  }

  async function handleDeleteDepartment(departmentId: string, departmentName: string) {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete department "${departmentName}"? This will unassign all teachers from this department. This action cannot be undone.`)) {
      return;
    }

    setDeleting(departmentId);
    setError('');
    setSuccess('');

    try {
      await deleteDoc(doc(db, 'departments', departmentId));
      setSuccess(`Department "${departmentName}" deleted successfully!`);
      setDeleting(null);
    } catch (err: any) {
      console.error('Error deleting department:', err);
      setError(err.message || 'Failed to delete department');
      setDeleting(null);
    }
  }

  async function updateDepartmentField(departmentId: string, field: 'name', value: string) {
    if (!user) return;

    setSaving(departmentId);
    setError('');

    try {
      await setDoc(doc(db, 'departments', departmentId), {
        [field]: value,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaving(null);
    } catch (err: any) {
      console.error('Error updating department:', err);
      setError(`Failed to update: ${err.message}`);
      setSaving(null);
    }
  }

  function update(idx: number, key: keyof Department, value: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  }

  async function handleAddYear() {
    if (!user) return;

    if (!newYear.name) {
      setError('Please enter a year name');
      return;
    }

    setYearsSaving('new');
    setError('');
    setSuccess('');

    try {
      // Generate year ID from name (lowercase, replace spaces with hyphens)
      const yearId = newYear.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      await setDoc(doc(db, 'years', yearId), {
        name: newYear.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(`Year "${newYear.name}" created successfully!`);
      setNewYear({ name: '' });
      setShowAddYearForm(false);
      setYearsSaving(null);
    } catch (err: any) {
      console.error('Error creating year:', err);
      setError(err.message || 'Failed to create year');
      setYearsSaving(null);
    }
  }

  async function handleDeleteYear(yearId: string, yearName: string) {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete year "${yearName}"? This will unassign all students and teachers from this year. This action cannot be undone.`)) {
      return;
    }

    setDeletingYear(yearId);
    setError('');
    setSuccess('');

    try {
      await deleteDoc(doc(db, 'years', yearId));
      setSuccess(`Year "${yearName}" deleted successfully!`);
      setDeletingYear(null);
    } catch (err: any) {
      console.error('Error deleting year:', err);
      setError(err.message || 'Failed to delete year');
      setDeletingYear(null);
    }
  }

  async function updateYearField(yearId: string, field: 'name', value: string) {
    if (!user) return;

    setYearsSaving(yearId);
    setError('');

    try {
      await setDoc(doc(db, 'years', yearId), {
        [field]: value,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setYearsSaving(null);
    } catch (err: any) {
      console.error('Error updating year:', err);
      setError(`Failed to update: ${err.message}`);
      setYearsSaving(null);
    }
  }

  function updateYear(idx: number, key: keyof Year, value: string) {
    setYears(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  }

  async function handleAddClub() {
    if (!user) return;

    if (!newClub.name) {
      setError('Please enter a club name');
      return;
    }

    setClubsSaving('new');
    setError('');
    setSuccess('');

    try {
      // Generate club ID from name (lowercase, replace spaces with hyphens)
      const clubId = newClub.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      await setDoc(doc(db, 'clubs', clubId), {
        name: newClub.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(`Club "${newClub.name}" created successfully!`);
      setNewClub({ name: '' });
      setShowAddClubForm(false);
      setClubsSaving(null);
    } catch (err: any) {
      console.error('Error creating club:', err);
      setError(err.message || 'Failed to create club');
      setClubsSaving(null);
    }
  }

  async function handleDeleteClub(clubId: string, clubName: string) {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete club "${clubName}"? This will unassign all students from this club. This action cannot be undone.`)) {
      return;
    }

    setDeletingClub(clubId);
    setError('');
    setSuccess('');

    try {
      await deleteDoc(doc(db, 'clubs', clubId));
      setSuccess(`Club "${clubName}" deleted successfully!`);
      setDeletingClub(null);
    } catch (err: any) {
      console.error('Error deleting club:', err);
      setError(err.message || 'Failed to delete club');
      setDeletingClub(null);
    }
  }

  async function updateClubField(clubId: string, field: 'name', value: string) {
    if (!user) return;

    setClubsSaving(clubId);
    setError('');

    try {
      await setDoc(doc(db, 'clubs', clubId), {
        [field]: value,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setClubsSaving(null);
    } catch (err: any) {
      console.error('Error updating club:', err);
      setError(`Failed to update: ${err.message}`);
      setClubsSaving(null);
    }
  }

  function updateClub(idx: number, key: keyof Club, value: string) {
    setClubs(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
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
          <div className="font-semibold">Departments, Years & Clubs Management</div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('departments');
                setShowAddForm(false);
                setShowAddYearForm(false);
                setShowAddClubForm(false);
              }}
              className={`px-4 py-2 rounded-xl text-sm transition ${
                activeTab === 'departments'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Departments
            </button>
            <button
              onClick={() => {
                setActiveTab('years');
                setShowAddForm(false);
                setShowAddYearForm(false);
                setShowAddClubForm(false);
              }}
              className={`px-4 py-2 rounded-xl text-sm transition ${
                activeTab === 'years'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Years
            </button>
            <button
              onClick={() => {
                setActiveTab('clubs');
                setShowAddForm(false);
                setShowAddYearForm(false);
                setShowAddClubForm(false);
              }}
              className={`px-4 py-2 rounded-xl text-sm transition ${
                activeTab === 'clubs'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Clubs
            </button>
          </div>
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

        {activeTab === 'departments' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-neutral-500">Manage Departments</div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm"
              >
                <Plus className="size-4" />
                {showAddForm ? 'Cancel' : 'Add Department'}
              </button>
            </div>

            {showAddForm && (
              <div className="mb-6 p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
                <div className="font-semibold mb-3">Add New Department</div>
                <div className="grid gap-3 md:grid-cols-1">
                  <input
                    className="rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Department Name * (e.g., CSE, CSE(AI&ML), IT, ECE)"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment({ name: e.target.value })}
                  />
                </div>
                <button
                  onClick={handleAddDepartment}
                  disabled={saving === 'new'}
                  className="mt-3 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
                >
                  {saving === 'new' ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            )}

            {rows.length === 0 && !loading ? (
              <div className="text-neutral-500">
                <p>No departments found. Click "Add Department" to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-500">
                    <tr>
                      <th className="py-2">Department Name</th>
                      <th>Department ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={r.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                        <td className="py-2">
                          <input 
                            className="w-64 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" 
                            value={r.name} 
                            onChange={(e) => update(idx, 'name', e.target.value)}
                            onBlur={() => {
                              updateDepartmentField(r.id, 'name', r.name);
                              setSaving(null);
                            }}
                            disabled={saving === r.id}
                          />
                        </td>
                        <td>
                          <code className="text-xs text-neutral-500">{r.id}</code>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteDepartment(r.id, r.name)}
                            disabled={deleting === r.id}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50"
                            title="Delete department"
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
          </>
        )}

        {activeTab === 'years' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-neutral-500">Manage Years</div>
              <button
                onClick={() => setShowAddYearForm(!showAddYearForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm"
              >
                <Plus className="size-4" />
                {showAddYearForm ? 'Cancel' : 'Add Year'}
              </button>
            </div>

            {showAddYearForm && (
              <div className="mb-6 p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
                <div className="font-semibold mb-3">Add New Year</div>
                <div className="grid gap-3 md:grid-cols-1">
                  <input
                    className="rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Year Name * (e.g., 1st, 2nd, 3rd, 4th)"
                    value={newYear.name}
                    onChange={(e) => setNewYear({ name: e.target.value })}
                  />
                </div>
                <button
                  onClick={handleAddYear}
                  disabled={yearsSaving === 'new'}
                  className="mt-3 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
                >
                  {yearsSaving === 'new' ? 'Creating...' : 'Create Year'}
                </button>
              </div>
            )}

            {years.length === 0 && !yearsLoading ? (
              <div className="text-neutral-500">
                <p>No years found. Click "Add Year" to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-500">
                    <tr>
                      <th className="py-2">Year Name</th>
                      <th>Year ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((y, idx) => (
                      <tr key={y.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                        <td className="py-2">
                          <input 
                            className="w-64 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" 
                            value={y.name} 
                            onChange={(e) => updateYear(idx, 'name', e.target.value)}
                            onBlur={() => {
                              updateYearField(y.id, 'name', y.name);
                              setYearsSaving(null);
                            }}
                            disabled={yearsSaving === y.id}
                          />
                        </td>
                        <td>
                          <code className="text-xs text-neutral-500">{y.id}</code>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteYear(y.id, y.name)}
                            disabled={deletingYear === y.id}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50"
                            title="Delete year"
                          >
                            {deletingYear === y.id ? (
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
          </>
        )}

        {activeTab === 'clubs' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-neutral-500">Manage Clubs</div>
              <button
                onClick={() => setShowAddClubForm(!showAddClubForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm"
              >
                <Plus className="size-4" />
                {showAddClubForm ? 'Cancel' : 'Add Club'}
              </button>
            </div>

            {showAddClubForm && (
              <div className="mb-6 p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
                <div className="font-semibold mb-3">Add New Club</div>
                <div className="grid gap-3 md:grid-cols-1">
                  <input
                    className="rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                    placeholder="Club Name * (e.g., Coding Club, Sports Club, Music Club)"
                    value={newClub.name}
                    onChange={(e) => setNewClub({ name: e.target.value })}
                  />
                </div>
                <button
                  onClick={handleAddClub}
                  disabled={clubsSaving === 'new'}
                  className="mt-3 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
                >
                  {clubsSaving === 'new' ? 'Creating...' : 'Create Club'}
                </button>
              </div>
            )}

            {clubs.length === 0 && !clubsLoading ? (
              <div className="text-neutral-500">
                <p>No clubs found. Click "Add Club" to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-500">
                    <tr>
                      <th className="py-2">Club Name</th>
                      <th>Club ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubs.map((c, idx) => (
                      <tr key={c.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                        <td className="py-2">
                          <input 
                            className="w-64 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1" 
                            value={c.name} 
                            onChange={(e) => updateClub(idx, 'name', e.target.value)}
                            onBlur={() => {
                              updateClubField(c.id, 'name', c.name);
                              setClubsSaving(null);
                            }}
                            disabled={clubsSaving === c.id}
                          />
                        </td>
                        <td>
                          <code className="text-xs text-neutral-500">{c.id}</code>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteClub(c.id, c.name)}
                            disabled={deletingClub === c.id}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50"
                            title="Delete club"
                          >
                            {deletingClub === c.id ? (
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
          </>
        )}
      </div>
    </div>
  );
}

