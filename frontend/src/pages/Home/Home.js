import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import './Home.css';

const Home = () => {
  const assessmentMethods = [
    {
      title: "N-Back Task",
      description: "Evaluates working memory and attention span through pattern recognition challenges.",
      icon: "🧠",
      link: "/home/Nback"
    },
    {
      title: "Go/No-Go Task",
      description: "Measures impulse control and response inhibition in children.",
      icon: "🎯",
      link: "/home/GoNoGo"
    },
    {
      title: "Stroop Test",
      description: "Assesses selective attention and cognitive flexibility through color-word matching.",
      icon: "🎨",
      link: "/home/Stroop"
    },
    {
      title: "Video Attentiveness",
      description: "Monitors focus and engagement patterns through webcam-based behavioral analysis.",
      icon: "📹",
      link: "/home/WebCam"
    },
    {
      title: "Mouse Tracking",
      description: "Analyzes movement patterns and response times for attention assessment.",
      icon: "🖱️",
      link: "/home/mouse"
    },
    {
      title: "Behavioral Form",
      description: "Comprehensive questionnaire capturing daily behavioral patterns and symptoms.",
      icon: "📋",
      link: "/home/form"
    }
  ];

  const adhdInfo = [
    {
      title: "What is ADHD?",
      content: "Attention-Deficit/Hyperactivity Disorder (ADHD) is a neurodevelopmental condition affecting approximately 5-10% of children worldwide. It impacts attention span, impulse control, and activity levels, influencing learning and social interactions."
    },
    {
      title: "Common Signs in Children",
      content: "Children with ADHD may exhibit inattention to details, difficulty sustaining focus, forgetfulness, excessive fidgeting, difficulty waiting turns, and frequent interruptions. These symptoms vary in intensity and presentation."
    },
    {
      title: "Why Early Assessment Matters",
      content: "Early identification enables timely intervention, support strategies, and accommodations that significantly improve academic performance, social relationships, and overall quality of life for children with ADHD."
    },
    {
      title: "Our Comprehensive Approach",
      content: "We combine validated cognitive tasks, behavioral questionnaires, and attention monitoring to provide a multi-dimensional assessment that captures the diverse aspects of ADHD presentation in children."
    }
  ];
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);

    // Disable scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Cleanup
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
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Advanced ADHD Assessment for Children</h1>
            <p className="hero-subtitle">
              Evidence-based cognitive tasks and behavioral analysis tools designed
              to support comprehensive ADHD evaluation in children
            </p>
            <div className="hero-actions">
              <Link to="/home/form" className="btn btn-primary">Start Assessment</Link>
              <Link to="/home/about" className="btn btn-secondary">Learn More</Link>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2 className="section-title">Understanding ADHD in Children</h2>
          <div className="info-grid">
            {adhdInfo.map((info, index) => (
              <div key={index} className="info-card">
                <h3 className="info-card-title">{info.title}</h3>
                <p className="info-card-content">{info.content}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="methods-section">
          <h2 className="section-title">Our Assessment Methods</h2>
          <p className="section-subtitle">
            Multiple validated tools working together to provide comprehensive insights
          </p>
          <div className="methods-grid">
            {assessmentMethods.map((method, index) => (
              <Link key={index} to={method.link} className="method-card">
                <div className="method-icon">{method.icon}</div>
                <h3 className="method-title">{method.title}</h3>
                <p className="method-description">{method.description}</p>
                <span className="method-arrow">→</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Begin?</h2>
            <p className="cta-text">
              Start with our behavioral questionnaire, then proceed through our
              interactive assessment tasks designed specifically for children
            </p>
            <Link to="/home/form" className="btn btn-primary btn-large">
              Begin Assessment
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;