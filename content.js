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
      highlightCorrectAnswer(request.questionIndex, request.answerLabel);
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

  // Tìm tất cả div chứa câu hỏi (class="que multichoice")
  const questionElements = document.querySelectorAll('.que.multichoice, .que');

  if (questionElements.length === 0) {
    throw new Error('Không tìm thấy câu hỏi trên trang. Đảm bảo bạn đang ở trang làm bài thi.');
  }

  questionElements.forEach((questionEl, index) => {
    try {
      const questionData = extractSingleQuestion(questionEl, index);
      if (questionData) {
        questions.push(questionData);
      }
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
  // Lấy số câu hỏi
  const qnoEl = questionEl.querySelector('.qno');
  const questionNumber = qnoEl ? qnoEl.textContent.trim() : (index + 1).toString();

  // Lấy nội dung câu hỏi
  const qtextEl = questionEl.querySelector('.qtext');
  if (!qtextEl) {
    return null;
  }

  // Loại bỏ các thẻ HTML và lấy text thuần
  const questionText = cleanText(qtextEl.innerText || qtextEl.textContent);

  // Lấy các đáp án
  const answers = [];
  const answerEls = questionEl.querySelectorAll('.answer .r0, .answer .r1');

  answerEls.forEach((answerEl) => {
    const radioInput = answerEl.querySelector('input[type="radio"]');
    const label = answerEl.querySelector('label');

    if (radioInput && label) {
      const answerText = cleanText(label.innerText || label.textContent);
      // Loại bỏ ký tự đầu (a., b., c., d.) nếu có
      const cleanedAnswer = answerText.replace(/^[a-z]\.\s*/i, '');

      answers.push({
        value: radioInput.value,
        text: cleanedAnswer,
        element: answerEl
      });
    }
  });

  if (answers.length === 0) {
    return null;
  }

  const request = {
    index: index,
    questionNumber: questionNumber,
    question: questionText,
    answers: answers,
    element: questionEl
  }

  console.log("request", request);

  return request;
};

// Làm sạch text (loại bỏ khoảng trắng thừa, ký tự đặc biệt)
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

// Highlight đáp án đúng
function highlightCorrectAnswer(questionIndex, answerLabel) {
  const questions = document.querySelectorAll('.que.multichoice, .que');

  if (questionIndex < 0 || questionIndex >= questions.length) {
    throw new Error('Không tìm thấy câu hỏi');
  }

  const questionEl = questions[questionIndex];

  // Xóa highlight cũ của câu hỏi này
  clearHighlightForQuestion(questionEl);

  // Tìm đáp án tương ứng với label (A, B, C, D...)
  const answerEls = questionEl.querySelectorAll('.answer .r0, .answer .r1');
  const answerIndex = answerLabel.charCodeAt(0) - 65; // A=0, B=1, C=2...

  if (answerIndex >= 0 && answerIndex < answerEls.length) {
    const targetAnswer = answerEls[answerIndex];

    // Thêm class highlight
    targetAnswer.classList.add('ai-highlight-correct');

    // Cuộn đến câu hỏi
    questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Thêm badge "AI Suggested"
    addAISuggestionBadge(targetAnswer);
  }
}

// Thêm badge "AI Suggested" vào đáp án
function addAISuggestionBadge(answerEl) {
  // Kiểm tra xem đã có badge chưa
  if (answerEl.querySelector('.ai-suggestion-badge')) {
    return;
  }

  const badge = document.createElement('span');
  badge.className = 'ai-suggestion-badge';
  badge.textContent = '✓ AI Suggested';
  answerEl.appendChild(badge);
}

// Xóa highlight của một câu hỏi
function clearHighlightForQuestion(questionEl) {
  const highlightedEls = questionEl.querySelectorAll('.ai-highlight-correct');
  highlightedEls.forEach(el => el.classList.remove('ai-highlight-correct'));

  const badges = questionEl.querySelectorAll('.ai-suggestion-badge');
  badges.forEach(badge => badge.remove());
}

// Xóa tất cả highlight
function clearAllHighlights() {
  const highlightedEls = document.querySelectorAll('.ai-highlight-correct');
  highlightedEls.forEach(el => el.classList.remove('ai-highlight-correct'));

  const badges = document.querySelectorAll('.ai-suggestion-badge');
  badges.forEach(badge => badge.remove());
}

// Thông báo extension đã sẵn sàng
console.log('Ehou AI Quiz Solver content script loaded!');
