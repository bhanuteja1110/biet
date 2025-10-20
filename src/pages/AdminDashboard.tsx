import { Link } from 'react-router-dom';

const kpis = [
  { label: 'Total Students', value: 1240 },
  { label: 'Pending Fees', value: '₹ 12.5L' },
  { label: 'Active Placements', value: 6 },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="font-semibold">Overview</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {kpis.map(k => (
              <div
                key={k.label}
                className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4 text-center"
              >
                <div className="text-sm text-neutral-500">{k.label}</div>
                <div className="mt-1 text-xl font-semibold">{k.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 md:col-span-2">
          <div className="font-semibold">Admin Actions</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
            <Link to="/fees" className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">
              Manage Fees
            </Link>
            <Link
              to="/announcements"
              className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800"
            >
              Manage Announcements
            </Link>
            <Link
              to="/profile"
              className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800"
            >
              Student Profiles
            </Link>
            <Link
              to="/placements"
              className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800"
            >
              Placements
            </Link>
            <Link
              to="/transport"
              className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800"
            >
              Transport
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="text-center font-semibold text-base text-neutral-600 dark:text-neutral-300 mt-10 pb-6">
        Made with <span className="text-red-500 text-lg animate-pulse">❤️</span> by Students for Admins
      </footer>
    </div>
  );
}


