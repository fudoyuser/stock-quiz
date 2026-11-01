# Bảng Điện Quiz

Quiz kiến thức chứng khoán Việt Nam gồm **16 phần tách biệt**. Mỗi phần có thiết lập, điểm cao nhất và bảng tra cứu riêng, có link riêng (`#ma`, `#linh-vuc`…).

| Phần | Link | Nội dung | Số câu |
|---|---|---|---|
| 1. Mã cổ phiếu | `#ma` | Nhìn tên doanh nghiệp, tự gõ mã | 184 |
| 2. Lĩnh vực hoạt động | `#linh-vuc` | Đọc lĩnh vực hoạt động chính, chọn đúng mã | 184 |
| 3. Thuật ngữ & chỉ số | `#thuat-ngu` | P/E, EPS, ROE, margin, room ngoại, ETF, chứng quyền… | 30 |
| 4. Quy định giao dịch | `#quy-dinh` | Biên độ, bước giá, lô chẵn, giờ giao dịch, T+2, GDKHQ, thuế | 29 |
| 5. Sàn niêm yết | `#san` | Mã này ở HOSE, HNX hay UPCoM? | 105 |
| 6. Tập đoàn & công ty con | `#tap-doan` | Vingroup, Masan, FPT, Viettel, PVN… gồm những mã nào | 50 |
| 7. Thương hiệu → Mã | `#thuong-hieu` | Long Châu, bia 333, Zalo… thuộc mã nào | 48 |
| 8. Chỉ số thị trường | `#chi-so` | VN-Index, VN30, VN100, VNDiamond, ETF, cổ phiếu trụ | 16 |
| 9. Đọc báo cáo tài chính | `#bctc` | Tính EPS, P/E, ROE, D/E và nhận diện rủi ro | 20 |
| 10. Lịch sử thị trường | `#lich-su` | Các mốc từ năm 2000 đến nay | 18 |
| 11. Phân tích kỹ thuật | `#ky-thuat` | Mô hình nến, mô hình giá (có biểu đồ minh họa), MA, RSI, MACD, Bollinger | 27 |
| 12. Thị trường phái sinh | `#phai-sinh` | Hợp đồng tương lai VN30, chứng quyền có bảo đảm | 19 |
| 13. Trái phiếu | `#trai-phieu` | Coupon, lợi suất, lãi suất và giá, rủi ro, bài học 2022 | 20 |
| 14. Quỹ đầu tư & ETF | `#quy` | NAV, quỹ mở/đóng, ETF nội và ngoại, DCA | 16 |
| 15. Quản trị rủi ro & tâm lý | `#rui-ro` | Cắt lỗ, R:R, quy mô vị thế, margin, FOMO và các thiên kiến | 18 |
| 16. Đọc hiểu theo ngành | `#nganh` | Ngân hàng, bất động sản, thép, bán lẻ, điện, cảng biển… nhìn chỉ số gì | 20 |

Dữ liệu chỉ để ôn tập, không phải khuyến nghị đầu tư. Quy định, sàn niêm yết và cơ cấu sở hữu có thể thay đổi, nên kiểm tra lại với nguồn chính thức.

## Sửa dữ liệu (trong `index.html`)

- **Doanh nghiệp** (Phần 1, 2): chuỗi `RAW`, mỗi dòng `MÃ|Tên thường gọi|Tên đầy đủ|ngành|Lĩnh vực hoạt động chính|Ghi chú`. Các công ty làm cùng một việc nên dùng đúng cùng một câu mô tả (hằng `BANK`, `RE`, `KCN`, `SEC`, `INS`).
- **Sàn niêm yết** (Phần 5): object `EXCH`, chỉ gồm những mã có sàn ổn định.
- **Tập đoàn** (Phần 6): mảng `GROUPS`.
- **Thương hiệu** (Phần 7): mảng `BRANDS`.
- **Câu hỏi kiến thức** (Phần 3, 4, 8–16): mảng `TERMS`, `RULES`, `INDEXES`, `FINANCE`, `HISTORY`, `TECH`, `DERIV`, `BONDS`, `FUNDS`, `RISK`, `SECTOR_Q`. Mỗi câu có `q` (câu hỏi), `a` (đáp án đúng), `w` (3 đáp án sai), `e` (giải thích).
- **Biểu đồ minh họa** (Phần 11): thêm `chart` vào câu hỏi, dạng `{ candles: [[mở, cao, thấp, đóng], …] }` hoặc `{ lines: [{ d: [...], dash, label }], hline: [giá] }`.
- **Thêm phần mới**: thêm một object vào mảng `PARTS` và một màu `--cN` trong CSS.
