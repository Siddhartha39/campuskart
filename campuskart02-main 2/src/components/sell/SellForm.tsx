import React, { useState } from 'react';
import { ref, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Upload, DollarSign, Package, Tag, Info, Phone, CheckCircle } from 'lucide-react';
import BackButton from '../common/BackButton';

export const SellForm: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    productName: '',
    type: '',
    price: '',
    category: 'gadgets' as 'gadgets' | 'books' | 'stationary' | 'other',
    condition: 'new' as 'new' | 'like new' | 'used',
    description: '',
    showMobileNumber: false
  });
  
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { value: 'gadgets', label: 'Gadgets' },
    { value: 'books', label: 'Books' },
    { value: 'stationary', label: 'Stationary' },
    { value: 'other', label: 'Other' }
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like new', label: 'Like New' },
    { value: 'used', label: 'Used' }
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const sanitizeFileName = (name: string) => {
    return name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '_');
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const safeName = sanitizeFileName(file.name);
      const fileName = `${Date.now()}-${safeName}`;
      const bucket = 'images';

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error?.message || error);
      throw new Error('Image upload failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Please log in to post an item.');
      return;
    }
    if (!userData) {
      setError('Your profile is still loading. Please wait a moment and try again.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let imageUrl = '';
      
      if (image) {
        try {
          imageUrl = await uploadImage(image);
        } catch (uploadError) {
          setError('Failed to upload image. Please try again.');
          setLoading(false);
          return;
        }
      } else {
        setError('Please select an image for your product.');
        setLoading(false);
        return;
      }
      
      const itemData = {
        sellerId: currentUser.uid,
        sellerName: userData.name,
        sellerCollege: userData.college,
        sellerMobile: userData.mobile || '',
        productName: formData.productName,
        productImage: imageUrl,
        type: formData.type,
        price: parseInt(formData.price),
        category: formData.category,
        condition: formData.condition,
        description: formData.description,
        showMobileNumber: formData.showMobileNumber,
        isActive: true,
        isSold: false,
        createdAt: new Date().toISOString()
      };
      
      const itemsRef = ref(database, 'items');
      await push(itemsRef, itemData);
      
      // Reset form after successful submission
      setFormData({
        productName: '',
        type: '',
        price: '',
        category: 'gadgets',
        condition: 'new',
        description: '',
        showMobileNumber: false
      });
      setImage(null);
      setImagePreview('');
      
      navigate('/buy');
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError('An error occurred while submitting the form. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sell Your Item</h1>
              <p className="text-gray-600">Post your item for sale on CampusKart</p>
            </div>
            <BackButton toHomeFallback="/dashboard" />
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setImagePreview('');
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Click to upload product image</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      Choose Image
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="productName"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product name"
                  value={formData.productName}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Type *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="type"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Laptop, Textbook, Notebook"
                  value={formData.type}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Price and Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (₹) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="price"
                    required
                    min="1"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  required
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition *
              </label>
              <div className="grid grid-cols-3 gap-4">
                {conditions.map(condition => (
                  <label key={condition.value} className="relative">
                    <input
                      type="radio"
                      name="condition"
                      value={condition.value}
                      checked={formData.condition === condition.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer text-center transition-all ${
                      formData.condition === condition.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <span className="font-medium">{condition.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <Info className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  name="description"
                  rows={4}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add details about your item..."
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Show Mobile Number */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="showMobileNumber"
                name="showMobileNumber"
                checked={formData.showMobileNumber}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-gray-500" />
                <label htmlFor="showMobileNumber" className="text-sm font-medium text-gray-700">
                  Show my mobile number to potential buyers
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading || !currentUser || !userData}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Posting Item...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Post Item for Sale
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};