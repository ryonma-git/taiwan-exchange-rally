export const STORAGE_KEY = 'taiwan-exchange-rally:v1'
export const INITIAL_TRANSLATION_KEYS = 3

export type AnswerRecord = {
  questionId: string
  selectedIndex: number
  correctIndex: number
  isCorrect: boolean
  pointsEarned: number
  answeredAt: string
  question: string
  choice: string
  correctChoice: string
  explanation: string
}

export type RallyState = {
  teamName: string
  totalScore: number
  answerHistory: AnswerRecord[]
  answeredQuestionIds: string[]
  questionSetSignature: string
  translationKeysRemaining: number
  translationKeysUsedQuestionIds: string[]
  claimedTreasureIds: string[]
}

export function createEmptyRallyState(questionSetSignature: string): RallyState {
  return {
    teamName: '',
    totalScore: 0,
    answerHistory: [],
    answeredQuestionIds: [],
    questionSetSignature,
    translationKeysRemaining: INITIAL_TRANSLATION_KEYS,
    translationKeysUsedQuestionIds: [],
    claimedTreasureIds: [],
  }
}

export function loadRallyState(questionSetSignature: string): RallyState {
  if (!canUseLocalStorage()) {
    return createEmptyRallyState(questionSetSignature)
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)

    if (!rawValue) {
      return createEmptyRallyState(questionSetSignature)
    }

    const parsedValue = JSON.parse(rawValue) as Partial<RallyState>

    if (parsedValue.questionSetSignature !== questionSetSignature) {
      return createEmptyRallyState(questionSetSignature)
    }

    const answerHistory = Array.isArray(parsedValue.answerHistory)
      ? dedupeAnswerHistory(parsedValue.answerHistory.filter(isAnswerRecord))
      : []
    const translationKeysUsedQuestionIds = Array.isArray(
      parsedValue.translationKeysUsedQuestionIds,
    )
      ? createUniqueStrings(parsedValue.translationKeysUsedQuestionIds)
      : []
    const claimedTreasureIds = Array.isArray(parsedValue.claimedTreasureIds)
      ? createUniqueStrings(parsedValue.claimedTreasureIds)
      : []

    return {
      teamName:
        typeof parsedValue.teamName === 'string' ? parsedValue.teamName : '',
      totalScore: answerHistory.reduce(
        (total, record) => total + record.pointsEarned,
        0,
      ),
      answerHistory,
      answeredQuestionIds: createAnsweredQuestionIds(answerHistory),
      questionSetSignature,
      translationKeysRemaining: calculateTranslationKeysRemaining(
        translationKeysUsedQuestionIds,
        claimedTreasureIds,
      ),
      translationKeysUsedQuestionIds,
      claimedTreasureIds,
    }
  } catch {
    return createEmptyRallyState(questionSetSignature)
  }
}

export function saveRallyState(state: RallyState): boolean {
  if (!canUseLocalStorage()) {
    return false
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearRallyState(): boolean {
  if (!canUseLocalStorage()) {
    return false
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

function canUseLocalStorage() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

function createAnsweredQuestionIds(answerHistory: AnswerRecord[]) {
  return Array.from(new Set(answerHistory.map((record) => record.questionId)))
}

function createUniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.filter(isString)))
}

function calculateTranslationKeysRemaining(
  translationKeysUsedQuestionIds: string[],
  claimedTreasureIds: string[],
) {
  return Math.max(
    0,
    INITIAL_TRANSLATION_KEYS +
      claimedTreasureIds.length -
      translationKeysUsedQuestionIds.length,
  )
}

function dedupeAnswerHistory(answerHistory: AnswerRecord[]) {
  const seenQuestionIds = new Set<string>()
  const dedupedHistory: AnswerRecord[] = []

  for (const record of answerHistory) {
    if (seenQuestionIds.has(record.questionId)) {
      continue
    }

    seenQuestionIds.add(record.questionId)
    dedupedHistory.push(record)
  }

  return dedupedHistory
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isAnswerRecord(value: unknown): value is AnswerRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Partial<AnswerRecord>

  return (
    typeof record.questionId === 'string' &&
    typeof record.selectedIndex === 'number' &&
    typeof record.correctIndex === 'number' &&
    typeof record.isCorrect === 'boolean' &&
    typeof record.pointsEarned === 'number' &&
    typeof record.answeredAt === 'string' &&
    typeof record.question === 'string' &&
    typeof record.choice === 'string' &&
    typeof record.correctChoice === 'string' &&
    typeof record.explanation === 'string'
  )
}
