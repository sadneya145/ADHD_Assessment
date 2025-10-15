import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, provider, signInWithPopup } from '../../firebase';
import { Eye, EyeOff, Brain, AlertCircle } from 'lucide-react';
import './Signup.css';

export default function Signup() {
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ================= Google Signup =================
  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= Email Signup =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('https://adhd-assessment-backend.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Signup failed');

      if (data.token) localStorage.setItem('token', data.token);

      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <div className="signup-page-container">
      <div className="signup-page-card">
        {/* Header with animated icon */}
        <div className="signup-page-header">
          <div className="signup-logo-wrapper">
            <div className="signup-logo-box">
              <Brain className="signup-logo-icon" />
            </div>
            <div className="signup-sparkles">
              <span className="sparkle sparkle-1">✨</span>
              <span className="sparkle sparkle-2">⭐</span>
              <span className="sparkle sparkle-3">💫</span>
            </div>
          </div>
          <h1 className="signup-page-title">ADHD Assessment</h1>
          <p className="signup-page-tagline">Fun games to help you focus better! 🎮</p>
        </div>

        {/* Subheader */}
        <div className="signup-page-subheader">
          <h2 className="signup-subheader-title">Create Your Account</h2>
          <p className="signup-subheader-text">Let's get started on your journey! 🚀</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="signup-error-box">
            <AlertCircle className="signup-error-icon" />
            <p className="signup-error-text">{error}</p>
          </div>
        )}

        {/* Google Signup Button */}
        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="signup-google-btn"
        >
          <svg className="signup-google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{loading ? 'Signing up...' : 'Sign up with Google'}</span>
        </button>

        {/* Divider */}
        <div className="signup-divider">
          <span className="signup-divider-text">Or sign up with email</span>
        </div>

        {/* Email Signup Form */}
        <form onSubmit={handleSubmit} className="signup-page-form">
          <div className="signup-form-group">
            <label className="signup-form-label">Email Address 📧</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="signup-form-input"
            />
          </div>

          <div className="signup-form-group">
            <label className="signup-form-label">Password 🔒</label>
            <div className="signup-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="signup-form-input signup-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="signup-toggle-btn"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="signup-form-group">
            <label className="signup-form-label">Confirm Password ✅</label>
            <div className="signup-password-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="signup-form-input signup-password-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="signup-toggle-btn"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="signup-submit-btn" disabled={loading}>
            <span>{loading ? 'Creating Account...' : 'Create Account 🎉'}</span>
          </button>
        </form>

        {/* Sign-in Link */}
        <p className="signup-signin-link">
          Already have an account? <Link to="/" className="signup-signin-link-anchor">Sign in</Link>
        </p>
      </div>

      {/* Floating decorative elements */}
      <div className="signup-floating-shapes">
        <div className="signup-shape signup-shape-1">🎈</div>
        <div className="signup-shape signup-shape-2">🌟</div>
        <div className="signup-shape signup-shape-3">🎨</div>
        <div className="signup-shape signup-shape-4">🚀</div>
      </div>
    </div>
  );
}