# Số liệu chung tự động qua Google Sheet

Website hiện dùng **một bộ số liệu chung cho tất cả người truy cập**, theo cấu hình của chủ website. Mở trang trên trình duyệt mới là tự tải số liệu từ Sheet, không cần đăng nhập, nhập URL hay mã đồng bộ. Các lượt luyện tập của mọi người được cộng chung; mục tiêu và điểm từng phần cũng dùng chung.

## Cấu hình hiện tại

[shared-config.json](../shared-config.json) đã chứa URL Web app, mã dự án Apps Script và ID Google Sheet do chủ website cung cấp. Dữ liệu dùng chung được ghi đúng Sheet này, không phụ thuộc ID Sheet cũ trong Script Properties. Nếu chưa có tab Progress, lần kết nối đầu sẽ tạo tab và tiêu đề dưới khóa ghi. Đây là cấu hình công khai, không chứa mật khẩu hoặc mã đồng bộ. Dự án hoặc URL Web app được chỉ định trong file này cho phép đọc/ghi số liệu chung qua website. Các bản Apps Script cài trong dự án khác vẫn yêu cầu chữ ký như trước, không tự bị công khai khi mã trên GitHub cập nhật.

Khách truy cập **không phải thiết lập gì**. Nếu Apps Script đã cài bản tự cập nhật `Bootstrap.gs`, nó sẽ lấy mã xử lý mới sau khi bộ đệm hết hạn, khoảng một phút. Sau khi GitHub Pages cập nhật, chỉ cần mở hoặc tải lại website và chờ **Đã đồng bộ Google Sheets · số liệu dùng chung cho toàn website**.

## Chủ website thiết lập một lần

Nếu dự án chưa được thiết lập:

1. [Tạo hoặc mở Google Sheet](https://sheets.new), giữ quyền chia sẻ trực tiếp Sheet ở **Restricted / Bị hạn chế**.
2. Trong Sheet, mở **Extensions / Tiện ích mở rộng → Apps Script**. Trong `Code.gs`, dán [đoạn khởi tạo tự cập nhật](https://raw.githubusercontent.com/fudoyuser/stock-quiz/main/apps-script/Bootstrap.gs) một lần và lưu lại. Runtime dùng **V8**.
3. Chọn hàm **`setup` → Run / Chạy**, cấp quyền bằng tài khoản sở hữu Sheet. Script tạo tab **Progress** để lưu dữ liệu và tab **Kết nối**. Mã đồng bộ trong tab Kết nối chỉ còn cần cho chế độ riêng cũ; **chế độ số liệu chung không dùng mã này**.
4. **Deploy → New deployment → Web app**, chọn **Execute as: Me / Tôi**, **Who has access: Anyone / Bất kỳ ai**, rồi triển khai. Lấy **Web app URL** kết thúc bằng **`/exec`**.
5. Chủ website cập nhật `endpoint`, `scriptId` và `spreadsheetId` trong `shared-config.json` một lần. `spreadsheetId` nằm giữa `/d/` và `/edit` trong link Sheet. `scriptId` lấy từ link dự án `/projects/…/edit`, không phải mã deployment trong URL `/exec`. Khách truy cập sẽ tự dùng cấu hình này trên mọi máy.

Không cần OAuth Client ID. Web app chạy bằng quyền đã cấp cho Apps Script để đọc/ghi Sheet. Nội dung số liệu được công khai qua Web app theo chế độ dùng chung; quyền chỉnh sửa trực tiếp các ô Sheet vẫn do chủ Sheet quản lý.

## Không phải dán lại mã mỗi lần sửa chức năng

`Bootstrap.gs` tự tải mã xử lý qua HTTPS từ `fudoyuser/stock-quiz` trên GitHub, lưu đệm tối đa khoảng một phút. Khi `apps-script/Code.gs` được cập nhật, lần đồng bộ sau khi bộ đệm hết hạn sẽ dùng mã mới. Tiến độ và URL `/exec` giữ nguyên. Muốn lấy bản mới ngay, tải lại Sheet rồi chọn **Bảng Điện Quiz → Cập nhật từ GitHub**.

Nếu trước đây đã cài bản đầy đủ `Code.gs`, cần thay bằng đoạn khởi tạo **một lần**, chạy `setup` và **Deploy → Manage deployments → Edit → New version → Deploy** để giữ cùng URL `/exec`. Sau đó không cần dán lại mã xử lý. Thay đổi chính đoạn khởi tạo hoặc những quyền Google mới vẫn có thể cần thao tác một lần.

Bản tự cập nhật chạy mã từ repository này bằng quyền Apps Script đã cấp; chỉ cấp quyền ghi repository cho người bạn tin tưởng. Yêu cầu tải mã/cấu hình từ GitHub không gửi dữ liệu luyện tập hoặc mã đồng bộ lên GitHub. Khi GitHub gián đoạn sau khi bộ đệm hết hạn, trang giữ lượt học trên máy và thử lại sau.

## Xem kết quả ngay trong Sheet

Tab **Thống kê Quiz** hiển thị tổng số câu, số câu đúng, tỷ lệ đúng, mục tiêu, kỷ lục chuỗi và thời điểm lưu gần nhất; tab này được tạo ở lần kết nối tiếp theo nếu đã có dữ liệu cũ, rồi tự cập nhật khi ghi kết quả. Bấm **Xem thống kê trong Sheet** trên website để mở đúng tab này. Tab **Progress** giữ các bản ghi JSON dùng để gộp dữ liệu. Nếu đang mở tab mặc định của Sheet, chuyển sang một trong hai tab này để xem kết quả. Ứng dụng không ghi đè tab Thống kê Quiz có sẵn chứa dữ liệu không thuộc ứng dụng.

## Dữ liệu và cách gộp

- Tổng số câu, số câu đúng, lịch sử từng ngày, chuỗi ngày học, mục tiêu và điểm từng phần được dùng chung.
- Tiến độ cũ trên trình duyệt được gộp vào lần đầu. Vì lịch sử cũ chỉ có tổng chung, không biết chính xác phần trùng giữa các máy từng học độc lập: phần lịch sử đó được gộp bảo thủ theo mức lớn nhất, không cộng mù mọi số tổng.
- Các lượt trả lời liên tục được gửi theo đợt sau khoảng 1,5 giây từ lượt đầu, không dời mãi thời điểm gửi sau mỗi câu.
- Các phiên học mới có mã riêng. Hai máy học rồi đồng bộ giữ đủ các phiên; gửi lại sau khi mất phản hồi không đếm trùng.
- Apps Script khóa lúc ghi, gộp dữ liệu trước khi cập nhật và giữ một bản bộ đếm hiện tại cho mỗi phiên, tránh ghi đè mất lượt của máy khác.
- Trang đọc lại dữ liệu thật sau khi gửi để xác nhận. Phản hồi POST không đọc được từ trình duyệt không được coi là bằng chứng đã lưu.
- Khi mất mạng, các lượt mới vẫn ở trên máy. Khi kết nối lại, quay lại trang hoặc tải lại, trang tự thử gửi tiếp. Chờ **Đã đồng bộ** hoặc bấm **Đồng bộ ngay** trước khi đóng tab để bảo đảm lượt mới đã lên Sheet.
- Khi đang mở, trang kiểm tra thay đổi mỗi phút và khi quay lại tab. Trình duyệt mới tự tải cấu hình công khai rồi tải số liệu, không dùng cấu hình bí mật trên máy cũ.

## Khi gặp lỗi

**Đang tải / đang gửi / đang xác nhận chưa có nghĩa là đã lưu thành công.** Nút **Kiểm tra kết nối** luôn có sẵn trong chế độ chung và mở Web app với `?action=health`: kết quả cho biết phiên bản máy chủ, ID Sheet thực tế, tab Progress đã có chưa và tổng số câu máy chủ đã nhận. Trang chẩn đoán chỉ đọc, không tạo tab tổng hợp; `hasOverview: false` cùng `total > 0` nghĩa là đã có kết quả trong Progress nhưng chưa có tab tổng hợp. Có thể gửi kết quả này để chẩn đoán; trang chẩn đoán không trả mã đồng bộ. Nếu trang chỉ trả “Callback không hợp lệ”, deployment chưa chạy mã xử lý mới hoặc vẫn đang dùng bản đầy đủ cũ.

Khi Google phản hồi chậm, các lần kiểm tra định kỳ/quay lại tab dùng chung yêu cầu đang chạy, không tự tạo thêm lượt gửi. Nếu gặp lỗi, thông báo lỗi được giữ trong lúc tự thử lại, tới khi xác nhận đồng bộ thành công.


- **Không truy cập được Apps Script:** kiểm tra URL `/exec`, mạng, quyền **Anyone** và Web app chạy với tư cách **Me**. Link `/edit` và `/dev` không phải URL triển khai dùng trên website.
- **Web app chưa được chọn làm nguồn số liệu chung:** kiểm tra `scriptId` đúng dự án hoặc `endpoint` đúng URL triển khai trong `shared-config.json`. Cấu hình chỉ chọn dự án dự định công khai.
- **Máy chủ chưa bật số liệu chung hoặc yêu cầu không hợp lệ:** kiểm tra dự án đã cài `Bootstrap.gs` và lượt triển khai đang dùng bản khởi tạo. Nếu vẫn là bản đầy đủ cũ, chuyển sang bản khởi tạo một lần theo hướng dẫn trên.
- **Yêu cầu quá hạn:** bật đồng bộ ngày giờ tự động của máy rồi thử lại.
- **Chưa có tab Progress:** chế độ chung sẽ tự khởi tạo tab nếu `spreadsheetId` đã cấu hình. Nếu Google từ chối mở Sheet, kiểm tra tài khoản chạy Web app có quyền chỉnh sửa Sheet đích.
- **Chưa lấy mã mới:** trong Sheet chọn **Bảng Điện Quiz → Cập nhật từ GitHub**, hoặc chờ khoảng một phút và đồng bộ lại. Nếu chính đoạn khởi tạo vừa thay đổi, cần tạo **New version** cho deployment.
- **Tab Progress đã đổi cấu trúc:** khôi phục bốn cột **Loại**, **Mã**, **Cập nhật**, **Dữ liệu (JSON)**. Không sửa các bản ghi JSON đang dùng. Khi gặp dữ liệu lỗi, ứng dụng giữ bản trên máy và không ghi đè vào Sheet.

`setup` không ghi đè tab Progress/Kết nối có sẵn chứa nội dung khác. Giới hạn Google Apps Script, Sheets và dung lượng trình duyệt vẫn áp dụng.

## Tương thích chế độ riêng trước đây

Mã vẫn hỗ trợ những bản cài riêng có kiểm tra chữ ký. Nếu chủ một bản sao website chọn `mode: "private"` trong file cấu hình, giao diện kết nối URL/mã trên từng máy được bật lại. Website này đang chọn **shared**, nên những ô đó được ẩn và không có bước nhập thông tin.

## Phát triển và kiểm thử

`apps-script/Bootstrap.gs` chỉ cài một lần. `apps-script/Code.gs` gộp `progress-model.js` và `apps-script/server.js`; khi sửa nguồn, tạo lại bản gộp và commit cùng thay đổi:

```sh
node scripts/build-apps-script.cjs
node scripts/build-apps-script.cjs --check
node --test tests/*.test.cjs
python3 -m http.server 8000 --bind 0.0.0.0
# Phiên terminal khác, có Python Playwright và Chromium:
python3 tests/google-sync-browser.py --bootstrap --shared
python3 tests/google-sync-browser.py --bootstrap
```

Kiểm thử chạy chính Code.gs/Bootstrap.gs với các dịch vụ Apps Script giả lập, gồm ba trình duyệt mới không nhập thông tin, gửi liên tục khi vẫn đang luyện, gắn đúng Sheet dù Script Properties cũ hoặc chưa được tạo, tab thống kê dễ đọc, trang chẩn đoán, cộng lượt trên nhiều máy, khôi phục mạng, gửi lại, khóa ghi, dữ liệu lỗi và bảo vệ các dự án không được chọn công khai. Kết nối Google thực tế còn phụ thuộc quyền triển khai của chủ Sheet và khả năng truy cập dịch vụ; kiểm thử giả lập không thay thế kiểm tra trên Web app thật.
