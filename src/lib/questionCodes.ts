const QUESTION_CODE_SUFFIXES = [
  'あ',
  'い',
  'う',
  'え',
  'お',
  'か',
  'き',
  'く',
  'け',
  'こ',
  'さ',
  'し',
  'す',
  'せ',
  'そ',
  'た',
  'ち',
  'つ',
  'て',
  'と',
]

type QuestionCodeSource = {
  id: string
}

export function createQuestionCodeMap(items: QuestionCodeSource[]) {
  const prefixCounts = new Map<string, number>()
  const codeToId = new Map<string, string>()

  for (const item of items) {
    const prefix = createCodePrefix(item.id)
    const count = prefixCounts.get(prefix) ?? 0
    const suffix = QUESTION_CODE_SUFFIXES[count] ?? String(count + 1)
    const publicCode = `${prefix}${suffix}`

    prefixCounts.set(prefix, count + 1)
    codeToId.set(publicCode, item.id)
  }

  return codeToId
}

export function invertQuestionCodeMap(codeToId: Map<string, string>) {
  return new Map(Array.from(codeToId, ([code, id]) => [id, code]))
}

function createCodePrefix(id: string) {
  return id.trim().charAt(0).toUpperCase() || 'Q'
}
