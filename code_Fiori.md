# Quy tắc làm việc — project SAP Fiori (PS)

Thư mục này chứa các project SAPUI5 của module PS, mỗi project có tài liệu thiết kế (基本設計書) dạng `.xlsx` tiếng Nhật.

**Chi tiết quy trình đầy đủ nằm ở skill `fiori-spec-workflow`.** File này là phần bắt buộc, luôn áp dụng.

---

## 7 nguyên tắc bất biến

1. **Không sửa file trước rồi mới đưa căn cứ.** Trình đề xuất → chờ duyệt → mới sửa.
2. **Không suy đoán spec.** Mọi khẳng định "spec nói X" phải kèm sheet + ô + nguyên văn tiếng Nhật.
3. **Không sửa code đang chạy vì "trông có vẻ sai"** khi chưa kiểm chứng được bằng thư viện/runtime thật.
4. **Chỉ thêm hàm mới, KHÔNG sửa và KHÔNG dùng lại hàm cũ.** Hàm cũ bị thay thì comment lại (không xoá) và báo cáo vị trí hàm cũ.
5. **Trước khi đề xuất — quét ảnh hưởng ra toàn bộ project**, không chỉ file đang sửa. Kết quả quét là một phần của đề xuất.
6. **Sau khi sửa — kiểm tra + test lại toàn bộ project** xem có xung đột hay lỗi phát sinh không, **rồi mới báo cáo**.
7. **Mọi vị trí trong báo cáo phải là đường dẫn bấm được**, trỏ thẳng tới đúng dòng.

---

## Trước khi sửa — đề xuất phải có đủ

| # | Nội dung |
|---|---|
| 1 | Tài liệu nào — `処理ﾌﾛｰ` / `画面項目定義書` / `項目ﾁｪｯｸ基準書` / `【補足】…` / `詳細条件定義書` |
| 2 | Sheet nào, **ô nào** — ví dụ `【補足】Fiori処理 F118` |
| 3 | **Nguyên văn tiếng Nhật**, trích đúng, không diễn giải |
| 4 | Code hiện tại làm gì **vs** spec yêu cầu gì |
| 5 | Diff đề xuất |
| 6 | **Khảo sát project anh em** — xem bên dưới |
| 7 | **Quét ảnh hưởng toàn project** — grep mọi ký hiệu bị đụng, kể cả đường gọi gián tiếp |

Kết luận nào là **suy luận** chứ không phải câu chữ trực tiếp → nói rõ "đây là suy luận, căn cứ là …".

### Khảo sát project anh em

Luôn kiểm tra `zpsr0010` `zpsr0108` `zpsr0113` `zpsr0120` `zpsr0122` `zpsr0123` trước khi đề xuất. Báo **1 trong 3**:

| Tình huống | Phải báo |
|---|---|
| Không project nào có code liên quan | Nói rõ — đây là thiết kế tự nghĩ, không có mẫu |
| Có và giống nhau | Nêu vị trí tham khảo `<project>/webapp/<file>:<dòng>` + tên hàm |
| Có nhưng khác nhiều | Khác chỗ nào, vì sao không copy được — nêu vị trí **cả hai** |

> **`zpsr0019` được copy từ `zpsr0010`** (cùng service `ZPSR0010_SRV`, cùng tên hàm). Code trông có vẻ sai ở `zpsr0010` thường là code production đang chạy — xác minh trước khi "sửa".

### Đường gọi gián tiếp hay bị sót khi quét ảnh hưởng

| Kiểu | Ví dụ |
|---|---|
| Handler khai báo bằng chuỗi trong constant | `CellChangeHandlers: { X: "onFoo" }` rồi `this[sHandler]()` |
| Tên dựng động | `"valueState" + sKey` |
| Gọi qua `this[...]` | `this[sName](oEvent)` |
| Binding XML | `formatter: '.onFoo'` |
| Fragment | không nằm trong `Main.view.xml` nhưng vẫn gọi hàm controller |

---

## Sau khi sửa — bắt buộc trước khi báo cáo

1. Chạy sweep toàn project (syntax · XML · manifest · `define()` · handler ↔ controller · Constants · i18n · ID trùng · tên hàm trùng)
2. ESLint có bật `no-undef` — cấu hình mặc định của Fiori tools **không bật**, bỏ sót cả lớp lỗi `ReferenceError`
3. **Chạy lại tất cả test cũ** — test task trước phải vẫn pass
4. So với baseline lấy trước khi sửa — số lỗi **không được tăng**; lỗi **biến mất bất thường** cũng phải truy
5. Diff với backup các task trước — kiểm tra sửa đổi cũ còn nguyên không

---

## Báo cáo

| Nội dung | |
|---|---|
| Từng chỗ sửa: **vị trí bấm được** + trước/sau | bắt buộc |
| **Vị trí hàm cũ đã comment** (nếu có thay hàm) | bắt buộc |
| Kết quả test — kể cả hồi quy | bắt buộc |
| Kết quả sweep — so baseline | bắt buộc |
| Vị trí backup | bắt buộc |
| Điều chưa kiểm chứng được | nếu có |

### Định dạng vị trí

```
[Main.controller.js:2831](zpsr0019/webapp/controller/Main.controller.js#L2831)
[constant.js:333-339](zpsr0019/webapp/utils/constant.js#L333-L339)
```

Đường dẫn tương đối từ gốc workspace. Trỏ được tới dòng thì không dừng ở mức file.

File không link được (spec `.xlsx`, backup scratchpad) thì ghi cụ thể bằng chữ:

```
PS105 → sheet 【補足】Fiori処理 → ô F118
scratchpad/Main.beforeNo53.js
```

---

## Quy tắc comment

**Văn xuôi bằng tiếng Anh. Tên field, tên màn hình, tên nút, tên mục spec — giữ nguyên tiếng Nhật.**

Không dịch danh từ riêng. Không viết song ngữ lặp lại. Ngắn — 1 dòng cho constant, 1-3 dòng cho JSDoc.

```js
// DUNG
// Sort Search Help [組計状況] by custom order
// [所要日付] "20260914" -> Date object
// 項目ﾁｪｯｸ基準書 No.53 — 必須入力項目が未入力の場合

// SAI
// Sắp xếp Search Help theo thứ tự tuỳ chỉnh          ← tieng Viet
// Sort Search Help by Assembly Status                 ← dich ten field
// Sort Search Help [組計状況] by custom order
// 組計状況の検索ヘルプをカスタム順でソートする          ← song ngu lap lai
// Loop through the fields and check each one          ← mo ta lai code
```

Khi code hiện thực một câu cụ thể của spec, trích nguyên văn tiếng Nhật câu đó để người sau dò ngược được.

---

## Bẫy kỹ thuật SAPUI5 hay gặp

| Vấn đề | Cách đúng |
|---|---|
| `ValueState` trong `sap.ui.table` | Ghi `oRow.valueState<X>` vào **model**, không `oControl.setValueState()` — `refresh()` sẽ ghi đè |
| Control id lúc runtime có prefix | `oEvent.getSource().getId().split("--").pop()` |
| `getView().byId()` trong table template | Trả về **template gốc**, không phải ô của dòng. Dùng `oEvent.getSource().getBindingContext("<model>").getObject()` |
| `aoa_to_sheet` vs `json_to_sheet` | `json_to_sheet` nhận cell object `{v,t,s}` để tô màu, `aoa_to_sheet` **không** |
| `FileUploader` `fileType="xlsx"` | File sai đuôi bắn `typeMissmatch`, **không** bắn `change` |
| `onInit: async function` | Trả Promise ngầm → UI5 1.120+ log `[FUTURE FATAL]`. Tách phần async ra hàm riêng |
| Chèn thuộc tính vào XML | Phải nằm **trong thẻ mở**. Control có thẻ con đóng bằng `>` chứ không phải `/>` |

---

## Thuật ngữ spec

| Tiếng Nhật | Nghĩa |
|---|---|
| 検索条件部 | Vùng điều kiện tìm kiếm |
| 一覧出力部 | Vùng danh sách kết quả (bảng) |
| 一括入力 | Nhập hàng loạt |
| 編集 / 追加 / 複写 / 削除 | Sửa / Thêm / Sao chép / Xoá |
| 行区分 | Loại dòng: `N` 通常行 · `R` 表示行 (readonly) · `D` 削除行 · `A` 追加行 |
| 表示モード | Thao tác: `U` sửa · `I` thêm · `D` xoá |
| 入力可不可 | Cột trong 画面項目定義書: `◎` bắt buộc · `○` nhập được · `×` không nhập được |
| ※FIORIのみでハンドリング | Chỉ Fiori xử lý, ABAP không làm |
| 項目ﾁｪｯｸ基準書 No.X | Số hiệu message lỗi |

**Chữ đỏ trong spec = yêu cầu bổ sung về sau.** Luôn quét chữ đỏ khi bắt đầu một chức năng.
