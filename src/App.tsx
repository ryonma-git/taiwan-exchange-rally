import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import questionsRaw from './data/questions.json?raw'
import {
  INITIAL_TRANSLATION_KEYS,
  STORAGE_KEY,
  clearRallyState,
  createEmptyRallyState,
  loadRallyState,
  saveRallyState,
  type AnswerRecord,
  type RallyState,
} from './lib/storage'

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
}

type ScreenMode = 'home' | 'result'
type TreasureStatus = 'claimed' | 'already-claimed' | 'invalid'

const EVENT_NAME = 'Japan–Taiwan School Discovery Rally'
const EVENT_SUBTITLE = '台湾交流会 校内QRクイズラリー'
const STORAGE_ERROR_MESSAGE =
  'この端末では保存に失敗しました。先生に知らせてください。'
const NO_TRANSLATION_KEYS_MESSAGE = '翻訳の鍵はもう残っていません。'
const questions = JSON.parse(questionsRaw) as Question[]
const questionMap = new Map(questions.map((question) => [question.id, question]))
const questionSetSignature = createQuestionSetSignature(questionsRaw)
const allowedTreasureIds = ['T01', 'T02']

function createQuestionSetSignature(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `v1-${value.length}-${(hash >>> 0).toString(16)}`
}

function readQuestionIdFromUrl() {
  const value = new URLSearchParams(window.location.search).get('q')
  return value?.trim().toUpperCase() || null
}

function readTreasureIdFromUrl() {
  const value = new URLSearchParams(window.location.search).get('treasure')
  return value?.trim().toUpperCase() || null
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
  }
}

function mergeRallyStates(latestState: RallyState, currentState: RallyState) {
  return rebuildRallyState(
    {
      ...latestState,
      teamName: latestState.teamName || currentState.teamName,
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
    loadRallyState(questionSetSignature),
  )
  const [teamNameInput, setTeamNameInput] = useState(rallyState.teamName)
  const [teamNameError, setTeamNameError] = useState('')
  const [storageWarning, setStorageWarning] = useState('')
  const [screenMode, setScreenMode] = useState<ScreenMode>('home')
  const [questionId, setQuestionId] = useState<string | null>(() =>
    readQuestionIdFromUrl(),
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

  const activeQuestion = questionId ? questionMap.get(questionId) : undefined
  const activeTreasureId =
    treasureId && isAllowedTreasureId(treasureId) ? treasureId : undefined
  const currentTreasureStatus = !activeTreasureId
    ? 'invalid'
    : treasureStatus ??
      (rallyState.claimedTreasureIds.includes(activeTreasureId)
        ? 'already-claimed'
        : 'pending')
  const answeredRecord = useMemo(
    () =>
      activeQuestion
        ? rallyState.answerHistory.find(
            (record) => record.questionId === activeQuestion.id,
          )
        : undefined,
    [activeQuestion, rallyState.answerHistory],
  )
  const displayedRecord = feedback ?? answeredRecord
  const hasUsedTranslationKey = activeQuestion
    ? rallyState.translationKeysUsedQuestionIds.includes(activeQuestion.id)
    : false
  const hasQuestionTranslation = Boolean(
    activeQuestion?.translationText?.trim(),
  )
  const shouldShowTranslation = hasQuestionTranslation && hasUsedTranslationKey
  const hasTeamName = rallyState.teamName.trim().length > 0
  const screen = !hasTeamName
    ? 'start'
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
    const wasSaved = saveRallyState(nextState)
    setStorageWarning(wasSaved ? '' : STORAGE_ERROR_MESSAGE)
    return wasSaved
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setQuestionId(readQuestionIdFromUrl())
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
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) {
        return
      }

      const nextState = loadRallyState(questionSetSignature)
      setRallyState(nextState)
      setTeamNameInput(nextState.teamName)
      setStorageWarning('')

      const currentQuestionId = readQuestionIdFromUrl()
      const syncedRecord = nextState.answerHistory.find(
        (record) => record.questionId === currentQuestionId,
      )
      setFeedback(syncedRecord ?? null)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (!hasTeamName || !treasureId || processedTreasureId === treasureId) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      if (!isAllowedTreasureId(treasureId)) {
        setTreasureStatus('invalid')
        setProcessedTreasureId(treasureId)
        return
      }

      const latestState = loadRallyState(questionSetSignature)
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
  }, [hasTeamName, persistState, processedTreasureId, rallyState, treasureId])

  const handleStart = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextTeamName = teamNameInput.trim()

    if (!nextTeamName) {
      setTeamNameError('班名を入力してください。')
      return
    }

    const latestState = loadRallyState(questionSetSignature)
    const mergedState = mergeRallyStates(latestState, rallyState)
    const nextState = {
      ...mergedState,
      teamName: nextTeamName,
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

  const handleSubmitAnswer = () => {
    if (!activeQuestion || selectedIndex === null) {
      return
    }

    if (answeredRecord) {
      setFeedback(answeredRecord)
      return
    }

    const selectedChoice = activeQuestion.choices[selectedIndex]
    const isConfirmed = window.confirm(
      `「${selectedChoice}」で回答します。送信後は変更できません。よろしいですか？`,
    )

    if (!isConfirmed) {
      return
    }

    const latestState = loadRallyState(questionSetSignature)
    const latestAnsweredRecord = latestState.answerHistory.find(
      (record) => record.questionId === activeQuestion.id,
    )

    if (latestAnsweredRecord) {
      setRallyState(latestState)
      setTeamNameInput(latestState.teamName)
      setStorageWarning('')
      setFeedback(latestAnsweredRecord)
      return
    }

    const baseState = mergeRallyStates(latestState, rallyState)
    const alreadyMergedRecord = baseState.answerHistory.find(
      (record) => record.questionId === activeQuestion.id,
    )

    if (alreadyMergedRecord) {
      persistState(baseState)
      setFeedback(alreadyMergedRecord)
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
    }
    const nextHistory = [...baseState.answerHistory, record]
    const nextState = rebuildRallyState(baseState, nextHistory)

    persistState(nextState)
    setFeedback(record)
  }

  const handleUseTranslationKey = () => {
    if (!activeQuestion?.translationText) {
      return
    }

    const latestState = loadRallyState(questionSetSignature)
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
      '翻訳の鍵を1つ使って、この問題の翻訳を表示します。よろしいですか？',
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
      '先生用リセットです。班名、点数、回答履歴をすべて消しますか？',
    )

    if (!firstConfirmed) {
      return
    }

    const secondConfirmed = window.confirm(
      '本当にリセットします。この操作は元に戻せません。',
    )

    if (!secondConfirmed) {
      return
    }

    const wasCleared = clearRallyState()
    const emptyState = createEmptyRallyState(questionSetSignature)
    setRallyState(emptyState)
    setTeamNameInput('')
    setStorageWarning(wasCleared ? '' : STORAGE_ERROR_MESSAGE)
    setScreenMode('home')
    setQuestionId(null)
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

      {screen === 'start' && (
        <section className="start-screen" aria-labelledby="start-title">
          <div className="hero-copy">
            <p className="eyebrow">{EVENT_SUBTITLE}</p>
            <h1 id="start-title">{EVENT_NAME}</h1>
            <p className="lead">
              班名を入力して、校内のQRポイントを回りながらクイズに挑戦します。
            </p>
          </div>
          <form className="start-form" onSubmit={handleStart}>
            <label htmlFor="team-name">班名</label>
            <input
              id="team-name"
              type="text"
              value={teamNameInput}
              onChange={(event) => setTeamNameInput(event.target.value)}
              placeholder="例: 3班"
              autoComplete="off"
            />
            {teamNameError && <p className="form-error">{teamNameError}</p>}
            <button type="submit" className="primary-button">
              Start
            </button>
          </form>
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
            <button
              type="button"
              className="secondary-button"
              onClick={() => setScreenMode('result')}
            >
              Result
            </button>
          </div>

          <div className="score-band" aria-label="現在の成績">
            <div>
              <span>合計点</span>
              <strong>{rallyState.totalScore}</strong>
            </div>
            <div>
              <span>回答済み</span>
              <strong>
                {rallyState.answeredQuestionIds.length}/{questions.length}
              </strong>
            </div>
            <div>
              <span>翻訳の鍵</span>
              <strong>残り: {rallyState.translationKeysRemaining}</strong>
            </div>
          </div>

          <section className="info-grid" aria-label="ラリー案内">
            <article>
              <span className="card-icon" aria-hidden="true">
                QR
              </span>
              <h2>QR案内</h2>
              <p>
                iPadの標準カメラでQRコードを読み取り、Safariで開いてください。
                画面に表示された問題を選んで回答します。
              </p>
            </article>
            <article className="safety-card">
              <span className="card-icon" aria-hidden="true">
                !
              </span>
              <h2>安全注意</h2>
              <p>
                廊下では走らず、周りを見ながら移動してください。
                QRポイントの前では立ち止まり、通行のじゃまにならない場所で操作します。
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
              <h1 id="question-title">Question</h1>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={handleGoHome}
            >
              Home
            </button>
          </div>

          {!activeQuestion && (
            <section className="notice-panel">
              <h2>問題が見つかりません</h2>
              <p>
                URLの問題ID「{questionId}」に対応する問題データがありません。
              </p>
            </section>
          )}

          {activeQuestion && (
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
                  回答する
                </button>
              </section>

              {hasQuestionTranslation && (
                <section className="translation-panel">
                  <p className="translation-guidance">
                    まずはチームの友だちに聞いてみましょう。どうしても分からないときに使えます。
                  </p>
                  {!hasUsedTranslationKey && (
                    <>
                      <button
                        type="button"
                        className="translation-button"
                        disabled={rallyState.translationKeysRemaining <= 0}
                        onClick={handleUseTranslationKey}
                      >
                        🔑 翻訳の鍵を使う（残り:{' '}
                        {rallyState.translationKeysRemaining}）
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
                      <h2>翻訳 / Translation</h2>
                      <p>{activeQuestion.translationText}</p>
                    </div>
                  )}
                </section>
              )}

              {answeredRecord && !feedback && (
                <p className="answered-note">
                  この問題は回答済みです。再回答はできません。
                </p>
              )}

              {displayedRecord && (
                <section
                  className={
                    displayedRecord.isCorrect
                      ? 'feedback correct'
                      : 'feedback incorrect'
                  }
                  aria-live="polite"
                >
                  <p className="feedback-result">
                    {displayedRecord.isCorrect ? '正解' : '不正解'}
                  </p>
                  <p className="feedback-points">
                    獲得点: {displayedRecord.pointsEarned}点
                  </p>
                  <p>
                    正解: <strong>{displayedRecord.correctChoice}</strong>
                  </p>
                  <p>{displayedRecord.explanation}</p>
                </section>
              )}
            </>
          )}
        </section>
      )}

      {screen === 'treasure' && (
        <section className="treasure-screen" aria-labelledby="treasure-title">
          <div className="top-bar">
            <div>
              <p className="eyebrow">{rallyState.teamName}</p>
              <h1 id="treasure-title">Treasure QR</h1>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={handleGoHome}
            >
              Home
            </button>
          </div>

          <section className="treasure-panel">
            <p className="treasure-code">{treasureId ?? 'Unknown'}</p>
            {currentTreasureStatus === 'claimed' && (
              <h2>宝箱を見つけました！翻訳の鍵を1つ手に入れました</h2>
            )}
            {currentTreasureStatus === 'already-claimed' && (
              <h2>この宝箱はすでに開けています</h2>
            )}
            {currentTreasureStatus === 'invalid' && (
              <h2>宝箱が見つかりません</h2>
            )}
            {currentTreasureStatus === 'pending' && (
              <h2>宝箱を確認しています</h2>
            )}
            <p>
              現在の翻訳の鍵の残り本数:{' '}
              <strong>{rallyState.translationKeysRemaining}</strong>
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={handleGoHome}
            >
              Homeへ戻る
            </button>
          </section>
        </section>
      )}

      {screen === 'result' && (
        <section className="result-screen" aria-labelledby="result-title">
          <div className="top-bar">
            <div>
              <p className="eyebrow">{rallyState.teamName}</p>
              <h1 id="result-title">Result</h1>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={handleGoHome}
            >
              Home
            </button>
          </div>

          <section className="result-summary" aria-label="結果サマリー">
            <div className="total-score">
              <span>合計点</span>
              <strong>{rallyState.totalScore}</strong>
            </div>
            <div>
              <span>正解数</span>
              <strong>{correctCount}</strong>
            </div>
            <div>
              <span>回答済み問題数</span>
              <strong>{rallyState.answeredQuestionIds.length}</strong>
            </div>
            <div>
              <span>翻訳の鍵 残り</span>
              <strong>{rallyState.translationKeysRemaining}</strong>
            </div>
          </section>

          <section className="key-section" aria-labelledby="key-title">
            <h2 id="key-title">翻訳の鍵</h2>
            <p>残り: {rallyState.translationKeysRemaining}</p>
            <p>
              使用した問題ID:{' '}
              {rallyState.translationKeysUsedQuestionIds.length > 0
                ? rallyState.translationKeysUsedQuestionIds.join(', ')
                : 'なし'}
            </p>
          </section>

          <section className="history-section" aria-labelledby="history-title">
            <h2 id="history-title">回答履歴</h2>
            {rallyState.answerHistory.length === 0 ? (
              <p className="empty-history">まだ回答がありません。</p>
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
                      回答: {record.choice} /{' '}
                      {record.isCorrect ? '正解' : '不正解'} /{' '}
                      {record.pointsEarned}点
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
            先生用リセット
          </button>
        </section>
      )}
    </main>
  )
}

export default App
