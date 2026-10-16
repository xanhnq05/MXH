# PROMPT CHO CURSOR AGENT — HIỆN ĐẠI HÓA CHAT MXH + STICKER/GIF TỰ HOST

> Dán toàn bộ prompt này vào Cursor Agent khi mở **thư mục gốc của project MXH**. Agent cần trực tiếp đọc code local, lập kế hoạch, thực hiện lần lượt từng phase và kiểm thử. Không chỉ trả về hướng dẫn hay code mẫu.

## 0. Vai trò và mục tiêu

Bạn là Senior Full-stack Engineer, UI/UX Designer và QA Engineer. Hãy cải tiến phần **Chat/Messaging** của dự án MXH hiện tại thành một trải nghiệm hiện đại, chỉn chu và production-minded, có ngôn ngữ hình ảnh tối giản như Threads, bố cục hội thoại quen thuộc của Instagram DM, đồng thời giữ nhận diện màu cam hiện có của dự án.

Phần giao diện hiện còn nhiều thiếu sót: bố cục và khoảng cách chưa nhất quán, các nút/chức năng đang phơi hết ra ngoài, composer chưa gọn, luồng file/media cần được xác minh kỹ, và hệ thống sticker/GIF chưa có giao diện quản trị đầy đủ. Tôi muốn một trải nghiệm được thiết kế có chủ đích, nhưng **không làm lại toàn bộ dự án** và không phá vỡ các tính năng/backend hiện có.

### Phạm vi làm trong đợt này

1. Redesign UX/UI cho danh sách hội thoại, màn hình hội thoại, header, message bubbles, composer, menu/overlay, trạng thái tải/rỗng/lỗi và responsive.
2. Làm cho chat văn bản và gửi ảnh/tệp hoạt động thực sự từ đầu đến cuối, không chỉ làm UI giả lập.
3. Hoàn thiện picker sticker và GIF, với gợi ý sticker/GIF theo nội dung người dùng đang gõ; người dùng phải chủ động bấm vào gợi ý thì media mới được gửi.
4. Xây giao diện quản trị để admin tải lên, sửa metadata, bật/tắt, tìm kiếm và quản lý sticker/GIF được lưu trong hệ thống storage của dự án.
5. Hạn chế spam sticker/GIF ở cả frontend lẫn backend; backend là nguồn quyết định cuối cùng.
6. Viết kế hoạch thực thi, cập nhật checklist, chạy build/lint/test/e2e và sửa lỗi phát hiện được.

### Ngoài phạm vi — TUYỆT ĐỐI KHÔNG triển khai trong đợt này

- Không làm mới tính năng gọi thoại/video, signaling/WebRTC/TURN/STUN hoặc UI cuộc gọi. Giữ nguyên logic call hiện tại nếu có; không thay đổi component/service/store call trừ khi bắt buộc để tránh lỗi build, và khi đó phải nêu rõ lý do.
- Không triển khai hoặc redesign tính năng tạo post, feed, like, comment, share hay chức năng mạng xã hội ngoài Chat và trang quản trị sticker/GIF.
- Không thay đổi nghiệp vụ auth/OTP, profile, bạn bè, notification, group settings ngoài những thay đổi tối thiểu cần thiết cho chat.
- Không thay thế E2EE hiện có bằng phương án khác, không gửi plaintext lên server để tiện render, không tắt mã hóa hoặc bỏ qua luồng bảo mật.

## 1. Khảo sát bắt buộc trước khi sửa code

Trước hết hãy kiểm tra source code **đang có trong workspace local**. Remote GitHub có thể khác code local; code local đang mở trong Cursor mới là nguồn thực thi. Chạy `git status --short` và xác định branch hiện tại trước khi sửa; giữ nguyên mọi thay đổi chưa commit của người dùng, không chạy `reset --hard`, không checkout đè file, không xóa dữ liệu hoặc seed database production. Nếu working tree có thay đổi, tránh chỉnh sửa/phá hủy các phần không thuộc phạm vi. Đọc ít nhất:

### Frontend
- `frontend/package.json`, `frontend/src/App.tsx`, `frontend/src/index.css` và theme/design tokens.
- `frontend/src/components/layout/MainLayout.tsx` và các component/layout liên quan để không tạo sidebar trùng hoặc phá layout chung.
- `frontend/src/pages/ChatPage.tsx`.
- `frontend/src/components/chat/MessageInput.tsx`, `MessageBubble.tsx`, `StickerPicker.tsx`, `EmojiPickerButton.tsx`.
- `frontend/src/hooks/useGifSuggest.ts`, `useDebounce.ts`, `useSocket.ts`.
- `frontend/src/stores/useChatStore.ts`, `frontend/src/services/chat.service.ts`, `frontend/src/lib/axios.ts`, `frontend/src/lib/socket.ts`, `frontend/src/lib/e2ee.ts` và các helper E2EE có liên quan.
- `frontend/src/types/message.ts`, component UI sẵn có từ shadcn/ui, các test hiện tại và `frontend/src/plan.md`.

### Backend
- `backend/package.json`, `backend/src/server.js`, `backend/src/configs/env.config.js`, `backend/src/configs/supabase.config.js`.
- `backend/src/routes/message.route.js`, `conversation.route.js`, `sticker.route.js`, `gif.route.js` và controllers/services tương ứng.
- `backend/src/services/message.service.js`, `chat.service.js`, `sticker.service.js`, `upload.service.js`.
- `backend/src/models/Message.js`, `Conversation.js`, `StickerPack.js`, `User.js`.
- `backend/src/middlewares/auth.middleware.js`, `upload.middleware.js`, `rateLimit.middleware.js`, validators, socket event handlers và luồng gửi tin nhắn.
- `backend/src/stickers/gif/trending.json`, `backend/scripts/seedStickers.js`, test unit/e2e và `backend/src/plan.md`.

Hãy lần theo luồng thật: **composer → Zustand/service → HTTP upload nếu có → Socket.IO/message service → MongoDB → broadcast realtime → render phía người gửi/người nhận**. Xác định luồng E2EE và file attachment hiện vận hành như thế nào trước khi sửa.

Lập bảng ngắn trong plan cho từng tính năng hiện trạng: `đã hoạt động`, `hoạt động một phần`, `chỉ có UI`, `chưa có`, `đang lỗi/không chắc`; ghi bằng chứng là file/hàm liên quan. Không được tuyên bố tính năng hoạt động chỉ vì tìm thấy component hoặc route.

## 2. UI/UX Pro Max — phải dùng skill đã cài

Repo hiện có skill tại `.cursor/skills/ui-ux-pro-max/SKILL.md` và script trong `.cursor/skills/ui-ux-pro-max/scripts/`. Đọc file skill này **đầy đủ** trước khi thiết kế. Không cài lại skill, không sửa file nội bộ của skill và không bỏ qua hướng dẫn của nó.

1. Kiểm tra cách dùng CLI/script hiện có bằng phần hướng dẫn trong `SKILL.md`/`--help`.
2. Dùng tính năng **design-system generation** để tạo design system đúng mục tiêu: consumer social messaging web app, Threads-like visual simplicity + Instagram DM information architecture, warm orange brand, polished/compact, high readability, responsive. Dùng stack React/Tailwind phù hợp với kết quả xác minh từ project.
3. Dùng kết quả skill làm cơ sở thực tế: style, palette, typography, spacing, shadow, border, interaction, UX anti-patterns. Không chỉ ghi “đã dùng skill” rồi tự bỏ qua kết quả.
4. Lưu design system đã được kiểm tra vào file trong project theo hướng dẫn của skill, ví dụ `design-system/mxh-chat/MASTER.md`, và tạo override riêng cho chat/admin media nếu phù hợp với cấu trúc skill. Không overwrite design system cũ nếu đã tồn tại; đọc và mở rộng hợp lý.
5. Tìm kiếm các hướng dẫn UX/React/Tailwind có liên quan qua script của skill theo đúng cú pháp đã cài. Nếu kết quả không liên quan, thử lại bằng query hẹp hơn rồi dùng nguyên tắc chung có ghi chú; không bịa rằng script trả về một kết quả mà nó không trả về.

### Hướng thiết kế mong muốn

- **Threads**: ít nhiễu, typography rõ, khoảng trắng có kiểm soát, tập trung vào nội dung hội thoại.
- **Instagram DM**: kiến trúc inbox trái + hội thoại trung tâm, dễ scan danh sách hội thoại, ảnh đại diện rõ, trạng thái online/unread dễ nhận biết, chi tiết người chat có thể mở/ẩn khi cần.
- **Thương hiệu cam hiện có**: kiểm tra màu trong tokens/CSS trước, tái sử dụng màu cam hiện hữu làm accent/CTA/selected state; không tự ý thay thương hiệu bằng tím/xanh hoặc phủ cam lên mọi bề mặt. Nền chủ yếu trung tính, cam tạo điểm nhấn và trạng thái tương tác.
- Hỗ trợ light/dark theme theo hệ thống hiện có; không tạo theme thứ hai độc lập.
- Dùng icon SVG/Lucide đã có trong project, tránh emoji thay icon chức năng. Có hover/focus/pressed/disabled/loading states nhất quán, focus keyboard rõ và reduced-motion.
- Không sao chép pixel-perfect từ Threads/Instagram; chỉ tham khảo nguyên lý bố cục và mức độ tinh gọn.
- Không sử dụng mock data trong luồng chính nếu backend/API đã có; không tạo button chỉ để trang trí. Nút nào xuất hiện phải có hành động thật hoặc hiển thị disabled kèm lý do.

## 3. Bố cục và hành vi UX của Chat

### 3.1 Desktop

Thiết kế tối ưu ở 1440px và vẫn tốt ở 1024px.

- Tôn trọng `MainLayout` hiện tại. Không thêm một global navigation/sidebar thứ hai nếu layout cha đã cung cấp.
- Phần chat có cấu trúc chính gồm:
  1. **Inbox/conversation list** bên trái với tiêu đề, nút tạo hội thoại mới nếu backend đã hỗ trợ, ô tìm kiếm và danh sách hội thoại.
  2. **Conversation panel** ở trung tâm, chiếm phần lớn không gian.
  3. **Conversation details panel** chỉ mở khi người dùng chọn một mục như “Thông tin hội thoại”; mặc định ẩn hoặc đóng gọn để không làm khu chat chật.
- Nếu kiến trúc `MainLayout` làm cấu trúc trên bị lặp hoặc không phù hợp, đưa ra quyết định dựa trên code hiện tại, ghi trong plan và chọn một layout nhất quán.

### 3.2 Danh sách hội thoại

- Mỗi row có avatar, tên, preview tin nhắn cuối, thời gian, unread badge khi có dữ liệu và trạng thái online/typing khi backend cung cấp.
- Highlight hội thoại đang mở bằng màu cam nhạt/viền tinh tế, không dùng background đậm gây chói.
- Tìm kiếm phải hoạt động theo tên người dùng/tên nhóm đã có; lọc nhanh theo unread/group chỉ thêm khi dữ liệu hiện tại hỗ trợ chính xác.
- Tinh gọn các chức năng ít dùng vào `DropdownMenu`/overflow menu. Không đặt 5–8 icon cạnh mọi hội thoại.
- Có skeleton, empty state, error state và retry. Không để danh sách trắng trống mà không có lý do/hướng dẫn.

### 3.3 Vùng hội thoại

- Header: avatar, tên, trạng thái/tlast seen nếu dữ liệu có; các hành động hiếm dùng trong menu. Không triển khai lại gọi điện; bảo toàn logic call sẵn có và tránh mở rộng phạm vi call.
- Tin nhắn nhóm theo người gửi/thời gian hợp lý; bubble của mình và người khác phân biệt rõ, có timestamp tinh tế, separator ngày khi cần.
- Hiển thị đúng các loại message mà schema hiện tại hỗ trợ: text, image, file, sticker, GIF, voice nếu hiện có. Với reply, thể hiện snippet tin nhắn được trả lời; media hỏng cần fallback thay vì vỡ layout.
- Xử lý tin nhắn dài, URL dài, nội dung trống/hỏng, tên file dài và ảnh tỷ lệ khác nhau không gây overflow.
- Khi gửi tin nhắn mới, giữ đúng hành vi auto-scroll hiện có hoặc cải thiện: chỉ tự cuộn xuống nếu người dùng đang ở gần cuối; nếu họ cuộn lên đọc lịch sử, không giật vị trí. Nếu pagination đã có, tải trang cũ phải giữ vị trí cuộn.
- Trạng thái pending/sending/failed phải phản ánh kết quả thật. Có retry cho trường hợp phù hợp, tránh tạo tin nhắn trùng khi retry.
- Không dùng `alert()`/`prompt()` làm UX mặc định cho thao tác tạo nhóm/tìm kiếm/quản lý; thay bằng dialog/drawer/form phù hợp nếu thuộc phạm vi chat và không phá API hiện có.

### 3.4 Composer — gọn, kín kẽ, dễ dùng

- Composer nằm cuối panel, luôn dễ tiếp cận, multiline và có chiều cao tối đa hợp lý.
- `Enter` gửi, `Shift+Enter` xuống dòng; kiểm thử hành vi với IME tiếng Việt/composition để không gửi khi người dùng đang chọn dấu.
- Hiển thị rõ text đã nhập; vô hiệu hóa nút gửi trong lúc request đang chạy hoặc khi nội dung không hợp lệ; giữ bản nháp khi gửi lỗi.
- Các action ít dùng như file, ảnh, sticker, GIF đặt trong một nhóm icon nhỏ hoặc nút `+` mở menu. Không bày toàn bộ tính năng thành dải nút lớn.
- Emoji picker, sticker picker và GIF suggestions phải đóng/mở đúng, không che mất composer, không tự gửi media khi user chỉ gõ text.
- Nếu đang reply một message, hiển thị reply preview phía trên composer kèm nút huỷ; gửi xong phải reset reply state đúng.
- Khi upload ảnh/tệp, hiển thị tên, loại, kích thước, thumbnail với ảnh, trạng thái upload và khả năng bỏ file trước khi gửi nếu kiến trúc hiện tại hỗ trợ. Không tạo cảm giác đã gửi thành công trước khi server xác nhận.

### 3.5 Responsive

Kiểm tra ít nhất `375px`, `768px`, `1024px`, `1440px`:
- Mobile: ban đầu hiển thị inbox; mở conversation thì ẩn inbox, có nút quay lại; composer không bị bàn phím che hoặc tràn ngang.
- Tablet: sidebar có thể thu gọn; giữ phần hội thoại đủ rộng.
- Desktop: inbox và hội thoại cân bằng; details panel có thể đóng.
- Không có horizontal overflow, action target quá nhỏ, text chồng avatar/icon hoặc dialog vượt viewport.

## 4. Bắt buộc làm cho chat text, gửi ảnh và gửi tệp hoạt động

Đây là điều kiện nghiệm thu quan trọng, không chỉ sửa CSS.

1. Trace và xác minh đường đi của text message cho cả người gửi và người nhận. Giữ nguyên contract backend/Socket.IO nếu vẫn phù hợp; nếu đổi payload/event thì cập nhật đồng bộ frontend, backend và test.
2. Chọn **một luồng upload nhất quán**. Xác định upload endpoint có chỉ upload file hay đã upload kèm tạo message. Ngăn trường hợp file bị upload hai lần hoặc message được tạo hai lần. Luồng UI upload và gửi phải tái sử dụng `chat.service.ts`, `useChatStore` và service/backend phù hợp, không viết một API cạnh tranh cho cùng chức năng.
3. Ảnh: hỗ trợ các định dạng an toàn đang dùng trong dự án (tối thiểu JPEG/PNG/WebP/GIF nếu backend/browser hỗ trợ), xem preview đúng, mở ảnh lớn nếu Lightbox đã có, render lỗi tải ảnh có fallback.
4. Tệp: kiểm tra frontend `accept`, backend multer filter, controller, upload service và message schema. Middleware backend hiện có vẻ chỉ chấp nhận image/video/audio; vì vậy nếu PDF/DOCX/tệp tài liệu bị từ chối thì hãy sửa theo whitelist loại file rõ ràng. Gợi ý whitelist: PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, PPT/PPTX, ZIP nếu không mâu thuẫn với chính sách project; ảnh được xử lý riêng. Không cho phép binary tùy ý chỉ vì MIME do client gửi.
5. Kiểm tra cả extension lẫn MIME, tên file an toàn, giới hạn dung lượng theo cấu hình hiện có (mặc định hiện tại 50 MB nếu hợp lý), lỗi “loại file không hỗ trợ”, quá dung lượng, upload lỗi, người dùng không đăng nhập và conversation không thuộc user.
6. Hiển thị file bubble với icon theo loại, tên file, kích thước, nút tải/mở. Tệp không được render như ảnh; ảnh không được tải về dưới dạng file vô danh khi có thể preview.
7. Đảm bảo storage key/URL được giữ đúng để người nhận có thể mở/tải; kiểm tra quyền truy cập storage. Không giả định URL công khai là phù hợp với mọi tệp riêng tư.
8. **E2EE**: trước khi sửa, đọc `e2ee.ts` và toàn bộ luồng encrypt/decrypt message. Không gửi plaintext message lên backend để né lỗi. Không tự tuyên bố attachment được E2EE nếu chưa có mã hóa client-side. Nếu attachment hiện có cơ chế mã hóa, phải tích hợp theo đúng cơ chế đó; nếu còn thiếu, triển khai cách tương thích với kiến trúc hiện có nếu có thể kiểm chứng an toàn. Nếu không thể hoàn tất an toàn, ghi rõ phần còn thiếu và bài test/chứng cứ — không âm thầm vô hiệu E2EE.
9. Giữ tương thích với Message model/event có sẵn. Không biến video thành loại `voice` chỉ vì MIME không phải ảnh; mapping type phải rõ và không phá enum/schema hiện có. Video/audio ngoài phạm vi mở rộng lần này, nhưng hành vi cũ không được tự ý bị phá.

## 5. Sticker/GIF tự host — không gọi API bên ngoài

### Hiện trạng cần xử lý

- Frontend hiện có `StickerPicker.tsx` gọi `/api/stickers/packs` và `/api/stickers/search`.
- Hook `useGifSuggest.ts` gọi `/api/gifs/search?q=...` với debounce.
- Backend có `StickerPack` model, `sticker.service.js`, các route đọc/search; dữ liệu GIF hiện đọc từ `backend/src/stickers/gif/trending.json`.
- Dữ liệu GIF JSON hiện có URL Giphy bên ngoài. Không tiếp tục phụ thuộc URL Giphy/Tenor hay một API GIF bên ngoài trong luồng production.
- `uploadService` đã dùng Supabase Storage/S3-compatible storage. Ưu tiên tận dụng storage bucket/config hiện tại để lưu media do admin upload; không tạo hệ thống storage thứ hai.
- Các route sticker đang chỉ thiên về read/search; cần kiểm tra và triển khai admin CRUD/upload thực sự.

### 5.1 Storage

- Media do admin upload phải lưu vào storage thuộc quyền quản lý của dự án, ưu tiên bucket Supabase Storage/S3 đang cấu hình.
- Dùng folder/prefix có quy ước, ví dụ `stickers/packs/...` và `stickers/gifs/...`; tên file ngẫu nhiên an toàn, giữ `storageKey`, `url`, MIME, byte size và metadata kỹ thuật.
- Không dùng URL của user nhập tự do làm phương án upload mặc định; admin upload file từ máy. Từ chối URL external trong form thêm mới nếu không có một yêu cầu import được xác minh riêng.
- Không tự động tải các file Giphy bên ngoài xuống host của mình. Đối với data legacy, giữ lại metadata như bản ghi cần thay thế hoặc cung cấp migration an toàn; chỉ đưa asset vào kết quả người dùng nếu nó đã được upload/lưu local theo quy ước của dự án.
- Khi tắt asset, ngừng gợi ý asset đó nhưng lịch sử chat cũ vẫn phải render nếu file còn tồn tại. Khi xóa vĩnh viễn, phải xác nhận và xử lý an toàn storage object; không xóa nhầm file dùng chung hay phá tin nhắn lịch sử. Ưu tiên soft delete/inactive hơn hard delete.

### 5.2 Metadata cho sticker/GIF

Thiết kế schema đủ cho gợi ý theo ngữ nghĩa, nhưng không phức tạp vô ích. Cần ít nhất:
- `name`, `description`, `mediaType` (`sticker`/`gif` hoặc phân biệt theo model), `category`/`packKey`;
- `tags`;
- `keywords`;
- `synonyms`/cụm từ tương đương;
- `phrases` hoặc từ/cụm từ gợi ý cụ thể;
- ngôn ngữ (ưu tiên tiếng Việt, có thể thêm tiếng Anh), sắc thái/cảm xúc tùy trường hợp;
- `url`, `storageKey`, `mimeType`, `fileSize`, `thumbnailUrl` nếu cần;
- `isActive`, `priority/order`, `createdAt`, `updatedAt`, `createdBy/updatedBy` nếu mô hình quyền hiện có hỗ trợ.

Ví dụ một GIF có thể có name `Chúc mừng`, tags `sinh nhật, chúc mừng, happy birthday`, keywords `birthday, party, cake`, synonyms/cụm từ `sn, mừng sinh nhật`; metadata phải cho admin chỉnh sửa trực tiếp. Đây chỉ là ví dụ, không phải dữ liệu bắt buộc phải seed.

Giữ tương thích với `StickerPack` và APIs đang dùng. Quyết định sau khi khảo sát: mở rộng `StickerPack` hay thêm model riêng `GifAsset` cho GIF. Không tạo hai nguồn dữ liệu trùng lặp; `trending.json` không được tiếp tục là nguồn dữ liệu động chính nếu đã chuyển sang DB.

### 5.3 Trang admin quản lý media

- Tạo trang quản trị tách biệt (ví dụ `/admin/media`), điều hướng đến trang này chỉ xuất hiện với admin.
- Bố cục dashboard gọn, chuyên nghiệp, đồng bộ design system màu cam của MXH: danh sách/bảng, ô tìm kiếm, bộ lọc loại media/category/status, thumbnail preview, trạng thái trống/loading/error, pagination nếu dữ liệu lớn.
- Admin có thể:
  - upload GIF/sticker từ local;
  - tạo/sửa metadata và danh mục/pack;
  - xem trước media;
  - bật/tắt khỏi kết quả gợi ý;
  - tìm kiếm, lọc và sắp xếp theo tên/tag/category/status/priority;
  - xóa mềm và xóa vĩnh viễn có confirm nếu cần.
- Form metadata phải hỗ trợ nhập nhiều tag/keyword/synonym/phrase theo chip input hoặc control dễ dùng; validation hiển thị ngay cạnh trường lỗi.
- Upload phải kiểm tra file loại ảnh tĩnh hoặc GIF theo yêu cầu, MIME/extension, dung lượng, lỗi storage và trạng thái đang upload. Không đánh dấu hoàn tất trước khi storage + database cùng thành công; xử lý rollback/xóa object mồ côi nếu bước DB thất bại.
- Có thể xem/tải file nhưng không được sửa quyền admin qua frontend.

### 5.4 RBAC admin — yêu cầu bảo mật

Hiện model `User` cần được kiểm tra và không được giả định đã có `role`/`isAdmin`. Nếu workspace không có phân quyền admin tin cậy:
- Thêm middleware admin ở backend cho toàn bộ CRUD/upload/delete endpoints; `protectedRoute` đơn thuần là chưa đủ.
- Chọn một cơ chế allowlist an toàn phù hợp với config hiện có, ví dụ env `ADMIN_EMAILS`/`ADMIN_USER_IDS`; default deny nếu cấu hình trống. Không hard-code email/ID thật, không cho client gửi `{role: "admin"}` để tự cấp quyền.
- Thêm biến vào `.env.example` với giá trị placeholder và cập nhật tài liệu; không đọc, ghi, in log hoặc commit secrets trong `.env` thật.
- Kiểm tra quyền ở backend trước khi thực hiện upload/thay đổi database/storage. Frontend guard chỉ giúp UX, không thay thế backend authorization.
- Test rõ: unauthenticated → 401; người dùng đã đăng nhập nhưng không là admin → 403; admin hợp lệ → có quyền theo endpoint.

## 6. Gợi ý sticker/GIF theo nội dung người dùng đang gõ

Mục tiêu UX gần cách TikTok gợi ý media: khi người dùng nhập nội dung, một hàng gợi ý nhỏ xuất hiện cạnh/trên composer theo ngữ nghĩa của câu đang gõ. Không che tin nhắn, không chiếm nhiều diện tích và không tự động gửi.

### Hành vi

- Dùng debounce hiện có nếu phù hợp (khoảng 250–350 ms), chỉ tìm khi đã nhập từ/cụm có ý nghĩa (thường từ 2 ký tự trở lên), hủy request cũ hoặc bỏ kết quả cũ khi query đổi.
- Chỉ gợi ý sticker/GIF `isActive` và đã được lưu trong storage quản lý bởi dự án.
- Gợi ý tối đa khoảng 4–6 kết quả, trình bày thành hàng ngang nhỏ có thumbnail, tooltip/tên ngắn; cho phép chuyển tab Sticker/GIF hoặc mở picker đầy đủ.
- Xếp hạng kết quả theo mức liên quan: exact phrase cao nhất; sau đó exact tag/keyword; synonym; tên/category. Dùng metadata do admin nhập, không gọi LLM hoặc API GIF bên ngoài.
- Chuẩn hóa tiếng Việt khi tìm (chữ hoa/thường, dấu, `đ/d` có chủ đích), xử lý dấu câu/khoảng trắng, phrase nhiều từ và alias. Không trả về quá nhiều match không liên quan chỉ vì một ký tự chung.
- Khi không có kết quả: không render panel trống kéo dài; nếu đang loading thì có indicator nhỏ, nếu không có match thì ẩn hoặc hiển thị trạng thái rất gọn.
- Khi người dùng click một suggestion, gửi đúng media được chọn theo contract hiện có, hiển thị pending/error rõ ràng. **Không gửi chỉ vì người dùng gõ câu khớp**; text vẫn được gửi theo hành vi bình thường nếu họ nhấn Enter/nút gửi.
- Không xóa text draft khi người dùng chỉ xem suggestion; chỉ reset khi hành động gửi media thành công và hành vi đó đã được quyết định rõ. Xử lý trường hợp Enter, click suggestion và double click để không gửi lặp.
- Có thể thêm usage count hoặc priority về sau, nhưng đừng để tần suất dùng làm tiêu chí duy nhất lấn át độ liên quan.

## 7. Chống spam sticker/GIF

Bảo vệ cả UX lẫn backend; không chỉ disable nút phía frontend.

- Frontend: khóa double-click trong khi gửi, trạng thái `sending`, không cho click liên tục khi request đang pending, toast/message ngắn khi server trả 429.
- Backend: giới hạn sticker/GIF theo người dùng, dùng chung enforcement cho cả HTTP lẫn Socket.IO/`messageService.send` để không thể lách qua đường socket. Chỉ tính `sticker` và `gif`, không áp hạn mức này cho tin nhắn text, file hay ảnh.
- Đề xuất baseline cấu hình có thể chỉnh: tối đa 5 media message sticker/GIF trong một cửa sổ 30 giây trên mỗi user và cooldown ngắn giữa hai lần gửi (khoảng 1 giây); nếu project hiện có rate limit khác, thống nhất với nó và ghi thông số trong config/documentation. Trả lỗi có cấu trúc và thời gian retry nếu vượt hạn mức.
- Test cả khi gửi nhanh bằng client bình thường và khi giả lập gọi API/socket lặp lại. Không dùng một limiter frontend làm bằng chứng rằng backend chống spam.
- Nếu enforcement dùng in-memory store, tài liệu phải nêu rõ giới hạn khi chạy nhiều backend instance. Tái sử dụng Redis/distributed store nếu project đã có; không tự thêm hạ tầng ngoài phạm vi nếu chưa cần.

## 8. API, schema và tích hợp

- Ưu tiên contract hiện có `/api/stickers/packs`, `/api/stickers/search`, `/api/gifs/search`, `StickerPack`, `uploadService`, `Message`, Socket.IO và `useChatStore`. Nếu có thay đổi thì lập bảng endpoint/payload cũ → mới trong plan và cập nhật mọi consumer/test.
- Thiết kế endpoint admin rõ ràng (ví dụ `/api/admin/media/...` hoặc namespace tương đương). Toàn bộ endpoint thay đổi data phải có authentication + admin authorization + validation.
- Mọi metadata được validate cả backend (bắt buộc) và frontend (UX). Tags/keywords phải được trim, normalize, bỏ trùng, có giới hạn số lượng/kích thước để ngăn input quá lớn.
- Không truyền đường dẫn local file từ client để backend tự đọc; upload bằng multipart/memory buffer theo pattern hiện có.
- Xử lý file upload thành công nhưng tạo DB thất bại (cleanup object); DB xóa/thay metadata không được làm mất asset khi cập nhật không thành công.
- Thêm index/query strategy hợp lý cho `isActive`, `category`, `tags/normalized keywords` tùy schema thực tế. Search không được trả về asset không active, asset cần thay thế hoặc URL external trong production.
- Cập nhật API docs/README nếu có; cập nhật `backend/src/plan.md` và `frontend/src/plan.md` mà không xóa mất thông tin/roadmap có sẵn.

## 9. Kế hoạch thực hiện tuần tự — bắt buộc lưu vào file

Tạo `docs/chat-modernization-plan.md` (nếu `docs/` chưa tồn tại thì tạo) làm checklist nguồn cho đợt này. Đọc các plan gốc trước khi tạo để không trùng hoặc mâu thuẫn. Mỗi task cần có `TODO / IN_PROGRESS / DONE / BLOCKED`, file liên quan, lệnh test và kết quả thực tế. Cập nhật checklist khi chuyển phase.

### Phase 0 — Audit & baseline
- [ ] Xác minh stack, scripts, router, theme, quyền admin, storage config, E2EE và API contracts từ code local.
- [ ] Chạy các build/lint/test hiện có trước khi sửa; ghi lỗi nền hiện hữu tách biệt với regression mới.
- [ ] Ghi lại danh sách tính năng và vấn đề UX/bug đã xác minh.
- [ ] Đặt phạm vi ngoài call/post rõ ràng.

### Phase 1 — Design system
- [ ] Đọc `.cursor/skills/ui-ux-pro-max/SKILL.md` và dùng script design-system + stack/UX search hợp lệ.
- [ ] Tạo/điều chỉnh `design-system/mxh-chat/MASTER.md` và page overrides nếu phù hợp.
- [ ] Chốt palette cam hiện tại, token light/dark, type scale, radius, spacing, shadows, focus/hover, responsive grid.
- [ ] Ghi các anti-pattern cần tránh.

### Phase 2 — Redesign chat UI
- [ ] Refactor `ChatPage` thành các component nhỏ theo cấu trúc hiện có, chỉ khi cần; tránh giant component.
- [ ] Hoàn thiện inbox list, search, active conversation, header, message timeline, reply preview, composer, menu/popover, skeleton/empty/error.
- [ ] Tích hợp `StickerPicker`, `EmojiPickerButton`, GIF suggestions sao cho UI gọn.
- [ ] Hoàn thiện responsive và theme light/dark.
- [ ] Test interactions và keyboard, không chỉ xem UI tĩnh.

### Phase 3 — Chat text/file/image end-to-end
- [ ] Trace và xác minh luồng gửi text từ UI đến recipient realtime.
- [ ] Sửa upload workflow để gửi ảnh/tệp một lần, không duplicate upload/message.
- [ ] Validate MIME/extension/size phía server; đảm bảo image preview và file download/open đúng.
- [ ] Kiểm tra E2EE compatibility và quyền truy cập storage.
- [ ] Bổ sung frontend/backend tests cho success/failure/permission/large file/unsupported type.

### Phase 4 — Sticker/GIF schema + self-hosted storage
- [ ] Chọn model/source of truth dựa trên hiện trạng; giảm phụ thuộc JSON tĩnh cho GIF.
- [ ] Triển khai upload asset tới Supabase Storage/S3 của project và lưu metadata/key.
- [ ] Xử lý dữ liệu GIF Giphy cũ như legacy asset chờ thay thế, không tiếp tục đưa external URL vào suggestion production.
- [ ] Bảo đảm sửa/tắt/xóa asset không phá tin nhắn cũ.

### Phase 5 — Admin media management
- [ ] Tạo backend CRUD/search/upload/delete endpoints với validation và admin middleware.
- [ ] Chốt allowlist admin qua env nếu chưa có RBAC đáng tin cậy; cập nhật `.env.example`, không expose secrets.
- [ ] Tạo frontend admin page, route guard, upload form, metadata chips, preview, list/filter/search, edit/inactivate/confirm delete.
- [ ] Kiểm tra người dùng không phải admin bị chặn từ backend.

### Phase 6 — Relevance suggestions + anti-spam
- [ ] Cải thiện normalization/ranking theo Vietnamese keywords/phrases/tags/synonyms.
- [ ] Gợi ý debounced, ít kết quả, không che composer, không auto-send.
- [ ] Rate limit sticker/GIF ở backend dùng chung HTTP + Socket.IO; frontend xử lý 429/cooldown.
- [ ] Kiểm tra query nhanh liên tục, request race/cancel, kết quả rỗng và gửi media double-click.

### Phase 7 — Test, build, regression, polish
- [ ] Frontend: chạy `npm test`, `npm run lint`, `npm run build` trong `frontend/`.
- [ ] Backend: chạy `npm test` và `npm run lint` trong `backend/`; chạy e2e test liên quan upload/chat/sticker/GIF.
- [ ] Nếu có Playwright/browser test sẵn thì dùng; nếu không, bổ sung test phù hợp theo stack test có sẵn, không thêm framework lớn không cần thiết.
- [ ] Kiểm tra thủ công 375/768/1024/1440px, theme light/dark, keyboard/focus, overflow, states và media preview.
- [ ] Test 401/403, data validation, upload fail, DB fail, GIF asset inactive, spam 429, E2EE regression.
- [ ] Sửa các lỗi phát hiện trong phạm vi cho đến khi các check có thể pass hoặc nêu rõ blocker môi trường thật (ví dụ thiếu .env/DB credentials).

### Phase 8 — Tài liệu và bàn giao
- [ ] Cập nhật `docs/chat-modernization-plan.md` với kết quả từng task, lệnh đã chạy và PASS/FAIL thực tế.
- [ ] Cập nhật README/plan frontend/backend, biến env mới và hướng dẫn tạo admin/upload sticker GIF.
- [ ] Tóm tắt file thay đổi, API/schema changes, cách run/test và giới hạn còn lại.

**Thứ tự bắt buộc:** Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Có thể điều chỉnh thứ tự bên trong phase khi có phụ thuộc kỹ thuật, nhưng phải ghi lý do vào plan. Đừng dừng sau khi chỉ tạo plan; tiếp tục thực thi phase tuần tự. Chỉ dừng để hỏi user nếu thiếu thông tin/secret không thể thay bằng placeholder an toàn hoặc có nguy cơ mất dữ liệu khó đảo ngược.

## 10. Test cases tối thiểu phải có

### Chat core
- Gửi text thành công, nhận realtime ở người nhận, refresh trang vẫn có history.
- Gửi empty/whitespace không tạo message.
- Enter gửi; Shift+Enter xuống dòng; IME tiếng Việt không gửi giữa lúc composition.
- Reply message đúng và hủy reply không làm sai payload.
- Trạng thái gửi thất bại giữ draft và không tạo double message khi retry.
- Mở/đóng picker và menu không làm mất text draft.

### Upload
- Upload ảnh hợp lệ thành công, người nhận thấy thumbnail, ảnh lỗi có fallback.
- Upload PDF/DOCX/tệp hợp lệ thành công và người nhận tải/mở được.
- Reject file type không được cho phép; reject file vượt giới hạn.
- Backend trả lỗi rõ ràng cho unauthenticated/non-member/đứt kết nối/storage lỗi.
- Không upload hai lần hoặc tạo hai message cho một thao tác.

### Sticker/GIF/admin
- User bình thường xem/search được asset active, không thể create/update/delete.
- Admin upload asset; metadata được lưu và asset xuất hiện trong picker/suggestion sau commit thành công.
- Sửa tags/keywords/synonyms làm thay đổi kết quả tìm kiếm có thể kiểm chứng.
- Tắt asset khiến nó biến khỏi suggestion/picker mới; tin nhắn cũ không crash.
- External Giphy URL legacy không xuất hiện trong suggestion production nếu asset chưa được host theo quy ước của dự án.
- Empty list, loading, invalid metadata, upload failure, DB failure và delete confirmation đều được xử lý.

### Suggestion/rate limit
- Khi gõ cụm tiếng Việt phù hợp, kết quả liên quan xuất hiện sau debounce.
- Khi query đổi nhanh, response cũ không đè response mới.
- Khi không match, UI không để lại panel rỗng khó hiểu.
- Không có media nào tự gửi chỉ do nhập text.
- Click một GIF/sticker gửi đúng một lần; double-click không tạo bản sao.
- Quá giới hạn sticker/GIF nhận lỗi 429 ở HTTP và Socket.IO; text/image/file vẫn không bị limiter media chặn.

### Quality gates
- Không có lỗi TypeScript/build, không thêm console error do thay đổi.
- Không có route admin chỉ được bảo vệ ở frontend.
- Không dùng fake data để che API lỗi.
- Không làm hỏng auth, E2EE, Socket.IO, light/dark theme, group/direct chat hoặc call logic sẵn có.
- Không có layout overflow tại 375px, 768px, 1024px, 1440px.

## 11. Quy tắc làm việc của Agent

- Làm trong repo hiện có, giữ conventions và scripts sẵn có. Không viết lại kiến trúc chỉ vì sở thích cá nhân.
- Trước khi cài dependency mới, kiểm tra package hiện có; chỉ cài khi thiếu và có lý do. Không chạy lệnh phá dữ liệu.
- Không ghi `.env`, token, secret, key hoặc dữ liệu người dùng vào source/log/test snapshots.
- Không hoàn thành bằng cách tạo UI mock-only; tích hợp API thật hoặc ghi rõ blocker.
- Không xóa tests cũ để pass build; sửa nguyên nhân hoặc giải thích failure là baseline.
- Không đánh dấu PASS nếu lệnh/test chưa chạy. Nếu không chạy được do thiếu DB/storage env, ghi rõ `BLOCKED BY ENV` và vẫn chạy mọi test không cần credential.
- Sau mỗi phase, cập nhật checklist và chạy test tương ứng trước khi chuyển phase kế tiếp.
- Cuối cùng trả về: tóm tắt thay đổi, các tính năng thực sự hoạt động, endpoint/schema mới, test command và kết quả thực tế, bước setup admin/env còn cần user làm thủ công, cùng giới hạn còn lại.

## Bắt đầu ngay

Bắt đầu từ Phase 0. Đọc code local, kiểm tra skill UI/UX Pro Max, chạy baseline, tạo `docs/chat-modernization-plan.md`, rồi thực thi từng phase theo thứ tự. Không chỉ trả lại plan và chờ tôi xác nhận.
