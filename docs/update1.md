# MASTER PROMPT — HOÀN THIỆN MXH THEO TỪNG PHASE, TỐI ƯU HIỆU NĂNG VÀ CHUẨN BỊ DEPLOY

## 0. Bối cảnh và mục tiêu

Bạn đang làm việc trên repository mạng xã hội:

- Repository: `https://github.com/xanhnq05/MXH`
- Branch cần làm việc: `audit/phase0-3-foundation`
- Frontend: React 19, Vite, TypeScript, Tailwind CSS 4, Zustand, React Router, Axios, Socket.IO client.
- Backend: Express 5, Node.js, Mongoose/MongoDB, Socket.IO, Zod, Supabase Storage/S3-compatible.
- Cache và queue đã có nền tảng Redis/ioredis và BullMQ; cần kiểm tra mức độ hoạt động thực tế trước khi mở rộng.
- Test frontend: Vitest; backend: Jest/Supertest.
- Có các kế hoạch và báo cáo đã lưu trong repository. Các tài liệu này là đầu vào để đối chiếu, không phải bằng chứng tuyệt đối rằng chức năng đã hoạt động.

**Mục tiêu:** hoàn thiện các chức năng mạng xã hội, cải thiện cache, rate limiting, pagination, upload/chỉnh sửa ảnh, bài viết chỉ có text, video/Reels, bảo mật, giám sát và quy trình deploy. Phải thực hiện theo thứ tự phụ thuộc kỹ thuật, giữ ổn định những phần đã hoạt động và xác minh từng thay đổi bằng test.

Không được chỉ lập kế hoạch rồi dừng. Sau khi audit, tiếp tục triển khai lần lượt các phase trong phạm vi có thể thực hiện an toàn tại workspace. Nếu bị chặn bởi credential, dịch vụ bên ngoài, giới hạn môi trường hoặc quyết định không thể tự suy ra, hãy ghi rõ trạng thái `BLOCKED` và tiếp tục những phần độc lập.

## 1. Quy tắc làm việc bắt buộc

### 1.1. Bảo vệ branch và thay đổi hiện có

1. Xác minh repository, branch hiện tại, `git status`, `git log --oneline -10` và diff trước khi sửa code.
2. Làm trên branch `audit/phase0-3-foundation`; không chuyển sang `main` để thực hiện tính năng.
3. Không ghi đè hoặc xóa các thay đổi chưa commit của người dùng.
4. Không chạy `git reset --hard`, `git clean -fd`, force-push hoặc thao tác phá hủy lịch sử Git.
5. Không tự merge vào `main`, không push và không commit thay người dùng khi chưa được yêu cầu.
6. Không xóa test cũ chỉ để làm cho test suite pass.
7. Trước khi thêm dependency, kiểm tra thư viện và package đã tồn tại. Chỉ thêm thư viện mới khi có lý do kỹ thuật rõ ràng.
8. Không tự ý thay đổi stack hoặc viết lại toàn bộ kiến trúc.
9. Khi thay đổi API, model hoặc socket event, phải xác định và cập nhật mọi consumer liên quan ở cả frontend lẫn backend.
10. Các chức năng gọi thoại/video hiện có phải được bảo toàn; không mở rộng tính năng call ngoài phạm vi. Chỉ sửa khi có regression trực tiếp do thay đổi mới.

### 1.2. Đọc tài liệu trước khi triển khai

Đọc và đối chiếu tối thiểu:

- `docs/audit-report.md`
- `docs/chat-modernization-plan.md`
- `docs/mxh-social-expansion-plan.md`
- `backend/src/plan.md`
- `frontend/src/plan.md`
- `design-system/mxh-chat/MASTER.md`
- `design-system/mxh-chat/pages/chat.md`
- Prompt cũ được lưu trong repository, đặc biệt `prompt_cursor_mxh_chat.md` nếu còn tồn tại.
- `.cursor/skills/ui-ux-pro-max/SKILL.md` nếu file này có trong workspace.
- `backend/package.json`, `frontend/package.json`, cấu hình Vite, Express, Socket.IO, test, môi trường, storage, cache và queue.

Nếu có nhiều tài liệu mâu thuẫn, ưu tiên theo thứ tự:

1. Code và test hiện tại.
2. Kết quả chạy lệnh/test thực tế.
3. API/schema được các phần trong ứng dụng sử dụng.
4. Kế hoạch và báo cáo cũ.

Không xóa tài liệu cũ chỉ vì thông tin đã lỗi thời. Giữ lại lịch sử khi cần và thêm mục cập nhật để thể hiện trạng thái hiện tại.

### 1.3. Tuyệt đối không tiết lộ credential

Repository đã có dấu hiệu chứa giá trị nhạy cảm trong tài liệu. Xử lý đây là vấn đề bảo mật ưu tiên cao.

- Tìm credential thật trong các file được Git theo dõi và các tài liệu cấu hình.
- Không in giá trị secret ra terminal output, báo cáo, bản tóm tắt, test snapshot hoặc nội dung trả về cho người dùng.
- Nếu phát hiện giá trị có khả năng là secret thật, chỉ ghi tên file, loại secret và mức độ rủi ro; không ghi giá trị.
- Thay credential thật trong tài liệu bằng placeholder rõ ràng, ví dụ `YOUR_MONGODB_URI`, `YOUR_SUPABASE_SECRET_KEY`.
- Giữ `.env.example` ở dạng placeholder; tuyệt đối không đưa `.env` thật vào Git.
- Không tự tuyên bố rằng secret đã an toàn sau khi sửa file hiện tại. Lịch sử Git có thể còn chứa giá trị cũ.
- Không tự xoay vòng credential trên các dịch vụ bên ngoài nếu không có quyền thực hiện. Ghi rõ thao tác người sở hữu dự án phải hoàn thành.
- Kiểm tra `.gitignore`, CI logs, error logs và cấu hình deploy để tránh lộ lại secret.

**Gate bảo mật:** các file hiện tại không được chứa credential thật; báo cáo phải có danh sách hành động thu hồi/thay mới còn lại. Lịch sử Git chưa được làm sạch hoặc credential chưa được xoay vòng phải được ghi thành rủi ro chưa đóng, không được coi là đã khắc phục hoàn toàn.

---

# PHASE 0 — AUDIT LẠI BRANCH VÀ BASELINE

## Mục tiêu

Xác định chính xác hiện tại đã có gì, thiếu gì, lỗi nào tồn tại từ trước và các hạng mục nào thực sự cần triển khai.

### Công việc

1. Xác minh branch, commit mới nhất, trạng thái working tree và file đã thay đổi.
2. Đọc các kế hoạch hiện có và đối chiếu với mã nguồn thật.
3. Kiểm tra cấu trúc backend/frontend, routes, controllers, services, models, middlewares, stores, hooks và các trang UI.
4. Kiểm tra toàn bộ script trong hai `package.json`.
5. Tìm:
   - TODO/FIXME và các stub chưa hoạt động.
   - API chưa có consumer hoặc consumer không có API tương ứng.
   - Mock/fake data được sử dụng thay cho API thật.
   - Handler không được gọi.
   - Middleware không được áp dụng.
   - Cache không có invalidation.
   - Pagination chỉ áp dụng một phần.
   - Upload chưa đồng bộ frontend/backend.
   - Các tài liệu khai báo tính năng hoàn thành nhưng code chưa đáp ứng.
6. Chạy lại baseline test/build/lint hiện có trước khi sửa.
7. Không dựa vào số lượng test ghi trong báo cáo cũ; lấy kết quả mới làm baseline.
8. Phân biệt:
   - Lỗi tồn tại từ trước.
   - Lỗi được tái hiện trong baseline.
   - Lỗi mới do thay đổi hiện tại gây ra.
   - Lỗi bị chặn bởi cấu hình hoặc dịch vụ ngoài.

### Tạo hoặc cập nhật tài liệu

Tạo `docs/mxh-predeploy-plan.md` làm checklist triển khai tổng hợp. Tài liệu phải liên kết và kế thừa các checklist cũ, không thay thế bằng một kế hoạch chung chung.

Mỗi hạng mục cần có các trường:

- ID và tên.
- Ưu tiên `P0/P1/P2`.
- Trạng thái `TODO/IN_PROGRESS/DONE/BLOCKED`.
- Trạng thái xác minh thực tế.
- File/API/schema liên quan.
- Phụ thuộc.
- Lệnh test và kết quả mới nhất.
- Rủi ro còn lại.
- Điều kiện nghiệm thu.

Cập nhật `docs/audit-report.md` bằng phần trạng thái mới, ghi ngày và branch kiểm tra. Không sửa lịch sử cũ thành kết quả mới giả định.

### Điều kiện hoàn thành

- Có baseline mới.
- Có ma trận DONE/PARTIAL/MISSING/BLOCKED.
- Phát hiện các vấn đề bảo mật được ghi nhận.
- Biết chính xác những gì phải làm ở các phase sau.

Sau phase này, tiếp tục triển khai Phase 1; không dừng chỉ để chờ xác nhận.

---

# PHASE 1 — BẢO MẬT, QUYỀN TRUY CẬP VÀ ĐỘ TIN CẬY

Đây là phase ưu tiên trước các cải tiến hiệu năng.

## 1.1. Authentication và authorization

Kiểm tra auth middleware, refresh token, cookie, CORS, kiểm tra quyền sở hữu và tư cách thành viên.

Xác nhận:

- Người chưa đăng nhập không truy cập được endpoint riêng tư.
- Thành viên không thể xem dữ liệu cuộc trò chuyện hoặc media của cuộc trò chuyện mà họ không thuộc về.
- Chỉ owner/admin đúng quyền mới được thay đổi thành viên, vai trò và cài đặt nhóm.
- User chỉ sửa/xóa được dữ liệu phù hợp với quyền của họ.
- Admin media được xác thực bằng backend allowlist hoặc RBAC đáng tin cậy; frontend guard chỉ là UX.
- Không cho client tự gửi `role: admin` để tăng quyền.
- Quy tắc phân quyền áp dụng thống nhất giữa REST API và Socket.IO.

Tạo hoặc mở rộng test cho 401, 403, quyền thành viên, quyền sở hữu và quyền admin.

## 1.2. E2EE — kiểm tra sự thật, không tin tài liệu

Repository có mã hóa liên quan đến E2EE nhưng tài liệu hiện tại nói luồng mã hóa chưa được tích hợp đầy đủ. Cần kiểm tra code đường đi thực tế từ composer đến database và recipient.

Xác minh:

- Text có được mã hóa trên client trước khi gửi không?
- Server có lưu hoặc log plaintext không?
- Recipient có giải mã thành công không?
- Tin nhắn nhóm xử lý khóa cho tất cả thành viên như thế nào?
- File, ảnh, video, sticker/GIF và thumbnail có cùng chính sách phù hợp không?
- Refresh trang hoặc chuyển thiết bị có làm mất khả năng giải mã không?
- Các thao tác delete, retry, message preview và notification có vô tình làm lộ plaintext không?

Không được tuyên bố E2EE đã hoạt động chỉ vì có utility mã hóa hoặc field chứa ciphertext.

Nếu E2EE chưa được tích hợp đầy đủ:

- Viết rõ phần nào được mã hóa và phần nào chưa.
- Không làm yếu mã hóa hoặc đưa plaintext qua backend để thuận tiện xử lý.
- Thiết kế kế hoạch tích hợp và test end-to-end.
- Không bật quảng bá tính năng mã hóa đầu cuối khi chưa chứng minh được toàn bộ luồng.
- Nếu không thể hoàn thiện an toàn trong cùng đợt, phải đánh dấu là blocker trước khi phát hành tính năng tương ứng, hoặc vô hiệu hóa/ghi rõ trạng thái feature flag cho đến khi được tích hợp.

Video transcoding không được đọc plaintext của media E2EE tại server. Nếu cần chỉnh sửa media, thực hiện ở client trước khi mã hóa hoặc xác định một luồng xử lý an toàn có sự đồng thuận rõ ràng.

## 1.3. Upload và storage

Kiểm tra:

- File được kiểm tra MIME, extension, kích thước và nội dung thực tế.
- Không tin MIME do client khai báo.
- Không cho phép path traversal, tên file gây lỗi hoặc truy cập chéo người dùng.
- Private media sử dụng signed URL đúng hạn và kiểm tra quyền trước khi cấp URL.
- Không cache private media công khai.
- Không để lại object mồ côi khi upload thành công nhưng database thất bại.
- Xóa metadata không được tùy tiện xóa object còn được tin nhắn/bài viết khác tham chiếu.
- Nếu thao tác nhiều bước thất bại, cần rollback/cleanup có kiểm soát.

## Điều kiện nghiệm thu

Bảo mật backend có test thực tế; các rủi ro E2EE và secret được mô tả trung thực. Không được bỏ qua lỗ hổng chỉ vì frontend đã ẩn nút tương ứng.

---

# PHASE 2 — CHUẨN HÓA PAGINATION VÀ TÍNH NHẤT QUÁN DỮ LIỆU

Không tối ưu cache trên các API còn trả dữ liệu thiếu hoặc không nhất quán.

## 2.1. Các danh sách phải được kiểm tra

- News feed.
- Comments và replies.
- Conversations/inbox.
- Message history.
- Danh sách Reels.
- Danh sách sticker/GIF/media.
- Danh sách thành viên nhóm, likes hoặc các danh sách lớn khác nếu API đang có.

Tận dụng `backend/src/utils/pagination.js` nếu cách triển khai hiện tại phù hợp. Không tạo nhiều helper pagination trùng chức năng.

## 2.2. Cursor pagination

Với danh sách có thể tăng liên tục, ưu tiên cursor pagination ổn định:

- Sắp xếp có thứ tự xác định, ví dụ `createdAt` kết hợp `_id` làm tie-breaker.
- Cursor phải được validate và không dựa vào dữ liệu client tùy ý.
- Giới hạn `limit` tối đa ở backend.
- Định dạng phản hồi nhất quán, bao gồm dữ liệu, next cursor và trạng thái còn trang.
- Không tải toàn bộ dữ liệu rồi mới cắt trang ở frontend.
- Tạo index phù hợp với query thực tế.
- Kiểm tra hiệu năng bằng dữ liệu nhiều bản ghi, không chỉ dữ liệu seed nhỏ.

Nếu API đã có cursor ổn định và đủ test, giữ nguyên hợp đồng để tránh refactor không cần thiết.

## 2.3. Infinite scroll và realtime deduplication

Khi API phân trang và Socket.IO cùng cập nhật một danh sách:

- Không hiển thị trùng item nếu cùng bản ghi đến qua HTTP và socket.
- Xử lý item đến muộn khi người dùng đang cuộn danh sách cũ.
- Không tự chèn item vào trang hiện tại nếu thao tác đó làm sai thứ tự.
- Khi đổi filter hoặc chuyển user/conversation, hủy request cũ hoặc bỏ kết quả không còn hợp lệ.
- Có loading ban đầu, loading khi tải thêm, empty, retry/error và end-of-list.
- Không gọi liên tục cùng một trang khi request trước chưa hoàn thành.
- Giữ vị trí cuộn hợp lý khi thêm dữ liệu đầu hoặc cuối danh sách.

Không gắn thêm thư viện pagination chỉ vì tiện nếu code hiện tại có thể được chuẩn hóa an toàn.

## Test bắt buộc

- Có nhiều bản ghi cùng timestamp.
- Tải nhiều trang liên tiếp không mất hoặc trùng item.
- Không có dữ liệu mới thì dừng tải tiếp.
- Cursor không hợp lệ bị từ chối rõ ràng.
- Socket event trùng với item API không tạo bản sao.
- Chuyển conversation trong lúc request cũ đang chạy không đưa lịch sử cũ vào conversation mới.

---

# PHASE 3 — CACHE NHIỀU TẦNG VÀ GIẢM REQUEST THỪA

Repository đã có nền tảng Redis/cache và một số cache cho feed/comment. Trước tiên phải đọc code `backend/src/libs/cache.js`, các service đang dùng cache, key và invalidation.

Mục tiêu là **giảm thời gian phản hồi và tải backend mà không hiển thị dữ liệu cũ sai hoặc làm lộ dữ liệu riêng tư**.

## 3.1. Đo baseline trước khi tối ưu

Ghi lại với môi trường test phù hợp:

- Response time cho feed, conversations, messages và các API thường được gọi khi mở trang.
- Số request trung bình khi vào từng trang.
- Cache hit/miss nếu hệ thống có thể đo.
- Thời gian truy vấn MongoDB cho các endpoint chính.
- Kích thước bundle frontend.
- Hành vi khi Redis unavailable.

Không tuyên bố tăng hiệu năng nếu chưa đo hoặc chưa có phương pháp kiểm chứng.

## 3.2. Frontend cache và request deduplication

Kiểm tra kiến trúc Axios + Zustand hiện có.

Triển khai nếu phù hợp:

- Dedupe các request GET giống nhau đang chạy đồng thời.
- Giữ dữ liệu hiển thị cũ trong lúc refresh khi không có rủi ro về dữ liệu riêng tư.
- Tránh gọi API lặp lại do component mount/unmount, dependency sai hoặc nhiều component cùng yêu cầu dữ liệu.
- Dùng stale time/TTL hợp lý theo loại dữ liệu.
- Phân biệt dữ liệu public, dữ liệu theo user và dữ liệu theo conversation.
- Hủy hoặc bỏ kết quả request cũ khi user đăng xuất, đổi tài khoản hoặc chuyển context.
- Sau khi Like, Unlike, Comment, Delete, chỉnh sửa bài, thay avatar hay thay quyền nhóm, cập nhật cache liên quan.
- Nếu request thất bại, rollback optimistic update về trạng thái đúng.

Không bắt buộc thêm TanStack Query. Trước tiên kiểm tra các vấn đề có thể xử lý bằng kiến trúc hiện tại. Chỉ đề xuất thêm thư viện nếu lợi ích vượt chi phí migration, và không migration toàn bộ ứng dụng trong một phase nhỏ.

## 3.3. Backend Redis cache

Phân loại cache:

- Feed và danh sách dữ liệu đọc nhiều.
- Metadata công khai như sticker/GIF active.
- Dữ liệu tham chiếu ít thay đổi.
- Dữ liệu cá nhân và dữ liệu cuộc trò chuyện.
- Kết quả tìm kiếm có thể cache ngắn hạn nếu khóa cache đủ chính xác.

Yêu cầu:

1. Key phải phân biệt đúng user, quyền xem, filter, sort, cursor và các tham số ảnh hưởng kết quả.
2. Không dùng chung cache feed cá nhân cho các user khác nhau nếu quyền hiển thị khác nhau.
3. Cấu hình TTL phù hợp theo tính chất dữ liệu.
4. Invalidate cache sau thao tác ghi liên quan.
5. Có cơ chế tránh cache stampede nếu thực tế cần.
6. JSON/cache serialization phải xử lý lỗi an toàn.
7. Redis timeout hoặc lỗi phải degrade gracefully cho những endpoint có thể chạy không cache.
8. Không trả dữ liệu cache lỗi hoặc cache cũ một cách âm thầm khi điều đó vi phạm quyền riêng tư.
9. Không cache mutation response như thể đó là nguồn dữ liệu chính.
10. Không thêm cache cho endpoint chưa có lý do hiệu năng.

Dùng Redis hiện có nếu phù hợp. Không tạo nhiều Redis client hoặc nhiều cách quản lý connection không thống nhất.

## 3.4. HTTP/browser/CDN cache

Kiểm tra cache headers cho từng nhóm tài nguyên.

- Static asset có hash trong tên file có thể cache dài hạn theo chiến lược build.
- Public sticker/GIF được host ổn định có thể có cache policy phù hợp.
- Private message media, thông tin tài khoản, notification và API nhạy cảm phải có chính sách tránh public caching.
- API cá nhân phải có chiến lược nhất quán cho `Cache-Control`, `ETag` hoặc validator nếu phù hợp.
- Không đặt `public, max-age` rộng rãi cho tất cả endpoint.
- Nếu có CDN, cấu hình không được bỏ qua authentication, quyền truy cập hoặc cache key cần thiết.
- Signed URL hết hạn phải được xử lý đúng ở frontend; không retry vô hạn bằng URL cũ.

## Test bắt buộc

- Cache miss rồi cache hit.
- POST/DELETE/Like/Comment invalidate đúng key.
- User A không nhận cache của user B.
- Redis tắt hoặc mất kết nối không làm ứng dụng chết.
- Cache dữ liệu private không bị trả cho request không được phép.
- Không hiển thị dữ liệu đã xóa sau khi invalidation hoàn tất.

Cập nhật `docs/mxh-predeploy-plan.md` bằng kết quả đo trước/sau. Nếu chưa có Redis hoặc môi trường staging thật, đánh dấu test thật là `BLOCKED`, nhưng vẫn test được logic bằng mock.

---

# PHASE 4 — RATE LIMIT HỢP LÝ, KHÔNG GÂY KHÓ CHỊU KHI LOAD TRANG

Mục tiêu không phải là giảm rate limit trên toàn hệ thống. Mục tiêu là chống abuse nhưng không chặn người dùng sử dụng bình thường.

## 4.1. Phân loại traffic

Đọc middleware và cấu hình limiter hiện có. Xác định các nhóm:

1. Read API: feed, list, profile, conversations, notifications.
2. Search/autocomplete.
3. Mutations: tạo bài, Like/Unlike, Comment, chỉnh sửa, xóa.
4. Auth: đăng nhập, đăng ký, OTP, reset mật khẩu, refresh.
5. Upload media.
6. Socket.IO events.
7. Sticker/GIF gửi tin nhắn.
8. Admin upload/CRUD và các thao tác nhạy cảm.

Không đặt một hạn mức quá thấp dùng chung cho tất cả các nhóm.

## 4.2. UX khi đạt hạn mức

- Backend trả status `429` với response có cấu trúc.
- Có `Retry-After` header và/hoặc `retryAfterMs` nhất quán.
- Thông báo dễ hiểu, không hiển thị stack trace.
- Frontend đọc thời gian retry từ server.
- Không retry liên tục theo vòng lặp khi nhận 429.
- Không chặn thao tác nhập text hoặc cuộn trang vì một request phụ bị rate limit.
- Với thao tác mutation, disable nút tương ứng trong lúc request đang gửi.
- Giữ draft của người dùng khi thao tác thất bại.
- Không dùng frontend throttle làm cơ chế bảo mật duy nhất.

## 4.3. Giảm việc chạm giới hạn không cần thiết

Trước khi tăng hoặc giảm con số giới hạn, xem lại nguyên nhân phát sinh request:

- API trùng nhau do nhiều component.
- Search gọi theo mỗi ký tự mà thiếu debounce.
- Infinite scroll phát event liên tục.
- Socket reconnect tạo handler/listener bị đăng ký nhiều lần.
- Frontend refresh dữ liệu theo interval quá ngắn.
- Nhiều endpoint cùng tải dữ liệu tương tự.
- Tự động retry các lỗi không thể phục hồi.
- Upload hoặc message submit được gửi nhiều lần.

Sửa nguyên nhân gốc thay vì chỉ tăng giới hạn.

## 4.4. Backend limiter

- Dùng user ID khi đã xác thực; dùng IP làm fallback cho request chưa xác thực.
- Nếu chạy sau proxy/load balancer, cấu hình `trust proxy` đúng với môi trường deploy; không tin header forwarding tùy tiện.
- Nếu chạy nhiều backend instance, dùng distributed store khi cần tính hạn mức thống nhất.
- Có chiến lược riêng cho auth/OTP, upload và media spam.
- Kiểm tra rate limit nhất quán giữa HTTP và Socket.IO.
- Không làm mất giới hạn bảo mật cho auth chỉ vì Redis bị lỗi.
- Document rõ hành vi fallback khi distributed store unavailable.

Giữ quy tắc rate limit sticker/GIF hiện có nếu đúng và được kiểm thử; không để limiter media chặn text, ảnh và file bình thường.

## Test bắt buộc

- Request đọc bình thường không bị chặn khi tải trang theo luồng thực tế.
- Burst vượt hạn mức nhận 429 và thông tin retry chính xác.
- Các user khác nhau có key limit phù hợp.
- Đăng nhập/OTP được giới hạn nghiêm hơn các request đọc thông thường.
- Rate limit không bị bypass chỉ bằng cách chuyển từ HTTP sang socket.
- Frontend không retry thành vòng lặp.

---

# PHASE 5 — HOÀN THIỆN POST, LIKE, COMMENT VÀ BÀI ĐĂNG CHỈ CÓ TEXT

Các tính năng đã có như idempotent Like, soft delete và group RBAC phải được audit lại, không viết mới nếu đang hoạt động đúng.

## 5.1. News feed và post composer

Hoàn thiện luồng tạo, hiển thị, chỉnh sửa, xóa bài theo API thật.

Hỗ trợ:

- Bài viết chỉ có văn bản.
- Bài viết có ảnh/video nếu loại media đó được hỗ trợ.
- Preview trước khi đăng.
- Trạng thái đang gửi, gửi thành công, thất bại và retry.
- Giữ nội dung nháp khi server lỗi.
- Xóa bản preview hoặc thay file trước khi đăng.
- Xác thực quyền sửa/xóa ở backend.
- Hiển thị đúng trạng thái visibility hiện có của post.
- Không tạo post giả khi API lỗi.
- Không gửi cùng post nhiều lần vì double click/retry.
- Khi đăng thành công, feed và cache liên quan được cập nhật đúng.

Không bắt đầu xây dựng Story/status tự biến mất nếu không có đặc tả riêng. Yêu cầu hiện tại là **bài chia sẻ chỉ có text**, không mặc định suy diễn thành một hệ thống Story mới.

## 5.2. Link preview cho bài text — chỉ triển khai nếu phù hợp

Nếu thêm preview link:

- Chỉ phân tích URL hợp lệ theo danh sách scheme cho phép, ưu tiên HTTPS.
- Backend không được fetch URL tự do mà không chống SSRF.
- Chặn localhost, IP private/internal, metadata endpoint và các địa chỉ nguy hiểm.
- Chống redirect sang địa chỉ bị chặn và giới hạn response size, timeout, content type.
- Không thực thi HTML của trang nguồn.
- Render title, description và thumbnail theo quy tắc an toàn.
- Có fallback khi nguồn không trả metadata.
- Cache metadata theo URL sau khi được kiểm tra.
- Không yêu cầu người dùng chờ preview rồi mới có thể đăng text.
- Không gọi fetch preview mỗi lần component render.
- Có thể trì hoãn/đẩy metadata fetching sang worker nếu kiến trúc hiện tại phù hợp.

Nếu không thể triển khai an toàn, giữ tính năng text-only hoạt động và ghi link preview là chưa hoàn thành, thay vì tạo một endpoint dễ bị SSRF.

## 5.3. Like/Unlike

- Giữ tính idempotent.
- Một user không tạo nhiều Like cho cùng một post.
- Unique index và logic xử lý race condition phải nhất quán.
- Optimistic update trên frontend; rollback nếu request thất bại.
- Double click hoặc retry không tăng count nhiều lần.
- Đồng bộ số lượng và trạng thái sau khi nhận kết quả backend.
- Realtime update không làm tăng count hai lần.
- Xóa post hoặc thay quyền không để Like UI trở thành dữ liệu sai.

## 5.4. Comment và reply

- Thêm, sửa, xóa theo quyền.
- Replies theo cấu trúc hiện tại; không tự mở rộng thành cây bình luận vô hạn nếu schema chưa hỗ trợ.
- Phân trang cho comment list lớn.
- Optimistic update và rollback.
- Không cho comment vào post đã bị xóa hoặc không được xem.
- Không nhân đôi comment giữa API và Socket.IO.
- Soft delete phải render trạng thái đúng và không làm hỏng thread.
- Validate nội dung rỗng, giới hạn độ dài và rate limit spam.
- Tránh reload toàn bộ feed khi chỉ có một comment được thay đổi.

## 5.5. Group chat và quyền thành viên

Đọc implementation RBAC hiện có trước khi sửa. Xác minh Owner/Admin/Member:

- Tạo nhóm.
- Đổi tên/thông tin nhóm.
- Thêm/xóa thành viên.
- Gán và thu hồi Admin.
- Chuyển quyền Owner.
- Owner rời nhóm.
- Thành viên tự rời nhóm.
- Kiểm tra quyền với mọi HTTP endpoint và socket event.
- Không cho người ngoài truy cập dữ liệu nhóm.
- Không để lịch sử hoặc khóa E2EE bị hỏng khi thay đổi membership.

Bổ sung test cho các trường hợp biên còn thiếu. Không chỉ kiểm tra UI ẩn nút.

---

# PHASE 6 — CHỈNH SỬA ẢNH TRƯỚC KHI UPLOAD

Mục tiêu: cho người dùng xem và chỉnh ảnh trước khi đăng, không thay đổi âm thầm file hoặc gửi nhiều lần.

## 6.1. UI/UX

Tích hợp vào luồng tạo bài viết và các luồng upload ảnh khác nếu phù hợp với thiết kế hiện tại:

- Chọn một hoặc nhiều ảnh theo giới hạn hiện có.
- Preview trước khi upload.
- Crop ảnh.
- Xoay ảnh trái/phải.
- Căn chỉnh khung crop.
- Xóa một ảnh khỏi danh sách chờ đăng.
- Thay ảnh.
- Hủy thao tác chỉnh sửa.
- Hiển thị tiến trình chuẩn bị, nén và upload.
- Báo lỗi với nguyên nhân dễ hiểu.
- Responsive cho desktop và mobile.

Ưu tiên màu cam và design tokens hiện có, không tạo một giao diện khác biệt khỏi design system.

## 6.2. Xử lý ảnh

- Kiểm tra kích thước, MIME/extension trước khi xử lý.
- Xử lý orientation/EXIF phù hợp.
- Có giới hạn độ phân giải và kích thước đầu ra theo nhu cầu thực tế.
- Dùng client-side processing để giảm dung lượng trước khi upload khi phù hợp.
- Không tự động xóa bản gốc vĩnh viễn nếu sản phẩm đang cần giữ bản gốc. Xác định rõ khi nào chỉ dùng ảnh đã chỉnh sửa và khi nào cần lưu original.
- Không upload ảnh mỗi lần người dùng thay đổi crop; chỉ tạo đầu ra cuối cùng khi họ xác nhận.
- Không upload cùng một ảnh hai lần vì hai component cùng xử lý.
- Giải phóng `ObjectURL` và tài nguyên ảnh khi preview bị xóa hoặc component unmount.
- Xử lý file HEIC/HEIF không hỗ trợ bằng thông báo rõ ràng hoặc conversion path đã được xác minh.
- Không bỏ qua validation server chỉ vì file được xử lý ở client.

Nếu ảnh thuộc luồng E2EE, chỉnh sửa trước khi mã hóa ở client. Không đưa plaintext ảnh riêng tư lên server để xử lý mà không có thiết kế và đồng thuận phù hợp.

## Test bắt buộc

- Ảnh hợp lệ, ảnh quá lớn, file sai MIME và file không đọc được.
- Crop/rotate cho ra ảnh đúng.
- Hủy edit không làm hỏng ảnh gốc đang chọn.
- Upload thành công tạo một media record đúng.
- Upload thất bại không làm mất draft.
- Object URL được giải phóng.
- Không có upload trùng.

---

# PHASE 7 — VIDEO UPLOAD, NÉN VÀ TRANSCODING

Yêu cầu sản phẩm:

- Kích thước media được tải lên/lưu theo giới hạn **50 MB cho mỗi file**.
- Thời lượng video tối đa **120 giây**.
- Độ phân giải video đầu ra không vượt quá **720p**.
- Không upscale video nhỏ hơn.
- Không âm thầm cắt ngắn video hoặc xóa nội dung của người dùng.
- Đảm bảo các chức năng upload ảnh/file hiện tại vẫn hoạt động.

## 7.1. Chốt chính sách kích thước

Giữ giới hạn 50 MB cho file cuối cùng được tải lên/lưu theo hợp đồng API hiện tại.

Nếu file video được chọn lớn hơn 50 MB:

1. Nếu có pipeline nén phía client phù hợp, nén trước khi gửi request upload.
2. Đầu ra phải không vượt 50 MB và video không vượt 720p/120 giây.
3. Nếu không thể đạt yêu cầu sau khi nén, hiển thị lỗi rõ ràng, không upload một file vượt giới hạn.
4. Không âm thầm đẩy file lớn vào endpoint hiện chỉ cho phép 50 MB.
5. Nếu audit cho thấy cần cho phép raw input lớn hơn để server transcode, phải đánh giá lại hợp đồng upload, memory/disk usage, storage cost và nguy cơ DoS. Không tự tăng giới hạn mà không cập nhật policy/tests/docs.

## 7.2. Validation đầu vào

- Xác minh file thực tế, không chỉ extension.
- Kiểm tra kích thước.
- Kiểm tra duration bằng phương thức phù hợp.
- Từ chối video vượt quá 120 giây trừ khi có UI trim đầy đủ được triển khai rõ ràng.
- Validate codec/container cần thiết.
- Chặn media malformed và giới hạn tài nguyên xử lý.
- Thực hiện test sát ranh giới: file ngay dưới, đúng và ngay trên 50 MB; video ngay dưới, đúng và ngay trên 120 giây.

## 7.3. Transcoding

Đọc kiến trúc queue hiện tại. Nếu phù hợp, sử dụng BullMQ/Redis hiện có cho job xử lý video; không chạy tác vụ nặng đồng bộ trong HTTP request.

Pipeline nên có:

1. Nhận file được xác minh.
2. Lưu ở khu vực trung gian có kiểm soát.
3. Tạo job xử lý.
4. Kiểm tra video bằng ffprobe nếu môi trường hỗ trợ.
5. Transcode bằng FFmpeg nếu khả dụng và được cấu hình.
6. Giới hạn độ phân giải đầu ra tối đa 1280×720, giữ aspect ratio, không upscale.
7. Định dạng đầu ra tương thích với trình duyệt mục tiêu, chẳng hạn MP4/H.264/AAC khi phù hợp.
8. Kiểm tra file đầu ra, duration và size sau transcoding.
9. Sinh thumbnail nếu phù hợp.
10. Đưa output vào storage đích.
11. Cập nhật trạng thái job.
12. Xóa file trung gian và cleanup khi lỗi.

Trạng thái job tối thiểu: `pending`, `processing`, `ready`, `failed`.

Phải xử lý worker restart, timeout, job retry và job xử lý trùng mà không tạo nhiều output không cần thiết.

## 7.4. Môi trường deploy

Không giả định môi trường hosting chắc chắn hỗ trợ FFmpeg, binary system package hoặc long-running worker.

- Kiểm tra khả năng thực thi FFmpeg ở môi trường dự kiến.
- Nếu backend web và worker cần tách process, ghi rõ cách chạy chúng.
- Nếu thiếu Redis/worker, không để video nằm vô thời hạn ở trạng thái processing.
- Nếu không có transcoding khả dụng, hiển thị trạng thái/giới hạn thực tế; không giả vờ file đã được nén.
- Không gọi video processing endpoint nhiều lần khi người dùng refresh trang.

## 7.5. Riêng tư

Không dùng server-side transcoding cho plaintext media E2EE. Với media thuộc luồng mã hóa đầu cuối, thực hiện preprocessing ở client trước khi encrypt hoặc ghi rõ giới hạn hỗ trợ.

## Test bắt buộc

- Video hợp lệ dưới 50 MB.
- Video đầu vào lớn hơn giới hạn được nén ở client trước khi gửi, nếu pipeline này được triển khai.
- Không thể nén xuống giới hạn.
- File sai format.
- Duration trên 120 giây.
- Output trên 720p hoặc trên 50 MB bị từ chối trước khi công bố asset.
- Transcoding thành công/thất bại.
- Worker restart hoặc job retry.
- Storage failure và cleanup file trung gian.
- Không tạo duplicate post/video sau retry.

---

# PHASE 8 — TRIỂN KHAI REELS

Reels là trải nghiệm video ngắn dọc, không phải Facebook Page/fanpage. Không thêm fanpage management, livestream, quảng cáo hay chức năng kiếm tiền.

## 8.1. Data/API

- Audit `Post`, media models và các API hiện có.
- Ưu tiên reuse dữ liệu, Like, Comment, ownership và media pipeline.
- Chỉ tạo model mới khi có lý do rõ ràng.
- Không tạo song song hai nguồn dữ liệu post/reel không đồng bộ.
- Nếu dùng cùng post model, xác định rõ loại post và điều kiện hiển thị trong feed thông thường so với Reels.
- Feed Reels phải có cursor pagination.
- Kiểm tra visibility và authorization theo đúng quyền của post.
- Có loading, empty, retry và error state.

## 8.2. UI/UX

- Khung video dọc responsive.
- Thông tin tác giả và nội dung ngắn.
- Nút Like, Comment, Share nếu share đã tồn tại.
- Điều hướng Reels tiếp theo/trước đó theo cách phù hợp.
- Tôn trọng theme và màu cam.
- Không khiến video vượt viewport hoặc che mất thao tác quan trọng trên mobile.
- Dùng loading placeholder và thumbnail trước khi video sẵn sàng.

## 8.3. Playback và hiệu năng

- Chỉ tự động phát video khi nó đang trong viewport và phù hợp với quy tắc autoplay của trình duyệt.
- Tạm dừng video ra khỏi viewport.
- Không để nhiều video phát tiếng đồng thời.
- Xử lý autoplay bị trình duyệt từ chối.
- Ưu tiên lazy loading cho video chưa xem.
- Không tải toàn bộ danh sách video ngay khi mở trang.
- Không tải video độ phân giải cao khi bản 720p đã đủ.
- Cleanup listener, observer và media resource khi component unmount.
- Tránh render lại toàn bộ danh sách khi Like một Reels.

## Test bắt buộc

- Tải Reels theo cursor.
- Play/pause theo viewport.
- Autoplay bị chặn.
- Video lỗi hoặc chưa sẵn sàng.
- Like/Comment đúng post.
- Người dùng không thể xem Reels private khi không có quyền.
- Chuyển trang/unmount không giữ video chạy nền.
- Không nhân đôi dữ liệu Reels với post feed.

---

# PHASE 9 — KIỂM TRA VÀ ĐÓNG CÁC CHECKLIST CHAT CŨ

Không tái triển khai những phần đã hoạt động đúng chỉ vì chúng có tên trong prompt cũ. Đối chiếu code/test và chỉ bổ sung gap thực tế.

Kế thừa `docs/chat-modernization-plan.md`, bao gồm:

- Inbox, conversation panel, message list, smart auto-scroll.
- Composer và xử lý IME tiếng Việt.
- Gửi text, file và ảnh qua luồng hiện tại; không tạo duplicate message.
- Reply, pin, mute, delete và realtime.
- Sticker/GIF tự host, `MediaAsset`, metadata tags/keywords/synonyms.
- Trang admin media, admin-only middleware.
- Debounce và relevance suggestions.
- Chống spam sticker/GIF ở backend.
- Loading, empty, error state.
- Responsive, light/dark mode.
- Các chức năng call phải không bị regression.

## Cần xác minh riêng

1. E2EE được tích hợp thật đến đâu; không suy diễn từ tên file hoặc kế hoạch.
2. `MediaAsset` có sử dụng source of truth nhất quán không.
3. GIF/sticker legacy external URL có lọt vào kết quả suggestion/picker production không.
4. Backend admin CRUD thực sự validate metadata và xử lý cleanup khi storage/database thất bại chưa.
5. Admin routes đều có backend authorization hay chỉ được ẩn ở frontend.
6. Rate limit HTTP và Socket.IO có chung enforcement đúng không.
7. Message/file upload có bị tạo hai message khi retry không.
8. Realtime event có bị đăng ký nhiều listener hoặc broadcast trùng không.
9. Signed URL private media có được cấp sau khi xác minh quyền không.

Không dùng API bên thứ ba thay thế nguồn self-hosted nếu thiết kế hiện tại đã chốt tự host. Không gửi nội dung draft của người dùng đến server hoặc API AI chỉ để gợi ý sticker/GIF nếu điều đó vi phạm E2EE/privacy.

Nếu checklist chat đã pass đầy đủ, đánh dấu `DONE` dựa trên bằng chứng mới và tập trung vào các lỗi chưa được đóng.

---

# PHASE 10 — FRONTEND PERFORMANCE, OBSERVABILITY VÀ CHẤT LƯỢNG CODE

## 10.1. Bundle và rendering

Audit cảnh báo bundle frontend lớn trong `docs/audit-report.md`.

- Chạy production build lại.
- Xác minh file bundle lớn nhất hiện tại.
- Dùng route-level lazy loading/dynamic import cho các trang nặng như admin media, chat hoặc Reels khi phù hợp.
- Chỉ tách chunk khi có lợi, không split tất cả component nhỏ một cách máy móc.
- Kiểm tra dependency chart và bundle analyzer nếu sẵn có.
- Tối ưu kích thước ảnh, thumbnail và video tải trên feed.
- Tránh re-render toàn trang khi thay đổi một Like/message nhỏ.
- Tránh selector Zustand khiến component subscribe vào state rộng không cần thiết.
- Dọn socket listener, timer, observer và URL resource.
- Giữ giao diện phản hồi nhanh trên mobile.

Đo bundle trước/sau, ghi rõ kết quả thay vì chỉ dựa vào cảm giác.

## 10.2. Structured logging

Bổ sung logging có cấu trúc nếu phù hợp với stack:

- Request ID/correlation ID.
- Method, route, status code, duration.
- Error code an toàn và định danh request.
- Tên service/worker và job ID cho tác vụ nền khi cần.
- Không log access token, refresh token, cookie, credential, plaintext tin nhắn, OTP hoặc dữ liệu cá nhân nhạy cảm.
- Không trả stack trace chi tiết cho production client.
- Có phân biệt log dev/production.
- Tránh log các request health check với mức quá ồn.

Nếu cần Sentry hoặc dịch vụ giám sát bên ngoài, tạo tích hợp có thể cấu hình bằng environment variables. Không bắt buộc người dùng phải thêm dịch vụ trả phí nếu có phương án khác đủ dùng.

## 10.3. Health checks và error handling

- Kiểm tra `/api/health` và đảm bảo endpoint trả trạng thái đúng.
- Nếu cần readiness check, phân biệt ứng dụng còn chạy và ứng dụng đã kết nối được các dependency quan trọng.
- Tránh health check gây truy vấn nặng.
- Khi backend shutdown, ngừng nhận request/job mới phù hợp, đóng MongoDB/Redis/socket một cách an toàn.
- Xử lý uncaught errors/unhandled rejections theo chiến lược production, không tiếp tục phục vụ với trạng thái không an toàn.

## 10.4. Lint/type/build

- Kiểm tra lỗi lint hiện có và cấu hình ESLint thực tế.
- Nếu frontend thiếu ESLint config, bổ sung config phù hợp phiên bản ESLint đã cài, không thêm nhiều dependency trùng lặp.
- `backend` có script lint chỉ kiểm tra `src/server.js` thì phải đánh giá độ bao phủ; không gọi đó là lint toàn bộ backend.
- Sửa lỗi type/syntax phát hiện được.
- Phân biệt rõ lỗi cũ và lỗi mới.
- Không tắt TypeScript strict hay vô hiệu hóa hàng loạt rule để pass.

---

# PHASE 11 — PRODUCTION READINESS VÀ DEPLOY

Không mặc định người dùng sẽ deploy lên một nhà cung cấp cụ thể. Trước tiên kiểm tra các service hiện có, sau đó chuẩn hóa theo môi trường mà cấu hình dự án hỗ trợ.

## 11.1. Environment/configuration

- Tạo `.env.example` đầy đủ, chỉ có placeholder.
- Tài liệu hóa biến bắt buộc và tùy chọn.
- Không có secret trong frontend `VITE_*` variables.
- Chỉ expose client-safe Supabase config cho frontend khi thực sự cần; secret/service-role key chỉ ở backend.
- Xác minh JWT secret/TTL, cookie flags, refresh flow.
- Kiểm tra CORS chỉ cho phép origin phù hợp với production.
- Xác minh cấu hình HTTPS, `secure`, `sameSite`, `httpOnly` theo cách xác thực thực tế.
- Kiểm tra API URL và socket URL không phụ thuộc localhost trong production.
- Cấu hình proxy đúng khi dùng load balancer.
- Không in config nhạy cảm khi startup.

## 11.2. Docker và môi trường chạy

Nếu phù hợp với kiến trúc repository, bổ sung hoặc hoàn thiện:

- Backend Dockerfile.
- Frontend production build và cách serve.
- Docker Compose phục vụ development/integration test nếu hữu ích.
- Redis service cho môi trường phát triển, nếu cần.
- Worker process riêng nếu BullMQ dùng cho video processing.
- `.dockerignore`.
- Health check.
- Quy tắc quản lý environment variables.

Không ép dùng một Docker Compose làm production deployment nếu nền tảng deploy có cách quản lý service khác.

## 11.3. GitHub Actions/CI

Tạo hoặc hoàn thiện CI phù hợp:

- Cài dependency bằng lockfile.
- Backend tests.
- Frontend tests.
- TypeScript/production build.
- Lint.
- Có thể thêm kiểm tra migration/schema và kiểm tra dependency/secrets nếu phù hợp.
- Không dùng secret production trong pull-request CI không đáng tin cậy.
- Không tự deploy production từ mọi branch.
- Không làm pipeline phụ thuộc credential cá nhân.
- CI phải báo lỗi thực, không bỏ qua failed tests để tạo trạng thái xanh.

## 11.4. Database/storage operations

- Xác minh index cần thiết.
- Có kế hoạch backup MongoDB.
- Có hướng dẫn khôi phục dữ liệu.
- Có kế hoạch cleanup upload thất bại và orphan objects.
- Xác định cách chạy migration/schema changes an toàn.
- Không tự chạy thao tác xóa dữ liệu production.
- Có chiến lược rollback backend/frontend sau release.
- Không dùng seed script demo để ghi đè dữ liệu đang chạy.

## 11.5. Load test

Dùng công cụ đã có hoặc lựa chọn một công cụ nhẹ phù hợp như k6/Artillery nếu cần.

Đo các kịch bản:

- Load feed.
- Cursor pagination.
- Mở conversations/messages.
- Like và Comment.
- Socket connections/message delivery.
- Upload metadata hoặc upload nhỏ; video processing phải được đo riêng.
- Redis cache hit/miss.
- Redis down/fallback.
- Rate limit dưới tải.

Không chạy tải nặng lên production hoặc service bên ngoài mà chưa được cho phép. Dùng dữ liệu test và môi trường staging. Bắt đầu từ tải vừa phải rồi tăng dần, theo dõi latency/error/CPU/memory/DB connections.

Không tự chọn một ngưỡng hiệu năng tùy ý rồi tuyên bố đạt chuẩn. Ghi baseline, mục tiêu, điều kiện test và kết quả thật.

## 11.6. Staging và smoke test

Viết tài liệu `docs/deployment.md` gồm:

- Các dependency cần tạo.
- Các environment variables cần điền.
- Cách chạy frontend/backend/worker.
- Cách build production.
- Cách áp dụng schema/index/migration nếu cần.
- Cách kiểm tra health.
- Cách chạy smoke test sau deploy.
- Cách xem log mà không lộ dữ liệu nhạy cảm.
- Cách rollback.
- Việc người sở hữu dự án phải thực hiện thủ công.

Không tuyên bố dự án đã deploy thành công nếu mới chỉ build tại local.

---

# PHASE 12 — TỔNG KIỂM THỬ VÀ NGHIỆM THU

Sau từng phase phải chạy test liên quan. Sau khi triển khai các phase cần thiết, chạy full regression.

## 12.1. Backend

Chạy các scripts hiện có trong `backend/`, tối thiểu:

- `npm test`
- `npm run lint`
- Các test unit/e2e liên quan đến cache, queue, rate limit, pagination, auth/RBAC, post, comment, upload, sticker/GIF và socket.

Nếu script chưa bao phủ đủ code, ghi rõ giới hạn và bổ sung kiểm tra phù hợp; không coi một lệnh `node --check src/server.js` là bằng chứng rằng toàn bộ backend đã được kiểm tra.

## 12.2. Frontend

Trong `frontend/`, chạy tối thiểu:

- `npm test`
- `npm run lint`
- `npm run build`

Không ghi PASS nếu lệnh chưa chạy. Ghi rõ số test, kết quả, lỗi và nguyên nhân.

## 12.3. Regression checklist

### Auth và bảo mật

- [ ] Signup/OTP/signin/refresh/signout vẫn hoạt động.
- [ ] 401/403 và quyền sở hữu được kiểm tra.
- [ ] Private media không thể truy cập chéo.
- [ ] Secret không còn trong file được theo dõi.
- [ ] Các secret đã lộ có bước thu hồi/thay mới được ghi rõ.
- [ ] E2EE được mô tả đúng với trạng thái thực tế, không tuyên bố quá mức.

### Feed và bài viết

- [ ] Bài text-only tạo thành công.
- [ ] Ảnh xem trước/chỉnh sửa/upload đúng.
- [ ] Video tuân thủ giới hạn.
- [ ] Like/Unlike idempotent.
- [ ] Comment/reply đúng quyền.
- [ ] Feed pagination không trùng/mất item.
- [ ] Cache được invalidate đúng.
- [ ] Realtime không tạo duplicate item.

### Chat và nhóm

- [ ] Text/file/image gửi và nhận đúng.
- [ ] Retry không gửi trùng message.
- [ ] Pagination lịch sử ổn định.
- [ ] Role Owner/Admin/Member được enforce ở server.
- [ ] Sticker/GIF active hoạt động và gợi ý đúng.
- [ ] Media rate limit không chặn text/file thông thường.
- [ ] Call logic hiện có không bị regression.

### Reels

- [ ] Cursor pagination.
- [ ] Video play/pause theo viewport.
- [ ] Không tải toàn bộ video trước khi cần.
- [ ] Like/comment đúng đối tượng.
- [ ] Quyền xem đúng.

### UX và production

- [ ] Loading/empty/error/retry state.
- [ ] Responsive tại 375, 768, 1024, 1440px.
- [ ] Light/dark theme không lỗi contrast.
- [ ] Không có console error nghiêm trọng.
- [ ] Không có endpoint phụ thuộc localhost trong production.
- [ ] Health check, graceful shutdown và log an toàn.
- [ ] Deploy/runbook và CI có tài liệu.
- [ ] Các hạng mục bị block được ghi rõ.

---

# QUY TẮC CẬP NHẬT TIẾN ĐỘ VÀ THỨ TỰ THỰC HIỆN

Cập nhật `docs/mxh-predeploy-plan.md` sau mỗi phase; cập nhật các checklist chat/social hiện có khi trạng thái thay đổi thực tế.

Mỗi phase phải có:

1. Mục tiêu.
2. Những file/code thay đổi.
3. Các quyết định kỹ thuật quan trọng.
4. Test đã chạy và kết quả thực tế.
5. Các regression được phát hiện và sửa.
6. Việc còn thiếu.
7. Các phụ thuộc bị chặn.
8. Trạng thái cuối `DONE/PARTIAL/BLOCKED`.

Thứ tự mặc định:

1. **Phase 0:** Audit lại branch, xác minh baseline và đối chiếu kế hoạch.
2. **Phase 1:** Secret exposure, authentication, authorization, E2EE và media security.
3. **Phase 2:** Pagination/API contract và realtime deduplication.
4. **Phase 3:** Cache nhiều tầng và cache invalidation.
5. **Phase 4:** Rate limit và giảm request không cần thiết.
6. **Phase 5:** Post text-only, feed, Like, Comment/reply và kiểm tra quyền nhóm.
7. **Phase 6:** Image editor và image upload workflow.
8. **Phase 7:** Video validation, compression/transcoding và background queue.
9. **Phase 8:** Reels.
10. **Phase 9:** Hoàn thiện/test các checklist chat, sticker/GIF và group còn thiếu.
11. **Phase 10:** Bundle, logging, health checks và chất lượng code.
12. **Phase 11:** CI/CD, staging, backup, deployment guide và vận hành.
13. **Phase 12:** Full regression, smoke test và báo cáo nghiệm thu.

Có thể đổi thứ tự các nhiệm vụ nhỏ nếu phát hiện phụ thuộc kỹ thuật, nhưng phải cập nhật lý do trong kế hoạch. Không được bỏ một phase âm thầm.

Nếu task quá lớn đối với một lần xử lý, ưu tiên hoàn thành một phase đến trạng thái có thể kiểm chứng, cập nhật tiến độ rồi tiếp tục từ phase tiếp theo. Không tạo một diff khổng lồ chưa được kiểm thử.

# DEFINITION OF DONE — ĐIỀU KIỆN HOÀN THÀNH

Đợt triển khai chỉ được coi là hoàn thành khi:

- Các checklist chat/social cũ đã được đối chiếu với code; những phần còn thiếu được xử lý hoặc ghi BLOCKED.
- Bài đăng chỉ có text, Like, Comment/reply, nhóm chat và quyền thành viên hoạt động với API thật.
- Image editor được tích hợp vào luồng upload và có validation/error handling.
- Video tuân thủ giới hạn size/duration/resolution bằng pipeline có thể xác minh.
- Reels có cursor pagination và quản lý playback theo viewport.
- Cache được kiểm thử về hit/miss, invalidation, private data isolation và Redis failure.
- Rate limit phân loại theo endpoint/event, có `Retry-After` và không gây retry loop.
- Các danh sách lớn dùng pagination ổn định và không duplicate dữ liệu khi kết hợp realtime.
- Auth, authorization, upload, private media và E2EE được kiểm tra đúng mức thực tế.
- Không có credential thật trong file hiện tại được Git theo dõi; trạng thái thu hồi secret từng bị lộ được ghi rõ.
- Backend/frontend tests, lint và production build có kết quả chạy mới.
- Có hướng dẫn deploy, environment setup, health check, backup/rollback và CI.
- Những gì chưa làm được được ghi đúng là `PARTIAL/BLOCKED`, không được đánh dấu hoàn thành chỉ để làm đẹp báo cáo.

# BẮT ĐẦU

Bắt đầu ngay tại workspace đang mở trên branch `audit/phase0-3-foundation`.

Đọc kế hoạch và code local, kiểm tra Git status, xử lý vấn đề lộ credential trước, chạy baseline rồi triển khai tuần tự từ Phase 0 đến Phase 12 theo khả năng môi trường.

Không chỉ trả về bản kế hoạch. Phải thực hiện thay đổi code, chạy kiểm thử, cập nhật checklist và cung cấp báo cáo bàn giao dựa trên kết quả thực tế.

Không hiển thị bất kỳ credential nào trong output. Không tự push/merge/force-push. Không làm hỏng các thay đổi đang có hoặc thao tác phá hủy dữ liệu production.

Nếu một việc đòi hỏi người sở hữu phải thay credential hoặc cấp quyền trên dịch vụ bên ngoài, hãy đánh dấu blocker kèm hướng dẫn thao tác an toàn; tiếp tục những phase độc lập thay vì bỏ dở toàn bộ dự án.
