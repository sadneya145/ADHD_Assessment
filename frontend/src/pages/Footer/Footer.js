import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3 className="footer-title">NeuroAssess</h3>
                        <p className="footer-description">
                            Advanced ADHD assessment tools for children, combining behavioral analysis
                            with interactive cognitive tasks.
                        </p>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">Quick Links</h4>
                        <ul className="footer-links">
                            <li><Link to="/home">Home</Link></li>
                            <li><Link to="/home/games">Games</Link></li>
                            <li><Link to="/home/webcam">Video Assessment</Link></li>
                            <li><Link to="/home/form">Behavioral Form</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">Resources</h4>
                        <ul className="footer-links">
                            <li><Link to="/home/about">About Us</Link></li>
                            <li><Link to="/contact">Contact</Link></li>
                            <li><Link to="/privacy">Privacy Policy</Link></li>
                            <li><Link to="/terms">Terms of Service</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">Contact</h4>
                        <ul className="footer-contact">
                            <li>Email: info@neuroassess.com</li>
                            <li>Phone: +1 (555) 123-4567</li>
                            <li>Address: 123 Healthcare St, City</li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {currentYear} NeuroAssess. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;