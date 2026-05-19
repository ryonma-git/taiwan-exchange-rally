import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import debugQuestionsRaw from './data/debugQuestions.json?raw'
import questionsRaw from './data/questions.json?raw'
import {
  INITIAL_TRANSLATION_KEYS,
  DEMO_STORAGE_KEY,
  STORAGE_KEY,
  clearRallyState,
  createEmptyRallyState,
  DEFAULT_TIME_LIMIT_MINUTES,
  loadRallyState,
  saveRallyState,
  type AnswerRecord,
  type RallyState,
} from './lib/storage'
import { createQuestionCodeMap } from './lib/questionCodes'

type Question = {
  id: string
  side: string
  language: string
  difficulty: string
  points: number
  question: string
  choices: string[]
  answerIndex: number
  explanation: string
  translationText?: string
  translationExplanation?: string
}

type ScreenMode = 'home' | 'result' | 'answer-result'
type TreasureStatus = 'claimed' | 'already-claimed' | 'invalid'
type TranslationChoiceLine = {
  label: string
  text: string
}

const EVENT_NAME = 'Japan–Taiwan School Discovery Rally'
const EVENT_SUBTITLE = '台湾交流会 校内QRクイズラリー / 臺灣交流會 校園QR問答闖關'
const STORAGE_ERROR_MESSAGE =
  'この端末では保存に失敗しました。先生に知らせてください。／此裝置儲存失敗，請告訴老師。'
const NO_TRANSLATION_KEYS_MESSAGE =
  '翻訳の鍵はもう残っていません。／翻譯鑰匙已經用完了。'
const DEMO_TEAM_NAME = 'デモ班'
const RALLY_TIME_LIMIT_MINUTES = DEFAULT_TIME_LIMIT_MINUTES
const WARNING_REMAINING_MS = 5 * 60 * 1000
const RALLY_UNLOCK_AT_MS = Date.parse('2026-05-19T14:00:00+09:00')
const RALLY_UNLOCK_LABEL = '2026年5月19日 14:00'
const questions = JSON.parse(questionsRaw) as Question[]
const debugQuestions = JSON.parse(debugQuestionsRaw) as Question[]
const productionQuestionMap = new Map(
  questions.map((question) => [question.id, question]),
)
const debugQuestionMap = new Map(
  debugQuestions.map((question) => [question.id, question]),
)
const questionMap = new Map([...productionQuestionMap, ...debugQuestionMap])
const questionIdByPublicCode = createQuestionCodeMap(questions)
const debugQuestionIdByPublicCode = createQuestionCodeMap(debugQuestions)
const questionSetSignature = createQuestionSetSignature(questionsRaw)
const treasures = [{ id: 'T01' }, { id: 'T02' }]
const allowedTreasureIds = treasures.map((treasure) => treasure.id)
const treasureIdByPublicCode = createQuestionCodeMap(treasures)
const assetBaseUrl = import.meta.env.BASE_URL
const UNKNOWN_QUESTION_PREFIX = '__unknown_question__:'
const UNKNOWN_TREASURE_PREFIX = '__unknown_treasure__:'

function getAssetUrl(path: string) {
  return `${assetBaseUrl}${path.replace(/^\//, '')}`
}

function RallyLogo({
  className = '',
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <img
      className={`${compact ? 'rally-logo compact' : 'rally-logo'} ${className}`.trim()}
      src={getAssetUrl('assets/generated/ishisho-wenchang-rally-logo.png')}
      alt="石小 × 文昌 Japan-Taiwan School Discovery Rally"
    />
  )
}

function BilingualText({ ja, zh }: { ja: string; zh: string }) {
  return (
    <span className="bilingual-text">
      <span>{ja}</span>
      <span className="zh-line">{zh}</span>
    </span>
  )
}

function TranslationText({ text }: { text: string }) {
  const { bodyLines, choiceLines } = parseTranslationText(text)

  return (
    <div className="translation-content">
      {bodyLines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {choiceLines.length > 0 && (
        <ul className="translation-choice-list">
          {choiceLines.map((choice) => (
            <li key={`${choice.label}-${choice.text}`}>
              <span>{choice.label}.</span>
              <strong>{choice.text}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function parseTranslationText(value: string) {
  const bodyLines: string[] = []
  const choiceLines: TranslationChoiceLine[] = []

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    const choiceMatch = /^([A-D])[\u002e\uff0e]\s*(.+)$/i.exec(line)

    if (choiceMatch) {
      choiceLines.push({
        label: choiceMatch[1].toUpperCase(),
        text: choiceMatch[2],
      })
      continue
    }

    bodyLines.push(line)
  }

  return { bodyLines, choiceLines }
}

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

function parseTimeLimitMinutes(value: string) {
  const parsedValue = Number(value)

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 5 ||
    parsedValue > 120
  ) {
    return null
  }

  return parsedValue
}

function createQuestionSetSignature(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `v1-${value.length}-${(hash >>> 0).toString(16)}`
}

function readQuestionIdFromUrl() {
  const value = readQuestionParamFromUrl()

  if (!value) {
    return null
  }

  const internalId = value.toUpperCase()

  return (
    (questionMap.has(internalId) ? internalId : undefined) ??
    questionIdByPublicCode.get(value.toLowerCase()) ??
    debugQuestionIdByPublicCode.get(value.toLowerCase()) ??
    `${UNKNOWN_QUESTION_PREFIX}${value}`
  )
}

function readQuestionParamFromUrl() {
  return new URLSearchParams(window.location.search).get('q')?.trim() ?? ''
}

function isDirectQuestionIdAccess(questionId: string | null) {
  if (!questionId || !questionMap.has(questionId)) {
    return false
  }

  return readQuestionParamFromUrl().toUpperCase() === questionId
}

function isDemoQuestionAccess(questionId: string | null) {
  return (
    Boolean(questionId && debugQuestionMap.has(questionId)) ||
    isDirectQuestionIdAccess(questionId)
  )
}

function getRallyStorageKey(isDemo: boolean) {
  return isDemo ? DEMO_STORAGE_KEY : STORAGE_KEY
}

function getQuestionDisplayCode(questionId: string | null) {
  return questionId?.startsWith(UNKNOWN_QUESTION_PREFIX)
    ? questionId.slice(UNKNOWN_QUESTION_PREFIX.length)
    : questionId
}

function readTreasureIdFromUrl() {
  const value = new URLSearchParams(window.location.search)
    .get('treasure')
    ?.trim()

  if (!value) {
    return null
  }

  const internalId = value.toUpperCase()

  return (
    (allowedTreasureIds.includes(internalId) ? internalId : undefined) ??
    treasureIdByPublicCode.get(value.toLowerCase()) ??
    `${UNKNOWN_TREASURE_PREFIX}${value}`
  )
}

function removeRallyParamsFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('q')
  url.searchParams.delete('treasure')
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

function isAllowedTreasureId(value: string) {
  return allowedTreasureIds.includes(value)
}

function getTreasureDisplayCode(treasureId: string | null) {
  if (!treasureId) {
    return 'Unknown'
  }

  if (treasureId.startsWith(UNKNOWN_TREASURE_PREFIX)) {
    return treasureId.slice(UNKNOWN_TREASURE_PREFIX.length)
  }

  return treasureId
}

function formatAnsweredAt(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function calculateTotalScore(answerHistory: AnswerRecord[]) {
  return answerHistory.reduce(
    (total, record) => total + record.pointsEarned,
    0,
  )
}

function createAnsweredQuestionIds(answerHistory: AnswerRecord[]) {
  return Array.from(new Set(answerHistory.map((record) => record.questionId)))
}

function createUniqueIds(values: string[]) {
  return Array.from(new Set(values))
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

function mergeAnswerHistories(
  latestHistory: AnswerRecord[],
  currentHistory: AnswerRecord[],
) {
  const seenQuestionIds = new Set<string>()
  const mergedHistory: AnswerRecord[] = []

  for (const record of [...latestHistory, ...currentHistory]) {
    if (seenQuestionIds.has(record.questionId)) {
      continue
    }

    seenQuestionIds.add(record.questionId)
    mergedHistory.push(record)
  }

  return mergedHistory
}

function rebuildRallyState(
  state: RallyState,
  answerHistory: AnswerRecord[],
  translationKeysUsedQuestionIds = state.translationKeysUsedQuestionIds,
  claimedTreasureIds = state.claimedTreasureIds,
): RallyState {
  const nextTranslationKeysUsedQuestionIds = createUniqueIds(
    translationKeysUsedQuestionIds,
  )
  const nextClaimedTreasureIds = createUniqueIds(claimedTreasureIds)

  return {
    ...state,
    totalScore: calculateTotalScore(answerHistory),
    answerHistory,
    answeredQuestionIds: createAnsweredQuestionIds(answerHistory),
    questionSetSignature,
    translationKeysRemaining: calculateTranslationKeysRemaining(
      nextTranslationKeysUsedQuestionIds,
      nextClaimedTreasureIds,
    ),
    translationKeysUsedQuestionIds: nextTranslationKeysUsedQuestionIds,
    claimedTreasureIds: nextClaimedTreasureIds,
    timerStartedAt: state.timerStartedAt,
    timeLimitMinutes: state.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES,
  }
}

function mergeRallyStates(latestState: RallyState, currentState: RallyState) {
  return rebuildRallyState(
    {
      ...latestState,
      teamName: latestState.teamName || currentState.teamName,
      timerStartedAt: latestState.timerStartedAt || currentState.timerStartedAt,
      timeLimitMinutes:
        latestState.timeLimitMinutes ||
        currentState.timeLimitMinutes ||
        RALLY_TIME_LIMIT_MINUTES,
    },
    mergeAnswerHistories(latestState.answerHistory, currentState.answerHistory),
    [
      ...latestState.translationKeysUsedQuestionIds,
      ...currentState.translationKeysUsedQuestionIds,
    ],
    [...latestState.claimedTreasureIds, ...currentState.claimedTreasureIds],
  )
}

function App() {
  const [rallyState, setRallyState] = useState<RallyState>(() =>
    loadRallyState(
      questionSetSignature,
      getRallyStorageKey(isDemoQuestionAccess(readQuestionIdFromUrl())),
    ),
  )
  const [teamNameInput, setTeamNameInput] = useState(rallyState.teamName)
  const [teamNameError, setTeamNameError] = useState('')
  const [storageWarning, setStorageWarning] = useState('')
  const [screenMode, setScreenMode] = useState<ScreenMode>('home')
  const [questionId, setQuestionId] = useState<string | null>(() =>
    readQuestionIdFromUrl(),
  )
  const [isDemoAccess, setIsDemoAccess] = useState(() =>
    isDemoQuestionAccess(readQuestionIdFromUrl()),
  )
  const [treasureId, setTreasureId] = useState<string | null>(() =>
    readTreasureIdFromUrl(),
  )
  const [processedTreasureId, setProcessedTreasureId] = useState<string | null>(
    null,
  )
  const [treasureStatus, setTreasureStatus] = useState<TreasureStatus | null>(
    null,
  )
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<AnswerRecord | null>(null)
  const [translationNotice, setTranslationNotice] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [isTimeSettingsOpen, setIsTimeSettingsOpen] = useState(false)
  const [timeLimitInput, setTimeLimitInput] = useState(() =>
    String(rallyState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES),
  )
  const [timeLimitMessage, setTimeLimitMessage] = useState('')

  const activeQuestion = questionId ? questionMap.get(questionId) : undefined
  const isActiveDemoQuestion = isDemoQuestionAccess(questionId)
  const canUseDemoNavigation = isDemoAccess || isActiveDemoQuestion
  const activeStorageKey = getRallyStorageKey(canUseDemoNavigation)
  const activeTreasureId =
    treasureId && isAllowedTreasureId(treasureId) ? treasureId : undefined
  const currentTreasureStatus = !activeTreasureId
    ? 'invalid'
    : treasureStatus ??
      (rallyState.claimedTreasureIds.includes(activeTreasureId)
        ? 'already-claimed'
        : 'pending')
  const savedAnsweredRecord = useMemo(
    () =>
      activeQuestion
        ? rallyState.answerHistory.find(
            (record) => record.questionId === activeQuestion.id,
          )
        : undefined,
    [activeQuestion, rallyState.answerHistory],
  )
  const answeredRecord = savedAnsweredRecord
  const hasUsedTranslationKey = activeQuestion
    ? rallyState.translationKeysUsedQuestionIds.includes(activeQuestion.id)
    : false
  const activeTranslationText = activeQuestion?.translationText?.trim() ?? ''
  const hasQuestionTranslation = activeTranslationText.length > 0
  const shouldShowTranslation = hasQuestionTranslation && hasUsedTranslationKey
  const hasTeamName = rallyState.teamName.trim().length > 0
  const timerStartedAtMs = rallyState.timerStartedAt
    ? Date.parse(rallyState.timerStartedAt)
    : Number.NaN
  const hasActiveTimer = Number.isFinite(timerStartedAtMs)
  const timeLimitMs =
    (rallyState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES) * 60 * 1000
  const remainingMs = hasActiveTimer
    ? Math.max(0, timerStartedAtMs + timeLimitMs - nowMs)
    : timeLimitMs
  const isTimeExpired = hasTeamName && hasActiveTimer && remainingMs <= 0
  const isTimeWarning =
    hasTeamName &&
    hasActiveTimer &&
    remainingMs > 0 &&
    remainingMs <= WARNING_REMAINING_MS
  const isBeforeRallyLaunch = nowMs < RALLY_UNLOCK_AT_MS
  const isQrEntryLocked =
    Boolean(questionId || treasureId) &&
    isBeforeRallyLaunch &&
    !isActiveDemoQuestion
  const isQuestionBlocked =
    Boolean(activeQuestion) &&
    !answeredRecord &&
    isTimeExpired &&
    !isActiveDemoQuestion
  const screen = isQrEntryLocked
    ? 'launch-wait'
    : !hasTeamName && !canUseDemoNavigation
    ? 'start'
    : screenMode === 'answer-result' && feedback
      ? 'answer-result'
    : screenMode === 'result'
      ? 'result'
      : treasureId
        ? 'treasure'
        : questionId
          ? 'question'
          : 'home'
  const correctCount = rallyState.answerHistory.filter(
    (record) => record.isCorrect,
  ).length

  const persistState = useCallback((nextState: RallyState) => {
    setRallyState(nextState)
    const wasSaved = saveRallyState(nextState, activeStorageKey)
    setStorageWarning(wasSaved ? '' : STORAGE_ERROR_MESSAGE)
    return wasSaved
  }, [activeStorageKey])

  useEffect(() => {
    const handlePopState = () => {
      const nextQuestionId = readQuestionIdFromUrl()
      const nextIsDemoAccess = isDemoQuestionAccess(nextQuestionId)
      const nextState = loadRallyState(
        questionSetSignature,
        getRallyStorageKey(nextIsDemoAccess),
      )
      setQuestionId(nextQuestionId)
      setIsDemoAccess(nextIsDemoAccess)
      setRallyState(nextState)
      setTeamNameInput(nextState.teamName)
      setTimeLimitInput(
        String(nextState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES),
      )
      setTreasureId(readTreasureIdFromUrl())
      setProcessedTreasureId(null)
      setTreasureStatus(null)
      setScreenMode('home')
      setSelectedIndex(null)
      setFeedback(null)
      setTranslationNotice('')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!isBeforeRallyLaunch) {
      return undefined
    }

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isBeforeRallyLaunch])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== activeStorageKey) {
        return
      }

      const nextState = loadRallyState(questionSetSignature, activeStorageKey)
      setRallyState(nextState)
      setTeamNameInput(nextState.teamName)
      setTimeLimitInput(
        String(nextState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES),
      )
      setStorageWarning('')

      const currentQuestionId = readQuestionIdFromUrl()
      const syncedRecord = nextState.answerHistory.find(
        (record) => record.questionId === currentQuestionId,
      )
      setFeedback(syncedRecord ?? null)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [activeStorageKey])

  useEffect(() => {
    if (!hasTeamName || !rallyState.timerStartedAt) {
      return undefined
    }

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [hasTeamName, rallyState.timerStartedAt])

  useEffect(() => {
    if (!canUseDemoNavigation || hasTeamName) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      const latestState = loadRallyState(questionSetSignature, activeStorageKey)

      if (latestState.teamName.trim()) {
        setRallyState(latestState)
        setTeamNameInput(latestState.teamName)
        setTimeLimitInput(
          String(latestState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES),
        )
        return
      }

      persistState({
        ...latestState,
        teamName: DEMO_TEAM_NAME,
        timerStartedAt: new Date().toISOString(),
        timeLimitMinutes:
          latestState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES,
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [activeStorageKey, canUseDemoNavigation, hasTeamName, persistState])

  useEffect(() => {
    if (!hasTeamName || rallyState.timerStartedAt) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      const latestState = loadRallyState(questionSetSignature, activeStorageKey)
      const baseState = mergeRallyStates(latestState, rallyState)

      if (baseState.timerStartedAt) {
        setRallyState(baseState)
        return
      }

      persistState({
        ...baseState,
        timerStartedAt: new Date().toISOString(),
        timeLimitMinutes: baseState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES,
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [activeStorageKey, hasTeamName, persistState, rallyState])

  useEffect(() => {
    if (
      isBeforeRallyLaunch ||
      !hasTeamName ||
      !treasureId ||
      processedTreasureId === treasureId
    ) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      if (!isAllowedTreasureId(treasureId)) {
        setTreasureStatus('invalid')
        setProcessedTreasureId(treasureId)
        return
      }

      const latestState = loadRallyState(questionSetSignature, activeStorageKey)
      const baseState = mergeRallyStates(latestState, rallyState)

      if (baseState.claimedTreasureIds.includes(treasureId)) {
        setRallyState(baseState)
        setTeamNameInput(baseState.teamName)
        setStorageWarning('')
        setTreasureStatus('already-claimed')
        setProcessedTreasureId(treasureId)
        return
      }

      const nextState = rebuildRallyState(
        baseState,
        baseState.answerHistory,
        baseState.translationKeysUsedQuestionIds,
        [...baseState.claimedTreasureIds, treasureId],
      )

      persistState(nextState)
      setTreasureStatus('claimed')
      setProcessedTreasureId(treasureId)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [
    hasTeamName,
    activeStorageKey,
    isBeforeRallyLaunch,
    persistState,
    processedTreasureId,
    rallyState,
    treasureId,
  ])

  const handleStart = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextTeamName = teamNameInput.trim()

    if (!nextTeamName) {
      setTeamNameError('班名を入力してください。／請輸入隊名。')
      return
    }

    const latestState = loadRallyState(questionSetSignature, activeStorageKey)
    const mergedState = mergeRallyStates(latestState, rallyState)
    const nextState = {
      ...mergedState,
      teamName: nextTeamName,
      timerStartedAt: new Date().toISOString(),
      timeLimitMinutes:
        mergedState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES,
    }

    persistState(nextState)
    setTeamNameInput(nextTeamName)
    setTeamNameError('')
    setScreenMode('home')
  }

  const handleGoHome = () => {
    removeRallyParamsFromUrl()
    setQuestionId(null)
    setTreasureId(null)
    setProcessedTreasureId(null)
    setTreasureStatus(null)
    setScreenMode('home')
    setSelectedIndex(null)
    setFeedback(null)
    setTranslationNotice('')
  }

  const handleCloseAnswerResult = () => {
    handleGoHome()
  }

  const handleSaveTimeLimit = () => {
    const nextTimeLimitMinutes = parseTimeLimitMinutes(timeLimitInput)

    if (nextTimeLimitMinutes === null) {
      setTimeLimitMessage(
        '5〜120分の整数で入力してください。／請輸入5到120分鐘的整數。',
      )
      return
    }

    const latestState = loadRallyState(questionSetSignature, activeStorageKey)
    const baseState = mergeRallyStates(latestState, rallyState)
    const nextState: RallyState = {
      ...baseState,
      timeLimitMinutes: nextTimeLimitMinutes,
      timerStartedAt: baseState.teamName ? baseState.timerStartedAt : null,
    }

    persistState(nextState)
    setTimeLimitInput(String(nextTimeLimitMinutes))
    setTimeLimitMessage(
      `制限時間を${nextTimeLimitMinutes}分にしました。／時間限制已設定為${nextTimeLimitMinutes}分鐘。`,
    )
  }

  const handleSubmitAnswer = () => {
    if (!activeQuestion || selectedIndex === null) {
      return
    }

    if (answeredRecord) {
      setFeedback(answeredRecord)
      setScreenMode('answer-result')
      return
    }

    if (isTimeExpired && !isActiveDemoQuestion) {
      window.alert(
        '制限時間が終了しました。新しい問題には回答できません。／時間已到，不能回答新的題目。',
      )
      return
    }

    const selectedChoice = activeQuestion.choices[selectedIndex]
    const isConfirmed = window.confirm(
      `「${selectedChoice}」で回答します。送信後は変更できません。よろしいですか？\n要送出「${selectedChoice}」嗎？送出後不能修改。`,
    )

    if (!isConfirmed) {
      return
    }

    const isCorrect = selectedIndex === activeQuestion.answerIndex
    const pointsEarned = isCorrect ? activeQuestion.points : 0
    const record: AnswerRecord = {
      questionId: activeQuestion.id,
      selectedIndex,
      correctIndex: activeQuestion.answerIndex,
      isCorrect,
      pointsEarned,
      answeredAt: new Date().toISOString(),
      question: activeQuestion.question,
      choice: selectedChoice,
      correctChoice: activeQuestion.choices[activeQuestion.answerIndex],
      explanation: activeQuestion.explanation,
      translationExplanation: activeQuestion.translationExplanation,
    }

    const latestState = loadRallyState(questionSetSignature, activeStorageKey)
    const latestAnsweredRecord = latestState.answerHistory.find(
      (record) => record.questionId === activeQuestion.id,
    )

    if (latestAnsweredRecord) {
      setRallyState(latestState)
      setTeamNameInput(latestState.teamName)
      setStorageWarning('')
      setFeedback(latestAnsweredRecord)
      setScreenMode('answer-result')
      return
    }

    const baseState = mergeRallyStates(latestState, rallyState)
    const answerBaseState =
      isActiveDemoQuestion && !baseState.teamName.trim()
        ? { ...baseState, teamName: DEMO_TEAM_NAME }
        : baseState
    const alreadyMergedRecord = answerBaseState.answerHistory.find(
      (record) => record.questionId === activeQuestion.id,
    )

    if (alreadyMergedRecord) {
      persistState(answerBaseState)
      setFeedback(alreadyMergedRecord)
      setScreenMode('answer-result')
      return
    }

    const nextHistory = [...answerBaseState.answerHistory, record]
    const nextState = rebuildRallyState(answerBaseState, nextHistory)

    persistState(nextState)
    setFeedback(record)
    setScreenMode('answer-result')
  }

  const handleUseTranslationKey = () => {
    if (!activeQuestion?.translationText) {
      return
    }

    const latestState = loadRallyState(questionSetSignature, activeStorageKey)
    const baseState = mergeRallyStates(latestState, rallyState)

    if (baseState.translationKeysUsedQuestionIds.includes(activeQuestion.id)) {
      persistState(baseState)
      setTranslationNotice('')
      return
    }

    if (baseState.translationKeysRemaining <= 0) {
      setRallyState(baseState)
      setTranslationNotice(NO_TRANSLATION_KEYS_MESSAGE)
      return
    }

    const isConfirmed = window.confirm(
      '翻訳の鍵を1つ使って、この問題の翻訳を表示します。よろしいですか？\n要使用1把翻譯鑰匙，顯示這題的翻譯嗎？',
    )

    if (!isConfirmed) {
      return
    }

    const nextState = rebuildRallyState(
      baseState,
      baseState.answerHistory,
      [...baseState.translationKeysUsedQuestionIds, activeQuestion.id],
      baseState.claimedTreasureIds,
    )

    persistState(nextState)
    setTranslationNotice('')
  }

  const handleReset = () => {
    const firstConfirmed = window.confirm(
      '先生用リセットです。班名、点数、回答履歴をすべて消しますか？\n這是老師用重置。要刪除隊名、分數和作答紀錄嗎？',
    )

    if (!firstConfirmed) {
      return
    }

    const secondConfirmed = window.confirm(
      '本当にリセットします。この操作は元に戻せません。\n確定要重置嗎？此操作無法復原。',
    )

    if (!secondConfirmed) {
      return
    }

    const wasCleared = clearRallyState(activeStorageKey)
    const emptyState = createEmptyRallyState(questionSetSignature)
    setRallyState(emptyState)
    setTeamNameInput('')
    setStorageWarning(wasCleared ? '' : STORAGE_ERROR_MESSAGE)
    setScreenMode('home')
    setQuestionId(null)
    setIsDemoAccess(false)
    setTreasureId(null)
    setProcessedTreasureId(null)
    setTreasureStatus(null)
    setSelectedIndex(null)
    setFeedback(null)
    setTranslationNotice('')
    removeRallyParamsFromUrl()
  }

  return (
    <main className="app-shell">
      {storageWarning && (
        <p className="storage-warning" role="alert">
          {storageWarning}
        </p>
      )}

      {screen === 'launch-wait' && (
        <section className="launch-wait-screen" aria-labelledby="launch-wait-title">
          <div className="launch-wait-card">
            <RallyLogo className="launch-logo" />
            <div className="launch-wait-icons" aria-hidden="true">
              <img src={getAssetUrl('assets/noto-emoji/sparkles.svg')} alt="" />
              <img src={getAssetUrl('assets/noto-emoji/cherry-blossom.svg')} alt="" />
              <img src={getAssetUrl('assets/noto-emoji/school.svg')} alt="" />
            </div>
            <p className="eyebrow">{EVENT_NAME}</p>
            <h1 id="launch-wait-title">
              <BilingualText
                ja="台湾交流会クイズラリーは6時間目です。楽しみにね！"
                zh="臺灣交流會問答闖關在第6節課。敬請期待！"
              />
            </h1>
            <p className="lead">
              <BilingualText
                ja={`${RALLY_UNLOCK_LABEL}からQRを開けるようになります。`}
                zh="QR將於2026年5月19日14:00開放。"
              />
            </p>
            <p className="launch-countdown">
              <BilingualText
                ja={`開始まで ${formatRemainingTime(RALLY_UNLOCK_AT_MS - nowMs)}`}
                zh={`距離開始還有 ${formatRemainingTime(RALLY_UNLOCK_AT_MS - nowMs)}`}
              />
            </p>
          </div>
        </section>
      )}

      {screen === 'start' && (
        <section className="start-screen" aria-labelledby="start-title">
          <div className="hero-copy">
            <RallyLogo className="start-logo" />
            <p className="eyebrow">{EVENT_SUBTITLE}</p>
            <h1 id="start-title">{EVENT_NAME}</h1>
            <p className="lead">
              <BilingualText
                ja="班名を入力して、校内のQRポイントを回りながらクイズに挑戦します。"
                zh="請輸入隊名，掃描校園裡的QR點，挑戰問答闖關。"
              />
            </p>
            <div className="hero-assets" aria-hidden="true">
              <img
                src={getAssetUrl('assets/noto-emoji/cherry-blossom.svg')}
                alt=""
              />
              <img src={getAssetUrl('assets/noto-emoji/school.svg')} alt="" />
              <img
                src={getAssetUrl('assets/noto-emoji/sparkles.svg')}
                alt=""
              />
            </div>
          </div>
          <form className="start-form" onSubmit={handleStart}>
            <label htmlFor="team-name">
              <BilingualText ja="班名" zh="隊名" />
            </label>
            <input
              id="team-name"
              type="text"
              value={teamNameInput}
              onChange={(event) => setTeamNameInput(event.target.value)}
              placeholder="例: 3班 / 例如: 第3隊"
              autoComplete="off"
            />
            {teamNameError && <p className="form-error">{teamNameError}</p>}
            <button type="submit" className="primary-button">
              <BilingualText ja="Start" zh="開始" />
            </button>
          </form>

          <section className="time-settings">
            <button
              type="button"
              className="secondary-button time-settings-toggle"
              onClick={() => {
                setIsTimeSettingsOpen((currentValue) => !currentValue)
                setTimeLimitMessage('')
              }}
            >
              <BilingualText
                ja={`時間設定（現在: ${
                  rallyState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES
                }分）`}
                zh={`時間設定（目前: ${
                  rallyState.timeLimitMinutes || RALLY_TIME_LIMIT_MINUTES
                }分鐘）`}
              />
            </button>

            {isTimeSettingsOpen && (
              <div className="time-settings-panel">
                <div>
                  <h2>
                    <BilingualText ja="制限時間設定" zh="時間限制設定" />
                  </h2>
                  <p>
                    <BilingualText
                      ja="授業時間に合わせて、Start前にこの端末の制限時間を変更できます。"
                      zh="可以依照課程時間，在開始前調整這台裝置的時間限制。"
                    />
                  </p>
                </div>
                <label htmlFor="time-limit-minutes">
                  <BilingualText ja="制限時間（分）" zh="時間限制（分鐘）" />
                </label>
                <input
                  id="time-limit-minutes"
                  type="number"
                  min="5"
                  max="120"
                  step="1"
                  value={timeLimitInput}
                  onChange={(event) => {
                    setTimeLimitInput(event.target.value)
                    setTimeLimitMessage('')
                  }}
                />
                <div className="quick-time-buttons" aria-label="時間候補">
                  {[15, 20, 30, 40].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setTimeLimitInput(String(minutes))
                        setTimeLimitMessage('')
                      }}
                    >
                      <BilingualText
                        ja={`${minutes}分`}
                        zh={`${minutes}分鐘`}
                      />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSaveTimeLimit}
                >
                  <BilingualText ja="時間を保存" zh="儲存時間" />
                </button>
                {timeLimitMessage && (
                  <p className="time-settings-message">{timeLimitMessage}</p>
                )}
              </div>
            )}
          </section>
        </section>
      )}

      {screen === 'home' && (
        <section className="home-screen" aria-labelledby="home-title">
          <div className="top-bar home-hero">
            <div>
              <p className="eyebrow">{EVENT_SUBTITLE}</p>
              <h1 id="home-title">{EVENT_NAME}</h1>
              <p className="team-name-label">{rallyState.teamName}</p>
            </div>
            <RallyLogo compact className="home-logo" />
            <div className="home-assets" aria-hidden="true">
              <img
                src={getAssetUrl('assets/noto-emoji/cherry-blossom.svg')}
                alt=""
              />
              <img src={getAssetUrl('assets/noto-emoji/school.svg')} alt="" />
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setScreenMode('result')}
            >
              <BilingualText ja="Result" zh="結果" />
            </button>
          </div>

          <div className="score-band" aria-label="現在の成績">
            <div>
              <span>
                <BilingualText ja="合計点" zh="總分" />
              </span>
              <strong>{rallyState.totalScore}</strong>
            </div>
            <div>
              <span>
                <BilingualText ja="回答済み" zh="已作答" />
              </span>
              <strong>
                {rallyState.answeredQuestionIds.length}/{questions.length}
              </strong>
            </div>
            <div>
              <span>
                <BilingualText ja="翻訳の鍵" zh="翻譯鑰匙" />
              </span>
              <strong>
                <BilingualText
                  ja={`残り: ${rallyState.translationKeysRemaining}`}
                  zh={`剩下: ${rallyState.translationKeysRemaining}`}
                />
              </strong>
            </div>
          </div>

          <section
            className={isTimeWarning || isTimeExpired ? 'timer-panel urgent' : 'timer-panel'}
            aria-live="polite"
          >
            <div>
              <p className="eyebrow">
                <BilingualText ja="制限時間" zh="時間限制" />
              </p>
              <strong>{formatRemainingTime(remainingMs)}</strong>
            </div>
            <p>
              {isTimeExpired ? (
                <BilingualText
                  ja="時間終了です。新しい問題には回答できません。"
                  zh="時間已到，不能回答新的題目。"
                />
              ) : isTimeWarning ? (
                <BilingualText
                  ja="残り5分を切りました。急いで集合場所へ戻りましょう。"
                  zh="剩下不到5分鐘。請盡快回到集合地點。"
                />
              ) : (
                <BilingualText
                  ja="タイマーはStart時に始まります。"
                  zh="計時器會從開始時啟動。"
                />
              )}
            </p>
          </section>

          <section className="info-grid" aria-label="ラリー案内">
            <article>
              <span className="card-icon" aria-hidden="true">
                QR
              </span>
              <h2>
                <BilingualText ja="QR案内" zh="QR說明" />
              </h2>
              <p>
                <BilingualText
                  ja="iPadの標準カメラでQRコードを読み取り、Safariで開いてください。コントロールセンターのQRリーダーは使いません。"
                  zh="請用iPad內建相機掃描QR碼，並用Safari開啟。不要使用控制中心的QR掃描器。"
                />
              </p>
            </article>
            <article className="safety-card">
              <span className="card-icon image-icon" aria-hidden="true">
                <img
                  src={getAssetUrl('assets/noto-emoji/sparkles.svg')}
                  alt=""
                />
              </span>
              <h2>
                <BilingualText ja="安全注意" zh="安全提醒" />
              </h2>
              <p>
                <BilingualText
                  ja="廊下では走らず、周りを見ながら移動してください。QRポイントの前では立ち止まり、通行のじゃまにならない場所で操作します。"
                  zh="走廊上不要奔跑，移動時請注意周圍。在QR點前請停下來，站在不妨礙通行的地方操作。"
                />
              </p>
            </article>
          </section>
        </section>
      )}

      {screen === 'question' && (
        <section className="question-screen" aria-labelledby="question-title">
          <div className="top-bar">
            <div>
              <p className="eyebrow">{rallyState.teamName}</p>
              <h1 id="question-title">
                <BilingualText ja="Question" zh="題目" />
              </h1>
            </div>
            <RallyLogo compact className="top-logo" />
            {canUseDemoNavigation && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setScreenMode('result')}
              >
                <BilingualText ja="Result" zh="結果" />
              </button>
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={handleGoHome}
            >
              <BilingualText ja="Home" zh="首頁" />
            </button>
          </div>

          {!activeQuestion && (
            <section className="notice-panel">
              <h2>
                <BilingualText ja="問題が見つかりません" zh="找不到題目" />
              </h2>
              <p>
                <BilingualText
                  ja={`URLの問題ID「${getQuestionDisplayCode(questionId)}」に対応する問題データがありません。`}
                  zh={`沒有找到URL題目ID「${getQuestionDisplayCode(questionId)}」的題目資料。`}
                />
              </p>
            </section>
          )}

          {activeQuestion && isQuestionBlocked && (
            <section className="notice-panel time-up-panel">
              <h2>
                <BilingualText ja="時間終了" zh="時間已到" />
              </h2>
              <p>
                <BilingualText
                  ja="制限時間が終了したため、新しい問題には回答できません。Homeに戻ってResultを確認してください。"
                  zh="因為時間已到，不能回答新的題目。請回到首頁查看結果。"
                />
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={handleGoHome}
              >
                <BilingualText ja="Homeへ戻る" zh="回首頁" />
              </button>
            </section>
          )}

          {activeQuestion && !isQuestionBlocked && (
            <>
              <section className="question-meta" aria-label="問題情報">
                <span>{activeQuestion.id}</span>
                <span>{activeQuestion.side}</span>
                <span>{activeQuestion.language}</span>
                <span>{activeQuestion.difficulty}</span>
                <span>{activeQuestion.points}点</span>
              </section>

              <section className="question-panel">
                <p className="question-text">{activeQuestion.question}</p>
                <div className="choices" role="radiogroup" aria-label="選択肢">
                  {activeQuestion.choices.map((choice, index) => (
                    <label
                      className={
                        selectedIndex === index ? 'choice selected' : 'choice'
                      }
                      key={`${activeQuestion.id}-${index}`}
                    >
                      <input
                        type="radio"
                        name="choice"
                        value={index}
                        checked={selectedIndex === index}
                        disabled={Boolean(answeredRecord)}
                        onChange={() => setSelectedIndex(index)}
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={selectedIndex === null || Boolean(answeredRecord)}
                  onClick={handleSubmitAnswer}
                >
                  <BilingualText ja="回答する" zh="送出答案" />
                </button>
              </section>

              {hasQuestionTranslation && (
                <section className="translation-panel">
                  <p className="translation-guidance">
                    <BilingualText
                      ja="まずはチームの友だちに聞いてみましょう。どうしても分からないときに使えます。"
                      zh="請先問問隊友。真的不懂時，可以使用翻譯鑰匙。"
                    />
                  </p>
                  {!hasUsedTranslationKey && (
                    <>
                      <button
                        type="button"
                        className="translation-button"
                        disabled={rallyState.translationKeysRemaining <= 0}
                        onClick={handleUseTranslationKey}
                      >
                        <BilingualText
                          ja={`🔑 翻訳の鍵を使う（残り: ${rallyState.translationKeysRemaining}）`}
                          zh={`🔑 使用翻譯鑰匙（剩下: ${rallyState.translationKeysRemaining}）`}
                        />
                      </button>
                      {rallyState.translationKeysRemaining <= 0 && (
                        <p className="translation-notice">
                          {NO_TRANSLATION_KEYS_MESSAGE}
                        </p>
                      )}
                    </>
                  )}
                  {translationNotice && (
                    <p className="translation-notice">{translationNotice}</p>
                  )}
                  {shouldShowTranslation && (
                    <div className="translation-text">
                      <h2>
                        <BilingualText
                          ja="翻訳 / Translation"
                          zh="翻譯 / Translation"
                        />
                      </h2>
                      <TranslationText text={activeTranslationText} />
                    </div>
                  )}
                </section>
              )}

              {answeredRecord && !feedback && (
                <p className="answered-note">
                  <BilingualText
                    ja="この問題は回答済みです。再回答はできません。"
                    zh="這題已經作答，不能再次作答。"
                  />
                </p>
              )}
            </>
          )}
        </section>
      )}

      {screen === 'answer-result' && feedback && (
        <section
          className={
            feedback.isCorrect
              ? 'answer-result-screen correct'
              : 'answer-result-screen incorrect'
          }
          aria-labelledby="answer-result-title"
        >
          <div className="answer-result-card">
            <RallyLogo compact className="answer-logo" />
            <div className="result-burst" aria-hidden="true">
              {feedback.isCorrect ? '✓' : '!'}
            </div>
            <p className="eyebrow">
              <BilingualText ja={feedback.questionId} zh="作答結果" />
            </p>
            <h1 id="answer-result-title">
              {feedback.isCorrect ? (
                <BilingualText ja="正解！" zh="答對了！" />
              ) : (
                <BilingualText ja="不正解" zh="答錯了" />
              )}
            </h1>
            <p className="answer-points">
              <BilingualText
                ja={`獲得点: ${feedback.pointsEarned}点`}
                zh={`獲得分數: ${feedback.pointsEarned}分`}
              />
            </p>
            <div className="answer-explanation">
              <p>
                <BilingualText
                  ja={`正解: ${feedback.correctChoice}`}
                  zh={`正確答案: ${feedback.correctChoice}`}
                />
              </p>
              <p>{feedback.explanation}</p>
              {feedback.translationExplanation && (
                <div className="translated-explanation">
                  <p className="translated-explanation-label">
                    <BilingualText ja="解説の翻訳" zh="解說翻譯" />
                  </p>
                  <p>{feedback.translationExplanation}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={handleCloseAnswerResult}
            >
              <BilingualText ja="了解してHomeへ" zh="OK，回首頁" />
            </button>
          </div>
        </section>
      )}

      {screen === 'treasure' && (
        <section className="treasure-screen" aria-labelledby="treasure-title">
          <div className="top-bar">
            <div>
              <p className="eyebrow">{rallyState.teamName}</p>
              <h1 id="treasure-title">
                <BilingualText ja="Treasure QR" zh="寶箱QR" />
              </h1>
            </div>
            <RallyLogo compact className="top-logo" />
            <button
              type="button"
              className="secondary-button"
              onClick={handleGoHome}
            >
              <BilingualText ja="Home" zh="首頁" />
            </button>
          </div>

          <section className="treasure-panel">
            <img
              className="treasure-sparkle"
              src={getAssetUrl('assets/noto-emoji/sparkles.svg')}
              alt=""
              aria-hidden="true"
            />
            <div className="treasure-visual" aria-hidden="true">
              <img
                src={getAssetUrl('assets/treasure-chest.png')}
                alt=""
              />
            </div>
            <img
              className="treasure-key"
              src={getAssetUrl('assets/noto-emoji/key.svg')}
              alt=""
              aria-hidden="true"
            />
            <p className="treasure-code">{getTreasureDisplayCode(treasureId)}</p>
            {currentTreasureStatus === 'claimed' && (
              <h2>
                <BilingualText
                  ja="宝箱を見つけました！翻訳の鍵を1つ手に入れました"
                  zh="找到寶箱了！獲得1把翻譯鑰匙"
                />
              </h2>
            )}
            {currentTreasureStatus === 'already-claimed' && (
              <h2>
                <BilingualText
                  ja="この宝箱はすでに開けています"
                  zh="這個寶箱已經打開過了"
                />
              </h2>
            )}
            {currentTreasureStatus === 'invalid' && (
              <h2>
                <BilingualText ja="宝箱が見つかりません" zh="找不到寶箱" />
              </h2>
            )}
            {currentTreasureStatus === 'pending' && (
              <h2>
                <BilingualText ja="宝箱を確認しています" zh="正在確認寶箱" />
              </h2>
            )}
            <p>
              <BilingualText
                ja={`現在の翻訳の鍵の残り本数: ${rallyState.translationKeysRemaining}`}
                zh={`目前翻譯鑰匙剩下: ${rallyState.translationKeysRemaining}`}
              />
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={handleGoHome}
            >
              <BilingualText ja="Homeへ戻る" zh="回首頁" />
            </button>
          </section>
        </section>
      )}

      {screen === 'result' && (
        <section className="result-screen" aria-labelledby="result-title">
          <div className="top-bar">
            <div>
              <p className="eyebrow">{rallyState.teamName}</p>
              <h1 id="result-title">
                <BilingualText ja="Result" zh="結果" />
              </h1>
            </div>
            <RallyLogo compact className="top-logo" />
            <button
              type="button"
              className="secondary-button"
              onClick={handleGoHome}
            >
              <BilingualText ja="Home" zh="首頁" />
            </button>
          </div>

          <section className="result-capture-card" aria-label="集計用結果">
            <p className="eyebrow">
              <BilingualText
                ja="Final Result"
                zh="最終結果 / 截圖給老師"
              />
            </p>
            <h2>{rallyState.teamName}</h2>
            <div className="final-score">
              <span>
                <BilingualText ja="合計点" zh="總分" />
              </span>
              <strong>{rallyState.totalScore}</strong>
              <small>points / 分</small>
            </div>
            <div className="final-small-stats">
              <span>
                <BilingualText
                  ja={`解いた問題数 ${rallyState.answeredQuestionIds.length}/${questions.length}`}
                  zh={`已完成題數 ${rallyState.answeredQuestionIds.length}/${questions.length}`}
                />
              </span>
              <span>
                <BilingualText
                  ja={`正解数 ${correctCount}`}
                  zh={`答對數 ${correctCount}`}
                />
              </span>
            </div>
          </section>

          <section className="key-section" aria-labelledby="key-title">
            <h2 id="key-title">
              <BilingualText ja="翻訳の鍵" zh="翻譯鑰匙" />
            </h2>
            <p>
              <BilingualText
                ja={`残り: ${rallyState.translationKeysRemaining}`}
                zh={`剩下: ${rallyState.translationKeysRemaining}`}
              />
            </p>
            <p>
              <BilingualText
                ja={`使用した問題ID: ${
                  rallyState.translationKeysUsedQuestionIds.length > 0
                    ? rallyState.translationKeysUsedQuestionIds.join(', ')
                    : 'なし'
                }`}
                zh={`使用過的題目ID: ${
                  rallyState.translationKeysUsedQuestionIds.length > 0
                    ? rallyState.translationKeysUsedQuestionIds.join(', ')
                    : '無'
                }`}
              />
            </p>
          </section>

          <section className="history-section" aria-labelledby="history-title">
            <h2 id="history-title">
              <BilingualText ja="回答履歴" zh="作答紀錄" />
            </h2>
            {rallyState.answerHistory.length === 0 ? (
              <p className="empty-history">
                <BilingualText ja="まだ回答がありません。" zh="還沒有作答紀錄。" />
              </p>
            ) : (
              <ol className="history-list">
                {rallyState.answerHistory.map((record) => (
                  <li key={`${record.questionId}-${record.answeredAt}`}>
                    <div>
                      <strong>{record.questionId}</strong>
                      <span>{formatAnsweredAt(record.answeredAt)}</span>
                    </div>
                    <p>{record.question}</p>
                    <p>
                      <BilingualText
                        ja={`回答: ${record.choice} / ${
                          record.isCorrect ? '正解' : '不正解'
                        } / ${record.pointsEarned}点`}
                        zh={`答案: ${record.choice} / ${
                          record.isCorrect ? '答對' : '答錯'
                        } / ${record.pointsEarned}分`}
                      />
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <button
            type="button"
            className="danger-button"
            onClick={handleReset}
          >
            <BilingualText ja="先生用リセット" zh="老師用重置" />
          </button>
        </section>
      )}
    </main>
  )
}

export default App
