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
    return <Repertoire />;
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

        {showTransition && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '16px',
              padding: window.innerWidth < 768 ? '30px' : '40px',
              maxWidth: '600px',
              border: '2px solid #007bff'
            }}>
              <h2 style={{
                fontSize: window.innerWidth < 768 ? '24px' : '32px',
                fontWeight: '700',
                color: '#495057',
                marginBottom: '20px'
              }}>📋 Teste Estendido Qualificado</h2>
              
              <p style={{
                fontSize: window.innerWidth < 768 ? '16px' : '18px',
                color: '#495057',
                lineHeight: '1.6',
                marginBottom: '30px'
              }}>
                Baseado no seu desempenho, você está qualificado para o <strong>Teste de Repertório Estatístico</strong>,
                que fornecerá uma análise abrangente e precisa do seu vocabulário.
              </p>
              
              <button onClick={() => navigateTo('/advanced')} style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '15px 30px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Prosseguir para Teste Estendido
              </button>
            </div>
          </div>
        )}

        {!isFinished && !showTransition && (
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
            
            <p style={{
              marginTop: '20px',
              fontSize: '12px',
              textAlign: 'center'
            }}>
              <button 
                onClick={() => {
                  if (window.confirm('Deseja pular para o Teste Avançado? Isso encerrará o teste atual e o direcionará para a análise estatística mais ampla.')) {
                    navigateTo('/advanced');
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007bff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                Pular para o teste avançado, ignorando a avaliação inicial.
              </button>
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
                
                {/* Custom messages for different levels and phases */}
                {finalLevel === 1 && phase === 1 && (
                  <div style={{ 
                    textAlign: 'center', 
                    maxWidth: '700px',
                    margin: '0 auto',
                    fontSize: window.innerWidth < 768 ? '16px' : '18px',
                    lineHeight: '1.6'
                  }}>
                    <p style={{ margin: '0', color: '#495057' }}>
                      Repertório léxico severamente limitado em palavras do cotidiano, em geral, contendo menos de 300 palavras.
                    </p>
                  </div>
                )}

                {finalLevel === 1 && phase === 2 && (
                  <div style={{ 
                    textAlign: 'center', 
                    maxWidth: '700px',
                    margin: '0 auto',
                    fontSize: window.innerWidth < 768 ? '16px' : '18px',
                    lineHeight: '1.6'
                  }}>
                    <p style={{ margin: '0', color: '#495057' }}>
                      Repertório léxico limitado com conhecimentos insuficientes para progredir para uma amostragem mais ampla, 
                      a comunicação é lacônica, fracionada, são vocabulários que se estendem de poucas centenas até pouco mais de 2 mil palavras.
                    </p>
                  </div>
                )}

                {finalLevel === 2 && phase === 1 && (
                  <div style={{ 
                    textAlign: 'center', 
                    maxWidth: '700px',
                    margin: '0 auto',
                    fontSize: window.innerWidth < 768 ? '16px' : '18px',
                    lineHeight: '1.6'
                  }}>
                    <p style={{ margin: '0', color: '#495057' }}>
                      Repertório léxico na transição do básico ao intermediário, o testante é capaz de interpretar contextos e 
                      rapidamente compreender o tema central, mas ainda requer suporte recorrente do dicionário, são vocabulários 
                      que se estendem além de 2 mil até poucos milhares de palavras.
                    </p>
                  </div>
                )}

                {finalLevel === 2 && phase === 2 && (
                  <div style={{ 
                    textAlign: 'center', 
                    maxWidth: '700px',
                    margin: '0 auto',
                    fontSize: window.innerWidth < 768 ? '16px' : '18px',
                    lineHeight: '1.6'
                  }}>
                    <p style={{ margin: '0', color: '#495057' }}>
                      Repertório léxico intermediário, o testante é capaz de interpretar contextos diversos, incluindo palavras do cotidiano, 
                      jargões pontuais, dispensa o suporte de dicionário em leituras cursórias, são vocabulários diversos acima de 5 mil palavras 
                      até um teto de 10 a 15 mil palavras, dependendo do enfoque e jargões técnicos.
                    </p>
                  </div>
                )}

                {finalLevel === 3 && (
                  <div>
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

  // Home page - level selection
  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: window.innerWidth < 768 ? '40px 20px' : '60px 40px',
        textAlign: 'center',
        color: 'white'
      }}>
        <h1 style={{ 
          fontSize: window.innerWidth < 768 ? '28px' : '42px',
          fontWeight: '800',
          margin: '0 0 15px 0',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          color: 'white'
        }}>📚 Teste de Vocabulário</h1>
        <p style={{
          fontSize: window.innerWidth < 768 ? '16px' : '20px',
          margin: '0',
          opacity: '0.95',
          fontWeight: '300',
          color: 'white'
        }}>Descubra o tamanho do seu vocabulário em português</p>
      </div>

      {/* Main Content */}
      <div style={{
        padding: window.innerWidth < 768 ? '40px 20px' : '60px 40px',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: window.innerWidth < 768 ? '24px' : '32px',
          fontWeight: '700',
          color: '#2d3436',
          marginBottom: window.innerWidth < 768 ? '30px' : '40px'
        }}>Escolha seu teste</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
          gap: window.innerWidth < 768 ? '20px' : '30px',
          marginBottom: window.innerWidth < 768 ? '40px' : '50px'
        }}>
          {/* Assessment Test */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: window.innerWidth < 768 ? '25px' : '35px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            border: '1px solid #e9ecef',
            cursor: 'pointer'
          }} onClick={() => navigateTo('/assessment')}>
            <h3 style={{
              fontSize: window.innerWidth < 768 ? '20px' : '24px',
              fontWeight: '700',
              color: '#2d3436',
              marginBottom: '15px'
            }}>🎯 Teste Adaptativo</h3>
            <p style={{
              fontSize: window.innerWidth < 768 ? '14px' : '16px',
              color: '#6c757d',
              lineHeight: '1.5',
              marginBottom: '20px'
            }}>
              Teste inteligente que se adapta ao seu nível. Determina automaticamente se você é básico, intermediário ou fluente.
            </p>
            <button style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Iniciar Teste
            </button>
          </div>

          {/* Repertoire Test */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: window.innerWidth < 768 ? '25px' : '35px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            border: '1px solid #e9ecef',
            cursor: 'pointer'
          }} onClick={() => navigateTo('/advanced')}>
            <h3 style={{
              fontSize: window.innerWidth < 768 ? '20px' : '24px',
              fontWeight: '700',
              color: '#2d3436',
              marginBottom: '15px'
            }}>📊 Teste de Repertório</h3>
            <p style={{
              fontSize: window.innerWidth < 768 ? '14px' : '16px',
              color: '#6c757d',
              lineHeight: '1.5',
              marginBottom: '20px'
            }}>
              Análise estatística completa. Fornece estimativa científica do seu vocabulário total com intervalos de confiança.
            </p>
            <button style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Iniciar Análise
            </button>
          </div>
        </div>
      </div>

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
