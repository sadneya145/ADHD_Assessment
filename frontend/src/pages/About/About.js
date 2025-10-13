import React from 'react';
import { Heart, Lightbulb, Target, Users, BookOpen, Sparkles, Award, MessageCircle } from 'lucide-react';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import './About.css';

const About = () => {
    const teamMembers = [
        {
            name: "Priya Sharma",
            role: "Project Lead & Full-Stack Developer",
            bio: "Computer Science major passionate about healthcare technology. Experienced in React and machine learning, Priya coordinates the development efforts and focuses on creating intuitive user interfaces.",
            icon: "👩‍💻",
            skills: ["React", "Node.js", "UI/UX Design", "Project Management"]
        },
        {
            name: "Arjun Patel",
            role: "Backend Developer & Data Analyst",
            bio: "Specializing in data science and cognitive psychology. Arjun designed the assessment algorithms and implements the data collection systems that power our analysis.",
            icon: "👨‍💻",
            skills: ["Python", "Data Analysis", "API Development", "Database Design"]
        },
        {
            name: "Kavya Reddy",
            role: "Research Lead & Psychology Consultant",
            bio: "Psychology and Computer Science double major. Kavya researches ADHD assessment methods and ensures our tools align with clinical best practices and scientific literature.",
            icon: "👩‍🔬",
            skills: ["Clinical Research", "Cognitive Assessment", "Literature Review", "Testing"]
        },
        {
            name: "Rohan Desai",
            role: "Frontend Developer & Game Designer",
            bio: "Focused on creating engaging, child-friendly interfaces. Rohan develops the cognitive task games and ensures they're both scientifically valid and enjoyable for children.",
            icon: "👨‍🎨",
            skills: ["JavaScript", "Game Development", "Animation", "User Testing"]
        }
    ];

    const milestones = [
        {
            phase: "Research & Planning",
            description: "Extensive literature review of ADHD assessment methods, cognitive testing paradigms, and pediatric psychology. Consulted with clinical psychology professors and reviewed DSM-5 criteria.",
            duration: "2 months"
        },
        {
            phase: "Design & Prototyping",
            description: "Created wireframes and prototypes for all components. Designed the cognitive tasks based on established neuropsychological tests. Developed the scoring algorithms and normative comparison models.",
            duration: "1.5 months"
        },
        {
            phase: "Development",
            description: "Built the full-stack application with React frontend and Node.js backend. Implemented the three cognitive tasks, behavioral questionnaire, and video attention monitoring systems.",
            duration: "3 months"
        },
        {
            phase: "Testing & Refinement",
            description: "Conducted user testing with families and incorporated feedback. Refined game mechanics, adjusted difficulty levels, and improved the user experience based on real-world usage.",
            duration: "1 month"
        }
    ];

    const whyWeBuiltThis = [
        {
            icon: <Heart className="reason-icon" />,
            title: "Personal Connection",
            content: "Several team members have family members or close friends with ADHD. We've witnessed firsthand the challenges of getting timely, affordable assessments and the impact of delayed diagnosis on children's development and self-esteem."
        },
        {
            icon: <Target className="reason-icon" />,
            title: "Addressing a Real Need",
            content: "Current ADHD assessment often requires multiple appointments, long waiting lists, and significant costs. Many families, especially in underserved areas, lack access to specialized clinicians. We wanted to create a preliminary screening tool that's accessible to everyone."
        },
        {
            icon: <Lightbulb className="reason-icon" />,
            title: "Bridging Technology & Healthcare",
            content: "We saw an opportunity to apply our technical skills to a meaningful healthcare problem. By combining web technology, cognitive science, and data analysis, we could create something that genuinely helps families navigate the assessment process."
        },
        {
            icon: <BookOpen className="reason-icon" />,
            title: "Raising Awareness",
            content: "ADHD is often misunderstood, stigmatized, or dismissed as 'bad behavior.' We want to educate parents, teachers, and communities about ADHD as a legitimate neurodevelopmental condition that deserves understanding and support, not judgment."
        }
    ];

    const values = [
        {
            title: "Evidence-Based Approach",
            description: "Every feature is grounded in peer-reviewed research and established clinical practices. We don't rely on myths or pseudoscience.",
            icon: "🔬"
        },
        {
            title: "Child-First Design",
            description: "Our interfaces are designed to be engaging and non-threatening for children. We prioritize their comfort and emotional safety throughout the assessment.",
            icon: "🧸"
        },
        {
            title: "Accessibility",
            description: "We're committed to making ADHD assessment tools available to families regardless of location, income, or background.",
            icon: "🌍"
        },
        {
            title: "Privacy & Security",
            description: "We take data protection seriously. All assessment data is encrypted and stored securely, and we never share information without explicit consent.",
            icon: "🔒"
        },
        {
            title: "Transparency",
            description: "We're open about what our tools can and cannot do. We're not replacing professional diagnosis—we're providing a starting point for conversations with healthcare providers.",
            icon: "💡"
        },
        {
            title: "Continuous Improvement",
            description: "We actively seek feedback from users, clinicians, and researchers to refine and improve our platform based on real-world needs.",
            icon: "📈"
        }
    ];

    const impact = [
        {
            stat: "1 in 10",
            description: "Children worldwide are affected by ADHD, yet many go undiagnosed for years"
        },
        {
            stat: "6-12 months",
            description: "Average wait time for ADHD evaluation in many regions"
        },
        {
            stat: "$500-2000",
            description: "Typical cost of comprehensive ADHD assessment"
        },
        {
            stat: "50%",
            description: "Of children with ADHD don't receive appropriate support in schools"
        }
    ];

    return (
        <div className="about-page">
            <Header />

            <main className="about-main">
                <section className="about-hero">
                    <div className="about-hero-content">
                        <Sparkles className="hero-icon" />
                        <h1 className="about-hero-title">Making ADHD Assessment Accessible</h1>
                        <p className="about-hero-subtitle">
                            A team of college students combining technology, psychology, and compassion
                            to help families navigate ADHD assessment
                        </p>
                    </div>
                </section>

                <section className="our-story-section">
                    <div className="about-container">
                        <div className="story-content">
                            <h2>Our Story</h2>
                            <div className="story-text">
                                <p>
                                    We're four computer science and psychology students who came together with a shared
                                    mission: to make ADHD assessment more accessible, affordable, and less intimidating
                                    for families. Our journey began in a cognitive psychology class where we learned
                                    about the challenges in pediatric mental health assessment—long wait times, high costs,
                                    and limited availability of specialized clinicians.
                                </p>
                                <p>
                                    What started as a class project evolved into something much bigger. We realized we
                                    could leverage our technical skills and psychological knowledge to create tools that
                                    genuinely help families. NeuroAssess is the result of months of research, development,
                                    and collaboration with psychology professors, clinical experts, and most importantly,
                                    families affected by ADHD.
                                </p>
                                <p>
                                    We're not clinicians, and we don't pretend to be. Instead, we see ourselves as bridge-builders—
                                    creating technology that connects families with the information and resources they need
                                    to seek appropriate professional help. Our platform is designed to be a starting point,
                                    a way to gather preliminary data that can inform conversations with healthcare providers
                                    and potentially reduce the time and cost of formal evaluation.
                                </p>
                                <p>
                                    This project has been an incredible learning experience for all of us. We've delved deep
                                    into cognitive neuroscience, learned about the ethical considerations in healthcare technology,
                                    and most importantly, developed a profound respect for the families navigating ADHD.
                                    Every feature we build, every line of code we write, is motivated by the hope that we
                                    can make someone's journey a little bit easier.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="team-section">
                    <div className="about-container">
                        <div className="section-header">
                            <h2>Meet Our Team</h2>
                            <p>
                                Four students, one mission: leveraging technology to improve mental health assessment
                            </p>
                        </div>

                        <div className="team-grid">
                            {teamMembers.map((member, index) => (
                                <div key={index} className="team-card">
                                    <div className="team-icon">{member.icon}</div>
                                    <h3 className="team-name">{member.name}</h3>
                                    <p className="team-role">{member.role}</p>
                                    <p className="team-bio">{member.bio}</p>
                                    <div className="team-skills">
                                        {member.skills.map((skill, idx) => (
                                            <span key={idx} className="skill-tag">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="why-section">
                    <div className="about-container">
                        <div className="section-header">
                            <h2>Why We Built This</h2>
                            <p>
                                Our motivation comes from recognizing a critical gap in accessible mental health resources
                            </p>
                        </div>

                        <div className="why-grid">
                            {whyWeBuiltThis.map((reason, index) => (
                                <div key={index} className="why-card">
                                    <div className="why-icon-wrapper">{reason.icon}</div>
                                    <h3>{reason.title}</h3>
                                    <p>{reason.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="impact-section">
                    <div className="about-container">
                        <h2 className="impact-title">The Problem We're Addressing</h2>
                        <div className="impact-grid">
                            {impact.map((item, index) => (
                                <div key={index} className="impact-card">
                                    <div className="impact-stat">{item.stat}</div>
                                    <p className="impact-description">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="milestones-section">
                    <div className="about-container">
                        <div className="section-header">
                            <h2>Our Development Journey</h2>
                            <p>
                                From concept to reality: how we built NeuroAssess over 7.5 months
                            </p>
                        </div>

                        <div className="timeline">
                            {milestones.map((milestone, index) => (
                                <div key={index} className="timeline-item">
                                    <div className="timeline-marker">{index + 1}</div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <h3>{milestone.phase}</h3>
                                            <span className="timeline-duration">{milestone.duration}</span>
                                        </div>
                                        <p>{milestone.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="values-section">
                    <div className="about-container">
                        <div className="section-header">
                            <h2>Our Values & Principles</h2>
                            <p>
                                The core beliefs that guide every decision we make
                            </p>
                        </div>

                        <div className="values-grid">
                            {values.map((value, index) => (
                                <div key={index} className="value-card">
                                    <div className="value-icon">{value.icon}</div>
                                    <h3>{value.title}</h3>
                                    <p>{value.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="disclaimer-section">
                    <div className="about-container">
                        <div className="disclaimer-content">
                            <Award className="disclaimer-icon" />
                            <h2>Important Disclaimer</h2>
                            <div className="disclaimer-text">
                                <p>
                                    <strong>NeuroAssess is a screening and educational tool, not a diagnostic instrument.</strong> We are
                                    students passionate about mental health technology, not licensed clinicians. Our platform
                                    is designed to provide preliminary information that can inform conversations with healthcare
                                    professionals, but it cannot and should not replace comprehensive clinical evaluation.
                                </p>
                                <p>
                                    If our tools suggest potential ADHD symptoms, we strongly encourage you to consult with
                                    qualified healthcare providers including pediatricians, child psychologists, or psychiatrists.
                                    Only licensed professionals can provide an official ADHD diagnosis and recommend appropriate
                                    interventions.
                                </p>
                                <p>
                                    We've worked hard to ensure our assessment tools are based on sound scientific principles
                                    and validated research. However, we continuously seek feedback from clinical experts and
                                    users to improve our platform. If you're a healthcare professional interested in
                                    collaborating or providing feedback, we'd love to hear from you.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="vision-section">
                    <div className="about-container">
                        <div className="vision-content">
                            <h2>Our Vision for the Future</h2>
                            <div className="vision-text">
                                <p>
                                    While NeuroAssess started as a college project, we envision it growing into a comprehensive
                                    resource for ADHD awareness and assessment. Our goals include:
                                </p>
                                <ul className="vision-list">
                                    <li>
                                        <strong>Partnering with clinicians</strong> to validate our tools through formal research studies
                                        and ensure they meet clinical standards
                                    </li>
                                    <li>
                                        <strong>Expanding language support</strong> to make our platform accessible to non-English
                                        speaking communities
                                    </li>
                                    <li>
                                        <strong>Developing resources for educators</strong> to help teachers recognize and support
                                        students with ADHD in classroom settings
                                    </li>
                                    <li>
                                        <strong>Creating parent education modules</strong> that explain ADHD, treatment options,
                                        and practical strategies for supporting children
                                    </li>
                                    <li>
                                        <strong>Building connections to professional services</strong> by partnering with clinics
                                        and practitioners to streamline the path from screening to diagnosis
                                    </li>
                                    <li>
                                        <strong>Implementing machine learning</strong> to improve our assessment accuracy by
                                        analyzing patterns across thousands of assessments
                                    </li>
                                </ul>
                                <p>
                                    We believe technology can democratize access to mental health resources without replacing
                                    the essential human element of clinical care. Our vision is a future where no child's
                                    ADHD goes unrecognized simply because their family couldn't afford assessment or didn't
                                    know where to turn for help.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="contact-cta-section">
                    <div className="contact-cta-content">
                        <MessageCircle className="contact-icon" />
                        <h2>Get in Touch</h2>
                        <p>
                            We're always eager to hear from families using our platform, clinicians interested in
                            collaboration, or fellow students passionate about healthcare technology.
                        </p>
                        <div className="contact-methods">
                            <div className="contact-item">
                                <strong>General Inquiries:</strong> info@neuroassess.com
                            </div>
                            <div className="contact-item">
                                <strong>Clinical Partnerships:</strong> clinical@neuroassess.com
                            </div>
                            <div className="contact-item">
                                <strong>Technical Feedback:</strong> support@neuroassess.com
                            </div>
                        </div>
                        <p className="contact-note">
                            Your feedback helps us improve and ensures we're building tools that truly serve
                            the needs of families and clinicians.
                        </p>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default About;