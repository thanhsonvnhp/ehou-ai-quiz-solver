// Config.js - Tập trung tất cả cấu hình mặc định của extension

const CONFIG = {
  // OpenAI Configuration
  OPENAI: {
    DEFAULT_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
    DEFAULT_MODEL: 'gpt-4o-mini',
    MODELS: [
      { value: 'gpt-4o-mini', label: 'GPT-4O Mini (Khuyên dùng)' },
      { value: 'gpt-4o', label: 'GPT-4O' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    API_KEY_PREFIX: 'sk-',
    TEMPERATURE: 0.3,
    MAX_TOKENS: 50000
  },

  // Google Gemini Configuration
  GEMINI: {
    API_VERSION_V1: 'v1', // Cho gemini-2.5-flash, gemini-1.5-pro
    API_VERSION_V1BETA: 'v1beta', // Cho gemini-flash-latest
    BASE_URL: 'https://generativelanguage.googleapis.com',
    DEFAULT_MODEL: 'gemini-3-flash-preview', // Latest model with best free tier
    MODELS: [
      { value: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash Preview (Khuyên dùng - Free nhiều)' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Ổn định)' },
      { value: 'gemini-flash-latest', label: 'Gemini Flash Latest (Thử nghiệm)' },
      { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro Preview (Mạnh nhất)' }
    ],
    API_KEY_PREFIX: 'AIza',
    TEMPERATURE: 0.3,
    MAX_OUTPUT_TOKENS: 5000
  },

  // Provider Settings
  PROVIDERS: {
    OPENAI: 'openai',
    GEMINI: 'gemini'
  },
  DEFAULT_PROVIDER: 'gemini',

  // Rate Limiting
  RATE_LIMIT: {
    MIN_REQUEST_INTERVAL: 10000, // 5 giây giữa mỗi request
    REQUEST_TIMEOUT: 30000 // 30 giây timeout
  },

  // UI Messages
  MESSAGES: {
    NO_API_KEY: 'Chưa cấu hình API Key. Vui lòng cấu hình trong popup.',
    SAVE_SUCCESS: '✓ Đã lưu cấu hình thành công!',
    SAVE_ERROR: '❌ Lỗi khi lưu cấu hình. Vui lòng thử lại.',
    TIMEOUT_ERROR: 'Timeout: AI không phản hồi trong 30 giây',
    NO_QUESTIONS: 'Không tìm thấy câu hỏi nào trên trang này',
    INVALID_RESPONSE: 'AI không trả về kết quả hợp lệ',

    // OpenAI errors
    OPENAI_ERROR: 'OpenAI API Error',

    // Gemini errors
    GEMINI_QUOTA_ERROR: `❌ Lỗi Quota Gemini API:\n\nBạn đã vượt quá giới hạn miễn phí của Gemini API.\n\n💡 Giải pháp:\n1. Đợi một lúc rồi thử lại (quota reset hàng ngày)\n2. Kiểm tra quota tại: https://ai.dev/rate-limit\n3. Nâng cấp lên gói trả phí tại: https://aistudio.google.com/\n4. Hoặc chuyển sang dùng OpenAI (ChatGPT) trong cài đặt`,

    GEMINI_AUTH_ERROR: `❌ Lỗi xác thực API:\n\nAPI Key không hợp lệ hoặc không có quyền truy cập.\n\n💡 Giải pháp:\n1. Kiểm tra lại API Key trong cài đặt\n2. Tạo API Key mới tại: https://aistudio.google.com/app/apikey\n3. Đảm bảo API Key bắt đầu bằng "AIza..."`
  },

  // API Links
  LINKS: {
    OPENAI_API_KEY: 'https://platform.openai.com/api-keys',
    GEMINI_API_KEY: 'https://aistudio.google.com/app/apikey',
    GEMINI_QUOTA: 'https://ai.dev/rate-limit'
  }
};

// Helper function to get Gemini endpoint with correct API version
CONFIG.getGeminiEndpoint = function (model) {
  // Luôn sử dụng v1beta cho các model Gemini hiện tại
  const apiVersion = this.GEMINI.API_VERSION_V1BETA;
  return `${this.GEMINI.BASE_URL}/${apiVersion}/models/${model}:generateContent`;
};

// Helper function to get default settings by provider
CONFIG.getDefaultSettings = function (provider) {
  if (provider === this.PROVIDERS.GEMINI) {
    return {
      model: this.GEMINI.DEFAULT_MODEL,
      apiEndpoint: '', // Gemini doesn't need custom endpoint
      provider: this.PROVIDERS.GEMINI
    };
  } else {
    return {
      model: this.OPENAI.DEFAULT_MODEL,
      apiEndpoint: this.OPENAI.DEFAULT_ENDPOINT,
      provider: this.PROVIDERS.OPENAI
    };
  }
};

// Export cho background.js và popup.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
