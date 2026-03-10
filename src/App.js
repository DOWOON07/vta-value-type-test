import React, { useState, useEffect, useRef } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Radar as RadarLine } from 'recharts';
import html2canvas from 'html2canvas';
import TYPES from './types';
import './App.css';
import { QUESTIONS, AXES } from './data';

/* ============================================
   ANALYTICS (구글 시트 연동 Webhook 기반)
   ============================================ */
// 이 URL은 사용자님이 구글 앱스 스크립트 배포 후 알려주시면 여기 넣을 것입니다.
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyeNk11Kbz3FClCK7KixHlGhbmKOuPGMyT2Bi1X5dGgdhsCE2uiP_88F_kpDBg6r7r0/exec';

// 세션(단일 익명 유저) 식별용 난수
let sessionId = localStorage.getItem('freakit_session_id');
if (!sessionId) {
  sessionId = 'user_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('freakit_session_id', sessionId);
}

const sendToGoogleSheet = async (eventName, eventData = '') => {
  if (!WEBHOOK_URL) {
    console.log('[Analytics 연동 대기중]', eventName, eventData);
    return;
  }
  
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        event: eventName,
        data: eventData,
        timestamp: new Date().toISOString()
      }),
      mode: 'no-cors' // 구글 시트 웹훅 CORS 우회용
    });
  } catch (err) {
    console.error('Webhook Error:', err);
  }
};

const Analytics = {
  _getAll() {
    try { return JSON.parse(localStorage.getItem('freakit_analytics') || '{}'); } 
    catch { return {}; }
  },
  _save(data) {
    localStorage.setItem('freakit_analytics', JSON.stringify(data));
  },
  trackStart() {
    const d = this._getAll();
    d.totalStarts = (d.totalStarts || 0) + 1;
    d.lastStart = new Date().toISOString();
    this._save(d);
    sendToGoogleSheet('TEST_START', '테스트 시작');
  },
  trackComplete(type) {
    const d = this._getAll();
    d.totalCompletes = (d.totalCompletes || 0) + 1;
    d.typeResults = d.typeResults || {};
    d.typeResults[type] = (d.typeResults[type] || 0) + 1;
    d.lastComplete = new Date().toISOString();
    this._save(d);
    sendToGoogleSheet('TEST_COMPLETE', type);
  },
  trackShare(method) {
    const d = this._getAll();
    d.shares = d.shares || {};
    d.shares[method] = (d.shares[method] || 0) + 1;
    this._save(d);
    sendToGoogleSheet('SHARE_CLICK', method);
  },
  trackDeepReport(type = 'click') {
    const d = this._getAll();
    if (type === 'click') {
      d.deepReportClicks = (d.deepReportClicks || 0) + 1;
      d.lastDeepReportClick = new Date().toISOString();
    } else if (type === 'intent') {
      d.deepReportIntents = (d.deepReportIntents || 0) + 1;
      d.lastDeepReportIntent = new Date().toISOString();
    }
    this._save(d);
    sendToGoogleSheet('DEEP_REPORT', type);
  },
  trackSatisfaction(rating, feedback) {
    const d = this._getAll();
    d.satisfaction = d.satisfaction || [];
    d.satisfaction.push({ rating, feedback, date: new Date().toISOString() });
    this._save(d);
    sendToGoogleSheet('SATISFACTION', `[별점:${rating}] ${feedback}`);
  },
  getSummary() {
    return this._getAll();
  }
};

/* ============================================
   SATISFACTION MODAL
   ============================================ */
const SatisfactionModal = ({ show, onClose }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  if (!show) return null;

  const handleSubmit = () => {
    Analytics.trackSatisfaction(rating, feedback);
    localStorage.setItem('freakit_satisfaction_done', 'true');
    alert('소중한 의견 감사합니다! 🙏');
    onClose();
  };

  return (
    <div className="satisfaction-modal-overlay" onClick={onClose}>
      <div className="satisfaction-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">테스트 결과가 도움이 되었나요?</div>
        <div className="modal-subtitle">본인의 가치관을 잘 나타내주었는지 알려주세요</div>
        
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map(star => (
            <button 
              key={star} 
              className={`star-btn ${rating >= star ? 'active' : ''}`}
              onClick={() => setRating(star)}
            >
              ⭐
            </button>
          ))}
        </div>
        
        <textarea 
          className="modal-textarea"
          placeholder="문의사항이나 의견이 있다면 자유롭게 남겨주세요 (선택)"
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
        />
        
        <button 
          className="modal-submit" 
          disabled={rating === 0}
          onClick={handleSubmit}
        >
          제출하기
        </button>
        <button className="modal-close" onClick={onClose}>나중에 하기</button>
      </div>
    </div>
  );
};

/* ============================================
   DEEP REPORT FAKE DOOR MODAL
   ============================================ */
const DeepReportModal = ({ show, onClose }) => {
  if (!show) return null;

  const handlePurchaseClick = () => {
    Analytics.trackDeepReport('intent');
    alert('관심을 가져주셔서 감사합니다! 🎉\n\n현재 심층 가치관 리포트는 열심히 제작 중입니다.\n\n가장 완벽한 분석 결과를 제공해 드리기 위해 데이터를 다듬고 있으니 조금만 기다려주세요! 출시에 맞춰 다시 안내해 드리겠습니다.\n(결제는 진행되지 않았습니다)');
    onClose();
  };

  return (
    <div className="satisfaction-modal-overlay" onClick={onClose}>
      <div className="satisfaction-modal report-modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">💎 프리미엄 심층 분석 리포트</h2>
        <p className="modal-desc">
          단순한 결과를 넘어, 당신의 무의식적 가치관을 20페이지 분량으로 정밀 해부합니다.
        </p>
        <ul className="modal-benefits">
          <li>✨ 16가지 유형 중 내 위치와 성향 심층 분석</li>
          <li>💼 업무, 연애, 인간관계 맞춤형 팁 제공</li>
          <li>⚠️ 갈등 상황에서의 맹점과 보완점 진단</li>
        </ul>
        <div className="modal-price-box">
          <span className="price-label">맞춤 리포트 발급 비용</span>
          <span className="price-value">4,900원</span>
        </div>
        
        <div className="modal-actions">
          <button 
            className="fancy-button purchase-btn" 
            onClick={handlePurchaseClick}
            style={{ width: '100%', marginBottom: '12px', background: '#e17055', color: '#fff' }}
          >
            4,900원 결제하고 리포트 받기
          </button>
          <button className="modal-close" onClick={onClose}>
            다음에 할게요
          </button>
        </div>
      </div>
    </div>
  );
};

const CodeRotator = () => {
  const codes = [
    { code: 'DABV', tag: '#경험_디자이너', color: '#ff7675' },
    { code: 'KUBM', tag: '#흔들림없는_사상가', color: '#0984e3' },
    { code: 'KARV', tag: '#포용적_현실주의자', color: '#00b894' },
    { code: 'DUBV', tag: '#비즈니스_선도자', color: '#1e293b' }
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % codes.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [codes.length]);

  const current = codes[index];

  return (
    <div className="code-rotator">
      <div className="rotator-code" style={{ color: current.color }}>
        {current.code}
      </div>
      <div className="rotator-tag">{current.tag}</div>
    </div>
  );
};

const Footer = ({ showReference = true }) => (
  <>
    {showReference && (
      <div className="landing-extra-info">
        <p className="hero-reference">
          <b>전문적인 결과를 위해 솔직하게 답변해 주세요.</b><br/>
          본 검사는 샬롬 슈워츠(Shalom Schwartz)의 보편적 가치 이론(Basic Human Values Theory)을 바탕으로, 
          전 세계 80개국 이상의 데이터를 통해 검증된 과학적인 모델을 재해석하여 탄생했습니다.
        </p>
      </div>
    )}
    <footer className="site-footer">
      <div className="footer-cols">
        <div className="footer-col">
          <h4>Products</h4>
          <ul>
            <li>VTA · Value-Type Analysis</li>
            <li>In-depth Reports</li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Resources</h4>
          <ul>
            <li>Theoretical Background</li>
            <li>Type Library</li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Support</h4>
          <ul>
            <li>Contact / FAQ</li>
            <li>Privacy Policy</li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>FreakIT</h4>
          <ul>
            <li>VTA Research Lab</li>
            <li>About Us</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 FreakIT. All rights reserved.</p>
        <div className="footer-links">
          <span>Terms of Service</span>
          <span>Privacy</span>
          <span>Accessibility</span>
        </div>
      </div>
    </footer>
  </>
);

function App() {
  const [step, setStep] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finalScores, setFinalScores] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultParam = params.get('result');
    if (resultParam && TYPES[resultParam]) {
      const sp = params.get('s'); // 실제 점수 비율 (KD-AU-RB-VM 각 축 왼쪽 %)
      if (sp) {
        // 실제 점수 비율이 있으면 그대로 복원
        const pcts = sp.split('-').map(Number);
        const s = {
          K: pcts[0] || 50, D: 100 - (pcts[0] || 50),
          A: pcts[1] || 50, U: 100 - (pcts[1] || 50),
          R: pcts[2] || 50, B: 100 - (pcts[2] || 50),
          V: pcts[3] || 50, M: 100 - (pcts[3] || 50)
        };
        setFinalScores(s);
      } else {
        // 점수 정보 없는 구형 링크 호환용
        const dominant = 7, recessive = 3;
        const s = { K: recessive, D: recessive, A: recessive, U: recessive, R: recessive, B: recessive, V: recessive, M: recessive };
        const arr = resultParam.split('');
        if(arr[0] === 'K') s.K = dominant; else s.D = dominant;
        if(arr[1] === 'A') s.A = dominant; else s.U = dominant;
        if(arr[2] === 'R') s.R = dominant; else s.B = dominant;
        if(arr[3] === 'V') s.V = dominant; else s.M = dominant;
        setFinalScores(s);
      }
      setStep(2);
    }
  }, []);

  // Ref to store the target viewport-Y for post-render scroll alignment
  const targetViewportY = useRef(null);

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(QUESTIONS.length / ITEMS_PER_PAGE);
  const currentQuestions = QUESTIONS.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  // After page changes, align first button-group CENTER to stored viewport CENTER
  useEffect(() => {
    if (targetViewportY.current !== null) {
      // Use a small timeout to ensure layout has settled (especially for the header logo/nav)
      setTimeout(() => {
        const newFirstBtns = document.querySelector('.question-card .button-group');
        if (newFirstBtns) {
          const rect = newFirstBtns.getBoundingClientRect();
          const newCenterY = rect.top + rect.height / 2;
          window.scrollBy({ top: newCenterY - targetViewportY.current, behavior: 'instant' });
        }
        targetViewportY.current = null;
      }, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentPage]);

  const handleSelect = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
    const currentIndex = currentQuestions.findIndex(q => q.id === qId);
    setTimeout(() => {
      const cards = document.querySelectorAll('.question-card');
      const currentBtns = cards[currentIndex]?.querySelector('.button-group');

      if (currentIndex < currentQuestions.length - 1) {
        const nextBtns = cards[currentIndex + 1]?.querySelector('.button-group');
        if (currentBtns && nextBtns) {
          const diff = nextBtns.getBoundingClientRect().top - currentBtns.getBoundingClientRect().top;
          window.scrollBy({ top: diff, behavior: 'smooth' });
        }
      } else {
        // Scroll "다음으로" button to same Y as current button-group center
        const nextBtn = document.querySelector('.fancy-button.next');
        if (currentBtns && nextBtn) {
          const dest = nextBtn.getBoundingClientRect().top + nextBtn.offsetHeight / 2;
          const src  = currentBtns.getBoundingClientRect().top + currentBtns.offsetHeight / 2;
          window.scrollBy({ top: dest - src, behavior: 'smooth' });
        }
      }
    }, 80);
  };

  const isPageAnswered = () => currentQuestions.every(q => answers[q.id] !== undefined);

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      // Capture viewport CENTER Y of the clicked button to maintain cursor focus
      const nextBtn = document.querySelector('.fancy-button.next');
      if (nextBtn) {
        const rect = nextBtn.getBoundingClientRect();
        targetViewportY.current = rect.top + rect.height / 2;
      } else {
        targetViewportY.current = 120;
      }
      setCurrentPage(prev => prev + 1);
    } else {
      setIsAnalyzing(true);
      
      const s = { K: 0, D: 0, A: 0, U: 0, R: 0, B: 0, V: 0, M: 0 };
      QUESTIONS.forEach((q) => {
        const val = answers[q.id];
        if (val > 4) {
          s[q.direction] += (val - 4);
        } else if (val < 4) {
          const opposite = q.axis.replace(q.direction, "");
          s[opposite] += (4 - val);
        }
      });

      // Streamlined flow: 2-second delay on the button, then show results
      setTimeout(() => {
        setFinalScores(s);
        setStep(2);
        setIsAnalyzing(false);
        window.scrollTo(0, 0);
      }, 2000);
    }
  };

  const handleStart = () => {
    Analytics.trackStart();
    setStep(1);
  };

  return (
    <div className="container">
      {/* 0. 랜딩 페이지 */}
      {step === 0 && (
        <div className="landing-page">
          <nav className="vta-topbar">
            <img src="/favicon.png" alt="VTA logo" className="vta-logo-img" />
            <span className="vta-logo">VTA</span>
            <span className="vta-divider">|</span>
            <span className="vta-label">Value-Type Analysis</span>
          </nav>
          <h1 className="hero-title"><span className="hero-question">나는 무엇을 위해 살아가는가?</span><br/><span className="highlight">가치관 유형 테스트</span></h1>
          <p className="hero-subtitle">
            인간의 무의식적 선택 뒤에 숨겨진 <b>4대 가치 축(보존·상생·원칙·활력)</b><b>의 상충 관계(Trade-off)</b>를 정밀하게 추적합니다.
            <br /><br />
            당신조차 미처 인식하지 못했던 <b>내면의 우선순위를 발견</b>하고,<br />
            중요한 순간 <b>당신이 내리는</b> <b>결정의 이유</b>와<br />
            <b>당신을 움직이는</b> <b>진짜 동기</b>를 찾아보세요.
          </p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="icon">
                <img src="/images/happiness_hero.png" alt="행복" className="feature-hero-img" />
              </div>
              <div className="feature-text">
                <div className="label">행복을 위한 자기 이해</div>
                <div className="desc">내가 진정으로 중요하게 여기는 것이 무엇인지 아는 것. 그것이 더 행복한 삶을 만드는 시작입니다.</div>
              </div>
            </div>
            <div className="feature-card">
              <div className="icon">
                <img src="/images/foundation_hero.png" alt="삶의 토대" className="feature-hero-img" />
              </div>
              <div className="feature-text">
                <div className="label">흔들리지 않는 삶의 토대</div>
                <div className="desc">남들과 다른 길이라도 자신 있게 걸을 수 있는 힘. 그건 나만의 철학을 이해하는 것에서 시작됩니다.</div>
              </div>
            </div>
            <div className="feature-card">
              <div className="icon">
                <CodeRotator />
              </div>
              <div className="feature-text">
                <div className="label">16가지 가치관 유형화</div>
                <div className="desc">당신의 무의식적 선택들을 데이터로 시각화하여, 진정한 나 자신을 마주할 수 있는 가치관 리포트를 그려드립니다.</div>
              </div>
            </div>
          </div>

          <button className="fancy-button main-start" onClick={handleStart}>
            검사 시작하기
            <span className="arrow">→</span>
          </button>

          <Footer />
        </div>
      )}

      {/* 1. 검사 화면 */}
      {step === 1 && (
        <div className="test-view">
          <div className="test-top-logo">
            <img src="/favicon.png" alt="VTA logo" className="vta-logo-img-sm" />
            VTA · Value-Type Analysis
          </div>
          <div className="test-header">
            <div className="nav-col">
              {currentPage > 0 && (
                <button className="nav-button prev-rect" onClick={handlePrev}>
                  <svg className="arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  이전페이지
                </button>
              )}
            </div>
            <div className="progress-wrapper">
              <div className="progress-info">
                <span>{currentPage + 1} / {totalPages}</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="question-list">
            {currentQuestions.map((q) => (
              <div key={q.id} className="question-card">
                <p className="question-text">{q.text}</p>
                <div className="button-group">
                  <span className="label-text pos">동의</span>
                  {[7, 6, 5, 4, 3, 2, 1].map((v) => (
                    <button
                      key={v}
                      className={`segment-bar bar-${v} ${answers[q.id] === v ? (v > 4 ? 'active-pos' : v === 4 ? 'active-neu' : 'active-neg') : ''}`}
                      onClick={() => handleSelect(q.id, v)}
                    />
                  ))}
                  <span className="label-text neg">비동의</span>
                </div>
              </div>
            ))}
          </div>

          <div className="test-nav">
            <button 
              className={`fancy-button next ${isPageAnswered() ? 'ready' : ''} ${isAnalyzing ? 'analyzing' : ''}`} 
              disabled={!isPageAnswered() || isAnalyzing} 
              onClick={handleNext}
            >
              {isAnalyzing ? "결과 생성중..." : (currentPage < totalPages - 1 ? "다음으로" : "검사 완료")}
            </button>
          </div>
          
          <Footer />
        </div>
      )}


      {/* 2. 결과 페이지 */}
      {step === 2 && finalScores && <ResultView scores={finalScores} />}
    </div>
  );
}

const ResultView = ({ scores }) => {
  const type =
    (scores.K >= scores.D ? "K" : "D") +
    (scores.A >= scores.U ? "A" : "U") +
    (scores.R >= scores.B ? "R" : "B") +
    (scores.V >= scores.M ? "V" : "M");

  const result = TYPES[type] || TYPES.DABV;

  // Track completion
  useEffect(() => {
    Analytics.trackComplete(type);
  }, [type]);

  // Satisfaction & Deep Report modal triggers
  const [showSatisfaction, setShowSatisfaction] = useState(false);
  const [showDeepReportModal, setShowDeepReportModal] = useState(false);
  const shareRef = useRef(null);
  const satisfactionTriggered = useRef(false);

  useEffect(() => {
    // 이전에는 localStorage.getItem('freakit_satisfaction_done') 검사가 있어서 한 번 제출하면 모달이 영구적으로 안떴습니다.
    // 매번 새로 고침 후 결과 화면 하단으로 내릴 때마다 표시되도록 삭제했습니다.

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !satisfactionTriggered.current) {
          satisfactionTriggered.current = true;
          // Small delay so user sees the share section first
          setTimeout(() => setShowSatisfaction(true), 800);
        }
      },
      { threshold: 0.3 }
    );

    const el = shareRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, []);

  const handleDownloadImage = async () => {
    const element = document.querySelector('.result-hero');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `VTA_Value-Type-Analysis_${type}.png`;
      link.click();
      Analytics.trackShare('image_download');
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  // 실제 점수 비율을 URL에 포함하여 공유 시 동일한 차트가 보이도록 함
  const kPct = Math.round((scores.K / (scores.K + scores.D)) * 100);
  const aPct = Math.round((scores.A / (scores.A + scores.U)) * 100);
  const rPct = Math.round((scores.R / (scores.R + scores.B)) * 100);
  const vPct = Math.round((scores.V / (scores.V + scores.M)) * 100);
  const shareUrl = `${window.location.origin}${window.location.pathname}?result=${type}&s=${kPct}-${aPct}-${rPct}-${vPct}`;
  const shareText = `나의 가치관 유형은 [${type}] ${result.title}! 당신의 가치관도 확인해보세요 🔥`;

  const handleShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('결과 페이지 주소가 복사되었습니다!');
    Analytics.trackShare('link_copy');
  };

  const handleShareKakao = async () => {
    // 모바일 등 네이티브 공유(Web Share API) 지원 시 OS 공유창(카카오톡 선택 가능) 띄우기
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FREAKIT 가치관 테스트',
          text: shareText,
          url: shareUrl,
        });
        Analytics.trackShare('kakao_native');
      } catch (err) {
        console.log('Share canceled', err);
      }
    } else {
      // 미지원 기기(PC 등)는 클립보드 복사 후 안내
      handleShareLink();
      alert('모바일 기기에서는 카카오톡으로 바로 공유할 수 있습니다.');
    }
  };

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    Analytics.trackShare('twitter');
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    Analytics.trackShare('facebook');
  };

  const handleShareInstagram = async () => {
    // 결과 이미지를 생성하여 Web Share API로 인스타그램 스토리에 공유
    try {
      const element = document.querySelector('.result-hero');
      if (!element) throw new Error('no element');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true });
      
      // canvas -> blob -> File
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `VTA_${type}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'VTA 가치관 테스트 결과',
          text: shareText,
          url: shareUrl,
          files: [file]
        });
        Analytics.trackShare('instagram_native');
      } else {
        // 파일 공유 미지원 기기(PC 등)는 이미지 다운로드 후 안내
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `VTA_${type}.png`;
        link.click();
        alert('Instagram 공유: 이미지가 저장되었습니다! Instagram 앱을 열어 스토리에 업로드해주세요 📸');
        Analytics.trackShare('instagram_download');
      }
    } catch (err) {
      console.log('Instagram share error:', err);
      alert('Instagram 공유: 아래 "결과 이미지 저장하기" 버튼으로 이미지를 저장한 후 Instagram 스토리에 업로드해주세요! 📸');
      Analytics.trackShare('instagram');
    }
  };

  const handleDeepReport = () => {
    Analytics.trackDeepReport('click');
    setShowDeepReportModal(true);
  };

  const oppositeType = type.split('').map(char => {
    if (char === 'K') return 'D';
    if (char === 'D') return 'K';
    if (char === 'A') return 'U';
    if (char === 'U') return 'A';
    if (char === 'R') return 'B';
    if (char === 'B') return 'R';
    if (char === 'V') return 'M';
    if (char === 'M') return 'V';
    return char;
  }).join('');

  const oppositeResult = TYPES[oppositeType] || TYPES.KURM;

  if (!result) return <div style={{padding: 40, textAlign:'center'}}>결과를 찾을 수 없습니다. ({type})</div>;

  const chartData = [
    { subject: '보존/변화', value: scores.K + scores.D > 0 ? (scores.K / (scores.K + scores.D)) * 100 : 50 },
    { subject: '상생/탁월', value: scores.A + scores.U > 0 ? (scores.A / (scores.A + scores.U)) * 100 : 50 },
    { subject: '원칙/실리', value: scores.R + scores.B > 0 ? (scores.R / (scores.R + scores.B)) * 100 : 50 },
    { subject: '활력/의미', value: scores.V + scores.M > 0 ? (scores.V / (scores.V + scores.M)) * 100 : 50 },
  ];

  const axisEntries = ["KD", "AU", "RB", "VM"];

  return (
    <div className="result-container">
      {/* Hero */}
      <div className="result-hero" style={{ background: `linear-gradient(135deg, ${result.gradient[0]}, ${result.gradient[1]})` }}>
        <img 
          src={`/images/characters/${type}_clean.png`} 
          alt={result.title}
          className="result-character-img"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <p className="result-intro-label">당신의 가치관 유형 :</p>
        <div className="result-type-code">{type}</div>
        <h1 className="result-title">{result.title}</h1>
        <p className="result-quote">"{result.quote}"</p>
        <div className="result-keywords">
          {result.keywords.map((kw, i) => <span key={i} className="keyword-tag">#{kw}</span>)}
        </div>
      </div>

      {/* 종합 리포트 */}
      <div className="result-section">
        <div className="section-title">가치관 종합 리포트</div>
        <div className="report-text">
          {result.report.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* 레이더 차트 */}
      <div className="result-section chart-section">
        <div className="section-title">가치관 레이더</div>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="rgba(30, 41, 59, 0.12)" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={({ x, y, payload, textAnchor }) => {
                const subject = payload.value;
                const dataItem = chartData.find(d => d.subject === subject);
                if (!dataItem) return null;
                const [left, right] = subject.split('/');
                const isLeftDominant = dataItem.value >= 50;
                
                return (
                  <text 
                    x={x} 
                    y={y + (y > 140 ? 6 : -2)} 
                    textAnchor={textAnchor} 
                    fontSize={13} 
                    fontFamily="Outfit"
                  >
                    <tspan fontWeight={isLeftDominant ? "900" : "500"} fill={isLeftDominant ? "#0f172a" : "#94a3b8"}>{left}</tspan>
                    <tspan fontWeight="400" fill="#cbd5e1"> / </tspan>
                    <tspan fontWeight={!isLeftDominant ? "900" : "500"} fill={!isLeftDominant ? "#0f172a" : "#94a3b8"}>{right}</tspan>
                  </text>
                );
              }} 
            />
            <RadarLine dataKey="value" stroke={result.gradient[0]} fill={result.gradient[0]} fillOpacity={0.25} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 가치관 스펙트럼 */}
      <div className="result-section">
        <div className="section-title">가치관 스펙트럼</div>
        {axisEntries.map((key) => {
          const axis = AXES[key];
          const leftScore = scores[axis.leftKey] || 0;
          const rightScore = scores[axis.rightKey] || 0;
          const total = leftScore + rightScore;
          const leftPct = total > 0 ? Math.round((leftScore / total) * 100) : 50;
          const leftDominant = leftScore >= rightScore;

          return (
            <div key={key} className="spectrum-item">
              <div className="spectrum-header">
                <span className="spectrum-label">{axis.label}</span>
                <span className="spectrum-label">
                  <span className={leftDominant ? 'dominant' : 'inactive'}>{axis.left}</span>
                  {' vs '}
                  <span className={!leftDominant ? 'dominant' : 'inactive'}>{axis.right}</span>
                </span>
              </div>
              <div className="spectrum-poles">
                <span className={`pole ${leftDominant ? 'dominant' : 'inactive'}`}>
                  {axis.left} {leftPct}%
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#e17055', letterSpacing: '1px' }}>VS</span>
                <span className={`pole ${!leftDominant ? 'dominant' : 'inactive'}`}>
                  {axis.right} {100 - leftPct}%
                </span>
              </div>
              <div className="spectrum-bar-bg">
                <div className="spectrum-bar-fill" style={{
                  width: `${leftPct}%`,
                  background: `linear-gradient(to right, ${result.gradient[0]}, ${result.gradient[1]})`,
                  opacity: leftDominant ? 1 : 0.3
                }} />
                <div className="spectrum-bar-fill right-fill" style={{
                  width: `${100 - leftPct}%`,
                  left: `${leftPct}%`,
                  background: `linear-gradient(to right, ${result.gradient[1]}, ${result.gradient[0]})`,
                  opacity: !leftDominant ? 1 : 0.3
                }} />
              </div>
              <p className="spectrum-desc">{result.spectrum[key]}</p>
            </div>
          );
        })}
      </div>

      {/* 핵심 포인트 */}
      <div className="result-section">
        <div className="section-title">당신을 꿰뚫어 보는 3가지 핵심 포인트</div>
        {result.keyPoints.map((point, i) => (
          <div key={i} className="key-point">
            <div className="key-point-title">
              <span className="key-point-number" style={{ background: `linear-gradient(135deg, ${result.gradient[0]}, ${result.gradient[1]})`, color: '#fff' }}>{i + 1}</span>
              {point.title}
            </div>
            <p className="key-point-desc">{point.desc}</p>
          </div>
        ))}
      </div>

      {/* 커리어 */}
      <div className="result-section insight-section">
        <div className="section-title">커리어</div>
        <div className="insight-card career">
          <div className="insight-content">
            <p>{result.lifeAnalysis?.work || "연구소에서 가치관 기반 커리어 데이터를 분석 중입니다..."}</p>
          </div>
        </div>
      </div>

      {/* 인간관계 */}
      <div className="result-section insight-section">
        <div className="section-title">인간관계</div>
        <div className="insight-card relationship">
          <div className="insight-content">
            <p>{result.lifeAnalysis?.relationship || "연구소에서 가치관 기반 관계 데이터를 분석 중입니다..."}</p>
          </div>
        </div>
      </div>

      {/* 개인적 성장 */}
      <div className="result-section insight-section">
        <div className="section-title">개인적 성장</div>
        <div className="insight-card growth">
          <div className="insight-content">
            <p>{result.lifeAnalysis?.growth || "연구소에서 가치관 기반 성장 데이터를 분석 중입니다..."}</p>
          </div>
        </div>
      </div>

      {/* Strengths */}
      <div className="result-section quality-section">
        <div className="section-title">강점</div>
        <div className="quality-box strength">
          <ul className="quality-list">
            {result.strengths?.map((s, i) => (
              <li key={i}>
                <div className="q-item-title">{s.title}</div>
                <div className="q-item-desc">{s.desc}</div>
              </li>
            )) || <li>데이터 로딩 중...</li>}
          </ul>
        </div>
      </div>

      {/* Weaknesses */}
      <div className="result-section quality-section">
        <div className="section-title">약점</div>
        <div className="quality-box weakness">
          <ul className="quality-list">
            {result.weaknesses?.map((w, i) => (
              <li key={i}>
                <div className="q-item-title">{w.title}</div>
                <div className="q-item-desc">{w.desc}</div>
              </li>
            )) || <li>데이터 로딩 중...</li>}
          </ul>
        </div>
      </div>

      {/* 정반대 유형 탐색 */}
      {oppositeResult && (
        <div className="result-section opposite-section">
          <div className="section-title">당신과 정반대인 유형은?</div>
          <div className="opposite-card">
            <div className="opposite-header">
              <img 
                src={`/images/characters/${oppositeType}_clean.png`}
                alt={oppositeResult.title}
                className="result-character-img"
                style={{ width: 100, height: 100, margin: 0, animation: 'none' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="opp-info">
                <div className="opp-type-code">{oppositeType}</div>
                <div className="opp-title">{oppositeResult.title}</div>
              </div>
            </div>
            
            <div className="opposite-comparison-content">
              <p className="opp-context-text">{result.oppositeComparison?.context}</p>
              
              <div className="comparison-box work">
                <div className="comp-label">🏢 일할 때, 우리는 이렇게 달라요</div>
                <p className="comp-text">{result.oppositeComparison?.work}</p>
              </div>
              
              <div className="comparison-box life">
                <div className="comp-label">❤️ 일상과 사랑에서, 우리는 이렇게 달라요</div>
                <p className="comp-text">{result.oppositeComparison?.life}</p>
              </div>
            </div>

            <div className="opp-footer-tip">
              가치관이 정반대이기에 더 궁금하고, 함께할 때 서로의 사각지대를 완벽히 보완해줄 수 있는 최고의 파트너가 될 수 있습니다.
            </div>
          </div>
        </div>
      )}

      {/* 심층 리포트 CTA */}
      <div className="deep-report-section">
        <div className="deep-report-badge">✨ PREMIUM</div>
        <div className="deep-report-emoji">📋</div>
        <div className="deep-report-title">나만의 심층 가치관 리포트</div>
        <div className="deep-report-desc">
          20페이지 분량의 맞춤형 심층 분석 리포트를 통해<br/>
          당신의 가치관을 더욱 깊이 이해해보세요.<br/>
          커리어 전략, 인간관계 가이드, 성장 로드맵까지 모두 포함됩니다.
        </div>
        <div className="deep-report-price">
          <del>9,900원</del> 4,900원
        </div>
        <button className="deep-report-btn" onClick={handleDeepReport}>
          심층 리포트 받기 →
        </button>
      </div>

      {/* 공유하기 */}
      <div className="share-section" ref={shareRef}>
        <h3 className="share-title">나의 결과 공유하기</h3>
        <p className="share-subtitle">링크를 복사하거나 이미지를 저장하여 친구들에게 알려보세요!</p>

        <button className="share-btn-image" style={{ background: '#F0EDFF', color: 'var(--primary)', boxShadow: 'none' }} onClick={handleShareLink}>
          🔗 링크 복사하기
        </button>

        <button className="share-btn-image" onClick={handleDownloadImage}>
          📸 결과 이미지 저장하기
        </button>

        <div className="share-buttons">
          <button className="share-btn btn-instagram" onClick={handleShareInstagram}>
            <span className="share-icon">📷</span> 인스타그램
          </button>
          <button className="share-btn btn-kakao" onClick={handleShareKakao}>
            <span className="share-icon">K</span> 카카오톡
          </button>
          <button className="share-btn btn-twitter" onClick={handleShareTwitter}>
            <span className="share-icon">𝕏</span> 트위터
          </button>
          <button className="share-btn btn-facebook" onClick={handleShareFacebook}>
            <span className="share-icon">f</span> 페이스북
          </button>
        </div>
      </div>

      {/* 💎 캡처용 히든 카드 (Beautiful Sharing) */}
      <div id="share-card-capture" className="share-card-capture" style={{
        position: 'fixed', left: '-9999px', top: '0',
        background: `linear-gradient(135deg, ${result.gradient[0]}, ${result.gradient[1]})`,
        width: '400px', padding: '40px 20px', textAlign: 'center', color: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div className="scc-brand" style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '2px', opacity: 0.8, marginBottom: '20px' }}>VTA · Value-Type Analysis</div>
        <img 
          src={`/images/characters/${type}_clean.png`} 
          alt={result.title}
          style={{ width: '180px', height: '180px', objectFit: 'contain', marginBottom: '20px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' }}
          crossOrigin="anonymous"
        />
        <div className="scc-type" style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '4px', marginBottom: '5px' }}>{type}</div>
        <div className="scc-title" style={{ fontSize: '24px', fontWeight: 800, marginBottom: '15px' }}>{result.title}</div>
        <p className="scc-quote" style={{ fontSize: '15px', lineHeight: 1.6, opacity: 0.9, marginBottom: '25px', padding: '0 20px', wordBreak: 'keep-all' }}>"{result.quote}"</p>
        <div className="scc-keywords" style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '30px' }}>
          {result.keywords.map((kw, i) => <span key={i} className="scc-keyword" style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>#{kw}</span>)}
        </div>
        <div className="scc-footer" style={{ fontSize: '13px', opacity: 0.7, fontWeight: 500 }}>freakit.net/value-test</div>
      </div>

      {/* 다시하기 */}
      <div className="action-buttons">
        <button className="fancy-button restart" onClick={() => window.location.reload()}>
          다시 테스트하기
        </button>
      </div>

      <Footer showReference={false} />

      {/* 만족도 모달 */}
      <SatisfactionModal 
        show={showSatisfaction} 
        onClose={() => setShowSatisfaction(false)} 
      />

      {/* 심층 리포트 (Fake Door) 모달 */}
      <DeepReportModal 
        show={showDeepReportModal}
        onClose={() => setShowDeepReportModal(false)}
      />
    </div>
  );
};


export default App;
