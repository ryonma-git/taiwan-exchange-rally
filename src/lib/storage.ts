export const STORAGE_KEY = 'taiwan-exchange-rally:v1'
export const DEMO_STORAGE_KEY = 'taiwan-exchange-rally:demo:v1'
export const INITIAL_TRANSLATION_KEYS = 3
export const DEFAULT_TIME_LIMIT_MINUTES = 20

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
  translationExplanation?: string
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
  timerStartedAt: string | null
  timeLimitMinutes: number
}

export function createEmptyRallyState(
  questionSetSignature: string,
  timeLimitMinutes = DEFAULT_TIME_LIMIT_MINUTES,
): RallyState {
  return {
    teamName: '',
    totalScore: 0,
    answerHistory: [],
    answeredQuestionIds: [],
    questionSetSignature,
    translationKeysRemaining: INITIAL_TRANSLATION_KEYS,
    translationKeysUsedQuestionIds: [],
    claimedTreasureIds: [],
    timerStartedAt: null,
    timeLimitMinutes,
  }
}

export function loadRallyState(
  questionSetSignature: string,
  storageKey = STORAGE_KEY,
): RallyState {
  if (!canUseLocalStorage()) {
    return createEmptyRallyState(questionSetSignature)
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey)

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
    const timeLimitMinutes =
      typeof parsedValue.timeLimitMinutes === 'number' &&
      Number.isFinite(parsedValue.timeLimitMinutes) &&
      parsedValue.timeLimitMinutes > 0
        ? parsedValue.timeLimitMinutes
        : DEFAULT_TIME_LIMIT_MINUTES

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
      timerStartedAt:
        typeof parsedValue.timerStartedAt === 'string'
          ? parsedValue.timerStartedAt
          : null,
      timeLimitMinutes,
    }
  } catch {
    return createEmptyRallyState(questionSetSignature)
  }
}

export function saveRallyState(
  state: RallyState,
  storageKey = STORAGE_KEY,
): boolean {
  if (!canUseLocalStorage()) {
    return false
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearRallyState(storageKey = STORAGE_KEY): boolean {
  if (!canUseLocalStorage()) {
    return false
  }

  try {
    window.localStorage.removeItem(storageKey)
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
    typeof record.explanation === 'string' &&
    (record.translationExplanation === undefined ||
      typeof record.translationExplanation === 'string')
  )
}
