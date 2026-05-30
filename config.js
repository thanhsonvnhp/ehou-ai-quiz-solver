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
    API_VERSION_V1: 'v1',
    API_VERSION_V1BETA: 'v1beta',
    BASE_URL: 'https://generativelanguage.googleapis.com',
    DEFAULT_MODEL: 'gemini-3.5-flash',
    MODELS: [
      { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Khuyên dùng - Mới nhất, Free)' },
      { value: 'gemini-3.1-flash', label: 'Gemini 3.1 Flash (Ổn định)' },
      { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Nhanh & Rẻ nhất)' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Cũ - deprecated 17/6/2026)' }
    ],
    API_KEY_PREFIX: 'AIza',
    TEMPERATURE: 0.3,
    MAX_OUTPUT_TOKENS: 5000
  },

  // Anthropic Claude Configuration
  ANTHROPIC: {
    BASE_URL: 'https://api.anthropic.com/v1/messages',
    DEFAULT_MODEL: 'claude-haiku-4-5-20251001',
    MODELS: [
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Khuyên dùng - Nhanh & Rẻ)' },
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Cân bằng)' },
      { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Mạnh nhất)' }
    ],
    API_KEY_PREFIX: 'sk-ant-',
    TEMPERATURE: 0.3,
    MAX_TOKENS: 5000,
    API_VERSION: '2023-06-01'
  },

  // DeepSeek Configuration
  DEEPSEEK: {
    DEFAULT_ENDPOINT: 'https://api.deepseek.com/chat/completions',
    DEFAULT_MODEL: 'deepseek-v4-flash',
    MODELS: [
      { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash (Khuyên dùng - Nhanh & Rẻ)' },
      { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro (Mạnh nhất)' },
      { value: 'deepseek-chat', label: 'DeepSeek Chat (Deprecated 24/7/2026)' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (Deprecated 24/7/2026)' }
    ],
    API_KEY_PREFIX: 'sk-',
    TEMPERATURE: 0.3,
    MAX_TOKENS: 5000
  },

  // Provider Settings
  PROVIDERS: {
    OPENAI: 'openai',
    GEMINI: 'gemini',
    ANTHROPIC: 'anthropic',
    DEEPSEEK: 'deepseek'
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

    GEMINI_AUTH_ERROR: `❌ Lỗi xác thực API:\n\nAPI Key không hợp lệ hoặc không có quyền truy cập.\n\n💡 Giải pháp:\n1. Kiểm tra lại API Key trong cài đặt\n2. Tạo API Key mới tại: https://aistudio.google.com/app/apikey\n3. Đảm bảo API Key bắt đầu bằng "AIza..."`,

    // Anthropic errors
    ANTHROPIC_ERROR: 'Anthropic API Error',
    ANTHROPIC_AUTH_ERROR: `❌ Lỗi xác thực API:\n\nAPI Key không hợp lệ hoặc không có quyền truy cập.\n\n💡 Giải pháp:\n1. Kiểm tra lại API Key trong cài đặt\n2. Tạo API Key mới tại: https://console.anthropic.com/\n3. Đảm bảo API Key bắt đầu bằng "sk-ant-..."`,

    // DeepSeek errors
    DEEPSEEK_ERROR: 'DeepSeek API Error',
    DEEPSEEK_AUTH_ERROR: `❌ Lỗi xác thực DeepSeek API:\n\nAPI Key không hợp lệ hoặc không có quyền truy cập.\n\n💡 Giải pháp:\n1. Kiểm tra lại API Key trong cài đặt\n2. Tạo API Key mới tại: https://platform.deepseek.com/api_keys\n3. Đảm bảo API Key bắt đầu bằng "sk-..."`
  },

  // Backend API Configuration
  BACKEND_API: {
    BASE_URL: 'https://localhost:61930',
    ENDPOINTS: {
      RESOLVE: '/api/questions/resolve',
      SAVE: '/api/questions/save',
      DISABLE: '/api/questions/disable'
    }
  },

  // API Links
  LINKS: {
    OPENAI_API_KEY: 'https://platform.openai.com/api-keys',
    GEMINI_API_KEY: 'https://aistudio.google.com/app/apikey',
    GEMINI_QUOTA: 'https://ai.dev/rate-limit',
    ANTHROPIC_API_KEY: 'https://console.anthropic.com/',
    ANTHROPIC_DOCS: 'https://docs.anthropic.com/',
    DEEPSEEK_API_KEY: 'https://platform.deepseek.com/api_keys',
    DEEPSEEK_DOCS: 'https://platform.deepseek.com/docs'
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
  } else if (provider === this.PROVIDERS.ANTHROPIC) {
    return {
      model: this.ANTHROPIC.DEFAULT_MODEL,
      apiEndpoint: this.ANTHROPIC.BASE_URL,
      provider: this.PROVIDERS.ANTHROPIC
    };
  } else if (provider === this.PROVIDERS.DEEPSEEK) {
    return {
      model: this.DEEPSEEK.DEFAULT_MODEL,
      apiEndpoint: this.DEEPSEEK.DEFAULT_ENDPOINT,
      provider: this.PROVIDERS.DEEPSEEK
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
