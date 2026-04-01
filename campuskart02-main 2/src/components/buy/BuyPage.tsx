import React, { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Grid, List, MapPin, Calendar, Heart, Package, MessageCircle, Phone as PhoneIcon, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../common/BackButton';

export const BuyPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [collegeSearch, setCollegeSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [autoCollegeApplied, setAutoCollegeApplied] = useState(false);
  const [contactItem, setContactItem] = useState<any | null>(null);

  const categories = [
    { value: 'all', label: 'All Items' },
    { value: 'gadgets', label: 'Gadgets' },
    { value: 'books', label: 'Books' },
    { value: 'stationary', label: 'Stationary' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    const itemsRef = ref(database, 'items');
    const usersRef = ref(database, 'users');
    
    const unsubscribe = onValue(itemsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const itemsData = snapshot.val();
        
        // Get users data to check holiday mode
        const usersSnapshot = await get(usersRef);
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        
        const itemsList = Object.keys(itemsData)
          .map(key => ({ ...itemsData[key], id: key }))
          .filter(item => {
            if (!item.isActive) return false;
            
            // Check if seller is in holiday mode
            const seller = usersData[item.sellerId];
            if (seller?.holidayMode?.isActive) {
              const now = new Date();
              const fromDate = new Date(seller.holidayMode.fromDate);
              const toDate = new Date(seller.holidayMode.toDate);
              
              // Hide items if current date is within holiday period
              if (now >= fromDate && now <= toDate) {
                return false;
              }
            }
            
            return true;
          });
        setItems(itemsList);
      } else {
        setItems([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-apply user's registered college as initial filter once
  useEffect(() => {
    if (!autoCollegeApplied && userData?.college) {
      setSelectedCollege(userData.college);
      setAutoCollegeApplied(true);
    }
  }, [userData, autoCollegeApplied]);

  // Get unique colleges from items
  const availableColleges = Array.from(new Set(items.map(item => item.sellerCollege)))
    .filter(college => college && college.toLowerCase().includes(collegeSearch.toLowerCase()))
    .sort();

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesCollege = selectedCollege === 'all' || item.sellerCollege === selectedCollege;
      return matchesSearch && matchesCategory && matchesCollege;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default: // newest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Browse Items</h1>
              <p className="text-gray-600 mt-1">Discover amazing deals from your campus community</p>
            </div>
            
            {/* Back + Search */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <BackButton toHomeFallback="/dashboard" />
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-3 w-full">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>

            {/* College typeahead filter */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search college..."
                value={collegeSearch}
                onChange={(e) => setCollegeSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {collegeSearch && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-white rounded-md shadow-lg border">
                  {availableColleges.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">No matches</div>
                  ) : (
                    availableColleges.map((college) => (
                      <button
                        type="button"
                        key={college}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setSelectedCollege(college);
                          setCollegeSearch('');
                          setAutoCollegeApplied(true);
                        }}
                      >
                        {college}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedCollege !== 'all' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <span className="truncate max-w-[14rem]">{selectedCollege}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCollege('all');
                    setCollegeSearch('');
                    setAutoCollegeApplied(true);
                  }}
                  aria-label="Clear college filter"
                  className="ml-1 text-blue-700 hover:text-blue-900"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
          </p>
        </div>

        {/* Items Grid/List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/item/${item.id}`)}
                className={`bg-white rounded-2xl shadow-sm border hover:shadow-lg transition-all cursor-pointer group ${
                  viewMode === 'list' ? 'flex gap-6 p-6' : 'overflow-hidden'
                }`}
              >
                <div className={viewMode === 'list' ? 'w-48 h-32 flex-shrink-0' : 'aspect-square'}>
                  <img
                    src={item.productImage || 'https://via.placeholder.com/300x300?text=No+Image'}
                    alt={item.productName}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                
                <div className={viewMode === 'list' ? 'flex-1' : 'p-4'}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {item.productName}
                    </h3>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded">
                      <Heart className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{item.type}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-blue-600">₹{item.price.toLocaleString()}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.condition === 'new' ? 'bg-green-100 text-green-800' :
                      item.condition === 'like new' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.condition}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{item.sellerCollege}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button
                      className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                      onClick={(e) => { e.stopPropagation(); navigate(`/item/${item.id}`); }}
                    >
                      See Details
                    </button>
                    <button
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2"
                      onClick={(e) => { e.stopPropagation(); setContactItem(item); }}
                    >
                      <MessageCircle className="h-4 w-4" /> Contact Seller
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {contactItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setContactItem(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Contact Seller</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Choose how you want to reach the seller for "{contactItem.productName}".</p>
            <div className="space-y-3">
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => {
                  setContactItem(null);
                  navigate(`/messages?userId=${encodeURIComponent(contactItem.sellerId)}&itemId=${encodeURIComponent(contactItem.id)}`);
                }}
              >
                <MessageCircle className="h-5 w-5" /> Message Seller
              </button>
              {contactItem.showMobileNumber && contactItem.sellerMobile && (
                <a
                  href={`tel:${contactItem.sellerMobile}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200"
                  onClick={() => setContactItem(null)}
                >
                  <PhoneIcon className="h-5 w-5" /> Call {contactItem.sellerMobile}
                </a>
              )}
            </div>
            <button
              className="mt-6 w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              onClick={() => setContactItem(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};