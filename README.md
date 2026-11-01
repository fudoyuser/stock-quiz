# Bảng Điện Quiz

Quiz kiến thức chứng khoán Việt Nam với 184 doanh nghiệp niêm yết trên HOSE, HNX và UPCoM, chia theo 12 ngành. Trang có hai phần **tách biệt**: mỗi phần có thiết lập, điểm cao nhất và bảng tra cứu riêng.

## Phần 1: Mã cổ phiếu (`#ma`)
Nhìn tên doanh nghiệp, tự gõ chính xác mã cổ phiếu.

## Phần 2: Lĩnh vực hoạt động chính (`#linh-vuc`)
Đọc mô tả lĩnh vực hoạt động chính, chọn đúng mã cổ phiếu trong 4 mã (chỉ hiện mã, không kèm tên công ty). Đáp án nhiễu của Phần 2 được lấy từ ngành khác, nên không có hai đáp án cùng đúng.

Ở cả hai phần đều lọc được theo ngành và chọn 10/20/30 câu hoặc tất cả. Cuối lượt có danh sách mã cần ôn.

Dữ liệu chỉ để ôn tập, không phải khuyến nghị đầu tư.

## Thêm doanh nghiệp

Mở `index.html`, thêm một dòng vào chuỗi `RAW`:

```
MÃ|Tên thường gọi|Tên đầy đủ|ngành|Lĩnh vực hoạt động chính|Ghi chú (không bắt buộc)
```

- `ngành` là một khóa trong `SECTORS` (`bank`, `re`, `fin`, `cons`, `food`, `mat`, `build`, `energy`, `trans`, `tech`, `health`, `textile`).
- Các công ty làm cùng một việc nên dùng **đúng cùng một câu** mô tả lĩnh vực (có sẵn hằng `BANK`, `RE`, `KCN`, `SEC`, `INS`), để chúng không bị lấy làm đáp án nhiễu của nhau.
