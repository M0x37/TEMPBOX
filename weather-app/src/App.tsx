import { useEffect, useRef, useState } from 'react'
import { CapacitorHttp } from '@capacitor/core'
import './App.css'

interface WeatherData {
  temp: number
  humidity: number
  pressure: number
}

interface TempEntry {
  temp: number
  time: string
}

const HISTORY_KEY = 'tempbox_history'
const URL_KEY = 'tempbox_url'
const MAX_ENTRIES = 200

function loadHistory(): TempEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveEntry(entry: TempEntry) {
  const history = loadHistory()
  history.push(entry)
  if (history.length > MAX_ENTRIES) history.splice(0, history.length - MAX_ENTRIES)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function loadUrl(): string {
  return localStorage.getItem(URL_KEY) || 'http://192.168.178.100/'
}

function App() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [history, setHistory] = useState<TempEntry[]>([])
  const [settingsUrl, setSettingsUrl] = useState(loadUrl())
  const cached = useRef<WeatherData | null>(null)
  const cachedTime = useRef<string | null>(null)
  const urlRef = useRef(loadUrl())

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      try {
        const res = await CapacitorHttp.get({ url: urlRef.current, responseType: 'json', connectTimeout: 5000 })
        if (cancelled) return
        const d = res.data as WeatherData
        if (typeof d?.temp === 'number') {
          const now = new Date().toLocaleTimeString()
          cached.current = d
          cachedTime.current = now
          setData(d)
          setLastUpdate(now)
          setStatus('connected')
          saveEntry({ temp: d.temp, time: now })
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

  function openHistory() {
    setHistory(loadHistory().toReversed())
    setShowHistory(true)
    setShowSettings(false)
  }

  function openSettings() {
    setSettingsUrl(loadUrl())
    setShowSettings(true)
    setShowHistory(false)
  }

  function saveSettings() {
    let url = settingsUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url
    }
    if (!url.endsWith('/')) url += '/'
    localStorage.setItem(URL_KEY, url)
    urlRef.current = url
    setShowSettings(false)
  }

  if (showSettings) {
    return (
      <div className="container settings-view">
        <div className="settings-header">
          <button className="btn" onClick={() => setShowSettings(false)}>← Back</button>
          <span className="settings-title">Settings</span>
        </div>
        <div className="settings-body">
          <div className="settings-label">ESP32 URL</div>
          <input className="settings-input" value={settingsUrl} onChange={e => setSettingsUrl(e.target.value)} />
          <button className="btn settings-save" onClick={saveSettings}>SAVE</button>
        </div>
      </div>
    )
  }

  if (showHistory) {
    return (
      <div className="container history-view">
        <div className="history-header">
          <button className="btn" onClick={() => setShowHistory(false)}>← Back</button>
          <span className="history-title">Temperature History</span>
        </div>
        <div className="history-list">
          {history.length === 0 && <div className="history-empty">no entries</div>}
          {history.map((e, i) => (
            <div className="history-item" key={i}>
              <span className="history-temp">{e.temp.toFixed(1)}°C</span>
              <span className="history-time">{e.time}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

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
          <div className="buttons">
            <button className="btn" onClick={openSettings}>SETTINGS</button>
            <button className="btn" onClick={openHistory}>HISTORY</button>
          </div>
        </>
      ) : (
        <div className="waiting">connecting...</div>
      )}
    </div>
  )
}

export default App
