import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <h1>React + Vite</h1>
      <p>Count is {count}</p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
    </main>
  )
}

export default App
