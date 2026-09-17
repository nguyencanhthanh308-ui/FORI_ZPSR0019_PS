> File này là bản xuất đầy đủ của skill `fiori-spec-workflow` (nguồn: `~/.claude/skills/fiori-spec-workflow/SKILL.md`), để xem/chia sẻ ngay trong workspace. Bản rút gọn luôn-được-nạp nằm ở [code_Fiori.md](code_Fiori.md). Script đi kèm (`xlsx-find.js`, `xlsx-sheet.js`, `extract-method.js`, `sweep.js`, `eslint-noundef.mjs`) vẫn nằm ở thư mục skill gốc, không copy vào đây.

---

# Quy trình sửa code Fiori theo tài liệu thiết kế

Áp dụng cho mọi project SAPUI5 có spec là file Excel tiếng Nhật (PS105, PS123, …).

---

## NGUYÊN TẮC BẤT BIẾN

1. **Không bao giờ sửa file trước rồi mới đưa căn cứ.** Trình đề xuất → chờ duyệt → mới sửa.
2. **Không suy đoán spec.** Mọi khẳng định "spec nói X" phải kèm sheet + ô + nguyên văn.
3. **Không sửa lại code đang chạy vì "trông có vẻ sai"** khi chưa kiểm chứng được bằng thư viện/runtime thật.
4. **Chỉ thêm hàm mới, KHÔNG sửa và KHÔNG dùng lại hàm cũ.** Hàm cũ bị thay thì **comment lại** (không xoá) và **báo cáo vị trí hàm cũ**. Xem BƯỚC 4.
5. **Trước khi đề xuất — phải quét ảnh hưởng ra TOÀN BỘ project**, không chỉ file đang sửa. Kết quả quét là một phần của đề xuất. Xem BƯỚC 3.
6. **Sau khi sửa xong — phải kiểm tra + test lại toàn bộ project** xem có xung đột hay lỗi phát sinh không, **rồi mới báo cáo**. Không được báo "xong" khi chưa quét. Xem BƯỚC 6.
7. **Mọi vị trí trong báo cáo phải là đường dẫn bấm được**, trỏ thẳng tới đúng dòng. Xem BƯỚC 7.

---

## BƯỚC 1 — Đề xuất (trước khi sửa)

Trình đủ **5 mục**:

| # | Nội dung |
|---|---|
| 1 | Tài liệu nào — `処理ﾌﾛｰ` / `画面項目定義書` / `項目ﾁｪｯｸ基準書` / `【補足】…` / `詳細条件定義書` |
| 2 | Sheet nào, **ô nào** — ví dụ `【補足】Fiori処理 F118` |
| 3 | **Nguyên văn tiếng Nhật**, trích đúng, không diễn giải |
| 4 | Code hiện tại làm gì **vs** spec yêu cầu gì |
| 5 | Diff đề xuất |

Nếu kết luận nào là **suy luận** chứ không phải câu chữ trực tiếp → nói rõ "đây là suy luận, căn cứ là …".

### Cách tra ô trong .xlsx

Xem `scripts/xlsx-find.js`. Nguyên lý: giải nén xlsx → tìm chỉ số shared-string của câu → đọc ngược thuộc tính `r="<ô>"` trong sheet XML.

```
node scripts/xlsx-find.js <thu-muc-giai-nen> "<mot doan cua cau>"
```

---

## BƯỚC 2 — Khảo sát project anh em (trước khi sửa)

**Luôn** kiểm tra các project cùng hệ trước khi đề xuất. Báo cáo **1 trong 3**:

| Tình huống | Phải báo |
|---|---|
| Không project nào có code liên quan | Nói rõ → người dùng biết đây là thiết kế tự nghĩ, không có mẫu để copy |
| Có và giống nhau | Nêu **vị trí tham khảo** `<project>/webapp/<file>:<dòng>` + tên hàm |
| Có nhưng khác nhiều về logic | Mô tả **khác chỗ nào**, **vì sao** project này không copy được — nêu vị trí **cả hai** |

### Cảnh báo về project gốc

Nhiều project được **copy từ một project khác**. Dấu hiệu: cùng OData service, cùng tên hàm, cùng cấu trúc. Code trông có vẻ sai ở project gốc thường là **code production đang chạy** — phải xác minh trước khi "sửa".

Cách tìm project gốc: so `manifest.json` → `sap.app.dataSources.mainService.uri`. Nếu service không trùng tên project thì rất có thể đó là project gốc.

---

## BƯỚC 3 — Quét ảnh hưởng toàn project (trước khi sửa)

> **Bắt buộc.** Phạm vi là **toàn bộ project**, không phải chỉ file đang sửa. Kết quả quét phải nằm **trong đề xuất**, trước khi xin duyệt.

### 3.1 — Với mỗi thứ bị thay / xoá / đổi tên

Trả lời 4 câu, **chứng minh bằng grep**, không suy đoán:

1. **Trước đây ai gọi nó?** — event trong view/fragment, hàm khác trong controller, constant chứa tên hàm, handler khai báo bằng chuỗi
2. **Sau khi sửa ai gọi nó?** — nếu không còn ai gọi thì nó thành code chết, phải nói rõ
3. **Spec yêu cầu gì ở nó?** — đọc lại 【補足】/ 詳細条件定義書 / 画面項目定義書 liên quan
4. **Hành vi nào được *thêm vào* mà trước đây không có?** — ví dụ handler dùng chung giờ chạy cho cả những cột trước đây không gọi nó

### 3.2 — Quét lan toả ra toàn project

Với **mỗi** ký hiệu bị đụng tới (tên hàm, tên constant, tên property, key i18n, control id), grep trên **toàn bộ** `webapp/`:

```
grep -rn "<ky-hieu>" webapp/
```

Phải kiểm đủ các đường gọi **gián tiếp** — đây là chỗ hay sót nhất:

| Kiểu gọi gián tiếp | Ví dụ |
|---|---|
| Handler khai báo bằng chuỗi trong constant | `CellChangeHandlers: { X: "onFoo" }` rồi `this[sHandler]()` |
| Tên model / property dựng động | `"valueState" + sKey` |
| Tên hàm gọi qua `this[...]` | `this[sName](oEvent)` |
| Binding trong XML | `formatter: '.onFoo'`, `{path: 'model>/X'}` |
| Fragment | không nằm trong `Main.view.xml` nhưng vẫn gọi hàm controller |

### 3.3 — So sánh cơ học, không nhìn bằng mắt

- Backup file trước khi sửa
- Sau đó diff **theo từng đơn vị** (control id, tên hàm), không diff thô cả file
- Với view: liệt kê `id → change / liveChange / formatter` của bản cũ và bản mới rồi so bảng

### 3.4 — Lấy baseline

Chạy `scripts/sweep.js` **trước khi sửa** và lưu kết quả. BƯỚC 6 sẽ so với con số này.

---

## BƯỚC 4 — Sửa

- Backup trước: copy file vào thư mục scratchpad
- Sửa đúng phạm vi đã duyệt, không kèm theo "tiện tay dọn dẹp"
- Comment theo **QUY TẮC COMMENT** ở mục riêng bên dưới

### 4.1 — Chỉ thêm hàm mới, không dùng lại hàm cũ

Khi một logic cần thay đổi: **viết hàm mới**, không sửa hàm cũ, cũng không gọi lại hàm cũ từ hàm mới.

| Việc | Cách làm |
|---|---|
| Hàm cũ | **Comment lại toàn bộ**, không xoá |
| Đánh dấu | Thêm 1 dòng ngay trên khối comment: `// --- OLD: replaced by <tên hàm mới> (<tên chức năng tiếng Nhật>) ---` |
| View / binding | Trỏ sang hàm mới |
| Báo cáo | **Phải nêu vị trí hàm cũ** đã comment — đường dẫn bấm được tới dòng bắt đầu khối comment |

```js
			// --- OLD: replaced by onPressExportFormatButton (取込フォーマットダウンロード) ---
			// onPressDownloadFormatExcel: function (oEvent) {
			// 	this._clearMessages();
			// 	...
			// },
```

**Ngoại lệ duy nhất:** người dùng nói rõ là được phép sửa/dùng lại hàm cũ. Khi đó vẫn phải báo trong đề xuất rằng đang sửa hàm cũ, và sửa những dòng nào.

**Lưu ý khi hàm cũ vẫn phải chạy:** nếu hàm cũ còn cần thiết cho luồng khác thì **không comment nó**, mà gọi lại qua bảng ánh xạ trong constant (ví dụ `CellChangeHandlers`). Trường hợp này phải nói rõ trong đề xuất: hàm cũ **giữ nguyên, không sửa dòng nào**, chỉ đổi đường gọi.

---

## BƯỚC 5 — Test

Viết test chạy thật với dữ liệu mock, không chỉ đọc code. Cách trích hàm ra khỏi controller SAPUI5 để test bằng Node: xem `scripts/extract-method.js`.

**Cảnh báo:** nếu test dùng stub tự viết cho một thư viện ngoài (xlsx, …) thì test pass **không** chứng minh code chạy đúng với thư viện thật. Phải nói rõ điều này khi báo cáo.

---

## BƯỚC 6 — Kiểm tra + test lại toàn bộ project (trước khi báo cáo)

> **Bắt buộc.** Xong task **không có nghĩa là xong**. Phải quét toàn project tìm xung đột / lỗi phát sinh, **rồi mới** sang BƯỚC 7. Không được báo "đã xong" khi chưa chạy bước này.

### 6.1 — Sweep

```
node scripts/sweep.js <duong-dan-project>
```

| # | Nội dung |
|---|---|
| 1 | Syntax mọi file `.js` |
| 2 | XML well-formed (parser nhận biết dấu nháy — binding UI5 chứa `>`) |
| 3 | Thuộc tính XML nằm **trong thẻ mở** (bắt lỗi chèn nhầm vào aggregation) |
| 4 | `manifest.json` parse được + trỏ tới file có thật |
| 5 | `sap.ui.define` — số module ↔ số tham số |
| 6 | Handler view/fragment ↔ hàm trong controller |
| 7 | `Constants.X` dùng nhưng chưa định nghĩa |
| 8 | i18n key dùng nhưng chưa định nghĩa |
| 9 | ID trùng lặp trong view |
| 10 | Tên hàm trùng lặp trong controller |

### 6.2 — ESLint bắt biến chưa khai báo

Cấu hình mặc định của Fiori tools **không bật** `no-undef`, bỏ sót cả một lớp lỗi `ReferenceError`. Dùng `scripts/eslint-noundef.mjs`.

### 6.3 — Chạy lại TẤT CẢ test cũ (hồi quy)

Không chỉ test của task vừa làm. Test của các task trước phải **vẫn pass**. Nếu một test cũ hỏng thì hoặc là code mới gây xung đột, hoặc là test cũ sai — **phải truy ra nguyên nhân**, không được bỏ qua.

### 6.4 — So với baseline lấy ở BƯỚC 3.4

| Kết quả | Xử lý |
|---|---|
| Số lỗi **giảm hoặc giữ nguyên** | Đạt |
| Số lỗi **tăng** | Chưa xong — truy nguyên nhân, sửa hoặc hoàn lại |
| Có lỗi **biến mất bất thường** | Cũng phải truy — có thể code đã bị ghi đè hoặc mất |

### 6.5 — Dò xung đột do file bị ghi đè

Diff file hiện tại với backup của **các task trước**, kiểm tra các sửa đổi cũ còn nguyên không. Đã từng xảy ra: 3 sửa đổi của task trước biến mất khỏi file mà không ai để ý, chỉ phát hiện nhờ chạy lại test cũ.

---

## BƯỚC 7 — Báo cáo (sau khi sửa)

| Nội dung | |
|---|---|
| Từng chỗ sửa: **vị trí bấm được** + trước/sau | bắt buộc |
| **Vị trí hàm cũ đã comment** (nếu có thay hàm) | bắt buộc |
| Kết quả test — kể cả test hồi quy | bắt buộc |
| Kết quả sweep — so với baseline | bắt buộc |
| Vị trí backup | bắt buộc |
| Điều chưa kiểm chứng được | nếu có |

### 7.1 — Mọi vị trí phải là đường dẫn bấm được

Không viết `Main.controller.js dòng 2831` dạng chữ thường. Phải viết dạng link trỏ thẳng tới dòng:

```
[Main.controller.js:2831](zpsr0019/webapp/controller/Main.controller.js#L2831)
```

| Kiểu | Cú pháp |
|---|---|
| Một dòng | `[ten-file.js:42](duong/dan/ten-file.js#L42)` |
| Khoảng dòng | `[ten-file.js:42-51](duong/dan/ten-file.js#L42-L51)` |
| Cả file | `[ten-file.js](duong/dan/ten-file.js)` |
| Thư mục | `[src/utils/](src/utils/)` |

Đường dẫn là **tương đối từ thư mục gốc workspace**, không phải đường dẫn tuyệt đối.

### 7.2 — Vị trí phải cụ thể nhất có thể

Nếu trỏ được tới **dòng** thì không dừng ở mức file. Nếu trỏ được tới **khoảng dòng** của cả khối thì dùng khoảng dòng.

| Kém | Tốt |
|---|---|
| "sửa trong controller" | `[Main.controller.js:2831](...#L2831)` |
| "constant.js có thay đổi" | `[constant.js:333-339](...#L333-L339)` |
| "đã comment hàm cũ" | `[Main.controller.js:2066](...#L2066)` — dòng bắt đầu khối comment |

### 7.3 — File không trỏ link được

Với thứ không nằm trong workspace (file spec `.xlsx`, backup trong scratchpad) thì ghi vị trí cụ thể nhất có thể bằng chữ:

```
PS105 → sheet 【補足】Fiori処理 → ô F118
scratchpad/Main.beforeNo53.js
```

### 7.4 — Báo cáo trạng thái logic toàn project: liệt kê theo nhóm chức năng

Khi được hỏi "đã làm được gì" / "còn thiếu gì" cho **cả project** (không phải báo cáo 1 task vừa sửa) — liệt kê theo **nhóm chức năng**, không theo thứ tự hàm trong file. Khung nhóm chuẩn (thêm/bớt nhóm tuỳ project):

```
- Phần tìm kiếm:
+ Validate bắt buộc, validate ngày, …
+ Tìm kiếm gửi đi ABAP
+ Clear
- Phần nhập hàng loạt:
+ Validate …
+ Xử lý nhập hàng loạt cho field …
+ Xử lý tính toán / 反映 …
- Chức năng thêm
- Chức năng copy
- Chức năng xoá
- Phần table:
+ Validate từng ô (OnChange)
+ Tự động điền / gợi ý theo field khác
+ EXCEL取込
- Phần đăng ký:
+ Validate trước khi ghi
+ Ghi OData
- Các chức năng common:
+ Variant
+ Bookmark
+ Slider / số bản ghi / P13n / Excel download
```

Mỗi dòng `+` ghi **ngắn gọn**, không giải thích, tên field/danh từ riêng tiếng Nhật **giữ nguyên**. Đánh dấu `⚠` cho mục còn thiếu/lỗi ngay trong nhóm liên quan, không tách riêng danh sách "chưa làm" ở cuối. Vị trí phải verify lại bằng `grep -n` trước khi đưa vào báo cáo, không ước lượng số dòng.

---

## QUY TẮC COMMENT

Áp dụng cho **mọi** comment mới: `.js`, `.xml`, constant, JSDoc.

### Nguyên tắc

**Văn xuôi bằng tiếng Anh. Tên field, tên màn hình, tên nút, tên mục spec — giữ nguyên tiếng Nhật.**

Không dịch danh từ riêng sang tiếng Anh. Không viết comment song ngữ (một dòng Anh + một dòng Nhật lặp lại cùng nội dung).

### Đúng

```js
// Sort Search Help [組計状況] by custom order
// [所要日付] "20260914" -> Date object
// Reflect only to 追加 / 複写 rows
// ［行区分］= "R"（表示行）の行は編集不可のためチェック対象外
```

```js
/**
 * Handle validation on a 一覧出力部 cell change — 対象処理フローNo：16
 */
```

```js
		// [購買依頼タイプ]
		{ key: "PurchaseRequisitionType", controlId: "BULKKOUBAI_IRAI_TYPE" },
```

### Sai

```js
// Sắp xếp Search Help theo thứ tự tuỳ chỉnh          ← tieng Viet
// Sort Search Help by Assembly Status                 ← dich ten field sang tieng Anh
// Sort Search Help [組計状況] by custom order
// 組計状況の検索ヘルプをカスタム順でソートする          ← song ngu lap lai
```

### Danh từ riêng phải giữ tiếng Nhật

| Loại | Ví dụ |
|---|---|
| Tên field | `[組立かたまり]` `[所要日付]` `[購買依頼タイプ]` `[出庫タスク]` |
| Vùng màn hình | `検索条件部` `一覧出力部` `一括入力` |
| Nút / thao tác | `検索` `追加` `複写` `削除` `登録` `反映` `EXCEL取込` |
| Mục spec | `処理フローNo：16` `項目ﾁｪｯｸ基準書 No.53` `画面項目定義書` |
| Giá trị code | `行区分 "R"（表示行）` `表示モード "U"` |

Dấu ngoặc: dùng `[...]` hoặc `［...］` đều được — **theo đúng kiểu đang có trong file**, đừng trộn lẫn.

### Độ dài

Ngắn. Một dòng cho constant, 1-3 dòng cho JSDoc của hàm.

Comment nói **tại sao / theo spec nào**, không mô tả lại điều code đã nói rõ.

```js
// TOT — noi theo spec nao
// 項目ﾁｪｯｸ基準書 No.53 — 必須入力項目が未入力の場合

// XAU — mo ta lai code
// Loop through the fields and check each one
```

### Trích spec trong comment

Khi code hiện thực một câu cụ thể của spec, trích **nguyên văn tiếng Nhật** câu đó:

```js
				// 未登録の追加行 ("I") と削除行 ("D") は記録対象から除外する
				const aExportRows = aContext.filter(
					(oRow) => oRow.operation !== "I" && oRow.operation !== "D"
				);
```

Người đọc sau này dò ngược được về tài liệu mà không phải hỏi lại.

---

## KIẾN THỨC SAP FIORI THƯỜNG DÙNG

### ValueState phải ghi vào model, không ghi vào control

Trong `sap.ui.table.Table`, control trong `<table:template>` được nhân bản theo dòng. Ghi `oControl.setValueState()` sẽ bị `oModel.refresh()` ghi đè.

**Đúng:** ghi `oRow.valueState<X>` vào row data, view bind `valueState="{model>valueState<X>}"`.

### Control id có prefix lúc runtime

`oEvent.getSource().getId()` trả về `app---View--ControlId`. So sánh bằng `===` với id gốc sẽ **không bao giờ khớp**.

```js
const sControlId = oEvent.getSource().getId().split("--").pop();
```

### `getView().byId()` trong table template

Trả về **template gốc**, không phải ô của dòng đang thao tác. Muốn lấy dòng: `oEvent.getSource().getBindingContext("<model>").getObject()`.

### `aoa_to_sheet` vs `json_to_sheet` (xlsx-js-style)

`json_to_sheet` / `sheet_add_json` **nhận được** cell object `{v,t,s}` để tô màu. `aoa_to_sheet` thì **không** — nó bọc giá trị thô. Đừng đổi idiom này nếu không chạy thử được với thư viện thật.

### FileUploader kiểm tra định dạng

`fileType="xlsx"` chặn file sai đuôi và bắn `typeMissmatch`, **không** bắn `change`. Nên handler gắn vào `change` sẽ không bao giờ thấy file sai định dạng.

### Lifecycle hook không được trả về giá trị

`onInit: async function` trả về Promise ngầm → UI5 1.120+ log `[FUTURE FATAL]`, UI5 2.0 sẽ throw. Tách phần async ra hàm riêng.

---

## THUẬT NGỮ SPEC

| Tiếng Nhật | Nghĩa |
|---|---|
| 検索条件部 | Vùng điều kiện tìm kiếm |
| 一覧出力部 | Vùng danh sách kết quả (bảng) |
| 一括入力 | Nhập hàng loạt |
| 編集 / 追加 / 複写 / 削除 | Sửa / Thêm / Sao chép / Xoá |
| 行区分 | Loại dòng: `N` 通常行 · `R` 表示行 (readonly) · `D` 削除行 · `A` 追加行 |
| 表示モード | Thao tác: `U` sửa · `I` thêm · `D` xoá |
| 必須 | Bắt buộc nhập |
| 入力可不可 | Cột trong 画面項目定義書: `◎` bắt buộc · `○` nhập được · `×` không nhập được |
| ※FIORIのみでハンドリング | Chỉ Fiori xử lý, ABAP không làm |
| 項目ﾁｪｯｸ基準書 No.X | Số hiệu message lỗi |

**Chữ đỏ trong spec = yêu cầu bổ sung về sau.** Luôn quét chữ đỏ khi bắt đầu một chức năng: `node scripts/xlsx-find.js <thu-muc> --red`
