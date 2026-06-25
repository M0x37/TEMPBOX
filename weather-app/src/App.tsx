import { useEffect, useRef, useState } from 'react'
import { CapacitorHttp } from '@capacitor/core'
import './App.css'

interface WeatherData {
  temp: number
  humidity: number
  pressure: number
}

function App() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const cached = useRef<WeatherData | null>(null)
  const cachedTime = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      try {
        const res = await CapacitorHttp.get({ url: 'http://192.168.178.100/', responseType: 'json', connectTimeout: 5000 })
        if (cancelled) return
        const d = res.data as WeatherData
        if (typeof d?.temp === 'number') {
          cached.current = d
          cachedTime.current = new Date().toLocaleTimeString()
          setData(d)
          setLastUpdate(cachedTime.current)
          setStatus('connected')
        }
      } catch {
        if (!cancelled) {
          if (cached.current) {
            setData(cached.current)
            setLastUpdate(cachedTime.current)
          }
          setStatus('disconnected')
        }
      }
      if (!cancelled) timer = setTimeout(poll, 5000)
    }

    poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  const sleeping = status === 'disconnected' && data

  return (
    <div className="container">
      {data ? (
        <>
          <div className={sleeping ? 'temp dim' : 'temp'}>
            {data.temp.toFixed(1)}
            <span className="temp-unit">°C</span>
          </div>
          <div className="extras">
            <div className="extra-item">
              <div className="extra-label">Humidity</div>
              <div className="extra-value">{data.humidity.toFixed(0)}%</div>
            </div>
            <div className="extra-item">
              <div className="extra-label">Pressure</div>
              <div className="extra-value">{data.pressure.toFixed(0)} hPa</div>
            </div>
          </div>
          {lastUpdate && (
            <div className={sleeping ? 'meta asleep' : 'meta'}>
              {sleeping ? 'last update' : 'updated'} <span>{lastUpdate}</span>
            </div>
          )}
        </>
      ) : (
        <div className="waiting">connecting...</div>
      )}
    </div>
  )
}

export default App
