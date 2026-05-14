import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { createQuestionCodeById } from './question-code-utils.mjs'

const DEFAULT_BASE_URL = 'https://example.com/taiwan-rally'
const TREASURES = [
  {
    id: 'T01',
    title: 'Treasure QR',
  },
  {
    id: 'T02',
    title: 'Treasure QR',
  },
]

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const questionsPath = path.join(repoRoot, 'src/data/questions.json')
const outputDir = path.join(repoRoot, 'public/qr-data')
const sampleQrDir = path.join(outputDir, 'samples')

const baseUrl = normalizeBaseUrl(
  getArgValue('--base') ?? process.env.RALLY_BASE_URL ?? DEFAULT_BASE_URL,
)

const questions = JSON.parse(await readFile(questionsPath, 'utf8'))
const questionCodeById = createQuestionCodeById(questions)
const treasureCodeById = createQuestionCodeById(TREASURES)
const rows = [
  ...questions.map((question) => {
    const publicCode = questionCodeById.get(question.id) ?? question.id

    return {
      type: 'question',
      id: question.id,
      title: createQrTitle(question),
      url: createUrl('q', publicCode),
      points: String(question.points ?? ''),
      language: question.language ?? '',
    }
  }),
  ...TREASURES.map((treasure) => {
    const publicCode = treasureCodeById.get(treasure.id) ?? treasure.id

    return {
      type: 'treasure',
      id: treasure.id,
      title: createTreasureTitle(treasure),
      url: createUrl('treasure', publicCode),
      points: 'translation-key +1',
      language: 'all',
    }
  }),
]

await mkdir(outputDir, { recursive: true })
await rm(sampleQrDir, { recursive: true, force: true })
await mkdir(sampleQrDir, { recursive: true })
await writeFile(
  path.join(outputDir, 'qr_urls.json'),
  `${JSON.stringify(rows, null, 2)}\n`,
)
await writeFile(path.join(outputDir, 'qr_urls.csv'), createCsv(rows))
await Promise.all(rows.map((row) => writeSampleQrPng(row)))

console.log(`Generated ${rows.length} QR URLs`)
console.log(`Base URL: ${baseUrl}`)
console.log('Wrote public/qr-data/qr_urls.json')
console.log('Wrote public/qr-data/qr_urls.csv')
console.log('Wrote public/qr-data/samples/*.png')

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

function createQrTitle(question) {
  return `${question.id} ${question.side ?? 'Question'} QR`
}

function createTreasureTitle(treasure) {
  return `Treasure QR ${treasure.id}`
}

function createCsv(items) {
  const headers = ['type', 'id', 'title', 'url', 'points', 'language']
  const lines = [
    headers.join(','),
    ...items.map((item) =>
      headers.map((header) => csvEscape(item[header] ?? '')).join(','),
    ),
  ]

  return `${lines.join('\n')}\n`
}

async function writeSampleQrPng(row) {
  const pngBuffer = await QRCode.toBuffer(row.url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    type: 'png',
    width: 960,
  })

  await writeFile(path.join(sampleQrDir, `${row.id}.png`), pngBuffer)
}

function csvEscape(value) {
  const text = String(value)

  if (!/[",\n]/.test(text)) {
    return text
  }

  return `"${text.replaceAll('"', '""')}"`
}
