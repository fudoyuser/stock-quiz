# Bảng Điện Quiz — quy ước khi cập nhật câu hỏi

Ứng dụng là một file `index.html` (HTML/CSS/JS thuần, không framework). Dữ liệu câu hỏi nằm ngay trong file.

## Khi người dùng gửi link Google Doc giáo trình (môn Phân tích tài chính) để "cập nhật chương N"
- Doc: `1PeeKE0bcv8ollhetKNUtg07wnkWqTzZ9m161-JPtzms`, mỗi chương là một tab/heading `# Chương N`.
- Mỗi chương là một phần riêng (`subject: "ptc"`, `tag: "Chương N"`), chia mục bằng `topics` theo số mục của sách (vd `s21: "2.1 …"`).
- **Luôn thêm mục "Dễ nhầm lẫn"** (`n1`, `n2`… trong `topics` của chương) gồm câu trắc nghiệm về các khái niệm hay bị lẫn với nhau và câu dạng "Nhận định đúng hay sai?".
- Không ra câu bắt nhớ số liệu ví dụ trong sách. Câu dùng số liệu ví dụ phải kèm số liệu ngay trong đề hoặc trong `table`.
- Ô số liệu bị che/không đọc được (`???`): tự ước lượng sao cho khớp các dòng tổng đã in, đánh dấu `*` và ghi chú trong `table.note`.
- Số liệu in sai trong sách: tính lại cho đúng, ghi rõ trong phần giải thích `e`.

## Khi người dùng gửi tài liệu mới (PDF, slide…)
- Đọc hết tài liệu trước khi soạn. Tài liệu thuộc giáo trình riêng (vd CFA) thì vào nhóm riêng (`subject`), không trộn vào Kiến thức chứng khoán.
- Nhóm CFA: `subject: "cfa"`, mỗi phần gom 1–3 module, `topics` theo module/LOS và luôn có `n: "Dễ nhầm lẫn"`.
- Nhóm FRM: `subject: "frm"`, mỗi chương sách một phần (`frmC1`, `frmC2`…), `topics` theo mục của chương + `n: "Dễ nhầm lẫn"`. Sách FRM nhận dưới dạng PDF scan (không có lớp chữ): đọc bằng hình ảnh từng trang. Khi người dùng gửi tiếp các trang sau, bổ sung vào chương đang dở (vd Chương 3 mới tới 3.2) rồi thêm chương mới.
- Bảng nhiều cột phải vừa màn hình 390px: tối đa ~3–4 cột ngắn; bảng rộng thì tách thành nhiều bảng nhỏ.
- Lỗi trong tài liệu: soạn theo kiến thức đúng và ghi chú lỗi trong `e`.

## Định dạng câu hỏi (ngân hàng câu hỏi dạng `{ q, a, w: [3 phương án sai], e, sec?, table?, calc? }`)
- Phương án sai phải dài tương đương đáp án đúng (đáp án đúng "dài rõ rệt nhất" — dài hơn 1,15 lần phương án sai dài nhất — chỉ nên chiếm ≤ 25% số câu).
- Câu đúng/sai: `tf: true` (hoặc helper `TF(q, a, w, e)`), đúng 4 phương án gồm **2 phương án "Đúng, vì …" và 2 phương án "Sai, vì …"**.
- Bảng số liệu: `table: [[nhãn, giá trị], …]` cho bảng 2 cột; bảng nhiều cột dùng `{ head: [...], rows: [[...]], note }` để các cột thẳng hàng.
- Câu cần tính toán sẽ tự hiện máy tính nếu đề có số kèm đơn vị (đồng, tỷ, triệu, tr.đ, %, …) và đáp án có chữ số; nếu không nhận ra thì thêm `calc: true`.
- Phần nào cũng là một mục riêng trong mảng `PARTS`; thêm phần mới vào **cuối nhóm** để không đổi số thứ tự các phần cũ; thêm màu `--cN` (3 chỗ: nền sáng, tối tự động, tối thủ công) nếu số phần vượt số màu.

## Trước khi commit
- Kiểm tra cú pháp và chạy thử bằng Playwright: mọi câu sinh ra đủ phương án, đáp án nằm trong phương án, không trùng câu hỏi, không lỗi trang, không tràn ngang ở bề rộng 390px.
- Cập nhật bảng số câu trong `README.md`.
