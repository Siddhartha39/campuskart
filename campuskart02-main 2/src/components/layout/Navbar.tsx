import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { database } from '../../config/firebase';
import { ref, onValue } from 'firebase/database';
import { 
  ShoppingBag, 
  User, 
  Bell, 
  MessageCircle, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, userData, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  // Realtime counters from notifications
  useEffect(() => {
    if (!currentUser) { setNotifCount(0); setMsgCount(0); return; }
    const notifRef = ref(database, `notifications/${currentUser.uid}`);
    const unsub = onValue(notifRef, (snap) => {
      if (!snap.exists()) { setNotifCount(0); setMsgCount(0); return; }
      const data = snap.val();
      let total = 0;
      let msgs = 0;
      Object.keys(data).forEach((k) => {
        const n = data[k];
        if (!n?.read) {
          total += 1;
          if (n?.type === 'message') msgs += 1;
        }
      });
      setNotifCount(total);
      setMsgCount(msgs);
    });
    return () => unsub();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isAdmin) {
    return (
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/admin" className="flex items-center space-x-2">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">CampusKart Admin</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-lg border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">CampusKart</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/notifications" className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <Bell className="h-6 w-6" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center">{notifCount}</span>
              )}
            </Link>
            <Link to="/messages" className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <MessageCircle className="h-6 w-6" />
              {msgCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center">{msgCount}</span>
              )}
            </Link>
            
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userData?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden lg:block">{userData?.name}</span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/notifications"
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </Link>
            <Link
              to="/messages"
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Messages
            </Link>
            <Link
              to="/profile"
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              <User className="h-5 w-5 mr-2" />
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};