import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../../config/firebase';
import { ref, onValue } from 'firebase/database';
import { 
  ShoppingCart, 
  Plus, 
  Calendar, 
  Vault, 
  Users, 
  TrendingUp,
  Heart,
  Package,
  HelpCircle,
  Mail,
  Ticket,
  History
} from 'lucide-react';

import { SupportTicketModal } from '../support/SupportTicketModal';
import { SupportTicketHistory } from '../support/SupportTicketHistory';

export const Dashboard: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const [soldCount, setSoldCount] = useState<number>(0);
  const [sellingCount, setSellingCount] = useState<number>(0);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showTicketHistory, setShowTicketHistory] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setSoldCount(0);
      setSellingCount(0);
      return;
    }
    const itemsRef = ref(database, 'items');
    const off = onValue(itemsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setSoldCount(0);
        setSellingCount(0);
        return;
      }
      const all = snapshot.val() as Record<string, any>;
      const soldItems = Object.values(all).filter((item: any) => item.sellerId === currentUser.uid && item.isActive === false).length;
      const activeItems = Object.values(all).filter((item: any) => item.sellerId === currentUser.uid && item.isActive === true).length;
      setSoldCount(soldItems);
      setSellingCount(activeItems);
    });
    return () => off();
  }, [currentUser?.uid]);

  const menuItems = [
    {
      icon: Plus,
      title: 'Sell Item',
      description: 'Post an item for sale',
      link: '/sell',
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-green-600'
    },
    {
      icon: ShoppingCart,
      title: 'Buy Item',
      description: 'Browse items for sale',
      link: '/buy',
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-blue-600'
    },
    {
      icon: Calendar,
      title: 'Events & Hackathons',
      description: 'Discover campus events and hackathons',
      link: '/events',
      color: 'bg-purple-500 hover:bg-purple-600',
      textColor: 'text-purple-600'
    },
    {
      icon: Vault,
      title: 'CampusVault',
      description: 'Secure storage solutions',
      link: '/vault',
      color: 'bg-orange-500 hover:bg-orange-600',
      textColor: 'text-orange-600'
    },
    {
      icon: Users,
      title: 'Teammate Finder',
      description: 'Find study partners',
      link: '/teammates',
      color: 'bg-pink-500 hover:bg-pink-600',
      textColor: 'text-pink-600'
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      description: 'Get help and raise tickets',
      link: '#',
      color: 'bg-indigo-500 hover:bg-indigo-600',
      textColor: 'text-indigo-600',
      isSupport: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {userData?.name}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              {userData?.college}
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-white mr-3" />
                  <div>
                    <p className="text-sm text-blue-100">Items Sold</p>
                    <p className="text-2xl font-bold">{soldCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="flex items-center">
                  <Heart className="h-8 w-8 text-white mr-3" />
                  <div>
                    <p className="text-sm text-blue-100">Followers</p>
                    <p className="text-2xl font-bold">{userData?.followers?.length || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-white mr-3" />
                  <div>
                    <p className="text-sm text-blue-100">Items Selling</p>
                    <p className="text-2xl font-bold">{sellingCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => (
            item.isSupport ? (
              <div
                key={index}
                className="group bg-white rounded-2xl shadow-sm border hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="p-8">
                  <div className={`inline-flex p-3 rounded-xl ${item.color} mb-4 group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                  
                  {/* Support Actions */}
                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => setShowTicketModal(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      <Ticket className="h-4 w-4" />
                      Raise Ticket
                    </button>
                    <button
                      onClick={() => setShowTicketHistory(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                    >
                      <History className="h-4 w-4" />
                      View History
                    </button>
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <a href="mailto:helpdesk.campuskart@gmail.com" className="text-blue-600 hover:text-blue-700">
                        helpdesk.campuskart@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={index}
                to={item.link}
                className="group bg-white rounded-2xl shadow-sm border hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-8">
                  <div className={`inline-flex p-3 rounded-xl ${item.color} mb-4 group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                  <div className="mt-4 flex items-center text-sm">
                    <span className={`font-medium ${item.textColor}`}>Get started</span>
                    <span className={`ml-1 ${item.textColor} group-hover:translate-x-1 transition-transform`}>→</span>
                  </div>
                </div>
              </Link>
            )
          ))}
        </div>


        {/* Recent Activity */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
              <p className="text-gray-500 mb-4">Start by posting an item or browsing the marketplace</p>
              <Link
                to="/sell"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post Your First Item
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Support Modals */}
      <SupportTicketModal 
        isOpen={showTicketModal} 
        onClose={() => setShowTicketModal(false)} 
      />
      <SupportTicketHistory 
        isOpen={showTicketHistory} 
        onClose={() => setShowTicketHistory(false)} 
      />
    </div>
  );
};