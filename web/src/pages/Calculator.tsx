import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CalculatorDecoy(){
  const nav = useNavigate()
  const [display, setDisplay] = useState('0')
  const timer = useRef<any>(null)
  const PIN = '1337'
  const pressStartEq = () => { timer.current = setTimeout(()=> { if (display===PIN) nav('/login') }, 1000) }
  const pressEndEq = () => { if (timer.current) clearTimeout(timer.current) }
  useEffect(()=>()=>{ if (timer.current) clearTimeout(timer.current) },[])
  const input = (val: string) => {
    const next = display==='0'? val : display+val
    setDisplay(next)
  }
  return (
    <div className="chat-layout">
      <div className="glass-container" style={{maxWidth:'20rem'}}>
        <div className="glass-card" style={{fontSize:'2rem',textAlign:'right'}}>{display}</div>
        <div className="glass-card" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px'}}>
          {'789/'.split('').map(k=> <button key={k} className="btn-glass" onClick={()=>input(k)}>{k}</button>)}
          {'456*'.split('').map(k=> <button key={k} className="btn-glass" onClick={()=>input(k)}>{k}</button>)}
          {'123-'.split('').map(k=> <button key={k} className="btn-glass" onClick={()=>input(k)}>{k}</button>)}
          {'0=+'.split('').map(k=> k==='='
            ? <button key={k} className="btn-glass" onMouseDown={pressStartEq} onMouseUp={pressEndEq}>=</button>
            : <button key={k} className="btn-glass" onClick={()=>input(k)}>{k}</button>
          )}
        </div>
      </div>
    </div>
  )
}
