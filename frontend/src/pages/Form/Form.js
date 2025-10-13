import { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import './Form.css';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const QUESTIONS = [
  { id: 'i1', text: 'Does your child often fail to pay close attention to details or make careless mistakes in schoolwork?', category: 'inattentive' },
  { id: 'i2', text: 'Does your child have difficulty sustaining attention during tasks or play activities?', category: 'inattentive' },
  { id: 'i3', text: 'Does your child seem not to listen when spoken to directly?', category: 'inattentive' },
  { id: 'i4', text: 'Does your child often lose necessary items (books, toys, pencils, homework)?', category: 'inattentive' },
  { id: 'i5', text: 'Does your child avoid or dislike tasks that require sustained mental effort (e.g., homework)?', category: 'inattentive' },
  { id: 'i6', text: 'Is your child easily distracted by surrounding noises or activities?', category: 'inattentive' },
  { id: 'i7', text: 'Does your child often forget daily activities (chores, instructions, assignments)?', category: 'inattentive' },
  { id: 'h1', text: 'Does your child fidget with hands or feet, or squirm when seated?', category: 'hyperactive' },
  { id: 'h2', text: 'Does your child leave their seat in situations when remaining seated is expected?', category: 'hyperactive' },
  { id: 'h3', text: 'Does your child often run about or climb excessively in inappropriate situations?', category: 'hyperactive' },
  { id: 'h4', text: 'Does your child have difficulty playing or engaging in activities quietly?', category: 'hyperactive' },
  { id: 'h5', text: 'Does your child seem "on the go" or act as if "driven by a motor"?', category: 'hyperactive' },
  { id: 'h6', text: 'Does your child talk excessively compared to peers?', category: 'hyperactive' },
  { id: 'hi1', text: 'Does your child blurt out answers before a question has been completed?', category: 'both' },
  { id: 'hi2', text: 'Does your child have difficulty waiting for their turn in group situations?', category: 'both' },
  { id: 'hi3', text: 'Does your child interrupt or intrude on others (butting into conversations, games)?', category: 'both' },
  { id: 'hi4', text: 'Does your child frequently switch from one unfinished activity to another?', category: 'both' },
  { id: 'hi5', text: 'Does your child act without thinking about the consequences (e.g., dangerous play)?', category: 'both' },
  { id: 'hi6', text: 'Does your child become frustrated easily when asked to sit still or focus?', category: 'both' },
  { id: 'hi7', text: 'Does your child often act in socially inappropriate ways (blurting, grabbing, interrupting)?', category: 'both' }
];

const RESPONSE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'cannot-answer', label: 'Cannot Answer' }
];

export default function BehavioralQuestionnaire({ onComplete }) {
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Scroll to top on mount
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

  const handleResponse = (questionId, value) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateScores = () => {
    let inattentiveScore = 0;
    let hyperactiveScore = 0;

    QUESTIONS.forEach(q => {
      const response = responses[q.id];
      if (response === 'yes') {
        if (q.category === 'inattentive') inattentiveScore += 1;
        else if (q.category === 'hyperactive') hyperactiveScore += 1;
        else if (q.category === 'both') {
          inattentiveScore += 1;
          hyperactiveScore += 1;
        }
      }
    });

    return { inattentiveScore, hyperactiveScore };
  };

  const getClassification = (inattentiveScore, hyperactiveScore) => {
    const inattentiveThreshold = 5;
    const hyperactiveThreshold = 6;

    if (inattentiveScore < inattentiveThreshold && hyperactiveScore < hyperactiveThreshold) return 'No ADHD';
    if (inattentiveScore >= inattentiveThreshold && hyperactiveScore < hyperactiveThreshold) return 'Inattentive ADHD';
    if (inattentiveScore < inattentiveThreshold && hyperactiveScore >= hyperactiveThreshold) return 'Hyperactive/Impulsive ADHD';
    return 'Combined ADHD';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { inattentiveScore, hyperactiveScore } = calculateScores();
    const classification = getClassification(inattentiveScore, hyperactiveScore);

    const questionnaireResults = {
      inattentiveScore,
      hyperactiveScore,
      classification,
      responses: QUESTIONS.map(q => ({
        questionId: q.id,
        question: q.text,
        response: responses[q.id] || 'not-answered',
        category: q.category
      }))
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questionnaire: questionnaireResults })
      });

      if (!res.ok) throw new Error('Failed to save assessment');
      const data = await res.json();
      setMessage('✅ Assessment saved successfully');
      onComplete(data.assessment);
    } catch (err) {
      console.error(err);
      setMessage('❌ Failed to save assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const allAnswered = QUESTIONS.every(q => responses[q.id]);
  const progress = (Object.keys(responses).length / QUESTIONS.length) * 100;

  return (
    <div>
      <Header />
      <div className="bq-container">
        <div className="bq-card">
          <div className="bq-header">
            <div className="bq-icon">
              <ClipboardList className="icon" />
            </div>
            <div>
              <h2 className="bq-title">ADHD Parent Questionnaire</h2>
              <p className="bq-subtitle">20 Questions - Preliminary Screening</p>
            </div>
          </div>

          <p className="bq-intro">
            Please answer each question based on your child's behavior over the past 6 months.
            This covers school, home, and social situations.
          </p>

          <div className="bq-progress">
            <div className="progress-info">
              <span>Progress</span>
              <span className="progress-count">{Object.keys(responses).length} / {QUESTIONS.length}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bq-form">
            {QUESTIONS.map((q, i) => (
              <div key={q.id} className="question-box">
                <div className="question-header">
                  <span className="question-number">{i + 1}</span>
                  <div className="question-text">
                    <p>{q.text}</p>
                    <span className={`tag ${q.category}`}>{q.category}</span>
                  </div>
                </div>

                <div className="options">
                  {RESPONSE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleResponse(q.id, option.value)}
                      className={`option-btn ${responses[q.id] === option.value ? option.value : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="bq-note">
              <p><strong>Note:</strong> This questionnaire is a screening tool only. Professional evaluation is required for accurate diagnosis.</p>
            </div>

            <button type="submit" disabled={!allAnswered || loading} className={`submit-btn ${!allAnswered ? 'disabled' : ''}`}>
              {loading
                ? 'Saving...'
                : allAnswered
                  ? 'Complete Assessment & View Results'
                  : `Please answer all questions (${QUESTIONS.length - Object.keys(responses).length} remaining)`}
            </button>

            {message && <p className="status-msg">{message}</p>}
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
