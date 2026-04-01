import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../../config/firebase';
import { supabase } from '../../config/supabase';
import { ref, get, update, remove } from 'firebase/database';
import { Item } from '../../types';
import { Camera, Edit3, MapPin, GraduationCap, Package, Plus, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../common/BackButton';

export const ProfilePage: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [userItems, setUserItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: userData?.name || '',
    bio: userData?.bio || '',
    profilePhoto: userData?.profilePhoto || ''
  });
  const [newProfilePhoto, setNewProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  useEffect(() => {
    if (userData) {
      setProfileData({
        name: userData.name,
        bio: userData.bio || '',
        profilePhoto: userData.profilePhoto || ''
      });
    }
    // Fetch items as soon as we know the auth state
    if (currentUser) {
      fetchUserItems();
    } else {
      // No user -> stop local loading to avoid infinite spinner
      setLoading(false);
    }
  }, [currentUser, userData]);

  const fetchUserItems = async () => {
    if (!currentUser) return;
    
    try {
      const itemsRef = ref(database, 'items');
      const snapshot = await get(itemsRef);
      
      if (snapshot.exists()) {
        const allItems = snapshot.val();
        const userItemsList = Object.entries(allItems)
          .filter(([_, item]: [string, any]) => item.sellerId === currentUser.uid)
          .map(([id, item]: [string, any]) => ({ id, ...item }));
        
        setUserItems(userItemsList);
      }
    } catch (error) {
      console.error('Error fetching user items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSold = async (itemId: string) => {
    if (!currentUser) return;
    if (!window.confirm('Mark this item as sold? This will hide it from marketplace.')) return;

    try {
      const itemRef = ref(database, `items/${itemId}`);
      await update(itemRef, { isActive: false, soldAt: Date.now() });
      setUserItems(prev => prev.map(i => i.id === itemId ? { ...i, isActive: false, soldAt: Date.now() } : i));
    } catch (error) {
      console.error('Error marking item as sold:', error);
      alert('Failed to mark item as sold. Please try again.');
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePhoto = async (file: File): Promise<string> => {
    const fileName = `profile-${currentUser?.uid}-${Date.now()}`;
    const bucket = 'profiles';

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    try {
      let photoUrl = profileData.profilePhoto;
      
      if (newProfilePhoto) {
        photoUrl = await uploadProfilePhoto(newProfilePhoto);
      }

      const updatedData = {
        ...profileData,
        profilePhoto: photoUrl
      };

      const userRef = ref(database, `users/${currentUser.uid}`);
      await update(userRef, updatedData);

      setProfileData(updatedData);
      setEditMode(false);
      setNewProfilePhoto(null);
      setPhotoPreview('');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditItem = (itemId: string) => {
    // Navigate to edit item page or open edit modal
    navigate(`/sell?edit=${itemId}`);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const itemRef = ref(database, `items/${itemId}`);
      await remove(itemRef);
      
      // Remove from local state
      setUserItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If auth is ready but userData is missing, show a lightweight setup state
  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <div className="mb-4">
              <BackButton toHomeFallback="/dashboard" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete your profile</h1>
            <p className="text-gray-600 mb-6">We couldn't find your profile details. You can add your name, bio and photo now.</p>
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-8">
          <div className="h-20 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50"/>
          <div className="mb-4 -mt-8 px-8 flex justify-end">
            <BackButton toHomeFallback="/dashboard" />
          </div>
          <div className="px-8 pb-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Photo */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ring-2 ring-white shadow-md">
                {(photoPreview || profileData.profilePhoto) ? (
                  <img 
                    src={photoPreview || profileData.profilePhoto} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl font-bold text-gray-400">
                    {userData.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {editMode && (
                <label className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-full cursor-pointer shadow hover:from-blue-700 hover:to-indigo-700">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              {editMode ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={handleInputChange}
                    className="text-2xl font-bold bg-transparent border-b-2 border-gray-300 focus:border-blue-500 outline-none"
                    placeholder="Your name"
                  />
                  <textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setNewProfilePhoto(null);
                        setPhotoPreview('');
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{userData.name}</h1>
                    <button
                      onClick={() => setEditMode(true)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {userData.bio && (
                    <p className="text-gray-600 mb-4">{userData.bio}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{userData.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{userData.mobile}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>{userData.college}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{userData.city}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-gray-200">
            <div className="text-center rounded-xl p-3 bg-gray-50">
              <div className="text-2xl font-bold text-gray-900">{userItems.length}</div>
              <div className="text-sm text-gray-600">Items Posted</div>
            </div>
            <div className="text-center rounded-xl p-3 bg-gray-50">
              <div className="text-2xl font-bold text-gray-900">{userData.followers?.length || 0}</div>
              <div className="text-sm text-gray-600">Followers</div>
            </div>
            <div className="text-center rounded-xl p-3 bg-gray-50">
              <div className="text-2xl font-bold text-gray-900">{userData.following?.length || 0}</div>
              <div className="text-sm text-gray-600">Following</div>
            </div>
          </div>
        </div>

        {/* Posted Items */}
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6" />
              My Posted Items
            </h2>
            <button
              onClick={() => window.location.href = '/sell'}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
            >
              <Plus className="h-4 w-4" />
              Post New Item
            </button>
          </div>

          {userItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items posted yet</h3>
              <p className="text-gray-600 mb-4">Start selling by posting your first item</p>
              <button
                onClick={() => window.location.href = '/sell'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
              >
                <Plus className="h-5 w-5" />
                Post Your First Item
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-transform duration-200 hover:-translate-y-0.5 bg-white">
                  <div className="aspect-square bg-gray-100 relative">
                    {!item.isActive && (
                      <div className="absolute top-3 left-3 z-10">
                        <span className="px-2 py-1 text-[11px] font-semibold rounded-md bg-gray-900/80 text-white">Sold</span>
                      </div>
                    )}
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.productName}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.type}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">₹{item.price}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {item.isActive ? 'Available' : 'Sold'}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {item.isActive ? (
                        <>
                          <button 
                            onClick={() => handleEditItem(item.id)}
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleMarkAsSold(item.id)}
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                          >
                            Mark as Sold
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
