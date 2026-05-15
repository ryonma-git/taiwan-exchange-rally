import { existsSync, createWriteStream } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const docsDir = path.join(repoRoot, 'docs')
const outputDir = path.join(repoRoot, 'dist-print/email-attachments')
const fontPath = findFont()

const materials = [
  {
    source: 'taiwan_rally_overview_ja.md',
    output: 'taiwan_rally_overview_ja.pdf',
    title: 'Japan-Taiwan School Discovery Rally',
  },
  {
    source: 'wenchang_quiz_topic_request_zh-Hant.md',
    output: 'wenchang_quiz_topic_request_zh-Hant.pdf',
    title: '臺日交流QR問答闖關',
  },
  {
    source: 'quiz_topic_sheet_trilingual.md',
    output: 'quiz_topic_sheet_trilingual.pdf',
    title: 'Quiz Topic Sheet',
  },
]

await mkdir(outputDir, { recursive: true })

for (const material of materials) {
  const markdown = await readFile(path.join(docsDir, material.source), 'utf8')
  await createPdf(markdown, path.join(outputDir, material.output), material.title)
  console.log(`Generated dist-print/email-attachments/${material.output}`)
}

async function createPdf(markdown, outputPath, title) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 46,
    info: {
      Title: title,
      Author: 'Ryosuke Matsuo',
    },
  })

  if (fontPath) {
    doc.registerFont('MaterialFont', fontPath)
    doc.font('MaterialFont')
  }

  const stream = createWriteStream(outputPath)
  doc.pipe(stream)

  const lines = markdown.split('\n')

  for (const line of lines) {
    drawMarkdownLine(doc, line)
  }

  doc.end()
  await waitForStream(stream)
}

function drawMarkdownLine(doc, line) {
  const trimmedLine = line.trim()

  if (!trimmedLine) {
    doc.moveDown(0.35)
    return
  }

  if (trimmedLine.startsWith('# ')) {
    drawText(doc, trimmedLine.slice(2), 20, '#13345b', 0.75)
    return
  }

  if (trimmedLine.startsWith('## ')) {
    doc.moveDown(0.25)
    drawText(doc, trimmedLine.slice(3), 14, '#2367a5', 0.45)
    return
  }

  if (trimmedLine.startsWith('### ')) {
    drawText(doc, trimmedLine.slice(4), 12, '#13345b', 0.35)
    return
  }

  if (trimmedLine.startsWith('- ')) {
    drawText(doc, `• ${trimmedLine.slice(2)}`, 10, '#1e2a38', 0.18, 16)
    return
  }

  if (trimmedLine.startsWith('|')) {
    drawText(doc, trimmedLine.replaceAll('|', '  |  '), 8.2, '#1e2a38', 0.1)
    return
  }

  drawText(doc, trimmedLine, 10, '#1e2a38', 0.25)
}

function drawText(doc, text, fontSize, color, spacingAfter, indent = 0) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent
  const height = doc.heightOfString(text, {
    width,
    lineGap: 3,
  })

  ensureSpace(doc, height + fontSize)
  doc.fillColor(color).fontSize(fontSize).text(text, {
    width,
    indent,
    lineGap: 3,
  })
  doc.moveDown(spacingAfter)
}

function ensureSpace(doc, neededHeight) {
  const bottom = doc.page.height - doc.page.margins.bottom

  if (doc.y + neededHeight > bottom) {
    doc.addPage()
  }
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
