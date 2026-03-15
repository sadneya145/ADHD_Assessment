import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import './Home.css';

const Home = () => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const assessmentMethods = [
    {
      title: "Color Detective",
      subtitle: "Stroop Test",
      description: "Match colors with words in this tricky brain teaser!",
      skillTest: "Tests focus and response control",
      icon: "🎨",
      link: "/home/Stroop",
      color: "#95E1D3",
      bgGradient: "linear-gradient(135deg, #95E1D3 0%, #38EF7D 100%)"
    },
    {
      title: "Quick Reactions",
      subtitle: "Go/No-Go Task",
      description: "Click fast but be careful - only tap the right ones!",
      skillTest: "Measures attention and impulse control",
      icon: "🎯",
      link: "/home/GoNoGo",
      color: "#4ECDC4",
      bgGradient: "linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)"
    },
    {
      title: "Memory Challenge",
      subtitle: "N-Back Task",
      description: "Remember patterns and test your super memory powers!",
      skillTest: "Trains memory and concentration",
      icon: "🧠",
      link: "/home/Nback",
      color: "#FF6B6B",
      bgGradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)"
    },
    {
      title: "Focus Tracker",
      subtitle: "Video Assessment",
      description: "Let's see how well you can pay attention during activities!",
      skillTest: "Monitors attention patterns",
      icon: "📹",
      link: "/home/WebCam",
      color: "#FFE66D",
      bgGradient: "linear-gradient(135deg, #FFE66D 0%, #FDBB2D 100%)"
    },
    {
      title: "Mouse Master",
      subtitle: "Movement Tracking",
      description: "Control your mouse with precision and speed!",
      skillTest: "Assesses motor control and coordination",
      icon: "🖱️",
      link: "/home/mouse",
      color: "#A8E6CF",
      bgGradient: "linear-gradient(135deg, #A8E6CF 0%, #56CCF2 100%)"
    },
    {
      title: "Tell Us More",
      subtitle: "Behavioral Form",
      description: "Answer questions about your child's daily activities and habits.",
      skillTest: "Gathers behavioral insights",
      icon: "📋",
      link: "/home/form",
      color: "#C7CEEA",
      bgGradient: "linear-gradient(135deg, #C7CEEA 0%, #B490CA 100%)"
    }
  ];

  const adhdInfo = [
    {
      title: "What is ADHD?",
      content: "ADHD is a condition that affects how kids focus, sit still, and control their actions. It's like having a super active brain that wants to do many things at once! About 5-10% of kids have ADHD, and it's totally okay.",
      icon: "🤔",
      color: "#667eea"
    },
    {
      title: "Common Signs",
      content: "Kids with ADHD might forget things easily, fidget a lot, have trouble waiting their turn, or find it hard to finish tasks. Everyone is different, and these signs can show up in different ways!",
      icon: "✨",
      color: "#764ba2"
    },
    {
      title: "Why Check Early?",
      content: "Finding out early helps kids get the right support at school and home. With help, kids with ADHD can do amazing things and succeed in everything they try!",
      icon: "🌟",
      color: "#f093fb"
    },
    {
      title: "How We Help",
      content: "We use fun games and activities to understand how your brain works. Each activity tests different skills like memory, attention, and quick thinking!",
      icon: "🎮",
      color: "#4facfe"
    }
  ];

  const howItWorksSteps = [
    {
      icon: "🧩",
      title: "Play Fun Games",
      description: "Enjoy interactive activities designed just for you"
    },
    {
      icon: "📋",
      title: "Behavioural Form",
      description: "Answer questions about your child's daily activities and habits."
    },
    {
      icon: "🌈",
      title: "Get Helpful Tips",
      description: "Receive insights to help you succeed"
    }
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  return (
    <div className="home-page">
      <Header />

      <main className="home-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-decoration hero-circle-1"></div>
          <div className="hero-decoration hero-circle-2"></div>
          <div className="hero-decoration hero-circle-3"></div>
          
          <div className="hero-content">
            <div className="hero-emoji-group">
              <span className="hero-emoji">🧠</span>
              <span className="hero-emoji">✨</span>
              <span className="hero-emoji">🎮</span>
            </div>
            <h1 className="hero-title">
              Your Child's clarity is waiting. Screen for ADHD privately!
            </h1>
            <p className="hero-subtitle">
              Fun activities and cool games to help you understand your child's focus
            </p>
            <p className="parent-note">
              👨‍👩‍👧 <strong>Parents:</strong> These scientifically-designed games help identify attention patterns in children. 
              Results are private and meant to guide you toward professional assessment if needed.
            </p>
            <div className="hero-actions">
              <Link to="/home/form" className="btn btn-primary">
                <span className="btn-icon">🚀</span>
                Start Playing
              </Link>
              <Link to="/home/about" className="btn btn-secondary">
                <span className="btn-icon">📖</span>
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-it-works-section">
          <h2 className="section-title">
            <span className="title-emoji">🎯</span>
            How It Works
          </h2>
          <p className="section-subtitle">
            Three simple steps to understanding your child's attention better
          </p>
          <div className="steps-container">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="step-card">
                <div className="step-number">{index + 1}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="steps-connector">
            <div className="connector-line"></div>
          </div>
        </section>

        {/* Info Section */}
        <section className="info-section">
          <h2 className="section-title">
            <span className="title-emoji">💡</span>
            Understanding ADHD
          </h2>
          <p className="section-subtitle">
            Learn about ADHD in a fun and easy way!
          </p>
          <div className="info-grid">
            {adhdInfo.map((info, index) => (
              <div 
                key={index} 
                className="info-card"
                style={{ '--card-color': info.color }}
              >
                <div className="info-card-icon">{info.icon}</div>
                <h3 className="info-card-title">{info.title}</h3>
                <p className="info-card-content">{info.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Methods Section */}
        <section className="methods-section">
          <h2 className="section-title">
            <span className="title-emoji">🎮</span>
            Play & Learn Games
          </h2>
          <p className="section-subtitle">
            Each game is designed to test different skills - pick one and let's have fun!
          </p>
          <div className="methods-grid">
            {assessmentMethods.map((method, index) => (
              <Link 
                key={index} 
                to={method.link} 
                className="method-card"
                style={{
                  '--card-color': method.color,
                  '--card-gradient': method.bgGradient
                }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="method-card-inner">
                  <div className="method-icon-wrapper">
                    <div className="method-icon">{method.icon}</div>
                  </div>
                  <div className="method-content">
                    <h3 className="method-title">{method.title}</h3>
                    <p className="method-subtitle">{method.subtitle}</p>
                    <p className="method-skill-test">{method.skillTest}</p>
                    <p className="method-description">{method.description}</p>
                  </div>
                  <div className="method-action">
                    <span className="method-button">
                      Let's Play! 
                      <span className="method-arrow">→</span>
                    </span>
                  </div>
                </div>
                {hoveredCard === index && (
                  <div className="method-sparkle">✨</div>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Cultural Awareness Section */}
        <section className="awareness-section">
          <div className="awareness-content">
            <div className="awareness-icon">🤝</div>
            <h2 className="awareness-title">Breaking the Silence Together</h2>
            <p className="awareness-text">
              In India, many parents hesitate to talk about ADHD due to social stigma and lack of awareness. 
              Our goal is to change that — by starting with fun, facts, and empathy. Every child deserves 
              understanding and support, and recognizing attention challenges early can open doors to a brighter future.
            </p>
            <div className="awareness-stats">
              <div className="stat-item">
                <span className="stat-number">5-10%</span>
                <span className="stat-label">Children have ADHD</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">90%</span>
                <span className="stat-label">Go undiagnosed in India</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">100%</span>
                <span className="stat-label">Deserve support</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-decoration cta-star-1">⭐</div>
          <div className="cta-decoration cta-star-2">🌟</div>
          <div className="cta-decoration cta-star-3">✨</div>
          
          <div className="cta-content">
            <div className="cta-emoji">🎉</div>
            <h2 className="cta-title">Ready to Begin Your Adventure?</h2>
            
            <Link to="/form" className="btn btn-primary btn-large">
              <span className="btn-icon">🚀</span>
              Start Now
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;