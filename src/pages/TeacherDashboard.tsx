import { Link } from 'react-router-dom';

const classes = [
  { name: 'CSE - 1st Year', students: 62, pendingAssignments: 3 },
  { name: 'IT - 1st Year', students: 58, pendingAssignments: 2 },
];

export default function TeacherDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5"><div className="font-semibold">Your Classes</div>
          <ul className="mt-3 space-y-2 text-sm">
            {classes.map(c => (
              <li key={c.name} className="flex items-center justify-between rounded-xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2">
                <span>{c.name}</span>
                <span className="text-neutral-500">{c.students} students</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5 md:col-span-2">
          <div className="font-semibold">Quick Actions</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/assignments" className="px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center">Create Assignment</Link>
            <Link to="/announcements" className="px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center">Post Announcement</Link>
            <Link to="/marks" className="px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center">Update Marks</Link>
            <Link to="/attendance" className="px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center">Mark Attendance</Link>
          </div>
        </div>
      </div>
    </div>
  );
}


