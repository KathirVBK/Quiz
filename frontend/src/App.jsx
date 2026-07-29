import { useState, useRef } from 'react'
import './index.css'

function parseQuizText(text) {
  if (!text) return []

  // Split text by questions (e.g. "Question 1:", "1.", "Question 2:")
  const blocks = text.split(/(?=(?:Question\s+\d+|\d+[\.\)]\s+))/i).filter(b => b.trim().length > 0)
  const questions = []

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    let qText = ''
    const options = []

    for (const line of lines) {
      // Matches lines starting with A), A., (A), a), etc.
      const match = line.match(/^[\(\[]?([A-D])[\)\.]?\s+(.*)/i)
      if (match) {
        options.push({
          key: match[1].toUpperCase(),
          text: match[2]
        })
      } else {
        if (options.length === 0) {
          qText += (qText ? ' ' : '') + line
        }
      }
    }

    if (qText && options.length > 0) {
      questions.push({
        questionText: qText,
        options: options
      })
    }
  }

  return questions
}

// Parses the AI evaluation text into structured per-question objects
function parseEvaluation(text) {
  if (!text) return { items: [], score: '' }

  const items = []
  // Split on "Question N:" boundaries
  const blocks = text.split(/(?=Question\s+\d+[:\.])/i).filter(b => b.trim())

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l)

    const q = { question: '', userAnswer: '', result: '', correctAnswer: '', reason: '' }
    let reasonLines = []
    let inReason = false

    for (const line of lines) {
      if (/^Question\s+\d+[:\.]/i.test(line)) {
        q.question = line.replace(/^Question\s+\d+[:\.]/i, '').trim()
      } else if (/^User Answer[:\.]/i.test(line)) {
        q.userAnswer = line.replace(/^User Answer[:\.]/i, '').trim()
        inReason = false
      } else if (/^Result[:\.]/i.test(line)) {
        q.result = line.replace(/^Result[:\.]/i, '').trim()
        inReason = false
      } else if (/^Correct Answer[:\.]/i.test(line)) {
        q.correctAnswer = line.replace(/^Correct Answer[:\.]/i, '').trim()
        inReason = false
      } else if (/^Reason[:\.]/i.test(line)) {
        reasonLines = [line.replace(/^Reason[:\.]/i, '').trim()]
        inReason = true
      } else if (inReason) {
        reasonLines.push(line)
      }
    }

    q.reason = reasonLines.join(' ').trim()
    if (q.question || q.result) items.push(q)
  }

  // Extract score line
  const scoreMatch = text.match(/Score:\s*[\d]+\s*\/\s*[\d]+/i)
  const score = scoreMatch ? scoreMatch[0] : ''

  return { items, score }
}

function App() {
  const [inputType, setInputType] = useState('topic') // 'topic', 'text', 'pdf'
  const [topic, setTopic] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfText, setPdfText] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const [numQuestions, setNumQuestions] = useState(3)
  const [difficulty, setDifficulty] = useState('Medium')
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  const [session, setSession] = useState(null)
  const [questionsText, setQuestionsText] = useState('')
  const [parsedQuestions, setParsedQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [evaluation, setEvaluation] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const handlePdfUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      alert("Please select a valid PDF document (.pdf)")
      return
    }

    setUploadingPdf(true)
    setPdfFile(file)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://127.0.0.1:8000/upload_pdf', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        setPdfText(data.text)
      } else {
        alert("Error reading PDF: " + data.detail)
        setPdfFile(null)
        setPdfText('')
      }
    } catch (err) {
      alert("Failed to upload PDF. Ensure FastAPI backend is running.")
      setPdfFile(null)
      setPdfText('')
    }
    setUploadingPdf(false)
  }

  const handleGenerate = async () => {
    const payloadContent = inputType === 'pdf' ? pdfText : topic
    if (!payloadContent) return

    setLoading(true)
    setQuestionsText('')
    setParsedQuestions([])
    setEvaluation(null)

    const newSessionId = Math.random().toString(36).substring(2, 15)

    try {
      const res = await fetch('http://127.0.0.1:8000/generate_quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: newSessionId,
          topic: payloadContent,
          input_type: inputType,
          is_text: inputType !== 'topic',
          num_questions: Number(numQuestions),
          difficulty: difficulty
        })
      })
      const data = await res.json()
      if (res.ok) {
        const rawText = data.questions_text
        setQuestionsText(rawText)
        const parsed = parseQuizText(rawText)
        setParsedQuestions(parsed)
        // Initialize answers array
        const initialLen = parsed.length > 0 ? parsed.length : Number(numQuestions)
        setAnswers(new Array(initialLen).fill(''))
        setSession(newSessionId)
      } else {
        alert("Error: " + data.detail)
      }
    } catch (err) {
      alert("Failed to connect to backend. Is FastAPI running?")
    }
    setLoading(false)
  }

  const handleEvaluate = async () => {
    setEvaluating(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/evaluate_quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session,
          user_answers: answers
        })
      })
      const data = await res.json()
      if (res.ok) {
        setEvaluation(data.evaluation)
        setFeedback(data.feedback)
      } else {
        alert("Error: " + data.detail)
      }
    } catch (err) {
      alert("Failed to connect to backend.")
    }
    setEvaluating(false)
  }

  const selectOption = (qIndex, optionKey, optionText) => {
    const updated = [...answers]
    updated[qIndex] = `${optionKey}: ${optionText}`
    setAnswers(updated)
  }

  return (
    <div className="container">
      <h1>AI Quiz Agent</h1>
      <p className="subtitle">Learn and test your knowledge autonomously from topics, text, or PDF documents</p>

      {!questionsText && !evaluation && (
        <div className="input-section">
          <div className="toggle-group">
            <button
              className={`toggle-btn ${inputType === 'topic' ? 'active' : ''}`}
              onClick={() => setInputType('topic')}
            >
              Search Topic
            </button>
            <button
              className={`toggle-btn ${inputType === 'text' ? 'active' : ''}`}
              onClick={() => setInputType('text')}
            >
              Paste Text
            </button>
            <button
              className={`toggle-btn ${inputType === 'pdf' ? 'active' : ''}`}
              onClick={() => setInputType('pdf')}
            >
              Upload PDF
            </button>
          </div>

          <div className="settings-grid">
            <div className="setting-card">
              <span className="setting-label">Number of Questions</span>
              <select
                className="select-control"
                value={numQuestions}
                onChange={e => setNumQuestions(e.target.value)}
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={7}>7 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>

            <div className="setting-card">
              <span className="setting-label">Difficulty Level</span>
              <div className="pills-group">
                {['Easy', 'Medium', 'Hard'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`pill-btn ${difficulty === lvl ? 'active' : ''}`}
                    onClick={() => setDifficulty(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="input-group">
            {inputType === 'topic' && (
              <input
                type="text"
                placeholder="E.g., Quantum Computing, Roman Empire, Few-shot Prompting..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            )}

            {inputType === 'text' && (
              <textarea
                placeholder="Paste the content you want to learn about here..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            )}

            {inputType === 'pdf' && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePdfUpload(e.target.files[0])
                    }
                  }}
                />

                {!pdfFile ? (
                  <div
                    className={`pdf-dropzone ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragOver(false)
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handlePdfUpload(e.dataTransfer.files[0])
                      }
                    }}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  >
                    <div className="pdf-icon">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{color:'#6366f1'}}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                    </div>
                    {uploadingPdf ? (
                      <div><div className="loader" style={{ margin: '0 auto 0.5rem auto' }}></div>Extracting text from PDF...</div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600 }}>Click to browse or drop your PDF document here</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Supports any .pdf document containing educational content</div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="pdf-info-card">
                    <div className="pdf-file-header">
                      <div className="pdf-filename">
                        {pdfFile.name}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          ({Math.round(pdfFile.size / 1024)} KB, {pdfText.length} characters)
                        </span>
                      </div>
                      <button
                        className="change-pdf-btn"
                        onClick={() => {
                          setPdfFile(null)
                          setPdfText('')
                        }}
                      >
                        Remove PDF
                      </button>
                    </div>

                    <div className="search-badge">
                      <span>Search Enrichment Enabled</span>
                      <span style={{ fontWeight: 400, color: '#e2e8f0' }}>— AI will automatically web-search concepts with brief explanations</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              className="button"
              onClick={handleGenerate}
              disabled={loading || (inputType === 'pdf' ? !pdfText : !topic)}
            >
              {loading ? (
                <>
                  <div className="loader"></div>
                  {inputType === 'pdf' ? 'Analyzing PDF & Searching Web Concepts...' : `Generating ${numQuestions} (${difficulty}) Questions...`}
                </>
              ) : `Generate ${numQuestions} ${difficulty} Questions`}
            </button>
          </div>
        </div>
      )}

      {questionsText && !evaluation && (
        <div className="quiz-section">
          <h2>Your Quiz ({difficulty} Difficulty)</h2>

          {parsedQuestions.length > 0 ? (
            <div className="mcq-container">
              {parsedQuestions.map((q, qIndex) => (
                <div key={qIndex} className="mcq-card">
                  <div className="mcq-title">{q.questionText}</div>
                  <div className="mcq-options">
                    {q.options.map((opt) => {
                      const isSelected = answers[qIndex] && answers[qIndex].startsWith(opt.key)
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={`mcq-option-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => selectOption(qIndex, opt.key, opt.text)}
                        >
                          <span className="option-badge">{opt.key}</span>
                          <span className="option-text">{opt.text}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="question-block">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{questionsText}</pre>
            </div>
          )}

          <button
            className="button"
            onClick={handleEvaluate}
            disabled={evaluating || answers.length === 0 || answers.some(a => !a)}
          >
            {evaluating ? (
              <><div className="loader"></div> Evaluating Answers...</>
            ) : 'Submit Answers'}
          </button>
        </div>
      )}

      {evaluation && (
        <div className="result-section">
          <h2>Evaluation Complete</h2>

          <div className="result-card">
            <h3 className="result-card-title">Answer Review</h3>
            {(() => {
              const { items, score } = parseEvaluation(evaluation)
              if (items.length === 0) {
                return <div className="result-box"><pre>{evaluation}</pre></div>
              }
              return (
                <div className="eval-list">
                  {items.map((item, i) => {
                    const isCorrect = /correct/i.test(item.result) && !/incorrect/i.test(item.result)
                    return (
                      <div key={i} className={`eval-item ${isCorrect ? 'eval-correct' : 'eval-incorrect'}`}>
                        <div className="eval-question-header">
                          <span className="eval-q-number">Q{i + 1}</span>
                          <span className="eval-question-text">{item.question}</span>
                          <span className={`eval-badge ${isCorrect ? 'badge-correct' : 'badge-incorrect'}`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        <div className="eval-details">
                          <div className="eval-row">
                            <span className="eval-label">Your Answer</span>
                            <span className="eval-value">{item.userAnswer || '—'}</span>
                          </div>
                          <div className="eval-row">
                            <span className="eval-label">Correct Answer</span>
                            <span className="eval-value eval-correct-answer">{item.correctAnswer || '—'}</span>
                          </div>
                          <div className="eval-row eval-reason-row">
                            <span className="eval-label">Reason</span>
                            <span className="eval-value">{item.reason || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {score && (
                    <div className="eval-score-row">
                      <span className="eval-score-label">Final Score</span>
                      <span className="eval-score-value">{score.replace(/^Score:\s*/i, '')}</span>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {feedback && (
            <div className="result-card">
              <h3 className="result-card-title">Performance Feedback</h3>
              <div className="result-box feedback-box">
                <pre>{feedback}</pre>
              </div>
            </div>
          )}

          <button
            className="button"
            style={{ marginTop: '2rem' }}
            onClick={() => {
              setQuestionsText('')
              setParsedQuestions([])
              setEvaluation(null)
              setFeedback(null)
              setTopic('')
              setPdfFile(null)
              setPdfText('')
            }}
          >
            Start New Quiz
          </button>
        </div>
      )}

    </div>
  )
}

export default App
