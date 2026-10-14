# Factory Production Intelligence — GitHub Pages V1.2

**繁體中文 / Tiếng Việt** · Preloaded production data (2026-10-13) · Local Excel import supported.

## Start / Bắt đầu

- Chinese: `https://kdusec-alt.github.io/factory-production-intelligence/`
- Vietnamese: `https://kdusec-alt.github.io/factory-production-intelligence/?lang=vn`
- The dashboard automatically loads the committed data: **36 production days, 108 model records, 28 September quality issues**.
- Use **Tải lại dữ liệu trên web** to reset the view to the published dataset, or **Nhập Excel** to merge more recent records in the browser.
- **Tải Excel tiếng Việt** downloads `data/Factory_Production_Intelligence_Vietnamese_2026-10-13.xlsx`.
- The spreadsheet includes `Master_Daily`, `Model_Data`, `Quality_Issues`, `So_sanh`, `Huong_dan` and formulas for the 8H efficiency comparison.

## Data and privacy

**Important:** This repository and GitHub Pages are public. The committed workbook and bundled dataset include actual production figures, quality findings, and staff names. They can be downloaded by anyone with access to the public URL. The owner explicitly requested uploading this data.

Manual Excel imports are processed in the browser and are **not** automatically committed to GitHub. There is no login, team database, or MES synchronization. Future updates to the published dataset require a new commit.

## Metric rules

- 8H final output = total daily final output − OT final output.
- Weighted pairs/man-hour = SUM(8H output) / SUM(HC × normal hours).
- GCĐ/Stockfit and TH/Assembly are sequential processes; do not sum their pairs.
- Sabrina 4 double-pass flow can shift final output between 8H and OT; output efficiency is not the actual process-cycle efficiency.
- October OT recorded as zero with blank OT headcount must be confirmed before concluding no overtime occurred.
- Quality allocation MK 532 / TH 231 must not be counted entirely against Assembly.

## Vietnamese notes / Ghi chú tiếng Việt

Số liệu được tải sẵn đến ngày 13/10/2026. Chọn **Tiếng Việt** hoặc mở đường dẫn `?lang=vn` để sử dụng giao diện tiếng Việt. Khi cập nhật dữ liệu mới, hãy nhập Excel trên trình duyệt. Dữ liệu được công khai trong GitHub Pages, không có chức năng phân quyền người dùng.
