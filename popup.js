// Popup Script - Logic xử lý giao diện popup

let questions = [];
let currentResults = [];
let isStopping = false; // Flag để dừng quá trình giải đề
let currentAbortController = null; // Controller để abort request đang chờ

// DOM Elements
const solveBtn = document.getElementById('solveBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const settingsSection = document.getElementById('settingsSection');
const mainSection = document.getElementById('mainSection');
const toggleSettingsLink = document.getElementById('toggleSettings');
const saveSettingsBtn = document.getElementById('saveSettings');
const apiKeyInput = document.getElementById('apiKey');
const apiEndpointInput = document.getElementById('apiEndpoint');
const modelSelect = document.getElementById('model');
const providerSelect = document.getElementById('provider');
const endpointGroup = document.getElementById('endpointGroup');
const statsDiv = document.getElementById('stats');
const totalQuestionsSpan = document.getElementById('totalQuestions');
const solvedQuestionsSpan = document.getElementById('solvedQuestions');

// Event Listeners
solveBtn.addEventListener('click', handleSolveQuestions);
stopBtn.addEventListener('click', handleStop);
clearBtn.addEventListener('click', handleClearResults);
toggleSettingsLink.addEventListener('click', toggleSettings);
saveSettingsBtn.addEventListener('click', handleSaveSettings);
providerSelect.addEventListener('change', handleProviderChange);

// Khởi tạo
init();

function init() {
  loadSettings();
  checkCurrentTab();
}

// Load cấu hình từ storage
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response) {
      const defaults = CONFIG.getDefaultSettings(response.provider || CONFIG.DEFAULT_PROVIDER);
      apiKeyInput.value = response.apiKey || '';
      apiEndpointInput.value = response.apiEndpoint || defaults.apiEndpoint;
      modelSelect.value = response.model || defaults.model;
      providerSelect.value = response.provider || CONFIG.DEFAULT_PROVIDER;
      handleProviderChange(); // Update UI based on provider
    }
  });
}


// Lưu cấu hình
function handleSaveSettings() {
  console.log('🔧 handleSaveSettings called');

  const provider = providerSelect.value;

  // Hardcode defaults thay vì dùng CONFIG để tránh lỗi
  let defaultEndpoint = '';
  if (provider === 'openai') {
    defaultEndpoint = 'https://api.openai.com/v1/chat/completions';
  }

  if (provider === 'gemini') {
    defaultEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  const settings = {
    apiKey: apiKeyInput.value.trim(),
    apiEndpoint: defaultEndpoint,// provider === 'gemini' ? '' : (apiEndpointInput.value.trim() || defaultEndpoint),
    model: modelSelect.value,
    provider: provider
  };

  console.log('📝 Settings to save:', settings);

  if (!settings.apiKey) {
    console.warn('⚠️ No API Key provided');
    showStatus('❌ Vui lòng nhập API Key!', 'error');
    return;
  }

  // Disable button khi đang lưu
  saveSettingsBtn.disabled = true;
  saveSettingsBtn.textContent = '⏳ Đang lưu...';
  console.log('⏳ Saving settings...');

  chrome.runtime.sendMessage({
    action: 'saveSettings',
    settings: settings
  }, (response) => {
    console.log('📨 Response received:', response);

    // Enable button lại
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.textContent = '💾 Lưu cấu hình';

    // Kiểm tra response
    if (chrome.runtime.lastError) {
      console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
      showStatus('❌ Lỗi khi lưu cấu hình. Vui lòng thử lại.', 'error');
      return;
    }

    if (response && response.success) {
      console.log('✅ Settings saved successfully');
      showStatus('✓ Đã lưu cấu hình thành công!', 'success');
      setTimeout(() => {
        toggleSettings();
      }, 1000);
    } else {
      console.error('❌ Save failed, response:', response);
      showStatus('❌ Lỗi khi lưu cấu hình. Vui lòng thử lại.', 'error');
    }
  });
}

// Toggle hiển thị settings
function toggleSettings() {
  settingsSection.classList.toggle('hidden');
  mainSection.classList.toggle('hidden');

  if (!settingsSection.classList.contains('hidden')) {
    toggleSettingsLink.textContent = '← Quay lại';
  } else {
    toggleSettingsLink.textContent = '⚙️ Cấu hình API';
  }
}

// Kiểm tra tab hiện tại có phải trang ehou không
function checkCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab.url.includes('learning.ehou.edu.vn')) {
      showStatus('⚠️ Extension chỉ hoạt động trên trang learning.ehou.edu.vn', 'warning');
      solveBtn.disabled = true;
    }
  });
}

// Xử lý giải câu hỏi
async function handleSolveQuestions() {
  try {
    // Reset stopping flag
    isStopping = false;

    // Disable solve button, enable stop button
    solveBtn.disabled = true;
    solveBtn.innerHTML = '<div class="spinner"></div><span>Đang xử lý...</span>';
    stopBtn.classList.remove('hidden');
    clearBtn.disabled = true;

    showStatus('📖 Đang đọc câu hỏi từ trang...', 'info');
    resultsDiv.innerHTML = '';
    currentResults = [];

    // Bước 1: Trích xuất câu hỏi từ trang
    const extractedQuestions = await extractQuestions();

    if (!extractedQuestions || extractedQuestions.length === 0) {
      throw new Error('Không tìm thấy câu hỏi trên trang');
    }

    questions = extractedQuestions;
    totalQuestionsSpan.textContent = questions.length;
    statsDiv.classList.remove('hidden');

    showStatus(`✓ Tìm thấy ${questions.length} câu hỏi. Đang gửi cho AI (1 câu/lần)...`, 'info');

    // Bước 2: Giải từng câu hỏi với AI (tuần tự, không song song)
    for (let i = 0; i < questions.length; i++) {
      // Kiểm tra nếu user đã click Stop
      if (isStopping) {
        showStatus(`⛔ Đã dừng! Đã giải ${currentResults.length}/${questions.length} câu hỏi.`, 'warning');
        break;
      }

      const question = questions[i];

      showStatus(`🤖 Đang giải câu ${i + 1}/${questions.length}... (Đợi 5s giữa mỗi câu)`, 'info');

      try {
        const result = await solveQuestionWithAI(question);

        // Kiểm tra lại sau khi AI trả về (vì có thể user bấm stop trong lúc chờ)
        if (isStopping) {
          showStatus(`⛔ Đã dừng! Đã giải ${currentResults.length}/${questions.length} câu hỏi.`, 'warning');
          break;
        }

        currentResults.push({
          questionIndex: i,
          questionNumber: question.questionNumber,
          answer: result.answer,
          explanation: result.explanation
        });

        // Highlight ngay khi có kết quả
        await highlightAnswer(i, result.answer);

        // Hiển thị kết quả
        displayResult(question, result);

        // Update stats
        solvedQuestionsSpan.textContent = currentResults.length;

        // Không cần delay ở đây vì background.js đã có queue system với delay 2s
      } catch (error) {
        // Nếu request bị abort, dừng ngay
        if (error.message === 'Request đã bị hủy') {
          showStatus(`⛔ Đã dừng! Đã giải ${currentResults.length}/${questions.length} câu hỏi.`, 'warning');
          break;
        }

        console.error(`Lỗi khi giải câu ${i + 1}:`, error);
        displayError(question, error.message);
      }
    }

    // Chỉ hiển thị hoàn thành nếu không bị dừng
    if (!isStopping) {
      showStatus(`✅ Hoàn thành! Đã giải ${currentResults.length}/${questions.length} câu hỏi.`, 'success');
    }

  } catch (error) {
    showStatus(`❌ Lỗi: ${error.message}`, 'error');
  } finally {
    // Cleanup
    currentAbortController = null;

    // Enable solve button, hide stop button
    solveBtn.disabled = false;
    solveBtn.innerHTML = '<span>🚀 Giải bằng AI</span>';
    stopBtn.classList.add('hidden');
    clearBtn.disabled = false;
    isStopping = false;
  }
}

// Xử lý dừng giải đề
function handleStop() {
  isStopping = true;
  stopBtn.disabled = true;

  // Abort request đang chờ nếu có
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  showStatus('⏳ Đang dừng lại...', 'warning');
}

// Trích xuất câu hỏi từ content script
function extractQuestions() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'extractQuestions' },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error('Không thể kết nối với trang. Vui lòng refresh trang và thử lại.'));
          } else if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  });
}

// Giải câu hỏi với AI
function solveQuestionWithAI(question) {
  // Tạo AbortController mới cho request này
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  return new Promise((resolve, reject) => {
    // Nếu đã bị abort trước khi gửi
    if (signal.aborted) {
      reject(new Error('Request đã bị hủy'));
      return;
    }

    // Lắng nghe abort event
    const abortHandler = () => {
      reject(new Error('Request đã bị hủy'));
    };
    signal.addEventListener('abort', abortHandler);

    chrome.runtime.sendMessage(
      {
        action: 'solveWithAI',
        data: question
      },
      (response) => {
        // Cleanup abort listener
        signal.removeEventListener('abort', abortHandler);

        // Kiểm tra nếu đã bị abort
        if (signal.aborted) {
          reject(new Error('Request đã bị hủy'));
          return;
        }

        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      }
    );
  });
}

// Highlight đáp án trên trang
function highlightAnswer(questionIndex, answerLabel) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'highlightAnswer',
          questionIndex: questionIndex,
          answerLabel: answerLabel
        },
        (response) => {
          if (response && response.success) {
            resolve();
          } else {
            reject(new Error('Không thể highlight đáp án'));
          }
        }
      );
    });
  });
}

// Hiển thị kết quả trong popup
function displayResult(question, result) {
  const resultEl = document.createElement('div');
  resultEl.className = 'question-result';

  resultEl.innerHTML = `
    <div class="question-number">Câu ${question.questionNumber}</div>
    <div class="answer">Đáp án: ${result.answer}</div>
    <div class="explanation">${result.explanation}</div>
  `;

  resultsDiv.appendChild(resultEl);

  // Scroll to bottom
  resultsDiv.scrollTop = resultsDiv.scrollHeight;
}

// Hiển thị lỗi cho một câu hỏi
function displayError(question, errorMessage) {
  const resultEl = document.createElement('div');
  resultEl.className = 'question-result';
  resultEl.style.borderLeftColor = '#d32f2f';

  resultEl.innerHTML = `
    <div class="question-number">Câu ${question.questionNumber}</div>
    <div style="color: #d32f2f; font-size: 12px;">
      ❌ Lỗi: ${errorMessage}
    </div>
  `;

  resultsDiv.appendChild(resultEl);
}

// Xóa tất cả kết quả
function handleClearResults() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'clearHighlights' },
      () => {
        resultsDiv.innerHTML = '';
        currentResults = [];
        statsDiv.classList.add('hidden');
        solvedQuestionsSpan.textContent = '0';
        showStatus('✓ Đã xóa tất cả kết quả', 'success');
        setTimeout(() => {
          statusDiv.className = 'status';
        }, 2000);
      }
    );
  });
}

// Hiển thị status
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

// Xử lý khi đổi provider
function handleProviderChange() {
  const provider = providerSelect.value;
  const openaiModels = document.getElementById('openaiModels');
  const geminiModels = document.getElementById('geminiModels');

  if (provider === 'gemini') {
    // Show Gemini models, hide OpenAI models
    openaiModels.style.display = 'none';
    geminiModels.style.display = 'block';
    modelSelect.value = CONFIG.GEMINI.DEFAULT_MODEL;

    // Hide endpoint for Gemini (not needed)
    endpointGroup.style.display = 'none';

    // Clear endpoint input for Gemini
    apiEndpointInput.value = '';

    // Update placeholder
    apiKeyInput.placeholder = 'AIza...';
  } else {
    // Show OpenAI models, hide Gemini models
    openaiModels.style.display = 'block';
    geminiModels.style.display = 'none';
    modelSelect.value = CONFIG.OPENAI.DEFAULT_MODEL;

    // Show endpoint for OpenAI
    endpointGroup.style.display = 'block';

    // Set default OpenAI endpoint if empty
    if (!apiEndpointInput.value) {
      apiEndpointInput.value = CONFIG.OPENAI.DEFAULT_ENDPOINT;
    }

    // Update placeholder
    apiKeyInput.placeholder = 'sk-proj-...';
  }
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
