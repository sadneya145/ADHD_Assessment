import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, provider, signInWithPopup } from '../../firebase';
import { Brain, Eye, EyeOff, Sparkles, Star } from 'lucide-react';
import './Login.css';

const BACKEND_URL = 'https://adhd-assessment-backend.onrender.com/api/auth/login';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // ✅ Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      localStorage.setItem('firebaseToken', token);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Email/Password Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Decorative floating elements */}
      <div className="deco-star deco-top-left">
        <Star className="icon-star-large" />
      </div>
      <div className="deco-sparkle deco-top-right">
        <Sparkles className="icon-sparkle-large" />
      </div>
      <div className="deco-star deco-bottom-left">
        <Star className="icon-star-small" />
      </div>
      <div className="deco-sparkle deco-bottom-right">
        <Sparkles className="icon-sparkle-large" />
      </div>

      <div className="login-box">
        {/* Logo and Brand */}
        <div className="brand-section">
          <div className="mascot-wrapper">
            <div className="mascot-circle">
              <Brain className="mascot-brain" />
            </div>
            <div className="mascot-eye mascot-eye-left"></div>
            <div className="mascot-eye mascot-eye-right"></div>
          </div>
          <h1 className="brand-title">NeuroAccess</h1>
          <p className="brand-subtitle">Let's have fun learning together!</p>
        </div>

        {/* Welcome Message */}
        <div className="welcome-card">
          <h2 className="welcome-title">
            {isSignUp ? '🎉 Create Account!' : '👋 Welcome Back!'}
          </h2>
          <p className="welcome-text">
            {isSignUp ? 'Join us and start playing fun games!' : 'Ready to play some fun games?'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-box">
            <span className="error-emoji">😅</span>
            <p className="error-text">{error}</p>
          </div>
        )}

        {/* Google Sign-in Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="google-btn"
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="google-btn-text">
            {loading ? '🎮 Getting Ready...' : `🚀 ${isSignUp ? 'Sign up' : 'Sign in'} with Google`}
          </span>
        </button>

        {/* Divider */}
        <div className="divider-wrapper">
          <span className="divider-text">✨ Or use email ✨</span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">📧 Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">🔒 Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Create a strong password' : 'Your secret password'}
                className="form-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
              >
                {showPassword ? <EyeOff className="eye-icon" /> : <Eye className="eye-icon" />}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '⏳ Please wait...' : (isSignUp ? '🚀 Create Account!' : '🎯 Let\'s Go!')}
          </button>
        </form>

        {/* Toggle Login / Signup */}
        <div className="switch-mode">
          <p className="switch-text">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            {' '}
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)} 
              className="switch-link"
            >
              {isSignUp ? 'Sign in here' : 'Sign up here'}
            </button>
          </p>
        </div>

        {!isSignUp && (
          <p className="forgot-password">🤔 Forgot password?</p>
        )}

        <div className="footer-text">
          <p>🌟 Made with love for awesome kids like you! 🌟</p>
        </div>
      </div>
    </div>
  );
}
