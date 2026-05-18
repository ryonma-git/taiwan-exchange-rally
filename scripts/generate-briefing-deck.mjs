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
  'taiwan_rally_game_briefing_bilingual.pptx',
)
const logoPath = path.join(
  repoRoot,
  'public/assets/generated/ishisho-wenchang-rally-logo.png',
)

fs.mkdirSync(outputDir, { recursive: true })

const pptx = new pptxgen()
pptx.layout = 'LAYOUT_WIDE'
pptx.author = 'Ikeda Ishibashi Primary School'
pptx.company = 'Japan-Taiwan School Discovery Rally'
pptx.subject = 'Taiwan exchange QR quiz rally rules'
pptx.title = 'Japan-Taiwan School Discovery Rally Rules'
pptx.lang = 'ja-JP'
pptx.theme = {
  headFontFace: 'Hiragino Sans',
  bodyFontFace: 'Hiragino Sans',
  lang: 'ja-JP',
}
pptx.defineLayout({ name: 'RALLY_WIDE', width: 13.333, height: 7.5 })
pptx.layout = 'RALLY_WIDE'
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
  white: 'FFFFFF',
  muted: '667386',
}

function addBackground(slide) {
  slide.background = { color: C.cream }
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: C.cream },
    line: { color: C.cream },
  })
  slide.addShape(pptx.ShapeType.arc, {
    x: -0.45,
    y: 5.75,
    w: 4.8,
    h: 2.1,
    adjustPoint: 0.42,
    line: { color: C.blue, transparency: 35, width: 3 },
  })
  slide.addShape(pptx.ShapeType.arc, {
    x: 9.0,
    y: -0.55,
    w: 4.8,
    h: 2.1,
    adjustPoint: 0.42,
    line: { color: C.red, transparency: 34, width: 3 },
    rotate: 180,
  })
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.38,
    y: 0.28,
    w: 12.57,
    h: 6.94,
    rectRadius: 0.12,
    fill: { color: C.white, transparency: 6 },
    line: { color: 'F0D8B7', transparency: 20, width: 1.2 },
  })
}

function addHeader(slide, slideNo, titleJa, titleZh) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.38,
    y: 0.28,
    w: 12.57,
    h: 0.18,
    fill: { color: slideNo % 2 === 0 ? C.blue : C.red },
    line: { color: slideNo % 2 === 0 ? C.blue : C.red },
  })
  slide.addText(titleJa, {
    x: 0.78,
    y: 0.72,
    w: 6.1,
    h: 0.42,
    fontFace: 'Hiragino Sans',
    fontSize: 20,
    bold: true,
    color: C.navy,
    margin: 0,
  })
  slide.addText(titleZh, {
    x: 0.78,
    y: 1.15,
    w: 6.4,
    h: 0.36,
    fontFace: 'Hiragino Sans',
    fontSize: 14,
    bold: true,
    color: C.muted,
    margin: 0,
  })
  slide.addImage({
    path: logoPath,
    x: 9.35,
    y: 0.58,
    w: 2.65,
    h: 1.44,
  })
  slide.addText(`${slideNo}`, {
    x: 12.35,
    y: 6.85,
    w: 0.3,
    h: 0.22,
    fontSize: 8,
    bold: true,
    color: C.muted,
    align: 'right',
    margin: 0,
  })
}

function addTitleSlide() {
  const slide = pptx.addSlide()
  addBackground(slide)
  slide.addImage({ path: logoPath, x: 2.0, y: 0.58, w: 9.35, h: 5.08 })
  slide.addText('ルール説明 / 規則說明', {
    x: 1.0,
    y: 5.82,
    w: 11.3,
    h: 0.46,
    fontSize: 24,
    bold: true,
    color: C.navy,
    align: 'center',
    margin: 0,
  })
  slide.addText('20分で協力してQRクイズに挑戦します。', {
    x: 1.0,
    y: 6.32,
    w: 11.3,
    h: 0.3,
    fontSize: 15,
    color: C.muted,
    bold: true,
    align: 'center',
    margin: 0,
  })
  slide.addText('20分鐘內合作挑戰QR問答闖關。', {
    x: 1.0,
    y: 6.68,
    w: 11.3,
    h: 0.3,
    fontSize: 15,
    color: C.muted,
    bold: true,
    align: 'center',
    margin: 0,
  })
}

function addCard(slide, x, y, w, h, card) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: card.fill ?? C.softBlue },
    line: { color: card.line ?? 'D8E5F0', width: 1.2 },
  })
  slide.addText(card.icon, {
    x: x + 0.24,
    y: y + 0.2,
    w: 0.62,
    h: 0.5,
    fontSize: 25,
    bold: true,
    color: card.accent ?? C.blue,
    align: 'center',
    margin: 0,
  })
  slide.addText(card.titleJa, {
    x: x + 0.95,
    y: y + 0.22,
    w: w - 1.2,
    h: 0.32,
    fontSize: 16,
    bold: true,
    color: C.navy,
    margin: 0,
    breakLine: false,
    fit: 'shrink',
  })
  slide.addText(card.titleZh, {
    x: x + 0.95,
    y: y + 0.58,
    w: w - 1.2,
    h: 0.28,
    fontSize: 11,
    bold: true,
    color: C.muted,
    margin: 0,
    fit: 'shrink',
  })
  slide.addText(card.bodyJa, {
    x: x + 0.28,
    y: y + 1.02,
    w: w - 0.56,
    h: 0.72,
    fontSize: 12.2,
    color: C.navy,
    bold: true,
    breakLine: false,
    fit: 'shrink',
    valign: 'mid',
    margin: 0.03,
  })
  slide.addText(card.bodyZh, {
    x: x + 0.28,
    y: y + 1.8,
    w: w - 0.56,
    h: 0.68,
    fontSize: 10.7,
    color: C.muted,
    bold: true,
    breakLine: false,
    fit: 'shrink',
    valign: 'mid',
    margin: 0.03,
  })
}

function addBigNumber(slide, value, labelJa, labelZh, x, y, color) {
  slide.addText(value, {
    x,
    y,
    w: 2.05,
    h: 1.18,
    fontSize: 53,
    bold: true,
    color,
    align: 'center',
    margin: 0,
  })
  slide.addText(labelJa, {
    x: x - 0.15,
    y: y + 1.14,
    w: 2.35,
    h: 0.32,
    fontSize: 13,
    bold: true,
    color: C.navy,
    align: 'center',
    margin: 0,
  })
  slide.addText(labelZh, {
    x: x - 0.15,
    y: y + 1.48,
    w: 2.35,
    h: 0.3,
    fontSize: 10.2,
    bold: true,
    color: C.muted,
    align: 'center',
    margin: 0,
  })
}

function addTwoColumnText(slide, items) {
  items.forEach((item, index) => {
    const y = 2.1 + index * 1.28
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.05,
      y,
      w: 11.2,
      h: 0.98,
      rectRadius: 0.06,
      fill: { color: index % 2 === 0 ? C.softBlue : C.softGold },
      line: { color: 'E6D2B5', transparency: 18 },
    })
    slide.addText(item.ja, {
      x: 1.38,
      y: y + 0.14,
      w: 5.1,
      h: 0.7,
      fontSize: 15,
      bold: true,
      color: C.navy,
      valign: 'mid',
      margin: 0,
      fit: 'shrink',
    })
    slide.addText(item.zh, {
      x: 6.72,
      y: y + 0.14,
      w: 5.0,
      h: 0.7,
      fontSize: 13.3,
      bold: true,
      color: C.navy,
      valign: 'mid',
      margin: 0,
      fit: 'shrink',
    })
  })
}

addTitleSlide()

{
  const slide = pptx.addSlide()
  addBackground(slide)
  addHeader(slide, 1, '学校を回ってQRを探す', '在校園中尋找QR碼')
  addCard(slide, 0.92, 2.05, 3.58, 3.75, {
    icon: '1',
    titleJa: 'QRを見つける',
    titleZh: '找到QR碼',
    bodyJa: '探索エリアを班で歩き、掲示されたQRを探します。',
    bodyZh: '小隊一起在指定區域尋找張貼的QR碼。',
    fill: C.softBlue,
    accent: C.blue,
  })
  addCard(slide, 4.86, 2.05, 3.58, 3.75, {
    icon: '2',
    titleJa: 'iPadで読み取る',
    titleZh: '用iPad掃描',
    bodyJa: '標準カメラで読み取り、Safariで問題を開きます。',
    bodyZh: '用內建相機掃描，並用Safari開啟題目。',
    fill: C.softGold,
    accent: C.gold,
  })
  addCard(slide, 8.8, 2.05, 3.58, 3.75, {
    icon: '3',
    titleJa: '相談して答える',
    titleZh: '討論後作答',
    bodyJa: '4択問題を班で相談してから送信します。',
    bodyZh: '和隊友討論四選一題目後再送出答案。',
    fill: C.softRed,
    accent: C.red,
  })
}

{
  const slide = pptx.addSlide()
  addBackground(slide)
  addHeader(slide, 2, '20分で点数を集める', '20分鐘內累積分數')
  addBigNumber(slide, '20', '制限時間', '時間限制', 1.12, 2.28, C.red)
  addBigNumber(slide, '40', '問題数', '題目數', 3.85, 2.28, C.blue)
  addBigNumber(slide, '1', '班に1台', '每隊1台', 6.58, 2.28, C.teal)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.15,
    y: 2.1,
    w: 2.95,
    h: 2.55,
    rectRadius: 0.08,
    fill: { color: C.softGold },
    line: { color: 'E8CFA8' },
  })
  slide.addText('Result', {
    x: 9.52,
    y: 2.42,
    w: 2.18,
    h: 0.5,
    fontSize: 25,
    bold: true,
    color: C.navy,
    align: 'center',
    margin: 0,
  })
  slide.addText('最後は結果画面をスクショしてロイロノートへ提出', {
    x: 9.45,
    y: 3.05,
    w: 2.35,
    h: 0.58,
    fontSize: 11.5,
    bold: true,
    color: C.navy,
    align: 'center',
    fit: 'shrink',
    margin: 0,
  })
  slide.addText('最後開啟結果畫面截圖，提交到LoiLoNote', {
    x: 9.45,
    y: 3.72,
    w: 2.35,
    h: 0.52,
    fontSize: 10.4,
    bold: true,
    color: C.muted,
    align: 'center',
    fit: 'shrink',
    margin: 0,
  })
  addTwoColumnText(slide, [
    {
      ja: 'Startを押すとタイマーが始まります。',
      zh: '按下Start後計時器開始。',
    },
    {
      ja: '時間が終わると新しい問題には答えられません。',
      zh: '時間結束後不能回答新的題目。',
    },
  ])
}

{
  const slide = pptx.addSlide()
  addBackground(slide)
  addHeader(slide, 3, 'J問題とC問題', 'J題與C題')
  addCard(slide, 1.05, 2.0, 5.25, 3.55, {
    icon: 'J',
    titleJa: 'J問題',
    titleZh: 'J題',
    bodyJa: '日本語で出題。内容は台湾・嘉義・文昌國民小學について。',
    bodyZh: '用日文出題。內容是臺灣、嘉義、文昌國民小學。',
    fill: C.softBlue,
    accent: C.blue,
  })
  addCard(slide, 7.02, 2.0, 5.25, 3.55, {
    icon: 'C',
    titleJa: 'C問題',
    titleZh: 'C題',
    bodyJa: '繁体字中国語で出題。内容は日本・大阪・石小について。',
    bodyZh: '用繁體中文出題。內容是日本、大阪、石橋小學。',
    fill: C.softRed,
    accent: C.red,
  })
  slide.addText('お互いに聞き合うことが、このゲームのいちばん大事なところです。', {
    x: 1.18,
    y: 5.9,
    w: 10.95,
    h: 0.34,
    fontSize: 15,
    bold: true,
    color: C.navy,
    align: 'center',
    margin: 0,
  })
  slide.addText('互相詢問、互相教學，是這個遊戲最重要的部分。', {
    x: 1.18,
    y: 6.32,
    w: 10.95,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: C.muted,
    align: 'center',
    margin: 0,
  })
}

{
  const slide = pptx.addSlide()
  addBackground(slide)
  addHeader(slide, 4, '翻訳の鍵と宝箱QR', '翻譯鑰匙與寶箱QR')
  addBigNumber(slide, '3', '最初の鍵', '一開始有3把', 1.35, 2.28, C.gold)
  slide.addShape(pptx.ShapeType.rightArrow, {
    x: 3.9,
    y: 2.85,
    w: 1.05,
    h: 0.55,
    fill: { color: C.teal },
    line: { color: C.teal },
  })
  addCard(slide, 5.24, 2.0, 3.25, 3.48, {
    icon: '翻',
    titleJa: '対訳を見る',
    titleZh: '查看翻譯',
    bodyJa: 'どうしても分からない時だけ使います。点数は減りません。',
    bodyZh: '真的不懂時才使用。不會扣分。',
    fill: C.softBlue,
    accent: C.teal,
  })
  addCard(slide, 8.92, 2.0, 3.25, 3.48, {
    icon: '+1',
    titleJa: '宝箱QR',
    titleZh: '寶箱QR',
    bodyJa: '見つけると翻訳の鍵が1つ増えます。',
    bodyZh: '找到後可以增加1把翻譯鑰匙。',
    fill: C.softGold,
    accent: C.red,
  })
  slide.addText('まずはチームの友だちに聞いてみましょう。', {
    x: 1.1,
    y: 5.93,
    w: 11.15,
    h: 0.34,
    fontSize: 15.5,
    bold: true,
    color: C.navy,
    align: 'center',
    margin: 0,
  })
  slide.addText('請先問問隊友，再決定要不要使用翻譯鑰匙。', {
    x: 1.1,
    y: 6.33,
    w: 11.15,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: C.muted,
    align: 'center',
    margin: 0,
  })
}

{
  const slide = pptx.addSlide()
  addBackground(slide)
  addHeader(slide, 5, '答えるときのルール', '作答時的規則')
  addTwoColumnText(slide, [
    {
      ja: '答える前に、必ず班で相談します。',
      zh: '作答前一定要和小隊討論。',
    },
    {
      ja: '一度送った答えは変えられません。',
      zh: '答案送出後不能更改。',
    },
    {
      ja: '同じ問題には1回しか答えられません。',
      zh: '同一題只能回答一次。',
    },
    {
      ja: 'ネット検索は禁止です。',
      zh: '禁止上網搜尋答案。',
    },
  ])
}

{
  const slide = pptx.addSlide()
  addBackground(slide)
  addHeader(slide, 6, '探索エリアと安全', '探索區域與安全')
  addTwoColumnText(slide, [
    {
      ja: '探してよい場所: 西校舎、体育館、中庭',
      zh: '可以尋找的地方: 西校舍、體育館、中庭',
    },
    {
      ja: '運動場や東校舎側にはQRはありません。',
      zh: '操場和東校舍沒有QR碼。',
    },
    {
      ja: '廊下は走らず、授業中の場所には入りません。',
      zh: '走廊不要奔跑，不進入正在上課的區域。',
    },
    {
      ja: 'QRは、はがさない・破らない・持ち帰らない。',
      zh: '不要撕下、破壞或帶走QR碼。',
    },
  ])
}

{
  const slide = pptx.addSlide()
  addBackground(slide)
  addHeader(slide, 7, '終了したら体育館へ', '結束後回到體育館')
  addCard(slide, 0.92, 2.0, 3.58, 3.7, {
    icon: '1',
    titleJa: '時間になったら戻る',
    titleZh: '時間到就回來',
    bodyJa: '20分が終わったら、すぐ体育館へ戻ります。',
    bodyZh: '20分鐘結束後，立刻回到體育館。',
    fill: C.softBlue,
    accent: C.blue,
  })
  addCard(slide, 4.86, 2.0, 3.58, 3.7, {
    icon: '2',
    titleJa: 'Resultを開く',
    titleZh: '打開Result',
    bodyJa: '班名・点数・解いた問題数を確認します。',
    bodyZh: '確認隊名、分數、已完成題數。',
    fill: C.softGold,
    accent: C.gold,
  })
  addCard(slide, 8.8, 2.0, 3.58, 3.7, {
    icon: '3',
    titleJa: 'スクショ提出',
    titleZh: '截圖提交',
    bodyJa: '結果画面をスクショしてロイロノートへ出します。',
    bodyZh: '將結果畫面截圖，提交到LoiLoNote。',
    fill: C.softRed,
    accent: C.red,
  })
}

{
  const slide = pptx.addSlide()
  addBackground(slide)
  addHeader(slide, 8, 'いちばん大事なこと', '最重要的事情')
  slide.addText('点数を競いながら、相手に聞く・相手に教える', {
    x: 1.1,
    y: 2.0,
    w: 11.15,
    h: 0.72,
    fontSize: 27,
    bold: true,
    color: C.navy,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
  slide.addText('一邊競爭分數，一邊互相詢問、互相教學', {
    x: 1.1,
    y: 2.86,
    w: 11.15,
    h: 0.58,
    fontSize: 21,
    bold: true,
    color: C.red,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 2.1,
    y: 4.02,
    w: 9.1,
    h: 1.38,
    rectRadius: 0.08,
    fill: { color: C.softBlue },
    line: { color: 'D8E5F0' },
  })
  slide.addText('日本語・中国語・英語を使って、班で協力しましょう。', {
    x: 2.55,
    y: 4.32,
    w: 8.2,
    h: 0.34,
    fontSize: 16,
    bold: true,
    color: C.navy,
    align: 'center',
    margin: 0,
  })
  slide.addText('用日文、中文、英文一起合作吧。', {
    x: 2.55,
    y: 4.78,
    w: 8.2,
    h: 0.3,
    fontSize: 13.2,
    bold: true,
    color: C.muted,
    align: 'center',
    margin: 0,
  })
  slide.addText('20分間、チームで楽しもう！ / 20分鐘內，和小隊一起享受活動！', {
    x: 1.1,
    y: 6.15,
    w: 11.15,
    h: 0.38,
    fontSize: 18,
    bold: true,
    color: C.teal,
    align: 'center',
    margin: 0,
  })
}

await pptx.writeFile({ fileName: outputPath })
console.log(outputPath)
