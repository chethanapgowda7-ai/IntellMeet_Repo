import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Video, CheckSquare, Calendar } from 'lucide-react';

const AnalyticsPage = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get('/analytics/overview');
      setStats(data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) return (
    <div className="h-screen bg-slate-50 dark:bg-dark-400 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex-1 h-screen overflow-auto bg-slate-50 dark:bg-dark-400 p-8 lg:p-12 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Workspace Analytics</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Measure productivity and meeting engagement across your team.</p>
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Meetings', value: stats?.stats?.totalMeetings || 0, icon: <Video />, color: 'text-primary-400', bg: 'bg-primary-500/10' },
            { label: 'Meeting Hours', value: Math.round((stats?.stats?.totalMeetings || 0) * 0.75), icon: <Calendar />, color: 'text-accent-400', bg: 'bg-accent-500/10' },
            { label: 'Tasks Completed', value: stats?.stats?.completedTasks || 0, icon: <CheckSquare />, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Active Users', value: stats?.stats?.totalUsers || 0, icon: <Users />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((item, idx) => (
            <div key={idx} className="glass-panel p-6 rounded-3xl flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.bg} ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{item.label}</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{item.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-panel p-8 rounded-3xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="text-primary-500" /> Meeting Activity (Last 30 Days)
            </h3>
            <div className="h-[300px] w-full">
              {stats?.meetingsPerDay?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.meetingsPerDay}>
                    <XAxis dataKey="_id" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px'}} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">Not enough data to display</div>
              )}
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <CheckSquare className="text-accent-500" /> Tasks by Status
            </h3>
            <div className="h-[300px] w-full">
              {stats?.tasksByStatus?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.tasksByStatus} dataKey="count" nameKey="_id" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {stats.tasksByStatus.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px'}} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">Not enough data to display</div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {stats?.tasksByStatus?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 capitalize">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  {item._id}: {item.count}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
