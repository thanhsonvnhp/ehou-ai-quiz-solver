// Background Service Worker - Xử lý logic gọi AI API
// KHÔNG import config.js để tránh lỗi - hardcode luôn các giá trị cần thiết

// Hardcode config values
const CONFIG = {
  DEFAULT_PROVIDER: 'gemini',//'openai',
  RATE_LIMIT: {
    MIN_REQUEST_INTERVAL: 5000,
    REQUEST_TIMEOUT: 30000
  },
  GEMINI: {
    API_VERSION_V1BETA: 'v1beta',
    BASE_URL: 'https://generativelanguage.googleapis.com',
    TEMPERATURE: 0.3,
    MAX_OUTPUT_TOKENS: 500
  },
  OPENAI: {
    DEFAULT_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
    DEFAULT_MODEL: 'gpt-4o-mini',
    TEMPERATURE: 0.3,
    MAX_TOKENS: 500
  },
  MESSAGES: {
    NO_API_KEY: 'Chưa cấu hình API Key. Vui lòng cấu hình trong popup.',
    TIMEOUT_ERROR: 'Timeout: AI không phản hồi trong 30 giây',
    INVALID_RESPONSE: 'AI không trả về kết quả hợp lệ',
    OPENAI_ERROR: 'OpenAI API Error',
    GEMINI_QUOTA_ERROR: `❌ Lỗi Quota Gemini API:\n\nBạn đã vượt quá giới hạn miễn phí của Gemini API https://aistudio.google.com/usage.\n\n💡 Giải pháp:\n1. Đợi một lúc rồi thử lại (quota reset hàng ngày)\n2. Kiểm tra quota tại: https://aistudio.google.com/usage\n3. Nâng cấp lên gói trả phí tại: https://aistudio.google.com/usage\n4. Hoặc chuyển sang dùng OpenAI (ChatGPT) trong cài đặt`,
    GEMINI_AUTH_ERROR: `❌ Lỗi xác thực API:\n\nAPI Key không hợp lệ hoặc không có quyền truy cập.\n\n💡 Giải pháp:\n1. Kiểm tra lại API Key trong cài đặt\n2. Tạo API Key mới tại: https://aistudio.google.com/app/apikey\n3. Đảm bảo API Key bắt đầu bằng "AIza..."`
  }
};

// Helper function
CONFIG.getGeminiEndpoint = function (model) {
  const apiVersion = this.GEMINI.API_VERSION_V1BETA;
  return `${this.GEMINI.BASE_URL}/${apiVersion}/models/${model}:generateContent`;
};

CONFIG.getDefaultSettings = function (provider) {
  if (provider === 'gemini') {
    return {
      model: 'gemini-2.5-flash', // Stable model with good free tier
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models', // Gemini endpoint is built dynamically from model
      provider: 'gemini'
    };
  } else {
    return {
      model: this.OPENAI.DEFAULT_MODEL,
      apiEndpoint: this.OPENAI.DEFAULT_ENDPOINT,
      provider: 'openai'
    };
  }
};

// Lắng nghe tin nhắn từ popup hoặc content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'solveWithAI') {
    handleSolveWithAI(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Giữ message channel mở cho async response
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'model', 'provider'], (items) => {
      const provider = items.provider || CONFIG.DEFAULT_PROVIDER;
      const defaults = CONFIG.getDefaultSettings(provider);
      sendResponse({
        apiKey: items.apiKey || '',
        apiEndpoint: items.apiEndpoint || defaults.apiEndpoint, // Empty for Gemini, will be built dynamically
        model: items.model || defaults.model,
        provider: provider
      });
    });
    return true;
  }

  if (request.action === 'saveSettings') {
    console.log('📝 Background: Saving settings...', request.settings);
    chrome.storage.sync.set(request.settings, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Background: Error saving settings:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Background: Settings saved successfully');
        sendResponse({ success: true });
      }
    });
    return true; // QUAN TRỌNG: Giữ message channel mở cho async callback
  }
});

// Hàm chính xử lý giải câu hỏi bằng AI
async function handleSolveWithAI(questionData) {
  // Lấy cấu hình API từ storage
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'model', 'provider'], (items) => {
      const provider = items.provider || CONFIG.DEFAULT_PROVIDER;
      const defaults = CONFIG.getDefaultSettings(provider);
      resolve({
        apiKey: items.apiKey || '',
        apiEndpoint: items.apiEndpoint || defaults.apiEndpoint, // Empty for Gemini, will be built dynamically
        model: items.model || defaults.model,
        provider: provider
      });
    });
  });

  if (!settings.apiKey) {
    throw new Error(CONFIG.MESSAGES.NO_API_KEY);
  }

  // Tạo prompt cho AI
  const prompt = createPrompt(questionData);

  // Gọi AI API
  const result = await callAIAPI(settings, prompt);

  return result;
}

// Tạo prompt gửi cho AI
function createPrompt(questionData) {
  let prompt = `Dưới đây là một câu hỏi trắc nghiệm tiếng Việt. 
Hãy chọn đáp án đúng nhất và giải thích ngắn gọn.

Câu hỏi: ${questionData.question}

Các đáp án:
`;

  questionData.answers.forEach((answer, index) => {
    const label = String.fromCharCode(97 + index).toUpperCase(); // A, B, C, D...
    prompt += `${label}. ${answer.text}\n`;
  });

  prompt += `\nYêu cầu: Trả kết quả CHÍNH XÁC dưới dạng JSON với cấu trúc:
{
  "answer": "A",
  "explanation": "Giải thích ngắn gọn tại sao đáp án này đúng"
}

CHỈ TRẢ VỀ JSON, KHÔNG THÊM BẤT KỲ TEXT NÀO KHÁC.`;

  return prompt;
}

// Request Queue để đảm bảo chỉ gửi 1 request tại một thời điểm
let requestQueue = Promise.resolve();
let lastRequestTime = 0;

// Gọi AI API (OpenAI hoặc Gemini) với queue
async function callAIAPI(settings, prompt) {
  // Thêm request vào queue để xử lý tuần tự
  return new Promise((resolve, reject) => {
    requestQueue = requestQueue.then(async () => {
      try {
        // Tính thời gian cần đợi để đảm bảo khoảng cách tối thiểu giữa các request
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        const waitTime = Math.max(0, CONFIG.RATE_LIMIT.MIN_REQUEST_INTERVAL - timeSinceLastRequest);

        if (waitTime > 0) {
          console.log(`Đợi ${waitTime}ms để tránh rate limit...`);
          await sleep(waitTime);
        }

        // Cập nhật thời gian request cuối
        lastRequestTime = Date.now();

        // Thực hiện request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.RATE_LIMIT.REQUEST_TIMEOUT);

        try {
          let result;
          // Chọn API dựa trên provider
          if (settings.provider === 'gemini') {
            result = await callGeminiAPI(settings, prompt, controller);
          } else {
            result = await callOpenAIAPI(settings, prompt, controller);
          }
          clearTimeout(timeoutId);
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            reject(new Error(CONFIG.MESSAGES.TIMEOUT_ERROR));
          } else {
            reject(error);
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Helper function sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Gọi OpenAI API
async function callOpenAIAPI(settings, prompt, controller) {
  console.log("callOpenAIAPI", settings, prompt);
  const response = await fetch(settings.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {
          role: 'system',
          content: 'Bạn là một trợ lý AI chuyên giải đáp câu hỏi trắc nghiệm. Luôn trả lời chính xác dưới dạng JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: CONFIG.OPENAI.TEMPERATURE,
      max_tokens: CONFIG.OPENAI.MAX_TOKENS
    }),
    signal: controller.signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `${CONFIG.MESSAGES.OPENAI_ERROR}: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(CONFIG.MESSAGES.INVALID_RESPONSE);
  }

  return parseAIResponse(content);
}

// Gọi Gemini API
async function callGeminiAPI(settings, prompt, controller) {
  console.log("callGeminiAPI", settings, prompt);
  // Gemini API endpoint - SỬ DỤNG v1beta theo official docs
  const endpoint = CONFIG.getGeminiEndpoint(settings.model);
  console.log('Gemini API endpoint:', endpoint, settings.apiKey);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': settings.apiKey
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Bạn là một trợ lý AI chuyên giải đáp câu hỏi trắc nghiệm. Luôn trả lời chính xác dưới dạng JSON.\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: CONFIG.GEMINI.TEMPERATURE,
        maxOutputTokens: CONFIG.GEMINI.MAX_OUTPUT_TOKENS
      }
    }),
    signal: controller.signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || '';

    // Xử lý lỗi quota cụ thể
    if (response.status === 429 || errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
      throw new Error(`${CONFIG.MESSAGES.GEMINI_QUOTA_ERROR}\n\nChi tiết: ${errorMessage}`);
    }

    // Xử lý lỗi API key không hợp lệ
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error(`${CONFIG.MESSAGES.GEMINI_AUTH_ERROR}\n\nChi tiết: ${errorMessage}`);
    }

    throw new Error(errorMessage || `Gemini API Error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error(CONFIG.MESSAGES.INVALID_RESPONSE);
  }

  return parseAIResponse(content);
}

// Parse response từ AI
function parseAIResponse(content) {
  try {
    // Loại bỏ markdown code block nếu có
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.answer || !parsed.explanation) {
      throw new Error('JSON thiếu trường bắt buộc');
    }

    // Chuẩn hóa answer thành chữ hoa
    parsed.answer = parsed.answer.toUpperCase().trim();

    return parsed;
  } catch (error) {
    throw new Error(`Không thể parse kết quả từ AI: ${error.message}`);
  }
}

// Log khi extension được cài đặt
chrome.runtime.onInstalled.addListener(() => {
  console.log('Ehou AI Quiz Solver installed successfully!');
});
