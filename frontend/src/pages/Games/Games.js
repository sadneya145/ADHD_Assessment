import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Target, Palette, Zap, Clock, TrendingUp, Award, Users } from 'lucide-react';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import './Games.css';

const Games = () => {
    const games = [
        {
            id: 1,
            title: "N-Back Task",
            description: "The N-Back task is a continuous performance test that measures working memory capacity and sustained attention. Children must remember and identify stimuli presented N positions back in a sequence.",
            icon: "🧠",
            difficulty: "Medium",
            duration: "5-8 minutes",
            measures: ["Working Memory", "Attention Span", "Cognitive Load"],
            link: "/home/Nback",
            color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            details: "This task requires children to monitor a sequence of stimuli and indicate when the current stimulus matches the one from N steps earlier. It's particularly effective at measuring executive function and attention control, both commonly impaired in ADHD."
        },
        {
            id: 2,
            title: "Go/No-Go Task",
            description: "The Go/No-Go task evaluates response inhibition and impulse control. Children must respond quickly to 'go' signals while withholding responses to 'no-go' signals.",
            icon: "🎯",
            difficulty: "Easy",
            duration: "4-6 minutes",
            measures: ["Impulse Control", "Response Inhibition", "Reaction Time"],
            link: "/home/GoNoGo",
            color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            details: "This classic neuropsychological test measures the ability to inhibit prepotent responses. Children with ADHD typically show more commission errors (responding when they shouldn't), revealing difficulties with impulse control."
        },
        {
            id: 3,
            title: "Stroop Test",
            description: "The Stroop test measures selective attention, processing speed, and cognitive flexibility by presenting color names printed in different colored ink.",
            icon: "🎨",
            difficulty: "Hard",
            duration: "3-5 minutes",
            measures: ["Selective Attention", "Cognitive Flexibility", "Processing Speed"],
            link: "/home/Stroop",
            color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            details: "The Stroop effect demonstrates the interference between automatic processes (reading) and controlled processes (naming colors). Children with ADHD often struggle more with this task, showing difficulties in managing conflicting information."
        }
    ];

    const whyGamesWork = [
        {
            icon: <Brain className="info-icon" />,
            title: "Neuropsychological Validity",
            content: "Cognitive tasks used in ADHD assessment are based on decades of neuropsychological research. These games directly measure the executive functions that are typically impaired in ADHD, including working memory, inhibitory control, and sustained attention. Unlike subjective observations, these tasks provide objective, quantifiable data about cognitive performance.",
            research: "Studies have shown that computerized cognitive tests have 80-85% sensitivity in identifying ADHD symptoms when combined with behavioral assessments."
        },
        {
            icon: <Target className="info-icon" />,
            title: "Objective Measurement",
            content: "Traditional ADHD assessment relies heavily on subjective reports from parents and teachers. While valuable, these can be influenced by observer bias, memory limitations, and contextual factors. Cognitive games provide objective metrics such as reaction times, accuracy rates, error patterns, and response variability. These measurements are standardized and can be compared against normative data.",
            research: "Research indicates that objective performance measures reduce assessment bias by up to 40% compared to observation-only methods."
        },
        {
            icon: <Zap className="info-icon" />,
            title: "Engagement and Authenticity",
            content: "Children with ADHD often struggle with traditional testing environments, which can be boring and anxiety-inducing. Game-based assessments are inherently more engaging, reducing testing anxiety and increasing task completion rates. The interactive, fast-paced nature of these games also mirrors real-world scenarios where ADHD symptoms are most evident, providing more authentic behavioral data.",
            research: "Game-based assessments show 95% completion rates compared to 70% for traditional paper-based tests in pediatric populations."
        },
        {
            icon: <Clock className="info-icon" />,
            title: "Continuous Performance Monitoring",
            content: "ADHD symptoms fluctuate throughout the day and across different contexts. These cognitive tasks can capture moment-to-moment variations in attention and performance. Sustained attention tasks, in particular, reveal patterns of vigilance decline over time, a hallmark characteristic of ADHD. This temporal analysis provides insights that single-point observations cannot capture.",
            research: "Continuous performance tests can detect attention variability patterns with 78% accuracy in distinguishing ADHD from typical development."
        },
        {
            icon: <TrendingUp className="info-icon" />,
            title: "Pattern Recognition and Analysis",
            content: "Modern computational analysis can identify subtle patterns in performance data that human observers might miss. Machine learning algorithms can analyze response times, error distributions, and performance trajectories to identify ADHD-specific signatures. These patterns include high response variability, more commission errors, and distinctive learning curves across trials.",
            research: "AI-enhanced analysis of cognitive task data has achieved up to 92% accuracy in ADHD classification when combined with multiple assessment modalities."
        },
        {
            icon: <Award className="info-icon" />,
            title: "Immediate Feedback and Motivation",
            content: "Game-based tasks provide immediate feedback, which is crucial for maintaining engagement in children with ADHD who often struggle with delayed gratification. The scoring systems and visual feedback help children understand their performance in real-time. This immediate reinforcement increases effort and cooperation, leading to more reliable assessment data.",
            research: "Studies show that immediate feedback increases task engagement by 65% and improves data quality in pediatric ADHD assessments."
        }
    ];

    const scientificBasis = [
        {
            title: "Executive Function Theory",
            content: "ADHD is fundamentally understood as a disorder of executive functions—the cognitive processes that control and regulate other abilities and behaviors. The three games we've selected specifically target different aspects of executive function: working memory (N-Back), response inhibition (Go/No-Go), and cognitive flexibility (Stroop). By assessing these core domains, we can build a comprehensive profile of executive function strengths and weaknesses.",
            citation: "Barkley, R. A. (1997). Behavioral inhibition, sustained attention, and executive functions: Constructing a unifying theory of ADHD."
        },
        {
            title: "Attention Networks Model",
            content: "Research in cognitive neuroscience has identified three distinct attention networks: alerting, orienting, and executive control. Children with ADHD show specific deficits in the executive control network, which is responsible for resolving conflict and maintaining goal-directed behavior. Our cognitive tasks are designed to probe these networks, particularly the executive control components that regulate attention and manage competing demands.",
            citation: "Posner, M. I., & Petersen, S. E. (1990). The attention system of the human brain."
        },
        {
            title: "Response Variability as a Marker",
            content: "One of the most consistent findings in ADHD research is increased intra-individual response variability—the tendency for response times to fluctuate more dramatically from trial to trial. This variability is thought to reflect lapses in attention and difficulties maintaining consistent cognitive control. All three of our tasks capture this variability, which has emerged as one of the most promising objective markers of ADHD.",
            citation: "Kofler, M. J., et al. (2013). Reaction time variability in ADHD: A meta-analytic review."
        },
        {
            title: "Ecological Validity",
            content: "While laboratory tasks are controlled and standardized, they must also relate to real-world functioning. Research has demonstrated that performance on working memory tasks predicts academic achievement, Go/No-Go performance correlates with classroom behavior problems, and Stroop performance relates to organizational difficulties. By using tasks with established ecological validity, we ensure that our assessments provide meaningful information about daily functioning.",
            citation: "Biederman, J., et al. (2004). Functional impairments in adults with self-reports of diagnosed ADHD."
        }
    ];

    const implementationDetails = [
        {
            title: "Multi-Modal Data Collection",
            content: "Our assessment approach doesn't rely solely on game performance. We collect multiple data streams including keystroke dynamics, response patterns, error types (omission vs. commission), reaction time distributions, and performance trajectory over time. This multi-modal approach provides a richer dataset than any single metric could offer."
        },
        {
            title: "Age-Appropriate Normative Data",
            content: "ADHD symptoms and cognitive abilities change dramatically across childhood development. What's typical for a 6-year-old looks very different from a 12-year-old. Our tasks are calibrated against age-appropriate normative data, ensuring that we're identifying genuine deficits rather than normal developmental variations. Performance is evaluated relative to same-age peers."
        },
        {
            title: "Adaptive Difficulty Levels",
            content: "To maintain engagement and prevent floor or ceiling effects, our tasks can adjust difficulty based on performance. This adaptive approach ensures that children are appropriately challenged throughout the assessment, maximizing the informational value of each trial. It also reduces frustration for struggling children and boredom for high-performers."
        },
        {
            title: "Integration with Behavioral Data",
            content: "Cognitive task performance is most meaningful when interpreted alongside behavioral observations and parent/teacher reports. Our platform integrates game performance data with questionnaire responses and, when available, video-based attention monitoring. This comprehensive approach aligns with clinical best practices that emphasize multiple informants and multiple methods."
        }
    ];

    return (
        <div className="games-page">
            <Header />

            <main className="games-main">
                <section className="games-hero">
                    <div className="games-hero-content">
                        <h1 className="games-hero-title">Cognitive Assessment Games</h1>
                        <p className="games-hero-subtitle">
                            Evidence-based neuropsychological tasks designed to evaluate core cognitive
                            functions affected by ADHD in children
                        </p>
                    </div>
                </section>

                <section className="games-grid-section">
                    <div className="games-container">
                        <div className="games-intro">
                            <h2>Our Assessment Games</h2>
                            <p>
                                Each game is carefully selected based on decades of research in cognitive
                                psychology and ADHD assessment. These tasks target specific executive functions
                                that are commonly impaired in children with ADHD, providing objective,
                                quantifiable measures of cognitive performance.
                            </p>
                        </div>

                        <div className="games-grid">
                            {games.map((game) => (
                                <div key={game.id} className="game-card">
                                    <div className="game-card-header" style={{ background: game.color }}>
                                        <div className="game-icon">{game.icon}</div>
                                        <div className="game-meta">
                                            <span className="game-difficulty">{game.difficulty}</span>
                                            <span className="game-duration">{game.duration}</span>
                                        </div>
                                    </div>

                                    <div className="game-card-body">
                                        <h3 className="game-title">{game.title}</h3>
                                        <p className="game-description">{game.description}</p>

                                        <div className="game-details">
                                            <p className="game-details-text">{game.details}</p>
                                        </div>

                                        <div className="game-measures">
                                            <h4>What it measures:</h4>
                                            <div className="measures-list">
                                                {game.measures.map((measure, idx) => (
                                                    <span key={idx} className="measure-tag">{measure}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <Link to={game.link} className="game-start-btn">
                                            Start Task →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="why-games-section">
                    <div className="games-container">
                        <div className="section-header">
                            <h2>Why Game-Based Assessment Works</h2>
                            <p>
                                The integration of cognitive games into ADHD assessment represents a significant
                                advancement in pediatric psychological evaluation. Here's the science behind why
                                these approaches are so effective.
                            </p>
                        </div>

                        <div className="why-games-grid">
                            {whyGamesWork.map((item, index) => (
                                <div key={index} className="why-game-card">
                                    <div className="why-game-icon">{item.icon}</div>
                                    <h3>{item.title}</h3>
                                    <p className="why-game-content">{item.content}</p>
                                    <div className="research-note">
                                        <strong>Research Finding:</strong> {item.research}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="scientific-basis-section">
                    <div className="games-container">
                        <div className="section-header">
                            <h2>Scientific Foundation</h2>
                            <p>
                                Our assessment approach is grounded in contemporary theories of ADHD and
                                cognitive neuroscience. Understanding these foundations helps contextualize
                                why we use these specific tasks.
                            </p>
                        </div>

                        <div className="scientific-cards">
                            {scientificBasis.map((item, index) => (
                                <div key={index} className="scientific-card">
                                    <div className="card-number">{index + 1}</div>
                                    <h3>{item.title}</h3>
                                    <p>{item.content}</p>
                                    <div className="citation">
                                        <em>{item.citation}</em>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="implementation-section">
                    <div className="games-container">
                        <div className="section-header">
                            <h2>Our Implementation Approach</h2>
                            <p>
                                Beyond selecting the right tasks, effective assessment requires careful
                                consideration of how data is collected, analyzed, and interpreted.
                            </p>
                        </div>

                        <div className="implementation-grid">
                            {implementationDetails.map((item, index) => (
                                <div key={index} className="implementation-card">
                                    <div className="implementation-number">
                                        {String(index + 1).padStart(2, '0')}
                                    </div>
                                    <h3>{item.title}</h3>
                                    <p>{item.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="best-practices-section">
                    <div className="games-container">
                        <div className="best-practices-content">
                            <h2>Best Practices for Assessment</h2>

                            <div className="practice-group">
                                <h3>Before Starting</h3>
                                <ul>
                                    <li>Ensure the child is well-rested and not hungry</li>
                                    <li>Choose a quiet environment with minimal distractions</li>
                                    <li>Explain that these are games, not tests—there's no pass or fail</li>
                                    <li>Allow practice trials to ensure the child understands instructions</li>
                                    <li>Take breaks between tasks if needed</li>
                                </ul>
                            </div>

                            <div className="practice-group">
                                <h3>During Assessment</h3>
                                <ul>
                                    <li>Provide encouragement but avoid coaching on specific responses</li>
                                    <li>Watch for signs of fatigue or frustration</li>
                                    <li>Ensure the child maintains proper distance from the screen</li>
                                    <li>Minimize interruptions and external stimuli</li>
                                    <li>Allow the child to complete all tasks in one session when possible</li>
                                </ul>
                            </div>

                            <div className="practice-group">
                                <h3>After Completion</h3>
                                <ul>
                                    <li>Review results in conjunction with behavioral questionnaires</li>
                                    <li>Consider performance patterns across all three tasks</li>
                                    <li>Remember that these are screening tools, not diagnostic instruments</li>
                                    <li>Consult with healthcare professionals for comprehensive evaluation</li>
                                    <li>Use results to inform conversations with teachers and clinicians</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cta-section">
                    <div className="cta-content">
                        <Users className="cta-icon" />
                        <h2>Ready to Begin Assessment?</h2>
                        <p>
                            Complete all three cognitive tasks for a comprehensive evaluation of attention,
                            working memory, and impulse control. Each task takes just 3-8 minutes.
                        </p>
                        <div className="cta-buttons">
                            <Link to="/Nback" className="btn btn-primary">Start with N-Back</Link>
                            <Link to="/form" className="btn btn-secondary">Begin with Questionnaire</Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Games;