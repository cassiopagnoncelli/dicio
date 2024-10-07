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
  const [finalLevel, setFinalLevel] = useState(null); // Stores the final determined level

  // Mapping the levels to their labels
  const levelLabels = ["Nível básico", "Nível intermediário", "Nível fluente", "Nível provecto"];

  useEffect(() => {
    if (level < 4) {
      const wordPoolSize = phase === 1 ? 24 : 48; // Phase 1: 24 words, Phase 2: 48 words
      setQuestionPool(
        dict[level - 1] // Adjust to 0-based index for level
          .filter((word) => !usedWords.includes(word))
          .sort(() => 0.5 - Math.random())
          .slice(0, wordPoolSize)
      );
    }
  }, [level, phase, usedWords]);

  const resetScores = () => {
    setPassiveScore(0);
    setActiveScore(0);
    setCurrentQuestion(0);
    setAnswers([]);
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
    setUsedWords([...usedWords, questionPool[currentQuestion]]);

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questionPool.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      evaluateScores(newPassiveScore);
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
  }, [currentQuestion, questionPool, answers, passiveScore, activeScore, isFinished]);

  return (
    <div className="container">
      {/* Show header only if the test is not finished */}
      {!isFinished && (
        <div className="header-bar">
          {/* Show back button only if the current question is greater than 0 */}
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
            {/* Check if it's the refinement phase and display the correct label */}
            {phase === 1 ? levelLabels[level - 1] : `Refinamento ${levelLabels[level - 1]}`}
          </div>
          <div className="right-text">
            {currentQuestion + 1} / {questionPool.length}
          </div>
        </div>
      )}

      {isFinished ? (
        <div>
          <h2>Você terminou o teste!</h2>
          <p>Pontuação Passiva (C ou D): {passiveScore} pontos</p>
          <p>Pontuação Ativa (D): {activeScore} pontos</p>
          {finalLevel !== null && (
            <p>Seu nível determinado é: <strong>{levelLabels[finalLevel - 1]}</strong></p>
          )}
        </div>
      ) : (
        <div>
          <p>Escolha uma opção para a palavra: <strong>{questionPool[currentQuestion]}</strong></p>

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
