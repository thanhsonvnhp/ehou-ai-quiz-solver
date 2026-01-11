# 🤖 Ehou AI Quiz Solver

Chrome Extension hỗ trợ giải đề trắc nghiệm trên trang learning.ehou.edu.vn bằng AI (Google Gemini hoặc OpenAI).

---

## ✨ Tính năng

- ✅ **Tự động đọc** câu hỏi và đáp án từ trang web
- 🤖 **Hỗ trợ 2 AI**: Google Gemini (miễn phí) hoặc OpenAI GPT (trả phí)
- 🎯 **Highlight đáp án** đúng ngay trên trang web
- 📊 **Giải thích chi tiết** trong popup
- ⚙️ **Cấu hình linh hoạt** API Key và Model
- 🚀 **Xử lý nhiều câu** cùng lúc (tuần tự)
- ⛔ **Button Stop** để dừng giữa chừng
- 🛡️ **Rate limiting** tự động (tránh bị chặn)

---

## 📋 Yêu cầu

- **Browser**: Google Chrome hoặc Edge (Chromium)
- **API Key** từ một trong hai:
  - **Google Gemini** (MIỄN PHÍ - khuyên dùng): https://aistudio.google.com/app/apikey
  - **OpenAI** (trả phí): https://platform.openai.com/api-keys

---

## 🔧 Cài đặt

### Bước 1: Load Extension vào Chrome

1. Mở Chrome và truy cập: `chrome://extensions/`
2. Bật **"Developer mode"** (góc trên bên phải)
3. Click **"Load unpacked"**
4. Chọn thư mục `extension-ehou`
5. Extension sẽ xuất hiện với icon 🤖

### Bước 2: Cấu hình API Key

1. Click vào icon extension trên thanh công cụ
2. Click **"⚙️ Cấu hình API"**
3. Chọn **Provider**:

#### Option 1: Google Gemini (MIỄN PHÍ - Khuyên dùng)
```
Provider: Google Gemini
Model: Gemini 2.0 Flash (Khuyên dùng)
API Key: AIza... (tạo tại https://aistudio.google.com/app/apikey)
```

#### Option 2: OpenAI (Trả phí)
```
Provider: OpenAI (ChatGPT)
Model: GPT-4O Mini (Khuyên dùng - rẻ nhất)
API Key: sk-proj-... (tạo tại https://platform.openai.com/api-keys)
API Endpoint: https://api.openai.com/v1/chat/completions
```

4. Click **"💾 Lưu cấu hình"**

---

## 🚀 Sử dụng

### Giải đề tự động

1. Truy cập trang làm bài thi trên https://learning.ehou.edu.vn
2. Click vào icon extension 🤖
3. Click nút **"🚀 Giải bằng AI"**
4. Extension sẽ:
   - 📖 Đọc câu hỏi từ trang
   - 🤖 Gửi cho AI phân tích (1 câu/lần, đợi 5s giữa mỗi câu)
   - 🎯 Highlight đáp án đúng (màu xanh + badge "AI Suggested")
   - 📊 Hiển thị kết quả và giải thích trong popup
5. Click **"⛔ Dừng lại"** nếu muốn dừng giữa chừng
6. Click **"🗑️ Xóa kết quả"** để xóa highlight và bắt đầu lại

### Thời gian ước tính

| Số câu | Thời gian |
|--------|-----------|
| 1 câu  | ~5-7 giây |
| 5 câu  | ~35-45 giây |
| 10 câu | ~70-90 giây |
| 20 câu | ~2.5-3 phút |

---

## 📁 Cấu trúc File

```
extension-ehou/
├── manifest.json       # Cấu hình extension (Manifest v3)
├── config.js          # Cấu hình tập trung (API, models, messages)
├── background.js      # Service Worker - xử lý gọi AI API
├── content.js         # Content Script - tương tác với trang web
├── popup.html         # Giao diện popup
├── popup.js           # Logic popup
├── styles.css         # CSS cho highlight trên trang
├── icon16.png         # Icon 16x16
├── icon48.png         # Icon 48x48
├── icon128.png        # Icon 128x128
└── README.md          # Hướng dẫn này
```

---

## 🔍 Giải thích kỹ thuật

### Rate Limiting System
- **Queue System**: Chỉ gửi 1 request tại một thời điểm
- **Delay**: Tự động đợi 5 giây giữa mỗi request
- **Timeout**: 30 giây cho mỗi request
- **Mục đích**: Tránh bị Google Gemini rate limit/chặn

### API Integration
- **Gemini API**: Sử dụng v1beta endpoint
- **OpenAI API**: Sử dụng Chat Completions endpoint
- **Error Handling**: Xử lý chi tiết lỗi quota, authentication, timeout

### Content Extraction
- Tự động phát hiện câu hỏi trên trang ehou
- Parse đáp án từ radio buttons/checkboxes
- Hỗ trợ cả câu hỏi đơn và nhiều đáp án

---

## ⚙️ Cấu hình nâng cao

### Thay đổi delay giữa các request

Mở file `config.js`, tìm dòng:
```javascript
MIN_REQUEST_INTERVAL: 10000, // 10 giây
```

Có thể đổi thành:
- `3000` - 3 giây (nhanh hơn, có thể bị rate limit)
- `10000` - 10 giây (chậm hơn, an toàn tuyệt đối)

### Thay đổi model mặc định

Trong `config.js`:
```javascript
GEMINI: {
  DEFAULT_MODEL: 'gemini-flash-latest', // Đổi thành model khác
  // ...
}
```

---

## 🐛 Xử lý lỗi thường gặp

### ❌ Lỗi: "Quota exceeded"

**Nguyên nhân**: Vượt quá giới hạn miễn phí của Gemini API

**Giải pháp**:
1. Đợi 24h để quota reset
2. Kiểm tra quota tại: https://ai.dev/rate-limit
3. Nâng cấp lên gói trả phí: https://aistudio.google.com/
4. Hoặc chuyển sang OpenAI

### ❌ Lỗi: "models/gemini-xxx is not found"

**Nguyên nhân**: Model không tồn tại hoặc không hỗ trợ

**Giải pháp**:
1. Reload extension trong `chrome://extensions/`
2. Chọn model: **"Gemini 2.0 Flash (Khuyên dùng)"**
3. Lưu cấu hình và thử lại

### ❌ Lỗi: "Không thể kết nối với trang"

**Giải pháp**:
1. Refresh lại trang web
2. Reload extension
3. Đảm bảo đang ở trang làm bài thi

### ❌ Lỗi: "API Key không hợp lệ"

**Giải pháp**:
1. Kiểm tra API Key đã nhập đúng chưa
2. Gemini API Key bắt đầu bằng `AIza...`
3. OpenAI API Key bắt đầu bằng `sk-proj-...`
4. Tạo API Key mới nếu cần

### ❌ Lỗi: "Timeout"

**Giải pháp**:
1. Kiểm tra kết nối internet
2. Thử lại sau vài giây
3. API có thể đang quá tải

---

## 📊 So sánh Models

### Google Gemini

| Model | Quota miễn phí | Tốc độ | Chi phí | Khuyên dùng |
|-------|----------------|--------|---------|-------------|
| gemini-flash-latest | ✅ Có | ⚡ Rất nhanh | Miễn phí | ✅ **Tốt nhất** |
| gemini-2.5-flash | ✅ Có (15 RPM) | ⚡ Nhanh | Miễn phí | ✅ Tốt |
| gemini-1.5-pro | ✅ Có (2 RPM) | 🐢 Chậm | Miễn phí | ⚠️ Chậm |

### OpenAI

| Model | Chi phí | Tốc độ | Khuyên dùng |
|-------|---------|--------|-------------|
| gpt-4o-mini | $0.15/1M tokens | ⚡ Nhanh | ✅ **Rẻ nhất** |
| gpt-4o | $2.50/1M tokens | ⚡ Nhanh | 💰 Đắt |
| gpt-4-turbo | $10/1M tokens | 🐢 Chậm | 💰 Rất đắt |

---

## 💡 Tips & Tricks

### 1. Tối ưu chi phí
- Dùng **Gemini** (miễn phí) thay vì OpenAI
- Nếu dùng OpenAI, chọn **GPT-4O Mini** (rẻ nhất)
- Chỉ giải những câu khó, tự làm câu dễ

### 2. Tránh bị rate limit
- Không giải quá nhiều câu cùng lúc
- Chia nhỏ: 10-15 câu/lần
- Đợi vài phút giữa các lần

### 3. Tăng độ chính xác
- Kiểm tra lại đáp án AI gợi ý
- Đọc phần giải thích để hiểu
- Không phụ thuộc 100% vào AI

### 4. Sử dụng hiệu quả
- Dùng button **Stop** khi cần dừng
- Xem kết quả trong popup để học
- Clear kết quả trước khi giải đề mới

---

## 🔄 Cập nhật Extension

Sau khi sửa code:
1. Vào `chrome://extensions/`
2. Click nút **"🔄 Reload"** ở extension
3. Refresh trang web đang test

---

## 🔐 Bảo mật

- API Key được lưu trong **Chrome Storage** (sync across devices)
- Không gửi API Key đến server nào khác ngoài AI provider
- Code hoàn toàn chạy local trên máy bạn
- Không thu thập dữ liệu người dùng

---

## 📝 Tùy chỉnh

### Thay đổi prompt cho AI

Mở `background.js`, tìm hàm `createPrompt()`:
```javascript
function createPrompt(questionData) {
  let prompt = `Dưới đây là một câu hỏi trắc nghiệm tiếng Việt...`;
  // Sửa prompt ở đây
}
```

### Thay đổi cách highlight

Mở `styles.css`:
```css
.ai-suggested-answer {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Sửa màu, animation ở đây */
}
```

### Hỗ trợ trang web khác

Mở `content.js`, sửa selector trong `extractSingleQuestion()`:
```javascript
const questionText = questionDiv.querySelector('.qtext').textContent.trim();
// Sửa selector phù hợp với trang web mới
```

---

## ⚡ Performance

### Tối ưu hóa
- Sử dụng **Service Worker** (Manifest V3) thay vì background page
- **Queue system** để tránh gửi nhiều request cùng lúc
- **Lazy loading** cho popup UI
- **Minimal DOM manipulation** trong content script

### Resource Usage
- **Memory**: ~10-20 MB
- **CPU**: Minimal (chỉ khi đang xử lý)
- **Network**: ~1-5 KB/request (tùy độ dài câu hỏi)

---

## 🌐 API Alternatives

Extension hỗ trợ các API tương thích OpenAI:

### OpenRouter
```
Endpoint: https://openrouter.ai/api/v1/chat/completions
Model: openai/gpt-4o-mini, anthropic/claude-3-haiku
```

### LocalAI (chạy local)
```
Endpoint: http://localhost:8080/v1/chat/completions
Model: tùy model đã cài
```

### Azure OpenAI
```
Endpoint: https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT/chat/completions?api-version=2024-02-15-preview
Note: Cần sửa code để dùng api-key header
```

---

## 🎓 Học từ Extension

### Kỹ thuật sử dụng

1. **Chrome Extension API**
   - Manifest V3
   - Service Worker
   - Content Scripts
   - Message Passing
   - Storage API

2. **AI Integration**
   - REST API calls
   - Error handling
   - Rate limiting
   - Prompt engineering

3. **DOM Manipulation**
   - Query selectors
   - Dynamic styling
   - Event handling

4. **Async Programming**
   - Promises
   - Async/await
   - Queue system

---

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa

---

## 🙏 Lưu ý đạo đức

Extension này chỉ nhằm mục đích **học tập và nghiên cứu**.

- ⚠️ Không khuyến khích gian lận trong thi cử
- 📚 Sử dụng AI để học hỏi, không phụ thuộc hoàn toàn
- 🧠 Luôn kiểm tra và hiểu kỹ đáp án
- 💡 Học từ giải thích của AI, không chỉ copy đáp án

---

## 🐛 Báo lỗi & Đóng góp

Nếu gặp lỗi hoặc có ý tưởng cải tiến:
1. Mở issue trên GitHub (nếu có)
2. Hoặc liên hệ trực tiếp với developer

---

## 📞 Hỗ trợ

### Tài liệu tham khảo
- Google Gemini API: https://ai.google.dev/gemini-api/docs
- OpenAI API: https://platform.openai.com/docs
- Chrome Extension: https://developer.chrome.com/docs/extensions

### FAQs

**Q: Extension có miễn phí không?**
A: Extension miễn phí. Nhưng cần API Key (Gemini miễn phí, OpenAI trả phí).

**Q: Độ chính xác bao nhiêu %?**
A: Phụ thuộc vào AI model và độ khó câu hỏi. Thường ~80-95%.

**Q: Có bị phát hiện không?**
A: Extension chỉ đọc trang web và highlight, không tự động submit. Tùy thuộc vào chính sách của trường.

**Q: Tôi có thể dùng cho trang web khác không?**
A: Có, nhưng cần sửa code trong `content.js` để phù hợp với cấu trúc HTML của trang đó.

**Q: Tại sao phải đợi 5 giây giữa mỗi câu?**
A: Để tránh bị Google Gemini rate limit/chặn do gửi quá nhiều request.

---

## 🎉 Changelog

### v2.0 (Latest)
- ✅ Thêm hỗ trợ Google Gemini
- ✅ Thêm button Stop
- ✅ Cải thiện rate limiting (5s delay)
- ✅ Tách config ra file riêng
- ✅ Cải thiện error handling
- ✅ Cập nhật UI/UX

### v1.0
- ✅ Phiên bản đầu tiên
- ✅ Hỗ trợ OpenAI
- ✅ Tự động đọc câu hỏi
- ✅ Highlight đáp án

---

**Phát triển bởi**: AI Assistant  
**Năm**: 2026  
**Chrome Extension Manifest**: V3  
**Ngôn ngữ**: JavaScript (Vanilla)

---

**🚀 Chúc bạn học tốt và sử dụng extension hiệu quả!**
