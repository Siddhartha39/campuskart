import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { database } from '../../config/firebase';
import { ref, push, onValue, update, remove } from 'firebase/database';
import { 
  Users, 
  Plus, 
  MessageCircle, 
  Calendar, 
  GraduationCap,
  Target,
  Clock,
  User,
  Edit,
  Trash2
} from 'lucide-react';
import BackButton from '../common/BackButton';

interface RecruitmentPost {
  id: string;
  recruiterId: string;
  recruiterName: string;
  recruiterCollege: string;
  purpose: string;
  maxStudents: number;
  event: string;
  qualities: string;
  years: string[];
  description: string;
  createdAt: number;
  isActive: boolean;
}

export const TeammateFinder: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<RecruitmentPost | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    purpose: '',
    maxStudents: 1,
    event: '',
    qualities: '',
    years: [] as string[],
    description: ''
  });

  const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Any Year'];

  useEffect(() => {
    const postsRef = ref(database, 'recruitmentPosts');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const postsList = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(post => post.isActive)
          .sort((a, b) => b.createdAt - a.createdAt);
        setPosts(postsList);
      } else {
        setPosts([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleYearChange = (year: string) => {
    setFormData(prev => ({
      ...prev,
      years: prev.years.includes(year) 
        ? prev.years.filter(y => y !== year)
        : [...prev.years, year]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData) return;

    try {
      if (editingPost) {
        // Update existing post
        const postRef = ref(database, `recruitmentPosts/${editingPost.id}`);
        await update(postRef, {
          ...formData,
          years: formData.years.length === 0 ? ['Any Year'] : formData.years,
          updatedAt: Date.now()
        });
        setEditingPost(null);
      } else {
        // Create new post
        const postData = {
          recruiterId: currentUser.uid,
          recruiterName: userData.name,
          recruiterCollege: userData.college,
          ...formData,
          years: formData.years.length === 0 ? ['Any Year'] : formData.years,
          createdAt: Date.now(),
          isActive: true
        };
        await push(ref(database, 'recruitmentPosts'), postData);
      }
      
      // Reset form
      setFormData({
        purpose: '',
        maxStudents: 1,
        event: '',
        qualities: '',
        years: [],
        description: ''
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error saving recruitment post:', error);
    }
  };

  const handleEdit = (post: RecruitmentPost) => {
    setEditingPost(post);
    setFormData({
      purpose: post.purpose,
      maxStudents: post.maxStudents,
      event: post.event,
      qualities: post.qualities,
      years: post.years,
      description: post.description
    });
    setShowForm(true);
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this recruitment post?')) return;
    
    try {
      await remove(ref(database, `recruitmentPosts/${postId}`));
    } catch (error) {
      console.error('Error deleting recruitment post:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPost(null);
    setFormData({
      purpose: '',
      maxStudents: 1,
      event: '',
      qualities: '',
      years: [],
      description: ''
    });
  };

  const handleMessage = async (post: RecruitmentPost) => {
    if (!currentUser || post.recruiterId === currentUser.uid) return;

    try {
      // Create or find existing chat
      const chatId = `recruitment_${currentUser.uid}_${post.recruiterId}_${post.id}`;
      
      // Create chat metadata
      await update(ref(database, `chats/${chatId}/meta`), {
        recruitmentPostId: post.id,
        recruitmentPurpose: post.purpose,
        updatedAt: Date.now(),
        lastMessage: 'Started recruitment conversation',
        lastSender: currentUser.uid,
        users: {
          [currentUser.uid]: true,
          [post.recruiterId]: true
        },
        type: 'recruitment'
      });

      // Index chat for both users
      await update(ref(database, `userChats/${currentUser.uid}`), { [chatId]: true });
      await update(ref(database, `userChats/${post.recruiterId}`), { [chatId]: true });

      // Send initial message
      await push(ref(database, `chats/${chatId}/messages`), {
        type: 'recruitment_inquiry',
        text: `Hi! I'm interested in joining your team for "${post.purpose}". Let's discuss!`,
        senderId: currentUser.uid,
        createdAt: Date.now(),
        recruitmentPostId: post.id
      });

      // Send notification to recruiter
      await push(ref(database, `notifications/${post.recruiterId}`), {
        type: 'recruitment_message',
        chatId,
        recruitmentPostId: post.id,
        text: `Someone is interested in your recruitment post: "${post.purpose}"`,
        read: false,
        createdAt: Date.now(),
        from: currentUser.uid
      });

      // Redirect to messages
      window.location.href = `/messages?chatId=${encodeURIComponent(chatId)}`;
    } catch (error) {
      console.error('Error creating recruitment chat:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Loading recruitment posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackButton toHomeFallback="/dashboard" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-8 w-8 text-pink-600" />
                  Teammate Finder
                </h1>
                <p className="text-gray-600 mt-1">Find study partners and project teammates</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Post Recruitment
            </button>
          </div>
        </div>

        {/* Recruitment Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingPost ? 'Edit Recruitment Post' : 'Create Recruitment Post'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="e.g., Hackathon Team, Study Group, Project Partner"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Students Required *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="20"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxStudents: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event/Project Name
                </label>
                <input
                  type="text"
                  value={formData.event}
                  onChange={(e) => setFormData(prev => ({ ...prev, event: e.target.value }))}
                  placeholder="e.g., Smart India Hackathon, Final Year Project"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Qualities/Skills
                </label>
                <input
                  type="text"
                  value={formData.qualities}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualities: e.target.value }))}
                  placeholder="e.g., React, Python, Good communication, Team player"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Academic Years
                </label>
                <div className="flex flex-wrap gap-2">
                  {yearOptions.map((year) => (
                    <label key={year} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.years.includes(year)}
                        onChange={() => handleYearChange(year)}
                        className="mr-2 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-sm text-gray-700">{year}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide more details about what you're looking for, project timeline, expectations, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  {editingPost ? 'Update Recruitment' : 'Post Recruitment'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recruitment Posts */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No recruitment posts yet</h3>
              <p className="text-gray-500 mb-6">Be the first to post a recruitment and find your perfect teammates!</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create First Post
              </button>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/profile/${post.recruiterId}`)}
                      className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors cursor-pointer"
                      title="View recruiter profile"
                    >
                      <User className="h-6 w-6 text-white" />
                    </button>
                    <div>
                      <button
                        onClick={() => navigate(`/profile/${post.recruiterId}`)}
                        className="font-semibold text-gray-900 hover:text-pink-600 transition-colors cursor-pointer"
                        title="View recruiter profile"
                      >
                        {post.recruiterName}
                      </button>
                      <p className="text-sm text-gray-500">{post.recruiterCollege}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                    {currentUser?.uid === post.recruiterId && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(post)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit post"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete post"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5 text-pink-600" />
                    {post.purpose}
                  </h4>
                  {post.event && (
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Event: {post.event}
                    </p>
                  )}
                  <p className="text-gray-700 mb-3">{post.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Need {post.maxStudents} student{post.maxStudents > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{post.years.join(', ')}</span>
                  </div>
                  {post.qualities && (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 truncate">{post.qualities}</span>
                    </div>
                  )}
                </div>

                {currentUser?.uid !== post.recruiterId && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleMessage(post)}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message Recruiter
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
