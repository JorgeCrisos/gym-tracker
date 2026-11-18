import { useState } from 'react'
import { Activity, ArrowRight, BarChart3, CalendarDays, Dumbbell, HeartPulse, History, LockKeyhole, Target, Users } from 'lucide-react'
import { isSupabaseConfigured } from './lib/supabase'

type TrainingMode = 'jorge' | 'marta' | 'together'

const areas = [
  { title: 'Entrenar', description: 'Registra tu próxima sesión', icon: Dumbbell },
  { title: 'Rutinas', description: 'Tus planes y ejercicios', icon: CalendarDays },
  { title: 'Estadísticas', description: 'Volumen, fuerza y evolución', icon: BarChart3 },
  { title: 'Historial', description: 'Todo tu recorrido', icon: History },
  { title: 'Objetivos', description: 'Metas y progresión', icon: Target },
  { title: 'Recuperación', description: 'Sensaciones y descanso', icon: HeartPulse }
]

const names: Record<TrainingMode, string> = {
  jorge: 'Jorge',
  marta: 'Marta',
  together: 'Entrenar juntos'
}

export default function App() {
  const [mode, setMode] = useState<TrainingMode | null>(null)

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="GymLog inicio">
          <span className="brand-mark"><Dumbbell size={19} strokeWidth={2.7} /></span>
          <span>gym<span className="brand-accent">log</span></span>
        </a>
        <div className="topbar-right">
          <span className="sync-indicator"><span className="status-dot" /> Base de desarrollo</span>
          <button className="avatar-button" aria-label="Perfil seleccionado">G</button>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> TU ENTRENAMIENTO, VUESTRO PROGRESO</div>
        <h1>Más fuertes.<br /><span>Juntos o por separado.</span></h1>
        <p className="hero-copy">Cada repetición cuenta. Cada progreso es vuestro.</p>
      </section>

      <section className="profile-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">EMPEZAR</p>
            <h2>¿Quién entrena hoy?</h2>
          </div>
          <span className="step-label">01 / PERFIL</span>
        </div>
        <div className="profile-grid">
          <button className={`profile-card jorge ${mode === 'jorge' ? 'selected' : ''}`} onClick={() => setMode('jorge')}>
            <span className="profile-initial">J</span>
            <span className="profile-info"><strong>Jorge</strong><small>Entrenamiento individual</small></span>
            <ArrowRight className="profile-arrow" size={19} />
          </button>
          <button className={`profile-card marta ${mode === 'marta' ? 'selected' : ''}`} onClick={() => setMode('marta')}>
            <span className="profile-initial">M</span>
            <span className="profile-info"><strong>Marta</strong><small>Entrenamiento individual</small></span>
            <ArrowRight className="profile-arrow" size={19} />
          </button>
          <button className={`profile-card together ${mode === 'together' ? 'selected' : ''}`} onClick={() => setMode('together')}>
            <span className="profile-initial"><Users size={22} /></span>
            <span className="profile-info"><strong>Entrenar juntos</strong><small>Un móvil, dos registros separados</small></span>
            <ArrowRight className="profile-arrow" size={19} />
          </button>
        </div>
        {mode && (
          <div className="selection-note" role="status">
            <span className="selection-check">✓</span>
            <span><strong>{names[mode]}</strong> seleccionado. El flujo de entrenamiento se habilitará al completar autenticación y sincronización.</span>
          </div>
        )}
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">TU ESPACIO</p>
            <h2>Todo bajo control</h2>
          </div>
          <span className="step-label">02 / PROGRESO</span>
        </div>
        <div className="feature-grid">
          {areas.map(({ title, description, icon: Icon }) => (
            <article className="feature-card" key={title}>
              <span className="feature-icon"><Icon size={19} /></span>
              <strong>{title}</strong>
              <small>{description}</small>
              <span className="coming-soon">EN PREPARACIÓN</span>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-lock"><LockKeyhole size={15} /><span>Privacidad individual desde el diseño</span></div>
        <span className={`backend-state ${isSupabaseConfigured ? 'configured' : ''}`}><Activity size={14} /> {isSupabaseConfigured ? 'Backend configurado' : 'Sin conexión a Supabase todavía'}</span>
      </footer>
    </main>
  )
}