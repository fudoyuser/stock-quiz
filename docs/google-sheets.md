# Lưu tiến độ bằng Google Sheet + Apps Script

Dùng Sheet của bạn để tự lưu và lấy lại tiến độ trên nhiều máy. Không cần tạo dự án Google Cloud hay OAuth Client ID. Bạn chỉ cấp quyền chạy Apps Script một lần bằng tài khoản sở hữu Sheet.

## Thiết lập một lần

1. **[Tạo Google Sheet tại đây](https://sheets.new)**, đặt tên tùy ý, ví dụ **Tiến độ Bảng Điện Quiz**. Giữ quyền chia sẻ Sheet ở **Restricted / Bị hạn chế**.
2. Trong Sheet, mở **Extensions / Tiện ích mở rộng → Apps Script**. Xóa mã mẫu trong `Code.gs`, rồi **[dán đoạn khởi tạo ngắn này một lần](https://raw.githubusercontent.com/fudoyuser/stock-quiz/main/apps-script/Bootstrap.gs)**. Lưu lại. Đoạn khởi tạo tự lấy mã xử lý từ repository của bạn; các bản cập nhật mã xử lý sau đó không cần sao chép lại hay triển khai lại. Script dùng runtime **V8** (mặc định của dự án mới).
3. Chọn hàm **`setup`** trong thanh công cụ Apps Script → **Run / Chạy** và cấp quyền bằng tài khoản của bạn. Hàm này tạo hai tab:
   - **Progress:** nơi website tự lưu dữ liệu.
   - **Kết nối:** có **Mã đồng bộ** được tạo riêng cho Sheet của bạn. Chạy `setup` lại sẽ giữ mã và tiến độ đã có.
4. Bấm **Deploy / Triển khai → New deployment / Lượt triển khai mới → Web app / Ứng dụng web**:
   - **Execute as / Thực thi với tư cách:** **Me / Tôi**.
   - **Who has access / Ai có quyền truy cập:** **Anyone / Bất kỳ ai**.
   - Bấm **Deploy**, sao chép **Web app URL** kết thúc bằng **`/exec`**. Đây là đường dẫn Apps Script, không phải link mở Sheet và không phải URL `/dev`.
5. Mở [website quiz](https://fudoyuser.github.io/stock-quiz/). Ngay dưới dải thống kê, mở **Kết nối Google Sheet**, dán **đường dẫn `/exec`** và **Mã đồng bộ** ở bước 3, rồi bấm **Lưu và kết nối**. Chờ thông báo **Đã đồng bộ Google Sheets**.

Trên máy khác, nhập **cùng đường dẫn và cùng mã**. Website tự nhớ kết nối trên từng máy; các lần sau mở trang sẽ tự đọc Sheet, gộp dữ liệu và lưu các lượt học mới. Không cần đăng nhập Google mỗi lần học.

## Không phải sửa mã thủ công mỗi lần cập nhật

Sau khi cài `Bootstrap.gs` và triển khai một lần, mã xử lý được tải qua HTTPS từ `fudoyuser/stock-quiz` trên GitHub và lưu đệm tối đa khoảng một phút. Khi có commit cập nhật `apps-script/Code.gs`, lần đồng bộ sau khi bộ đệm hết hạn sẽ dùng mã mới. Tiến độ, mã đồng bộ và URL `/exec` vẫn giữ nguyên. Để lấy bản mới ngay, tải lại Sheet rồi chọn **Bảng Điện Quiz → Cập nhật từ GitHub**; không cần mở trình sửa mã.

Nếu đã cài bản đầy đủ `Code.gs` trước đây, chỉ cần thay bằng đoạn khởi tạo **một lần**, chạy `setup` và cập nhật lượt triển khai hiện có sang **New version** để giữ nguyên URL `/exec`. Những bản cập nhật mã xử lý sau đó tự đi theo GitHub. Các thay đổi chính đoạn khởi tạo hoặc các quyền Google cần cấp mới vẫn có thể yêu cầu bạn thao tác lại một lần.

Bản tự cập nhật chạy mã từ repository này bằng quyền Apps Script bạn đã cấp. Chỉ cấp quyền ghi repository cho người bạn tin tưởng. Nội dung tiến độ và mã đồng bộ không gửi lên GitHub; yêu cầu tải mã chỉ có URL công khai và thời điểm tải. Nếu GitHub gián đoạn sau khi bộ đệm hết hạn, đồng bộ sẽ báo lỗi và tiến độ tiếp tục giữ trên trình duyệt để thử lại. Muốn cố định một bản mã thay vì tự cập nhật, có thể dùng [bản đầy đủ Code.gs](https://raw.githubusercontent.com/fudoyuser/stock-quiz/main/apps-script/Code.gs).

**Anyone ở bước 4 là quyền gọi Web app, không phải chia sẻ công khai nội dung Sheet.** Script vẫn kiểm tra chữ ký tạo từ mã đồng bộ trước khi đọc/ghi. Người giữ mã có thể đọc/ghi tiến độ trong Sheet này, nên không đăng mã hoặc link chia sẻ có mã lên GitHub/chat công khai. Mã được lưu trong trình duyệt của các máy bạn kết nối và trong tab Kết nối của Sheet riêng; không nằm trong mã nguồn công khai, URL yêu cầu hoặc log của ứng dụng. Không gửi mật khẩu Google cho website.

Nếu tài khoản cơ quan không cho triển khai **Anyone**, cần quản trị viên cho phép Web app hoặc dùng tài khoản Google cá nhân. Google có thể hiện màn hình cấp quyền/cảnh báo ứng dụng chưa xác minh khi bạn chạy script do chính mình tạo; hãy kiểm tra mã đã dán và chỉ cấp quyền nếu đúng dự án của bạn.

## Cách đồng bộ

- Dữ liệu cũ trên trình duyệt được nhập vào Sheet lần đầu, gồm tổng câu, số câu đúng, lịch sử theo ngày, chuỗi ngày học, mục tiêu và điểm các phần.
- Các phiên học mới có mã riêng. Hai máy học độc lập rồi đồng bộ vẫn giữ đủ các phiên; gửi lại sau khi mất phản hồi không đếm trùng.
- Apps Script khóa lúc ghi và gộp dữ liệu trước khi cập nhật Sheet, tránh máy này ghi đè mất phiên của máy kia. Mỗi phiên chỉ giữ một bản bộ đếm hiện tại trong Sheet thay vì nối thêm vô hạn mỗi lần lưu.
- Website kiểm tra lại dữ liệu trong Sheet sau khi gửi. Phản hồi POST không đọc được từ trình duyệt không được dùng làm bằng chứng đã lưu thành công.
- Mất mạng vẫn học được trên máy. Khi có mạng hoặc mở lại trang, website thử kết nối và gửi phần chưa đồng bộ. Chờ dòng **Đã đồng bộ** hoặc bấm **Đồng bộ ngay** trước khi chuyển máy; đóng tab ngay có thể khiến phần mới chỉ còn trên trình duyệt cho đến lần mở sau.
- Khi đang mở, trang kiểm tra thay đổi mỗi phút, khi quay lại tab hoặc bấm nút đồng bộ. **Ngắt kết nối** xóa đường dẫn/mã đã nhớ trên máy này, giữ nguyên tiến độ trên máy và Sheet.
- Một hồ sơ trình duyệt gắn với một Sheet sau lần kết nối đầu để không vô tình trộn dữ liệu của người khác. Dùng cùng Sheet; nếu muốn dùng Sheet khác độc lập, dùng hồ sơ trình duyệt khác.

Lịch sử cũ trước khi có tính năng này chỉ có các số tổng, nên không thể biết chính xác phần nào trùng giữa hai máy từng học độc lập. Khi nhập lịch sử cũ, ứng dụng gộp bảo thủ theo mức lớn nhất thay vì cộng mù hai số tổng; các lượt học mới được đếm riêng đầy đủ.

## Khi gặp lỗi

- **Không truy cập được Apps Script:** kiểm tra URL `/exec`, kết nối mạng, quyền **Anyone** và Web app chạy với tư cách **Me**. Không dùng link trang chỉnh sửa Apps Script hoặc link Google Sheet để điền vào ô này.
- **Mã đồng bộ không đúng:** sao chép lại mã ở tab **Kết nối**, không thêm dấu cách. Đảm bảo mã và URL thuộc cùng một dự án/Sheet.
- **Yêu cầu quá hạn:** bật đồng bộ ngày giờ tự động trên máy, rồi thử lại.
- **Chưa có tab Progress:** chạy `setup` trong dự án gắn với đúng Sheet trước khi triển khai.
- **Bản tự cập nhật chưa lấy mã mới:** tải lại Sheet rồi chọn **Bảng Điện Quiz → Cập nhật từ GitHub**, hoặc chờ khoảng một phút và đồng bộ lại. Nếu vừa thay bản đầy đủ bằng đoạn khởi tạo, cần **Deploy → Manage deployments → Edit → Version: New version → Deploy** một lần. Chỉ bấm Save chưa cập nhật đoạn khởi tạo trong Web app đã triển khai.
- **Tab Progress đã thay đổi cấu trúc:** khôi phục bốn cột **Loại**, **Mã**, **Cập nhật**, **Dữ liệu (JSON)**; không tự sửa các bản ghi JSON đang dùng. Ứng dụng giữ bản trên trình duyệt khi gặp dữ liệu lỗi.

Script chỉ thao tác hai tab của Sheet gắn với dự án. Nếu đã có tab cùng tên chứa dữ liệu khác, `setup` dừng để bạn đổi tên tab đó, không ghi đè. Giới hạn Apps Script/Sheets và dung lượng trình duyệt vẫn áp dụng. Bạn có thể sao lưu Sheet trước khi tự chỉnh script; không đổi mã đồng bộ trừ khi muốn kết nối lại các máy.

## Phát triển và kiểm thử

`apps-script/Bootstrap.gs` là đoạn cài một lần. `apps-script/Code.gs` là bản gộp sẵn của `progress-model.js` và `apps-script/server.js` để đoạn khởi tạo tải và chạy. Sau khi sửa hai file nguồn, tạo lại bản gộp và commit cùng thay đổi:

```sh
node scripts/build-apps-script.cjs
node scripts/build-apps-script.cjs --check
node --test tests/*.test.cjs
python3 -m http.server 8000 --bind 0.0.0.0
# Phiên terminal khác, có Python Playwright và Chromium:
python3 tests/google-sync-browser.py
python3 tests/google-sync-browser.py --bootstrap
```

Kiểm thử chạy chính `Code.gs` và `Bootstrap.gs` với các dịch vụ Apps Script giả lập, kiểm tra tải mã mới mà không mất dữ liệu/mã kết nối, kiểm tra chữ ký, khóa ghi, gộp nhiều máy, gửi lại, tự kết nối sau tải lại, mã sai và dữ liệu hỏng. Cần bạn tạo Sheet và triển khai thật để xác minh quyền Google và đường dẫn Web app thực tế; kiểm thử giả lập không thay thế bước này.
