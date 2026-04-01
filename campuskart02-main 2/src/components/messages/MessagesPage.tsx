import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ref, onValue, push, update, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, IndianRupee, Users } from 'lucide-react';
import BackButton from '../common/BackButton';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const { currentUser } = useAuth();

  const sellerId = query.get('userId') || '';
  const itemId = query.get('itemId') || '';
  const chatIdParam = query.get('chatId') || '';
  const [item, setItem] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatMeta, setChatMeta] = useState<any | null>(null);
  const [myChats, setMyChats] = useState<{ chatId: string; meta?: any; counterpartId?: string; counterpartName?: string; itemName?: string; isSeller?: boolean; isRecruitment?: boolean; recruitmentPurpose?: string }[]>([]);
  const [tab, setTab] = useState<'buying' | 'selling' | 'recruitment'>('buying');
  const [text, setText] = useState('');
  const [offer, setOffer] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const chatId = useMemo(() => {
    if (chatIdParam) return chatIdParam;
    if (!currentUser?.uid || !sellerId) return '';
    const a = currentUser.uid < sellerId ? currentUser.uid : sellerId;
    const b = currentUser.uid < sellerId ? sellerId : currentUser.uid;
    return itemId ? `${a}_${b}_${itemId}` : `${a}_${b}`;
  }, [currentUser, sellerId, itemId, chatIdParam]);

  useEffect(() => {
    if (!itemId) return;
    const itemRef = ref(database, `items/${itemId}`);
    return onValue(itemRef, (snap) => setItem(snap.val()));
  }, [itemId]);

  // Subscribe to selected chat meta and messages
  useEffect(() => {
    if (!chatId) return;
    const metaRef = ref(database, `chats/${chatId}/meta`);
    const offMeta = onValue(metaRef, (snap) => setChatMeta(snap.val() || null));
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const offMsgs = onValue(messagesRef, (snap) => {
      if (!snap.exists()) { setMessages([]); return; }
      const data = snap.val();
      const list = Object.keys(data).map(k => ({ id: k, ...data[k] })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(list);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    });
    return () => { if (typeof offMeta === 'function') offMeta(); if (typeof offMsgs === 'function') offMsgs(); };
  }, [chatId]);

  // Mark notifications for this chat as read when viewing it
  useEffect(() => {
    const markChatNotificationsRead = async () => {
      if (!currentUser?.uid || !chatId) return;
      const notifSnap = await get(ref(database, `notifications/${currentUser.uid}`));
      if (!notifSnap.exists()) return;
      const data = notifSnap.val();
      const updates: Record<string, any> = {};
      Object.keys(data).forEach((k) => {
        const n = data[k];
        if (n?.chatId === chatId && !n?.read) {
          updates[`notifications/${currentUser.uid}/${k}/read`] = true;
        }
      });
      if (Object.keys(updates).length) await update(ref(database), updates);
    };
    markChatNotificationsRead();
  }, [currentUser?.uid, chatId]);

  // Load my chat list with meta and counterpart info
  useEffect(() => {
    if (!currentUser?.uid) return;
    const myRef = ref(database, `userChats/${currentUser.uid}`);
    return onValue(myRef, async (snap) => {
      if (!snap.exists()) { setMyChats([]); return; }
      const ids = Object.keys(snap.val());
      const rows: { chatId: string; meta?: any; counterpartId?: string; counterpartName?: string; itemName?: string; isSeller?: boolean; isRecruitment?: boolean; recruitmentPurpose?: string }[] = [];
      for (const id of ids) {
        // fetch meta
        const metaSnap = await get(ref(database, `chats/${id}/meta`));
        const meta = metaSnap.exists() ? metaSnap.val() : {};
        // resolve counterpart uid
        let counterpartId: string | undefined = undefined;
        if (meta?.users) {
          const keys = Object.keys(meta.users);
          counterpartId = keys.find((k: string) => k !== currentUser.uid);
        }
        // fetch counterpart name
        let counterpartName: string | undefined = undefined;
        if (counterpartId) {
          const uSnap = await get(ref(database, `users/${counterpartId}`));
          counterpartName = uSnap.exists() ? (uSnap.val()?.name || counterpartId) : counterpartId;
        }
        // item name if present
        let itemName: string | undefined = undefined;
        let isSeller = false;
        let isRecruitment = false;
        let recruitmentPurpose: string | undefined = undefined;
        
        if (meta?.type === 'recruitment') {
          isRecruitment = true;
          recruitmentPurpose = meta?.recruitmentPurpose || 'Recruitment';
        } else if (meta?.itemId) {
          const iSnap = await get(ref(database, `items/${meta.itemId}`));
          const iv = iSnap.exists() ? iSnap.val() : null;
          itemName = iv?.productName || '';
          if (iv?.sellerId && currentUser?.uid) {
            isSeller = iv.sellerId === currentUser.uid;
          }
        }
        rows.push({ chatId: id, meta, counterpartId, counterpartName, itemName, isSeller, isRecruitment, recruitmentPurpose });
      }
      // sort by updatedAt desc
      rows.sort((a, b) => (b.meta?.updatedAt || 0) - (a.meta?.updatedAt || 0));
      setMyChats(rows);
    });
  }, [currentUser?.uid]);

  const send = async (payload: any) => {
    if (!currentUser || !chatId) return;
    const msgRef = ref(database, `chats/${chatId}/messages`);
    await push(msgRef, payload);
    const usersMap = chatMeta?.users || (sellerId ? { [currentUser.uid]: true, [sellerId]: true } : { [currentUser.uid]: true });
    await update(ref(database, `chats/${chatId}/meta`), {
      itemId: itemId || null,
      updatedAt: Date.now(),
      lastMessage: payload.type === 'offer' ? `Offer: ₹${payload.offerPrice}` : payload.text || '',
      lastSender: currentUser.uid,
      users: usersMap
    });
    // index chat for all participants
    await update(ref(database, `userChats/${currentUser.uid}`), { [chatId]: true });
    const participantIds = Object.keys(usersMap).filter(u => u !== currentUser.uid);
    for (const uid of participantIds) {
      await update(ref(database, `userChats/${uid}`), { [chatId]: true });
    }
    // Notification for recipient
    let recipient: string | undefined = undefined;
    const candidateIds = usersMap ? Object.keys(usersMap) : [];
    recipient = candidateIds.find(k => k !== currentUser.uid);
    if (recipient && recipient !== currentUser.uid) {
      await push(ref(database, `notifications/${recipient}`), {
        type: payload.type === 'offer' ? 'offer' : 'message',
        chatId,
        itemId: itemId || null,
        text: payload.type === 'offer' ? `New offer: ₹${payload.offerPrice}` : (payload.text || ''),
        read: false,
        createdAt: Date.now(),
        from: currentUser.uid
      });
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    await send({ type: 'text', text: text.trim(), senderId: currentUser?.uid, createdAt: Date.now() });
    setText('');
  };

  const handleOffer = async () => {
    const price = parseInt(offer, 10);
    if (!price || price <= 0) return;
    await send({ type: 'offer', offerPrice: price, senderId: currentUser?.uid, createdAt: Date.now() });
    setOffer('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden grid grid-cols-1 md:grid-cols-3">
          {/* Sidebar */}
          <div className="border-r md:col-span-1">
            <div className="p-4 border-b flex items-center gap-3">
              <BackButton toHomeFallback="/dashboard" />
              <h2 className="font-semibold">Chats</h2>
            </div>
            <div className="px-3 pt-3">
              <div className="inline-flex text-sm rounded-lg border overflow-hidden">
                <button
                  className={`px-3 py-1.5 ${tab === 'buying' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                  onClick={() => setTab('buying')}
                >Buying</button>
                <button
                  className={`px-3 py-1.5 border-l ${tab === 'selling' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                  onClick={() => setTab('selling')}
                >Selling</button>
                <button
                  className={`px-3 py-1.5 border-l ${tab === 'recruitment' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                  onClick={() => setTab('recruitment')}
                >Recruitment</button>
              </div>
            </div>
            <div className="p-2 max-h-[70vh] overflow-y-auto">
              {myChats.length === 0 ? (
                <p className="text-sm text-gray-500 px-2 py-4">No conversations yet.</p>
              ) : (
                myChats
                  .filter(c => {
                    if (tab === 'recruitment') return c.isRecruitment;
                    if (tab === 'selling') return !c.isRecruitment && c.isSeller;
                    return !c.isRecruitment && !c.isSeller;
                  })
                  .map(c => (
                  <button
                    key={c.chatId}
                    onClick={() => navigate(`/messages?chatId=${encodeURIComponent(c.chatId)}`)}
                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 ${chatId === c.chatId ? 'bg-gray-50' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); if (c.counterpartId) navigate(`/profile/${c.counterpartId}`); }}
                      title="Open profile"
                      className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium shrink-0"
                    >
                      {(c.counterpartName || 'U').charAt(0).toUpperCase()}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); if (c.counterpartId) navigate(`/profile/${c.counterpartId}`); }}
                          className="font-medium truncate text-left hover:underline"
                          title="Open profile"
                        >
                          {c.counterpartName || c.chatId}
                        </button>
                        {c.meta?.updatedAt && (
                          <div className="text-[10px] text-gray-500 ml-2 whitespace-nowrap">{new Date(c.meta.updatedAt).toLocaleTimeString()}</div>
                        )}
                      </div>
                      {c.itemName && (
                        <div className="text-[11px] text-gray-500 truncate">{c.isSeller ? 'Selling' : 'Buying'} · {c.itemName}</div>
                      )}
                      {c.isRecruitment && c.recruitmentPurpose && (
                        <div className="text-[11px] text-pink-600 truncate flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Recruitment · {c.recruitmentPurpose}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 truncate">{c.meta?.lastMessage || 'Start chatting'}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="md:col-span-2 flex flex-col">
            <div className="p-4 border-b">
              {(() => {
                const cur = myChats.find(m => m.chatId === chatId);
                const name = cur?.counterpartName || 'Chat';
                return (
                  <div>
                    <button
                      type="button"
                      onClick={() => { if (cur?.counterpartId) navigate(`/profile/${cur.counterpartId}`); }}
                      className="font-semibold hover:underline text-left"
                      title="Open profile"
                    >
                      {name}
                    </button>
                    {cur?.isRecruitment && cur?.recruitmentPurpose && (
                      <p className="text-xs text-pink-600 flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        Recruitment: {cur.recruitmentPurpose}
                      </p>
                    )}
                  </div>
                );
              })()}
              {item && <p className="text-xs text-gray-500">Item: {item.productName}</p>}
            </div>
            <div className="p-4 space-y-3 flex-1 min-h-[50vh] max-h-[65vh] overflow-y-auto">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-3 py-2 rounded-lg text-sm ${m.senderId === currentUser?.uid ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {m.type === 'offer' ? (
                      <div className="flex items-center gap-1"><IndianRupee className="h-4 w-4" /> Offer: {m.offerPrice}</div>
                    ) : m.type === 'recruitment_inquiry' ? (
                      <div className="flex items-center gap-1"><Users className="h-4 w-4" /> {m.text}</div>
                    ) : (
                      <span>{m.text}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="p-4 border-t space-y-3">
              {(() => {
                const cur = myChats.find(m => m.chatId === chatId);
                return !cur?.isRecruitment && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Offer price (₹)"
                      className="w-40 px-3 py-2 border rounded-lg"
                      value={offer}
                      onChange={(e) => setOffer(e.target.value)}
                    />
                    <button onClick={handleOffer} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Send Offer</button>
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message"
                  className="flex-1 px-3 py-2 border rounded-lg"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                />
                <button onClick={handleSend} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Send className="h-4 w-4" /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
