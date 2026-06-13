import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Video, Plus, Users, Clock, BarChart2, CheckSquare, Calendar, ChevronRight } from 'lucide-react';

interface Meeting {
  _id: string;
  title: string;
  meetingCode: string;
  status: string;
  createdAt: string;
  host: { name: string; avatar: string };
  participants: any[];
}

const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showJoinMeeting, setShowJoinMeeting] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data } = await api.get('/meetings');
      setMeetings(data.meetings);
    } catch (error) {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async () => {
    if (!newMeetingTitle.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }
    try {
      const { data } = await api.post('/meetings', { title: newMeetingTitle });
      toast.success('Meeting created!');
      setShowNewMeeting(false);
      setNewMeetingTitle('');
      // Route to lobby instead of direct meeting
      navigate(`/lobby/${data.meeting.meetingCode}`);
    } catch (error) {
      toast.error('Failed to create meeting');
    }
  };

  const joinMeeting = () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a meeting code');
      return;
    }
    // Route to lobby instead of direct meeting
    navigate(`/lobby/${joinCode.trim().toUpperCase()}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-accent-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]';
    if (status === 'scheduled') return 'bg-primary-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]';
    return 'bg-slate-500';
  };

  return (
    <div className="flex-1 h-screen overflow-auto bg-slate-50 dark:bg-dark-400 p-8 lg:p-12 relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Welcome Banner */}
        <div className="glass-panel rounded-3xl p-8 mb-10 border-l-4 border-l-primary-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 blur-[80px] -mt-20 -mr-20" />
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl shadow-lg">
              👋
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
                Welcome back, {user?.name?.split(' ')[0]}!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg">Ready to make your next meeting more productive?</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <button
            onClick={() => setShowNewMeeting(true)}
            className="group glass-card p-6 flex flex-col items-start gap-4 text-left border border-primary-500/30 hover:border-primary-500/60"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary-500 group-hover:text-slate-900 dark:text-white transition-all duration-300">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">New Meeting</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Create an instant meeting room</p>
            </div>
          </button>
          
          <button
            onClick={() => setShowJoinMeeting(true)}
            className="group glass-card p-6 flex flex-col items-start gap-4 text-left border-white/[0.05]"
          >
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-dark-300 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-slate-200 dark:bg-dark-100 transition-all duration-300 border border-slate-700">
              <Video size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Join Meeting</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Enter a code to join an existing room</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/tasks')}
            className="group glass-card p-6 flex flex-col items-start gap-4 text-left border-white/[0.05]"
          >
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-dark-300 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-slate-200 dark:bg-dark-100 transition-all duration-300 border border-slate-700">
              <CheckSquare size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">My Tasks</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">View and manage your action items</p>
            </div>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Meetings', value: meetings.length, icon: <Calendar size={20} />, bg: 'bg-primary-500/10', color: 'text-primary-400' },
            { label: 'Active Now', value: meetings.filter(m => m.status === 'active').length, icon: <Video size={20} />, bg: 'bg-accent-500/10', color: 'text-accent-400' },
            { label: 'Scheduled', value: meetings.filter(m => m.status === 'scheduled').length, icon: <Clock size={20} />, bg: 'bg-purple-500/10', color: 'text-purple-400' },
            { label: 'Completed', value: meetings.filter(m => m.status === 'ended').length, icon: <BarChart2 size={20} />, bg: 'bg-slate-500/10', color: 'text-slate-600 dark:text-slate-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-5 flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Meetings List */}
        <div className="glass-panel rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Video className="text-primary-500" size={24} />
              Your Recent Meetings
            </h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-dark-300/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/50">
              <div className="w-16 h-16 bg-slate-100 dark:bg-dark-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video size={28} className="text-slate-500" />
              </div>
              <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No meetings yet</h4>
              <p className="text-slate-600 dark:text-slate-400">Create your first meeting to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className="group flex items-center justify-between p-5 bg-white dark:bg-dark-300/40 rounded-2xl border border-slate-700/30 hover:border-primary-500/50 hover:bg-white dark:bg-dark-300/80 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/lobby/${meeting.meetingCode}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${statusColor(meeting.status)}`} />
                    <div>
                      <p className="text-slate-900 dark:text-white font-semibold text-lg mb-0.5 group-hover:text-primary-400 transition-colors">{meeting.title}</p>
                      <p className="text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2">
                        <span className="font-mono text-slate-700 dark:text-slate-300">{meeting.meetingCode}</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full" />
                        {formatDate(meeting.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-sm">
                      <Users size={16} />
                      <span>{meeting.participants?.length || 0}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      meeting.status === 'active' ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' :
                      meeting.status === 'scheduled' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' :
                      'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-700'
                    }`}>
                      {meeting.status}
                    </span>
                    <ChevronRight size={20} className="text-slate-600 group-hover:text-primary-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Meeting Modal */}
      {showNewMeeting && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-dark-400/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="glass-panel p-8 w-full max-w-md rounded-3xl animate-float" style={{ animationDuration: '0.3s', animationName: 'zoomIn' }}>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Create New Meeting</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Meeting Title</label>
              <input
                type="text"
                value={newMeetingTitle}
                onChange={(e) => setNewMeetingTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createMeeting()}
                placeholder="e.g. Weekly Sync"
                autoFocus
                className="w-full px-4 py-3 glass-input"
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowNewMeeting(false)} className="flex-1 py-3 btn-secondary">
                Cancel
              </button>
              <button onClick={createMeeting} className="flex-1 py-3 btn-primary">
                Create & Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Meeting Modal */}
      {showJoinMeeting && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-dark-400/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="glass-panel p-8 w-full max-w-md rounded-3xl animate-float" style={{ animationDuration: '0.3s', animationName: 'zoomIn' }}>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Join Meeting</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Meeting Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && joinMeeting()}
                placeholder="e.g. ABC-DEF-GHI"
                autoFocus
                className="w-full px-4 py-3 glass-input font-mono uppercase"
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowJoinMeeting(false)} className="flex-1 py-3 btn-secondary">
                Cancel
              </button>
              <button onClick={joinMeeting} className="flex-1 py-3 btn-primary">
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;