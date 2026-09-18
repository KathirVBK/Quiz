import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, FileText, Upload, Sparkles } from 'lucide-react'

function parseQuizText(text) {
  if (!text) return []

  const blocks = text.split(/(?=(?:Question\s+\d+|\d+[\.\)]\s+))/i).filter(b => b.trim().length > 0)
  const questions = []

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    let qText = ''
    const options = []

    for (const line of lines) {
      const match = line.match(/^[\(\[]?([A-D])[\)\.]?\s+(.*)/i)
      if (match) {
        options.push({ key: match[1].toUpperCase(), text: match[2] })
      } else {
        if (options.length === 0) {
          qText += (qText ? ' ' : '') + line
        }
      }
    }

    if (qText && options.length > 0) {
      questions.push({ questionText: qText, options: options })
    }
  }

  return questions
}

function parseEvaluation(text) {
  if (!text) return { items: [], score: '' }

  const items = []
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

  const scoreMatch = text.match(/Score:\s*[\d]+\s*\/\s*[\d]+/i)
  const score = scoreMatch ? scoreMatch[0] : ''

  return { items, score }
}

export default function QuizApp({ token }) {
  const [inputType, setInputType] = useState('topic')
  const [topic, setTopic] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfText, setPdfText] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  
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

  const fileInputRef = useRef(null)

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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/upload_pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/generate_quiz`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        const initialLen = parsed.length > 0 ? parsed.length : Number(numQuestions)
        setAnswers(new Array(initialLen).fill(''))
        setSession(newSessionId)
      } else {
        alert("Error: " + data.detail)
      }
    } catch (err) {
      alert("Failed to connect to backend.")
    }
    setLoading(false)
  }

  const handleEvaluate = async () => {
    setEvaluating(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/evaluate_quiz`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: session,
          user_answers: answers,
          topic: topic || "Uploaded PDF"
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
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Create a New Quiz</h1>
        <div className="subtitle">Select your source material below to automatically generate questions.</div>
      </div>

      {!questionsText && !evaluation && (
        <>
          <div className="input-cards-row">
            <div className={`input-card ${inputType === 'topic' ? 'active' : ''}`} onClick={() => setInputType('topic')}>
              <div className="card-title">
                <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                  <div className="card-icon" style={{background: '#e0e7ff', color: '#4f46e5'}}><Search size={20} /></div>
                  Search Topic
                </div>
                <span style={{color: '#94a3b8'}}>&rarr;</span>
              </div>
              <div className="card-desc">Enter a topic and generate questions using AI</div>
            </div>

            <div className={`input-card ${inputType === 'text' ? 'active' : ''}`} onClick={() => setInputType('text')}>
              <div className="card-title">
                <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                  <div className="card-icon" style={{background: '#e0e7ff', color: '#4f46e5'}}><FileText size={20} /></div>
                  Paste Text
                </div>
                <span style={{color: '#94a3b8'}}>&rarr;</span>
              </div>
              <div className="card-desc">Add your notes or content directly</div>
            </div>

            <div className={`input-card ${inputType === 'pdf' ? 'active' : ''}`} onClick={() => setInputType('pdf')}>
              <div className="card-title">
                <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                  <div className="card-icon" style={{background: '#dcfce7', color: '#16a34a'}}><Upload size={20} /></div>
                  Upload PDF
                </div>
                <span style={{color: '#94a3b8'}}>&rarr;</span>
              </div>
              <div className="card-desc">Generate questions from your PDF files</div>
            </div>
          </div>

          <div className="input-area">
            {inputType === 'topic' && <input type="text" placeholder="E.g., Quantum Computing, Roman Empire, Few-shot Prompting..." value={topic} onChange={e => setTopic(e.target.value)} />}
            {inputType === 'text' && <textarea placeholder="Paste the content you want to learn about here..." value={topic} onChange={e => setTopic(e.target.value)} />}
            {inputType === 'pdf' && (
              <div style={{border: '2px dashed var(--border-color)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', background: 'var(--surface-color)', cursor: 'pointer'}} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                <input type="file" ref={fileInputRef} accept=".pdf" style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files[0]) { handlePdfUpload(e.target.files[0]) } }} />
                <Upload size={32} color="var(--primary)" style={{marginBottom:'1rem'}} />
                {uploadingPdf ? <div><div className="loader" style={{borderColor: 'var(--primary)', borderTopColor: 'transparent'}}></div> Extracting...</div> : (
                  <div>{pdfFile ? pdfFile.name : 'Click to upload or drag & drop a PDF'}</div>
                )}
              </div>
            )}
          </div>

          <div className="settings-row">
            <div className="setting-block">
              <span className="setting-label"><FileText size={16}/> Number of Questions</span>
              <select className="select-control" value={numQuestions} onChange={e => setNumQuestions(e.target.value)}>
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>
            
            <div className="setting-block">
              <span className="setting-label"><div style={{display:'flex', gap:'2px', alignItems:'flex-end', height:'16px'}}><div style={{width:'4px', height:'6px', background:'var(--text-muted)'}}></div><div style={{width:'4px', height:'10px', background:'var(--text-muted)'}}></div><div style={{width:'4px', height:'14px', background:'var(--text-muted)'}}></div></div> Difficulty Level</span>
              <div className="pills-group">
                {['Easy', 'Medium', 'Hard'].map((lvl) => (
                  <button key={lvl} type="button" className={`pill-btn ${difficulty === lvl ? 'active' : ''}`} onClick={() => setDifficulty(lvl)}>{lvl}</button>
                ))}
              </div>
            </div>
          </div>

          <button className="generate-btn" onClick={handleGenerate} disabled={loading || (inputType === 'pdf' ? !pdfText : !topic)}>
            {loading ? <div className="loader" style={{borderColor: 'white', borderTopColor: 'transparent'}}></div> : <Sparkles size={18} />}
            {loading ? 'Generating...' : `Generate ${numQuestions} ${difficulty} Questions`}
          </button>
        </>
      )}

      {/* Same Quiz/Evaluation Code below, just restyled automatically by the new index.css */}
      {questionsText && !evaluation && (
        <div style={{background: 'var(--surface-color)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)'}}>
          <h2>Your Quiz ({difficulty} Difficulty)</h2>
          {parsedQuestions.length > 0 ? (
            <div className="mcq-container" style={{marginTop:'1.5rem'}}>
              {parsedQuestions.map((q, qIndex) => (
                <div key={qIndex} className="mcq-card">
                  <div className="mcq-title">{q.questionText}</div>
                  <div className="mcq-options">
                    {q.options.map((opt) => {
                      const isSelected = answers[qIndex] && answers[qIndex].startsWith(opt.key)
                      return (
                        <button key={opt.key} type="button" className={`mcq-option-btn ${isSelected ? 'selected' : ''}`} onClick={() => selectOption(qIndex, opt.key, opt.text)}>
                          <span className="option-badge">{opt.key}</span>
                          <span style={{flex: 1, lineHeight: 1.4}}>{opt.text}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre style={{background:'#f3f4f6', padding:'1rem', borderRadius:'0.5rem', whiteSpace:'pre-wrap'}}>{questionsText}</pre>
          )}
          <button className="generate-btn" style={{marginTop: '2rem', marginBottom: 0}} onClick={handleEvaluate} disabled={evaluating || answers.length === 0 || answers.some(a => !a)}>
            {evaluating ? <div className="loader" style={{borderColor: 'white', borderTopColor: 'transparent'}}></div> : 'Submit Answers'}
          </button>
        </div>
      )}

      {evaluation && (
        <div style={{background: 'var(--surface-color)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)'}}>
          <h2>Evaluation Complete</h2>
          <div style={{marginTop:'1.5rem'}}>
            {(() => {
              const { items, score } = parseEvaluation(evaluation)
              if (items.length === 0) return <pre style={{background:'#f3f4f6', padding:'1rem', borderRadius:'0.5rem', whiteSpace:'pre-wrap'}}>{evaluation}</pre>
              return (
                <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                  {items.map((item, i) => {
                    const isCorrect = /correct/i.test(item.result) && !/incorrect/i.test(item.result)
                    return (
                      <div key={i} style={{border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflow:'hidden'}}>
                        <div style={{padding:'1rem', background: isCorrect ? '#f0fdf4' : '#fef2f2', borderBottom: '1px solid var(--border-color)', display:'flex', gap:'1rem', alignItems:'flex-start'}}>
                          <span style={{background: isCorrect ? '#dcfce7' : '#fee2e2', color: isCorrect ? '#166534' : '#991b1b', padding:'0.25rem 0.5rem', borderRadius:'0.25rem', fontSize:'0.75rem', fontWeight:600}}>Q{i + 1}</span>
                          <span style={{fontWeight:600, flex:1}}>{item.question}</span>
                          <span style={{color: isCorrect ? '#16a34a' : '#dc2626', fontWeight:600, fontSize:'0.85rem'}}>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                        </div>
                        <div style={{padding:'1rem', display:'flex', flexDirection:'column', gap:'0.75rem', fontSize:'0.9rem'}}>
                          <div style={{display:'flex', gap:'1rem'}}><span style={{width:'120px', color:'var(--text-muted)', fontWeight:500, fontSize:'0.8rem', textTransform:'uppercase'}}>Your Answer</span> <span>{item.userAnswer}</span></div>
                          <div style={{display:'flex', gap:'1rem'}}><span style={{width:'120px', color:'var(--text-muted)', fontWeight:500, fontSize:'0.8rem', textTransform:'uppercase'}}>Correct Answer</span> <span style={{color:'#16a34a', fontWeight:500}}>{item.correctAnswer}</span></div>
                          <div style={{display:'flex', gap:'1rem'}}><span style={{width:'120px', color:'var(--text-muted)', fontWeight:500, fontSize:'0.8rem', textTransform:'uppercase'}}>Reason</span> <span style={{fontStyle:'italic', color:'var(--text-muted)'}}>{item.reason}</span></div>
                        </div>
                      </div>
                    )
                  })}
                  {score && <div style={{background:'#eef2ff', padding:'1rem 1.5rem', borderRadius:'0.75rem', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem'}}><span style={{color:'#4f46e5', fontWeight:600, textTransform:'uppercase', fontSize:'0.85rem'}}>Final Score</span><span style={{fontSize:'1.5rem', fontWeight:800, color:'#4338ca'}}>{score.replace(/^Score:\s*/i, '')}</span></div>}
                </div>
              )
            })()}
          </div>
          <button className="generate-btn" style={{marginTop: '2rem', marginBottom: 0}} onClick={() => { setQuestionsText(''); setParsedQuestions([]); setEvaluation(null); setFeedback(null); setTopic(''); setPdfFile(null); setPdfText(''); }}>Start New Quiz</button>
        </div>
      )}
    </>
  )
}
