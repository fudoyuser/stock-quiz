# Bảng Điện Quiz

Quiz kiến thức chứng khoán Việt Nam gồm **10 phần tách biệt**. Mỗi phần có thiết lập, điểm cao nhất và bảng tra cứu riêng, có link riêng (`#ma`, `#linh-vuc`…).

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

Dữ liệu chỉ để ôn tập, không phải khuyến nghị đầu tư. Quy định, sàn niêm yết và cơ cấu sở hữu có thể thay đổi, nên kiểm tra lại với nguồn chính thức.

## Sửa dữ liệu (trong `index.html`)

- **Doanh nghiệp** (Phần 1, 2): chuỗi `RAW`, mỗi dòng `MÃ|Tên thường gọi|Tên đầy đủ|ngành|Lĩnh vực hoạt động chính|Ghi chú`. Các công ty làm cùng một việc nên dùng đúng cùng một câu mô tả (hằng `BANK`, `RE`, `KCN`, `SEC`, `INS`).
- **Sàn niêm yết** (Phần 5): object `EXCH`, chỉ gồm những mã có sàn ổn định.
- **Tập đoàn** (Phần 6): mảng `GROUPS`.
- **Thương hiệu** (Phần 7): mảng `BRANDS`.
- **Câu hỏi kiến thức** (Phần 3, 4, 8, 9, 10): mảng `TERMS`, `RULES`, `INDEXES`, `FINANCE`, `HISTORY`. Mỗi câu có `q` (câu hỏi), `a` (đáp án đúng), `w` (3 đáp án sai), `e` (giải thích).
- **Thêm phần mới**: thêm một object vào mảng `PARTS` và một màu `--cN` trong CSS.
