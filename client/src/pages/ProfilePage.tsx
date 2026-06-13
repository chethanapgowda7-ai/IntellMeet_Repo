import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Shield, Camera, Save } from 'lucide-react';

const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState(user?.avatar || '');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', { name });
      setUser(data.user);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewAvatar(objectUrl);
    
    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const { data } = await api.put('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(data.user);
      toast.success('Avatar updated successfully');
    } catch (error) {
      toast.error('Failed to upload avatar');
      setPreviewAvatar(user?.avatar || ''); // Revert on failure
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 h-screen overflow-auto bg-slate-50 dark:bg-dark-400 p-8 lg:p-12 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">Your Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Avatar Section */}
          <div className="md:col-span-1">
            <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-500" />
              
              <div className="relative group mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-dark-200 bg-white dark:bg-dark-300 shadow-xl relative">
                  {previewAvatar ? (
                    <img src={previewAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-600">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary-500 hover:bg-primary-400 text-slate-900 dark:text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110">
                  <Camera size={18} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
                </label>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{user?.name}</h3>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-dark-300/50 py-1 px-3 rounded-full border border-white/5">
                <Shield size={14} className={user?.role === 'admin' ? 'text-accent-500' : 'text-slate-600 dark:text-slate-400'} />
                <span className="capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
          
          {/* Form Section */}
          <div className="md:col-span-2">
            <div className="glass-panel p-8 rounded-3xl">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Personal Information</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 glass-input"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-11 pr-4 py-3 glass-input opacity-70 cursor-not-allowed bg-slate-100 dark:bg-dark-200"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Email address cannot be changed.</p>
                </div>
                
                <div className="pt-4 border-t border-white/5">
                  <button type="submit" disabled={loading} className="w-full sm:w-auto px-8 py-3 btn-primary flex items-center justify-center gap-2">
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={18} /> Save Changes</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
