import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Video, VideoOff, Mic, MicOff, ChevronLeft, Shield, Users } from 'lucide-react';

const LobbyPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Media states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Devices
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchMeetingDetails();
    initMedia();
    
    return () => {
      // Cleanup stream when unmounting
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [code]);

  // Handle stream updates
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle device change
  useEffect(() => {
    if (selectedCamera || selectedMic) {
      getSpecificStream();
    }
  }, [selectedCamera, selectedMic]);

  const fetchMeetingDetails = async () => {
    try {
      const { data } = await api.get(`/meetings/${code}`);
      setMeeting(data.meeting);
    } catch (error) {
      toast.error('Failed to load meeting details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const initMedia = async () => {
    try {
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(initialStream);
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioDevices = devices.filter(d => d.kind === 'audioinput');
      
      setCameras(videoDevices);
      setMics(audioDevices);
      
      if (videoDevices.length > 0) setSelectedCamera(videoDevices[0].deviceId);
      if (audioDevices.length > 0) setSelectedMic(audioDevices[0].deviceId);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Could not access camera or microphone');
      setVideoEnabled(false);
      setAudioEnabled(false);
    }
  };

  const getSpecificStream = async () => {
    if (!selectedCamera && !selectedMic) return;
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const constraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : false,
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : false,
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      // Sync toggle states with actual tracks
      const videoTrack = newStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];
      
      if (videoTrack) videoTrack.enabled = videoEnabled;
      if (audioTrack) audioTrack.enabled = audioEnabled;
      
    } catch (error) {
      console.error('Error getting specific stream:', error);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  const handleJoin = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    navigate(`/meeting/${code}`, { state: { audioEnabled, videoEnabled } });
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-dark-400 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-400 p-6 md:p-12 relative flex items-center justify-center">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-600/20 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-6xl w-full z-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors mb-8 group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Camera Preview */}
          <div className="lg:col-span-8">
            <div className="glass-panel p-4 rounded-3xl relative overflow-hidden">
              <div className="aspect-video bg-dark-900 rounded-2xl overflow-hidden relative border border-white/5">
                {videoEnabled ? (
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover mirror-mode"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-dark-300">
                    <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-dark-100 flex items-center justify-center mb-4 border border-white/5 shadow-2xl">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">{user?.name?.charAt(0)}</span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Camera is off</p>
                  </div>
                )}
                
                {/* Overlay controls inside video frame */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-50 dark:bg-dark-400/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                  <button 
                    onClick={toggleAudio}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${audioEnabled ? 'bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white' : 'bg-red-500/80 hover:bg-red-500 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}
                  >
                    {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                  </button>
                  <button 
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${videoEnabled ? 'bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white' : 'bg-red-500/80 hover:bg-red-500 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}
                  >
                    {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                  </button>
                </div>
              </div>

              {/* Device Selection */}
              <div className="mt-6 px-2 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Video size={14} /> Camera
                  </label>
                  <select 
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="w-full glass-input py-2.5 text-sm"
                  >
                    {cameras.map(cam => (
                      <option key={cam.deviceId} value={cam.deviceId} className="bg-white dark:bg-dark-300">
                        {cam.label || `Camera ${cam.deviceId.substring(0,5)}...`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Mic size={14} /> Microphone
                  </label>
                  <select 
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="w-full glass-input py-2.5 text-sm"
                  >
                    {mics.map(mic => (
                      <option key={mic.deviceId} value={mic.deviceId} className="bg-white dark:bg-dark-300">
                        {mic.label || `Microphone ${mic.deviceId.substring(0,5)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Meeting Info & Join */}
          <div className="lg:col-span-4 flex flex-col justify-center">
            <div className="glass-panel p-8 rounded-3xl text-center">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{meeting?.title}</h2>
              <p className="text-slate-600 dark:text-slate-400 font-mono mb-8 bg-white dark:bg-dark-300/50 py-2 px-4 rounded-lg inline-block border border-white/5">
                {meeting?.meetingCode}
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 text-sm justify-center">
                  <Shield size={18} className="text-primary-500" />
                  End-to-end encrypted
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 text-sm justify-center">
                  <Users size={18} className="text-accent-500" />
                  {meeting?.participants?.length || 0} participants waiting
                </div>
              </div>

              <div className="border-t border-white/10 pt-8 mt-2">
                <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">Joining as <strong className="text-slate-900 dark:text-white">{user?.name}</strong></p>
                <button 
                  onClick={handleJoin}
                  className="w-full py-4 btn-primary text-lg"
                >
                  Join Meeting Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
