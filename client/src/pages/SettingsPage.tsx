import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Lock, Bell, Shield, Save } from 'lucide-react';

const SettingsPage = () => {
  const { user, setUser } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [prefs, setPrefs] = useState({
    meetingInvites: user?.notificationPrefs?.meetingInvites ?? true,
    taskAssignments: user?.notificationPrefs?.taskAssignments ?? true,
    mentions: user?.notificationPrefs?.mentions ?? true,
    actionItems: user?.notificationPrefs?.actionItems ?? true,
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.put('/users/password', { currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handlePrefsChange = async () => {
    try {
      const { data } = await api.put('/users/notifications', { notificationPrefs: prefs });
      setUser(data.user);
      toast.success('Preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    }
  };

  return (
    <div className="flex-1 h-screen overflow-auto bg-slate-50 dark:bg-dark-400 p-8 lg:p-12 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">Account Settings</h1>
        
        <div className="space-y-8">
          {/* Security */}
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary-500" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Lock className="text-primary-500" />
              Security & Password
            </h3>
            
            {user?.authProvider === 'google' ? (
              <div className="bg-white dark:bg-dark-300/50 p-6 rounded-2xl border border-white/5 flex items-start gap-4">
                <Shield className="text-accent-500 mt-1" />
                <div>
                  <h4 className="text-slate-900 dark:text-white font-medium mb-1">Managed by Google</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Your account uses Google Single Sign-On. You cannot change your password here.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full px-4 py-3 glass-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-4 py-3 glass-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 glass-input" />
                </div>
                <button type="submit" disabled={loading} className="py-3 px-6 btn-primary flex items-center gap-2">
                  <Save size={18} /> Update Password
                </button>
              </form>
            )}
          </div>
          
          {/* Notifications */}
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent-500" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Bell className="text-accent-500" />
              Notification Preferences
            </h3>
            
            <div className="space-y-4 max-w-2xl">
              {[
                { id: 'meetingInvites', label: 'Meeting Invitations', desc: 'When someone invites you to a meeting' },
                { id: 'taskAssignments', label: 'Task Assignments', desc: 'When you are assigned a new task or action item' },
                { id: 'mentions', label: 'Mentions', desc: 'When you are mentioned in a team chat or meeting notes' },
                { id: 'actionItems', label: 'AI Action Items', desc: 'When AI extracts an action item for you post-meeting' }
              ].map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-white dark:bg-dark-300/40 rounded-xl border border-white/5">
                  <div>
                    <h4 className="text-slate-900 dark:text-white font-medium">{item.label}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={(prefs as any)[item.id]} 
                      onChange={(e) => setPrefs({ ...prefs, [item.id]: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-100 dark:bg-dark-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-500 shadow-inner"></div>
                  </label>
                </div>
              ))}
              <div className="pt-4">
                <button onClick={handlePrefsChange} className="py-3 px-6 btn-secondary">Save Preferences</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
