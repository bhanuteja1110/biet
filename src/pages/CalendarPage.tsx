import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const locales = {
  'en-US': {
    format,
    parse,
    startOfWeek,
    getDay,
  },
};

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
};

export default function CalendarPage() {
  const { role } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = collection(db, 'events');
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const eventsData: CalendarEvent[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            eventsData.push({
              id: doc.id,
              title: data.title || '',
              start: data.start?.toDate() || new Date(),
              end: data.end?.toDate() || new Date(),
            });
          });
          setEvents(eventsData);
          setLoading(false);
        });
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching events:', error);
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);
  const editable = role === 'teacher' || role === 'admin';

  function addExam() {
    setEvents(prev => [...prev, { id: Date.now().toString(), title: 'Exam: New Subject', start: new Date(), end: new Date() }]);
  }

  if (loading) {
    return (
      <div className="card p-4">
        <div className="text-neutral-500">Loading calendar...</div>
      </div>
    );
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
    </div>
  );
}

