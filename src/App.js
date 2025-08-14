import React, { useState, useEffect, useCallback } from 'react';
import dict from './words';
import Advanced from './Advanced';

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
  const [showTransition, setShowTransition] = useState(false); // Show transition message for fluente level

  const levelLabels = ["Nível básico", "Nível intermediário", "Nível fluente"];
  
  // Define the word ranges for each level
  const wordRanges = {
    1: { min: 0, max: 3000 },
    2: { min: 3000, max: 18000 },
    3: { min: 18000, max: 30000 },
  };

  useEffect(() => {
    if (level <= 3) {
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

  // Navigation function
  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path);
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
        if (level === 3) {
          // If user progresses level 3 (fluente), show transition message
          setShowTransition(true);
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
      if (isFinished || currentRoute === '/advanced') return; // Do nothing if the test is finished or on advanced page

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
  if (currentRoute === '/advanced') {
    return <Advanced />;
  }

  // Redirect root to assessment
  if (currentRoute === '/') {
    navigateTo('/assessment');
    return null;
  }

  if (currentRoute === '/assessment') {
    return (
      <div>
        {!isFinished && (
          <div className="flex items-center p-5 bg-gray-50 border-b border-gray-200 relative">
            {/* Left: Back button */}
            <div className="flex-none">
              {currentQuestion > 0 && (
                <button onClick={handleBack} className="bg-transparent border-none text-2xl cursor-pointer text-gray-500 hover:text-gray-700">
                  ←
                </button>
              )}
            </div>
            
            {/* Center: Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold text-gray-700">
              {phase === 1 ? levelLabels[level - 1] : `Refinamento ${levelLabels[level - 1]}`}
            </div>
            
            {/* Right: Counter */}
            <div className="ml-auto text-base text-gray-500">
              {phase === 1 ? currentQuestion + 1 : unusedCounter + 1} / {phase === 1 ? questionPool.length : Math.min(36, unusedWords.length)}
            </div>
          </div>
        )}

        {showTransition && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] py-10 px-5 text-center">
            <div className="bg-gray-50 rounded-2xl p-8 md:p-10 max-w-2xl border-2 border-blue-500">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-700 mb-5">📋 Teste Estendido Qualificado</h2>
              
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-8">
                Baseado no seu desempenho, você está qualificado para o <strong>Teste de Repertório Estatístico</strong>,
                que fornecerá uma análise abrangente e precisa do seu vocabulário.
              </p>
              
              <button onClick={() => navigateTo('/advanced')} className="bg-blue-500 text-white border-none rounded-lg py-4 px-8 text-base font-semibold cursor-pointer hover:bg-blue-600 transition-colors">
                Prosseguir para Teste Estendido
              </button>
            </div>
          </div>
        )}

        {!isFinished && !showTransition && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] py-10 px-5">
            <p className="text-3xl md:text-4xl font-bold mb-10 text-center">
              {phase === 1 ? 
                (questionPool[currentQuestion] && questionPool[currentQuestion].charAt(0).toUpperCase() + questionPool[currentQuestion].slice(1)) :
                (unusedWords[unusedCounter] && unusedWords[unusedCounter].charAt(0).toUpperCase() + unusedWords[unusedCounter].slice(1))
              }
            </p>

            <div className="flex flex-col gap-4 w-full max-w-lg">
              <button onClick={() => handleAnswer('A')} className="py-4 px-5 text-base bg-red-500 text-white border-none rounded-lg cursor-pointer hover:bg-red-600 transition-colors">
                Desconheço
              </button>
              <button onClick={() => handleAnswer('B')} className="py-4 px-5 text-base bg-gray-500 text-white border-none rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                Tenho vaga ideia
              </button>
              <button onClick={() => handleAnswer('C')} className="py-4 px-5 text-base bg-yellow-400 text-black border-none rounded-lg cursor-pointer hover:bg-yellow-500 transition-colors">
                Nunca usei, mas entendo o significado
              </button>
              <button onClick={() => handleAnswer('D')} className="py-4 px-5 text-base bg-green-500 text-white border-none rounded-lg cursor-pointer hover:bg-green-600 transition-colors">
                Conheço e sei empregar
              </button>
            </div>

            <p className="mt-8 text-sm text-gray-500 text-center">
              Use as teclas 1, 2, 3, 4 para escolher rapidamente entre as opções.
            </p>
            
            <p className="mt-5 text-xs text-center">
              <button 
                onClick={() => {
                  // if (window.confirm('Deseja pular para o Teste Avançado? Isso encerrará o teste atual e o direcionará para a análise estatística mais ampla.')) {
                    navigateTo('/advanced');
                  // }
                }}
                className="bg-transparent border-none text-blue-500 cursor-pointer text-xs underline hover:text-blue-600"
              >
                Pular para o teste avançado, ignorando a avaliação inicial.
              </button>
            </p>
          </div>
        )}

        {isFinished && (
          <div className="flex flex-col items-center justify-center min-h-screen py-10 px-5 text-center">
            {finalLevel !== null && (
              <div>
                <h3 className="text-xl md:text-2xl font-semibold text-gray-700 mb-5">{levelLabels[finalLevel - 1]}</h3>
                
                {/* Custom messages for different levels and phases */}
                {finalLevel === 1 && phase === 1 && (
                  <div className="text-center max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
                    <p className="m-0 text-gray-700">
                      Repertório léxico severamente limitado em palavras do cotidiano, em geral, contendo menos de 300 palavras.
                    </p>
                  </div>
                )}

                {finalLevel === 1 && phase === 2 && (
                  <div className="text-center max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
                    <p className="m-0 text-gray-700">
                      Repertório léxico limitado com conhecimentos insuficientes para progredir para uma amostragem mais ampla, 
                      a comunicação é lacônica, fracionada, são vocabulários que se estendem de poucas centenas até pouco mais de 2 mil palavras.
                    </p>
                  </div>
                )}

                {finalLevel === 2 && phase === 1 && (
                  <div className="text-center max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
                    <p className="m-0 text-gray-700">
                      Repertório léxico na transição do básico ao intermediário, o testante é capaz de interpretar contextos e 
                      rapidamente compreender o tema central, mas ainda requer suporte recorrente do dicionário, são vocabulários 
                      que se estendem além de 2 mil até poucos milhares de palavras.
                    </p>
                  </div>
                )}

                {finalLevel === 2 && phase === 2 && (
                  <div className="text-center max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
                    <p className="m-0 text-gray-700">
                      Repertório léxico intermediário, o testante é capaz de interpretar contextos diversos, incluindo palavras do cotidiano, 
                      jargões pontuais, dispensa o suporte de dicionário em leituras cursórias, são vocabulários diversos acima de 5 mil palavras 
                      até um teto de 10 a 15 mil palavras, dependendo do enfoque e jargões técnicos.
                    </p>
                  </div>
                )}

                {finalLevel === 3 && (
                  <div>
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-10">{Math.round(calculateVocabularyEstimate(finalLevel, passiveScore)).toLocaleString('pt-BR')} palavras</h1>
                    <div className="text-left max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
                      {/* Vocabulário passivo */}
                      <p className="mb-5">
                        Cerca de <strong>{Math.round(calculateVocabularyEstimate(finalLevel, passiveScore)).toLocaleString('pt-BR')}</strong> no vocabulário passivo, intervalo de <strong>{Math.round(calculateConfidenceInterval(finalLevel, passiveScore).lowerBound).toLocaleString('pt-BR')}</strong> a <strong>{Math.round(calculateConfidenceInterval(finalLevel, passiveScore).upperBound).toLocaleString('pt-BR')}</strong> palavras.
                      </p>

                      {/* Vocabulário ativo */}
                      <p className="mb-0">
                        Cerca de <strong>{Math.round(calculateVocabularyEstimate(finalLevel, activeScore)).toLocaleString('pt-BR')}</strong> no vocabulário ativo, intervalo de <strong>{Math.round(calculateConfidenceInterval(finalLevel, activeScore).lowerBound).toLocaleString('pt-BR')}</strong> a <strong>{Math.round(calculateConfidenceInterval(finalLevel, activeScore).upperBound).toLocaleString('pt-BR')}</strong> palavras.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <footer className="mt-auto p-5 text-center border-t border-gray-200 text-sm text-gray-500">
          Código-fonte disponível em
          <a href="https://github.com/cassiopagnoncelli/dicio" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="inline">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.112.793-.262.793-.583 0-.288-.01-1.05-.015-2.06-3.338.727-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.746.083-.73.083-.73 1.204.084 1.837 1.237 1.837 1.237 1.07 1.834 2.809 1.305 3.495.997.108-.774.418-1.305.76-1.605-2.666-.305-5.467-1.333-5.467-5.93 0-1.31.47-2.38 1.237-3.22-.125-.304-.537-1.527.117-3.176 0 0 1.01-.324 3.3 1.23a11.48 11.48 0 0 1 3.006-.404 11.5 11.5 0 0 1 3.006.404c2.29-1.554 3.3-1.23 3.3-1.23.655 1.65.243 2.873.118 3.176.77.84 1.237 1.91 1.237 3.22 0 4.61-2.803 5.624-5.474 5.922.43.372.81 1.102.81 2.222 0 1.606-.014 2.898-.014 3.293 0 .324.193.698.8.58C20.565 21.797 24 17.298 24 12 24 5.37 18.63 0 12 0z"/>
            </svg> Cássio Pagnoncelli
          </a>
        </footer>
      </div>
    );
  }

  // Home page - level selection
  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 py-10 px-5 md:py-15 md:px-10 text-center text-white">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 drop-shadow-lg text-white">📚 Teste de Vocabulário</h1>
        <p className="text-base md:text-xl m-0 opacity-95 font-light text-white">Descubra o tamanho do seu vocabulário em português</p>
      </div>

      {/* Main Content */}
      <div className="py-10 px-5 md:py-15 md:px-10 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 md:mb-10">Escolha seu teste</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 mb-10 md:mb-12">
          {/* Assessment Test */}
          <div className="bg-white rounded-2xl p-6 md:p-9 shadow-xl border border-gray-200 cursor-pointer hover:shadow-2xl transition-shadow" onClick={() => navigateTo('/assessment')}>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">🎯 Teste Adaptativo</h3>
            <p className="text-sm md:text-base text-gray-500 leading-relaxed mb-5">
              Teste inteligente que se adapta ao seu nível. Determina automaticamente se você é básico, intermediário ou fluente.
            </p>
            <button className="bg-blue-500 text-white border-none rounded-lg py-3 px-6 text-base font-semibold cursor-pointer hover:bg-blue-600 transition-colors">
              Iniciar Teste
            </button>
          </div>

          {/* Repertoire Test */}
          <div className="bg-white rounded-2xl p-6 md:p-9 shadow-xl border border-gray-200 cursor-pointer hover:shadow-2xl transition-shadow" onClick={() => navigateTo('/advanced')}>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">📊 Teste Avançado</h3>
            <p className="text-sm md:text-base text-gray-500 leading-relaxed mb-5">
              Análise estatística completa. Fornece estimativa científica do seu vocabulário total com intervalos de confiança.
            </p>
            <button className="bg-green-500 text-white border-none rounded-lg py-3 px-6 text-base font-semibold cursor-pointer hover:bg-green-600 transition-colors">
              Iniciar Análise
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-auto p-5 text-center border-t border-gray-200 text-sm text-gray-500">
        Código-fonte disponível em
        <a href="https://github.com/cassiopagnoncelli/dicio" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="inline">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.112.793-.262.793-.583 0-.288-.01-1.05-.015-2.06-3.338.727-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.746.083-.73.083-.73 1.204.084 1.837 1.237 1.837 1.237 1.07 1.834 2.809 1.305 3.495.997.108-.774.418-1.305.76-1.605-2.666-.305-5.467-1.333-5.467-5.93 0-1.31.47-2.38 1.237-3.22-.125-.304-.537-1.527.117-3.176 0 0 1.01-.324 3.3 1.23a11.48 11.48 0 0 1 3.006-.404 11.5 11.5 0 0 1 3.006.404c2.29-1.554 3.3-1.23 3.3-1.23.655 1.65.243 2.873.118 3.176.77.84 1.237 1.91 1.237 3.22 0 4.61-2.803 5.624-5.474 5.922.43.372.81 1.102.81 2.222 0 1.606-.014 2.898-.014 3.293 0 .324.193.698.8.58C20.565 21.797 24 17.298 24 12 24 5.37 18.63 0 12 0z"/>
          </svg> Cássio Pagnoncelli
        </a>
      </footer>
    </div>
  );
}

export default App;
