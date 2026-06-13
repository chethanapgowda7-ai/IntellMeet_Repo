import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { User, Mail, Lock, ArrowRight, Sparkles, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    try {
      await register(name, email, password);
      toast.success('Account created! Welcome to IntellMeet!');
      navigate('/dashboard');
    } catch (error: any) {
      const msg = error.message || 'Registration failed. Please try again.';
      setErrorMsg(msg);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-dark-400">
      {/* Left side - Form Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-md animate-float" style={{ animationDuration: '9s' }}>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <span className="text-xl">🤖</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">IntellMeet</span>
          </div>

          <div className="mb-10">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3 tracking-tight">Join the future</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg font-light">Create your account and start collaborating.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary-500 transition-colors">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-3.5 glass-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary-500 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3.5 glass-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary-500 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min. 6 characters"
                  className="w-full pl-11 pr-12 py-3.5 glass-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm backdrop-blur-md">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                'Creating account...'
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <span className="border-b border-slate-200 dark:border-slate-700/50 w-1/5 lg:w-1/4"></span>
            <span className="text-xs text-center text-slate-500 uppercase tracking-widest font-semibold">or continue with</span>
            <span className="border-b border-slate-200 dark:border-slate-700/50 w-1/5 lg:w-1/4"></span>
          </div>
          
          <div className="mt-6 flex justify-center">
            <div className="hover:scale-105 transition-transform duration-300">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  if (credentialResponse.credential) {
                    try {
                      await useAuthStore.getState().googleLogin(credentialResponse.credential);
                      toast.success('Account created! Welcome to IntellMeet!');
                      navigate('/dashboard');
                    } catch (error: any) {
                      toast.error(error.message);
                    }
                  }
                }}
                onError={() => toast.error('Google Login Failed')}
                theme="filled_black"
                shape="pill"
              />
            </div>
          </div>

          <p className="text-center text-slate-600 dark:text-slate-400 mt-8 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors underline underline-offset-4">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Showcase Area */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-100 dark:bg-dark-200 items-center justify-center">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-900/20 via-dark-300 to-accent-900/20 animate-gradient-x" />
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary-600/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-accent-600/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

        {/* Glassmorphic Card Showcase */}
        <div className="relative z-10 p-10 max-w-lg w-full animate-float" style={{ animationDelay: '1s' }}>
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-500" />
            
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-500/10 text-primary-400 mb-6 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Sparkles size={24} />
            </div>
            
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 leading-tight tracking-tight">
              AI-Powered Transcriptions & Action Items
            </h3>
            <p className="text-slate-700 dark:text-slate-300/80 leading-relaxed mb-8 font-light">
              Never miss a crucial detail again. Our intelligent platform automatically transcribes your meetings, extracts key action items, and summarizes discussions so you can focus on the conversation.
            </p>

            <div className="flex items-center gap-4 pt-4 border-t border-white/[0.05]">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-dark-200 bg-slate-200 dark:bg-dark-100 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <p className="text-slate-900 dark:text-white font-medium">Join 10,000+ teams</p>
                <p className="text-slate-600 dark:text-slate-400">using IntellMeet daily</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;