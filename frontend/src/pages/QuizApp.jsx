import React, { useState } from 'react';
import { HelpCircle, Trophy, CheckCircle2, XCircle, RotateCcw, Award, Zap, Brain, Sparkles, MessageCircle, LogOut } from 'lucide-react';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "What is the single-digit sum of the numbers 4, 8, and 9? (4 + 8 + 9 = 21 -> 2 + 1)",
    options: ["3", "5", "7", "9"],
    correct: 0,
    explanation: "4 + 8 + 9 = 21. Sum of digits: 2 + 1 = 3."
  },
  {
    id: 2,
    question: "Which planet in our solar system is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correct: 1,
    explanation: "Mars is called the Red Planet because of iron oxide on its surface."
  },
  {
    id: 3,
    question: "If a train travels 120 km in 2 hours, what is its average speed?",
    options: ["40 km/h", "50 km/h", "60 km/h", "70 km/h"],
    correct: 2,
    explanation: "Speed = Distance / Time = 120 km / 2 hours = 60 km/h."
  },
  {
    id: 4,
    question: "What is the result of (15 × 4) + (25 ÷ 5)?",
    options: ["55", "60", "65", "70"],
    correct: 2,
    explanation: "15 × 4 = 60 and 25 ÷ 5 = 5. So 60 + 5 = 65."
  },
  {
    id: 5,
    question: "Which chemical element has the symbol 'O'?",
    options: ["Gold", "Oxygen", "Osmium", "Silver"],
    correct: 1,
    explanation: "Oxygen is represented by the chemical symbol O."
  },
  {
    id: 6,
    question: "Find the next number in the pattern: 3, 6, 12, 24, __?",
    options: ["36", "40", "48", "52"],
    correct: 2,
    explanation: "Each number doubles: 3×2=6, 6×2=12, 12×2=24, 24×2=48."
  },
  {
    id: 7,
    question: "What is the capital city of India?",
    options: ["Mumbai", "New Delhi", "Kolkata", "Bengaluru"],
    correct: 1,
    explanation: "New Delhi is the official capital city of India."
  },
  {
    id: 8,
    question: "How many sides does a regular Hexagon have?",
    options: ["5", "6", "7", "8"],
    correct: 1,
    explanation: "A hexagon is a polygon with 6 sides and 6 angles."
  },
  {
    id: 9,
    question: "What is 50% of 250?",
    options: ["100", "115", "125", "150"],
    correct: 2,
    explanation: "50% means half of the value: 250 / 2 = 125."
  },
  {
    id: 10,
    question: "Which organ pumps blood throughout the human body?",
    options: ["Lungs", "Brain", "Heart", "Liver"],
    correct: 2,
    explanation: "The heart is the muscular organ that pumps blood through blood vessels."
  }
];

const QuizApp = ({ onLogout, wpNumber = '' }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answersHistory, setAnswersHistory] = useState([]);

  const currentQ = QUIZ_QUESTIONS[currentIdx];

  const handleSelectOption = (index) => {
    if (selectedOption !== null) return; // Prevent re-selecting
    setSelectedOption(index);

    const isCorrect = index === currentQ.correct;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setAnswersHistory(prev => [
      ...prev,
      {
        questionId: currentQ.id,
        userChoice: index,
        isCorrect
      }
    ]);
  };

  const handleNext = () => {
    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setShowResult(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setScore(0);
    setShowResult(false);
    setAnswersHistory([]);
  };

  const cleanWpNumber = (wpNumber || '').replace(/\D/g, '');

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#09121f',
      backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.15), transparent 70%), radial-gradient(circle at 80% 80%, rgba(214, 190, 102, 0.12), transparent 60%)',
      color: '#ffffff',
      padding: '20px 16px 40px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Top App Header Bar */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '12px 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <Brain size={20} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#ffffff' }}>Knowledge Quiz</h4>
            <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: '600' }}>Brain Teasers & Trivia</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {cleanWpNumber && (
            <a
              href={`https://wa.me/${cleanWpNumber}`}
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none'
              }}
            >
              <MessageCircle size={14} /> Help
            </a>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '6px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {!showResult ? (
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '24px 20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)'
          }}>
            {/* Progress Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '800',
                color: '#93c5fd',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                padding: '4px 10px',
                borderRadius: '12px'
              }}>
                Question {currentIdx + 1} of {QUIZ_QUESTIONS.length}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: '800', color: '#f59e0b' }}>
                <Trophy size={16} /> Score: {score}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '24px'
            }}>
              <div style={{
                height: '100%',
                width: `${((currentIdx + 1) / QUIZ_QUESTIONS.length) * 100}%`,
                background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                transition: 'width 0.3s ease'
              }} />
            </div>

            {/* Question Text */}
            <h3 style={{
              fontSize: '1.15rem',
              fontWeight: '700',
              lineHeight: '1.45',
              color: '#ffffff',
              marginBottom: '24px'
            }}>
              {currentQ.question}
            </h3>

            {/* Options Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correct;
                const isAnswered = selectedOption !== null;

                let bg = 'rgba(255, 255, 255, 0.06)';
                let border = '1px solid rgba(255, 255, 255, 0.15)';
                let textColor = '#e2e8f0';

                if (isAnswered) {
                  if (isCorrect) {
                    bg = 'rgba(34, 197, 94, 0.25)';
                    border = '2px solid #22c55e';
                    textColor = '#4ade80';
                  } else if (isSelected) {
                    bg = 'rgba(239, 68, 68, 0.25)';
                    border = '2px solid #ef4444';
                    textColor = '#fca5a5';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      borderRadius: '14px',
                      backgroundColor: bg,
                      border: border,
                      color: textColor,
                      fontSize: '0.92rem',
                      fontWeight: '600',
                      textAlign: 'left',
                      cursor: isAnswered ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                    {isAnswered && isCorrect && <CheckCircle2 size={18} style={{ color: '#22c55e' }} />}
                    {isAnswered && isSelected && !isCorrect && <XCircle size={18} style={{ color: '#ef4444' }} />}
                  </button>
                );
              })}
            </div>

            {/* Explanation box after selection */}
            {selectedOption !== null && (
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '0.82rem',
                color: '#bfdbfe',
                marginBottom: '20px',
                lineHeight: '1.4'
              }}>
                <strong style={{ color: '#60a5fa' }}>Explanation:</strong> {currentQ.explanation}
              </div>
            )}

            {/* Next Button */}
            {selectedOption !== null && (
              <button
                onClick={handleNext}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {currentIdx < QUIZ_QUESTIONS.length - 1 ? 'Next Question →' : 'See Results 🏆'}
              </button>
            )}
          </div>
        ) : (
          /* Final Results Screen */
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 30px rgba(245, 158, 11, 0.5)'
            }}>
              <Trophy size={40} style={{ color: '#ffffff' }} />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 6px 0', color: '#ffffff' }}>
              Quiz Completed!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 24px 0' }}>
              Great effort! Here is your total score:
            </p>

            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '28px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '2.8rem', fontWeight: '900', color: '#f59e0b', lineHeight: '1' }}>
                {score} / {QUIZ_QUESTIONS.length}
              </div>
              <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '600', marginTop: '6px', display: 'block' }}>
                {score >= 8 ? '🌟 Outstanding Knowledge!' : score >= 5 ? '👍 Good Job! Keep Learning.' : '💪 Try Again to Improve!'}
              </span>
            </div>

            <button
              onClick={handleRestart}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={18} /> Restart Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizApp;
