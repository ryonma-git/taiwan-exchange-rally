# Japan-Taiwan School Discovery Rally

台湾交流会向けの校内QRクイズラリーWebアプリです。iPad標準カメラでQRコードを読み取り、Safariで `?q=J01` や `?treasure=T01` のURLを開いて使います。

## Local Dev

```bash
npm install
npm run dev
```

Dev server:

```text
http://localhost:5180/
```

Build:

```bash
npm run lint
npm run build
```

Preview:

```bash
npm run preview
```

Preview server:

```text
http://localhost:4180/
```

## Problem Data

問題データは [src/data/questions.json](src/data/questions.json) にあります。本番問題への差し替えはこのJSONを更新します。

各問題は次の形式です。

```json
{
  "id": "J01",
  "side": "Japan",
  "language": "ja",
  "difficulty": "easy",
  "points": 10,
  "question": "問題文",
  "choices": ["A", "B", "C", "D"],
  "answerIndex": 0,
  "explanation": "解説",
  "translationText": "繁体字中国語・台湾華語の翻訳"
}
```

注意:

- `id` はQR URLの `?q=J01` と一致させます。
- `answerIndex` は0始まりです。最初の選択肢が正解なら `0` です。
- `translationText` は任意です。ある問題だけ翻訳の鍵ボタンが表示されます。
- `questions.json` の内容が変わると、端末内の古い回答履歴は自動リセットされます。

## QR URL

仮URLは次を使います。

```text
https://example.com/taiwan-rally
```

問題QR:

```text
https://example.com/taiwan-rally/?q=J01
```

宝箱QR:

```text
https://example.com/taiwan-rally/?treasure=T01
```

## Generate QR URL Data

QR作成用のCSV/JSONを生成します。

```bash
npm run generate:qr
```

出力:

```text
public/qr-data/qr_urls.csv
public/qr-data/qr_urls.json
public/qr-data/samples/*.png
```

本番URLが決まったら、`--base` で差し替えて再生成します。

```bash
npm run generate:qr -- --base https://deployed-url.example/taiwan-rally
```

環境変数でも指定できます。

```bash
RALLY_BASE_URL=https://deployed-url.example/taiwan-rally npm run generate:qr
```

出力行には `type,id,title,url,points,language` が含まれます。宝箱QRは初期データとして `T01` と `T02` を含みます。

## Generate Print PDFs

印刷用PDFを生成します。QRカードはA4に2枚配置し、問題文全文は載せず、ID・種類・点数・QR・URLだけを表示します。問題文を掲示する場合は、別ファイルの掲示用PDFを使います。

```bash
npm run generate:pdf
```

出力:

```text
dist-print/qr_cards.pdf
dist-print/treasure_cards.pdf
dist-print/question_posters.pdf
dist-print/answer_sheet.pdf
```

QR URL一覧とPDFをまとめて生成する場合:

```bash
npm run generate:print
```

本番URLでQRカードPDFと掲示用PDFを作る場合:

```bash
npm run generate:pdf -- --base https://deployed-url.example/taiwan-rally
```

## Manus Deploy

1. Manusでこのリポジトリを開く。
2. Build command に `npm run build` を指定する。
3. Output directory に `dist` を指定する。
4. デプロイURLが発行されたら、学校iPadでアクセスできるか確認する。
5. デプロイURLを使って `npm run generate:print -- --base <本番URL>` を実行し、QR URL一覧とPDFを再生成する。

## iPad Check

学校iPadで次を確認します。

- SafariでデプロイURLが開ける。
- iPad標準カメラで問題QRを読み取り、Safariで `?q=J01` が開く。
- iPad標準カメラで宝箱QRを読み取り、Safariで `?treasure=T01` が開く。
- 班名入力、回答、Result表示ができる。
- 翻訳の鍵が使える。
- 同じ問題に再回答できない。
- 同じ宝箱を2回開けても鍵が増えない。

## Operation Notes

- 1班1台で使います。途中で端末やブラウザを変えないでください。
- QR読み取りはアプリ内では行いません。iPad標準カメラで読み取り、Safariで開きます。
- 成績はLocalStorageに保存されます。
- ランキング自動集計はしません。終了後、各班がResult画面を先生に見せて集計します。
- リセットは先生用です。確認ダイアログが2回出ます。
- 廊下では走らず、QRポイントの前では通行のじゃまにならない場所で操作します。

## Paper Backup

Webがブロックされた場合は、[dist-print/answer_sheet.pdf](dist-print/answer_sheet.pdf) を印刷して使います。チーム名、メンバー、問題ID、答え、得点、先生チェック欄、翻訳の鍵、宝箱QR欄を手書きで記録する運用にします。

QRカードは [dist-print/qr_cards.pdf](dist-print/qr_cards.pdf) を印刷して使います。各カードはA5程度の大きさで、問題名・点数・QR・URLだけを載せています。宝箱だけ印刷する場合は [dist-print/treasure_cards.pdf](dist-print/treasure_cards.pdf) を使います。後日QR部分が白抜きのモックデザインを使う場合は、このQR枠を差し替える前提で調整します。

紙掲示用の問題文は [dist-print/question_posters.pdf](dist-print/question_posters.pdf) を印刷して使います。こちらはA4 1枚に1問ずつ、問題文と選択肢を全文で表示します。

## Asset Credits

- Emoji SVG assets: Google Noto Emoji, SIL Open Font License 1.1.
  - Source: https://github.com/googlefonts/noto-emoji
  - Local files: `public/assets/noto-emoji/`
