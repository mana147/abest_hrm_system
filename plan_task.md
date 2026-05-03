# Kế hoạch: Xử lý SVG inline trong landing.ejs

## Context

`landing.ejs` hiện có 2 khối SVG logo giống hệt nhau được inline trực tiếp (~33 dòng mỗi cái):
- Navbar (dòng 21–53): gradient IDs `bgNavyIcon`, `goldIcon`
- Footer (dòng 420–452): gradient IDs `bgNavyIconFooter`, `goldIconFooter` (đổi tên để tránh conflict ID trong cùng document)

Vấn đề: trùng lặp code, sửa logo phải sửa 2 chỗ, IDs phải đặt tên khác nhau thủ công.

## Hướng tiếp cận: Static SVG file + `<img>` tag

Đây là lựa chọn tối ưu vì:
- Mỗi `<img>` render SVG trong isolated context riêng → gradient IDs không conflict, không cần suffix
- Browser cache SVG file → cả navbar + footer dùng 1 HTTP response
- Không thêm pattern mới vào views layer
- Sửa logo ở 1 chỗ (1 file), apply cho toàn bộ
- CSS `.lp-logo-icon` trên `<img>` vẫn hoạt động bình thường

**Option B (EJS partial)** không cần thiết ở đây vì logo dùng màu hardcoded, không cần theming/animation/CSS customization từ parent.

## Các thay đổi cần thực hiện

### File 1: Tạo `public/images/logo.svg`

SVG dùng gradient IDs đơn giản (`bgNavy`, `gold`) — không còn cần suffix vì mỗi `<img>` có context riêng:

```xml
<svg viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="bgNavy" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#0a1d3a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0d28a"/>
      <stop offset="50%" stop-color="#d4b46a"/>
      <stop offset="100%" stop-color="#a08442"/>
    </linearGradient>
  </defs>
  <circle cx="85" cy="85" r="82" fill="url(#bgNavy)"/>
  <circle cx="85" cy="85" r="78" fill="none" stroke="url(#gold)" stroke-width="2.5"/>
  <circle cx="85" cy="85" r="71" fill="none" stroke="url(#gold)" stroke-width="1"/>
  <line x1="85" y1="14" x2="85" y2="22" stroke="url(#gold)" stroke-width="2"/>
  <line x1="85" y1="148" x2="85" y2="156" stroke="url(#gold)" stroke-width="2"/>
  <line x1="14" y1="85" x2="22" y2="85" stroke="url(#gold)" stroke-width="2"/>
  <line x1="148" y1="85" x2="156" y2="85" stroke="url(#gold)" stroke-width="2"/>
  <g fill="url(#gold)">
    <g transform="translate(34, 85)">
      <path d="M 0 -3 L 0.85 -0.85 L 3 0 L 0.85 0.85 L 0 3 L -0.85 0.85 L -3 0 L -0.85 -0.85 Z"/>
    </g>
    <g transform="translate(136, 85)">
      <path d="M 0 -3 L 0.85 -0.85 L 3 0 L 0.85 0.85 L 0 3 L -0.85 0.85 L -3 0 L -0.85 -0.85 Z"/>
    </g>
  </g>
  <text x="85" y="112" font-family="'Trajan Pro', 'Cinzel', 'Times New Roman', serif"
        font-size="100" font-weight="700" fill="url(#gold)" text-anchor="middle">A</text>
  <g transform="translate(85, 130)">
    <line x1="-22" y1="0" x2="22" y2="0" stroke="url(#gold)" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="2" fill="url(#gold)"/>
  </g>
</svg>
```

### File 2: `src/views/landing.ejs`

**Thay đổi 1 — Navbar (dòng 21–53):** Xóa toàn bộ `<svg class="lp-logo-icon"...>...</svg>`, thay bằng:
```html
<img class="lp-logo-icon" src="/images/logo.svg" width="38" height="38" alt="">
```

**Thay đổi 2 — Footer (dòng 420–452):** Tương tự, thay `<svg class="lp-logo-icon"...>...</svg>` bằng:
```html
<img class="lp-logo-icon" src="/images/logo.svg" width="38" height="38" alt="">
```

**Thay đổi 3 — `<head>` (sau các `<link rel="preconnect">`):** Thêm preload:
```html
<link rel="preload" href="/images/logo.svg" as="image" type="image/svg+xml">
```

### File không cần sửa

- `public/css/landing.css` — `.lp-logo-icon { width:38px; height:38px }` áp dụng cho `<img>` bình thường
- `src/app.js` — Express đã serve `/public` static, `/images/logo.svg` tự động available tại `/images/logo.svg`

## Tóm tắt thay đổi

| File | Action |
|------|--------|
| `public/images/logo.svg` | Tạo mới |
| `src/views/landing.ejs` dòng 21–53 | Thay 33 dòng SVG → 1 dòng `<img>` |
| `src/views/landing.ejs` dòng 420–452 | Thay 33 dòng SVG → 1 dòng `<img>` |
| `src/views/landing.ejs` `<head>` | Thêm 1 dòng `<link rel="preload">` |

**Net result:** -64 dòng SVG inline, +3 dòng thay thế ≈ giảm ~61 dòng.

## Xác minh

1. Chạy `npm run dev` → mở `http://localhost:3000`
2. Kiểm tra logo hiển thị đúng màu navy/gold ở cả navbar và footer
3. Scroll xuống footer — logo phải giống hệt navbar
4. DevTools → Network → filter "svg" → thấy 1 request duy nhất cho logo.svg
5. DevTools → Elements → xác nhận không còn `<svg>` inline trong DOM
