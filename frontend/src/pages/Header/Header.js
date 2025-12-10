import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const [hoveredLink, setHoveredLink] = useState(null);
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch user data on mount
    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            const res = await fetch('https://adhd-assessment-backend.onrender.com/api/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setUser({
                    name: data.user.displayName || data.user.email.split('@')[0],
                    email: data.user.email,
                    avatar: data.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.displayName || 'User')}&background=FF6B6B&color=fff`
                });
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
        } finally {
            setLoading(false);
        }
    };

    const navItems = [
        { to: "/home", label: "Home", emoji: "🏠", color: "#FF6B6B" },
        { to: "/home/games", label: "Games", emoji: "🎮", color: "#4ECDC4" },
        { to: "/home/webcam", label: "Video", emoji: "📹", color: "#95E1D3" },
        { to: "/home/form", label: "Form", emoji: "📝", color: "#FFE66D" },
        { to: "/results", label: "Results", emoji: "📊", color: "#C4A1FF" },
        { to: "/home/about", label: "About", emoji: "ℹ️", color: "#A8E6CF" }
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setShowDropdown(false);
        navigate('/');
    };

    const handleProfileClick = () => {
        setShowDropdown(false);
        navigate('/home/Profile');
    };

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
                <Link to="/home" className="logo-container">
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
                                onClick={() => setShowDropdown(!showDropdown)}
                                style={{ cursor: 'pointer', position: 'relative' }}
                            >
                                <img src={user.avatar} alt={user.name} className="user-avatar" />
                                <span className="user-name">{user.name.split(' ')[0]}</span>
                                <span className="dropdown-arrow">▼</span>

                                {/* Dropdown Menu */}
                                {showDropdown && (
                                    <div className="user-dropdown">
                                        <div className="dropdown-header">
                                            <img src={user.avatar} alt={user.name} className="dropdown-avatar" />
                                            <div className="dropdown-info">
                                                <div className="dropdown-name">{user.name}</div>
                                                <div className="dropdown-email">{user.email}</div>
                                            </div>
                                        </div>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item" onClick={handleProfileClick}>
                                            <span className="dropdown-icon">👤</span>
                                            My Profile
                                        </button>
                                        <button className="dropdown-item" onClick={() => {
                                            setShowDropdown(false);
                                            navigate('/results');
                                        }}>
                                            <span className="dropdown-icon">📊</span>
                                            My Results
                                        </button>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item logout" onClick={handleLogout}>
                                            <span className="dropdown-icon">🚪</span>
                                            Logout
                                        </button>
                                    </div>
                                )}
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

            {/* Click outside to close dropdown */}
            {showDropdown && (
                <div 
                    className="dropdown-overlay" 
                    onClick={() => setShowDropdown(false)}
                ></div>
            )}
        </header>
    );
};

export default Header;