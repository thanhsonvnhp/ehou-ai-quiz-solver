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
  const answerIndex = answerLabel.charCodeAt(0) - 65;

  if (answerIndex >= 0 && answerIndex < answerEls.length) {
    const targetAnswer = answerEls[answerIndex];
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
  currentAbortController: null
};

function createWidget() {
  if (document.getElementById('ai-quiz-widget')) return;

  widget = document.createElement('div');
  widget.id = 'ai-quiz-widget';
  widget.className = 'collapsed';
  widget.innerHTML = `
    <div class="ai-widget-collapsed-view" id="ai-widget-collapsed">
      <div class="ai-widget-icon">🤖</div>
      <div class="ai-widget-greeting">Tôi là trợ lý AI<br>hãy để tôi giúp bạn</div>
    </div>
    <div class="ai-widget-expanded-view" style="display:none;">
      <div class="ai-widget-header" id="ai-widget-header">
        <div class="ai-widget-title">
          <span>🤖</span>
          <span class="ai-widget-title-text">Trợ Lý Học Tập HOU E-Learning AI</span>
        </div>
        <div class="ai-widget-controls">
          <button class="ai-widget-btn" id="ai-widget-close" title="Đóng">×</button>
        </div>
      </div>
      <div class="ai-widget-body">
        <div class="ai-widget-settings">
          <div class="ai-widget-settings-row">
            <span class="ai-widget-settings-label">Provider:</span>
            <span class="ai-widget-settings-value" id="ai-widget-provider">-</span>
          </div>
          <div class="ai-widget-settings-row">
            <span class="ai-widget-settings-label">Model:</span>
            <span class="ai-widget-settings-value" id="ai-widget-model">-</span>
          </div>
        </div>
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
        <div class="ai-widget-status info" id="ai-widget-status">Sẵn sàng giải đề</div>
        <div class="ai-widget-results" id="ai-widget-results"></div>
        <div class="ai-widget-actions">
          <button class="ai-widget-action-btn primary" id="ai-widget-solve">🚀 Giải bằng AI</button>
          <button class="ai-widget-action-btn danger" id="ai-widget-stop" style="display:none;">⛔ Dừng lại</button>
          <button class="ai-widget-action-btn secondary" id="ai-widget-clear">🗑️ Xóa kết quả</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(widget);
  widgetState.isMinimized = true;
  loadWidgetSettings();
  bindWidgetEvents();
  console.log('[AI Widget] Widget created');
}

function loadWidgetSettings() {
  chrome.storage.sync.get(['provider', 'model'], (items) => {
    const provider = items.provider || 'gemini';
    const model = items.model || 'gemini-3.5-flash';
    const providerEl = document.getElementById('ai-widget-provider');
    const modelEl = document.getElementById('ai-widget-model');
    if (providerEl) providerEl.textContent = provider.toUpperCase();
    if (modelEl) modelEl.textContent = model;
  });
}

function bindWidgetEvents() {
  const collapsedView = document.getElementById('ai-widget-collapsed');
  const header = document.getElementById('ai-widget-header');
  const closeBtn = document.getElementById('ai-widget-close');
  const solveBtn = document.getElementById('ai-widget-solve');
  const stopBtn = document.getElementById('ai-widget-stop');
  const clearBtn = document.getElementById('ai-widget-clear');

  collapsedView.addEventListener('click', expandWidget);
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    collapseWidget();
  });

  header.addEventListener('mousedown', startDragging);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDragging);

  solveBtn.addEventListener('click', handleWidgetSolve);
  stopBtn.addEventListener('click', handleWidgetStop);
  clearBtn.addEventListener('click', handleWidgetClear);
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

        widgetState.results.push({ questionIndex: i, questionNumber: question.questionNumber, answer: result.answer });
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
  el.innerHTML = `
    <div class="ai-widget-result-number">Câu ${question.questionNumber}</div>
    <div class="ai-widget-result-answer">Đáp án: ${result.answer}</div>
    <div class="ai-widget-result-explanation">${result.explanation}</div>
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
