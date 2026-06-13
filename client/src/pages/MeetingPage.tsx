import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  MessageSquare, Monitor, Hand, Users, X, Send,
  FileText, Shield, Disc
} from 'lucide-react';

interface Participant {
  socketId: string;
  userId: string;
  userName: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isHandRaised?: boolean;
}

interface ChatMessage {
  _id?: string;
  sender: { _id: string; name: string; avatar?: string };
  content: string;
  createdAt: string;
}

const MeetingPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'participants'>('none');
  
  // Media prefs from Lobby
  const initialAudio = location.state?.audioEnabled ?? true;
  const initialVideo = location.state?.videoEnabled ?? true;

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(!initialAudio);
  const [isCameraOff, setIsCameraOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUser, setTypingUser] = useState('');
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    let ignore = false;
    const initializeMeeting = async () => {
      try {
        const { data } = await api.get(`/meetings/${code}`);
        if (ignore) return;
        setMeeting(data.meeting);

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (ignore) { stream.getTracks().forEach(t => t.stop()); return; }

        localStreamRef.current = stream;
        
        // Apply initial prefs
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        if (videoTrack) videoTrack.enabled = initialVideo;
        if (audioTrack) audioTrack.enabled = initialAudio;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const { data: msgData } = await api.get(`/chat/${data.meeting._id}`);
        if (ignore) return;
        setMessages(msgData.messages);

        connectSocket();
        setIsLoading(false);
      } catch (error) {
        if (!ignore) {
          toast.error('Failed to join meeting.');
          navigate('/dashboard');
        }
      }
    };

    initializeMeeting();
    return () => { ignore = true; cleanup(); };
  }, [code]);

  useEffect(() => {
    if (activePanel === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activePanel]);

  const connectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
    }
    
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { forceNew: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-meeting', { meetingCode: code, userId: user?._id, userName: user?.name });
    });

    socket.on('existing-participants', (existingParticipants: Participant[]) => {
      existingParticipants.forEach((p) => {
        if (p.socketId !== socket.id) createPeerConnection(p.socketId, true);
      });
      setParticipants(existingParticipants.filter(p => p.socketId !== socket.id));
    });

    socket.on('user-joined', ({ socketId, userId, userName }: any) => {
      toast(`${userName} joined`, { icon: '👋' });
      setParticipants(prev => {
        if (prev.find(p => p.socketId === socketId)) return prev;
        return [...prev, { socketId, userId, userName }];
      });
    });

    socket.on('user-left', ({ socketId }: any) => {
      setParticipants(prev => {
        const leaving = prev.find(p => p.socketId === socketId);
        if (leaving) toast(`${leaving.userName} left`);
        return prev.filter(p => p.socketId !== socketId);
      });
      const pc = peerConnectionsRef.current.get(socketId);
      if (pc) { pc.close(); peerConnectionsRef.current.delete(socketId); }
    });

    socket.on('webrtc-offer', async ({ offer, fromSocketId }: any) => {
      const pc = peerConnectionsRef.current.get(fromSocketId) || createPeerConnection(fromSocketId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { answer, targetSocketId: fromSocketId, fromSocketId: socket.id });
      
      if ((pc as any).iceQueue) {
        for (const candidate of (pc as any).iceQueue) await pc.addIceCandidate(candidate);
        (pc as any).iceQueue = null;
      }
    });

    socket.on('webrtc-answer', async ({ answer, fromSocketId }: any) => {
      const pc = peerConnectionsRef.current.get(fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        if ((pc as any).iceQueue) {
          for (const candidate of (pc as any).iceQueue) await pc.addIceCandidate(candidate);
          (pc as any).iceQueue = null;
        }
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate, fromSocketId }: any) => {
      const pc = peerConnectionsRef.current.get(fromSocketId);
      if (pc && candidate) {
        if (pc.remoteDescription?.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        } else {
          if (!(pc as any).iceQueue) (pc as any).iceQueue = [];
          (pc as any).iceQueue.push(new RTCIceCandidate(candidate));
        }
      }
    });

    socket.on('new-message', (message: ChatMessage) => setMessages(prev => [...prev, message]));
    socket.on('user-typing', ({ userName }: any) => { setTypingUser(userName); setTimeout(() => setTypingUser(''), 2000); });
    
    socket.on('user-mute-changed', ({ userId, isMuted }) => {
      setParticipants(prev => prev.map(p => p.userId === userId ? { ...p, isMuted } : p));
    });
    
    socket.on('user-camera-changed', ({ userId, isCameraOff }) => {
      setParticipants(prev => prev.map(p => p.userId === userId ? { ...p, isCameraOff } : p));
    });

    socket.on('hand-raised', ({ userId, userName }) => {
      toast(`${userName} raised their hand`, { icon: '✋' });
      setParticipants(prev => prev.map(p => p.userId === userId ? { ...p, isHandRaised: true } : p));
      setTimeout(() => {
        setParticipants(prev => prev.map(p => p.userId === userId ? { ...p, isHandRaised: false } : p));
      }, 5000);
    });

    socket.on('you-were-muted', () => {
      toast('The host muted your microphone', { icon: '🔇' });
      const audioTrack = localStreamRef.current?.getAudioTracks()[0];
      if (audioTrack && audioTrack.enabled) {
        audioTrack.enabled = false;
        setIsMuted(true);
      }
    });
  };

  const createPeerConnection = (targetSocketId: string, shouldOffer: boolean) => {
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current.set(targetSocketId, pc);

    localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        if (!remoteStream.getTracks().includes(track)) remoteStream.addTrack(track);
      });
      const newStream = new MediaStream(remoteStream.getTracks());
      setParticipants(prev => prev.map(p => p.socketId === targetSocketId ? { ...p, stream: newStream } : p));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc-ice-candidate', { candidate: event.candidate, targetSocketId, fromSocketId: socketRef.current?.id });
      }
    };

    if (shouldOffer) {
      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('webrtc-offer', { offer, targetSocketId, fromSocketId: socketRef.current?.id });
      });
    }
    return pc;
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      socketRef.current?.emit('toggle-mute', { meetingCode: code, userId: user?._id, isMuted: !audioTrack.enabled });
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
      socketRef.current?.emit('toggle-camera', { meetingCode: code, userId: user?._id, isCameraOff: !videoTrack.enabled });
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
        socketRef.current?.emit('screen-share-started', { meetingCode: code, userId: user?._id });
      } catch {
        toast.error('Screen sharing denied');
      }
    } else {
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      peerConnectionsRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      });
      setIsScreenSharing(false);
      socketRef.current?.emit('screen-share-stopped', { meetingCode: code, userId: user?._id });
    }
  };

  const raiseHand = () => {
    setIsHandRaised(true);
    socketRef.current?.emit('raise-hand', { meetingCode: code, userId: user?._id, userName: user?.name });
    setTimeout(() => setIsHandRaised(false), 5000);
  };

  const forceMute = (targetUserId: string) => {
    socketRef.current?.emit('force-mute', { meetingCode: code, targetUserId });
  };

  const generateSummary = async () => {
    const t = toast.loading('Generating AI summary & extracting tasks...');
    try {
      await api.post(`/ai/summarize/${code}`, { transcript: 'Dummy transcript for now' });
      await api.post(`/meetings/${code}/convert-actions`);
      toast.success('Summary generated and tasks created', { id: t });
    } catch {
      toast.error('Failed to generate summary', { id: t });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !meeting) return;
    socketRef.current?.emit('send-message', {
      meetingCode: code, meetingId: meeting._id,
      senderId: user?._id, senderName: user?.name, senderAvatar: user?.avatar,
      content: newMessage.trim(),
    });
    setNewMessage('');
  };

  const leaveMeeting = () => {
    socketRef.current?.emit('leave-meeting', { meetingCode: code, userId: user?._id });
    cleanup();
    navigate('/dashboard');
  };

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    socketRef.current?.disconnect();
  };

  useEffect(() => {
    if (!isLoading && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-dark-400 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/10 blur-[150px] rounded-full pointer-events-none animate-pulse-slow" />
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Joining secure room...</h3>
      </div>
    );
  }

  const isHost = meeting?.host === user?._id;

  return (
    <div className="h-screen bg-slate-50 dark:bg-dark-400 flex flex-col relative overflow-hidden text-slate-700 dark:text-slate-300">
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary-600/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      
      {/* Header */}
      <header className="h-16 px-6 py-2 flex items-center justify-between border-b border-white/5 bg-white dark:bg-dark-300/80 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
            <span className="text-sm">🤖</span>
          </div>
          <div>
            <h2 className="text-slate-900 dark:text-white font-bold tracking-tight text-lg leading-tight">{meeting?.title}</h2>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
              <span className="bg-slate-100 dark:bg-dark-200 px-2 py-0.5 rounded border border-white/5">{code}</span>
              <span className="flex items-center gap-1 text-primary-400">
                <Users size={12} /> {participants.length + 1}
              </span>
              {isRecording && <span className="flex items-center gap-1 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> REC</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isHost && (
            <button onClick={generateSummary} className="btn-secondary py-2 px-3 text-xs flex items-center gap-2 border-primary-500/30 text-primary-400 hover:bg-primary-500/10">
              <FileText size={14} /> Generate Summary
            </button>
          )}
          <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            Secure <Shield size={12} />
          </div>
        </div>
      </header>

      {/* Main Grid & Sidebars */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className={`grid gap-4 h-full min-h-[400px] ${
            participants.length === 0 ? 'grid-cols-1 md:px-20 lg:px-40 xl:px-60' :
            participants.length === 1 ? 'grid-cols-2' :
            participants.length <= 3 ? 'grid-cols-2 lg:grid-cols-2' : 
            participants.length <= 5 ? 'grid-cols-3' : 'grid-cols-4'
          }`}>
            {/* Local Video */}
            <div className="relative rounded-2xl overflow-hidden glass-panel border border-white/5 shadow-2xl transition-all duration-300">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror-mode bg-dark-900" style={{ transform: 'scaleX(-1)' }} />
              
              {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-dark-300">
                  <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-dark-100 flex items-center justify-center text-slate-900 dark:text-white text-3xl font-bold shadow-lg border border-white/5">
                    {user?.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : user?.name?.charAt(0)}
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-3 left-3 bg-slate-50 dark:bg-dark-400/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 shadow-lg">
                <span className="text-slate-900 dark:text-white text-sm font-medium">You</span>
                {isMuted && <MicOff size={14} className="text-red-400" />}
                {isHandRaised && <Hand size={14} className="text-yellow-400 animate-bounce" />}
              </div>
            </div>

            {/* Remote Videos */}
            {participants.map((p) => (
              <div key={p.socketId} className="relative rounded-2xl overflow-hidden glass-panel border border-white/5 shadow-2xl transition-all duration-300">
                {p.stream && !p.isCameraOff ? (
                  <video autoPlay playsInline ref={(el) => { if (el) el.srcObject = p.stream!; }} className="w-full h-full object-cover bg-dark-900" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-dark-300">
                    <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-dark-100 flex items-center justify-center text-slate-900 dark:text-white text-3xl font-bold shadow-lg border border-white/5">
                      {p.userName?.charAt(0)}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-slate-50 dark:bg-dark-400/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 shadow-lg">
                  <span className="text-slate-900 dark:text-white text-sm font-medium">{p.userName}</span>
                  {p.isMuted && <MicOff size={14} className="text-red-400" />}
                  {p.isHandRaised && <Hand size={14} className="text-yellow-400 animate-bounce" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panels */}
        {activePanel === 'chat' && (
          <div className="w-80 flex-shrink-0 glass-panel rounded-none border-l border-t-0 border-b-0 border-white/5 flex flex-col animate-slide-in-right z-20">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                <MessageSquare size={18} className="text-primary-500" /> In-Meeting Chat
              </h3>
              <button onClick={() => setActivePanel('none')} className="text-slate-500 hover:text-slate-900 dark:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender._id === user?._id ? 'items-end' : 'items-start'}`}>
                  {msg.sender._id !== user?._id && <span className="text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium ml-1">{msg.sender.name}</span>}
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender._id === user?._id ? 'bg-primary-600 text-slate-900 dark:text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-dark-200 text-slate-800 dark:text-slate-200 border border-white/5 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {typingUser && <p className="text-slate-500 text-xs italic ml-2">{typingUser} is typing...</p>}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-4 border-t border-white/5">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); socketRef.current?.emit('typing', { meetingCode: code, userName: user?.name }); }}
                  placeholder="Type a message..."
                  className="w-full glass-input py-3 pr-12 text-sm"
                />
                <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 top-1.5 bottom-1.5 w-8 bg-primary-500 hover:bg-primary-400 text-slate-900 dark:text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
                  <Send size={14} className="ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {activePanel === 'participants' && (
          <div className="w-80 flex-shrink-0 glass-panel rounded-none border-l border-t-0 border-b-0 border-white/5 flex flex-col animate-slide-in-right z-20">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                <Users size={18} className="text-accent-500" /> Participants
              </h3>
              <button onClick={() => setActivePanel('none')} className="text-slate-500 hover:text-slate-900 dark:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-dark-300/50 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-slate-900 dark:text-white text-sm font-bold">
                    {user?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">You {isHost && <span className="text-xs text-primary-400 ml-1">(Host)</span>}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  {isMuted ? <MicOff size={16} className="text-red-400" /> : <Mic size={16} />}
                  {isCameraOff ? <VideoOff size={16} className="text-red-400" /> : <Video size={16} />}
                </div>
              </div>

              {participants.map(p => (
                <div key={p.socketId} className="flex items-center justify-between p-3 hover:bg-white dark:bg-dark-300/30 rounded-xl border border-transparent transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-dark-100 flex items-center justify-center text-slate-900 dark:text-white text-sm font-bold border border-white/5">
                      {p.userName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{p.userName}</p>
                      {p.isHandRaised && <span className="text-xs text-yellow-400">Hand raised</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    {p.isMuted ? <MicOff size={16} className="text-red-400" /> : <Mic size={16} />}
                    {p.isCameraOff ? <VideoOff size={16} className="text-red-400" /> : <Video size={16} />}
                    {isHost && !p.isMuted && (
                      <button onClick={() => forceMute(p.userId)} className="opacity-0 group-hover:opacity-100 p-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-all" title="Mute user">
                        <MicOff size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {isHost && (
              <div className="p-4 border-t border-white/5">
                <button className="w-full py-2 btn-secondary text-sm">Mute All</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-white dark:bg-dark-300/80 backdrop-blur-md border-t border-white/5 flex items-center justify-center px-6 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={toggleMute} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${isMuted ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20' : 'bg-slate-200 dark:bg-dark-100 text-slate-700 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:text-white border border-white/5'}`}>
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button onClick={toggleCamera} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${isCameraOff ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20' : 'bg-slate-200 dark:bg-dark-100 text-slate-700 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:text-white border border-white/5'}`}>
            {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>

          <button onClick={toggleScreenShare} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${isScreenSharing ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30' : 'bg-slate-200 dark:bg-dark-100 text-slate-700 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:text-white border border-white/5'}`}>
            <Monitor size={22} />
          </button>
          
          <div className="w-px h-8 bg-white/10 mx-2" />

          <button onClick={raiseHand} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${isHandRaised ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-slate-200 dark:bg-dark-100 text-slate-700 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:text-white border border-white/5'}`}>
            <Hand size={22} />
          </button>

          <button onClick={() => setIsRecording(!isRecording)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-slate-200 dark:bg-dark-100 text-slate-700 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:text-white border border-white/5'}`}>
            <Disc size={22} />
          </button>

          <div className="w-px h-8 bg-white/10 mx-2" />

          <button onClick={() => setActivePanel(activePanel === 'participants' ? 'none' : 'participants')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg relative ${activePanel === 'participants' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-slate-200 dark:bg-dark-100 text-slate-700 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:text-white border border-white/5'}`}>
            <Users size={22} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-slate-200 dark:bg-dark-100 border border-white/10 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {participants.length + 1}
            </span>
          </button>

          <button onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${activePanel === 'chat' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-slate-200 dark:bg-dark-100 text-slate-700 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:text-white border border-white/5'}`}>
            <MessageSquare size={22} />
          </button>

          <button onClick={leaveMeeting} className="w-16 h-12 rounded-2xl flex items-center justify-center bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white transition-all duration-300 shadow-[0_0_15px_rgba(220,38,38,0.4)] ml-4">
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingPage;