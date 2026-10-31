
import { useState } from 'react'
import { supabase } from '../Service/Supabase/client'
import './sales.css'

const suggestions = [
  'Which products should I reorder?',
  'What is my fastest-selling product?',
  'Which products are losing demand?',
  'How much money is tied up in slow-moving stock?'
]

function InventoryAssistant() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I'm StockPilot AI. I can analyse your inventory and sales. What would you like to know?"
    }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function askAssistant(value = question) {
    const text = value.trim()
    if (!text || loading) return

    setError('')
    setQuestion('')
    setMessages(previous => [
      ...previous,
      { role: 'user', text }
    ])
    setLoading(true)

    const { data, error } = await supabase.functions.invoke(
      'inventory-assistant',
      { body: { question: text } }
    )

    if (error) {
      setError(error.message || 'Could not contact the AI assistant.')
    } else if (data?.error) {
      setError(data.error)
    } else {
      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          text: data?.answer || 'No answer received.'
        }
      ])
    }

    setLoading(false)
  }

  return (
    <div className="sales-page">
      <div className="sales-header">
        <div>
          <h1>AI Inventory Assistant</h1>
          <p>Ask questions about your business inventory in natural language.</p>
        </div>
      </div>

      <section className="sales-card">
        <div style={{
          minHeight: 330,
          maxHeight: 450,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: 8
        }}>
          {messages.map((message, index) => (
            <div key={index} style={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: message.role === 'user' ? '#ffe500' : '#292929',
              color: message.role === 'user' ? '#111' : '#fff',
              padding: 15,
              borderRadius: 12,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: 14
            }}>
              <strong style={{ display: 'block', marginBottom: 5 }}>
                {message.role === 'user' ? 'You' : 'StockPilot AI'}
              </strong>
              {message.text}
            </div>
          ))}

          {loading && (
            <div style={{ color: '#ffe500', padding: 12 }}>
              StockPilot AI is analysing your business data...
            </div>
          )}
        </div>

        {error && <div className="sales-error">{error}</div>}

        <h3 style={{ color: '#ccc', marginTop: 25 }}>
          Suggested questions
        </h3>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 20
        }}>
          {suggestions.map(item => (
            <button
              key={item}
              disabled={loading}
              onClick={() => askAssistant(item)}
              style={{
                background: '#292929',
                border: '1px solid #484848',
                color: '#ffe500',
                padding: '10px 13px',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <form onSubmit={e => {
          e.preventDefault()
          askAssistant()
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              style={{ flex: 1, minWidth: 0 }}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask about your inventory..."
              disabled={loading}
            />
            <button
              className="sales-primary"
              style={{ width: 'auto', marginTop: 0 }}
              disabled={loading || !question.trim()}
            >
              {loading ? 'Thinking...' : 'Ask AI'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default InventoryAssistant
