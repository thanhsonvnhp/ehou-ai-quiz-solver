// Popup Script - Chỉ xử lý cấu hình API (logic giải đề đã chuyển sang widget trong content.js)

const statusDiv = document.getElementById('status');
const saveSettingsBtn = document.getElementById('saveSettings');
const apiKeyInput = document.getElementById('apiKey');
const apiEndpointInput = document.getElementById('apiEndpoint');
const modelSelect = document.getElementById('model');
const providerSelect = document.getElementById('provider');
const endpointGroup = document.getElementById('endpointGroup');

saveSettingsBtn.addEventListener('click', handleSaveSettings);
providerSelect.addEventListener('change', handleProviderChange);

init();

function init() {
  populateModels();
  loadSettings();
}

function populateModels() {
  const openaiModels = document.getElementById('openaiModels');
  const geminiModels = document.getElementById('geminiModels');
  const anthropicModels = document.getElementById('anthropicModels');
  const deepseekModels = document.getElementById('deepseekModels');

  openaiModels.innerHTML = '';
  geminiModels.innerHTML = '';
  anthropicModels.innerHTML = '';
  deepseekModels.innerHTML = '';

  CONFIG.OPENAI.MODELS.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    openaiModels.appendChild(option);
  });

  CONFIG.GEMINI.MODELS.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    geminiModels.appendChild(option);
  });

  CONFIG.ANTHROPIC.MODELS.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    anthropicModels.appendChild(option);
  });

  CONFIG.DEEPSEEK.MODELS.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    deepseekModels.appendChild(option);
  });
}

function loadSettings() {
  chrome.storage.sync.get(null, (items) => {
    const provider = items.provider || CONFIG.DEFAULT_PROVIDER;
    const defaults = CONFIG.getDefaultSettings(provider);

    providerSelect.value = provider;
    handleProviderChange(true, items.model || defaults.model);
    apiEndpointInput.value = items.apiEndpoint || defaults.apiEndpoint;

    const providerKey = items[`apiKey_${provider}`] || '';
    apiKeyInput.value = providerKey;
  });
}

function handleSaveSettings() {
  const provider = providerSelect.value;

  let defaultEndpoint = '';
  if (provider === 'openai') {
    defaultEndpoint = 'https://api.openai.com/v1/chat/completions';
  } else if (provider === 'gemini') {
    defaultEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
  } else if (provider === 'anthropic') {
    defaultEndpoint = apiEndpointInput.value.trim() || 'https://api.anthropic.com/v1/messages';
  } else if (provider === 'deepseek') {
    defaultEndpoint = apiEndpointInput.value.trim() || 'https://api.deepseek.com/chat/completions';
  }

  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showStatus('[ERR] Vui lòng nhập API Key!', 'error');
    return;
  }

  const settings = {
    [`apiKey_${provider}`]: apiKey,
    apiKey: apiKey,
    apiEndpoint: defaultEndpoint,
    model: modelSelect.value,
    provider: provider
  };

  saveSettingsBtn.disabled = true;
  saveSettingsBtn.innerHTML = `${renderStatusIcon('wait')} Đang lưu...`;

  chrome.storage.sync.set(settings, () => {
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.innerHTML = `${renderStatusIcon('save')} Lưu cấu hình`;

    if (chrome.runtime.lastError) {
      showStatus('[ERR] Lỗi khi lưu cấu hình. Vui lòng thử lại.', 'error');
      return;
    }

    showStatus('[OK] Đã lưu cấu hình thành công!', 'success');
  });
}

function handleProviderChange(skipKeyLoad, savedModel) {
  const provider = providerSelect.value;

  const providerModels = {
    openai: CONFIG.OPENAI.MODELS,
    gemini: CONFIG.GEMINI.MODELS,
    anthropic: CONFIG.ANTHROPIC.MODELS,
    deepseek: CONFIG.DEEPSEEK.MODELS
  };

  const models = providerModels[provider] || CONFIG.OPENAI.MODELS;
  modelSelect.innerHTML = '';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    modelSelect.appendChild(opt);
  });

  let defaultModel;
  if (provider === 'gemini') {
    defaultModel = CONFIG.GEMINI.DEFAULT_MODEL;
    endpointGroup.style.display = 'none';
    apiEndpointInput.value = '';
    apiKeyInput.placeholder = 'AIza...';
  } else if (provider === 'anthropic') {
    defaultModel = CONFIG.ANTHROPIC.DEFAULT_MODEL;
    endpointGroup.style.display = 'block';
    apiEndpointInput.value = CONFIG.ANTHROPIC.BASE_URL;
    apiKeyInput.placeholder = 'sk-ant-...';
  } else if (provider === 'deepseek') {
    defaultModel = CONFIG.DEEPSEEK.DEFAULT_MODEL;
    endpointGroup.style.display = 'block';
    apiEndpointInput.value = CONFIG.DEEPSEEK.DEFAULT_ENDPOINT;
    apiKeyInput.placeholder = 'sk-...';
  } else {
    defaultModel = CONFIG.OPENAI.DEFAULT_MODEL;
    endpointGroup.style.display = 'block';
    apiEndpointInput.value = CONFIG.OPENAI.DEFAULT_ENDPOINT;
    apiKeyInput.placeholder = 'sk-proj-...';
  }

  // Restore saved model if it exists in the list, otherwise fall back to default
  const targetModel = savedModel || defaultModel;
  const modelExists = models.some(m => m.value === targetModel);
  modelSelect.value = modelExists ? targetModel : defaultModel;

  if (skipKeyLoad !== true) {
    chrome.storage.sync.get([`apiKey_${provider}`], (items) => {
      const savedKey = items[`apiKey_${provider}`];
      apiKeyInput.value = savedKey || '';
      console.log(`[Provider Change] ${provider} -> key:`, savedKey ? 'found' : 'empty');
    });
  }
}

function renderStatusIcon(type) {
  const icons = {
    success: '<svg class="ext-status-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.2 11.4 2.8 8l1.1-1.1 2.3 2.3 5.9-5.9 1.1 1.1z"/></svg>',
    error: '<svg class="ext-status-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.3 3.2 8 6.9l3.7-3.7 1.1 1.1L9.1 8l3.7 3.7-1.1 1.1L8 9.1l-3.7 3.7-1.1-1.1L6.9 8 3.2 4.3z"/></svg>',
    warning: '<svg class="ext-status-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 1.5 13h13zM7.2 6h1.6v3.8H7.2zm0 5h1.6v1.5H7.2z"/></svg>',
    info: '<svg class="ext-status-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M7.2 6.5h1.6V13H7.2zM7.2 3h1.6v1.6H7.2z"/></svg>',
    save: '<svg class="ext-status-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 2.5h9.2L13.5 4v11h-11zM4 4v4h7V4zm1 10h6v-3H5z"/></svg>',
    wait: '<svg class="ext-status-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2m0 1.5a4.5 4.5 0 0 1 0 9V3.5z" opacity=".3"/><path d="M8 3.5V2a6 6 0 0 1 6 6h-1.5A4.5 4.5 0 0 0 8 3.5"/></svg>'
  };
  return icons[type] || icons.info;
}

function stripStatusPrefix(message) {
  return message.replace(/^\[(OK|ERR|WARN|INFO|TIP)\]\s*/, '');
}

function showStatus(message, type = 'info') {
  statusDiv.innerHTML = `${renderStatusIcon(type)}<span>${stripStatusPrefix(message)}</span>`;
  statusDiv.className = `status ${type}`;
}
