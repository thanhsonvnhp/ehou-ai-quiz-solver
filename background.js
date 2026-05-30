// Background Service Worker - Xử lý logic gọi AI API
// KHÔNG import config.js để tránh lỗi - hardcode luôn các giá trị cần thiết

// Hardcode config values
const CONFIG = {
  DEFAULT_PROVIDER: 'gemini',
  RATE_LIMIT: {
    MIN_REQUEST_INTERVAL: 10000,
    REQUEST_TIMEOUT: 30000
  },
  BACKEND_API: {
    BASE_URL: 'https://localhost:61930',
    ENDPOINTS: {
      RESOLVE: '/api/questions/resolve',
      SAVE: '/api/questions/save',
      DISABLE: '/api/questions/disable'
    }
  },
  GEMINI: {
    API_VERSION_V1BETA: 'v1beta',
    BASE_URL: 'https://generativelanguage.googleapis.com',
    TEMPERATURE: 0.3,
    MAX_OUTPUT_TOKENS: 5000
  },
  OPENAI: {
    DEFAULT_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
    DEFAULT_MODEL: 'gpt-4o-mini',
    TEMPERATURE: 0.3,
    MAX_TOKENS: 5000
  },
  ANTHROPIC: {
    BASE_URL: 'https://api.anthropic.com/v1/messages',
    DEFAULT_MODEL: 'claude-haiku-4-5-20251001',
    TEMPERATURE: 0.3,
    MAX_TOKENS: 5000,
    API_VERSION: '2023-06-01'
  },
  DEEPSEEK: {
    DEFAULT_ENDPOINT: 'https://api.deepseek.com/chat/completions',
    DEFAULT_MODEL: 'deepseek-v4-flash',
    TEMPERATURE: 0.3,
    MAX_TOKENS: 5000
  },
  MESSAGES: {
    NO_API_KEY: 'Chưa cấu hình API Key. Vui lòng cấu hình trong popup.',
    TIMEOUT_ERROR: 'Timeout: AI không phản hồi trong 30 giây',
    INVALID_RESPONSE: 'AI không trả về kết quả hợp lệ',
    OPENAI_ERROR: 'OpenAI API Error',
    ANTHROPIC_ERROR: 'Anthropic API Error',
    DEEPSEEK_ERROR: 'DeepSeek API Error',
    GEMINI_QUOTA_ERROR: `❌ Lỗi Quota Gemini API:\n\nBạn đã vượt quá giới hạn miễn phí của Gemini API https://aistudio.google.com/usage.\n\n💡 Giải pháp:\n1. Đợi một lúc rồi thử lại (quota reset hàng ngày)\n2. Kiểm tra quota tại: https://aistudio.google.com/usage\n3. Nâng cấp lên gói trả phí tại: https://aistudio.google.com/usage\n4. Hoặc chuyển sang dùng OpenAI (ChatGPT) trong cài đặt`,
    GEMINI_AUTH_ERROR: `❌ Lỗi xác thực API:\n\nAPI Key không hợp lệ hoặc không có quyền truy cập.\n\n💡 Giải pháp:\n1. Kiểm tra lại API Key trong cài đặt\n2. Tạo API Key mới tại: https://aistudio.google.com/app/apikey\n3. Đảm bảo API Key bắt đầu bằng "AIza..."`,
    ANTHROPIC_AUTH_ERROR: `❌ Lỗi xác thực Anthropic API:\n\nAPI Key không hợp lệ hoặc không có quyền truy cập.\n\n💡 Giải pháp:\n1. Kiểm tra lại API Key trong cài đặt\n2. Tạo API Key mới tại: https://console.anthropic.com/\n3. Đảm bảo API Key bắt đầu bằng "sk-ant-..."`,
    DEEPSEEK_AUTH_ERROR: `❌ Lỗi xác thực DeepSeek API:\n\nAPI Key không hợp lệ hoặc không có quyền truy cập.\n\n💡 Giải pháp:\n1. Kiểm tra lại API Key trong cài đặt\n2. Tạo API Key mới tại: https://platform.deepseek.com/api_keys\n3. Đảm bảo API Key bắt đầu bằng "sk-..."`
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
      model: 'gemini-3.5-flash',
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      provider: 'gemini'
    };
  } else if (provider === 'anthropic') {
    return {
      model: this.ANTHROPIC.DEFAULT_MODEL,
      apiEndpoint: this.ANTHROPIC.BASE_URL,
      provider: 'anthropic'
    };
  } else if (provider === 'deepseek') {
    return {
      model: this.DEEPSEEK.DEFAULT_MODEL,
      apiEndpoint: this.DEEPSEEK.DEFAULT_ENDPOINT,
      provider: 'deepseek'
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
    chrome.storage.sync.get(null, (items) => {
      const provider = items.provider || CONFIG.DEFAULT_PROVIDER;
      const defaults = CONFIG.getDefaultSettings(provider);
      const apiKey = items[`apiKey_${provider}`] || '';
      sendResponse({
        apiKey: apiKey,
        apiEndpoint: items.apiEndpoint || defaults.apiEndpoint,
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

  if (request.action === 'saveQuizResults') {
    handleSaveQuizResults(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'disableQuestion') {
    handleDisableQuestion(request.questionHash)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Hàm chính xử lý giải câu hỏi bằng AI
async function handleSolveWithAI(questionData) {
  // Bước 1: Check cache từ backend API trước
  try {
    const cached = await resolveFromCache(questionData);
    if (cached && cached.found) {
      console.log('✅ Cache hit! Trả về đáp án từ database:', cached.correctAnswerText);
      return {
        answer: cached.correctAnswerText,
        explanation: cached.explanation || '',
        fromCache: true
      };
    }
  } catch (cacheError) {
    // Nếu backend không khả dụng thì bỏ qua, tiếp tục dùng AI
    console.warn('⚠️ Không thể kết nối backend cache, dùng AI:', cacheError.message);
  }

  // Bước 2: Lấy cấu hình API từ storage
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(null, (items) => {
      const provider = items.provider || CONFIG.DEFAULT_PROVIDER;
      const defaults = CONFIG.getDefaultSettings(provider);
      const apiKey = items[`apiKey_${provider}`] || '';
      resolve({
        apiKey: apiKey,
        apiEndpoint: items.apiEndpoint || defaults.apiEndpoint,
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

// Gọi backend API để resolve câu hỏi từ cache
async function resolveFromCache(questionData) {
  const url = `${CONFIG.BACKEND_API.BASE_URL}${CONFIG.BACKEND_API.ENDPOINTS.RESOLVE}`;
  const body = {
    questionText: questionData.question,
    options: questionData.answers.map(a => a.text),
    sourceUrl: questionData.sourceUrl || '',
    courseCode: questionData.courseCode || ''
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.status}`);
  }

  const data = await response.json();
  return data.success ? data.data : null;
}

// Lưu kết quả bài kiểm tra vào backend
async function handleSaveQuizResults(quizData) {
  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(null, (items) => {
      const provider = items.provider || CONFIG.DEFAULT_PROVIDER;
      const model = items.model || CONFIG.getDefaultSettings(provider).model;
      resolve({ provider, model });
    });
  });

  const url = `${CONFIG.BACKEND_API.BASE_URL}${CONFIG.BACKEND_API.ENDPOINTS.SAVE}`;
  const results = [];

  for (const item of quizData.questions) {
    try {
      const body = {
        questionText: item.questionText,
        options: item.options,
        correctAnswerText: item.correctAnswerText,
        explanation: item.explanation || '',
        aiProvider: settings.provider,
        aiModel: settings.model,
        deviceId: quizData.deviceId || '',
        sourceUrl: quizData.sourceUrl || '',
        courseCode: quizData.courseCode || ''
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      results.push({ success: response.ok && data.success, questionText: item.questionText });
    } catch (err) {
      results.push({ success: false, questionText: item.questionText, error: err.message });
    }
  }

  const savedCount = results.filter(r => r.success).length;
  return { savedCount, total: quizData.questions.length, results };
}

// Vô hiệu hóa câu hỏi sai trong cache
async function handleDisableQuestion(questionHash) {
  const url = `${CONFIG.BACKEND_API.BASE_URL}${CONFIG.BACKEND_API.ENDPOINTS.DISABLE}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionHash })
  });

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
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

  prompt += `\nYêu cầu quan trọng:
1. Trả về kết quả dưới dạng JSON thuần (raw JSON).
2. KHÔNG dùng markdown block (\`\`\`json).
3. Cấu trúc JSON bắt buộc:
{
  "answer": "Đáp án đúng (chỉ một chữ cái A, B, C, D...)",
  "explanation": "Giải thích ngắn gọn tại sao đúng"
}`;

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
          } else if (settings.provider === 'anthropic') {
            result = await callAnthropicAPI(settings, prompt, controller);
          } else if (settings.provider === 'deepseek') {
            result = await callDeepSeekAPI(settings, prompt, controller);
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
          content: 'Bạn là một trợ lý AI chuyên giải đáp câu hỏi trắc nghiệm. Nhiệm vụ của bạn là trả về kết quả dưới dạng JSON hợp lệ.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" }, // Bắt buộc trả về JSON
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
  console.log('📦 Full OpenAI API response:', JSON.stringify(data, null, 2));

  // Kiểm tra xem response có chứa error không
  if (data.error) {
    console.error('❌ Error in OpenAI response:', data.error);
    throw new Error(data.error.message || 'OpenAI API returned error in response');
  }

  const content = data.choices?.[0]?.message?.content;

  console.log('📝 Extracted content:', content);
  console.log('📏 Content length:', content?.length || 0);

  const finishReason = data.choices?.[0]?.finish_reason;
  console.log('🏁 Finish reason:', finishReason);

  // Validate content trước khi parse
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.error('❌ No valid content in response:', data);
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
          text: `Bạn là một trợ lý AI chuyên giải đáp câu hỏi trắc nghiệm. Hãy trả lời dưới dạng JSON.\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: CONFIG.GEMINI.TEMPERATURE,
        maxOutputTokens: CONFIG.GEMINI.MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json" // Bắt buộc trả về JSON (chỉ hoạt động với Gemini 1.5 Flash/Pro)
      }
    }),
    signal: controller.signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || '';

    // Xử lý lỗi quota cụ thể
    if (response.status === 429 || errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
      await sleep(60_000); // chờ 1 phút trước khi tiếp tục
      throw new Error(`${CONFIG.MESSAGES.GEMINI_QUOTA_ERROR}\n\nChi tiết: ${errorMessage}`);
    }

    // Xử lý lỗi API key không hợp lệ
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error(`${CONFIG.MESSAGES.GEMINI_AUTH_ERROR}\n\nChi tiết: ${errorMessage}`);
    }

    // QUAN TRỌNG: Ném exception để dừng execution ngay lập tức
    const error = new Error(errorMessage || `Gemini API Error: ${response.status}`);
    console.error('❌ Gemini API Error:', error);
    throw error;
  }

  const data = await response.json();
  console.log('📦 Full Gemini API response:', JSON.stringify(data, null, 2));

  // Kiểm tra xem response có chứa error không (một số API trả về error trong response.ok = true)
  if (data.error) {
    console.error('❌ Error in Gemini response:', data.error);
    throw new Error(data.error.message || 'Gemini API returned error in response');
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  console.log('📝 Extracted content:', content);
  console.log('📏 Content length:', content?.length || 0);

  // Kiểm tra xem có bị cắt không (finishReason)
  const finishReason = data.candidates?.[0]?.finishReason;
  console.log('🏁 Finish reason:', finishReason);

  if (finishReason && finishReason !== 'STOP') {
    console.warn('⚠️ Response may be incomplete. Finish reason:', finishReason);
  }

  // Validate content trước khi parse
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.error('❌ No valid content in response:', data);
    throw new Error(CONFIG.MESSAGES.INVALID_RESPONSE);
  }

  return parseAIResponse(content);
}

// Gọi Anthropic Claude API
async function callAnthropicAPI(settings, prompt, controller) {
  console.log("callAnthropicAPI", settings, prompt);

  const response = await fetch(settings.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': CONFIG.ANTHROPIC.API_VERSION
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: CONFIG.ANTHROPIC.MAX_TOKENS,
      temperature: CONFIG.ANTHROPIC.TEMPERATURE,
      messages: [
        {
          role: 'user',
          content: `Bạn là một trợ lý AI chuyên giải đáp câu hỏi trắc nghiệm. Hãy trả lời dưới dạng JSON.\n\n${prompt}`
        }
      ]
    }),
    signal: controller.signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || '';

    // Xử lý lỗi xác thực
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${CONFIG.MESSAGES.ANTHROPIC_AUTH_ERROR}\n\nChi tiết: ${errorMessage}`);
    }

    // Xử lý lỗi rate limit
    if (response.status === 429) {
      await sleep(60_000); // chờ 1 phút
      throw new Error(`❌ Rate limit exceeded. Vui lòng đợi một chút.\n\nChi tiết: ${errorMessage}`);
    }

    const error = new Error(errorMessage || `${CONFIG.MESSAGES.ANTHROPIC_ERROR}: ${response.status}`);
    console.error('❌ Anthropic API Error:', error);
    throw error;
  }

  const data = await response.json();
  console.log('📦 Full Anthropic API response:', JSON.stringify(data, null, 2));

  // Kiểm tra error trong response
  if (data.error) {
    console.error('❌ Error in Anthropic response:', data.error);
    throw new Error(data.error.message || 'Anthropic API returned error in response');
  }

  // Anthropic trả về content trong content array
  const content = data.content?.[0]?.text;

  console.log('📝 Extracted content:', content);
  console.log('📏 Content length:', content?.length || 0);

  const stopReason = data.stop_reason;
  console.log('🏁 Stop reason:', stopReason);

  if (stopReason && stopReason !== 'end_turn') {
    console.warn('⚠️ Response may be incomplete. Stop reason:', stopReason);
  }

  // Validate content
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.error('❌ No valid content in response:', data);
    throw new Error(CONFIG.MESSAGES.INVALID_RESPONSE);
  }

  return parseAIResponse(content);
}

// Gọi DeepSeek API
async function callDeepSeekAPI(settings, prompt, controller) {
  console.log("callDeepSeekAPI", settings, prompt);

  const requestBody = {
    model: settings.model,
    messages: [
      {
        role: 'system',
        content: 'Bạn là một trợ lý AI chuyên giải đáp câu hỏi trắc nghiệm. Nhiệm vụ của bạn là trả về kết quả dưới dạng JSON hợp lệ.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: CONFIG.DEEPSEEK.TEMPERATURE,
    max_tokens: CONFIG.DEEPSEEK.MAX_TOKENS,
    stream: false
  };

  if (settings.model === 'deepseek-v4-pro' || settings.model === 'deepseek-reasoner') {
    requestBody.reasoning_effort = 'high';
    requestBody.thinking = { type: 'enabled' };
  } else {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch(settings.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || '';

    if (response.status === 401 || response.status === 403) {
      throw new Error(`${CONFIG.MESSAGES.DEEPSEEK_AUTH_ERROR}\n\nChi tiết: ${errorMessage}`);
    }

    if (response.status === 429) {
      await sleep(60_000);
      throw new Error(`❌ Rate limit DeepSeek exceeded. Vui lòng đợi một chút.\n\nChi tiết: ${errorMessage}`);
    }

    const error = new Error(errorMessage || `${CONFIG.MESSAGES.DEEPSEEK_ERROR}: ${response.status}`);
    console.error('❌ DeepSeek API Error:', error);
    throw error;
  }

  const data = await response.json();
  console.log('📦 Full DeepSeek API response:', JSON.stringify(data, null, 2));

  if (data.error) {
    console.error('❌ Error in DeepSeek response:', data.error);
    throw new Error(data.error.message || 'DeepSeek API returned error in response');
  }

  const content = data.choices?.[0]?.message?.content;

  console.log('📝 Extracted content:', content);
  console.log('📏 Content length:', content?.length || 0);

  const finishReason = data.choices?.[0]?.finish_reason;
  console.log('🏁 Finish reason:', finishReason);

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.error('❌ No valid content in response:', data);
    throw new Error(CONFIG.MESSAGES.INVALID_RESPONSE);
  }

  return parseAIResponse(content);
}

// Parse response từ AI
function parseAIResponse(content) {
  try {
    console.log('🔍 Raw AI response:', content);

    let jsonStr = content.trim();

    // BƯỚC 1: Tìm vị trí bắt đầu và kết thúc của JSON object TRỰC TIẾP từ raw content
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonStart > jsonEnd) {
      console.error('❌ Không tìm thấy JSON object hợp lệ trong response');
      console.error('📄 Content:', content);
      throw new Error('Response không chứa JSON object hợp lệ');
    }

    // BƯỚC 2: Trích xuất chỉ phần JSON (bỏ qua markdown và text thừa)
    jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);

    console.log('🔧 Extracted JSON string:', jsonStr);

    // BƯỚC 3: Parse JSON
    const parsed = JSON.parse(jsonStr);

    console.log('✅ Parsed JSON:', parsed);

    // BƯỚC 4: Validate
    if (!parsed.answer || !parsed.explanation) {
      throw new Error('JSON thiếu trường bắt buộc (answer hoặc explanation)');
    }

    // BƯỚC 5: Chuẩn hóa answer thành chữ hoa
    parsed.answer = parsed.answer.toUpperCase().trim();

    return parsed;
  } catch (error) {
    console.error('❌ Parse error:', error);
    console.error('📄 Original content:', content);

    // Hiển thị error message rõ ràng hơn
    let errorMsg = `Không thể parse kết quả từ AI: ${error.message}`;
    if (content && content.length > 0) {
      errorMsg += `\n\nNội dung gốc (${content.length} ký tự):\n${content}}`;
    }

    throw new Error(errorMsg);
  }
}

// Log khi extension được cài đặt
chrome.runtime.onInstalled.addListener(() => {
  console.log('Ehou AI Quiz Solver installed successfully!');
});
