import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pptxgen from 'pptxgenjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const outputDir = path.join(repoRoot, 'dist-print')
const outputPath = path.join(
  outputDir,
  'ai_agent_development_presentation.pptx',
)
const logoPath = path.join(
  repoRoot,
  'public/assets/generated/ishisho-wenchang-rally-logo.png',
)
const quizSamplePath = path.join(
  repoRoot,
  'dist-print/email-attachments/quiz_screen_sample.png',
)
const qrSamplePath = path.join(repoRoot, 'public/qr-data/samples/J01.png')
const treasurePath = path.join(repoRoot, 'public/assets/treasure-chest.png')

fs.mkdirSync(outputDir, { recursive: true })

const pptx = new pptxgen()
pptx.defineLayout({ name: 'RALLY_WIDE', width: 13.333, height: 7.5 })
pptx.layout = 'RALLY_WIDE'
pptx.author = 'Ryosuke Matsuo'
pptx.company = 'Ikeda Ishibashi Primary School'
pptx.subject = 'AI agent assisted school event app development'
pptx.title = 'AI Agent Development Case Study'
pptx.lang = 'ja-JP'
pptx.theme = {
  headFontFace: 'Hiragino Sans',
  bodyFontFace: 'Hiragino Sans',
  lang: 'ja-JP',
}
pptx.margin = 0

const C = {
  navy: '12345A',
  red: 'D9424A',
  redDark: 'A72D3B',
  blue: '2367A5',
  teal: '1B8F84',
  gold: 'F2B844',
  cream: 'FFF6D8',
  softBlue: 'EAF3FB',
  softRed: 'FDE8E8',
  softGold: 'FFF0C9',
  softGreen: 'E6F4EC',
  white: 'FFFFFF',
  muted: '667386',
  border: 'E8CFA8',
}

function addBackground(slide, accent = C.blue) {
  slide.background = { color: C.cream }
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: C.cream },
    line: { color: C.cream },
  })
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.38,
    y: 0.28,
    w: 12.57,
    h: 6.94,
    rectRadius: 0.12,
    fill: { color: C.white, transparency: 4 },
    line: { color: C.border, transparency: 18, width: 1.2 },
  })
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.38,
    y: 0.28,
    w: 12.57,
    h: 0.18,
    fill: { color: accent },
    line: { color: accent },
  })
  slide.addShape(pptx.ShapeType.arc, {
    x: -0.55,
    y: 5.55,
    w: 4.8,
    h: 2.2,
    adjustPoint: 0.42,
    line: { color: C.blue, transparency: 42, width: 3 },
  })
  slide.addShape(pptx.ShapeType.arc, {
    x: 9.05,
    y: -0.55,
    w: 4.8,
    h: 2.2,
    adjustPoint: 0.42,
    line: { color: C.red, transparency: 42, width: 3 },
    rotate: 180,
  })
}

function addHeader(slide, no, title, subtitle, accent = C.blue) {
  addBackground(slide, accent)
  slide.addText(title, {
    x: 0.82,
    y: 0.72,
    w: 8.1,
    h: 0.46,
    fontSize: 21,
    bold: true,
    color: C.navy,
    margin: 0,
    fit: 'shrink',
  })
  slide.addText(subtitle, {
    x: 0.84,
    y: 1.18,
    w: 8.15,
    h: 0.3,
    fontSize: 12.5,
    bold: true,
    color: C.muted,
    margin: 0,
    fit: 'shrink',
  })
  slide.addImage({ path: logoPath, x: 10.05, y: 0.58, w: 2.15, h: 1.17 })
  slide.addText(String(no).padStart(2, '0'), {
    x: 12.18,
    y: 6.84,
    w: 0.5,
    h: 0.22,
    fontSize: 8.5,
    bold: true,
    color: C.muted,
    align: 'right',
    margin: 0,
  })
}

function addBigClaim(slide, text, y = 1.95, color = C.navy) {
  slide.addText(text, {
    x: 1.05,
    y,
    w: 11.25,
    h: 1.1,
    fontSize: 30,
    bold: true,
    color,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
}

function addPill(slide, text, x, y, w, color, fill) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 0.46,
    rectRadius: 0.16,
    fill: { color: fill },
    line: { color, transparency: 25 },
  })
  slide.addText(text, {
    x: x + 0.12,
    y: y + 0.12,
    w: w - 0.24,
    h: 0.2,
    fontSize: 11,
    bold: true,
    color,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
}

function addCard(slide, x, y, w, h, item) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: item.fill ?? C.softBlue },
    line: { color: item.line ?? C.border, transparency: 12, width: 1.1 },
  })
  slide.addText(item.label, {
    x: x + 0.28,
    y: y + 0.23,
    w: 0.78,
    h: 0.56,
    fontSize: item.labelSize ?? 27,
    bold: true,
    color: item.accent ?? C.blue,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
  slide.addText(item.title, {
    x: x + 1.12,
    y: y + 0.24,
    w: w - 1.38,
    h: 0.44,
    fontSize: item.titleSize ?? 16,
    bold: true,
    color: C.navy,
    margin: 0,
    fit: 'shrink',
  })
  slide.addText(item.body, {
    x: x + 0.34,
    y: y + 0.95,
    w: w - 0.68,
    h: h - 1.1,
    fontSize: item.bodySize ?? 12.2,
    bold: true,
    color: item.bodyColor ?? C.navy,
    breakLine: false,
    fit: 'shrink',
    margin: 0.03,
  })
}

function addTimeline(slide, items) {
  const startX = 0.96
  const y = 3.05
  const gap = 0.18
  const w = (11.4 - gap * (items.length - 1)) / items.length
  items.forEach((item, index) => {
    const x = startX + index * (w + gap)
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h: 1.72,
      rectRadius: 0.08,
      fill: { color: item.fill },
      line: { color: item.accent, transparency: 20 },
    })
    slide.addText(item.no, {
      x: x + 0.12,
      y: y + 0.16,
      w: 0.55,
      h: 0.45,
      fontSize: 25,
      bold: true,
      color: item.accent,
      align: 'center',
      margin: 0,
    })
    slide.addText(item.title, {
      x: x + 0.72,
      y: y + 0.2,
      w: w - 0.86,
      h: 0.34,
      fontSize: 13.2,
      bold: true,
      color: C.navy,
      margin: 0,
      fit: 'shrink',
    })
    slide.addText(item.body, {
      x: x + 0.22,
      y: y + 0.76,
      w: w - 0.44,
      h: 0.72,
      fontSize: 9.8,
      bold: true,
      color: C.navy,
      margin: 0,
      fit: 'shrink',
    })
  })
}

function addBullets(slide, bullets, x, y, w, fontSize = 16, color = C.navy) {
  bullets.forEach((bullet, index) => {
    const yy = y + index * 0.55
    slide.addText('●', {
      x,
      y: yy + 0.02,
      w: 0.24,
      h: 0.24,
      fontSize: fontSize - 3,
      bold: true,
      color: bullet.color ?? C.red,
      margin: 0,
    })
    slide.addText(bullet.text ?? bullet, {
      x: x + 0.34,
      y: yy,
      w,
      h: 0.36,
      fontSize,
      bold: true,
      color,
      margin: 0,
      fit: 'shrink',
    })
  })
}

function addFooterNote(slide, text) {
  slide.addText(text, {
    x: 1.05,
    y: 6.55,
    w: 11.2,
    h: 0.3,
    fontSize: 11.5,
    bold: true,
    color: C.muted,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
}

function titleSlide() {
  const slide = pptx.addSlide()
  addBackground(slide, C.red)
  slide.addImage({ path: logoPath, x: 2.12, y: 0.42, w: 9.1, h: 4.95 })
  slide.addText('AIエージェントで、学校行事アプリをつくる', {
    x: 0.88,
    y: 5.35,
    w: 11.6,
    h: 0.58,
    fontSize: 26,
    bold: true,
    color: C.navy,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
  slide.addText('台湾交流会QRクイズラリー 開発実践報告', {
    x: 0.88,
    y: 6.02,
    w: 11.6,
    h: 0.34,
    fontSize: 16,
    bold: true,
    color: C.muted,
    align: 'center',
    margin: 0,
  })
  slide.addText('松尾 亮佑 / Codex + ChatGPT + GitHub Pages', {
    x: 0.88,
    y: 6.48,
    w: 11.6,
    h: 0.28,
    fontSize: 13,
    bold: true,
    color: C.redDark,
    align: 'center',
    margin: 0,
  })
}

titleSlide()

{
  const slide = pptx.addSlide()
  addHeader(slide, 1, '出発点は「アプリを作る」ではない', 'まず、交流の設計があった', C.blue)
  addBigClaim(slide, '国際理解を説明するより、\n関わらざるを得ない状況を作る。')
  addCard(slide, 1.05, 4.12, 3.45, 1.45, {
    label: '場',
    title: '校内を発見の場に',
    body: 'いつもの学校を、小さな万博会場のように見立てる。',
    fill: C.softBlue,
    accent: C.blue,
  })
  addCard(slide, 4.96, 4.12, 3.45, 1.45, {
    label: '問',
    title: '相手に聞く理由',
    body: '言語と学校文化の違いを、相談のきっかけにする。',
    fill: C.softGold,
    accent: C.gold,
  })
  addCard(slide, 8.87, 4.12, 3.45, 1.45, {
    label: '協',
    title: '一緒に答える',
    body: '正解そのものより、正解までのやりとりを大切にする。',
    fill: C.softRed,
    accent: C.red,
  })
}

{
  const slide = pptx.addSlide()
  addHeader(slide, 2, '活動のしかけ', '言語差を「協力の理由」に変える', C.red)
  addCard(slide, 0.96, 1.9, 3.55, 2.9, {
    label: 'J',
    title: '日本語で台湾を問う',
    body: '日本側が読める。でも内容は台湾・嘉義・文昌國民小學。台湾側に聞きたくなる。',
    fill: C.softBlue,
    accent: C.blue,
    labelSize: 34,
  })
  addCard(slide, 4.88, 1.9, 3.55, 2.9, {
    label: 'C',
    title: '繁体字で日本を問う',
    body: '台湾側が読める。でも内容は日本・大阪・石橋小学校。日本側が説明する。',
    fill: C.softRed,
    accent: C.red,
    labelSize: 34,
  })
  addCard(slide, 8.8, 1.9, 3.55, 2.9, {
    label: '鍵',
    title: '翻訳は有限回',
    body: '困った時だけ対訳を見られる。まず友だちに聞く余地を残す。',
    fill: C.softGold,
    accent: C.gold,
    labelSize: 27,
  })
  addFooterNote(slide, '価値観は四択の正解にしない。活動構造の中で自然に立ち上げる。')
}

{
  const slide = pptx.addSlide()
  addHeader(slide, 3, '作ったもの', 'Webアプリだけでなく、当日運用一式まで', C.teal)
  slide.addImage({ path: quizSamplePath, x: 1.05, y: 1.82, w: 3.3, h: 3.9 })
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.75,
    y: 1.88,
    w: 2.2,
    h: 2.2,
    rectRadius: 0.08,
    fill: { color: C.white },
    line: { color: C.border },
  })
  slide.addImage({ path: qrSamplePath, x: 5.05, y: 2.15, w: 1.6, h: 1.6 })
  slide.addImage({ path: treasurePath, x: 8.7, y: 2.0, w: 2.15, h: 2.15 })
  addBullets(
    slide,
    [
      'React + TypeScript + Vite の静的Webアプリ',
      'QR URL一覧、QRカード、紙問題、回答用紙PDF',
      'Excelテンプレートから本番問題を取り込み',
      'GitHub Pagesで本番URLへ自動デプロイ',
    ],
    4.75,
    4.55,
    7.0,
    15,
  )
}

{
  const slide = pptx.addSlide()
  addHeader(slide, 4, '開発の流れ', '動機から本番運用までを、短いサイクルで進めた', C.blue)
  addBigClaim(slide, '動機 → 発案 → MVP → 修正 → 印刷 → 本番', 1.82, C.navy)
  addTimeline(slide, [
    { no: '1', title: '動機', body: '交流を「話す必然性」がある活動にしたい', fill: C.softBlue, accent: C.blue },
    { no: '2', title: '発案', body: 'ChatGPTで企画・教育的ねらいを整理', fill: C.softGold, accent: C.gold },
    { no: '3', title: '実装', body: 'CodexでMVPから本番機能へ拡張', fill: C.softRed, accent: C.red },
    { no: '4', title: '準備', body: 'QR/PDF/説明資料/本番URLを固める', fill: C.softGreen, accent: C.teal },
    { no: '5', title: '運用', body: '当日実施し、課題を次回版へ反映', fill: C.softBlue, accent: C.blue },
  ])
}

{
  const slide = pptx.addSlide()
  addHeader(slide, 5, 'AIの役割分担', 'ChatGPTとCodexを同じ仕事に使わない', C.red)
  addCard(slide, 0.92, 2.0, 3.6, 3.6, {
    label: '教師',
    title: '目的と制約を決める',
    body: '児童の実態、校内動線、安全、相手校との関係、当日の判断は人間が担う。',
    fill: C.softBlue,
    accent: C.blue,
    labelSize: 20,
  })
  addCard(slide, 4.88, 2.0, 3.6, 3.6, {
    label: 'GPT',
    title: '企画・文章・表現',
    body: 'アイデアの壁打ち、メール文、説明原稿、翻訳、ロゴ生成の文脈作り。',
    fill: C.softGold,
    accent: C.gold,
    labelSize: 20,
  })
  addCard(slide, 8.84, 2.0, 3.6, 3.6, {
    label: 'Codex',
    title: '実装・検証・Git',
    body: 'コードを読み、修正し、lint/buildし、commit/pushして運用物も生成。',
    fill: C.softRed,
    accent: C.red,
    labelSize: 20,
  })
}

{
  const slide = pptx.addSlide()
  addHeader(slide, 6, 'Codexで効いたこと', 'コード生成ではなく、リポジトリ単位で任せられる', C.teal)
  addBigClaim(slide, '「作って終わり」ではなく、\n直して、試して、残す。', 1.75, C.navy)
  addBullets(
    slide,
    [
      { text: '既存構造を読んで、必要最小限に実装する', color: C.blue },
      { text: 'LocalStorageや複数タブなど、運用リスクをレビューする', color: C.red },
      { text: 'QR・PDF・README・説明資料まで同じGitで管理する', color: C.gold },
      { text: 'commit単位で戻れる状態を保つ', color: C.teal },
    ],
    1.5,
    4.0,
    9.9,
    17,
  )
}

{
  const slide = pptx.addSlide()
  addHeader(slide, 7, '学校現場で大事だったこと', 'アプリより、当日止まらない設計', C.blue)
  addCard(slide, 0.96, 1.9, 3.55, 3.25, {
    label: '早',
    title: '仮URLを早く出す',
    body: '学校iPadでブロックされる可能性を先に潰す。URL許可申請も早めに動く。',
    fill: C.softBlue,
    accent: C.blue,
  })
  addCard(slide, 4.88, 1.9, 3.55, 3.25, {
    label: '紙',
    title: '紙バックアップ',
    body: 'Webが止まっても活動自体は止めない。回答用紙と紙問題を用意する。',
    fill: C.softGold,
    accent: C.gold,
  })
  addCard(slide, 8.8, 1.9, 3.55, 3.25, {
    label: '実',
    title: '実機で確認',
    body: '標準カメラ→Safari、保存、Result画面、スクショ提出まで試す。',
    fill: C.softRed,
    accent: C.red,
  })
  addFooterNote(slide, '「1班1台」「端末を変えない」「標準カメラで読む」は技術仕様ではなく運用ルール。')
}

{
  const slide = pptx.addSlide()
  addHeader(slide, 8, '失敗から学んだこと', 'コントロールセンターQRリーダー問題', C.red)
  addBigClaim(slide, 'Safariで開いたつもりでも、\n保存領域が違うことがある。', 1.65, C.redDark)
  addBullets(
    slide,
    [
      'iOSのQRコードリーダーでは点数が0になる端末があった',
      '原因は一時的なWebViewとLocalStorage分離の可能性',
      'アプリ側警告だけでは完全判定できない',
      '印刷物・説明・実演で「標準カメラ→Safari」を徹底する',
    ],
    1.45,
    4.0,
    10.0,
    16.5,
  )
}

{
  const slide = pptx.addSlide()
  addHeader(slide, 9, '再利用できる型', '別の学校行事にも横展開しやすい', C.teal)
  addTimeline(slide, [
    { no: '1', title: '目的', body: '活動のねらいを1文で決める', fill: C.softBlue, accent: C.blue },
    { no: '2', title: 'MVP', body: '最小限の画面とデータを作る', fill: C.softGold, accent: C.gold },
    { no: '3', title: '分離', body: '問題・名簿・素材を差し替え可能にする', fill: C.softRed, accent: C.red },
    { no: '4', title: '生成', body: 'QR、PDF、資料をスクリプト化する', fill: C.softGreen, accent: C.teal },
    { no: '5', title: '検証', body: '実機、紙、Gitで当日リスクを減らす', fill: C.softBlue, accent: C.blue },
  ])
  addFooterNote(slide, 'AIに任せるほど、教師側の「目的・制約・現場判断」が重要になる。')
}

{
  const slide = pptx.addSlide()
  addHeader(slide, 10, '結論', 'AIエージェントは、学校現場の小さなシステムを現実にする', C.red)
  addBigClaim(slide, '教師のアイデアを、\n当日使える形まで持っていける。', 1.7, C.navy)
  addShapeBand(slide)
  slide.addText('ただし、目的を決めるのは教師。安全と運用を判断するのも教師。', {
    x: 1.1,
    y: 4.82,
    w: 11.1,
    h: 0.42,
    fontSize: 20,
    bold: true,
    color: C.redDark,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
  slide.addText('AIは「任せる相手」ではなく、「一緒に形にする相棒」として使う。', {
    x: 1.1,
    y: 5.52,
    w: 11.1,
    h: 0.36,
    fontSize: 17,
    bold: true,
    color: C.teal,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
}

function addShapeBand(slide) {
  addPill(slide, '企画', 2.0, 3.78, 1.3, C.blue, C.softBlue)
  addPill(slide, '実装', 3.55, 3.78, 1.3, C.red, C.softRed)
  addPill(slide, '検証', 5.1, 3.78, 1.3, C.gold, C.softGold)
  addPill(slide, '印刷', 6.65, 3.78, 1.3, C.teal, C.softGreen)
  addPill(slide, '運用', 8.2, 3.78, 1.3, C.blue, C.softBlue)
  addPill(slide, '改善', 9.75, 3.78, 1.3, C.red, C.softRed)
}

await pptx.writeFile({ fileName: outputPath })
console.log(outputPath)
