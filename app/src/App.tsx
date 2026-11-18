import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownToLine, BarChart3, CalendarDays, Check, ChevronRight, Clock3, Dumbbell, HeartPulse, History, Home, Plus, Save, Target, Timer, Trash2, Trophy, Users, X } from 'lucide-react'

type Person = 'jorge' | 'marta'
type Mode = Person | 'together'
type Tab = 'home' | 'train' | 'routines' | 'history' | 'stats' | 'goals' | 'profile'
type SetEntry = { id: string; exercise: string; person: Person; weight: number; reps: number; rpe: number; rest: number }
type Workout = { id: string; date: string; mode: Mode; people: Person[]; sets: SetEntry[]; duration: number; note: string }
type Exercise = { id: string; name: string; sets: number; reps: number; rest: number }
type Routine = { id: string; name: string; owner: Person | 'shared'; exercises: Exercise[] }
type Goal = { id: string; person: Person; title: string; target: number; current: number }
type Metric = { id: string; person: Person; date: string; weight: number; waist: number }
type Recovery = { id: string; person: Person; date: string; sleep: number; feeling: number; fatigue: number; note: string }
type AppData = { workouts: Workout[]; routines: Routine[]; goals: Goal[]; metrics: Metric[]; recovery: Recovery[]; active: { mode: Mode; people: Person[]; startedAt: number; sets: SetEntry[]; note: string } | null }
const KEY = 'gymlog_v1_data'
const names: Record<Person, string> = { jorge: 'Jorge', marta: 'Marta' }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const today = () => new Date().toISOString().slice(0, 10)
const seed: AppData = {
  workouts: [], goals: [], metrics: [], recovery: [], active: null,
  routines: [
    { id: 'r1', name: 'Full body A', owner: 'shared', exercises: [{ id: 'e1', name: 'Sentadilla', sets: 3, reps: 10, rest: 120 }, { id: 'e2', name: 'Press banca', sets: 3, reps: 10, rest: 90 }, { id: 'e3', name: 'Remo con mancuerna', sets: 3, reps: 12, rest: 90 }, { id: 'e4', name: 'Peso muerto rumano', sets: 3, reps: 10, rest: 120 }, { id: 'e5', name: 'Plancha', sets: 3, reps: 40, rest: 60 }] },
    { id: 'r2', name: 'Tren superior', owner: 'jorge', exercises: [{ id: 'e6', name: 'Press inclinado', sets: 3, reps: 10, rest: 90 }, { id: 'e7', name: 'Jalón al pecho', sets: 3, reps: 10, rest: 90 }, { id: 'e8', name: 'Elevaciones laterales', sets: 3, reps: 15, rest: 60 }] },
    { id: 'r3', name: 'Pierna y glúteo', owner: 'marta', exercises: [{ id: 'e9', name: 'Prensa', sets: 3, reps: 12, rest: 120 }, { id: 'e10', name: 'Hip thrust', sets: 4, reps: 10, rest: 90 }, { id: 'e11', name: 'Curl femoral', sets: 3, reps: 12, rest: 90 }] }
  ]
}
function load(): AppData {
  try { const saved = localStorage.getItem(KEY); return saved ? { ...seed, ...JSON.parse(saved) } : seed } catch { return seed }
}
function fmt(date: string) { return new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) }
function vol(sets: SetEntry[]) { return sets.reduce((sum, s) => sum + s.weight * s.reps, 0) }

export default function App() {
  const [data, setData] = useState<AppData>(load)
  const [tab, setTab] = useState<Tab>('home')
  const [person, setPerson] = useState<Person>('jorge')
  const [exercise, setExercise] = useState('Press banca')
  const [weight, setWeight] = useState('20')
  const [reps, setReps] = useState('10')
  const [rpe, setRpe] = useState('7')
  const [rest, setRest] = useState('90')
  const [activeSetPerson, setSetPerson] = useState<Person>('jorge')
  const [routineName, setRoutineName] = useState('')
  const [routineExercises, setRoutineExercises] = useState('Sentadilla, Press banca, Remo')
  const [routineOwner, setRoutineOwner] = useState<Person | 'shared'>('jorge')
  const [goal, setGoal] = useState('')
  const [goalTarget, setGoalTarget] = useState('3')
  const [metricWeight, setMetricWeight] = useState('')
  const [metricWaist, setMetricWaist] = useState('')
  const [sleep, setSleep] = useState('8')
  const [feeling, setFeeling] = useState('4')
  const [fatigue, setFatigue] = useState('3')
  const [recoveryNote, setRecoveryNote] = useState('')
  const [timer, setTimer] = useState(0)
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(data)) }, [data])
  useEffect(() => { if (!running || timer <= 0) return; const id = window.setInterval(() => setTimer(t => { if (t <= 1) { setRunning(false); return 0 } return t - 1 }), 1000); return () => window.clearInterval(id) }, [running, timer])
  useEffect(() => { if (!notice) return; const id = window.setTimeout(() => setNotice(''), 2400); return () => window.clearTimeout(id) }, [notice])

  const workouts = data.workouts.filter(w => w.people.includes(person))
  const sets = workouts.flatMap(w => w.sets.filter(s => s.person === person))
  const totalVolume = vol(sets)
  const week = workouts.filter(w => Date.now() - new Date(w.date + 'T23:59:59').getTime() < 604800000).length
  const records = useMemo(() => {
    const best = new Map<string, number>()
    workouts.forEach(w => w.sets.filter(s => s.person === person).forEach(s => best.set(s.exercise, Math.max(best.get(s.exercise) || 0, s.weight))))
    return Array.from(best.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [workouts, person])

  function start(next: Mode) {
    const people: Person[] = next === 'together' ? ['jorge', 'marta'] : [next]
    setSetPerson(people[0])
    setData(d => ({ ...d, active: { mode: next, people, startedAt: Date.now(), sets: [], note: '' } }))
    setTab('train'); setNotice('Entrenamiento iniciado')
  }
  function addSet() {
    if (!data.active) return
    const p = data.active.people.includes(activeSetPerson) ? activeSetPerson : data.active.people[0]
    const entry: SetEntry = { id: uid(), exercise: exercise.trim() || 'Ejercicio', person: p, weight: Math.max(0, Number(weight) || 0), reps: Math.max(0, Number(reps) || 0), rpe: Math.min(10, Math.max(1, Number(rpe) || 7)), rest: Math.max(0, Number(rest) || 0) }
    setData(d => d.active ? { ...d, active: { ...d.active, sets: [...d.active.sets, entry] } } : d)
    setTimer(entry.rest); setRunning(true); setNotice('Serie guardada · ' + names[p])
  }
  function finish() {
    if (!data.active) return
    if (!data.active.sets.length) { setNotice('Añade al menos una serie'); return }
    const a = data.active
    const workout: Workout = { id: uid(), date: today(), mode: a.mode, people: a.people, sets: a.sets, duration: Math.max(1, Math.round((Date.now() - a.startedAt) / 60000)), note: a.note }
    setData(d => ({ ...d, workouts: [workout, ...d.workouts], active: null }))
    setRunning(false); setTimer(0); setTab('history'); setNotice('Entrenamiento guardado')
  }
  function createRoutine() {
    const ex = routineExercises.split(',').map(x => x.trim()).filter(Boolean)
    if (!routineName.trim() || !ex.length) { setNotice('Completa nombre y ejercicios'); return }
    const routine: Routine = { id: uid(), name: routineName.trim(), owner: routineOwner, exercises: ex.map(name => ({ id: uid(), name, sets: 3, reps: 10, rest: 90 })) }
    setData(d => ({ ...d, routines: [routine, ...d.routines] })); setRoutineName(''); setNotice('Rutina creada')
  }
  function createGoal() {
    if (!goal.trim() || Number(goalTarget) < 1) return
    setData(d => ({ ...d, goals: [...d.goals, { id: uid(), person, title: goal.trim(), target: Number(goalTarget), current: 0 }] }))
    setGoal(''); setNotice('Objetivo creado')
  }
  function addMetric() {
    if (!metricWeight && !metricWaist) { setNotice('Introduce al menos una medición'); return }
    setData(d => ({ ...d, metrics: [...d.metrics, { id: uid(), person, date: today(), weight: Number(metricWeight) || 0, waist: Number(metricWaist) || 0 }] }))
    setMetricWeight(''); setMetricWaist(''); setNotice('Medición guardada')
  }
  function addRecovery() {
    setData(d => ({ ...d, recovery: [{ id: uid(), person, date: today(), sleep: Number(sleep), feeling: Number(feeling), fatigue: Number(fatigue), note: recoveryNote }, ...d.recovery] }))
    setRecoveryNote(''); setNotice('Recuperación registrada')
  }
  function exportCsv() {
    const rows = [['fecha', 'persona', 'modo', 'ejercicio', 'peso_kg', 'repeticiones', 'RPE', 'descanso_seg']]
    data.workouts.forEach(w => w.sets.forEach(s => rows.push([w.date, names[s.person], w.mode, s.exercise, String(s.weight), String(s.reps), String(s.rpe), String(s.rest)])))
    const csv = rows.map(r => r.map(v => '"' + v.replaceAll('"', '""') + '"').join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'gymlog-' + today() + '.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const nav: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Inicio', icon: Home }, { id: 'train', label: 'Entrenar', icon: Dumbbell }, { id: 'routines', label: 'Rutinas', icon: CalendarDays },
    { id: 'history', label: 'Historial', icon: History }, { id: 'stats', label: 'Estadísticas', icon: BarChart3 }, { id: 'goals', label: 'Objetivos', icon: Target }, { id: 'profile', label: 'Perfil', icon: HeartPulse }
  ]

  return <div className="layout">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('home') }}><span className="brand-icon"><Dumbbell size={19} /></span><span>gym<span>log</span></span></a>
      <div className="side-label">TU ESPACIO</div>
      <nav>{nav.map(n => <button key={n.id} className={'nav-item ' + (tab === n.id ? 'active' : '')} onClick={() => setTab(n.id)}><n.icon size={18} /><span>{n.label}</span>{n.id === 'train' && data.active && <i />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><Activity size={16} /><span>Guardado automático<br /><b>En este dispositivo</b></span></div><small>GYMLOG · BETA LOCAL</small></div>
    </aside>
    <main className="main">
      <header className="mobile-header"><a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('home') }}><span className="brand-icon"><Dumbbell size={18} /></span><span>gym<span>log</span></span></a><span className="local-pill"><i /> Local</span></header>
      <div className="page-top"><div><div className="eyebrow">TU ENTRENAMIENTO · VUESTRO PROGRESO</div><h1>{nav.find(n => n.id === tab)?.label}</h1></div><div className="person-switch">{(['jorge', 'marta'] as Person[]).map(p => <button key={p} className={person === p ? 'chosen ' + p : ''} onClick={() => setPerson(p)}><span>{p === 'jorge' ? 'J' : 'M'}</span>{names[p]}</button>)}</div></div>

      {tab === 'home' && <section className="page-content">
        <div className="welcome-card"><div><span className="eyebrow">HOLA, {names[person].toUpperCase()}</span><h2>Hoy cuenta.<br /><em>Vamos a por ello.</em></h2><p>Tu progreso, sesión a sesión.</p><button className="primary-btn" onClick={() => start(person)}><Dumbbell size={17} /> Empezar entrenamiento</button></div><div className="welcome-art"><div className="art-ring"><Dumbbell size={64} /></div><span>01 / CONSTANCIA</span></div></div>
        <div className="metric-grid"><Metric label="ENTRENAMIENTOS · 7 DÍAS" value={String(week)} detail="Esta semana" /><Metric label="VOLUMEN TOTAL" value={Math.round(totalVolume).toLocaleString('es-ES') + ' kg'} detail="Carga acumulada" /><Metric label="SERIES REGISTRADAS" value={String(sets.length)} detail="Trabajo realizado" /></div>
        <div className="section-title"><div><span className="eyebrow">TU ACTIVIDAD</span><h2>Últimas sesiones</h2></div><button className="text-btn" onClick={() => setTab('history')}>Ver historial <ChevronRight size={15} /></button></div>
        {workouts.length ? <div className="session-list">{workouts.slice(0, 4).map(w => <Session key={w.id} workout={w} person={person} />)}</div> : <Empty title="Tu primera sesión empieza aquí" text="Registra tu entrenamiento y verás aparecer tu evolución." />}
        <div className="section-title"><div><span className="eyebrow">ACCESO RÁPIDO</span><h2>Tu espacio</h2></div></div>
        <div className="quick-grid">{nav.filter(n => ['routines', 'stats', 'goals', 'profile'].includes(n.id)).map(n => <button className="quick-card" key={n.id} onClick={() => setTab(n.id)}><n.icon size={20} /><b>{n.label}</b><ChevronRight size={16} /></button>)}</div>
      </section>}

      {tab === 'train' && <section className="page-content">
        {!data.active ? <div className="panel start-panel"><div className="panel-heading"><div><span className="eyebrow">NUEVA SESIÓN</span><h2>¿Cómo vais a entrenar?</h2></div><Dumbbell size={24} /></div><div className="mode-grid"><button onClick={() => start('jorge')}><span className="person-bubble jorge">J</span><b>Jorge</b><small>Individual</small></button><button onClick={() => start('marta')}><span className="person-bubble marta">M</span><b>Marta</b><small>Individual</small></button><button onClick={() => start('together')}><span className="person-bubble joint"><Users size={20} /></span><b>Juntos</b><small>Un móvil, dos registros</small></button></div><p className="helper">En modo conjunto, cada serie queda vinculada a la persona seleccionada.</p></div> : <>
          <div className="active-banner"><div><i /> SESIÓN EN CURSO <b>· {data.active.mode === 'together' ? 'Juntos' : names[data.active.people[0]]}</b></div><button className="finish-btn" onClick={finish}><Check size={16} /> Finalizar</button></div>
          <div className="training-grid"><div className="panel log-panel"><div className="panel-heading"><div><span className="eyebrow">REGISTRO DE SERIES</span><h2>Añadir serie</h2></div><Dumbbell size={22} /></div>
            <label>Ejercicio<input value={exercise} onChange={e => setExercise(e.target.value)} list="exercise-list" placeholder="Ej. Press banca" /><datalist id="exercise-list">{data.routines.flatMap(r => r.exercises).map(e => <option key={e.id} value={e.name} />)}</datalist></label>
            {data.active.people.length > 1 && <div className="field"><span>¿De quién es esta serie?</span><div className="person-pills">{data.active.people.map(p => <button key={p} className={setPerson === p ? 'selected ' + p : ''} onClick={() => setSetPerson(p)}>{names[p]}</button>)}</div></div>}
            <div className="input-row"><label>Peso (kg)<input type="number" min="0" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} /></label><label>Repeticiones<input type="number" min="0" value={reps} onChange={e => setReps(e.target.value)} /></label></div>
            <div className="input-row"><label>RPE (1–10)<input type="number" min="1" max="10" value={rpe} onChange={e => setRpe(e.target.value)} /></label><label>Descanso (seg)<input type="number" min="0" value={rest} onChange={e => setRest(e.target.value)} /></label></div>
            <button className="primary-btn full" onClick={addSet}><Plus size={17} /> Guardar serie</button>
            <div className="timer-box"><div><Timer size={19} /><span><b>Descanso</b><small>{timer ? 'Temporizador activo' : 'Listo'}</small></span></div><strong>{String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}</strong><div className="timer-actions">{[60, 90, 120].map(n => <button key={n} onClick={() => { setTimer(n); setRunning(true) }}>{n}s</button>)}<button onClick={() => setRunning(v => !v)}>{running ? 'Pausar' : 'Iniciar'}</button><button onClick={() => { setTimer(0); setRunning(false) }}>Reset</button></div></div>
          </div><div className="panel sets-panel"><div className="panel-heading"><div><span className="eyebrow">SESIÓN ACTUAL</span><h2>Series completadas <span className="count-badge">{data.active.sets.length}</span></h2></div><Clock3 size={22} /></div>
            {data.active.sets.length ? <div className="set-list">{data.active.sets.map((s, i) => <div className="set-row" key={s.id}><span className="set-number">{i + 1}</span><div className="set-main"><b>{s.exercise}</b><small>{names[s.person]} · RPE {s.rpe} · {s.rest}s descanso</small></div><strong>{s.weight} kg × {s.reps}</strong><button onClick={() => setData(d => d.active ? { ...d, active: { ...d.active, sets: d.active.sets.filter(x => x.id !== s.id) } } : d)} aria-label="Eliminar serie"><Trash2 size={15} /></button></div>)}</div> : <Empty title="Todavía no hay series" text="Añade la primera serie en el formulario." />}
            <label className="note-field">Notas de la sesión<textarea value={data.active.note} onChange={e => setData(d => d.active ? { ...d, active: { ...d.active, note: e.target.value } } : d)} placeholder="Sensaciones, observaciones..." /></label>
          </div></div></>}
      </section>}

      {tab === 'routines' && <section className="page-content"><div className="section-title"><div><span className="eyebrow">PLANIFICACIÓN</span><h2>Rutinas disponibles</h2></div><span className="muted-count">{data.routines.length} rutinas</span></div><div className="routine-grid">
        {data.routines.filter(r => r.owner === person || r.owner === 'shared').map(r => <article className="panel routine-card" key={r.id}><div className="routine-top"><span className="routine-icon"><Dumbbell size={20} /></span><span className="tag">{r.owner === 'shared' ? 'COMPARTIDA' : names[r.owner].toUpperCase()}</span></div><h3>{r.name}</h3><p>{r.exercises.length} ejercicios · {r.exercises.reduce((n, e) => n + e.sets, 0)} series previstas</p><div className="exercise-chips">{r.exercises.map(e => <span key={e.id}>{e.name}</span>)}</div><button className="primary-btn full" onClick={() => { setExercise(r.exercises[0]?.name || 'Press banca'); start(r.owner === 'shared' ? person : r.owner) }}>Usar rutina <ChevronRight size={16} /></button><button className="delete-routine" onClick={() => setData(d => ({ ...d, routines: d.routines.filter(x => x.id !== r.id) }))}><Trash2 size={14} /> Eliminar</button></article>)}</div>
        <div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">PERSONALIZA</span><h2>Crear rutina</h2></div><Plus size={22} /></div><div className="form-grid"><label>Nombre<input value={routineName} onChange={e => setRoutineName(e.target.value)} placeholder="Ej. Full body B" /></label><label>Asignar a<select value={routineOwner} onChange={e => setRoutineOwner(e.target.value as Person | 'shared')}><option value="jorge">Jorge</option><option value="marta">Marta</option><option value="shared">Compartida</option></select></label><label className="wide">Ejercicios separados por comas<textarea value={routineExercises} onChange={e => setRoutineExercises(e.target.value)} /></label></div><button className="primary-btn" onClick={createRoutine}><Plus size={16} /> Guardar rutina</button></div>
      </section>}

      {tab === 'history' && <section className="page-content"><div className="section-title"><div><span className="eyebrow">REGISTRO</span><h2>Tu recorrido</h2></div><button className="outline-btn" onClick={exportCsv}><ArrowDownToLine size={16} /> Exportar CSV</button></div>{workouts.length ? <div className="session-list">{workouts.map(w => <Session key={w.id} workout={w} person={person} expanded onDelete={() => setData(d => ({ ...d, workouts: d.workouts.filter(x => x.id !== w.id) }))} />)}</div> : <Empty title="Aún no hay entrenamientos" text="Cuando termines una sesión, aparecerá aquí con todos sus detalles." />}</section>}

      {tab === 'stats' && <section className="page-content"><div className="metric-grid"><Metric label="SESIONES" value={String(workouts.length)} detail="Histórico" /><Metric label="VOLUMEN" value={Math.round(totalVolume).toLocaleString('es-ES') + ' kg'} detail="Peso × repeticiones" /><Metric label="SERIES" value={String(sets.length)} detail="Completadas" /></div>
        <div className="panel chart-panel"><div className="section-title"><div><span className="eyebrow">FUERZA</span><h2>Mejores pesos por ejercicio</h2></div><Trophy size={21} /></div>{records.length ? <div className="bar-list">{records.map(([name, value]) => <div className="bar-item" key={name}><div><b>{name}</b><strong>{value} kg</strong></div><div className="bar-track"><i style={{ width: (value / Math.max(...records.map(x => x[1])) * 100) + '%' }} /></div></div>)}</div> : <Empty title="Todavía no hay marcas" text="Registra tus primeras series para ver tus progresos." />}</div>
        <div className="panel chart-panel"><div className="section-title"><div><span className="eyebrow">EVOLUCIÓN</span><h2>Volumen por sesión</h2></div><BarChart3 size={21} /></div>{workouts.length ? <div className="volume-bars">{workouts.slice(0, 8).reverse().map(w => <div className="volume-column" key={w.id}><div style={{ height: Math.max(5, vol(w.sets.filter(s => s.person === person)) / Math.max(1, ...workouts.map(x => vol(x.sets.filter(s => s.person === person)))) * 100) + '%' }} /><small>{new Date(w.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</small></div>)}</div> : <Empty title="Sin datos todavía" text="La gráfica se irá completando con cada entrenamiento." />}</div>
      </section>}

      {tab === 'goals' && <section className="page-content"><div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">OBJETIVOS PERSONALES</span><h2>Tu siguiente reto</h2></div><Target size={23} /></div><div className="form-grid"><label className="wide">Objetivo<input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ej. Entrenar 3 veces por semana" /></label><label>Meta numérica<input type="number" min="1" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} /></label></div><button className="primary-btn" onClick={createGoal}><Plus size={16} /> Añadir objetivo</button></div>
        <div className="goal-list">{data.goals.filter(g => g.person === person).map(g => <div className="panel goal-card" key={g.id}><div><span className="eyebrow">{names[g.person].toUpperCase()}</span><h3>{g.title}</h3><p>{g.current} / {g.target} avances</p></div><div className="goal-actions"><div className="goal-progress"><i style={{ width: Math.min(100, g.current / g.target * 100) + '%' }} /></div><button className="small-btn" onClick={() => setData(d => ({ ...d, goals: d.goals.map(x => x.id === g.id ? { ...x, current: Math.min(x.target, x.current + 1) } : x) }))}>+1 progreso</button><button className="icon-btn" onClick={() => setData(d => ({ ...d, goals: d.goals.filter(x => x.id !== g.id) }))}><Trash2 size={15} /></button></div></div>)}</div>{!data.goals.some(g => g.person === person) && <Empty title="Sin objetivos activos" text="Añade una meta para mantener el rumbo." />}</section>}

      {tab === 'profile' && <section className="page-content"><div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">DATOS Y PRIVACIDAD</span><h2>Perfil de {names[person]}</h2></div><HeartPulse size={22} /></div><p className="helper">Los datos de esta beta se guardan en este dispositivo. Aún no hay cuentas ni sincronización en la nube: el selector de perfil no sustituye un inicio de sesión.</p><div className="data-summary"><b>{workouts.length} entrenamientos</b><b>{sets.length} series</b><b>{data.routines.filter(r => r.owner === person || r.owner === 'shared').length} rutinas visibles</b></div><button className="outline-btn" onClick={exportCsv}><ArrowDownToLine size={16} /> Exportar series a CSV</button></div><div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">SEGUIMIENTO FÍSICO</span><h2>Mediciones corporales</h2></div><Activity size={22} /></div><div className="input-row"><label>Peso (kg)<input type="number" min="0" step="0.1" value={metricWeight} onChange={e => setMetricWeight(e.target.value)} placeholder="70.0" /></label><label>Cintura (cm)<input type="number" min="0" step="0.5" value={metricWaist} onChange={e => setMetricWaist(e.target.value)} placeholder="80" /></label></div><button className="primary-btn" onClick={addMetric}><Save size={16} /> Guardar medición</button><div className="history-sets">{data.metrics.filter(m => m.person === person).slice().reverse().slice(0,5).map(m => <span key={m.id}>{fmt(m.date)} · {m.weight ? m.weight + ' kg' : '—'} · {m.waist ? m.waist + ' cm cintura' : '—'}</span>)}</div></div><div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">RECUPERACIÓN</span><h2>¿Cómo te encuentras?</h2></div><HeartPulse size={22} /></div><div className="input-row"><label>Horas de sueño<input type="number" min="0" max="24" step="0.5" value={sleep} onChange={e => setSleep(e.target.value)} /></label><label>Sensaciones<select value={feeling} onChange={e => setFeeling(e.target.value)}><option value="1">1 · Muy mal</option><option value="2">2 · Mal</option><option value="3">3 · Normal</option><option value="4">4 · Bien</option><option value="5">5 · Muy bien</option></select></label></div><label>Fatiga (1–10)<input type="number" min="1" max="10" value={fatigue} onChange={e => setFatigue(e.target.value)} /></label><label>Notas<textarea value={recoveryNote} onChange={e => setRecoveryNote(e.target.value)} placeholder="Agujetas, energía, molestias..." /></label><button className="primary-btn" onClick={addRecovery}><HeartPulse size={16} /> Registrar recuperación</button><div className="history-sets">{data.recovery.filter(r => r.person === person).slice(0,5).map(r => <span key={r.id}>{fmt(r.date)} · {r.sleep} h sueño · sensaciones {r.feeling}/5 · fatiga {r.fatigue}/10</span>)}</div></div><div className="danger-zone"><div><b>Datos de este dispositivo</b><small>Exporta una copia antes de borrar los datos locales.</small></div><button className="outline-btn danger" onClick={() => { if (window.confirm('¿Borrar todos los datos guardados en este dispositivo?')) { localStorage.removeItem(KEY); setData(seed); setNotice('Datos locales reiniciados') } }}>Borrar datos</button></div></section>}

      <footer className="page-footer"><span>GYMLOG · BETA</span><span><Save size={13} /> Guardado automático en este dispositivo</span></footer>
    </main>
    {notice && <div className="toast"><Check size={16} />{notice}<button onClick={() => setNotice('')}><X size={14} /></button></div>}
    <nav className="mobile-nav">{nav.slice(0, 5).map(n => <button key={n.id} className={tab === n.id ? 'active' : ''} onClick={() => setTab(n.id)}><n.icon size={19} /><small>{n.label}</small></button>)}</nav>
  </div>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong><small><Activity size={14} /> {detail}</small></div> }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span><Dumbbell size={22} /></span><b>{title}</b><p>{text}</p></div> }
function Session({ workout, person, expanded = false, onDelete }: { workout: Workout; person: Person; expanded?: boolean; onDelete?: () => void }) {
  const sets = workout.sets.filter(s => s.person === person)
  return <article className="session-row"><div className="session-date"><CalendarDays size={17} /><span>{fmt(workout.date)}</span></div><div className="session-detail"><b>{workout.mode === 'together' ? 'Entrenamiento conjunto' : 'Entrenamiento individual'}</b><small>{sets.length} series · {new Set(sets.map(s => s.exercise)).size} ejercicios · {workout.duration} min</small>{expanded && <div className="history-sets">{sets.map(s => <span key={s.id}>{s.exercise}: {s.weight} kg × {s.reps} · RPE {s.rpe}</span>)}</div>}</div><strong className="session-volume">{Math.round(vol(sets)).toLocaleString('es-ES')} kg</strong>{onDelete && <button className="icon-btn" onClick={onDelete} aria-label="Eliminar entrenamiento"><Trash2 size={16} /></button>}</article>
}
