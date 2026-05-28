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
    apiEndpointInput.value = items.apiEndpoint || defaults.apiEndpoint;
    modelSelect.value = items.model || defaults.model;

    // Load API key riêng theo provider (không fallback)
    const providerKey = items[`apiKey_${provider}`] || '';
    apiKeyInput.value = providerKey;

    handleProviderChange(true);
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
    showStatus('❌ Vui lòng nhập API Key!', 'error');
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
  saveSettingsBtn.textContent = '⏳ Đang lưu...';

  chrome.storage.sync.set(settings, () => {
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.textContent = '💾 Lưu cấu hình';

    if (chrome.runtime.lastError) {
      showStatus('❌ Lỗi khi lưu cấu hình. Vui lòng thử lại.', 'error');
      return;
    }

    showStatus('✓ Đã lưu cấu hình thành công!', 'success');
  });
}

function handleProviderChange(skipKeyLoad) {
  const provider = providerSelect.value;
  const openaiModels = document.getElementById('openaiModels');
  const geminiModels = document.getElementById('geminiModels');
  const anthropicModels = document.getElementById('anthropicModels');
  const deepseekModels = document.getElementById('deepseekModels');

  openaiModels.style.display = 'none';
  geminiModels.style.display = 'none';
  anthropicModels.style.display = 'none';
  deepseekModels.style.display = 'none';

  if (provider === 'gemini') {
    geminiModels.style.display = 'block';
    modelSelect.value = CONFIG.GEMINI.DEFAULT_MODEL;
    endpointGroup.style.display = 'none';
    apiEndpointInput.value = '';
    apiKeyInput.placeholder = 'AIza...';
  } else if (provider === 'anthropic') {
    anthropicModels.style.display = 'block';
    modelSelect.value = CONFIG.ANTHROPIC.DEFAULT_MODEL;
    endpointGroup.style.display = 'block';
    apiEndpointInput.value = CONFIG.ANTHROPIC.BASE_URL;
    apiKeyInput.placeholder = 'sk-ant-...';
  } else if (provider === 'deepseek') {
    deepseekModels.style.display = 'block';
    modelSelect.value = CONFIG.DEEPSEEK.DEFAULT_MODEL;
    endpointGroup.style.display = 'block';
    apiEndpointInput.value = CONFIG.DEEPSEEK.DEFAULT_ENDPOINT;
    apiKeyInput.placeholder = 'sk-...';
  } else {
    openaiModels.style.display = 'block';
    modelSelect.value = CONFIG.OPENAI.DEFAULT_MODEL;
    endpointGroup.style.display = 'block';
    apiEndpointInput.value = CONFIG.OPENAI.DEFAULT_ENDPOINT;
    apiKeyInput.placeholder = 'sk-proj-...';
  }

  // Load API key đã lưu cho provider được chọn (chỉ skip khi init lần đầu)
  if (skipKeyLoad !== true) {
    chrome.storage.sync.get([`apiKey_${provider}`], (items) => {
      const savedKey = items[`apiKey_${provider}`];
      apiKeyInput.value = savedKey || '';
      console.log(`[Provider Change] ${provider} -> key:`, savedKey ? 'found' : 'empty');
    });
  }
}

function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}
