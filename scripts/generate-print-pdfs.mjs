import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { createWriteStream } from 'node:fs'

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
const baseUrl = normalizeBaseUrl(
  getArgValue('--base') ?? process.env.RALLY_BASE_URL ?? DEFAULT_BASE_URL,
)
const fontPath = findFont()

await mkdir(outputDir, { recursive: true })

const questions = JSON.parse(await readFile(questionsPath, 'utf8'))
const qrRows = createQrRows(questions)

await createQrCardsPdf(qrRows)
await createAnswerSheetPdf(questions)

console.log('Generated dist-print/qr_cards.pdf')
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
      title: createQuestionTitle(question),
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

function createQuestionTitle(question) {
  const source = String(question.question ?? question.id).replace(/\s+/g, ' ')
  return source.length > 34 ? `${source.slice(0, 33)}...` : source
}

async function createQrCardsPdf(rows) {
  const { doc, stream } = createDocument(path.join(outputDir, 'qr_cards.pdf'))
  const page = {
    width: doc.page.width,
    height: doc.page.height,
    margin: 34,
  }
  const gap = 14
  const cardWidth = (page.width - page.margin * 2 - gap) / 2
  const cardHeight = 238
  const cardsPerPage = 6

  drawPdfHeader(doc, 'Japan-Taiwan School Discovery Rally', 'QR Cards')

  for (let index = 0; index < rows.length; index += 1) {
    if (index > 0 && index % cardsPerPage === 0) {
      doc.addPage()
      drawPdfHeader(doc, 'Japan-Taiwan School Discovery Rally', 'QR Cards')
    }

    const pageIndex = index % cardsPerPage
    const col = pageIndex % 2
    const row = Math.floor(pageIndex / 2)
    const x = page.margin + col * (cardWidth + gap)
    const y = 88 + row * (cardHeight + gap)
    const qrBuffer = await QRCode.toBuffer(rows[index].url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 184,
    })

    drawQrCard(doc, rows[index], qrBuffer, x, y, cardWidth, cardHeight)
  }

  doc.end()
  await waitForStream(stream)
}

function drawQrCard(doc, row, qrBuffer, x, y, width, height) {
  const isTreasure = row.type === 'treasure'
  const accent = isTreasure ? COLORS.gold : COLORS.blue
  const fill = isTreasure ? '#fff8dc' : COLORS.white

  doc
    .save()
    .roundedRect(x, y, width, height, 10)
    .fillAndStroke(fill, COLORS.border)
    .restore()

  doc.rect(x, y, width, 12).fill(accent)
  doc
    .fillColor(COLORS.navy)
    .fontSize(10)
    .text(isTreasure ? '宝箱 / Treasure' : '問題 / Question', x + 14, y + 24)
  doc.fillColor(accent).fontSize(27).text(row.id, x + 14, y + 42)
  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .text(row.points, x + 14, y + 78)
  doc
    .fillColor(COLORS.navy)
    .fontSize(11)
    .text(row.title, x + 14, y + 96, {
      width: width - 28,
      height: 34,
    })

  doc.image(qrBuffer, x + 18, y + 132, { width: 84, height: 84 })
  doc
    .fillColor(COLORS.navy)
    .fontSize(11)
    .text('Scan with iPad Camera', x + 112, y + 146, {
      width: width - 126,
    })
  doc
    .fillColor(COLORS.muted)
    .fontSize(7.5)
    .text(row.url, x + 112, y + 178, {
      width: width - 126,
      height: 36,
    })
}

async function createAnswerSheetPdf(items) {
  const { doc, stream } = createDocument(path.join(outputDir, 'answer_sheet.pdf'))
  drawPdfHeader(doc, 'Japan-Taiwan School Discovery Rally', 'Answer Sheet')

  doc
    .fillColor(COLORS.navy)
    .fontSize(15)
    .text('紙バックアップ回答記録用紙', 42, 88)
  doc
    .fillColor(COLORS.muted)
    .fontSize(9)
    .text(
      'Webが使えない場合に、先生が回答と得点を記録するための用紙です。',
      42,
      110,
    )

  drawFormLine(doc, 'チーム名', 42, 144, 218)
  drawFormLine(doc, 'メンバー', 300, 144, 236)
  drawFormLine(doc, '開始時刻', 42, 178, 160)
  drawFormLine(doc, '先生確認', 252, 178, 160)

  doc
    .roundedRect(42, 220, 512, 78, 8)
    .fillAndStroke('#fffaf0', COLORS.border)
  doc.fillColor(COLORS.navy).fontSize(12).text('翻訳の鍵・宝箱QR', 58, 236)
  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .text('開始時の鍵: 3 / 宝箱取得: T01・T02 / 使用した問題ID:', 58, 260)
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
  doc.text(createQuestionTitle(question), columns[1].x + 4, y + 7, {
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
    { label: '短いタイトル', x: 88, width: 198 },
    { label: '答え', x: 286, width: 116 },
    { label: '得点', x: 402, width: 54 },
    { label: '先生チェック', x: 456, width: 98 },
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
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '/Library/Fonts/NotoSansJP-Regular.otf',
    '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
    '/System/Library/Fonts/Hiragino Sans GB.ttc',
  ]

  return candidates.find((candidate) => existsSync(candidate))
}
