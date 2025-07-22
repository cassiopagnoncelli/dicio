import React, { useState, useEffect, useCallback } from 'react';

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

function Advanced() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [activeScore, setActiveScore] = useState(0); // K_2
  const [passiveScore, setPassiveScore] = useState(0); // K_1
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [questionPool, setQuestionPool] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Error margin configurations
  const ERROR_MARGIN_CONFIGS = {
    50: { words: 5, margin: 50 },
    5: { words: 289, margin: 5 },
    7: { words: 147, margin: 7 }
  };
  
  const DEFAULT_ERROR_MARGIN = 5; // Default to 7% error margin
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Carregando dicionário...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
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
            Teste Avançado
          </div>
          
          {/* Right: Counter */}
          <div className="ml-auto text-base text-gray-500">
            {currentQuestion + 1} / {questionPool.length}
          </div>
        </div>
      )}

      {!isFinished && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] py-10 px-5">
          <p className="text-3xl md:text-4xl font-bold mb-10 text-center">
            {questionPool[currentQuestion] && questionPool[currentQuestion].charAt(0).toUpperCase() + questionPool[currentQuestion].slice(1)}
          </p>

          <div className="flex flex-col gap-4 w-full max-w-lg">
            <button onClick={() => handleAnswer('A')} className="py-4 px-5 text-base bg-red-500 text-white border-none rounded-lg cursor-pointer hover:bg-red-600 transition-colors">
              Desconheço
            </button>
            <button onClick={() => handleAnswer('B')} className="py-4 px-5 text-base bg-gray-500 text-white border-none rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
              Tenho vaga ideia
            </button>
            <button onClick={() => handleAnswer('C')} className="py-4 px-5 text-base bg-yellow-400 text-black border-none rounded-lg cursor-pointer hover:bg-yellow-500 transition-colors">
              Reconheço mas nunca usei
            </button>
            <button onClick={() => handleAnswer('D')} className="py-4 px-5 text-base bg-green-500 text-white border-none rounded-lg cursor-pointer hover:bg-green-600 transition-colors">
              Conheço e sei empregar
            </button>
          </div>

          <p className="mt-8 text-sm text-gray-500 text-center">
            Use as teclas 1, 2, 3, 4 para escolher rapidamente entre as opções.
          </p>
        </div>
      )}

      {!isFinished && (
        <footer className="mt-auto py-8 px-5 text-center border-t border-gray-200 bg-gray-50">
          <p className="m-0 text-sm text-gray-500">
            Código-fonte disponível em
            <a href="https://github.com/cassiopagnoncelli/dicio" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-600 no-underline">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="inline mr-1">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.112.793-.262.793-.583 0-.288-.01-1.05-.015-2.06-3.338.727-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.746.083-.73.083-.73 1.204.084 1.837 1.237 1.837 1.237 1.07 1.834 2.809 1.305 3.495.997.108-.774.418-1.305.76-1.605-2.666-.305-5.467-1.333-5.467-5.93 0-1.31.47-2.38 1.237-3.22-.125-.304-.537-1.527.117-3.176 0 0 1.01-.324 3.3 1.23a11.48 11.48 0 0 1 3.006-.404 11.5 11.5 0 0 1 3.006.404c2.29-1.554 3.3-1.23 3.3-1.23.655 1.65.243 2.873.118 3.176.77.84 1.237 1.91 1.237 3.22 0 4.61-2.803 5.624-5.474 5.922.43.372.81 1.102.81 2.222 0 1.606-.014 2.898-.014 3.293 0 .324.193.698.8.58C20.565 21.797 24 17.298 24 12 24 5.37 18.63 0 12 0z"/>
              </svg>
              Cássio Pagnoncelli
            </a>
          </p>
        </footer>
      )}

      {isFinished && (
        window.innerWidth < 768 ? (
          /* MOBILE VERSION - Tailwind classes */
          <div className="min-h-screen flex flex-col">
            {/* Mobile Header */}
            <header className="py-8 px-5 text-center bg-white border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-800">
                Vocabulômetro
              </h1>
            </header>

            {/* Mobile Main Content */}
            <main className="flex-1 py-8 px-5 w-full">
              
              {passiveScore < N * 0.15 ? (
                /* Mobile Inconclusive Result */
                <div style={{
                  textAlign: 'center',
                  padding: '24px 16px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '12px',
                  border: '2px solid #ffc107',
                  marginBottom: '30px'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#856404',
                    marginBottom: '16px'
                  }}>⚠️ Resultado Inconclusivo</h2>
                  
                  <p style={{
                    fontSize: '14px',
                    color: '#856404',
                    lineHeight: '1.6',
                    marginBottom: '16px',
                    fontWeight: '500'
                  }}>
                    Teste inconclusivo, o testante conhece uma fração muito pequena de um vocabulário amplo, 
                    numa faixa onde não é seguro derivar conclusões. Idealmente, o teste deveria ser refeito.
                  </p>
                  
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginTop: '16px'
                  }}>
                    <p style={{
                      fontSize: '12px',
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
                /* Mobile Normal Results */
                <>
                  {/* Mobile Results Section */}
                  <section style={{ marginBottom: '30px' }}>
                    {/* Mobile Statistics First */}
                    <div style={{ marginBottom: '30px' }}>
                      <h2 style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#2d3436',
                        marginBottom: '20px'
                      }}>📊 Resultados</h2>

                      {(() => {
                        const passiveStats = calculateStatistics(passiveScore);
                        const activeStats = calculateStatistics(activeScore);
                        
                        return (
                          <div>
                            {/* Mobile Passive Stats */}
                            <div style={{ marginBottom: '24px' }}>
                              <h3 style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                color: '#f57c00',
                                marginBottom: '12px'
                              }}>🟡 Vocabulário Passivo</h3>
                              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                <p style={{ margin: '6px 0' }}><strong>Estimativa:</strong> {passiveStats.estimate.toLocaleString('pt-BR')} palavras</p>
                                <p style={{ margin: '6px 0' }}><strong>Intervalo de confiança:</strong> {passiveStats.lower_bound.toLocaleString('pt-BR')} — {passiveStats.upper_bound.toLocaleString('pt-BR')} palavras</p>
                              </div>
                            </div>

                            {/* Mobile Active Stats */}
                            <div style={{ marginBottom: '24px' }}>
                              <h3 style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                color: '#2e7d32',
                                marginBottom: '12px'
                              }}>🟢 Vocabulário Ativo</h3>
                              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                <p style={{ margin: '6px 0' }}><strong>Estimativa:</strong> {activeStats.estimate.toLocaleString('pt-BR')} palavras</p>
                                <p style={{ margin: '6px 0' }}><strong>Intervalo de confiança:</strong> {activeStats.lower_bound.toLocaleString('pt-BR')} — {activeStats.upper_bound.toLocaleString('pt-BR')} palavras</p>
                              </div>
                            </div>

                            {/* Mobile Sample Data */}
                            <div style={{
                              padding: '12px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <p style={{
                                fontSize: '11px',
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
                    
                    {/* Mobile Circles Visualization */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div style={{ 
                        position: 'relative', 
                        width: '200px', 
                        height: '200px'
                      }}>
                        {/* Mobile Passive vocabulary circle (outer) */}
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 193, 7, 0.2)',
                          border: '3px solid #ffc107',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          paddingBottom: '20px'
                        }}>
                          <div style={{ textAlign: 'center', color: '#856404', fontWeight: 'bold' }}>
                            <div style={{ fontSize: '16px' }}>
                              {calculateEstimate(passiveScore).toLocaleString('pt-BR')}
                            </div>
                            <div style={{ fontSize: '12px' }}>PASSIVO</div>
                          </div>
                        </div>
                        
                        {/* Mobile Active vocabulary circle (inner) */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: `${Math.max(80, (activeScore / Math.max(passiveScore, 1)) * 140)}px`,
                          height: `${Math.max(80, (activeScore / Math.max(passiveScore, 1)) * 140)}px`,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(40, 167, 69, 0.3)',
                          border: '3px solid #28a745',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{ textAlign: 'center', color: '#155724', fontWeight: 'bold' }}>
                            <div style={{ fontSize: '14px' }}>
                              {calculateEstimate(activeScore).toLocaleString('pt-BR')}
                            </div>
                            <div style={{ fontSize: '10px' }}>ATIVO</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* Mobile Methodology Section */}
              <section>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#2d3436',
                  marginBottom: '16px'
                }}>📖 Metodologia Científica</h2>
                
                <div style={{
                  fontSize: '13px',
                  lineHeight: '1.7',
                  color: '#2d3436'
                }}>
                  <p style={{ marginBottom: '16px' }}>
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
              </section>
            </main>

            {/* Mobile Footer */}
            <footer className="mt-auto py-6 px-5 text-center border-t border-gray-200 bg-gray-50">
              <p className="m-0 text-xs text-gray-500">
                Código-fonte disponível em
                <a href="https://github.com/cassiopagnoncelli/dicio" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-600 no-underline">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="10" height="10" fill="currentColor" className="inline mr-1">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.112.793-.262.793-.583 0-.288-.01-1.05-.015-2.06-3.338.727-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.746.083-.73.083-.73 1.204.084 1.837 1.237 1.837 1.237 1.07 1.834 2.809 1.305 3.495.997.108-.774.418-1.305.76-1.605-2.666-.305-5.467-1.333-5.467-5.93 0-1.31.47-2.38 1.237-3.22-.125-.304-.537-1.527.117-3.176 0 0 1.01-.324 3.3 1.23a11.48 11.48 0 0 1 3.006-.404 11.5 11.5 0 0 1 3.006.404c2.29-1.554 3.3-1.23 3.3-1.23.655 1.65.243 2.873.118 3.176.77.84 1.237 1.91 1.237 3.22 0 4.61-2.803 5.624-5.474 5.922.43.372.81 1.102.81 2.222 0 1.606-.014 2.898-.014 3.293 0 .324.193.698.8.58C20.565 21.797 24 17.298 24 12 24 5.37 18.63 0 12 0z"/>
                  </svg>
                  Cássio Pagnoncelli
                </a>
              </p>
            </footer>
          </div>
        ) : (
          /* DESKTOP VERSION - Fixed pixel sizes */
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Desktop Header */}
            <header style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'white',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h1 style={{ 
                fontSize: '32px',
                fontWeight: '700',
                margin: '0',
                color: '#1f2937'
              }}>
                Vocabulômetro
              </h1>
            </header>

            {/* Desktop Main Content */}
            <main style={{ 
              flex: '1',
              padding: '60px 40px',
              maxWidth: '1200px',
              margin: '0 auto',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              
              {passiveScore < N * 0.15 ? (
                /* Desktop Inconclusive Result */
                <div style={{
                  textAlign: 'center',
                  padding: '50px 40px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '12px',
                  border: '2px solid #ffc107',
                  marginBottom: '40px'
                }}>
                  <h2 style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#856404',
                    marginBottom: '20px'
                  }}>⚠️ Resultado Inconclusivo</h2>
                  
                  <p style={{
                    fontSize: '18px',
                    color: '#856404',
                    lineHeight: '1.6',
                    marginBottom: '20px',
                    fontWeight: '500'
                  }}>
                    Teste inconclusivo, o testante conhece uma fração muito pequena de um vocabulário amplo, 
                    numa faixa onde não é seguro derivar conclusões. Idealmente, o teste deveria ser refeito.
                  </p>
                  
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginTop: '20px'
                  }}>
                    <p style={{
                      fontSize: '16px',
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
                /* Desktop Normal Results */
                <>
                  {/* Desktop Results Section */}
                  <section style={{ marginBottom: '60px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '50px',
                      alignItems: 'center'
                    }}>
                      
                      {/* Desktop Circles Visualization */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <div style={{ 
                          position: 'relative', 
                          width: '350px', 
                          height: '350px'
                        }}>
                          {/* Desktop Passive vocabulary circle (outer) */}
                          <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 193, 7, 0.2)',
                            border: '3px solid #ffc107',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            paddingBottom: '40px'
                          }}>
                            <div style={{ textAlign: 'center', color: '#856404', fontWeight: 'bold' }}>
                              <div style={{ fontSize: '28px' }}>
                                {calculateEstimate(passiveScore).toLocaleString('pt-BR')}
                              </div>
                              <div style={{ fontSize: '16px' }}>PASSIVO</div>
                            </div>
                          </div>
                          
                          {/* Desktop Active vocabulary circle (inner) */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: `${Math.max(100, (activeScore / Math.max(passiveScore, 1)) * 250)}px`,
                            height: `${Math.max(100, (activeScore / Math.max(passiveScore, 1)) * 250)}px`,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(40, 167, 69, 0.3)',
                            border: '3px solid #28a745',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{ textAlign: 'center', color: '#155724', fontWeight: 'bold' }}>
                              <div style={{ fontSize: '24px' }}>
                                {calculateEstimate(activeScore).toLocaleString('pt-BR')}
                              </div>
                              <div style={{ fontSize: '14px' }}>ATIVO</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Statistics */}
                      <div>
                        <h2 style={{
                          fontSize: '28px',
                          fontWeight: '700',
                          color: '#2d3436',
                          marginBottom: '30px'
                        }}>📊 Resultados</h2>

                        {(() => {
                          const passiveStats = calculateStatistics(passiveScore);
                          const activeStats = calculateStatistics(activeScore);
                          
                          return (
                            <div>
                              {/* Desktop Passive Stats */}
                              <div style={{ marginBottom: '30px' }}>
                                <h3 style={{
                                  fontSize: '22px',
                                  fontWeight: '700',
                                  color: '#f57c00',
                                  marginBottom: '15px'
                                }}>🟡 Vocabulário Passivo</h3>
                                <div style={{ fontSize: '16px', lineHeight: '1.6' }}>
                                  <p style={{ margin: '8px 0' }}><strong>Estimativa:</strong> {passiveStats.estimate.toLocaleString('pt-BR')} palavras</p>
                                  <p style={{ margin: '8px 0' }}><strong>Intervalo de confiança:</strong> {passiveStats.lower_bound.toLocaleString('pt-BR')} — {passiveStats.upper_bound.toLocaleString('pt-BR')} palavras</p>
                                </div>
                              </div>

                              {/* Desktop Active Stats */}
                              <div style={{ marginBottom: '30px' }}>
                                <h3 style={{
                                  fontSize: '22px',
                                  fontWeight: '700',
                                  color: '#2e7d32',
                                  marginBottom: '15px'
                                }}>🟢 Vocabulário Ativo</h3>
                                <div style={{ fontSize: '16px', lineHeight: '1.6' }}>
                                  <p style={{ margin: '8px 0' }}><strong>Estimativa:</strong> {activeStats.estimate.toLocaleString('pt-BR')} palavras</p>
                                  <p style={{ margin: '8px 0' }}><strong>Intervalo de confiança:</strong> {activeStats.lower_bound.toLocaleString('pt-BR')} — {activeStats.upper_bound.toLocaleString('pt-BR')} palavras</p>
                                </div>
                              </div>

                              {/* Desktop Sample Data */}
                              <div style={{
                                padding: '20px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                textAlign: 'center'
                              }}>
                                <p style={{
                                  fontSize: '15px',
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
                  </section>
                </>
              )}

              {/* Desktop Methodology Section */}
              <section>
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#2d3436',
                  marginBottom: '30px'
                }}>📖 Metodologia Científica</h2>
                
                <div style={{
                  fontSize: '16px',
                  lineHeight: '1.7',
                  color: '#2d3436'
                }}>
                  <p style={{ marginBottom: '25px' }}>
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
              </section>
            </main>

            {/* Desktop Footer */}
            <footer className="mt-auto py-10 px-10 text-center border-t border-gray-200 bg-gray-50">
              <p className="m-0 text-base text-gray-500">
                Código-fonte disponível em
                <a href="https://github.com/cassiopagnoncelli/dicio" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-600 no-underline">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="inline mr-1">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.112.793-.262.793-.583 0-.288-.01-1.05-.015-2.06-3.338.727-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.746.083-.73.083-.73 1.204.084 1.837 1.237 1.837 1.237 1.07 1.834 2.809 1.305 3.495.997.108-.774.418-1.305.76-1.605-2.666-.305-5.467-1.333-5.467-5.93 0-1.31.47-2.38 1.237-3.22-.125-.304-.537-1.527.117-3.176 0 0 1.01-.324 3.3 1.23a11.48 11.48 0 0 1 3.006-.404 11.5 11.5 0 0 1 3.006.404c2.29-1.554 3.3-1.23 3.3-1.23.655 1.65.243 2.873.118 3.176.77.84 1.237 1.91 1.237 3.22 0 4.61-2.803 5.624-5.474 5.922.43.372.81 1.102.81 2.222 0 1.606-.014 2.898-.014 3.293 0 .324.193.698.8.58C20.565 21.797 24 17.298 24 12 24 5.37 18.63 0 12 0z"/>
                  </svg>
                  Cássio Pagnoncelli
                </a>
              </p>
            </footer>
          </div>
        )
      )}
    </div>
  );
}

export default Advanced;
