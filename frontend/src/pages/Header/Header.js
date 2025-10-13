import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();

    // Mock user data - in production, this would come from your auth context/state
    const user = {
        name: "John Doe",
        avatar: "https://ui-avatars.com/api/?name=John+Doe&background=4F46E5&color=fff"
    };

    const handleLogout = () => {
        // Add your logout logic here
        navigate('/');
    };

    return (
        <header className="header">
            <div className="header-container">
                <div className="header-left">
                    <Link to="/home" className="logo-container">
                        <img src="/../logo192.png" alt="Logo" className="logo" />
                        <span className="company-name">NeuroAssess</span>
                    </Link>
                </div>

                <nav className="header-nav">
                    <Link to="/home" className="nav-link">Home</Link>
                    <Link to="/games" className="nav-link">Games</Link>
                    <Link to="/webcam" className="nav-link">Video Assessment</Link>
                    <Link to="/form" className="nav-link">Behavioral Form</Link>
                    <Link to="/about" className="nav-link">About Us</Link>
                </nav>

                <div className="header-right">
                    <div className="user-info">
                        <img src={user.avatar} alt={user.name} className="user-avatar" />
                        <span className="user-name">{user.name}</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;