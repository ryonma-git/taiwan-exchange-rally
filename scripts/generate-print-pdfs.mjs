import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { createWriteStream } from 'node:fs'
import SVGtoPDF from 'svg-to-pdfkit'

const DEFAULT_BASE_URL = 'https://example.com/taiwan-rally'
const TREASURES = [
  {
    id: 'T01',
    title: 'Treasure QR T01',
  },
  {
    id: 'T02',
    title: 'Treasure QR T02',
  },
]

const COLORS = {
  blue: '#2367a5',
  navy: '#13345b',
  red: '#d9424a',
  plum: '#bf3150',
  teal: '#1b8f84',
  gold: '#f2b844',
  paper: '#fff8f0',
  border: '#e3d8cb',
  muted: '#667386',
  white: '#ffffff',
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const questionsPath = path.join(repoRoot, 'src/data/questions.json')
const outputDir = path.join(repoRoot, 'dist-print')
const treasureChestPath = path.join(repoRoot, 'public/assets/treasure-chest.png')
const baseUrl = normalizeBaseUrl(
  getArgValue('--base') ?? process.env.RALLY_BASE_URL ?? DEFAULT_BASE_URL,
)
const fontPath = findFont()

await mkdir(outputDir, { recursive: true })

const questions = JSON.parse(await readFile(questionsPath, 'utf8'))
const qrRows = createQrRows(questions)
const treasureRows = qrRows.filter((row) => row.type === 'treasure')
const emojiAssets = await loadEmojiAssets()

await createQrCardsPdf(qrRows, 'qr_cards.pdf')
await createQrCardsPdf(treasureRows, 'treasure_cards.pdf')
await createQuestionPostersPdf(questions)
await createAnswerSheetPdf(questions)

console.log('Generated dist-print/qr_cards.pdf')
console.log('Generated dist-print/treasure_cards.pdf')
console.log('Generated dist-print/question_posters.pdf')
console.log('Generated dist-print/answer_sheet.pdf')
console.log(`Base URL: ${baseUrl}`)

function getArgValue(name) {
  const inlineArg = process.argv.find((arg) => arg.startsWith(`${name}=`))

  if (inlineArg) {
    return inlineArg.slice(name.length + 1)
  }

  const argIndex = process.argv.indexOf(name)

  if (argIndex >= 0) {
    return process.argv[argIndex + 1]
  }

  return undefined
}

function normalizeBaseUrl(value) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return DEFAULT_BASE_URL
  }

  return trimmedValue.endsWith('/') ? trimmedValue : `${trimmedValue}/`
}

function createUrl(paramName, id) {
  const url = new URL(baseUrl)
  url.search = ''
  url.hash = ''
  url.searchParams.set(paramName, id)
  return url.toString()
}

function createQrRows(items) {
  return [
    ...items.map((question) => ({
      type: 'question',
      id: question.id,
      title: createQrTitle(question),
      url: createUrl('q', question.id),
      points: `${question.points ?? ''} points`,
      language: question.language ?? '',
    })),
    ...TREASURES.map((treasure) => ({
      type: 'treasure',
      id: treasure.id,
      title: treasure.title,
      url: createUrl('treasure', treasure.id),
      points: 'Translation Key +1',
      language: 'all',
    })),
  ]
}

function createQrTitle(question) {
  return `${question.id} ${question.side ?? 'Question'} QR`
}

function createShortQuestionTitle(question) {
  const source = String(question.question ?? question.id).replace(/\s+/g, ' ')
  return source.length > 34 ? `${source.slice(0, 33)}...` : source
}

async function loadEmojiAssets() {
  const assetDir = path.join(repoRoot, 'public/assets/noto-emoji')
  const assets = {
    cherry: 'cherry-blossom.svg',
    key: 'key.svg',
    school: 'school.svg',
    sparkles: 'sparkles.svg',
  }
  const entries = await Promise.all(
    Object.entries(assets).map(async ([name, fileName]) => [
      name,
      await readFile(path.join(assetDir, fileName), 'utf8'),
    ]),
  )

  return Object.fromEntries(entries)
}

function drawEmoji(doc, name, x, y, size, opacity = 1) {
  const svg = emojiAssets[name]

  if (!svg) {
    return
  }

  doc.save()
  doc.opacity(opacity)
  SVGtoPDF(doc, svg, x, y, {
    preserveAspectRatio: 'xMidYMid meet',
    width: size,
    height: size,
  })
  doc.restore()
}

async function createQrCardsPdf(rows, outputFileName) {
  const { doc, stream } = createDocument(path.join(outputDir, outputFileName))
  const page = {
    width: doc.page.width,
    height: doc.page.height,
    margin: 28,
  }
  const gap = 18
  const cardWidth = page.width - page.margin * 2
  const cardHeight = (page.height - page.margin * 2 - gap) / 2
  const cardsPerPage = 2

  for (let index = 0; index < rows.length; index += 1) {
    if (index > 0 && index % cardsPerPage === 0) {
      doc.addPage()
    }

    const pageIndex = index % cardsPerPage
    const x = page.margin
    const y = page.margin + pageIndex * (cardHeight + gap)
    const qrBuffer = await QRCode.toBuffer(rows[index].url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 520,
    })

    drawQrCard(doc, rows[index], qrBuffer, x, y, cardWidth, cardHeight)
  }

  doc.end()
  await waitForStream(stream)
}

function drawQrCard(doc, row, qrBuffer, x, y, width, height) {
  const isTreasure = row.type === 'treasure'

  if (isTreasure) {
    drawTreasureQrCard(doc, row, qrBuffer, x, y, width, height)
    return
  }

  const accent = isTreasure ? COLORS.gold : COLORS.blue
  const fill = isTreasure ? '#fff8dc' : COLORS.white
  const qrSize = 220
  const qrX = x + width - qrSize - 34
  const qrY = y + 82

  doc
    .save()
    .roundedRect(x, y, width, height, 12)
    .fillAndStroke(fill, COLORS.border)
    .restore()

  doc.rect(x, y, width, 16).fill(accent)
  drawEmoji(doc, 'cherry', x + width - 86, y + 22, 42, 0.72)
  doc
    .fillColor(COLORS.navy)
    .fontSize(15)
    .text(
      isTreasure ? '宝箱 / 寶箱 / Treasure QR' : '問題 / 題目 / Question QR',
      x + 30,
      y + 42,
    )
  doc.fillColor(accent).fontSize(52).text(row.id, x + 30, y + 72)
  doc
    .fillColor(COLORS.navy)
    .fontSize(22)
    .text(row.title, x + 30, y + 134, {
      width: qrX - x - 54,
      height: 62,
    })
  doc.fillColor(COLORS.muted).fontSize(15).text(row.points, x + 30, y + 200)

  // If a custom card mock image is added later, keep this QR box as the swap target.
  doc.roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10).fill(COLORS.white)
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })
  doc
    .fillColor(COLORS.navy)
    .fontSize(13)
    .text('Scan with iPad Camera', qrX - 4, qrY + qrSize + 14, {
      width: qrSize + 8,
      align: 'center',
    })
  doc
    .fillColor(COLORS.muted)
    .fontSize(8.5)
    .text(row.url, qrX - 12, qrY + qrSize + 36, {
      width: qrSize + 24,
      height: 34,
      align: 'center',
    })
}

function drawTreasureQrCard(doc, row, qrBuffer, x, y, width, height) {
  const qrSize = 232
  const qrX = x + width - qrSize - 30
  const qrY = y + 56
  const leftWidth = qrX - x - 44

  doc
    .save()
    .roundedRect(x, y, width, height, 18)
    .fillAndStroke('#fff2c2', '#e4a62c')
    .restore()

  doc.rect(x, y, width, 22).fill(COLORS.gold)
  doc.rect(x, y + height - 22, width, 22).fill(COLORS.red)
  drawConfetti(doc, x + 24, y + 44, leftWidth, 56)
  drawEmoji(doc, 'sparkles', x + leftWidth - 10, y + 46, 48, 0.92)
  drawEmoji(doc, 'key', x + 214, y + 200, 52, 0.96)

  doc
    .fillColor(COLORS.navy)
    .fontSize(15)
    .text('宝箱 / 寶箱 / Treasure QR', x + 34, y + 42)
  doc.fillColor(COLORS.red).fontSize(58).text(row.id, x + 34, y + 70)
  doc.fillColor(COLORS.navy).fontSize(26).text('翻訳の鍵 +1', x + 34, y + 136, {
    width: leftWidth,
  })
  doc.fillColor(COLORS.muted).fontSize(11).text('翻譯鑰匙 +1', x + 34, y + 168, {
    width: leftWidth,
  })
  doc.fillColor(COLORS.muted).fontSize(12).text('見つけたらiPadカメラでスキャン', x + 34, y + 190, {
    width: leftWidth,
  })
  doc.fillColor(COLORS.muted).fontSize(10).text('找到後請用iPad相機掃描', x + 34, y + 208, {
    width: leftWidth,
  })

  doc.image(treasureChestPath, x + 50, y + 206, {
    width: 148,
    height: 148,
  })

  doc
    .roundedRect(qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 16)
    .fillAndStroke(COLORS.white, '#e4a62c')
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })
  doc
    .fillColor(COLORS.navy)
    .fontSize(13)
    .text('Scan with iPad Camera', qrX - 4, qrY + qrSize + 14, {
      width: qrSize + 8,
      align: 'center',
    })
  doc
    .fillColor(COLORS.muted)
    .fontSize(8.5)
    .text(row.url, qrX - 12, qrY + qrSize + 36, {
      width: qrSize + 24,
      height: 34,
      align: 'center',
    })
}

function drawConfetti(doc, x, y, width, height) {
  const pieces = [
    [0.03, 0.16, COLORS.red],
    [0.18, 0.62, COLORS.blue],
    [0.36, 0.2, COLORS.teal],
    [0.58, 0.7, COLORS.plum],
    [0.82, 0.28, COLORS.red],
    [0.94, 0.66, COLORS.blue],
  ]

  pieces.forEach(([xRatio, yRatio, color], index) => {
    const pieceX = x + width * xRatio
    const pieceY = y + height * yRatio
    const size = index % 2 === 0 ? 9 : 7

    doc
      .save()
      .translate(pieceX, pieceY)
      .rotate(index % 2 === 0 ? 18 : -24)
      .rect(-size / 2, -size / 2, size, size)
      .fill(color)
      .restore()
  })
}

async function createQuestionPostersPdf(items) {
  const { doc, stream } = createDocument(path.join(outputDir, 'question_posters.pdf'))

  for (let index = 0; index < items.length; index += 1) {
    if (index > 0) {
      doc.addPage()
    }

    drawPdfHeader(doc, 'Japan-Taiwan School Discovery Rally', 'Question Poster')
    drawQuestionPoster(doc, items[index])
  }

  doc.end()
  await waitForStream(stream)
}

function drawQuestionPoster(doc, question) {
  doc
    .roundedRect(42, 86, 512, 690, 14)
    .fillAndStroke(COLORS.white, COLORS.border)
  doc.rect(42, 86, 512, 18).fill(question.id.startsWith('C') ? COLORS.red : COLORS.blue)
  drawEmoji(doc, question.id.startsWith('C') ? 'school' : 'cherry', 456, 124, 68, 0.9)
  doc.fillColor(COLORS.muted).fontSize(14).text('問題 / 題目 / Question', 66, 130)
  doc.fillColor(COLORS.navy).fontSize(54).text(question.id, 66, 152)
  doc
    .fillColor(COLORS.navy)
    .fontSize(18)
    .text(`${question.points ?? ''} points / ${question.language ?? ''}`, 66, 214)
  doc
    .fillColor(COLORS.navy)
    .fontSize(26)
    .text(question.question, 66, 270, {
      width: 464,
      lineGap: 7,
    })

  let y = 420
  question.choices.forEach((choice, index) => {
    doc
      .roundedRect(66, y, 464, 54, 10)
      .fillAndStroke('#fff8f0', COLORS.border)
    doc.fillColor(COLORS.blue).fontSize(18).text(`${index + 1}`, 84, y + 16)
    doc.fillColor(COLORS.navy).fontSize(18).text(choice, 128, y + 16, {
      width: 380,
    })
    y += 70
  })

  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .text('答えはWebアプリで選んでください。／請在Web應用程式中選擇答案。', 66, 720, {
      width: 464,
      align: 'right',
    })
}

async function createAnswerSheetPdf(items) {
  const { doc, stream } = createDocument(path.join(outputDir, 'answer_sheet.pdf'))
  drawPdfHeader(doc, 'Japan-Taiwan School Discovery Rally', 'Answer Sheet')

  doc
    .fillColor(COLORS.navy)
    .fontSize(15)
    .text('紙バックアップ回答記録用紙 / 紙本備用作答紀錄表', 42, 88)
  doc
    .fillColor(COLORS.muted)
    .fontSize(9)
    .text(
      'Webが使えない場合に、先生が回答と得点を記録するための用紙です。／無法使用Web時，老師可用此表記錄答案與分數。',
      42,
      110,
    )

  drawFormLine(doc, 'チーム名 / 隊名', 42, 144, 218)
  drawFormLine(doc, 'メンバー / 成員', 300, 144, 236)
  drawFormLine(doc, '開始時刻 / 開始時間', 42, 178, 160)
  drawFormLine(doc, '先生確認 / 老師確認', 252, 178, 160)

  doc
    .roundedRect(42, 220, 512, 78, 8)
    .fillAndStroke('#fffaf0', COLORS.border)
  doc.fillColor(COLORS.navy).fontSize(12).text('翻訳の鍵・宝箱QR / 翻譯鑰匙・寶箱QR', 58, 236)
  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .text('開始時の鍵: 3 / 宝箱取得: T01・T02 / 使用した問題ID: / 開始鑰匙: 3 / 寶箱: T01・T02 / 使用題目ID:', 58, 260)
  doc.moveTo(266, 276).lineTo(532, 276).stroke(COLORS.border)

  let y = 330
  drawAnswerTableHeader(doc, y)
  y += 24

  for (const question of items) {
    if (y > 760) {
      doc.addPage()
      drawPdfHeader(doc, 'Japan-Taiwan School Discovery Rally', 'Answer Sheet')
      y = 94
      drawAnswerTableHeader(doc, y)
      y += 24
    }

    drawAnswerTableRow(doc, question, y)
    y += 34
  }

  doc.end()
  await waitForStream(stream)
}

function drawPdfHeader(doc, title, subtitle) {
  doc.rect(0, 0, doc.page.width, 58).fill(COLORS.navy)
  doc.fillColor(COLORS.white).fontSize(16).text(title, 42, 18)
  doc.fillColor('#ffdca3').fontSize(10).text(subtitle, 42, 38)
  doc
    .circle(doc.page.width - 54, 28, 13)
    .fill(COLORS.red)
    .circle(doc.page.width - 26, 28, 13)
    .fill(COLORS.blue)
}

function drawFormLine(doc, label, x, y, width) {
  doc.fillColor(COLORS.navy).fontSize(10).text(label, x, y)
  doc.moveTo(x + 58, y + 12).lineTo(x + width, y + 12).stroke(COLORS.border)
}

function drawAnswerTableHeader(doc, y) {
  const columns = getAnswerColumns()
  doc.rect(42, y, 512, 24).fill(COLORS.blue)
  doc.fillColor(COLORS.white).fontSize(9)

  for (const column of columns) {
    doc.text(column.label, column.x + 4, y + 7, { width: column.width - 8 })
  }
}

function drawAnswerTableRow(doc, question, y) {
  const columns = getAnswerColumns()
  doc.rect(42, y, 512, 34).fillAndStroke(COLORS.white, COLORS.border)
  doc.fillColor(COLORS.navy).fontSize(9)
  doc.text(question.id, columns[0].x + 4, y + 10, {
    width: columns[0].width - 8,
  })
  doc.text(createShortQuestionTitle(question), columns[1].x + 4, y + 7, {
    width: columns[1].width - 8,
    height: 22,
  })
  doc.fillColor(COLORS.muted).text(String(question.points ?? ''), columns[3].x + 4, y + 10, {
    width: columns[3].width - 8,
  })

  for (const column of columns.slice(1)) {
    doc
      .moveTo(column.x, y)
      .lineTo(column.x, y + 34)
      .stroke(COLORS.border)
  }
}

function getAnswerColumns() {
  return [
    { label: 'ID', x: 42, width: 46 },
    { label: '題名', x: 88, width: 198 },
    { label: '答え / 答案', x: 286, width: 116 },
    { label: '得点 / 分數', x: 402, width: 54 },
    { label: '先生 / 老師', x: 456, width: 98 },
  ]
}

function createDocument(outputPath) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: 'Japan-Taiwan School Discovery Rally',
      Author: 'taiwan-exchange-rally',
    },
  })

  if (fontPath) {
    doc.registerFont('RallyFont', fontPath)
    doc.font('RallyFont')
  }

  const stream = createWriteStream(outputPath)
  doc.pipe(stream)
  return { doc, stream }
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
