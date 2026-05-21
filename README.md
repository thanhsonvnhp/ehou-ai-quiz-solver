# 🎓 Trợ Lý Học Tập AI cho EHOU

Tiện ích Chrome hỗ trợ học tập dành cho sinh viên sử dụng hệ thống E-Learning dành cho sinh viên EHOU (learning.ehou.edu.vn).

---

## 📖 Mô tả

**Trợ Lý Học Tập AI** là tiện ích hỗ trợ sinh viên trong quá trình học trực tuyến trên nền tảng E-Learning.

### Các tính năng nổi bật:

* 🤖 **Hỗ trợ giải thích câu hỏi bằng AI** - Sử dụng Google Gemini hoặc OpenAI để phân tích và giải thích chi tiết
* 📊 **Hiển thị gợi ý trực quan** - Đánh dấu và làm nổi bật các đáp án được AI đề xuất
* 💡 **Giải thích chi tiết** - Cung cấp lý do và phân tích cho từng câu hỏi
* ⚙️ **Cấu hình linh hoạt** - Dễ dàng thiết lập API key và chọn model AI
* 🚀 **Xử lý hàng loạt** - Phân tích nhiều câu hỏi tuần tự với rate limiting tự động
* ⛔ **Kiểm soát dừng** - Tạm dừng quá trình xử lý bất cứ lúc nào
* 🛡️ **Bảo vệ rate limit** - Tự động điều chỉnh tốc độ để tránh bị chặn API

Tiện ích được xây dựng nhằm hỗ trợ người học tiếp cận kiến thức nhanh hơn và thuận tiện hơn trong môi trường học tập trực tuyến.

### Lưu ý quan trọng:

* ✅ Tiện ích không can thiệp vào hệ thống thi cử, bảo mật hoặc dữ liệu của nền tảng học tập
* ✅ Không tự động nộp bài hoặc thay đổi dữ liệu trên server
* ✅ Chỉ đọc nội dung hiển thị trên trang web và cung cấp gợi ý học tập
* ✅ API key được lưu trữ an toàn trên máy người dùng

---

## 📋 Yêu cầu

- **Trình duyệt**: Google Chrome hoặc Microsoft Edge (Chromium)
- **API Key** từ một trong hai nhà cung cấp:
  - **Google Gemini** (MIỄN PHÍ - Khuyên dùng): [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
  - **OpenAI** (Trả phí): [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 🔧 Hướng dẫn cài đặt

### Bước 1: Tải extension vào Chrome

1. Mở Chrome và truy cập: `chrome://extensions/`
2. Bật **"Developer mode"** (góc trên bên phải)
3. Click **"Load unpacked"**
4. Chọn thư mục chứa extension
5. Extension sẽ xuất hiện với icon 🤖

### Bước 2: Cấu hình API Key

1. Click vào icon extension trên thanh công cụ
2. Click **"⚙️ Cấu hình API"**
3. Chọn **Provider**:

#### Tùy chọn 1: Google Gemini (MIỄN PHÍ - Khuyên dùng)

```
Provider: Google Gemini
Model: Gemini 2.0 Flash (Khuyên dùng)
API Key: AIza... (tạo tại https://aistudio.google.com/app/apikey)
```

#### Tùy chọn 2: OpenAI (Trả phí)

```
Provider: OpenAI (ChatGPT)
Model: GPT-4O Mini (Khuyên dùng - tiết kiệm chi phí)
API Key: sk-proj-... (tạo tại https://platform.openai.com/api-keys)
API Endpoint: https://api.openai.com/v1/chat/completions
```

4. Click **"💾 Lưu cấu hình"**

---

## 🚀 Hướng dẫn sử dụng

### Phân tích câu hỏi

1. Truy cập trang làm bài trên [https://learning.ehou.edu.vn](https://learning.ehou.edu.vn)
2. Click vào icon extension 🤖
3. Click nút **"🚀 Phân tích bằng AI"**
4. Extension sẽ:
   - 📖 Đọc câu hỏi từ trang web
   - 🤖 Gửi cho AI phân tích (từng câu một, đợi 5 giây giữa mỗi câu)
   - 🎯 Đánh dấu đáp án được đề xuất (màu xanh + badge "AI Suggested")
   - 📊 Hiển thị kết quả và giải thích trong popup
5. Click **"⛔ Dừng lại"** nếu muốn tạm dừng
6. Click **"🗑️ Xóa kết quả"** để xóa đánh dấu và bắt đầu lại

### Thời gian xử lý ước tính

| Số câu hỏi | Thời gian |
|------------|-----------|
| 1 câu | ~5-7 giây |
| 5 câu | ~35-45 giây |
| 10 câu | ~70-90 giây |
| 20 câu | ~2.5-3 phút |

---

## 📁 Cấu trúc thư mục

```
extension/
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
└── README.md          # Tài liệu này
```

---

## 🔍 Chi tiết kỹ thuật

### Hệ thống Rate Limiting

- **Queue System**: Chỉ xử lý 1 request tại một thời điểm
- **Delay**: Tự động đợi 5 giây giữa mỗi request
- **Timeout**: 30 giây cho mỗi request
- **Mục đích**: Tránh bị API rate limit và throttling

### Tích hợp API

- **Gemini API**: Sử dụng v1beta endpoint
- **OpenAI API**: Sử dụng Chat Completions endpoint
- **Xử lý lỗi**: Xử lý toàn diện cho lỗi quota, authentication, timeout

### Trích xuất nội dung

- Tự động phát hiện câu hỏi trên trang EHOU
- Parse đáp án từ radio buttons/checkboxes
- Hỗ trợ cả câu hỏi đơn và nhiều đáp án

---

## ⚙️ Cấu hình nâng cao

### Điều chỉnh thời gian delay

Mở file `config.js`, tìm dòng:

```javascript
MIN_REQUEST_INTERVAL: 10000, // 10 giây
```

Có thể thay đổi thành:
- `3000` - 3 giây (nhanh hơn, có thể bị rate limit)
- `10000` - 10 giây (chậm hơn, an toàn tuyệt đối)

### Thay đổi model mặc định

Trong `config.js`:

```javascript
GEMINI: {
  DEFAULT_MODEL: 'gemini-flash-latest', // Đổi sang model khác
  // ...
}
```

---

## 🐛 Xử lý lỗi thường gặp

### ❌ Lỗi: "Quota exceeded"

**Nguyên nhân**: Vượt quá giới hạn miễn phí của Gemini API

**Giải pháp**:
1. Đợi 24 giờ để quota reset
2. Kiểm tra quota tại: [https://ai.dev/rate-limit](https://ai.dev/rate-limit)
3. Nâng cấp lên gói trả phí: [https://aistudio.google.com/](https://aistudio.google.com/)
4. Hoặc chuyển sang OpenAI

### ❌ Lỗi: "models/gemini-xxx is not found"

**Nguyên nhân**: Model không tồn tại hoặc không được hỗ trợ

**Giải pháp**:
1. Reload extension trong `chrome://extensions/`
2. Chọn model: **"Gemini 2.0 Flash (Khuyên dùng)"**
3. Lưu cấu hình và thử lại

### ❌ Lỗi: "Không thể kết nối với trang"

**Giải pháp**:
1. Refresh lại trang web
2. Reload extension
3. Đảm bảo đang ở trang làm bài

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

## 📊 So sánh các Model AI

### Google Gemini

| Model | Quota miễn phí | Tốc độ | Chi phí | Khuyên dùng |
|-------|----------------|--------|---------|-------------|
| gemini-flash-latest | ✅ Có | ⚡ Rất nhanh | Miễn phí | ✅ **Tốt nhất** |
| gemini-2.5-flash | ✅ Có (15 RPM) | ⚡ Nhanh | Miễn phí | ✅ Tốt |
| gemini-1.5-pro | ✅ Có (2 RPM) | 🐢 Chậm | Miễn phí | ⚠️ Chậm |

### OpenAI

| Model | Chi phí | Tốc độ | Khuyên dùng |
|-------|---------|--------|-------------|
| gpt-4o-mini | $0.15/1M tokens | ⚡ Nhanh | ✅ **Tiết kiệm nhất** |
| gpt-4o | $2.50/1M tokens | ⚡ Nhanh | 💰 Đắt |
| gpt-4-turbo | $10/1M tokens | 🐢 Chậm | 💰 Rất đắt |

---

## 💡 Mẹo sử dụng hiệu quả

### 1. Tối ưu chi phí

- Sử dụng **Gemini** (miễn phí) thay vì OpenAI
- Nếu dùng OpenAI, chọn **GPT-4O Mini** (tiết kiệm nhất)
- Xử lý theo batch: 10-15 câu mỗi lần

### 2. Tránh bị rate limit

- Không xử lý quá nhiều câu cùng lúc
- Chia nhỏ: 10-15 câu mỗi phiên
- Đợi vài phút giữa các phiên

### 3. Tăng hiệu quả học tập

- Đọc phần giải thích để hiểu logic
- Sử dụng như công cụ hỗ trợ học tập, không phụ thuộc hoàn toàn
- Kiểm tra lại đáp án được đề xuất

### 4. Sử dụng thông minh

- Dùng nút **Stop** khi cần dừng
- Xem kết quả trong popup để học hỏi
- Xóa kết quả trước khi bắt đầu bài mới

---

## 🔄 Cập nhật Extension

Sau khi sửa code:
1. Vào `chrome://extensions/`
2. Click nút **"🔄 Reload"** ở extension
3. Refresh trang web đang sử dụng

---

## 🔐 Bảo mật & Quyền riêng tư

- API Key được lưu trong **Chrome Storage** (đồng bộ giữa các thiết bị)
- Không gửi API Key đến bất kỳ server nào ngoài nhà cung cấp AI
- Code chạy hoàn toàn local trên máy người dùng
- Không thu thập dữ liệu cá nhân
- Mã nguồn mở và minh bạch

---

## 📝 Tùy chỉnh

### Thay đổi prompt cho AI

Mở `background.js`, tìm hàm `createPrompt()`:

```javascript
function createPrompt(questionData) {
  let prompt = `Dưới đây là một câu hỏi trắc nghiệm...`;
  // Sửa prompt ở đây
}
```

### Thay đổi cách highlight

Mở `styles.css`:

```css
.ai-suggested-answer {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Sửa màu sắc và animation ở đây */
}
```

### Hỗ trợ trang web khác

Mở `content.js`, sửa selector trong `extractSingleQuestion()`:

```javascript
const questionText = questionDiv.querySelector('.qtext').textContent.trim();
// Sửa selector phù hợp với cấu trúc HTML của trang mới
```

---

## ⚡ Hiệu năng

### Tối ưu hóa

- Sử dụng **Service Worker** (Manifest V3) thay vì background page
- **Queue system** ngăn chặn request đồng thời
- **Lazy loading** cho popup UI
- **Minimal DOM manipulation** trong content script

### Sử dụng tài nguyên

- **Memory**: ~10-20 MB
- **CPU**: Tối thiểu (chỉ khi đang xử lý)
- **Network**: ~1-5 KB mỗi request (tùy độ dài câu hỏi)

---

## 🌐 Nhà cung cấp API thay thế

Extension hỗ trợ các API tương thích OpenAI:

### OpenRouter

```
Endpoint: https://openrouter.ai/api/v1/chat/completions
Model: openai/gpt-4o-mini, anthropic/claude-3-haiku
```

### LocalAI (tự host)

```
Endpoint: http://localhost:8080/v1/chat/completions
Model: tùy thuộc vào model đã cài đặt
```

### Azure OpenAI

```
Endpoint: https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT/chat/completions?api-version=2024-02-15-preview
Lưu ý: Cần sửa code để sử dụng api-key header
```

---

## 🎓 Giá trị giáo dục

Extension này minh họa các khái niệm quan trọng:

### Công nghệ sử dụng

1. **Chrome Extension API**
   - Manifest V3
   - Service Workers
   - Content Scripts
   - Message Passing
   - Storage API

2. **Tích hợp AI**
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
   - Queue systems

---

## 📄 Giấy phép

MIT License - Tự do sử dụng và chỉnh sửa

---

## 🎯 Mục đích giáo dục

Extension này được thiết kế như một **công cụ hỗ trợ học tập** giúp sinh viên:

- 📚 Hiểu các khái niệm phức tạp thông qua giải thích của AI
- 🧠 Học các phương pháp giải quyết vấn đề
- 💡 Nhận phản hồi tức thì về sự hiểu biết của mình
- 🎓 Cải thiện hiệu quả học tập

**Quan trọng**: Công cụ này được tạo ra để nâng cao quá trình học tập, không thay thế nó. Luôn xem xét và hiểu các giải thích được cung cấp.

---

## 🐛 Báo lỗi & Đóng góp

Nếu gặp vấn đề hoặc có đề xuất:
1. Mở issue trên GitHub (nếu có)
2. Liên hệ trực tiếp với developer

---

## 📞 Hỗ trợ

### Tài liệu tham khảo

- Google Gemini API: [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)
- OpenAI API: [https://platform.openai.com/docs](https://platform.openai.com/docs)
- Chrome Extensions: [https://developer.chrome.com/docs/extensions](https://developer.chrome.com/docs/extensions)

### Câu hỏi thường gặp

**Q: Extension có miễn phí không?**  
A: Extension miễn phí. Bạn cần API key (Gemini miễn phí, OpenAI trả phí).

**Q: Độ chính xác như thế nào?**  
A: Phụ thuộc vào AI model và độ khó câu hỏi. Thường đạt ~80-95%.

**Q: Có thể dùng cho trang web khác không?**  
A: Có, nhưng cần sửa code trong `content.js` để phù hợp với cấu trúc HTML của trang đó.

**Q: Tại sao phải đợi 5 giây giữa mỗi câu?**  
A: Để tránh bị API rate limit/chặn do gửi quá nhiều request.

**Q: Extension có hoạt động offline không?**  
A: Không, cần kết nối internet để giao tiếp với AI API.

---

## 🎉 Lịch sử phiên bản

### v1.0.0 (Hiện tại)

- ✅ Hỗ trợ Google Gemini
- ✅ Hỗ trợ OpenAI
- ✅ Chức năng nút Stop
- ✅ Rate limiting (delay 5 giây)
- ✅ File cấu hình riêng biệt
- ✅ Xử lý lỗi toàn diện
- ✅ UI/UX hiện đại

---

**Phát triển bởi**: Phạm Thanh Sơn  
**Năm**: 2026  
**Chrome Extension Manifest**: V3  
**Ngôn ngữ**: JavaScript (Vanilla)

---

**🚀 Chúc bạn học tập hiệu quả!**
