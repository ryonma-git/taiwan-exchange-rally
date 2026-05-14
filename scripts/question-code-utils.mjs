const PUBLIC_CODE_SALT = 'taiwan-rally-2026'

export function createQuestionCodeById(items) {
  const codeById = new Map()
  const idByCode = new Map()

  for (const item of items) {
    let publicCode = createPublicCode(item.id)
    let attempt = 2

    while (idByCode.has(publicCode) && idByCode.get(publicCode) !== item.id) {
      publicCode = `${createPublicCode(item.id)}${attempt}`
      attempt += 1
    }

    idByCode.set(publicCode, item.id)
    codeById.set(item.id, publicCode)
  }

  return codeById
}

function createPublicCode(id) {
  let hash = 2166136261
  const source = `${PUBLIC_CODE_SALT}:${String(id ?? '').trim().toUpperCase()}`

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `r${(hash >>> 0).toString(36).padStart(7, '0')}`
}
