import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Function to shuffle array (Fisher-Yates)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Function to read and parse the dictionary file
function parseDictionary(dictContent) {
  return dictContent.split('\n').filter(word => word.trim() !== '');
}

function Repertoire() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [activeScore, setActiveScore] = useState(0); // K_2
  const [passiveScore, setPassiveScore] = useState(0); // K_1
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [questionPool, setQuestionPool] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Error margin configurations
  const ERROR_MARGIN_CONFIGS = {
    5: { words: 289, margin: 5 },
    7: { words: 147, margin: 7 }
  };
  
  const DEFAULT_ERROR_MARGIN = 7; // Default to 7% error margin
  const config = ERROR_MARGIN_CONFIGS[DEFAULT_ERROR_MARGIN];
  const N = config.words; // Number of words to test
  const ERROR_MARGIN = config.margin; // Error margin percentage
  const TOTAL_WORDS = 312368; // Total words in Portuguese dictionary

  useEffect(() => {
    // Load and prepare the dictionary
    const loadDictionary = async () => {
      try {
        const response = await fetch('/pt-br.dic');
        const text = await response.text();
        const words = parseDictionary(text);
        
        // Shuffle and take first N words
        const shuffledWords = shuffleArray(words);
        setQuestionPool(shuffledWords.slice(0, N));
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading dictionary:', error);
        // Fallback: use some sample words if file can't be loaded
        const fallbackWords = [
          'convectivo', 'indeclarável', 'celidonina', 'veludeiro', 'protoalveitar',
          'monorquídio', 'ceráceo', 'vamiri', 'pauxinara', 'beótico'
        ];
        setQuestionPool(shuffleArray(fallbackWords).slice(0, Math.min(N, fallbackWords.length)));
        setIsLoading(false);
      }
    };

    loadDictionary();
  }, [N]);

  const handleAnswer = useCallback((answer) => {
    if (isFinished) return;

    let newPassiveScore = passiveScore;
    let newActiveScore = activeScore;

    // Count passive knowledge (C or D)
    if (answer === 'C' || answer === 'D') {
      newPassiveScore += 1;
    }
    // Count active knowledge (D only)
    if (answer === 'D') {
      newActiveScore += 1;
    }

    setAnswers([...answers, answer]);
    setPassiveScore(newPassiveScore);
    setActiveScore(newActiveScore);

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questionPool.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      setIsFinished(true);
    }
  }, [isFinished, passiveScore, activeScore, answers, currentQuestion, questionPool.length]);

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
    }
  };

  // Calculate vocabulary estimates with confidence intervals
  const calculateStatistics = (knownWords) => {
    const p_hat = knownWords / N; // Sample proportion
    const estimate = Math.round(p_hat * TOTAL_WORDS);
    
    // Standard error with finite population correction
    const p_variance = p_hat * (1 - p_hat);
    const finite_correction = (TOTAL_WORDS - N) / (TOTAL_WORDS - 1);
    const standard_error = Math.sqrt((p_variance / N) * finite_correction);
    
    // 95% confidence interval
    const z_score = 1.96; // For 95% confidence
    const margin_error = z_score * standard_error;
    const lower_bound_proportion = Math.max(0, p_hat - margin_error);
    const upper_bound_proportion = Math.min(1, p_hat + margin_error);
    
    const lower_bound = Math.round(lower_bound_proportion * TOTAL_WORDS);
    const upper_bound = Math.round(upper_bound_proportion * TOTAL_WORDS);
    
    return {
      estimate,
      lower_bound,
      upper_bound,
      proportion: p_hat,
      margin_error: margin_error * 100, // Convert to percentage
      standard_error
    };
  };

  // Calculate simple estimate for display
  const calculateEstimate = (knownWords) => {
    return Math.round((knownWords / N) * TOTAL_WORDS);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isFinished) return;

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
  }, [handleAnswer, isFinished]);

  if (isLoading) {
    return (
      <div className="container">
        <p>Carregando dicionário...</p>
      </div>
    );
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
            Teste de Repertório
          </div>
          
          {/* Right: Counter */}
          <div style={{
            marginLeft: 'auto',
            fontSize: '16px',
            color: '#6c757d'
          }}>
            {currentQuestion + 1} / {questionPool.length}
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
            {questionPool[currentQuestion] && questionPool[currentQuestion].charAt(0).toUpperCase() + questionPool[currentQuestion].slice(1)}
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
        <div>
          {/* Title */}
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
            }}>{passiveScore < N * 0.15 ? '⚠️ Teste Inconclusivo' : '📊 Análise do Repertório Lexical'}</h1>
            <p style={{
              fontSize: window.innerWidth < 768 ? '16px' : '20px',
              margin: '0',
              opacity: '0.95',
              fontWeight: '300',
              color: 'white'
            }}>{passiveScore < N * 0.15 ? 'Resultado insuficiente para análise confiável' : 'Estimativa científica do seu vocabulário em português'}</p>
          </div>

          {/* Main Content */}
          <div style={{
            padding: window.innerWidth < 768 ? '40px 20px' : '60px 40px',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            
            {/* Check if test is inconclusive */}
            {passiveScore < N * 0.15 ? (
              /* Inconclusive Result */
              <div style={{
                textAlign: 'center',
                padding: window.innerWidth < 768 ? '40px 20px' : '60px 40px',
                backgroundColor: '#fff3cd',
                borderRadius: '16px',
                border: '2px solid #ffc107',
                marginBottom: window.innerWidth < 768 ? '40px' : '60px'
              }}>
                <h2 style={{
                  fontSize: window.innerWidth < 768 ? '24px' : '32px',
                  fontWeight: '700',
                  color: '#856404',
                  marginBottom: '30px'
                }}>⚠️ Resultado Inconclusivo</h2>
                
                <p style={{
                  fontSize: window.innerWidth < 768 ? '18px' : '22px',
                  color: '#856404',
                  lineHeight: '1.6',
                  marginBottom: '30px',
                  fontWeight: '500'
                }}>
                  Teste inconclusivo, o testante conhece uma fração muito pequena de um vocabulário amplo, 
                  numa faixa onde não é seguro derivar conclusões. Idealmente, o teste deveria ser refeito.
                </p>
                
                <div style={{
                  padding: window.innerWidth < 768 ? '20px' : '25px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginTop: '30px'
                }}>
                  <p style={{
                    fontSize: window.innerWidth < 768 ? '16px' : '18px',
                    color: '#6c757d',
                    margin: '0',
                    fontWeight: '500'
                  }}>
                    <strong>Dados da amostra:</strong> {passiveScore} palavras reconhecidas de {N} testadas 
                    ({((passiveScore / N) * 100).toFixed(1)}% - abaixo do limiar de 15% necessário para análise confiável)
                  </p>
                </div>
              </div>
            ) : (
              /* Normal Results - Circles | Detailed Analysis */
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr',
                gap: window.innerWidth < 768 ? '40px' : '60px',
                marginBottom: window.innerWidth < 768 ? '50px' : '80px'
              }}>
              
              {/* Circles */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ 
                  position: 'relative', 
                  width: window.innerWidth < 768 ? '280px' : '400px', 
                  height: window.innerWidth < 768 ? '280px' : '400px'
                }}>
                  {/* Passive vocabulary circle (outer) */}
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 193, 7, 0.2)',
                    border: '4px solid #ffc107',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: window.innerWidth < 768 ? '30px' : '50px'
                  }}>
                    <div style={{ textAlign: 'center', color: '#856404', fontWeight: 'bold' }}>
                      <div style={{ fontSize: window.innerWidth < 768 ? '24px' : '32px' }}>
                        {calculateEstimate(passiveScore).toLocaleString('pt-BR')}
                      </div>
                      <div style={{ fontSize: window.innerWidth < 768 ? '16px' : '18px' }}>PASSIVO</div>
                    </div>
                  </div>
                  
                  {/* Active vocabulary circle (inner) */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `${Math.max(120, (activeScore / Math.max(passiveScore, 1)) * (window.innerWidth < 768 ? 200 : 280))}px`,
                    height: `${Math.max(120, (activeScore / Math.max(passiveScore, 1)) * (window.innerWidth < 768 ? 200 : 280))}px`,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(40, 167, 69, 0.3)',
                    border: '3px solid #28a745',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ textAlign: 'center', color: '#155724', fontWeight: 'bold' }}>
                      <div style={{ fontSize: window.innerWidth < 768 ? '20px' : '28px' }}>
                        {calculateEstimate(activeScore).toLocaleString('pt-BR')}
                      </div>
                      <div style={{ fontSize: window.innerWidth < 768 ? '14px' : '16px' }}>ATIVO</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis */}
              <div>
                <h2 style={{
                  fontSize: window.innerWidth < 768 ? '24px' : '32px',
                  fontWeight: '700',
                  color: '#2d3436',
                  marginBottom: window.innerWidth < 768 ? '30px' : '40px'
                }}>📊 Resultados</h2>

                {(() => {
                  const passiveStats = calculateStatistics(passiveScore);
                  const activeStats = calculateStatistics(activeScore);
                  
                  return (
                    <div>
                      {/* Passive Stats */}
                      <div style={{ marginBottom: '40px' }}>
                        <h3 style={{
                          fontSize: window.innerWidth < 768 ? '20px' : '24px',
                          fontWeight: '700',
                          color: '#f57c00',
                          marginBottom: '20px'
                        }}>🟡 Vocabulário Passivo</h3>
                        <div style={{ fontSize: window.innerWidth < 768 ? '16px' : '18px', lineHeight: '1.6' }}>
                          <p style={{ margin: '12px 0' }}><strong>Estimativa:</strong> {passiveStats.estimate.toLocaleString('pt-BR')} palavras</p>
                          <p style={{ margin: '12px 0' }}><strong>Intervalo (95%):</strong> {passiveStats.lower_bound.toLocaleString('pt-BR')} — {passiveStats.upper_bound.toLocaleString('pt-BR')} palavras</p>
                        </div>
                      </div>

                      {/* Active Stats */}
                      <div style={{ marginBottom: '40px' }}>
                        <h3 style={{
                          fontSize: window.innerWidth < 768 ? '20px' : '24px',
                          fontWeight: '700',
                          color: '#2e7d32',
                          marginBottom: '20px'
                        }}>🟢 Vocabulário Ativo</h3>
                        <div style={{ fontSize: window.innerWidth < 768 ? '16px' : '18px', lineHeight: '1.6' }}>
                          <p style={{ margin: '12px 0' }}><strong>Estimativa:</strong> {activeStats.estimate.toLocaleString('pt-BR')} palavras</p>
                          <p style={{ margin: '12px 0' }}><strong>Intervalo (95%):</strong> {activeStats.lower_bound.toLocaleString('pt-BR')} — {activeStats.upper_bound.toLocaleString('pt-BR')} palavras</p>
                        </div>
                      </div>

                      {/* Sample Data */}
                      <div style={{
                        padding: window.innerWidth < 768 ? '20px' : '25px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <p style={{
                          fontSize: window.innerWidth < 768 ? '16px' : '18px',
                          color: '#6c757d',
                          margin: '0',
                          fontWeight: '500'
                        }}>
                          <strong>Dados da amostra:</strong> {passiveScore} palavras reconhecidas e {activeScore} palavras dominadas de {N} testadas
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            )}

            {/* Metodologia Científica */}
            <div>
              <h2 style={{
                fontSize: window.innerWidth < 768 ? '24px' : '32px',
                fontWeight: '700',
                color: '#2d3436',
                marginBottom: window.innerWidth < 768 ? '30px' : '40px'
              }}>📖 Metodologia Científica</h2>
              
              <div style={{
                fontSize: window.innerWidth < 768 ? '16px' : '18px',
                lineHeight: '1.7',
                color: '#2d3436'
              }}>
                <p style={{ marginBottom: window.innerWidth < 768 ? '25px' : '30px' }}>
                  Esta análise utiliza <strong>amostragem estatística</strong> para estimar seu vocabulário total a partir de uma amostra de {N} palavras 
                  do dicionário português (312.368 palavras). O cálculo emprega a <strong>proporção amostral</strong> com correção para população finita, 
                  fornecendo <strong>intervalos de confiança de 95%</strong> com <strong>margem de erro de {ERROR_MARGIN}%</strong>. A probabilidade <em>a priori</em> de
                  um falante nativo conhecer uma palavra é estimada em <strong>p = 25%</strong>.
                </p>
                
                <p style={{ margin: '0' }}>
                  O <strong>vocabulário passivo</strong> inclui palavras que você reconhece mas não necessariamente as usa, enquanto o 
                  <strong> vocabulário ativo</strong> representa palavras que você domina completamente e emprega na comunicação. 
                  A metodologia segue princípios de estatística, assumindo distribuição aleatória das palavras testadas 
                  e aplicando correções estatísticas apropriadas para populações finitas.
                </p>
              </div>
            </div>
          </div>

          <footer style={{ marginTop: '40px', padding: '20px', textAlign: 'center', borderTop: '1px solid #dee2e6' }}>
            Código-fonte disponível em
            <a href="https://github.com/cassiopagnoncelli/dicio" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.112.793-.262.793-.583 0-.288-.01-1.05-.015-2.06-3.338.727-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.746.083-.73.083-.73 1.204.084 1.837 1.237 1.837 1.237 1.07 1.834 2.809 1.305 3.495.997.108-.774.418-1.305.76-1.605-2.666-.305-5.467-1.333-5.467-5.93 0-1.31.47-2.38 1.237-3.22-.125-.304-.537-1.527.117-3.176 0 0 1.01-.324 3.3 1.23a11.48 11.48 0 0 1 3.006-.404 11.5 11.5 0 0 1 3.006.404c2.29-1.554 3.3-1.23 3.3-1.23.655 1.65.243 2.873.118 3.176.77.84 1.237 1.91 1.237 3.22 0 4.61-2.803 5.624-5.474 5.922.43.372.81 1.102.81 2.222 0 1.606-.014 2.898-.014 3.293 0 .324.193.698.8.58C20.565 21.797 24 17.298 24 12 24 5.37 18.63 0 12 0z"/>
              </svg> Cássio Pagnoncelli
            </a>
          </footer>
        </div>
      )}
    </div>
  );
}

export default Repertoire;
