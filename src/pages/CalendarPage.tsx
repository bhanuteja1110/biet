import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../auth/AuthContext';
import { useState } from 'react';

const locales = {
  'en-US': {
    format,
    parse,
    startOfWeek,
    getDay,
  },
};

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const seed = [
  { title: 'Exam: Maths', start: new Date(), end: new Date() },
  { title: 'Holiday', start: new Date(Date.now() + 3 * 24 * 3600 * 1000), end: new Date(Date.now() + 3 * 24 * 3600 * 1000) },
];

export default function CalendarPage() {
  const { role } = useAuth();
  const [events, setEvents] = useState(seed);
  const editable = role === 'teacher' || role === 'admin';

  function addExam() {
    setEvents(prev => [...prev, { title: 'Exam: New Subject', start: new Date(), end: new Date() }]);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Academic Calendar {editable && <span className="text-xs text-neutral-500">(editable)</span>}</div>
        {editable && <button onClick={addExam} className="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm">Add Exam</button>}
      </div>
      <div className="h-[70vh] mt-3">
        <Calendar localizer={localizer} events={events} startAccessor="start" endAccessor="end" />
      </div>
      {editable && <div className="mt-3 text-sm text-neutral-500">Changes are local for demo. Hook up to Firestore to persist.</div>}
    </div>
  );
}


