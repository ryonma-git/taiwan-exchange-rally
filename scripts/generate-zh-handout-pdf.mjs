import { existsSync, createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const outputDir = path.join(repoRoot, 'dist-print')
const outputPath = path.join(outputDir, 'taiwan_rally_rules_zh-Hant.pdf')
const logoPath = path.join(
  repoRoot,
  'public/assets/generated/ishisho-wenchang-rally-logo.png',
)
const fontPath = findFont()

const colors = {
  navy: '#13345b',
  blue: '#2367a5',
  red: '#d9424a',
  teal: '#1b8f84',
  gold: '#f2b844',
  cream: '#fff6d8',
  softBlue: '#eaf3fb',
  softGold: '#fff0c9',
  softRed: '#fde8e8',
  border: '#e8cfa8',
  muted: '#667386',
  white: '#ffffff',
}

await mkdir(outputDir, { recursive: true })
await createHandout()
console.log(outputPath)

async function createHandout() {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 30,
    info: {
      Title: 'Japan-Taiwan School Discovery Rally 活動規則一覽',
      Author: 'Ryosuke Matsuo',
    },
  })

  if (fontPath) {
    doc.registerFont('HandoutFont', fontPath)
    doc.font('HandoutFont')
  }

  const stream = createWriteStream(outputPath)
  doc.pipe(stream)

  drawBackground(doc)
  drawHeader(doc)
  drawFlow(doc)
  drawCards(doc)
  drawSafety(doc)
  drawFooter(doc)

  doc.end()
  await waitForStream(stream)
}

function drawBackground(doc) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.cream)
  doc
    .roundedRect(24, 24, doc.page.width - 48, doc.page.height - 48, 14)
    .fill(colors.white)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke()
  doc.rect(24, 24, doc.page.width - 48, 8).fill(colors.blue)
  doc.rect(24, doc.page.height - 32, doc.page.width - 48, 8).fill(colors.red)
}

function drawHeader(doc) {
  if (existsSync(logoPath)) {
    doc.image(logoPath, 48, 40, { width: 170 })
  }

  doc
    .fillColor(colors.red)
    .fontSize(10)
    .text('Japan–Taiwan School Discovery Rally', 235, 44, {
      width: 300,
      align: 'right',
    })
  doc
    .fillColor(colors.navy)
    .fontSize(23)
    .text('校園QR問答闖關', 235, 62, {
      width: 300,
      align: 'right',
    })
  doc
    .fillColor(colors.muted)
    .fontSize(12)
    .text('活動規則一覽', 235, 93, {
      width: 300,
      align: 'right',
    })

  doc
    .roundedRect(48, 126, 487, 48, 8)
    .fill(colors.softBlue)
    .strokeColor('#d8e5f0')
    .stroke()
  doc
    .fillColor(colors.navy)
    .fontSize(12.5)
    .text(
      '每一隊使用一台 iPad，在指定區域尋找QR碼。請用內建相機掃描，並用 Safari 開啟。不要使用控制中心QR掃描器。',
      62,
      140,
      { width: 459, lineGap: 3 },
    )
}

function drawFlow(doc) {
  const steps = [
    ['1', '輸入隊名，按 Start'],
    ['2', '尋找QR碼'],
    ['3', '用相機掃描並作答'],
    ['4', '回體育館，截圖提交'],
  ]
  const x0 = 48
  const y = 190
  const w = 112
  const gap = 13

  steps.forEach(([number, label], index) => {
    const x = x0 + index * (w + gap)
    doc
      .roundedRect(x, y, w, 58, 8)
      .fill(index % 2 === 0 ? colors.softGold : colors.softRed)
      .strokeColor(colors.border)
      .stroke()
    doc.fillColor(index % 2 === 0 ? colors.gold : colors.red)
      .fontSize(23)
      .text(number, x + 9, y + 13, { width: 26, align: 'center' })
    doc
      .fillColor(colors.navy)
      .fontSize(9.8)
      .text(label, x + 38, y + 15, { width: 62, lineGap: 2 })
  })
}

function drawCards(doc) {
  const cards = [
    {
      title: '題目種類',
      color: colors.blue,
      body: [
        'J題：日文出題，內容是臺灣、嘉義、文昌國民小學。',
        'C題：繁體中文出題，內容是日本、大阪、石橋小學。',
        'J題和C題各20題，總共40題。20分鐘內很難全部完成，選題也是策略。',
      ],
    },
    {
      title: '分數與作答',
      color: colors.teal,
      body: [
        '答對題目可以獲得分數，分數會自動累積在 iPad 頁面中。',
        '每一題只能回答一次，答案送出後不能更改。',
        '最後分數最高的隊伍獲勝。',
      ],
    },
    {
      title: '翻譯鑰匙與寶箱QR',
      color: colors.gold,
      body: [
        '每隊一開始有3把翻譯鑰匙。使用後可以看到該題翻譯，不會扣分。',
        '請先問問隊友，真的不懂時再使用。',
        '找到寶箱QR，可以增加1把翻譯鑰匙。',
      ],
    },
    {
      title: '最重要的玩法',
      color: colors.red,
      body: [
        '這不是只看誰跑得快的活動。',
        '請互相詢問、互相教學。',
        '可以用日文、中文、英文，也可以用手勢和圖片溝通。',
      ],
    },
  ]

  const positions = [
    [48, 270],
    [304, 270],
    [48, 450],
    [304, 450],
  ]

  cards.forEach((card, index) => {
    drawCard(doc, positions[index][0], positions[index][1], 231, 152, card)
  })
}

function drawCard(doc, x, y, w, h, card) {
  doc
    .roundedRect(x, y, w, h, 8)
    .fill('#ffffff')
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke()
  doc.roundedRect(x, y, w, 30, 8).fill(card.color)
  doc
    .fillColor(colors.white)
    .fontSize(13.5)
    .text(card.title, x + 12, y + 8, { width: w - 24 })

  let currentY = y + 43
  card.body.forEach((line) => {
    doc
      .fillColor(colors.navy)
      .fontSize(9.2)
      .text(`• ${line}`, x + 13, currentY, {
        width: w - 26,
        lineGap: 2,
      })
    currentY = doc.y + 5
  })
}

function drawSafety(doc) {
  doc
    .roundedRect(48, 628, 487, 104, 8)
    .fill(colors.softRed)
    .strokeColor('#f0c2c2')
    .stroke()
  doc
    .fillColor(colors.red)
    .fontSize(14)
    .text('安全規則', 64, 642, { width: 100 })
  doc
    .fillColor(colors.navy)
    .fontSize(9.4)
    .text(
      [
        '• 走廊不要奔跑。可以尋找的地方：西校舍、體育館、中庭。',
        '• 操場和東校舍沒有QR碼，請不要進入，也不要打擾正在上課的區域。',
        '• 不要撕下、破壞或帶走QR碼。不要大聲說出QR碼的位置或答案。',
        '• 禁止上網搜尋答案。請和隊友一起想、一起問、一起解題。',
      ].join('\n'),
      64,
      666,
      { width: 455, lineGap: 3 },
    )
}

function drawFooter(doc) {
  doc
    .fillColor(colors.teal)
    .fontSize(13.5)
    .text('結束時：回到體育館 → 打開 Result → 截圖 → 用 LoiLoNote 提交', 48, 752, {
      width: 487,
      align: 'center',
    })
  doc
    .fillColor(colors.muted)
    .fontSize(9)
    .text('和隊友合作，互相幫忙，享受20分鐘的校園QR問答闖關！', 48, 779, {
      width: 487,
      align: 'center',
    })
}

function waitForStream(stream) {
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

function findFont() {
  const candidates = [
    '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',
    '/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf',
    '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '/Library/Fonts/NotoSansJP-Regular.otf',
    '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
    '/System/Library/Fonts/Hiragino Sans GB.ttc',
  ]

  return candidates.find((candidate) => existsSync(candidate))
}
