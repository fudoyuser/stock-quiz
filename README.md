# Bảng Điện Quiz

Quiz kiến thức chứng khoán Việt Nam. **Phần 1: Mã cổ phiếu**, gồm 115 doanh nghiệp niêm yết trên HOSE, HNX và UPCoM, chia theo 11 ngành.

Ba kiểu câu hỏi:
- **Công ty → Mã**: nhìn tên doanh nghiệp, chọn mã đúng trong 4 mã. Các mã sai được chọn từ cùng ngành hoặc từ mã trông gần giống.
- **Mã → Công ty**: nhìn mã, chọn đúng doanh nghiệp.
- **Tự gõ mã**: gõ chính xác mã cổ phiếu.

Có thể lọc theo ngành, chọn 10/20/30 câu hoặc tất cả. Cuối lượt hiện danh sách mã cần ôn. Cuối trang có bảng tra cứu, tìm được cả khi gõ không dấu.

Dữ liệu chỉ để ôn tập, không phải khuyến nghị đầu tư.

## Thêm mã mới

Mở `index.html`, thêm một dòng vào chuỗi `RAW` theo dạng:

```
MÃ|Tên thường gọi|Tên đầy đủ|ngành|Ghi chú (không bắt buộc)
```

`ngành` là một khóa trong `SECTORS` (`bank`, `re`, `fin`, `cons`, `food`, `mat`, `build`, `energy`, `trans`, `tech`, `health`).

## Chạy

Mở trực tiếp `index.html` hoặc bật GitHub Pages (Settings → Pages → Deploy from branch `main`, thư mục `/`).
