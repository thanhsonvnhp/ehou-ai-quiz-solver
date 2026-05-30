// Content Script - Tương tác với trang web ehou.edu.vn

// Lắng nghe tin nhắn từ popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractQuestions') {
    try {
      const questions = extractQuestionsFromPage();
      sendResponse({ success: true, data: questions });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'highlightAnswer') {
    try {
      highlightCorrectAnswer(request.questionIndex, request.answerLabel, request.autoCheck);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'clearHighlights') {
    try {
      clearAllHighlights();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

// Trích xuất tất cả câu hỏi từ trang
function extractQuestionsFromPage() {
  const questions = [];
  const questionElements = document.querySelectorAll('.que.multichoice, .que');

  if (questionElements.length === 0) {
    throw new Error('Không tìm thấy câu hỏi trên trang. Đảm bảo bạn đang ở trang làm bài thi.');
  }

  questionElements.forEach((questionEl, index) => {
    try {
      const questionData = extractSingleQuestion(questionEl, index);
      if (questionData) questions.push(questionData);
    } catch (error) {
      console.warn(`Lỗi khi trích xuất câu hỏi ${index + 1}:`, error);
    }
  });

  if (questions.length === 0) {
    throw new Error('Không thể trích xuất nội dung câu hỏi. Vui lòng kiểm tra lại trang.');
  }

  return questions;
}

// Trích xuất một câu hỏi đơn
function extractSingleQuestion(questionEl, index) {
  const qnoEl = questionEl.querySelector('.qno');
  const questionNumber = qnoEl ? qnoEl.textContent.trim() : (index + 1).toString();

  const qtextEl = questionEl.querySelector('.qtext');
  if (!qtextEl) return null;

  const questionText = cleanText(qtextEl.innerText || qtextEl.textContent);
  const answers = [];
  let hasAnswer = false;
  const answerEls = questionEl.querySelectorAll('.answer .r0, .answer .r1');

  answerEls.forEach((answerEl) => {
    const radioInput = answerEl.querySelector('input[type="radio"]');
    const label = answerEl.querySelector('label');

    if (radioInput && label) {
      const answerText = cleanText(label.innerText || label.textContent);
      const cleanedAnswer = answerText.replace(/^[a-z]\.\s*/i, '');

      if (radioInput.checked) hasAnswer = true;

      answers.push({
        value: radioInput.value,
        text: cleanedAnswer,
        element: answerEl
      });
    }
  });

  if (answers.length === 0) return null;

  return {
    index,
    questionNumber,
    question: questionText,
    answers,
    hasAnswer,
    element: questionEl
  };
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
}

// Highlight đáp án đúng
function highlightCorrectAnswer(questionIndex, answerLabel, autoCheck = false) {
  const questions = document.querySelectorAll('.que.multichoice, .que');

  if (questionIndex < 0 || questionIndex >= questions.length) {
    throw new Error('Không tìm thấy câu hỏi');
  }

  const questionEl = questions[questionIndex];
  clearHighlightForQuestion(questionEl);

  const answerEls = questionEl.querySelectorAll('.answer .r0, .answer .r1');

  // Tìm index đáp án: ưu tiên chữ cái A/B/C/D, fallback so khớp text
  let targetAnswer = null;

  const singleLetter = answerLabel.trim().match(/^([A-Za-z])\.?$/);
  if (singleLetter) {
    const answerIndex = singleLetter[1].toUpperCase().charCodeAt(0) - 65;
    if (answerIndex >= 0 && answerIndex < answerEls.length) {
      targetAnswer = answerEls[answerIndex];
    }
  }

  // Fallback: so khớp text nếu AI trả về nội dung đáp án thay vì chữ cái
  if (!targetAnswer) {
    const normalizedLabel = answerLabel.trim().toLowerCase();
    for (const el of answerEls) {
      const label = el.querySelector('label');
      if (!label) continue;
      const text = cleanText(label.innerText || label.textContent)
        .replace(/^[a-z]\.\s*/i, '')
        .toLowerCase();
      if (text === normalizedLabel || text.includes(normalizedLabel) || normalizedLabel.includes(text)) {
        targetAnswer = el;
        break;
      }
    }
  }

  if (targetAnswer) {
    targetAnswer.classList.add('ai-highlight-correct');

    if (autoCheck) {
      const radioInput = targetAnswer.querySelector('input[type="radio"]');
      if (radioInput && !radioInput.checked) {
        radioInput.checked = true;
        radioInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    addAISuggestionBadge(targetAnswer);
  }
}

function addAISuggestionBadge(answerEl) {
  if (answerEl.querySelector('.ai-suggestion-badge')) return;
  const badge = document.createElement('span');
  badge.className = 'ai-suggestion-badge';
  badge.textContent = '✓ AI Suggested';
  answerEl.appendChild(badge);
}

function clearHighlightForQuestion(questionEl) {
  questionEl.querySelectorAll('.ai-highlight-correct').forEach(el => el.classList.remove('ai-highlight-correct'));
  questionEl.querySelectorAll('.ai-suggestion-badge').forEach(badge => badge.remove());
}

function clearAllHighlights() {
  document.querySelectorAll('.ai-highlight-correct').forEach(el => el.classList.remove('ai-highlight-correct'));
  document.querySelectorAll('.ai-suggestion-badge').forEach(badge => badge.remove());
}

// ========== QUIZ RESULT DETECTION & SAVE ==========

// Lưu kết quả AI vào sessionStorage để dùng lại sau khi trang reload
function persistAIResults() {
  try {
    sessionStorage.setItem('ai_quiz_results', JSON.stringify(widgetState.results));
  } catch (e) {
    console.warn('[AI Widget] Không thể lưu vào sessionStorage:', e);
  }
}

// Đọc lại kết quả AI đã lưu, trả về map questionText -> { explanation, answer }
function loadPersistedAIResults() {
  try {
    const raw = sessionStorage.getItem('ai_quiz_results');
    if (!raw) return {};
    const results = JSON.parse(raw);
    const map = {};
    for (const r of results) {
      if (r.questionText) {
        map[r.questionText] = { explanation: r.explanation || '', answer: r.answer || '' };
      }
    }
    return map;
  } catch (e) {
    return {};
  }
}

// Kiểm tra xem trang hiện tại có phải trang kết quả bài kiểm tra không
// Trang kết quả có các element .correct/.incorrect hoặc .rightanswer
function isQuizResultPage() {
  return (
    document.querySelector('.que .correct') !== null ||
    document.querySelector('.que .incorrect') !== null ||
    document.querySelector('.rightanswer') !== null ||
    document.querySelector('.que.correct') !== null ||
    document.querySelector('.que.incorrect') !== null
  );
}

// Trích xuất câu hỏi và đáp án đúng từ trang kết quả
function extractQuizResultQuestions() {
  const questions = [];
  const questionElements = document.querySelectorAll('.que.multichoice, .que');
  const aiResultsMap = loadPersistedAIResults();

  questionElements.forEach((questionEl, index) => {
    try {
      const qtextEl = questionEl.querySelector('.qtext');
      if (!qtextEl) return;

      const questionText = cleanText(qtextEl.innerText || qtextEl.textContent);
      const options = [];
      let correctAnswerText = null;

      const answerEls = questionEl.querySelectorAll('.answer .r0, .answer .r1');
      answerEls.forEach((answerEl) => {
        const label = answerEl.querySelector('label');
        if (!label) return;

        const answerText = cleanText(label.innerText || label.textContent);
        const cleaned = answerText.replace(/^[a-z]\.\s*/i, '');
        options.push(cleaned);

        // Đáp án đúng: có class .correct hoặc img grade_correct
        const isCorrect =
          answerEl.classList.contains('correct') ||
          answerEl.querySelector('img[src*="grade_correct"]') !== null ||
          answerEl.querySelector('.fa-check') !== null;

        if (isCorrect && !correctAnswerText) {
          correctAnswerText = cleaned;
        }
      });

      // Fallback: tìm trong .rightanswer
      if (!correctAnswerText) {
        const rightAnswerEl = questionEl.querySelector('.rightanswer');
        if (rightAnswerEl) {
          const rightText = cleanText(rightAnswerEl.innerText || rightAnswerEl.textContent);
          const match = rightText.match(/:\s*(.+)$/);
          if (match) correctAnswerText = match[1].replace(/^[a-z]\.\s*/i, '').trim();
        }
      }

      if (correctAnswerText && options.length > 0) {
        // Chỉ lưu nếu người dùng trả lời đúng (không có đáp án sai được chọn)
        const hasIncorrectSelected = Array.from(answerEls).some(el =>
          el.classList.contains('incorrect') ||
          el.querySelector('img[src*="grade_incorrect"]') !== null
        );
        if (hasIncorrectSelected) return;
        // Ghép explanation từ kết quả AI đã lưu trước đó
        const cached = aiResultsMap[questionText];
        const explanation = cached ? cached.explanation : '';
        questions.push({ questionText, options, correctAnswerText, explanation });
      }
    } catch (err) {
      console.warn(`[AI Widget] Lỗi trích xuất câu ${index + 1}:`, err);
    }
  });

  return questions;
}

// Gửi kết quả bài kiểm tra lên backend
async function saveQuizResults() {
  const saveBtn = document.getElementById('ai-widget-save-quiz');
  if (!saveBtn) return;

  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Đang lưu...';
  updateWidgetStatus('💾 Đang lưu bài kiểm tra vào database...', 'info');

  try {
    const questions = extractQuizResultQuestions();

    if (questions.length === 0) {
      updateWidgetStatus('⚠️ Không tìm thấy câu hỏi có đáp án đúng để lưu.', 'warning');
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Lưu bài kiểm tra';
      return;
    }

    const payload = {
      questions,
      sourceUrl: window.location.href,
      courseCode: extractCourseCode(),
      deviceId: await getDeviceId(),
      userName: widgetState.userInfo?.userName || null,
      userId: widgetState.userInfo?.userId || null,
      userAccount: widgetState.userInfo?.userAccount || null
    };

    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'saveQuizResults', data: payload }, (res) => {
        if (res && res.success) resolve(res.data);
        else reject(new Error(res?.error || 'Unknown error'));
      });
    });

    updateWidgetStatus(
      `✅ Đã lưu ${response.savedCount}/${response.total} câu hỏi vào database!`,
      'success'
    );
    saveBtn.textContent = `✅ Đã lưu (${response.savedCount}/${response.total})`;
  } catch (err) {
    updateWidgetStatus(`❌ Lỗi khi lưu: ${err.message}`, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Lưu bài kiểm tra';
  }
}

function extractCourseCode() {
  // Lấy tên môn học từ .home-coursename, ví dụ "Mạng và truyền thông - IT11.068"
  const courseNameEl = document.querySelector('.home-coursename a, .coursename a');
  if (courseNameEl) {
    return courseNameEl.textContent.trim();
  }
  // Fallback: lấy từ URL hoặc breadcrumb
  const match = window.location.href.match(/course=(\d+)/);
  if (match) return match[1];
  const breadcrumb = document.querySelector('.breadcrumb-item a[href*="course"]');
  if (breadcrumb) {
    const m = breadcrumb.href.match(/id=(\d+)/);
    if (m) return m[1];
  }
  return '';
}

async function getDeviceId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['deviceId'], (items) => {
      if (items.deviceId) { resolve(items.deviceId); return; }
      const id = 'ext-' + Math.random().toString(36).substr(2, 12);
      chrome.storage.local.set({ deviceId: id });
      resolve(id);
    });
  });
}

// ========== FLOATING WIDGET ==========

let widget = null;
let widgetState = {
  isMinimized: false,
  isDragging: false,
  currentX: 0,
  currentY: 0,
  initialX: 0,
  initialY: 0,
  results: [],
  isSolving: false,
  currentAbortController: null,
  userInfo: null
};

// Trích xuất thông tin user từ trang Moodle
function extractUserInfo() {
  try {
    let userName = null; // Họ tên đầy đủ
    let userId = null;
    let userAccount = null; // Tên đăng nhập (username)

    // Cách 1: Từ biến JS toàn cục M.cfg (Moodle config)
    if (typeof M !== 'undefined' && M.cfg) {
      userId = M.cfg.userid || null;
    }

    // Cách 2: Từ link profile trong .userinfo
    const profileLink = document.querySelector('.userinfo a[href*="user/view.php"], a[href*="user/view.php"]');
    if (profileLink) {
      // Lấy userId từ URL: https://learning.ehou.edu.vn/user/view.php?id=123456
      try {
        const url = new URL(profileLink.href);
        const idParam = url.searchParams.get('id');
        if (idParam) userId = idParam;
      } catch (e) {}
    }

    // Cách 3: Từ avatar image
    const avatarImg = document.querySelector('.userinfo img.userpicture, img.userpicture[src*="avatar"]');
    if (avatarImg) {
      // Lấy userAccount từ src: http://account.ehou.edu.vn/avatar/w210-h210/ten_tai_khoan.jpg
      const srcMatch = avatarImg.src.match(/\/avatar\/[^\/]+\/([^\.\/]+)\.(jpg|png|gif)/i);
      if (srcMatch) {
        userAccount = srcMatch[1];
      }

      // Lấy userName (họ tên) từ alt hoặc title: "Hình của Nguyễn Văn A"
      const altText = avatarImg.alt || avatarImg.title || '';
      const altMatch = altText.match(/Hình của\s+(.+)/i);
      if (altMatch) {
        userName = altMatch[1].trim();
      }
    }

    // Cách 4: Từ DOM - tên user trong header/menu (fallback cho userName)
    if (!userName) {
      const userTextEl = document.querySelector('.usermenu .usertext, .usertext, .username');
      if (userTextEl) {
        userName = userTextEl.textContent.trim();
      }
    }

    // Cách 5: Từ data attribute
    if (!userId) {
      const userEl = document.querySelector('[data-userid]');
      if (userEl) userId = userEl.dataset.userid;
    }

    // Fallback: nếu không có userName thì dùng userAccount
    if (!userName && userAccount) {
      userName = userAccount;
    }

    // Hiển thị userName (họ tên) trên widget, fallback về userAccount hoặc "Người dùng"
    const displayName = userName || userAccount || 'Người dùng';

    return {
      userName: userName || null,
      userId: userId || null,
      userAccount: userAccount || null,
      displayName: displayName
    };
  } catch (error) {
    console.warn('[AI Widget] Không thể lấy thông tin user:', error);
    return { userName: null, userId: null, userAccount: null, displayName: 'Người dùng' };
  }
}

function createWidget() {
  if (document.getElementById('ai-quiz-widget')) return;

  widgetState.userInfo = extractUserInfo();
  const { displayName } = widgetState.userInfo;

  widget = document.createElement('div');
  widget.id = 'ai-quiz-widget';
  widget.className = '';
  widget.innerHTML = `
    <div class="ai-widget-collapsed-view" id="ai-widget-collapsed" style="display:none;">
      <div class="ai-widget-icon">🤖</div>
      <div class="ai-widget-greeting">Tôi là trợ lý AI<br>hãy để tôi giúp bạn</div>
    </div>
    <div class="ai-widget-expanded-view">
      <div class="ai-widget-header" id="ai-widget-header">
        <div class="ai-widget-title">
          <span>🤖</span>
          <span class="ai-widget-title-text">Trợ Lý AI</span>
        </div>
        <div class="ai-widget-controls">
          <button class="ai-widget-btn" id="ai-widget-minimize" title="Thu gọn">−</button>
        </div>
      </div>
      <div class="ai-widget-user-info" id="ai-widget-user-info">
        <span class="ai-widget-user-icon">👤</span>
        <span class="ai-widget-user-name" id="ai-widget-user-name">${displayName}</span>
      </div>
      <div class="ai-widget-body">
        <div class="ai-widget-status info" id="ai-widget-status">Sẵn sàng giải đề</div>
        <div class="ai-widget-stats" id="ai-widget-stats" style="display:none;">
          <div class="ai-widget-stat">
            <div class="ai-widget-stat-value" id="ai-widget-total">0</div>
            <div class="ai-widget-stat-label">Câu hỏi</div>
          </div>
          <div class="ai-widget-stat">
            <div class="ai-widget-stat-value" id="ai-widget-solved">0</div>
            <div class="ai-widget-stat-label">Đã giải</div>
          </div>
        </div>
        <div class="ai-widget-results" id="ai-widget-results"></div>
        <div class="ai-widget-actions">
          <button class="ai-widget-action-btn primary" id="ai-widget-solve">🚀 Giải bằng AI</button>
          <button class="ai-widget-action-btn danger" id="ai-widget-stop" style="display:none;">⛔ Dừng lại</button>
          <button class="ai-widget-action-btn secondary" id="ai-widget-clear">🗑️ Xóa kết quả</button>
          <button class="ai-widget-action-btn save-quiz" id="ai-widget-save-quiz" style="display:none;">💾 Lưu bài kiểm tra</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(widget);
  widgetState.isMinimized = false;
  bindWidgetEvents();
  console.log('[AI Widget] Widget created, user:', displayName);
}

function bindWidgetEvents() {
  const collapsedView = document.getElementById('ai-widget-collapsed');
  const header = document.getElementById('ai-widget-header');
  const minimizeBtn = document.getElementById('ai-widget-minimize');
  // const closeBtn = document.getElementById('ai-widget-close');
  const solveBtn = document.getElementById('ai-widget-solve');
  const stopBtn = document.getElementById('ai-widget-stop');
  const clearBtn = document.getElementById('ai-widget-clear');
  const saveQuizBtn = document.getElementById('ai-widget-save-quiz');

  collapsedView.addEventListener('click', expandWidget);
  minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    collapseWidget();
  });
  // closeBtn.addEventListener('click', (e) => {
  //   e.stopPropagation();
  //   widget.style.display = 'none';
  // });

  header.addEventListener('mousedown', startDragging);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDragging);

  solveBtn.addEventListener('click', handleWidgetSolve);
  stopBtn.addEventListener('click', handleWidgetStop);
  clearBtn.addEventListener('click', handleWidgetClear);
  saveQuizBtn.addEventListener('click', saveQuizResults);

  // Hiển thị nút lưu nếu đang ở trang kết quả bài kiểm tra
  if (isQuizResultPage()) {
    saveQuizBtn.style.display = 'block';
    solveBtn.style.display = 'none';
    updateWidgetStatus('📋 Trang kết quả - Nhấn "Lưu bài kiểm tra"', 'info');
  }
}

function expandWidget() {
  widgetState.isMinimized = false;
  widget.classList.remove('collapsed');
  document.getElementById('ai-widget-collapsed').style.display = 'none';
  document.querySelector('.ai-widget-expanded-view').style.display = 'block';
}

function collapseWidget() {
  widgetState.isMinimized = true;
  widget.classList.add('collapsed');
  document.getElementById('ai-widget-collapsed').style.display = 'flex';
  document.querySelector('.ai-widget-expanded-view').style.display = 'none';
}

function startDragging(e) {
  if (e.target.closest('.ai-widget-btn')) return;
  widgetState.isDragging = true;
  widgetState.initialX = e.clientX - widgetState.currentX;
  widgetState.initialY = e.clientY - widgetState.currentY;
  widget.classList.add('dragging');
}

function drag(e) {
  if (!widgetState.isDragging) return;
  e.preventDefault();
  widgetState.currentX = e.clientX - widgetState.initialX;
  widgetState.currentY = e.clientY - widgetState.initialY;
  widget.style.transform = `translate(${widgetState.currentX}px, ${widgetState.currentY}px)`;
}

function stopDragging() {
  widgetState.isDragging = false;
  widget.classList.remove('dragging');
}

async function handleWidgetSolve() {
  const solveBtn = document.getElementById('ai-widget-solve');
  const stopBtn = document.getElementById('ai-widget-stop');
  const clearBtn = document.getElementById('ai-widget-clear');

  try {
    widgetState.isSolving = true;
    solveBtn.disabled = true;
    solveBtn.innerHTML = '<div class="ai-widget-spinner"></div> Đang xử lý...';
    stopBtn.style.display = 'block';
    clearBtn.disabled = true;

    updateWidgetStatus('📖 Đang đọc câu hỏi từ trang...', 'info');
    document.getElementById('ai-widget-results').innerHTML = '';
    widgetState.results = [];

    const questions = extractQuestionsFromPage();

    document.getElementById('ai-widget-total').textContent = questions.length;
    document.getElementById('ai-widget-stats').style.display = 'flex';

    const skippedCount = questions.filter(q => q.hasAnswer).length;
    const toSolve = questions.length - skippedCount;

    if (skippedCount > 0) {
      updateWidgetStatus(`✓ Tìm thấy ${questions.length} câu (${skippedCount} đã có đáp án). Đang giải ${toSolve} câu...`, 'info');
    } else {
      updateWidgetStatus(`✓ Tìm thấy ${questions.length} câu. Đang gửi cho AI...`, 'info');
    }

    for (let i = 0; i < questions.length; i++) {
      if (!widgetState.isSolving) {
        updateWidgetStatus(`⛔ Đã dừng! Đã giải ${widgetState.results.length}/${questions.length} câu.`, 'warning');
        break;
      }

      const question = questions[i];

      if (question.hasAnswer) {
        displayWidgetSkipped(question);
        continue;
      }

      updateWidgetStatus(`🤖 Đang giải câu ${i + 1}/${questions.length}...`, 'info');

      try {
        const result = await solveQuestionWithAIWidget(question);

        if (!widgetState.isSolving) {
          updateWidgetStatus(`⛔ Đã dừng! Đã giải ${widgetState.results.length}/${questions.length} câu.`, 'warning');
          break;
        }

        widgetState.results.push({
          questionIndex: i,
          questionNumber: question.questionNumber,
          answer: result.answer,
          explanation: result.explanation || '',
          questionText: question.question,
          options: question.answers.map(a => a.text),
          fromCache: result.fromCache || false
        });
        persistAIResults();
        highlightCorrectAnswer(i, result.answer, true);
        displayWidgetResult(question, result);
        document.getElementById('ai-widget-solved').textContent = widgetState.results.length;

      } catch (error) {
        if (error.message === 'Request đã bị hủy') {
          updateWidgetStatus(`⛔ Đã dừng! Đã giải ${widgetState.results.length}/${questions.length} câu.`, 'warning');
          break;
        }
        displayWidgetError(question, error.message);
      }
    }

    if (widgetState.isSolving) {
      updateWidgetStatus(`✅ Hoàn thành! Đã giải ${widgetState.results.length}/${questions.length} câu.`, 'success');
    }

  } catch (error) {
    updateWidgetStatus(`❌ Lỗi: ${error.message}`, 'error');
  } finally {
    widgetState.isSolving = false;
    widgetState.currentAbortController = null;
    solveBtn.disabled = false;
    solveBtn.innerHTML = '🚀 Giải bằng AI';
    stopBtn.style.display = 'none';
    clearBtn.disabled = false;
  }
}

function handleWidgetStop() {
  widgetState.isSolving = false;
  if (widgetState.currentAbortController) {
    widgetState.currentAbortController.abort();
    widgetState.currentAbortController = null;
  }
  const stopBtn = document.getElementById('ai-widget-stop');
  if (stopBtn) stopBtn.disabled = true;
  updateWidgetStatus('⏳ Đang dừng lại...', 'warning');
}

function handleWidgetClear() {
  clearAllHighlights();
  document.getElementById('ai-widget-results').innerHTML = '';
  widgetState.results = [];
  document.getElementById('ai-widget-stats').style.display = 'none';
  document.getElementById('ai-widget-solved').textContent = '0';
  updateWidgetStatus('✓ Đã xóa tất cả kết quả', 'success');
  setTimeout(() => updateWidgetStatus('Sẵn sàng giải đề', 'info'), 2000);
}

function solveQuestionWithAIWidget(question) {
  widgetState.currentAbortController = new AbortController();
  const signal = widgetState.currentAbortController.signal;

  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Request đã bị hủy')); return; }

    const abortHandler = () => reject(new Error('Request đã bị hủy'));
    signal.addEventListener('abort', abortHandler);

    chrome.runtime.sendMessage({ action: 'solveWithAI', data: question }, (response) => {
      signal.removeEventListener('abort', abortHandler);
      if (signal.aborted) { reject(new Error('Request đã bị hủy')); return; }
      if (response && response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

function updateWidgetStatus(message, type) {
  const el = document.getElementById('ai-widget-status');
  if (el) { el.textContent = message; el.className = `ai-widget-status ${type}`; }
}

function displayWidgetResult(question, result) {
  const resultsEl = document.getElementById('ai-widget-results');
  const el = document.createElement('div');
  el.className = 'ai-widget-result-item';
  const explanationHtml = result.explanation
    ? `<div class="ai-widget-result-explanation">${result.explanation}</div>`
    : '';
  el.innerHTML = `
    <div class="ai-widget-result-number">Câu ${question.questionNumber}</div>
    <div class="ai-widget-result-answer">Đáp án: ${result.answer}</div>
    ${explanationHtml}
  `;
  resultsEl.appendChild(el);
  resultsEl.scrollTop = resultsEl.scrollHeight;
}

function displayWidgetSkipped(question) {
  const resultsEl = document.getElementById('ai-widget-results');
  const el = document.createElement('div');
  el.className = 'ai-widget-result-item skipped';
  el.innerHTML = `
    <div class="ai-widget-result-number">Câu ${question.questionNumber}</div>
    <div class="ai-widget-result-answer">⏭️ Đã bỏ qua: Câu này đã có đáp án</div>
  `;
  resultsEl.appendChild(el);
}

function displayWidgetError(question, errorMessage) {
  const resultsEl = document.getElementById('ai-widget-results');
  const el = document.createElement('div');
  el.className = 'ai-widget-result-item error';

  const numEl = document.createElement('div');
  numEl.className = 'ai-widget-result-number';
  numEl.textContent = `Câu ${question.questionNumber}`;

  const ansEl = document.createElement('div');
  ansEl.className = 'ai-widget-result-answer';
  ansEl.style.cssText = 'background:#ffebee;color:#d32f2f;';
  ansEl.textContent = `❌ Lỗi: ${errorMessage}`;

  el.appendChild(numEl);
  el.appendChild(ansEl);
  resultsEl.appendChild(el);
}

// Khởi tạo widget
console.log('[AI Widget] Content script loaded, readyState:', document.readyState);
function initWidget() {
  if (!document.body) {
    console.warn('[AI Widget] document.body not ready, retrying...');
    setTimeout(initWidget, 100);
    return;
  }
  createWidget();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
