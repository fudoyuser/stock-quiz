# Đồng bộ tiến độ bằng tài khoản Google

Sau khi chủ website hoàn tất thiết lập một lần, bạn chỉ cần bấm **Đăng nhập Google** ở dưới dải thống kê. Website tạo Google Sheet **Bảng Điện Quiz — Tiến độ học tập** trong Drive riêng của bạn. Trên máy khác, mở cùng website và đăng nhập cùng tài khoản Google để lấy lại tiến độ.

Sheet không cần chia sẻ công khai. Website chỉ xin quyền `drive.file`: đọc/ghi những tệp do ứng dụng tạo hoặc được người dùng cấp cho ứng dụng, không xin quyền toàn bộ Drive. Không có Client Secret hay khóa dịch vụ trong mã website. Access token chỉ giữ trong bộ nhớ của tab, không lưu vào localStorage, Sheet hoặc GitHub.

## Chủ website thiết lập một lần

1. Mở [Google Cloud Console](https://console.cloud.google.com/), đăng nhập tài khoản Google của bạn và tạo/chọn một dự án.
2. Trong **APIs & Services → Library**, bật **Google Sheets API** và **Google Drive API** cho dự án đó.
3. Mở **Google Auth Platform**. Điền tên ứng dụng (ví dụ **Bảng Điện Quiz**), email hỗ trợ và email liên hệ. Chọn Audience phù hợp; với tài khoản Gmail cá nhân, dùng **External**. Nếu đang ở chế độ **Testing**, thêm email Google bạn sẽ dùng trên các máy vào **Test users**. Những tài khoản chưa được thêm sẽ không đăng nhập được trong chế độ này.
4. Trong **Data Access**, khai báo phạm vi `https://www.googleapis.com/auth/drive.file`. Ứng dụng dùng quyền này để tạo, tìm lại và đọc/ghi Sheet của chính nó.
5. Trong **Clients**, tạo **OAuth client ID → Web application**. Thêm **Authorized JavaScript origins**:
   - `https://fudoyuser.github.io`
   - Khi phát triển trên máy: `http://localhost:8000` và `http://127.0.0.1:8000` nếu cần.

   Origin chỉ gồm giao thức, tên miền và cổng; **không thêm `/stock-quiz/`**. Luồng cửa sổ đăng nhập này không cần cấu hình Redirect URI. Nếu bạn đổi tên miền website, thêm origin mới tại đây.
6. Sao chép **Client ID** kết thúc bằng `.apps.googleusercontent.com` vào [google-config.js](../google-config.js):

   ```js
   window.BDQ_GOOGLE_CLIENT_ID = "CLIENT_ID_CUA_BAN.apps.googleusercontent.com";
   ```

   Đây là mã định danh công khai, được phép lưu trong repository. **Không sao chép Client Secret, mật khẩu hay khóa JSON của service account.** Dùng cùng một Client ID trên mọi máy để ứng dụng tìm lại đúng Sheet. Nếu đã có Client ID, bạn chỉ cần cung cấp mã công khai này để cấu hình website.
7. Commit thay đổi và cập nhật GitHub Pages. Tải lại website, bấm **Đăng nhập Google**, chọn tài khoản có trong Test users và cấp quyền. Dòng trạng thái phải hiện **Đã đồng bộ Google Sheets**; nút **Mở Google Sheet** sẽ dẫn tới bản lưu trong Drive của bạn.

Các thay đổi cấu hình Google có thể cần một lúc để có hiệu lực. Với lỗi `origin_mismatch`, kiểm tra chính xác origin ở bước 5; với lỗi 403, kiểm tra hai API, Test users và quyền đã cấp. Để người dùng rộng rãi đăng nhập, chủ dự án cần cấu hình Audience/Publishing và đáp ứng yêu cầu Google hiển thị trong Console.

Tài liệu Google: [GIS cho ứng dụng web](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [quyền Drive theo tệp](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [ghi dữ liệu Sheets](https://developers.google.com/workspace/sheets/api/guides/values).

## Dữ liệu được đồng bộ

- Tổng số câu, số câu đúng, số câu từng ngày và kỷ lục chuỗi học.
- Mục tiêu ngày, điểm lượt gần nhất và điểm cao nhất của từng phần.
- Bản sao hiện có trên trình duyệt được nhập lần đầu; không cần bắt đầu lại từ 0.

Từ phiên bản này, các lượt học mới có mã phiên riêng. Website gộp bộ đếm của các phiên, nên luyện trên hai máy rồi đồng bộ không làm đếm trùng một phiên hoặc ghi đè mất phiên của máy kia. Các bản ghi được nối thêm vào Sheet và gộp theo mã; thử gửi lại sau khi mất mạng không cộng trùng. Nếu hai máy từng học độc lập **trước khi có tính năng này**, dữ liệu cũ chỉ có số tổng, không đủ thông tin để biết câu nào trùng: phần lịch sử cũ được gộp bằng mức lớn nhất, không cộng mù toàn bộ số tổng. Số câu đúng cũ vì thế không thể tái dựng chính xác trong mọi trường hợp; các câu học mới được đếm riêng đầy đủ.

Khi mở trang mới hoặc phiên Google hết hạn, bấm đăng nhập lại để kết nối. Tiến độ vẫn lưu trên máy khi mất mạng, Google lỗi hoặc khi ngắt kết nối; đăng nhập lại cùng tài khoản sẽ gộp và gửi các lượt chưa lưu. Website không hứa hoàn tất gửi nếu bạn đóng tab ngay: hãy đợi dòng **Đã đồng bộ** hoặc bấm **Đồng bộ ngay** trước khi chuyển máy. Máy đang mở trang sẽ kiểm tra thay đổi mỗi phút, khi quay lại tab hoặc khi bấm nút đồng bộ.

Mỗi hồ sơ trình duyệt gắn với một tài khoản Google sau lần kết nối đầu. Để dùng tài khoản Google khác mà không trộn tiến độ, dùng hồ sơ trình duyệt riêng. **Ngắt kết nối** dừng kết nối trên tab hiện tại, không xóa bản trên máy hay bản trong Sheet. Có thể thu hồi quyền ứng dụng trong phần kết nối ứng dụng của tài khoản Google.

Tab `Progress` là dữ liệu đồng bộ gồm bốn cột **Loại**, **Mã**, **Cập nhật**, **Dữ liệu (JSON)**. Bạn có thể sao lưu Sheet, nhưng không sửa/xóa các cột hoặc bản ghi đang dùng để đồng bộ. Không đổi tên tab `Progress` và không xóa app metadata bằng công cụ khác. Nếu hai máy tạo Sheet cùng lúc, ứng dụng tìm, gộp dữ liệu từ các bản của cùng ứng dụng rồi tiếp tục ghi vào bản lâu đời nhất. Giới hạn và quota Google Sheets vẫn áp dụng; chưa có cơ chế nén lịch sử Sheet tự động.

## Chạy kiểm tra

```sh
node --test tests/progress-model.test.cjs
python3 -m http.server 8000 --bind 0.0.0.0
# Trong phiên terminal khác, với Python Playwright và Chromium đã cài:
python3 tests/google-sync-browser.py
```

Các kiểm thử trình duyệt giả lập Google Identity Services và hai API để kiểm tra nhập tiến độ, hai máy, học offline, gửi lại, phiên hết hạn và dữ liệu lỗi. Cần hoàn tất cấu hình và đăng nhập thật để xác nhận kết nối với Google của bạn; kiểm thử giả lập không thay thế bước này.
