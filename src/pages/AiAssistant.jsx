import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Bot, User } from 'lucide-react'
import styles from './Ideas.module.css'
import Button from '../components/ui/Button'

export default function AiAssistantPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ciao! Sono il tuo assistente per le idee. Hai in mente qualcosa ma non sai come scriverlo bene? O vuoi fare brainstorming su temi come ambiente, struttura o eventi per la scuola? Dimmi pure!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)

    // Simulate AI response
    setTimeout(() => {
      let aiResponse = "È un'ottima idea! Potresti strutturarla in questo modo: \n1. Problema che risolve\n2. Costi o risorse necessarie\n3. Benefici per gli studenti.\nVuoi che ti aiuti a scriverla per inviarla ufficialmente?"
      if (userMsg.toLowerCase().includes('ambiente') || userMsg.toLowerCase().includes('riciclo')) {
        aiResponse = "Ottimo tema! Il riciclo e l'ambiente sono molto importanti. Potremmo proporre nuovi cestini per la differenziata o una giornata di pulizia del cortile. Cosa ne pensi?"
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
      setLoading(false)
    }, 1500)
  }

  return (
    <div className={styles.page}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Sparkles color="var(--accent)" /> AI Brainstorming
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '4px' }}>
          Usa l'intelligenza artificiale per perfezionare le tue idee prima di inviarle.
        </p>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', height: '60vh',
        background: 'var(--bg-2)', borderRadius: '12px', border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', gap: '10px', alignItems: 'flex-start',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              maxWidth: '80%'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0
              }}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-3)',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                padding: '12px 16px', borderRadius: '12px',
                borderTopRightRadius: msg.role === 'user' ? 0 : '12px',
                borderTopLeftRadius: msg.role === 'assistant' ? 0 : '12px',
                fontSize: '0.95rem', lineHeight: '1.4'
              }}>
                {msg.content.split('\n').map((line, j) => <span key={j}>{line}<br /></span>)}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', alignSelf: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Bot size={18} />
              </div>
              <div style={{ background: 'var(--bg-3)', padding: '12px 16px', borderRadius: '12px', borderTopLeftRadius: 0, color: 'var(--text-3)' }}>
                Sta scrivendo...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} style={{
          display: 'flex', gap: '10px', padding: '15px',
          borderTop: '1px solid var(--border)', background: 'var(--bg)'
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Scrivi qui la tua idea..."
            style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
          />
          <Button type="submit" disabled={!input.trim() || loading} style={{ borderRadius: '50%', padding: '12px', minWidth: 'auto', width: '44px', height: '44px' }}>
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  )
}
