
import { useNavigate } from 'react-router-dom'

function BackToOverview() {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/dashboard')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        marginBottom: '20px',
        background: 'transparent',
        border: '1px solid #444',
        borderRadius: '8px',
        color: '#eab308',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 600
      }}
    >
      ← Back to Overview
    </button>
  )
}

export default BackToOverview

