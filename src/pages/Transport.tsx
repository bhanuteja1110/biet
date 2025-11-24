import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2 } from 'lucide-react';

type Route = {
  id: string;
  route: string;
  origin: string;
  time: string;
  stops: string[];
};

export default function Transport() {
  const { role, user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoute, setNewRoute] = useState({
    route: '',
    origin: '',
    time: '',
    stops: '',
  });

  const editable = role === 'admin';

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'transport', 'routes', 'list'), (snapshot) => {
      const routesData: Route[] = [];
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
      setRoutes(routesData);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching routes:', err);
      setError('Error loading routes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleUpdateRoute(routeId: string, field: 'origin' | 'time', value: string) {
    if (!user || !editable) return;

    setSaving(routeId);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'transport', 'routes', 'list', routeId), {
        [field]: value,
        updatedAt: serverTimestamp(),
      });
      setSaving(null);
    } catch (err: any) {
      console.error('Error updating route:', err);
      setError(`Failed to update: ${err.message}`);
      setSaving(null);
    }
  }

  async function handleUpdateStops(routeId: string, stops: string[]) {
    if (!user || !editable) return;

    setSaving(routeId);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'transport', 'routes', 'list', routeId), {
        stops,
        updatedAt: serverTimestamp(),
      });
      setSaving(null);
    } catch (err: any) {
      console.error('Error updating stops:', err);
      setError(`Failed to update stops: ${err.message}`);
      setSaving(null);
    }
  }

  async function handleAddRoute() {
    if (!user || !editable) return;

    if (!newRoute.route || !newRoute.origin || !newRoute.time) {
      setError('Please fill in route, origin, and time');
      return;
    }

    setSaving('new');
    setError('');
    setSuccess('');

    try {
      const routeId = newRoute.route.toUpperCase().replace(/\s+/g, '-');
      const stops = newRoute.stops.split(',').map(s => s.trim()).filter(s => s.length > 0);

      await setDoc(doc(db, 'transport', 'routes', 'list', routeId), {
        route: newRoute.route,
        origin: newRoute.origin,
        time: newRoute.time,
        stops,
        updatedAt: serverTimestamp(),
      });

      setSuccess(`Route "${newRoute.route}" added successfully!`);
      setNewRoute({ route: '', origin: '', time: '', stops: '' });
      setShowAddForm(false);
      setSaving(null);
    } catch (err: any) {
      console.error('Error adding route:', err);
      setError(err.message || 'Failed to add route');
      setSaving(null);
    }
  }

  async function handleDeleteRoute(routeId: string, routeName: string) {
    if (!user || !editable) return;
    if (!confirm(`Are you sure you want to delete route "${routeName}"?`)) {
      return;
    }

    setDeleting(routeId);
    setError('');
    setSuccess('');

    try {
      await deleteDoc(doc(db, 'transport', 'routes', 'list', routeId));
      setSuccess(`Route "${routeName}" deleted successfully!`);
      setDeleting(null);
    } catch (err: any) {
      console.error('Error deleting route:', err);
      setError(err.message || 'Failed to delete route');
      setDeleting(null);
    }
  }

  function updateLocal(idx: number, key: 'origin' | 'time', value: string) {
    setRoutes(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  }

  function updateStopsLocal(idx: number, stops: string[]) {
    setRoutes(prev => prev.map((r, i) => i === idx ? { ...r, stops } : r));
  }

  if (loading) {
    return (
      <div className="card p-5">
        <div className="text-neutral-500">Loading routes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">
            College Bus Routes
            {editable && <span className="text-xs text-neutral-500 ml-2">(Admin Editable)</span>}
          </div>
          {editable && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm"
            >
              <Plus className="size-4" />
              {showAddForm ? 'Cancel' : 'Add Route'}
            </button>
          )}
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

        {showAddForm && editable && (
          <div className="mb-6 p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
            <div className="font-semibold mb-3">Add New Route</div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                placeholder="Route Name (e.g., R1, R2)"
                value={newRoute.route}
                onChange={(e) => setNewRoute({ ...newRoute, route: e.target.value })}
              />
              <input
                className="rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                placeholder="Origin"
                value={newRoute.origin}
                onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value })}
              />
              <input
                className="rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                placeholder="Departure Time (e.g., 07:15)"
                value={newRoute.time}
                onChange={(e) => setNewRoute({ ...newRoute, time: e.target.value })}
              />
              <input
                className="rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-3 py-2"
                placeholder="Stops (comma-separated, e.g., Stop1, Stop2, Stop3)"
                value={newRoute.stops}
                onChange={(e) => setNewRoute({ ...newRoute, stops: e.target.value })}
              />
            </div>
            <button
              onClick={handleAddRoute}
              disabled={saving === 'new'}
              className="mt-3 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
            >
              {saving === 'new' ? 'Adding...' : 'Add Route'}
            </button>
          </div>
        )}

        {routes.length === 0 ? (
          <div className="mt-3 text-neutral-500">No routes available</div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map((r, idx) => (
              <div key={r.id} className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.route}</div>
                  {editable && (
                    <button
                      onClick={() => handleDeleteRoute(r.id, r.route)}
                      disabled={deleting === r.id}
                      className="p-1 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50"
                      title="Delete route"
                    >
                      {deleting === r.id ? (
                        <span className="text-xs">Deleting...</span>
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  )}
                </div>
                <div className="text-sm">
                  Origin: {editable ? (
                    <input
                      className="ml-2 w-40 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1"
                      value={r.origin}
                      onChange={(e) => {
                        updateLocal(idx, 'origin', e.target.value);
                      }}
                      onBlur={() => {
                        handleUpdateRoute(r.id, 'origin', r.origin);
                        setSaving(null);
                      }}
                      disabled={saving === r.id}
                    />
                  ) : (
                    r.origin
                  )}
                </div>
                <div className="text-sm">
                  Departure: {editable ? (
                    <input
                      className="ml-2 w-28 rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1"
                      value={r.time}
                      onChange={(e) => {
                        updateLocal(idx, 'time', e.target.value);
                      }}
                      onBlur={() => {
                        handleUpdateRoute(r.id, 'time', r.time);
                        setSaving(null);
                      }}
                      disabled={saving === r.id}
                    />
                  ) : (
                    r.time
                  )}
                </div>
                <div className="text-sm">
                  Stops: {editable ? (
                    <div className="mt-1">
                      <input
                        className="w-full rounded-lg bg-transparent border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs"
                        value={r.stops.join(', ')}
                        onChange={(e) => {
                          const stops = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                          updateStopsLocal(idx, stops);
                        }}
                        onBlur={() => {
                          handleUpdateStops(r.id, r.stops);
                          setSaving(null);
                        }}
                        disabled={saving === r.id}
                        placeholder="Comma-separated stops"
                      />
                      {saving === r.id && (
                        <span className="text-xs text-neutral-500 ml-2">Saving...</span>
                      )}
                    </div>
                  ) : (
                    r.stops.length > 0 ? r.stops.join(', ') : '—'
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
