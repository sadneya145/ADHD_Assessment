import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const [hoveredLink, setHoveredLink] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user data on mount
    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
  try {
    const token = localStorage.getItem('token');

    // 🔥 No token → go to login
    if (!token) {
      setLoading(false);
      navigate('/login');
      return;
    }

    const res = await fetch(
      'https://adhd-assessment-backend.onrender.com/api/profile',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // 🔥 AUTH FAILURE → logout
    if (!res.ok) {
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }

    const data = await res.json();

    // ✅ MATCH BACKEND RESPONSE
    setUser({
      name: data.user.displayName || data.user.username,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        data.user.displayName || data.user.username
      )}&background=667eea&color=fff`,
    });
  } catch (err) {
    console.error('Failed to fetch user:', err);
    localStorage.removeItem('token');
    navigate('/login');
  } finally {
    setLoading(false);
  }
};

    

    const navItems = [
        { to: "/", label: "Home", emoji: "🏠", color: "#FF6B6B" },
        { to: "/home/games", label: "Games", emoji: "🎮", color: "#4ECDC4" },
        { to: "/home/webcam", label: "Video", emoji: "📹", color: "#95E1D3" },
        { to: "/home/form", label: "Form", emoji: "📝", color: "#FFE66D" },
        // { to: "/results", label: "Results", emoji: "📊", color: "#C4A1FF" },
        { to: "/home/about", label: "About", emoji: "ℹ️", color: "#A8E6CF" },
        { to: "/home/FocusBuddy", label: "Focus Buddy", emoji: "🤖", color: "#C4A1FF" }
    ];


    return (
        <header className="header">
            {/* Decorative top stripe */}
            <div className="top-stripe">
                <div className="stripe-segment stripe-red"></div>
                <div className="stripe-segment stripe-teal"></div>
                <div className="stripe-segment stripe-yellow"></div>
                <div className="stripe-segment stripe-mint"></div>
                <div className="stripe-segment stripe-green"></div>
            </div>

            <div className="header-container">
                {/* Logo Section */}
                <Link to="/" className="logo-container">
                    <div className="logo-circle">
                        <span className="logo-emoji">🧠</span>
                    </div>
                    <div className="brand-text">
                        <span className="company-name">NeuroAssess</span>
                        <span className="tagline">Preliminary ADHD Screening</span>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="header-nav">
                    {navItems.map((item, index) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`nav-link ${hoveredLink === index ? 'nav-link-hover' : ''}`}
                            style={hoveredLink === index ? {
                                background: item.color + '20',
                                borderColor: item.color
                            } : {}}
                            onMouseEnter={() => setHoveredLink(index)}
                            onMouseLeave={() => setHoveredLink(null)}
                        >
                            <span className="nav-emoji">{item.emoji}</span>
                            <span className="nav-text">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* User Section */}
                <div className="header-right">
                    {loading ? (
                        <div className="user-skeleton"></div>
                    ) : user ? (
                        <>
                            <div className="star-badge">⭐</div>
                            <div 
                                className="user-info"
                                onClick={() => navigate('/home/profile')}
                                style={{ cursor: 'pointer' }}
                            >
                                <img src={user.avatar} alt={user.name} className="user-avatar" />
                                <span className="user-name">{user.name.split(' ')[0]}</span>
                            </div>
                        </>
                    ) : (
                        <Link to="/" className="login-button">
                            <span className="login-emoji">🔑</span>
                            Login
                        </Link>
                    )}
                </div>
            </div>

            {/* Floating decorative elements */}
            <div className="floating-circle-1"></div>
            <div className="floating-circle-2"></div>
        </header>
    );
};

export default Header;