import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { saveTimeTable, getTimeTableByDeptYear, type TimeTable } from '../../utils/firestore';
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

export default function AdminTimeTable() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [rows, setRows] = useState<TimeTable['rows']>([
    { day: 'Mon', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Tue', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Wed', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Thu', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Fri', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
    { day: 'Sat', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch departments
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'departments'), (snapshot) => {
      const depts: Department[] = [];
      snapshot.forEach((doc) => {
        depts.push({ id: doc.id, name: doc.data().name || '' });
      });
      setDepartments(depts);
      if (depts.length > 0 && !selectedDepartmentId) {
        setSelectedDepartmentId(depts[0].id);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch years
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'years'), (snapshot) => {
      const yrs: Year[] = [];
      snapshot.forEach((doc) => {
        yrs.push({ id: doc.id, name: doc.data().name || '' });
      });
      setYears(yrs);
      if (yrs.length > 0 && !selectedYearId) {
        setSelectedYearId(yrs[0].id);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch clubs
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clubs'), (snapshot) => {
      const clubsData: Club[] = [];
      snapshot.forEach((doc) => {
        clubsData.push({ id: doc.id, name: doc.data().name || '' });
      });
      setClubs(clubsData);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all subjects from teachers
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const subjectsSet = new Set<string>();
        
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role === 'teacher' && data.subjects && Array.isArray(data.subjects)) {
            data.subjects.forEach((subject: string) => {
              if (subject && subject.trim()) {
                subjectsSet.add(subject.trim());
              }
            });
          }
        });
        
        setSubjects(Array.from(subjectsSet).sort());
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    };

    fetchSubjects();
  }, []);

  // Fetch timetable when department or year changes
  useEffect(() => {
    if (!selectedDepartmentId || !selectedYearId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchTimetable = async () => {
      try {
        const timetable = await getTimeTableByDeptYear(selectedDepartmentId, selectedYearId);
        if (timetable?.rows) {
          // Ensure all rows have 5 periods and include Saturday
          const normalizedRows = timetable.rows.map(row => {
            // Ensure slots array has 5 items
            const slots = [...row.slots];
            while (slots.length < 5) {
              slots.push({ subject: '', club: '' });
            }
            // Trim to 5 if more than 5
            if (slots.length > 5) {
              slots.splice(5);
            }
            // Ensure each slot has subject and club properties
            return {
              ...row,
              slots: slots.map(slot => ({
                subject: typeof slot === 'string' ? slot : (slot?.subject || ''),
                club: typeof slot === 'string' ? '' : (slot?.club || ''),
              })),
            };
          });

          // Ensure we have all 6 days (Mon-Sat)
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const existingDays = normalizedRows.map(r => r.day);
          const missingDays = days.filter(day => !existingDays.includes(day));
          
          missingDays.forEach(day => {
            normalizedRows.push({
              day,
              slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }],
            });
          });

          // Sort by day order
          normalizedRows.sort((a, b) => {
            const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
          });

          setRows(normalizedRows);
        } else {
          // Default empty timetable with 5 periods and Saturday
          setRows([
            { day: 'Mon', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Tue', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Wed', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Thu', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Fri', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Sat', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
          ]);
        }
        setError('');
      } catch (err: any) {
        console.error('Error fetching timetable:', err);
        setError(err.message || 'Failed to load timetable');
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [selectedDepartmentId, selectedYearId]);

  function updateCell(dayIdx: number, slotIdx: number, field: 'subject' | 'club', value: string) {
    setRows(prev => {
      const next = prev.map(r => ({ ...r, slots: [...r.slots] }));
      next[dayIdx].slots[slotIdx] = {
        ...next[dayIdx].slots[slotIdx],
        [field]: value,
      };
      return next;
    });
  }

  async function handleSave() {
    if (!selectedDepartmentId || !selectedYearId) {
      setError('Please select both department and year');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await saveTimeTable(selectedDepartmentId, selectedYearId, rows);
      alert('Timetable saved successfully!');
    } catch (err: any) {
      console.error('Error saving timetable:', err);
      setError(err.message || 'Failed to save timetable');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !selectedDepartmentId && !selectedYearId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-lg">Manage Timetables</div>
        </div>

        {/* Department and Year Selection */}
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Department</label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500/40"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500/40"
            >
              <option value="">Select Year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
            {error}
          </div>
        )}

        {selectedDepartmentId && selectedYearId && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader />
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="text-sm text-neutral-500 mb-2">
                    Editing timetable for: <span className="font-semibold">
                      {departments.find(d => d.id === selectedDepartmentId)?.name} - {years.find(y => y.id === selectedYearId)?.name}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead className="text-left text-neutral-500">
                      <tr>
                        <th className="py-2">Day</th>
                        <th>Period 1</th>
                        <th>Period 2</th>
                        <th>Period 3</th>
                        <th>Period 4</th>
                        <th>Period 5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, dayIdx) => (
                        <tr key={r.day} className="border-t border-neutral-200/60 dark:border-neutral-800">
                          <td className="py-2 font-medium">{r.day}</td>
                          {r.slots.map((slot, slotIdx) => (
                            <td key={slotIdx} className="py-2">
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-neutral-500 mb-1 block">Subject</label>
                                  <select
                                    value={slot.subject || ''}
                                    onChange={(e) => updateCell(dayIdx, slotIdx, 'subject', e.target.value)}
                                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-sm"
                                  >
                                    <option value="">Select Subject</option>
                                    {subjects.map((subject) => (
                                      <option key={subject} value={subject}>
                                        {subject}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-neutral-500 mb-1 block">Club</label>
                                  <select
                                    value={slot.club || ''}
                                    onChange={(e) => updateCell(dayIdx, slotIdx, 'club', e.target.value)}
                                    className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-sm"
                                  >
                                    <option value="">Select Club</option>
                                    {clubs.map((club) => (
                                      <option key={club.id} value={club.name}>
                                        {club.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Timetable'}
                </button>
              </>
            )}
          </>
        )}

        {(!selectedDepartmentId || !selectedYearId) && !loading && (
          <div className="text-center py-8 text-neutral-500">
            Please select a department and year to manage timetables
          </div>
        )}
      </div>
    </div>
  );
}
