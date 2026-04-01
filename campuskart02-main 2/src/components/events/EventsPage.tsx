import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import CollegeSelect from '../common/CollegeSelect';
import { Event } from '../../types';
import { Calendar as CalendarIcon, MapPin, Search, Filter, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../common/BackButton';

export const EventsPage: React.FC = () => {
  const { userData } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [city, setCity] = useState('');
  const [college, setCollege] = useState('');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const [showFilters, setShowFilters] = useState(true);
  const [autoCollegeApplied, setAutoCollegeApplied] = useState(false);

  useEffect(() => {
    const eventsRef = ref(database, 'events');
    const unsub = onValue(eventsRef, (snapshot) => {
      setLoading(false);
      if (!snapshot.exists()) { setEvents([]); return; }
      const data = snapshot.val();
      const list: Event[] = Object.keys(data).map((k) => ({ id: k, ...data[k] }));
      // sort by date/time desc -> newest first
      list.sort((a, b) => {
        const aDT = new Date(`${a.date} ${a.time || '00:00'}`).getTime();
        const bDT = new Date(`${b.date} ${b.time || '00:00'}`).getTime();
        return bDT - aDT;
      });
      setEvents(list);
    });
    return () => unsub();
  }, []);

  // Auto-apply user's registered college (and city) once
  useEffect(() => {
    if (!autoCollegeApplied && userData?.college) {
      setCollege(userData.college);
      if (userData.city) setCity(userData.city);
      setAutoCollegeApplied(true);
    }
  }, [userData, autoCollegeApplied]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => {
      if (upcomingOnly) {
        const t = new Date(`${e.date} ${e.time || '00:00'}`).getTime();
        if (isFinite(t) && t < now) return false;
      }
      if (city && (e as any).city && (e as any).city !== city) return false;
      if (city && !(e as any).city) {
        // if event lacks city but city filter is set, try to match by college text containing city
        if (!(`${e.college || ''}`.toLowerCase().includes(city.toLowerCase()))) return false;
      }
      if (college && e.college !== college) return false;
      if (date) {
        try { if (new Date(e.date).toDateString() !== new Date(date).toDateString()) return false; } catch {}
      }
      if (query) {
        const q = query.toLowerCase();
        const text = `${e.title} ${e.description} ${e.organizer} ${e.venue} ${e.college}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [events, city, college, query, date, upcomingOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <BackButton toHomeFallback="/dashboard" />
          <h1 className="text-2xl font-bold">Events & Hackathons</h1>
        </div>
        <button
          className="inline-flex items-center justify-center px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 w-full sm:w-auto"
          onClick={() => setShowFilters((s) => !s)}
        >
          {showFilters ? <X className="h-4 w-4 mr-2"/> : <Filter className="h-4 w-4 mr-2"/>}
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
              <CollegeSelect
                value={{ city, college }}
                onChange={(v) => { setCity(v.city); setCollege(v.college); }}
                comboMode
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Title, organizer, venue..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <input id="upcoming" type="checkbox" checked={upcomingOnly} onChange={(e) => setUpcomingOnly(e.target.checked)} />
              <label htmlFor="upcoming" className="text-sm text-gray-700">Show only upcoming</label>
            </div>
            <div className="flex sm:justify-end">
              <button
                className="w-full sm:w-auto text-sm px-3 py-2 rounded-lg border"
                onClick={() => { setCity(''); setCollege(''); setQuery(''); setDate(''); setUpcomingOnly(true); }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <p className="text-gray-500">Loading events...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-600 py-16">
          <p>No events match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow-sm border p-4">
              {event.image && (
                <img src={event.image} alt={event.title} className="w-full h-40 object-cover rounded-lg mb-3" />
              )}
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">{event.title}</h3>
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {event.date} {event.time && `at ${event.time}`}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {event.venue}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-500">{event.college}</span>
                <span className="text-xs text-gray-500">By {event.organizer}</span>
              </div>
              {(event as any).registrationUrl && (
                <a
                  href={(event as any).registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Register Now
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
