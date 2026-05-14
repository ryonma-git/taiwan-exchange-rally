const PUBLIC_CODE_SALT = 'taiwan-rally-2026'

type QuestionCodeSource = {
  id: string
}

export function createQuestionCodeMap(items: QuestionCodeSource[]) {
  const codeToId = new Map<string, string>()

  for (const item of items) {
    let publicCode = createPublicCode(item.id)
    let attempt = 2

    while (codeToId.has(publicCode) && codeToId.get(publicCode) !== item.id) {
      publicCode = `${createPublicCode(item.id)}${attempt}`
      attempt += 1
    }

    codeToId.set(publicCode, item.id)
  }

  return codeToId
}

export function invertQuestionCodeMap(codeToId: Map<string, string>) {
  return new Map(Array.from(codeToId, ([code, id]) => [id, code]))
}

function createPublicCode(id: string) {
  let hash = 2166136261
  const source = `${PUBLIC_CODE_SALT}:${id.trim().toUpperCase()}`

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `r${(hash >>> 0).toString(36).padStart(7, '0')}`
}
