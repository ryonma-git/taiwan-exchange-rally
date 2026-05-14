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

export function createQuestionCodeById(items) {
  const prefixCounts = new Map()
  const codeById = new Map()

  for (const item of items) {
    const prefix = createCodePrefix(item.id)
    const count = prefixCounts.get(prefix) ?? 0
    const suffix = QUESTION_CODE_SUFFIXES[count] ?? String(count + 1)

    prefixCounts.set(prefix, count + 1)
    codeById.set(item.id, `${prefix}${suffix}`)
  }

  return codeById
}

function createCodePrefix(id) {
  return String(id ?? '').trim().charAt(0).toUpperCase() || 'Q'
}
