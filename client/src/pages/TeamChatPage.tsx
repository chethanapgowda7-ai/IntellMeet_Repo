import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import socketService from '../services/socket';
import { Send, Hash, MessageSquare } from 'lucide-react';

interface TeamMessage {
  _id: string;
  sender: { _id: string; name: string; avatar: string };
  content: string;
  createdAt: string;
}

const TeamChatPage = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = socketService.getSocket();

  useEffect(() => {
    if (user?.team) {
      const teamId = typeof user.team === 'object' ? user.team._id : user.team;
      fetchMessages(teamId);
      
      socket?.emit('join-team-room', teamId);
      
      socket?.on('new-team-message', (msg: TeamMessage) => {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      });

      return () => {
        socket?.emit('leave-team-room', teamId);
        socket?.off('new-team-message');
      };
    } else {
      setLoading(false);
    }
  }, [user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchMessages = async (teamId: string) => {
    try {
      const { data } = await api.get(`/team-chat/${teamId}`);
      setMessages(data.messages);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load team messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.team) return;
    const teamId = typeof user.team === 'object' ? user.team._id : user.team;
    
    socket?.emit('send-team-message', {
      teamId,
      senderId: user._id,
      senderName: user.name,
      senderAvatar: user.avatar,
      content: newMessage.trim(),
    });
    
    setNewMessage('');
  };

  if (loading) return (
    <div className="h-screen bg-slate-50 dark:bg-dark-400 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user?.team) return (
    <div className="flex-1 h-screen overflow-auto bg-slate-50 dark:bg-dark-400 p-8 lg:p-12 relative flex items-center justify-center">
      <div className="text-center glass-panel p-12 rounded-3xl max-w-md w-full">
        <MessageSquare size={48} className="text-slate-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Team Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Join a team workspace to access team chat.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-dark-400 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <div className="h-20 border-b border-white/5 flex items-center px-8 bg-white dark:bg-dark-300/50 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
            <Hash size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">general</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">Team workspace chat</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 z-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <MessageSquare size={48} className="mb-4 opacity-50" />
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((msg, idx) => {
              const isMe = msg.sender._id === user._id;
              const showAvatar = idx === 0 || messages[idx - 1].sender._id !== msg.sender._id;
              
              return (
                <div key={msg._id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {showAvatar ? (
                    <img 
                      src={msg.sender.avatar || `https://ui-avatars.com/api/?name=${msg.sender.name}`} 
                      alt={msg.sender.name} 
                      className="w-10 h-10 rounded-full object-cover shrink-0" 
                    />
                  ) : (
                    <div className="w-10 shrink-0" />
                  )}
                  
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {showAvatar && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{msg.sender.name}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <div className={`px-5 py-3 rounded-2xl ${
                      isMe 
                        ? 'bg-primary-600 text-slate-900 dark:text-white rounded-tr-sm' 
                        : 'bg-slate-100 dark:bg-dark-200 border border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-white dark:bg-dark-300/50 backdrop-blur-md border-t border-white/5 z-10 shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message the team..."
            className="w-full bg-slate-100 dark:bg-dark-200 border border-white/10 rounded-xl pl-4 pr-14 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 top-2 bottom-2 w-10 bg-primary-500 hover:bg-primary-400 text-slate-900 dark:text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default TeamChatPage;
