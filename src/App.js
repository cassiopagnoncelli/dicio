import React, { useState, useEffect } from 'react';
import './App.css'; // Import the CSS file
import dict from './words';

function App() {
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
    3: { min: 18000, max: 32000 },
    4: { min: 32000, max: 60000 },
  };

  useEffect(() => {
    if (level < 4) {
      const wordPoolSize = phase === 1 ? 24 : 48; // Phase 1: 24 words, Phase 2: 48 words
      const filteredWords = dict[level - 1].filter((word) => !usedWords.includes(word));
      setQuestionPool(filteredWords.slice(0, wordPoolSize)); // Set the question pool for the phase
      setUnusedWords(filteredWords); // Keep a separate list for unused words
    }
  }, [level, phase, usedWords]);

  const resetScores = () => {
    setPassiveScore(0);
    setActiveScore(0);
    setCurrentQuestion(0);
    setAnswers([]);
    setUnusedCounter(0); // Reset the unused counter
  };

  const handleAnswer = (answer) => {
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
  };

  const evaluateScores = (score) => {
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
          setLevel(level + 1); // Go to the next level if they score 18 or more
          resetScores();
        }
      }
    } else if (phase === 2) {
      setIsFinished(true); // End the test after the second phase
    }
  };

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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isFinished) return; // Do nothing if the test is finished

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
  }, [currentQuestion, questionPool, unusedCounter, answers, passiveScore, activeScore, isFinished]);

  return (
    <div className="container">
      {!isFinished && (
        <div className="header-bar">
          {currentQuestion > 0 && (
            <div className="back-button-container">
              <button className="back-button" onClick={handleBack}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-arrow-left">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </button>
            </div>
          )}
          <div className="center-text">
            {phase === 1 ? levelLabels[level - 1] : `Refinamento ${levelLabels[level - 1]}`}
          </div>
          <div className="right-text">
            {phase === 1 ? currentQuestion + 1 : unusedCounter + 1} / {phase === 1 ? questionPool.length : Math.min(36, unusedWords.length)}
          </div>
        </div>
      )}

      {isFinished ? (
        <div>
          {finalLevel !== null && (
            <div>
              <h3>{levelLabels[finalLevel - 1]}</h3>
              <h1>{Math.round(calculateVocabularyEstimate(finalLevel, passiveScore)).toLocaleString('pt-BR')} palavras</h1>
              <div style={{ textAlign: 'left', listStyleType: 'none', marginTop: '30px' }}>
                {/* Vocabulário passivo */}
                <p>
                  Cerca de <strong>{Math.round(calculateVocabularyEstimate(finalLevel, passiveScore)).toLocaleString('pt-BR')}</strong> no vocabulário passivo, intervalo de <strong>{Math.round(calculateConfidenceInterval(finalLevel, passiveScore).lowerBound).toLocaleString('pt-BR')}</strong> a <strong>{Math.round(calculateConfidenceInterval(finalLevel, passiveScore).upperBound).toLocaleString('pt-BR')}</strong> palavras.
                </p>

                {/* Vocabulário ativo */}
                <p>
                  Cerca de <strong>{Math.round(calculateVocabularyEstimate(finalLevel, activeScore)).toLocaleString('pt-BR')}</strong> no vocabulário ativo, intervalo de <strong>{Math.round(calculateConfidenceInterval(finalLevel, activeScore).lowerBound).toLocaleString('pt-BR')}</strong> a <strong>{Math.round(calculateConfidenceInterval(finalLevel, activeScore).upperBound).toLocaleString('pt-BR')}</strong> palavras.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p>Escolha uma opção para a palavra: <strong>{phase === 1 ? questionPool[currentQuestion] : unusedWords[unusedCounter]}</strong></p>

          <button className="option-a" onClick={() => handleAnswer('A')}>Desconheço</button>
          <button className="option-b" onClick={() => handleAnswer('B')}>Tenho vaga ideia</button>
          <button className="option-c" onClick={() => handleAnswer('C')}>Reconheço mas nunca usei</button>
          <button className="option-d" onClick={() => handleAnswer('D')}>Conheço e sei empregar</button>

          <footer>
            <p>Use as teclas 1, 2, 3, 4 para escolher rapidamente entre as opções.</p>
          </footer>
        </div>
      )}
    </div>
  );
}

export default App;
