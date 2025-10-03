import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, provider, signInWithPopup } from '../firebase';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithPopup(auth, provider);
      navigate('/home');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('Please use Google Sign-In for this demo');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="logo">🧠</div>
          <h1>ADHD Assessment</h1>
        </div>

        <div className="welcome-text">
          <h2>Welcome Back</h2>
          <p>Sign in to continue your assessment</p>
        </div>

        {error && <div className="error-box">⚠ {error}</div>}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="google-btn"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google"
            className="google-icon"
          />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div className="divider">
          <span>Or continue with email</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className="signin-btn">
            Sign In
          </button>
        </form>

        <p className="signup-link">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
