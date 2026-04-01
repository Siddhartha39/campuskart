import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, update, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, CheckCircle2, MessageCircle, IndianRupee } from 'lucide-react';
import BackButton from '../common/BackButton';

interface Notif {
  id: string;
  type: 'message' | 'offer' | string;
  chatId?: string;
  fromUserId?: string;
  itemId?: string;
  text?: string;
  offerPrice?: number;
  createdAt?: number;
  read?: boolean;
}

export const NotificationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Record<string, string>>({});

  // load notifications
  useEffect(() => {
    if (!currentUser) return;
    const notifRef = ref(database, `notifications/${currentUser.uid}`);
    return onValue(notifRef, async (snap) => {
      if (!snap.exists()) { setNotifs([]); return; }
      const data = snap.val();
      const list: Notif[] = Object.keys(data).map(k => ({ id: k, ...data[k] }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifs(list);
      // prefetch names and items
      const needNames = Array.from(new Set(list.map(n => n.fromUserId).filter(Boolean))) as string[];
      for (const uid of needNames) {
        if (names[uid]) continue;
        const s = await get(ref(database, `users/${uid}`));
        if (s.exists()) setNames(prev => ({ ...prev, [uid]: s.val()?.name || uid }));
      }
      const needItems = Array.from(new Set(list.map(n => n.itemId).filter(Boolean))) as string[];
      for (const iid of needItems) {
        if (items[iid]) continue;
        const s = await get(ref(database, `items/${iid}`));
        if (s.exists()) setItems(prev => ({ ...prev, [iid]: s.val()?.productName || iid }));
      }
    });
  }, [currentUser]);

  const unread = useMemo(() => notifs.filter(n => !n.read), [notifs]);

  const markRead = async (id: string) => {
    if (!currentUser) return;
    await update(ref(database, `notifications/${currentUser.uid}/${id}`), { read: true });
  };

  const openChat = async (n: Notif) => {
    if (!currentUser) return;
    if (n.id) await markRead(n.id);
    if (n.chatId) navigate(`/messages?chatId=${encodeURIComponent(n.chatId)}`);
  };

  const markAll = async () => {
    if (!currentUser || notifs.length === 0) return;
    const updates: Record<string, any> = {};
    notifs.forEach(n => { if (!n.read) updates[`notifications/${currentUser.uid}/${n.id}/read`] = true; });
    if (Object.keys(updates).length) await update(ref(database), updates);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton toHomeFallback="/dashboard" />
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h2 className="font-semibold">Notifications</h2>
            </div>
          </div>
          {unread.length > 0 && (
            <button onClick={markAll} className="text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">Mark all as read</button>
          )}
        </div>
        <div>
          {notifs.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No notifications yet.</div>
          ) : (
            notifs.map(n => (
              <div key={n.id} className={`px-4 py-3 border-b flex items-start gap-3 ${!n.read ? 'bg-blue-50/40' : ''}`}>
                <div className="mt-0.5">
                  {n.type === 'message' ? <MessageCircle className="h-4 w-4 text-blue-600" /> : <IndianRupee className="h-4 w-4 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    {n.type === 'message' ? (
                      <>
                        <span className="font-medium">Message</span> from <span className="font-medium">{names[n.fromUserId || ''] || 'Someone'}</span>
                        {n.itemId && <> about <span className="font-medium">{items[n.itemId]}</span></>}
                      </>
                    ) : (
                      <>
                        <span className="font-medium">Offer</span> from <span className="font-medium">{names[n.fromUserId || ''] || 'Someone'}</span>
                        {typeof n.offerPrice === 'number' && <>: ₹{n.offerPrice}</>}
                        {n.itemId && <> on <span className="font-medium">{items[n.itemId]}</span></>}
                      </>
                    )}
                  </div>
                  {n.text && <div className="text-xs text-gray-600 truncate">{n.text}</div>}
                  <div className="text-[10px] text-gray-500 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="text-xs px-2 py-1 rounded bg-white border hover:bg-gray-50 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Read
                    </button>
                  )}
                  {n.chatId && (
                    <button onClick={() => openChat(n)} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Open chat</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
