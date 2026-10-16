# Design Override — Chat (MXH)

> File này override các giá trị từ `MASTER.md` cho màn hình Chat và Admin Media.
> Áp dụng cho: `ChatPage`, `MessageInput`, `MessageBubble`, `StickerPicker`,
> `EmojiPickerButton`, `useGifSuggest`, admin media page.

## Lý do override

MXH đã có brand cam (`#FF6B35` + `#FF9F43`) đang dùng trong `MainLayout` và
`index.css` (GreenX theme). MASTER.md đề xuất primary blue `#2563EB` sẽ phá
nhận diện thương hiệu. Mục tiêu là giữ cam làm accent/CTA/selected state
và dùng neutral cho surface.

## Color overrides (Chat & Admin)

| Role            | Hex        | Notes                                                   |
|-----------------|------------|---------------------------------------------------------|
| Primary (cam)   | `#FF6B35`  | CTA, selected conversation, message bubble "me", focus  |
| Secondary (cam) | `#FF9F43`  | Gradient, hover, link                                   |
| Accent          | `#FF6B35`  | CTA accent, giống primary để giữ nhất quán              |
| Background      | `#FFFFFF`  | Light mode (đang dùng trong `index.css`)                |
| Foreground      | `#1F2937`  | Body text light mode                                    |
| Muted BG        | `#FFF4ED`  | Hover/active conversation row (cam rất nhạt)            |
| Border          | `#FFE4D1`  | Subtle, không chói                                      |
| Muted text      | `#6B7280`  | Secondary text                                          |
| Destructive     | `#EF4444`  | Xoá, lỗi                                                |
| Success/online  | `#22C55E`  | Online indicator                                        |

Dark mode: giữ nguyên tỉ lệ, hạ saturation một chút để dễ nhìn:
- Primary: `#FF7E50`
- Background: `#1A1A1A`
- Foreground: `#F5F5F5`
- Muted BG: `#2A2A2A`
- Border: `#333333`

## Typography

- Dùng Plus Jakarta Sans như MASTER.md.
- Body 14–15px, heading 16–22px, timestamp 10–12px.
- Bubble text 14px line-height 1.4.

## Spacing & rhythm

- Composer: padding 12–16px, gap 8–10px.
- Bubble tail: border-radius 18px, top corner tùy vị trí.
- Inbox row: padding 12px, avatar 44px, gap 12px.
- Section gap: 16–24px.

## State anti-pattern cần tránh

- ❌ Đổi background đậm khi selected conversation (gây chói).
- ❌ Bày 5–8 icon cạnh mỗi hội thoại → dồn vào `DropdownMenu`/overflow.
- ❌ Composer có nhiều button lớn xếp dải ngang.
- ❌ Auto-scroll giật khi user đang đọc lịch sử.
- ❌ Truncate nội dung media → fallback icon + tên file.
- ❌ Emoji thay icon chức năng (📷, 📎, 🎤) — dùng Lucide.

## Patterns áp dụng

- Inbox trái (Instagram DM) — 320px, có thể collapse dưới 1024px.
- Conversation panel center.
- Details panel: ẩn mặc định, mở qua overflow menu.
- Composer gọn: 1 input + 1 nút gửi; các action phụ gom vào nút `+` (paperclip menu).
- Sticker/GIF picker: bottom sheet hoặc dialog có search.
- Admin media: bảng/list có thumbnail, filter, search, badge trạng thái.
