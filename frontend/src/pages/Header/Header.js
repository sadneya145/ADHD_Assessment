import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const [hoveredLink, setHoveredLink] = useState(null);
    
    // Mock user data - in production, this would come from your auth context/state
    const user = {
        name: "Jay",
        avatar: "https://ui-avatars.com/api/?name=John+Doe&background=FF6B6B&color=fff"
    };

    const navItems = [
        { to: "/home", label: "Home", emoji: "🏠", color: "#FF6B6B" },
        { to: "/games", label: "Games", emoji: "🎮", color: "#4ECDC4" },
        { to: "/webcam", label: "Video", emoji: "📹", color: "#95E1D3" },
        { to: "/form", label: "Form", emoji: "📝", color: "#FFE66D" },
        { to: "/about", label: "About", emoji: "ℹ️", color: "#A8E6CF" }
    ];

    const handleLogout = () => {
        // Add your logout logic here
        navigate('/');
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
                    <div className="star-badge">⭐</div>
                    <div className="user-info">
                        <img src={user.avatar} alt={user.name} className="user-avatar" />
                        <span className="user-name">{user.name.split(' ')[0]}</span>
                    </div>
                </div>
            </div>

            {/* Floating decorative elements */}
            <div className="floating-circle-1"></div>
            <div className="floating-circle-2"></div>
        </header>
    );
};

export default Header;