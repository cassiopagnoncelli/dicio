import React, { useState, useEffect } from 'react';
import dict from './words';

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [passiveScore, setPassiveScore] = useState(0);
  const [activeScore, setActiveScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [usedWords, setUsedWords] = useState([]);
  const [level, setLevel] = useState(0); // Current dictionary level (0 to 3)
  const [phase, setPhase] = useState(1); // Phase 1: Finding level; Phase 2: Final level test
  const [questionPool, setQuestionPool] = useState([]);
  const [finalLevel, setFinalLevel] = useState(null); // Stores the final determined level

  useEffect(() => {
    if (level < 4) {
      const wordPoolSize = phase === 1 ? 24 : 48; // Phase 1: 24 words, Phase 2: 48 words
      setQuestionPool(
        dict[level]
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
        if (level === 0) {
          setIsFinished(true); // End test if fewer than 6 passives on level 0
        } else {
          // If on level N (2, 3 or 4), go to N-1 with 48 questions
          setLevel(level - 1);
          setPhase(2);
          resetScores();
        }
      } else if (score >= 6 && score <= 17) {
        setFinalLevel(level); // Determine the test-taker's final level
        setPhase(2); // Move to phase 2 (final test at the determined level)
        resetScores();
      } else if (score >= 18) {
        if (level === 3) {
          // If we're in level 4, even if score >= 18, go to refinement phase
          setFinalLevel(level); // Keep the user in the final level
          setPhase(2); // Move to phase 2 (refinement test at level 4)
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
    <div>
      <h1>Questionário de Palavras</h1>

      {isFinished ? (
        <div>
          <h2>Você terminou o teste!</h2>
          <p>Pontuação Passiva (C ou D): {passiveScore} pontos</p>
          <p>Pontuação Ativa (D): {activeScore} pontos</p>
          {finalLevel !== null && (
            <p>Seu nível determinado é: {finalLevel + 1}</p>
          )}
        </div>
      ) : (
        <div>
          <h2>Pergunta {currentQuestion + 1} de {questionPool.length}</h2>
          <p>Escolha uma opção para a palavra: <strong>{questionPool[currentQuestion]}</strong></p>

          <button onClick={() => handleAnswer('A')}>A</button>
          <button onClick={() => handleAnswer('B')}>B</button>
          <button onClick={() => handleAnswer('C')}>C</button>
          <button onClick={() => handleAnswer('D')}>D</button>

          {currentQuestion > 0 && (
            <button onClick={handleBack}>Voltar</button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
