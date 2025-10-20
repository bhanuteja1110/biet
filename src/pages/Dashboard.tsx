import { useAuth } from '../auth/AuthContext';
import { motion } from 'framer-motion';
import { ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

const attendanceData = [
  { day: 'Mon', value: 80 },
  { day: 'Tue', value: 78 },
  { day: 'Wed', value: 82 },
  { day: 'Thu', value: 76 },
  { day: 'Fri', value: 85 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.displayName ?? 'Student';
  const target = 81; // attendance percent
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const durationMs = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setProgress(Math.round(eased * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="space-y-6 flex flex-col min-h-screen">
      <div className="flex-grow">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Attendance', value: '81%', sub: 'This week', color: 'from-purple-500 to-sky-500' },
            { title: 'Assignments Due', value: '3', sub: 'Next 7 days', color: 'from-emerald-500 to-teal-500' },
            { title: 'Upcoming Exams', value: '2', sub: 'This month', color: 'from-amber-500 to-rose-500' },
          ].map((c) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="card p-5"
            >
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white bg-gradient-to-r ${c.color}`}
              >
                {c.title}
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight">{c.value}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{c.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <div className="card p-5 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Welcome, {name}</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  Bharat Institute of Engineering & Technology (BIET)
                </div>
              </div>
            </div>
            <div className="mt-6 grid place-items-center">
              <div
                className="relative size-48 cursor-pointer"
                title="Click to replay"
                onClick={() => setProgress(0)}
              >
                <svg viewBox="0 0 36 36" className="size-full">
                  <path
                    className="text-neutral-200 dark:text-neutral-800"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32"
                  />
                  <path
                    className="text-indigo-500"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2a16 16 0 1 1 0 32 16 16 0 1 1 0-32"
                    style={{ strokeDasharray: `${progress},100` }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-4xl font-semibold">{progress}%</div>
                    <div className="text-sm text-neutral-500">Attendance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="font-semibold">Notifications</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">Maths assignment due Friday</li>
              <li className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">Lab exam on 28th Oct</li>
              <li className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">Holiday on 2nd Nov</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="text-center font-semibold text-base text-neutral-600 dark:text-neutral-300 mt-10 pb-6">
        Made with <span className="text-red-500 text-lg animate-pulse">❤️</span> by Students for Students
      </footer>
    </div>
  );
}



