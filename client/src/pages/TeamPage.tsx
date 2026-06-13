import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Users, UserPlus, Settings, Shield, Trash2, Mail } from 'lucide-react';

const TeamPage = () => {
  const { user } = useAuthStore();
  const [team, setTeam] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      if (!user?.team) {
        setLoading(false);
        return;
      }
      const teamId = typeof user.team === 'object' ? user.team._id : user.team;
      const { data } = await api.get(`/teams/${teamId}`);
      setTeam(data.team);
    } catch (error) {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post(`/teams/${team._id}/invite`, { email: inviteEmail });
      toast.success('Invitation sent');
      setInviteEmail('');
    } catch (error) {
      toast.error('Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await api.delete(`/teams/${team._id}/members/${userId}`);
      setTeam((prev: any) => ({ ...prev, members: prev.members.filter((m: any) => m.user._id !== userId) }));
      toast.success('Member removed');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  if (loading) return (
    <div className="h-screen bg-slate-50 dark:bg-dark-400 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!team) return (
    <div className="flex-1 h-screen overflow-auto bg-slate-50 dark:bg-dark-400 p-8 lg:p-12 relative flex items-center justify-center">
      <div className="text-center glass-panel p-12 rounded-3xl max-w-md w-full">
        <Users size={48} className="text-slate-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Team Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">You are not currently part of any workspace team.</p>
        <button className="btn-primary px-8 py-3 w-full">Create Workspace</button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 h-screen overflow-auto bg-slate-50 dark:bg-dark-400 p-8 lg:p-12 relative">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">{team.name}</h1>
            <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Users size={16} /> {team.members?.length || 0} Members
            </p>
          </div>
          {team.admin === user?._id && (
            <button className="btn-secondary flex items-center gap-2">
              <Settings size={18} /> Workspace Settings
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Members List */}
          <div className="lg:col-span-2 glass-panel p-8 rounded-3xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Team Members</h3>
            <div className="space-y-4">
              {team.members?.map((member: any) => (
                <div key={member.user._id} className="flex items-center justify-between p-4 bg-white dark:bg-dark-300/40 rounded-xl border border-white/5 hover:border-primary-500/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={member.user.avatar || `https://ui-avatars.com/api/?name=${member.user.name}&background=random`} alt={member.user.name} className="w-12 h-12 rounded-full object-cover" />
                      {member.user.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-dark-300 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                        {member.user.name}
                        {team.admin === member.user._id && (
                          <span className="bg-primary-500/20 text-primary-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-primary-500/30">
                            <Shield size={10} /> Admin
                          </span>
                        )}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{member.user.email}</p>
                    </div>
                  </div>
                  {team.admin === user?._id && team.admin !== member.user._id && (
                    <button onClick={() => handleRemoveMember(member.user._id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite Section */}
          {team.admin === user?._id && (
            <div className="lg:col-span-1">
              <div className="glass-panel p-8 rounded-3xl sticky top-8">
                <div className="w-12 h-12 bg-accent-500/10 text-accent-500 rounded-2xl flex items-center justify-center mb-6">
                  <UserPlus size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invite Members</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">Add new members to your workspace to collaborate.</p>
                
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        className="w-full pl-11 pr-4 py-3 glass-input text-sm"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={inviting} className="w-full py-3 btn-primary text-sm flex justify-center items-center gap-2">
                    {inviting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send Invitation'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamPage;
