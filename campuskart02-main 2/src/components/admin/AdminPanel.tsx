import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ref, push, onValue, remove, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { 
  Users, 
  Calendar, 
  Plus, 
  Trash2,
  MapPin,
  User,
  Mail,
  Phone,
  Ticket,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Package
} from 'lucide-react';
import { Event, User as UserType } from '../../types';
import CollegeSelect from '../common/CollegeSelect';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('events');
  const [users, setUsers] = useState<UserType[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Marketplace items state
  const [marketItems, setMarketItems] = useState<any[]>([]);
  // Colleges admin state
  const [cityInput, setCityInput] = useState('');
  const [collegeInput, setCollegeInput] = useState('');
  const [collegesIndex, setCollegesIndex] = useState<Record<string, { key: string; name: string }[]>>({});

  // Helper: resolve user display name by id
  const getUserName = (uid?: string) => {
    if (!uid) return 'Unknown User';
    const u = users.find((x) => (x as any).id === uid);
    return (u as any)?.name || (u as any)?.displayName || uid;
  };

  // Support ticket resolution state
  const [ticketId, setTicketId] = useState('');
  const [ticketData, setTicketData] = useState<any>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    city: '',
    college: '',
    organizer: '',
    image: '',
    registrationUrl: ''
  });

  useEffect(() => {
    // Load users
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersList = Object.keys(usersData).map(key => ({
          ...usersData[key],
          id: key
        }));
        setUsers(usersList);
      }
    });

    // Load events
    const eventsRef = ref(database, 'events');
    onValue(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const eventsData = snapshot.val();
        const eventsList = Object.keys(eventsData).map(key => ({
          ...eventsData[key],
          id: key
        }));
        setEvents(eventsList);
      }
    });

    // Load marketplace items
    const itemsRef = ref(database, 'items');
    onValue(itemsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter((it: any) => !!it.isActive);
        setMarketItems(list);
      } else {
        setMarketItems([]);
      }
    });

    // Load colleges index
    const collegesRef = ref(database, 'colleges');
    onValue(collegesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setCollegesIndex({});
        return;
      }
      const data = snapshot.val();
      const normalized: Record<string, { key: string; name: string }[]> = {};
      Object.keys(data).forEach((city: string) => {
        const cityObj = data[city] || {};
        const list = Object.keys(cityObj).map((k) => ({ key: k, name: cityObj[k]?.name || cityObj[k] }));
        normalized[city] = list;
      });
      setCollegesIndex(normalized);
    });
  }, []);

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const eventData = {
        ...eventForm,
        createdAt: new Date().toISOString()
      };

      const eventsRef = ref(database, 'events');
      await push(eventsRef, eventData);

      // Reset form
      setEventForm({
        title: '',
        description: '',
        date: '',
        time: '',
        venue: '',
        city: '',
        college: '',
        organizer: '',
        image: '',
        registrationUrl: ''
      });

      alert('Event posted successfully!');
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  const deleteMarketItem = async (item: any) => {
    if (!item?.id) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await remove(ref(database, `items/${item.id}`));
      // Notify the seller
      if (item.sellerId) {
        const notifRef = ref(database, `notifications/${item.sellerId}`);
        await push(notifRef, {
          type: 'admin',
          itemId: item.id,
          text: `Your post "${item.productName || 'your item'}" has been deleted by admin due to violating rules.`,
          createdAt: Date.now(),
          read: false,
        });
      }
      alert('Post deleted and user notified.');
    } catch (err: any) {
      alert('Error deleting post: ' + err.message);
    }
  };

  const deleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const userRef = ref(database, `users/${userId}`);
        await remove(userRef);
        alert('User deleted successfully!');
      } catch (err: any) {
        alert('Error deleting user: ' + err.message);
      }
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const eventRef = ref(database, `events/${eventId}`);
        await remove(eventRef);
        alert('Event deleted successfully!');
      } catch (err: any) {
        alert('Error deleting event: ' + err.message);
      }
    }
  };

  const searchTicket = async () => {
    if (!ticketId.trim()) {
      setTicketError('Please enter a ticket ID');
      return;
    }

    setTicketLoading(true);
    setTicketError('');
    setTicketData(null);

    try {
      // Search through all users' support tickets
      const usersRef = ref(database, 'supportTickets');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const allTickets = snapshot.val();
        let foundTicket = null;
        let foundUserId = null;

        // Search through all users' tickets
        for (const userId in allTickets) {
          const userTickets = allTickets[userId];
          for (const ticketKey in userTickets) {
            const ticket = userTickets[ticketKey];
            if (ticket.ticketId === ticketId.trim()) {
              foundTicket = { ...ticket, key: ticketKey };
              foundUserId = userId;
              break;
            }
          }
          if (foundTicket) break;
        }

        if (foundTicket) {
          // Get user details
          const userRef = ref(database, `users/${foundUserId}`);
          const userSnapshot = await get(userRef);
          const userData = userSnapshot.exists() ? userSnapshot.val() : null;

          setTicketData({
            ...foundTicket,
            userId: foundUserId,
            userData: userData
          });
        } else {
          setTicketError('Ticket not found');
        }
      } else {
        setTicketError('No tickets found in database');
      }
    } catch (error: any) {
      setTicketError('Error searching ticket: ' + error.message);
    } finally {
      setTicketLoading(false);
    }
  };

  const resolveTicket = async (status: 'resolved' | 'rejected') => {
    if (!ticketData) return;

    try {
      const ticketRef = ref(database, `supportTickets/${ticketData.userId}/${ticketData.key}`);
      await update(ticketRef, {
        status: status,
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'admin'
      });

      setTicketData({ ...ticketData, status: status });
      alert(`Ticket ${status} successfully!`);
    } catch (error: any) {
      alert('Error updating ticket: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Control Panel</h1>
          <p className="text-gray-600">Manage users, events, and platform content</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('events')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'events'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="h-5 w-5 inline mr-2" />
                Events & Hackathons
              </button>
              <button
                onClick={() => setActiveTab('market')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'market'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Package className="h-5 w-5 inline mr-2" />
                Marketplace
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="h-5 w-5 inline mr-2" />
                Users Management
              </button>
              <button
                onClick={() => setActiveTab('colleges')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'colleges'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <MapPin className="h-5 w-5 inline mr-2" />
                Colleges
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tickets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Ticket className="h-5 w-5 inline mr-2" />
                Support Tickets
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'events' && (
              <div className="space-y-8">
                {/* Create Event Form */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Plus className="h-6 w-6 mr-2" />
                    Create New Event/Hackathon
                  </h2>

                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleEventSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Event/Hackathon Title *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter event or hackathon title"
                          value={eventForm.title}
                          onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Organizer *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Event organizer"
                          value={eventForm.organizer}
                          onChange={(e) => setEventForm(prev => ({ ...prev, organizer: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date *
                        </label>
                        <input
                          type="date"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={eventForm.date}
                          onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time *
                        </label>
                        <input
                          type="time"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={eventForm.time}
                          onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Venue *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Event venue"
                          value={eventForm.venue}
                          onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <CollegeSelect
                          required
                          value={{ city: (eventForm as any).city || '', college: eventForm.college }}
                          onChange={(val) => setEventForm(prev => ({ ...(prev as any), city: val.city, college: val.college }))}
                          comboMode
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Event Image URL
                        </label>
                        <input
                          type="url"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://example.com/image.jpg"
                          value={eventForm.image}
                          onChange={(e) => setEventForm(prev => ({ ...prev, image: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Registration URL *
                        </label>
                        <input
                          type="url"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://example.com/register"
                          value={eventForm.registrationUrl}
                          onChange={(e) => setEventForm(prev => ({ ...prev, registrationUrl: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        required
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Event description..."
                        value={eventForm.description}
                        onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? 'Creating Event/Hackathon...' : 'Create Event/Hackathon'}
                    </button>
                  </form>
                </div>

                {/* Events List */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">All Events & Hackathons ({events.length})</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                      <div key={event.id} className="bg-white rounded-lg shadow-sm border p-4">
                        {event.image && (
                          <img src={event.image} alt={event.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                        )}
                        <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {event.venue}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {event.date} at {event.time}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">{event.college}</span>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'market' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">All Buy Posts ({marketItems.length})</h2>
                {marketItems.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-lg border">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No marketplace posts found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketItems.map((it) => (
                      <div key={it.id} className="bg-white rounded-lg shadow-sm border p-4">
                        {it.productImage && (
                          <img src={it.productImage} alt={it.productName} className="w-full h-32 object-cover rounded-lg mb-3" />
                        )}
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{it.productName || 'Untitled'}</h3>
                        <div className="text-xs text-gray-600 mb-2">
                          Posted by{' '}
                          {it.sellerId ? (
                            <Link to={`/profile/${it.sellerId}`} className="text-blue-600 hover:underline">
                              {getUserName(it.sellerId)}
                            </Link>
                          ) : (
                            <span>Unknown</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-2 line-clamp-2">{it.type}</div>
                        <div className="flex items-center justify-between mb-2 text-sm">
                          <span className="font-medium text-blue-600">₹{(it.price||0).toLocaleString()}</span>
                          <span className="text-gray-500">{it.sellerCollege || '—'}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-3">{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</div>
                        <div className="flex justify-end">
                          <button onClick={() => deleteMarketItem(it)} className="text-red-600 hover:text-red-800 p-1" title="Delete post">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">All Users ({users.length})</h2>
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            College
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.uid} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-medium">
                                    {user.name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{user.college}</div>
                              <div className="text-sm text-gray-500">{user.city}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{user.mobile}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => deleteUser(user.uid)}
                                className="text-red-600 hover:text-red-900 ml-4"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'colleges' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Plus className="h-5 w-5 mr-2" /> Add College
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter city name"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter college name"
                        value={collegeInput}
                        onChange={(e) => setCollegeInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    onClick={async () => {
                      if (!cityInput.trim() || !collegeInput.trim()) return alert('City and College are required');
                      const city = cityInput.trim();
                      const name = collegeInput.trim();
                      await push(ref(database, `colleges/${city}`), { name });
                      setCollegeInput('');
                    }}
                  >
                    Add
                  </button>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">All Colleges</h2>
                  {Object.keys(collegesIndex).length === 0 ? (
                    <p className="text-gray-500">No colleges added yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {Object.keys(collegesIndex).sort().map((city) => (
                        <div key={city} className="bg-white rounded-lg border p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{city}</h3>
                          </div>
                          <ul className="divide-y">
                            {collegesIndex[city].map((c) => (
                              <li key={c.key} className="py-2 flex items-center justify-between">
                                <span>{c.name}</span>
                                <button
                                  className="text-red-600 hover:text-red-800"
                                  onClick={async () => {
                                    if (!confirm('Delete this college?')) return;
                                    await remove(ref(database, `colleges/${city}/${c.key}`));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="space-y-8">
                {/* Ticket Search */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Search className="h-6 w-6 mr-2" />
                    Search Support Ticket
                  </h2>
                  
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={ticketId}
                        onChange={(e) => setTicketId(e.target.value)}
                        placeholder="Enter 6-digit ticket ID (e.g., 123456)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={searchTicket}
                      disabled={ticketLoading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {ticketLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Search
                    </button>
                  </div>

                  {ticketError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                      {ticketError}
                    </div>
                  )}
                </div>

                {/* Ticket Details */}
                {ticketData && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Ticket className="h-5 w-5" />
                        Ticket #{ticketData.ticketId}
                      </h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        ticketData.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        ticketData.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        ticketData.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticketData.status.charAt(0).toUpperCase() + ticketData.status.slice(1)}
                      </div>
                    </div>

                    {/* User Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          User Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Name:</span>
                            <span className="text-gray-600">{ticketData.userData?.name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-700">Email:</span>
                            <span className="text-gray-600">{ticketData.userData?.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-700">Mobile:</span>
                            <span className="text-gray-600">{ticketData.userData?.mobile || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-700">College:</span>
                            <span className="text-gray-600">{ticketData.userData?.college || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Ticket Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Created:</span>
                            <span className="text-gray-600 ml-2">
                              {new Date(ticketData.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Purpose:</span>
                            <span className="text-gray-600 ml-2">{ticketData.purpose}</span>
                          </div>
                          {ticketData.resolvedAt && (
                            <div>
                              <span className="font-medium text-gray-700">Resolved:</span>
                              <span className="text-gray-600 ml-2">
                                {new Date(ticketData.resolvedAt).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{ticketData.description}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {ticketData.status === 'open' && (
                      <div className="flex gap-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => resolveTicket('resolved')}
                          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark as Resolved
                        </button>
                        <button
                          onClick={() => resolveTicket('rejected')}
                          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          <XCircle className="h-4 w-4" />
                          Mark as Rejected
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};