import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; // Import the CSS file
import dict from './words';
import Repertoire from './Repertoire';

// Fisher-Yates Shuffle
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

function App() {
  // Routing state
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [passiveScore, setPassiveScore] = useState(0);
  const [activeScore, setActiveScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [usedWords, setUsedWords] = useState([]);
  const [level, setLevel] = useState(1); // Start at level 1 (use 0-based index if needed)
  const [phase, setPhase] = useState(1); // Phase 1: Finding level; Phase 2: Refinement phase
  const [questionPool, setQuestionPool] = useState([]);
  const [unusedWords, setUnusedWords] = useState([]); // Separate list for unused words
  const [unusedCounter, setUnusedCounter] = useState(0); // Counter for unused words
  const [finalLevel, setFinalLevel] = useState(null); // Stores the final determined level

  const levelLabels = ["Nível básico", "Nível intermediário", "Nível fluente", "Nível provecto"];
  
  // Define the word ranges for each level
  const wordRanges = {
    1: { min: 0, max: 3000 },
    2: { min: 3000, max: 18000 },
    3: { min: 18000, max: 30000 },
    4: { min: 30000, max: 48000 },
  };

  useEffect(() => {
    if (level <= 4) {
      const wordPoolSize = phase === 1 ? 24 : 48; // Phase 1: 24 words, Phase 2: 48 words
      const filteredWords = dict[level - 1].filter((word) => !usedWords.includes(word));

      // Embaralhar as palavras antes de cortar para o tamanho do pool
      const shuffledWords = shuffleArray(filteredWords);

      setQuestionPool(shuffledWords.slice(0, wordPoolSize)); // Set the question pool for the phase
      setUnusedWords(shuffledWords); // Keep a separate list for unused words
    }
  }, [level, phase, usedWords]);

  const resetScores = () => {
    setPassiveScore(0);
    setActiveScore(0);
    setCurrentQuestion(0);
    setAnswers([]);
    setUnusedCounter(0); // Reset the unused counter
  };

  // Memoize the evaluateScores function using useCallback
  const evaluateScores = useCallback((score) => {
    if (phase === 1) {
      if (score < 6) {
        if (level === 1) {
          setIsFinished(true); // End test if fewer than 6 passives on level 1
        } else {
          setLevel(level - 1);
          setPhase(2); // Move to the refinement phase
          resetScores();
        }
      } else if (score >= 6 && score <= 17) {
        setFinalLevel(level); // Determine the test-taker's final level
        setPhase(2); // Move to phase 2 (refinement phase)
        resetScores();
      } else if (score >= 18) {
        if (level === 4) {
          setFinalLevel(level);
          setPhase(2);
          resetScores();
        } else {
          setLevel(level + 1);
          resetScores();
        }
      }
    } else if (phase === 2) {
      setIsFinished(true); // End the test after the second phase
    }
  }, [level, phase]);

  const handleAnswer = useCallback((answer) => {
    if (isFinished) return; // Do nothing if the test is finished

    let newPassiveScore = passiveScore;
    let newActiveScore = activeScore;

    if (answer === 'C' || answer === 'D') {
      newPassiveScore += 1;
    }
    if (answer === 'D') {
      newActiveScore += 1;
    }

    setAnswers([...answers, answer]);
    setPassiveScore(newPassiveScore);
    setActiveScore(newActiveScore);

    const nextQuestion = currentQuestion + 1;
    const nextUnusedCounter = unusedCounter + 1;

    if (phase === 1) {
      if (nextQuestion < questionPool.length) {
        setCurrentQuestion(nextQuestion); // Move to next question in phase 1
      } else {
        evaluateScores(newPassiveScore); // Evaluate and transition to phase 2 or finish
      }
    } else if (phase === 2) {
      if (nextUnusedCounter < unusedWords.length && nextUnusedCounter < 36) { // Limit to 36 questions in phase 2
        setUnusedCounter(nextUnusedCounter); // Move to next question in unused words
      } else {
        setIsFinished(true); // End the test after 36 questions or all unused words are done
      }
    }
  }, [isFinished, passiveScore, activeScore, answers, currentQuestion, phase, unusedCounter, questionPool.length, unusedWords.length, evaluateScores]);

  // Calculate vocabulary estimate based on level and score
  const calculateVocabularyEstimate = (level, score) => {
    const { min, max } = wordRanges[level];
    return min + (score / 36) * (max - min);
  };

  // Calculate 95% confidence interval for vocabulary estimate
  const calculateConfidenceInterval = (level, score) => {
    const { min, max } = wordRanges[level];
    const p = score / 36;
    const n = 36;
    const standardError = Math.sqrt((p * (1 - p)) / n);
    const lowerBoundProportion = p - 1.96 * standardError;
    const upperBoundProportion = p + 1.96 * standardError;

    const lowerBound = lowerBoundProportion * (max - min) + min;
    const upperBound = upperBoundProportion * (max - min) + min;

    return { lowerBound, upperBound };
  };

  const handleBack = () => {
    if (currentQuestion > 0 && !isFinished) {
      const previousAnswer = answers[currentQuestion - 1];
      let newPassiveScore = passiveScore;
      let newActiveScore = activeScore;

      if (previousAnswer === 'C' || previousAnswer === 'D') {
        newPassiveScore -= 1;
      }
      if (previousAnswer === 'D') {
        newActiveScore -= 1;
      }

      setAnswers(answers.slice(0, -1));
      setPassiveScore(newPassiveScore);
      setActiveScore(newActiveScore);
      setCurrentQuestion(currentQuestion - 1);
      setUsedWords(usedWords.slice(0, -1));
    }
  };

  // Handle browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);


  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isFinished || currentRoute === '/repertoire') return; // Do nothing if the test is finished or on repertoire page

      switch (event.key) {
        case '1':
          handleAnswer('A');
          break;
        case '2':
          handleAnswer('B');
          break;
        case '3':
          handleAnswer('C');
          break;
        case '4':
          handleAnswer('D');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleAnswer, isFinished, currentRoute]);

  // Render different components based on route
  if (currentRoute === '/repertoire') {
    return <Repertoire />;
  }

  return (
    <div>
      {!isFinished && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          position: 'relative'
        }}>
          {/* Left: Back button */}
          <div style={{ flex: '0 0 auto' }}>
            {currentQuestion > 0 && (
              <button onClick={handleBack} style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d'
              }}>
                ←
              </button>
            )}
          </div>
          
          {/* Center: Title */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '18px',
            fontWeight: '600',
            color: '#495057'
          }}>
            {phase === 1 ? levelLabels[level - 1] : `Refinamento ${levelLabels[level - 1]}`}
          </div>
          
          {/* Right: Counter */}
          <div style={{
            marginLeft: 'auto',
            fontSize: '16px',
            color: '#6c757d'
          }}>
            {phase === 1 ? currentQuestion + 1 : unusedCounter + 1} / {phase === 1 ? questionPool.length : Math.min(36, unusedWords.length)}
          </div>
        </div>
      )}

      {!isFinished && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '40px 20px'
        }}>
          <p style={{
            fontSize: window.innerWidth < 768 ? '28px' : '36px',
            fontWeight: 'bold',
            marginBottom: '40px',
            textAlign: 'center'
          }}>
            {phase === 1 ? 
              (questionPool[currentQuestion] && questionPool[currentQuestion].charAt(0).toUpperCase() + questionPool[currentQuestion].slice(1)) :
              (unusedWords[unusedCounter] && unusedWords[unusedCounter].charAt(0).toUpperCase() + unusedWords[unusedCounter].slice(1))
            }
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            width: '100%',
            maxWidth: '500px'
          }}>
            <button onClick={() => handleAnswer('A')} style={{
              padding: '15px 20px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Desconheço
            </button>
            <button onClick={() => handleAnswer('B')} style={{
              padding: '15px 20px',
              fontSize: '16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Tenho vaga ideia
            </button>
            <button onClick={() => handleAnswer('C')} style={{
              padding: '15px 20px',
              fontSize: '16px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Reconheço mas nunca usei
            </button>
            <button onClick={() => handleAnswer('D')} style={{
              padding: '15px 20px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              Conheço e sei empregar
            </button>
          </div>

          <p style={{
            marginTop: '30px',
            fontSize: '14px',
            color: '#6c757d',
            textAlign: 'center'
          }}>
            Use as teclas 1, 2, 3, 4 para escolher rapidamente entre as opções.
          </p>
        </div>
      )}

      {isFinished && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          {finalLevel !== null && (
            <div>
              <h3 style={{
                fontSize: window.innerWidth < 768 ? '20px' : '24px',
                fontWeight: '600',
                color: '#495057',
                marginBottom: '20px'
              }}>{levelLabels[finalLevel - 1]}</h3>
              <h1 style={{
                fontSize: window.innerWidth < 768 ? '32px' : '48px',
                fontWeight: 'bold',
                color: '#2d3436',
                marginBottom: '40px'
              }}>{Math.round(calculateVocabularyEstimate(finalLevel, passiveScore)).toLocaleString('pt-BR')} palavras</h1>
              <div style={{ 
                textAlign: 'left', 
                maxWidth: '600px',
                margin: '0 auto',
                fontSize: window.innerWidth < 768 ? '16px' : '18px',
                lineHeight: '1.6'
              }}>
                {/* Vocabulário passivo */}
                <p style={{ marginBottom: '20px' }}>
                  Cerca de <strong>{Math.round(calculateVocabularyEstimate(finalLevel, passiveScore)).toLocaleString('pt-BR')}</strong> no vocabulário passivo, intervalo de <strong>{Math.round(calculateConfidenceInterval(finalLevel, passiveScore).lowerBound).toLocaleString('pt-BR')}</strong> a <strong>{Math.round(calculateConfidenceInterval(finalLevel, passiveScore).upperBound).toLocaleString('pt-BR')}</strong> palavras.
                </p>

                {/* Vocabulário ativo */}
                <p style={{ marginBottom: '0' }}>
                  Cerca de <strong>{Math.round(calculateVocabularyEstimate(finalLevel, activeScore)).toLocaleString('pt-BR')}</strong> no vocabulário ativo, intervalo de <strong>{Math.round(calculateConfidenceInterval(finalLevel, activeScore).lowerBound).toLocaleString('pt-BR')}</strong> a <strong>{Math.round(calculateConfidenceInterval(finalLevel, activeScore).upperBound).toLocaleString('pt-BR')}</strong> palavras.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <footer style={{ 
        marginTop: 'auto', 
        padding: '20px', 
        textAlign: 'center', 
        borderTop: '1px solid #dee2e6',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        Código-fonte disponível em
        <a href="https://github.com/cassiopagnoncelli/dicio" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px', color: '#007bff' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.112.793-.262.793-.583 0-.288-.01-1.05-.015-2.06-3.338.727-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.746.083-.73.083-.73 1.204.084 1.837 1.237 1.837 1.237 1.07 1.834 2.809 1.305 3.495.997.108-.774.418-1.305.76-1.605-2.666-.305-5.467-1.333-5.467-5.93 0-1.31.47-2.38 1.237-3.22-.125-.304-.537-1.527.117-3.176 0 0 1.01-.324 3.3 1.23a11.48 11.48 0 0 1 3.006-.404 11.5 11.5 0 0 1 3.006.404c2.29-1.554 3.3-1.23 3.3-1.23.655 1.65.243 2.873.118 3.176.77.84 1.237 1.91 1.237 3.22 0 4.61-2.803 5.624-5.474 5.922.43.372.81 1.102.81 2.222 0 1.606-.014 2.898-.014 3.293 0 .324.193.698.8.58C20.565 21.797 24 17.298 24 12 24 5.37 18.63 0 12 0z"/>
          </svg> Cássio Pagnoncelli
        </a>
      </footer>
    </div>
  );
}

export default App;
