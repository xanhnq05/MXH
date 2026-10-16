# PROMPT CURSOR AGENT — MỞ RỘNG MXH: POST / LIKE / COMMENT / GROUP CHAT / VIDEO / REELS

Dán toàn bộ prompt này vào Cursor Agent khi mở thư mục gốc của repository MXH. Đây là giai đoạn tiếp nối prompt hiện đại hóa Chat + Sticker/GIF. Agent phải đọc code local, lập kế hoạch, triển khai thực tế theo phase và kiểm thử; không chỉ đưa hướng dẫn hoặc code mẫu.

## 0. Vai trò và mục tiêu

Bạn là Senior Full-stack Engineer, Product Designer và QA Engineer. Hãy mở rộng ứng dụng MXH hiện tại theo hướng hiện đại, gọn, dễ dùng, lấy cảm hứng từ sự tinh giản của Threads nhưng vẫn giữ bản sắc riêng của sản phẩm: **màu cam thương hiệu, giao diện nhất quán với ứng dụng hiện tại, không sao chép nguyên xi nền tảng khác**.

Stack được ghi nhận trước đây là React + Vite + TypeScript + Tailwind + shadcn/ui + Zustand + React Router ở frontend; Express + MongoDB/Mongoose + Socket.IO ở backend; Supabase Storage/S3-compatible để lưu media. Đây chỉ là giả định ban đầu: phải xác minh từ workspace local trước khi sửa.

### Phạm vi triển khai

1. Hoàn thiện trải nghiệm bài viết/feed, Like, Comment, reply comment và các tương tác xã hội cốt lõi.
2. Hoàn thiện đầy đủ nghiệp vụ và phân quyền chat nhóm.
3. Xây dựng Reels/video ngắn dạng dọc.
4. Xây dựng pipeline upload và xử lý video dùng chung cho bài viết, Reels và tin nhắn.
5. Kết nối frontend, API, MongoDB, Socket.IO và Supabase Storage thực sự.
6. Viết kế hoạch, kiểm thử hồi quy và cập nhật tài liệu.

### Ngoài phạm vi — không triển khai

- **Không xây dựng Page, fanpage, quản lý Page, vai trò Page hay công cụ quản trị Page như Facebook.** Không tạo model/route/UI riêng cho Page.
- Không xây dựng hệ thống quảng cáo, boost post, monetization, livestream hoặc creator studio.
- Không mở rộng cuộc gọi thoại/video hoặc WebRTC trong đợt này; giữ nguyên chức năng call hiện có.
- Không thay auth/OTP, bạn bè, notification hoặc profile ngoài thay đổi tối thiểu cần thiết và đã được kiểm tra tương thích.
- Không xóa hay thay thế nghiệp vụ hiện có chỉ vì muốn đổi kiến trúc. Không dùng mock data trong luồng chính khi backend thật có thể được tích hợp.
- Không tự ý bỏ E2EE, gửi plaintext tin nhắn lên server, ghi log nội dung riêng tư hoặc thay đổi giao thức mã hóa mà chưa phân tích tương thích.

## 1. Quy tắc làm việc bắt buộc

1. Kiểm tra `git status --short`, branch, scripts và cấu trúc dự án trước khi sửa. Không dùng `git reset --hard`, không ghi đè thay đổi chưa commit, không xóa dữ liệu production.
2. Đọc các file plan hiện có như `frontend/src/plan.md`, `backend/src/plan.md`, `docs/` và prompt/plan Chat đã triển khai nếu tồn tại. Phân biệt rõ tính năng đã hoạt động, một phần, chỉ có UI, chưa có hoặc đang lỗi.
3. Trace từng tính năng từ UI → state/service → API/socket → middleware → model/database → storage → phản hồi UI.
4. Không giả định schema, quyền, endpoint, bucket hay event Socket.IO tồn tại chỉ vì tên file gợi ý. Xác minh bằng code.
5. Nếu prompt Chat trước đó chưa được triển khai hoàn chỉnh, không tự động viết lại toàn bộ chat. Chỉ bổ sung phần chat nhóm và media được nêu trong prompt này, đồng thời ghi rõ dependency hoặc blocker.
6. Trước khi sửa schema/API, lập bảng contract hiện tại → contract mới; giữ backward compatibility hoặc tạo migration có kế hoạch.
7. Chia việc theo phase. Sau mỗi phase: cập nhật checklist, chạy test liên quan, ghi kết quả thực tế, sửa regression rồi mới chuyển phase. Không đánh dấu DONE nếu chưa chạy được kiểm thử tương ứng.
8. Không in, commit hoặc đưa secrets từ `.env` vào tài liệu/log. Cập nhật `.env.example` bằng placeholder.
9. Nếu thiếu credentials/dịch vụ ngoài khiến một test không thể chạy, ghi BLOCKED và cung cấp lệnh/cách kiểm tra thay vì tuyên bố thành công.
10. Trước khi kết thúc, tóm tắt file đã thay đổi, migration cần chạy, biến môi trường mới, test đã chạy và phần còn BLOCKED.

## 2. Design system và UI/UX

- Đọc `.cursor/skills/ui-ux-pro-max/SKILL.md` nếu skill có trong workspace và làm theo hướng dẫn thực tế của skill. Không cài lại hay sửa nội dung nội bộ của skill.
- Tái sử dụng design tokens, typography, spacing, radius, theme và component hiện có; không tạo một hệ design system rời rạc.
- Dùng nền trung tính, typography dễ đọc, màu cam làm accent có kiểm soát. Không phủ cam lên mọi bề mặt.
- Giao diện phải responsive, keyboard accessible, có focus/hover/pressed/disabled/loading/error/empty states.
- Dùng icon set đã có, ưu tiên Lucide/shadcn hiện hữu; tránh emoji làm icon chức năng.
- Chức năng phụ đặt trong menu `...`, popover, dialog hoặc drawer hợp lý. Không hiển thị hàng loạt nút cạnh mọi bài viết/comment.
- Không để nút chỉ mang tính trang trí. Mỗi nút phải có hành động thật hoặc disabled kèm lý do.
- Không sao chép pixel-perfect Threads/Instagram/TikTok; chỉ tham khảo các pattern UX phù hợp.

## 3. Feed và bài viết

### 3.1 Feed UI/UX

- Kiểm tra route, page, post model, API, upload flow, pagination và state hiện có trước khi thiết kế.
- Tạo feed rõ ràng, hiện đại: avatar, tên/tác giả, thời gian, nội dung, media, số liệu tương tác, nút Like, Comment và menu hành động.
- Ưu tiên nội dung và typography; tránh card viền/nền quá nặng. Giữ layout gọn, dễ đọc trên mobile lẫn desktop.
- Hỗ trợ trạng thái loading/skeleton, empty, lỗi + retry, pagination hoặc infinite scroll nếu phù hợp với kiến trúc hiện tại.
- Không tải toàn bộ feed cùng lúc. Có pagination/cursor ổn định, tránh trùng bài và tránh nhảy vị trí khi tải thêm.
- Tôn trọng quyền riêng tư/visibility đã có, ví dụ public/friends/private nếu hệ thống hỗ trợ. Backend phải xác thực quyền xem bài; không chỉ ẩn bằng frontend.
- Bài đã xóa/ẩn không được tiếp tục xuất hiện trong feed/query tương ứng.

### 3.2 Tạo, sửa, xóa bài viết

- Tạo bài viết text, ảnh và video dựa trên schema/feature hiện tại; không tự tạo các loại nội dung chưa có nhu cầu.
- Hỗ trợ preview media trước khi đăng, progress upload, retry khi lỗi, hủy upload nếu kiến trúc cho phép và thông báo lỗi cụ thể.
- Validation nội dung rỗng, giới hạn ký tự, loại file, dung lượng và quyền thao tác phải được thực hiện ở backend; frontend chỉ bổ sung UX.
- Chủ bài có thể sửa/xóa bài của mình theo chính sách hiện tại. Admin hệ thống chỉ có quyền kiểm duyệt nếu sản phẩm đã có vai trò/quyền đó; không tạo quyền Page.
- Có confirm cho thao tác phá hủy. Nếu xóa bài, xử lý media tham chiếu an toàn, không xóa object dùng chung hoặc còn được tin nhắn/bài viết khác tham chiếu.
- Xử lý lỗi một phần: nếu upload media thành công nhưng tạo post thất bại thì cleanup object mồ côi an toàn; nếu xóa DB/storage không đồng bộ thì có cơ chế retry hoặc trạng thái cleanup.

### 3.3 Like / Unlike

- Có thể Like và Unlike bài viết; UI phản hồi nhanh bằng optimistic update nhưng phải rollback nếu server báo lỗi.
- Số Like phải nhất quán giữa feed, chi tiết bài và các vị trí hiển thị khác; tránh đếm tăng/giảm hai lần do Socket.IO và HTTP cùng cập nhật.
- Backend bảo đảm mỗi user chỉ có một Like trên một post, dùng unique compound index hoặc cơ chế tương đương.
- Thao tác idempotent: gửi lặp không tạo Like trùng và trạng thái cuối cùng đúng.
- Nếu có danh sách người Like, phải phân trang và kiểm tra quyền xem; không tải toàn bộ người dùng trong một request.
- Có loading/error/retry và test đồng thời nhiều request, double-click, Like/Unlike liên tiếp.

### 3.4 Comment và reply

- Hỗ trợ tạo comment, sửa/xóa comment của chính mình theo policy, reply vào comment, hiển thị phân cấp rõ ràng và tải thêm replies khi cần.
- Có thể Like comment nếu phù hợp với schema/feature hiện có; nếu triển khai thì phải hoàn thiện từ model/API/UI/test, không chỉ thêm icon.
- Comment có thể chứa text; chỉ thêm media trong comment nếu hệ thống hiện tại có yêu cầu rõ ràng và upload flow hỗ trợ an toàn.
- Validate comment rỗng, giới hạn ký tự, escape/render an toàn, kiểm soát URL và chống spam. Không render HTML tùy ý từ nội dung user.
- Phân trang comment/replies; không tải toàn bộ thread lớn một lúc. Giữ thứ tự ổn định và không nhân đôi comment khi nhận socket event.
- Khi xóa post, comment/reply phải được xử lý theo chiến lược rõ ràng (cascade/soft delete) phù hợp với schema; không để dữ liệu mồ côi gây lỗi.
- Chỉ chủ comment hoặc actor được cấp quyền moderation rõ ràng mới có thể sửa/xóa; backend kiểm tra quyền cho mọi request.

### 3.5 Chia sẻ, lưu bài và menu hành động

- Audit các tính năng share/save/report/hide hiện có. Chỉ hoàn thiện nếu phù hợp với mô hình sản phẩm; không thêm chức năng giả.
- Share tối thiểu phải có hành vi thực, như copy link hoặc chia sẻ nội bộ nếu đã hỗ trợ. Không tự tạo counter giả.
- Lưu bài là tùy chọn: chỉ thêm nếu có thể triển khai end-to-end với model/API/authorization.
- Report/hide chỉ triển khai nếu có luồng lưu và xử lý thực tế; nếu chưa có moderation backend, ghi vào roadmap thay vì tạo nút giả.
- Không có tính năng Page hay quyền quản trị Page.

## 4. Chat nhóm — hoàn thiện nghiệp vụ và RBAC

### 4.1 Audit trước khi thiết kế

Kiểm tra `Conversation`/group model, message model, route/controller/service, Socket.IO events, frontend group UI, E2EE và migration. Xác định group conversation có `createdBy`, members, roles, settings, pending invites hoặc các trường tương đương chưa. Tái sử dụng schema phù hợp; chỉ bổ sung trường thiếu.

### 4.2 Vai trò trong nhóm

Thiết kế quyền ở mức conversation/group, không phải Page:

- **Owner/Chủ nhóm:** quyền cao nhất; quản lý thông tin nhóm, thành viên, phân quyền quản trị viên và giải tán nhóm theo policy đã định.
- **Admin/Quản trị viên nhóm:** quản lý thông tin nhóm và thành viên theo quyền owner cho phép; không tự thăng cấp mình thành owner hoặc chuyển owner trái phép.
- **Member/Thành viên:** xem và gửi tin nhắn theo cài đặt nhóm, reply/react nếu hệ thống hỗ trợ, xem danh sách thành viên, tự rời nhóm.
- Nếu nhóm hiện không có owner/admin, xác định creator/owner một cách an toàn; không tự gán quyền admin cho mọi member.

Backend phải là nguồn quyết định cuối cùng. Frontend ẩn/disable action chỉ là UX. Kiểm tra quyền cho cả REST API và Socket.IO; không tin role/member IDs gửi từ client.

### 4.3 Tính năng nhóm cần hỗ trợ

Triển khai theo mức độ phù hợp với code hiện tại, nhưng mục tiêu tối thiểu:

- Tạo nhóm với tên và danh sách thành viên hợp lệ.
- Xem/sửa tên nhóm, avatar nhóm và mô tả nếu schema hỗ trợ.
- Xem danh sách thành viên, vai trò và trạng thái phù hợp.
- Thêm thành viên; loại thành viên; chỉ định/gỡ admin; chuyển quyền owner với xác nhận và quy tắc rõ ràng.
- Thành viên tự rời nhóm. Quy định khi owner rời: phải chuyển owner trước hoặc áp dụng cơ chế chuyển giao được định nghĩa rõ; không để group không có owner ngoài ý muốn.
- Xem lịch sử tin nhắn theo quyền thành viên và chính sách hiện tại.
- Thông báo hệ thống trong timeline khi thành viên vào/rời nhóm, đổi tên/avatar, được thêm/bị loại, thay đổi vai trò nếu phù hợp.
- Cài đặt ai có thể thêm thành viên, ai có thể sửa thông tin nhóm và ai có thể gửi tin nhắn nếu sản phẩm thực sự cần. Default phải rõ ràng và không khóa nhầm nhóm cũ.
- Chặn member đã bị loại hoặc đã rời nhóm gửi/đọc dữ liệu nhóm sau thời điểm quyền bị thu hồi, theo policy lịch sử đã định.
- Tìm kiếm nhóm, tạo nhóm và quản lý group details phải có loading/error/empty state.
- Nếu có giới hạn số thành viên, đọc cấu hình hiện tại; không tự đặt giới hạn tùy tiện mà không ghi trong config/docs.

### 4.4 Bảo mật và tính nhất quán

- Tạo helper/service authorization dùng chung để kiểm tra `isMember`, `isOwner`, `isGroupAdmin`, `canAddMember`, `canRemoveMember`, `canEditGroup` hoặc tương đương.
- Kiểm tra quyền trên server cho mọi thao tác nhạy cảm; test user ngoài nhóm không thể đọc/gửi message, thêm/xóa member hoặc sửa group settings.
- Xác thực membership tại thời điểm gửi message qua HTTP/socket; không chỉ xác thực socket đã đăng nhập.
- Xử lý race condition khi hai admin đồng thời xóa/thêm/chuyển vai trò; thao tác nhạy cảm phải idempotent và dữ liệu cuối cùng hợp lệ.
- Đồng bộ group changes tới thành viên đang online bằng event có payload tối thiểu; server phải xác thực trước khi phát. Không broadcast dữ liệu nhạy cảm cho room sai.
- Không cho client tự gửi `role: owner/admin` để cấp quyền.
- Nếu dùng E2EE, việc thêm/xóa thành viên phải tương thích key management hiện có. Khi thành viên bị loại, đánh giá cách xử lý khóa cho tin nhắn mới và lịch sử; không tự giả định mã hóa nhóm đã được hỗ trợ. Nếu cần thay đổi giao thức lớn, ghi rõ BLOCKED/decision và không âm thầm làm yếu bảo mật.

### 4.5 Ma trận kiểm thử quyền tối thiểu

| Actor | Xem/gửi tin nhắn nhóm | Sửa thông tin nhóm | Thêm thành viên | Xóa member | Quản lý admin/owner |
|---|---|---|---|---|---|
| Người ngoài nhóm | Từ chối | Từ chối | Từ chối | Từ chối | Từ chối |
| Member | Theo membership/policy | Theo cài đặt nhóm | Theo cài đặt nhóm | Không, trừ quyền rõ ràng | Không |
| Group admin | Có | Theo quyền admin | Có | Theo policy, không được xóa owner trái phép | Không tự nâng quyền |
| Owner | Có | Có | Có | Có, trừ self-removal cần transfer | Có theo policy |

Tạo test cho HTTP và Socket.IO; unauthenticated → 401 (hoặc contract hiện có tương đương), authenticated nhưng không đủ quyền → 403; thành viên hợp lệ → kết quả theo policy.

## 5. Video upload và xử lý dùng chung

Áp dụng thống nhất cho **video trong bài viết, Reels và tin nhắn**. Không tạo ba pipeline upload khác nhau nếu có thể dùng chung service an toàn.

### 5.1 Giới hạn đầu vào và đầu ra

- Giữ giới hạn hiện tại: **tối đa 50 MB cho mỗi file upload đầu vào**. Xác minh và áp dụng ở frontend lẫn backend; backend là nguồn quyết định cuối cùng.
- Video được đăng/gửi phải có **thời lượng tối đa 2 phút**.
- Video đầu ra sau xử lý có độ phân giải tối đa **720p**, không upscale video thấp hơn. Bảo toàn aspect ratio, hỗ trợ video ngang/dọc; không ép mọi video thành 16:9.
- Dùng định dạng đầu ra tương thích trình duyệt, ưu tiên MP4/H.264 và audio AAC khi phù hợp với hạ tầng hiện tại.
- **Không âm thầm cắt video dài hơn 2 phút.** Nếu đầu vào dài hơn 2 phút, báo rõ và cho người dùng trim xuống ≤2 phút nếu ứng dụng có/triển khai được UI trim phù hợp; nếu không có trim, từ chối upload với thông báo rõ ràng.
- Không hứa nén sẽ làm mọi file nhỏ hơn 50 MB; 50 MB là giới hạn file đầu vào. Đầu ra được kiểm tra riêng theo cấu hình/chi phí storage, và nếu cần giới hạn đầu ra thì cấu hình bằng env/documentation, không hard-code nhiều nơi.
- Không nâng độ phân giải lên 720p nếu nguồn thấp hơn. Tối đa 1280×720 cho landscape hoặc tương đương 720px theo cạnh dài cho portrait; giữ tỉ lệ khung hình.
- Ảnh và file tài liệu không bị đưa vào pipeline video. Không phá loại message hiện tại hoặc nhầm video thành audio/voice.

### 5.2 Kiến trúc xử lý

- Audit storage hiện có (Supabase Storage/S3-compatible), upload middleware, giới hạn request body, timeout, background jobs, server deployment và cách bảo vệ URL trước khi chọn phương án.
- Dùng FFmpeg/ffprobe hoặc worker/media service tương đương nếu phù hợp. Không thực hiện transcoding nặng đồng bộ trong request HTTP/socket, không giữ video lớn lâu trong RAM, không làm nghẽn `rag-service` hoặc backend chat bằng tác vụ CPU dài.
- Ưu tiên pipeline: validate file → upload vào vùng tạm/private storage → enqueue job → probe duration/codec/resolution → transcode 720p nếu cần → tạo thumbnail/poster → lưu metadata kết quả → đánh dấu ready → cleanup file tạm. Nếu hạ tầng hiện tại chưa có queue, chọn giải pháp phù hợp với deploy thực tế và ghi rõ trade-off; không giả định worker tự chạy ở môi trường serverless.
- Có trạng thái rõ: `uploading`, `processing`, `ready`, `failed` hoặc enum tương đương. UI không hiển thị video như sẵn sàng phát trước khi xử lý xong.
- Có progress/processing indicator, retry có giới hạn, thông báo lỗi dễ hiểu, tránh tạo nhiều bản xử lý khi client retry. Dùng job/idempotency key hoặc cơ chế tương đương.
- Dùng thumbnail để feed/Reels tải nhanh; lazy-load video, chỉ tải/phát khi cần, tránh tự động phát tất cả video trên trang.
- Kiểm tra metadata MIME bằng nội dung file/ffprobe khi có thể, không tin riêng extension hoặc `Content-Type` client gửi. Chặn file hỏng, codec không hỗ trợ và file giả mạo.
- Cleanup file tạm, file đầu ra thất bại và object mồ côi; có log kỹ thuật nhưng không ghi token, URL ký có bí mật hoặc nội dung riêng tư.
- Đảm bảo quyền truy cập: người không có quyền xem post/conversation không thể tải media private bằng cách đoán object key. Dùng signed URL hoặc cơ chế authorization hiện có; thời hạn URL hợp lý.
- Với video đính kèm tin nhắn, giữ nguyên E2EE hiện có. Nếu hiện tại file được mã hóa client-side, không đưa plaintext video lên transcoder server; cần phân tích trade-off. Không được âm thầm giải mã media riêng tư trên server. Nếu transcoding server-side mâu thuẫn E2EE, áp dụng client-side transcoding hoặc giữ nguyên mã hóa và chỉ xử lý metadata an toàn; ghi rõ phương án được chọn trong plan.
- Không thêm FFmpeg binary nặng vào production image hoặc giả định môi trường hosting hỗ trợ FFmpeg mà chưa kiểm tra. Ghi rõ yêu cầu triển khai, chi phí và giới hạn worker.

### 5.3 UX upload

- Hiển thị giới hạn 50 MB/file và 2 phút/video trước khi chọn/gửi.
- Hiển thị kích thước, thời lượng đã phát hiện, trạng thái nén/xử lý và lỗi cụ thể.
- Cho phép hủy trước khi bắt đầu xử lý nếu có thể; tránh gửi trùng post/message do double-click.
- Nếu video không hợp lệ, nêu rõ nguyên nhân và cách khắc phục.
- Không giảm chất lượng ảnh/tệp tài liệu bằng pipeline video.
- Test file 49 MB, 50 MB, lớn hơn 50 MB; video dưới/trên 2 phút; độ phân giải 4K/1080p/720p/480p; portrait/landscape; file hỏng; upload/transcode thất bại; retry và cleanup.

## 6. Reels — video ngắn

### 6.1 Sản phẩm và UX

- Xây dựng mục Reels/Video ngắn riêng trong navigation hiện có; không tạo Page.
- Tập trung vào video dọc ngắn, trải nghiệm xem từng video, caption, creator/user, Like, Comment và Share theo các chức năng thực sự được backend hỗ trợ.
- Điều khiển tối thiểu: play/pause, mute/unmute, progress, mở comment, Like, share/copy link. Tránh phủ quá nhiều nút lên video.
- Desktop có layout cân đối; mobile ưu tiên vùng xem video dọc, thao tác một tay và safe areas.
- Autoplay chỉ khi video ở trong viewport, muted mặc định nếu chính sách trình duyệt yêu cầu; pause video khi ra khỏi viewport, chuyển route/tab hoặc mở dialog phù hợp.
- Không phát nhiều video cùng lúc. Dùng IntersectionObserver hoặc pattern tương đương trong kiến trúc hiện tại, với cleanup đúng.
- Hỗ trợ loading skeleton, lỗi phát, retry, thumbnail, video processing state, empty state và pagination.
- Không thêm tính năng livestream, quảng cáo, monetization hoặc creator dashboard.

### 6.2 Data model và tích hợp

- Ưu tiên dùng chung `Post`/media model hiện có với một `contentType`/`postType`/flag tương thích (ví dụ `reel`) nếu phù hợp. Không tạo hệ thống người dùng, Like, Comment hoặc storage trùng lặp chỉ cho Reels.
- Xác định quy tắc: Reels là video post ngắn, duration ≤2 phút; dùng cùng quyền riêng tư, owner, moderation và engagement logic với post nếu phù hợp.
- Feed thường có thể render video post theo card hiện tại; Reels view có thể dùng cùng bản ghi với UI riêng. Tránh hai nguồn dữ liệu khác nhau cho cùng một video.
- Query/pagination phải hiệu quả; index theo các trường truy vấn thật sự cần thiết. Không tạo “recommendation algorithm AI” trong scope này; dùng thứ tự/query hiện tại hoặc feed đơn giản, minh bạch.
- Tính số liệu Like/comment từ dữ liệu thật; không tạo counters giả. Xử lý optimistic update và socket event tránh đếm hai lần.
- Khi Reels bị xóa/ẩn, đảm bảo không xuất hiện ở feed/route/API tương ứng; xử lý media tham chiếu an toàn.

## 7. Realtime, thông báo và hiệu năng

- Tái sử dụng Socket.IO event pattern hiện tại; không phát minh event mới mà không cập nhật client/server/types/tests.
- Với Like/comment/group changes, xác định rõ dữ liệu cần broadcast, audience/room hợp lệ và authorization trước khi emit.
- Không broadcast thông tin riêng tư cho người không có quyền. Không đưa toàn bộ user object hoặc secret vào socket payload.
- Có thể ưu tiên optimistic UI với rollback, nhưng server response là nguồn sự thật.
- Chống duplicate event/request; đảm bảo một thao tác không làm tăng count hai lần.
- Rate limit các thao tác dễ spam: create comment, Like/unlike liên tục, tạo nhóm, thêm member và upload. Dùng middleware/service thống nhất; không chỉ giới hạn phía frontend.
- Nếu limiter/job queue dùng in-memory, ghi rõ không an toàn/không nhất quán khi chạy nhiều instance; tái sử dụng Redis hoặc cơ chế distributed đã có nếu phù hợp, không tự thêm hạ tầng lớn mà chưa đánh giá.
- Tối ưu ảnh/video bằng thumbnail, lazy loading, pagination, index DB, giới hạn payload và cleanup listener. Không tải blob/video vào JSON hay lưu nội dung media binary trực tiếp trong MongoDB.

## 8. Bảo mật và quyền sở hữu dữ liệu

- Validate và authorize ở backend cho mọi thao tác create/read/update/delete.
- Chỉ chủ bài được sửa/xóa bài của họ theo policy; chỉ chủ comment hoặc actor được cấp quyền moderation mới sửa/xóa comment.
- Không để user sửa postId/authorId/memberId trong payload để thao tác lên dữ liệu người khác.
- Kiểm tra quyền truy cập media theo post visibility hoặc conversation membership. URL media không được trở thành cách vượt quyền.
- Bảo vệ upload khỏi MIME spoofing, extension spoofing, path traversal, file quá lớn, request quá nhiều và nội dung lỗi.
- Không ghi nội dung chat riêng tư hoặc plaintext E2EE vào logs.
- Không tạo Page model, Page route, Page role hay giao diện quản lý Page.
- Tôn trọng auth và E2EE hiện có. Bất kỳ thay đổi nào ảnh hưởng key management, encrypted attachments hoặc quyền đọc lịch sử đều phải được phân tích và ghi trong plan trước khi thực hiện.

## 9. Kiểm thử bắt buộc

### Frontend

- Feed load/pagination, tạo/sửa/xóa post, Like/Unlike, comment/reply, empty/error/loading.
- Double-click, request fail, optimistic rollback, refresh trang và đồng bộ state.
- Tạo nhóm, mở group details, thay đổi thông tin, quản lý member và hiển thị quyền đúng.
- Reels play/pause/mute, chuyển video, scroll nhanh, pause offscreen, lỗi media, responsive mobile.
- Upload progress, processing state, lỗi loại file/dung lượng/thời lượng và retry.

### Backend

- Auth + ownership + authorization cho mọi post/comment/group/media endpoint.
- Unique Like, idempotency, race condition và count consistency.
- Group outsider/member/admin/owner permission matrix trên HTTP và Socket.IO.
- File validation, 50 MB boundary, duration boundary 2 phút, codec/metadata invalid, transcode failure, cleanup và private media authorization.
- Reels query/pagination/visibility và xử lý post bị xóa/ẩn.
- Rate limit và payload validation.

### Quality gate

- Chạy scripts thực tế được khai báo trong `package.json`: lint, typecheck, unit/integration/E2E và build nếu có.
- Không bỏ test chỉ vì đang lỗi; phân loại lỗi nền đã tồn tại và regression mới.
- Nếu không có test cho phần nào, thêm test phù hợp. Nếu cần dịch vụ/credentials thật, ghi BLOCKED.
- Không khẳng định đã chạy test nếu chưa chạy.

## 10. Kế hoạch triển khai — lưu trong repository

Tạo hoặc cập nhật `docs/mxh-social-expansion-plan.md`. Không ghi đè plan cũ; đọc và liên kết plan Chat hiện có. Mỗi task có trạng thái `TODO / IN_PROGRESS / DONE / BLOCKED`, file liên quan, command kiểm thử và kết quả thực tế.

### Phase 0 — Audit & baseline

- [ ] Xác minh repo, stack, routes, models, UI hiện có, upload/storage, E2EE, Socket.IO, quyền, test.
- [ ] Chạy baseline test/build.
- [ ] Lập bảng tính năng hiện có và thiếu.
- [ ] Xác nhận rõ không có Page.

### Phase 1 — Contract & data model

- [ ] Thiết kế API/schema cho post, Like, comment/reply, group roles, video processing và Reels.
- [ ] Lập migration/backward compatibility plan.
- [ ] Chốt quyền xem/sửa/xóa và event realtime.
- [ ] Chốt video pipeline phù hợp hosting và E2EE.

### Phase 2 — Feed, post, Like, comment

- [ ] Hoàn thiện API/schema/authorization.
- [ ] Hoàn thiện UI feed và composer.
- [ ] Implement Like/Unlike idempotent và count consistency.
- [ ] Implement comment/reply và pagination.
- [ ] Tích hợp realtime/optimistic UI.
- [ ] Chạy test phase.

### Phase 3 — Group chat permissions

- [ ] Hoàn thiện model/authorization cho owner/admin/member.
- [ ] Implement create/edit group, member management, leave/transfer ownership và system events.
- [ ] Đồng bộ REST + Socket.IO và E2EE compatibility.
- [ ] Chạy permission matrix tests.

### Phase 4 — Video pipeline

- [ ] Enforce input max 50 MB ở server.
- [ ] Validate duration ≤2 phút, cung cấp trim hoặc reject rõ ràng.
- [ ] Implement processing/transcoding ≤720p, thumbnail, status, cleanup và retry.
- [ ] Kiểm tra storage privacy và E2EE cho video tin nhắn.
- [ ] Test boundary, codec, failure và deployment.

### Phase 5 — Reels

- [ ] Dùng chung post/media/engagement model phù hợp.
- [ ] Xây dựng video feed dọc và playback lifecycle.
- [ ] Tích hợp Like/comment/share thật.
- [ ] Tối ưu lazy loading, thumbnail, pagination và responsive.
- [ ] Chạy test phase.

### Phase 6 — Integration, security, regression

- [ ] Kiểm thử end-to-end giữa frontend/backend/storage/socket.
- [ ] Rà soát quyền truy cập, upload, rate limit, E2EE, cleanup.
- [ ] Chạy full test/build và sửa regression.
- [ ] Cập nhật README/API docs/env.example/plan.
- [ ] Báo cáo các task DONE/BLOCKED và các lệnh đã chạy.

## 11. Definition of Done

Chỉ kết thúc khi:

- Like/Unlike, comment/reply và các thao tác post chính được persist vào DB, có authorization và test.
- Chat nhóm có role/permission được enforce tại backend, không dựa riêng vào UI.
- Mọi video upload đều tuân thủ giới hạn đầu vào 50 MB/file và thời lượng tối đa 2 phút; output không vượt 720p, không upscale nguồn thấp hơn, xử lý lỗi minh bạch.
- Reels phát được video thực, có pagination và tương tác dựa trên cùng nguồn dữ liệu với post khi phù hợp.
- Không có Page/fanpage/management Page được thêm vào.
- E2EE và các chức năng hiện có không bị phá; mọi xung đột được nêu rõ, không âm thầm hạ mức bảo mật.
- Build/test kết quả thực tế được ghi vào plan; không còn regression mới đã biết chưa được xử lý hoặc ghi rõ BLOCKED.

**Bắt đầu bằng Phase 0. Sau khi audit, hãy triển khai tuần tự và tự tiếp tục qua các phase có thể thực hiện an toàn. Không dừng lại chỉ để trả về kế hoạch, trừ khi có blocker thực sự cần người dùng quyết định.**