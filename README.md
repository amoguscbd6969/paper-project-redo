# 📊 Paper Project Redo  
**Bảng xếp hạng đóng góp nghiên cứu của các trường đại học Việt Nam**  
Hiển thị biểu đồ và bảng xếp hạng trực quan như [csrankings.org](https://csrankings.org), dựa trên dữ liệu tác giả và trường đại học.

---

## 🚀 Cấu trúc thư mục

```
paper-project-redo/
│
├── src/
│   ├── App.jsx
│   ├── index.html
│   ├── main.jsx
│   ├── index.css
│   └── components/
│       ├── FieldsSelector.jsx
│       ├── ChartComponent.jsx
│       └── RankingTable.jsx
│
├── data/
│   ├── papers_authors.json
│   └── authors_universities.json
│
├── package.json
├── vite.config.js
└── README.md
```

---

## 🧩 Mô tả các file chính

### `App.jsx`
- File trung tâm quản lý luồng dữ liệu.
- Hiển thị tiêu đề, bố cục 2 cột (selector bên trái, biểu đồ + bảng bên phải).
- Kết hợp 3 component chính:
  - `FieldsSelector` – chọn ngành học.
  - `ChartComponent` – hiển thị biểu đồ đóng góp.
  - `RankingTable` – hiển thị bảng xếp hạng các trường.

### `FieldsSelector.jsx`
- Hiển thị danh sách các chuyên ngành (checkbox).
- Cho phép “Chọn tất cả” hoặc “Bỏ chọn”.
- Khi người dùng chọn ngành, `App.jsx` sẽ lọc lại dữ liệu hiển thị.

### `ChartComponent.jsx`
- Tạo biểu đồ thanh (bar chart) thể hiện tổng đóng góp của từng trường.
- Thanh có màu xanh nhạt đậm khác nhau dựa theo tên trường.
- Có phân trang (`pageSize=10` mặc định).
- Nhấp vào thanh để xem chi tiết tác giả của trường đó.

### `RankingTable.jsx`
- Hiển thị bảng dữ liệu chi tiết:
  - STT, tên trường, số bài viết, tổng đóng góp, số tác giả.
- Cũng có thể click để xem danh sách tác giả.

### `index.css`
- Quy định theme, màu nền, font chữ, viền, shadow, border-radius,...
- Đảm bảo giao diện hiện đại và tương tự `beta.dsdaihoc.com`.

---

## 🗂️ Định dạng file dữ liệu JSON

### `papers_authors.json`
- Danh sách các bài nghiên cứu (paper).
- Mỗi phần tử có dạng:

```
[
  {
    "title": "Deep Learning for Medical Imaging",
    "authors": ["Nguyen Van A", "Tran Thi B"],
    "field": "Artificial Intelligence"
  },
  {
    "title": "Optimizing Database Indexing",
    "authors": ["Le Van C"],
    "field": "Databases"
  }
]
```

> 🧠 **Lưu ý:**
> - Thuộc tính `field` hoặc `fields` (dạng string hoặc mảng đều được).
> - `authors` là mảng các tên tác giả (string).

---

### `authors_universities.json`
- Liên kết từng tác giả với trường đại học.
- Dạng dữ liệu:

```
[
  { "author": "Nguyen Van A", "university": "Vietnam National University, Hanoi" },
  { "author": "Tran Thi B", "university": "University of Science, VNU Ho Chi Minh City" },
  { "author": "Le Van C", "university": "Hanoi University" }
]
```

> ⚙️ **Ứng dụng sẽ không hoạt động chính xác nếu tên tác giả trong `papers_authors.json` và `authors_universities.json` không trùng khớp 100%.**

---

## 🖥️ Chạy thử dự án

### 1️⃣ Cài đặt
```
npm install
```

### 2️⃣ Chạy ở chế độ phát triển
```
npm run dev
```

Mở trình duyệt và truy cập địa chỉ hiển thị (thường là http://localhost:5173).

---

## 🧠 Lưu ý về giao diện
- Giao diện được chia **2 cột cố định**:
  - Cột trái: Selector (bộ chọn ngành học) — **không cuộn theo trang**.
  - Cột phải: Biểu đồ + bảng xếp hạng.
- Khi click vào tên trường hoặc thanh bar → mở **cửa sổ toàn màn hình** hiển thị danh sách tác giả.

---

## 💡 Gợi ý mở rộng
- Cho phép người dùng tải dữ liệu JSON từ API hoặc file CSV.
- Thêm tùy chọn lọc theo năm công bố.
- Triển khai lên **Vercel** hoặc **GitHub Pages**.
- Thêm hệ thống tìm kiếm tên trường / tác giả.

---

## 🧾 Giấy phép
Dự án mở mã nguồn cho mục đích nghiên cứu & học tập.  
Tác giả: **Dinh Nguyen Khoi (amoguscbd6969)**.
