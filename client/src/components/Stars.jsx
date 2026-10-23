export default function Stars({ value = 0, onChange, size = 22 }) {
  return (
    <span className="row" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          aria-label={n + ' star' + (n > 1 ? 's' : '')}
          style={{
            border: 0,
            background: 'none',
            padding: 2,
            fontSize: size,
            lineHeight: 1,
            color: n <= value ? 'var(--turmeric)' : 'var(--steel)',
            cursor: onChange ? 'pointer' : 'default'
          }}
        >
          {'\u2605'}
        </button>
      ))}
    </span>
  )
}
