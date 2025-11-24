import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';
import { getTimeTableByDeptYear, getUserProfile, type TimeTable } from '../utils/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Loader from '../components/Loader';

export default function TimeTable() {
  const { role, user } = useAuth();
  const [rows, setRows] = useState<TimeTable['rows']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [departmentName, setDepartmentName] = useState<string>('');
  const [yearName, setYearName] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const userProfile = await getUserProfile(user.uid);
        
        // Get department and year IDs from user profile
        const departmentId = userProfile?.department || '';
        const yearId = userProfile?.year || '';
        
        if (departmentId && yearId) {
          // Fetch department name
          try {
            const deptDoc = await getDoc(doc(db, 'departments', departmentId));
            if (deptDoc.exists()) {
              setDepartmentName(deptDoc.data().name || '');
            }
          } catch (err) {
            console.error('Error fetching department:', err);
          }
          
          // Fetch year name
          try {
            const yearDoc = await getDoc(doc(db, 'years', yearId));
            if (yearDoc.exists()) {
              setYearName(yearDoc.data().name || '');
            }
          } catch (err) {
            console.error('Error fetching year:', err);
          }
          
          // Fetch timetable by department and year
          console.log('[TimeTable] Fetching timetable for:', { departmentId, yearId });
          const timetable = await getTimeTableByDeptYear(departmentId, yearId);
          console.log('[TimeTable] Timetable fetched:', timetable);
          if (timetable?.rows) {
            // Normalize timetable rows to handle both old and new format
            const normalizedRows = timetable.rows.map(row => {
              const slots = row.slots.map(slot => {
                if (typeof slot === 'string') {
                  // Old format: just a string
                  return { subject: slot, club: '' };
                }
                // New format: object with subject and club
                return {
                  subject: slot?.subject || '',
                  club: slot?.club || '',
                };
              });
              // Ensure 5 periods
              while (slots.length < 5) {
                slots.push({ subject: '', club: '' });
              }
              if (slots.length > 5) {
                slots.splice(5);
              }
              return { ...row, slots };
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
        } else {
          // No department/year assigned
          setRows([
            { day: 'Mon', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Tue', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Wed', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Thu', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Fri', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
            { day: 'Sat', slots: [{ subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }, { subject: '', club: '' }] },
          ]);
          if (role !== 'admin') {
            setError('No timetable available. Please contact admin to assign department and year.');
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching timetable:', error);
        setError('Failed to load timetable. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [user, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">
            Time Table
            {departmentName && yearName && (
              <span className="text-xs text-neutral-500 ml-2">
                ({departmentName} - {yearName})
              </span>
            )}
          </div>
          {role === 'admin' && (
            <a
              href="/admin/timetable"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
            >
              Manage Timetables →
            </a>
          )}
        </div>
        {error && (
          <div className="mb-3 p-3 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-sm">
            {error}
          </div>
        )}
        {rows.length === 0 ? (
          <div className="text-neutral-500">No timetable available</div>
        ) : (
          <div className="overflow-x-auto">
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
                {rows.map((r) => (
                  <tr key={r.day} className="border-t border-neutral-200/60 dark:border-neutral-800">
                    <td className="py-2 font-medium">{r.day}</td>
                    {r.slots.map((slot, slotIdx) => {
                      const slotData = typeof slot === 'string' 
                        ? { subject: slot, club: '' } 
                        : { subject: slot?.subject || '', club: slot?.club || '' };
                      return (
                        <td key={slotIdx} className="py-2">
                          <div className="space-y-1">
                            {slotData.subject && (
                              <div className="font-medium">{slotData.subject}</div>
                            )}
                            {slotData.club && (
                              <div className="text-xs text-neutral-500">Club: {slotData.club}</div>
                            )}
                            {!slotData.subject && !slotData.club && '—'}
                          </div>
                        </td>
                      );
                    })}
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
