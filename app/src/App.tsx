import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Activity, ArrowDownToLine, BarChart3, CalendarDays, Check, ChevronRight, Clock3, Dumbbell, HeartPulse, History, Home, Plus, Save, Target, Timer, Trash2, Trophy, Users, X } from 'lucide-react'

export type Person = 'jorge' | 'marta'
type Mode = Person | 'together'
type Tab = 'home' | 'train' | 'routines' | 'history' | 'prs' | 'stats' | 'charts' | 'body' | 'goals' | 'profile'
type SetEntry = { id: string; exercise: string; person: Person; weight: number; reps: number; rpe: number; rest: number }
export type Workout = { id: string; date: string; mode: Mode; people: Person[]; sets: SetEntry[]; duration: number; note: string }
type Exercise = { id: string; name: string; sets: number; reps: number; rest: number }
type Routine = { id: string; name: string; owner: Person | 'shared'; exercises: Exercise[] }
type Goal = { id: string; person: Person; title: string; target: number; current: number }
type Metric = { id: string; person: Person; date: string; weight: number; waist: number }
type BodyProfile = { heightCm: number; age: number; sex: 'male' | 'female'; targetWeight: number }
type Recovery = { id: string; person: Person; date: string; sleep: number; feeling: number; fatigue: number; note: string }
export type AppData = { workouts: Workout[]; routines: Routine[]; goals: Goal[]; metrics: Metric[]; recovery: Recovery[]; bodyProfile?: BodyProfile; active: { mode: Mode; people: Person[]; startedAt: number; sets: SetEntry[]; note: string } | null }
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
function normalizeExercise(name:string){return name.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
function muscleGroup(name: string): string {
 const n=normalizeExercise(name);
 if(/patada de gluteo|kickback|hip thrust|puente de gluteos|abduccion de cadera/.test(n))return 'Glúteos';
 if(/patada de triceps|triceps|extension de codo|press frances|rompecraneos/.test(n))return 'Tríceps';
 if(/biceps|curl martillo|curl alterno|curl concentrado|curl spider|curl predicador/.test(n))return 'Bíceps';
 if(/sentadilla|prensa|extension de cuadriceps|zancada|step up|sissy squat/.test(n))return 'Cuádriceps';
 if(/peso muerto|curl femoral|rumano|buenos dias|nordic/.test(n))return 'Isquiosurales';
 if(/press banca|press inclinado|apertura|flexiones|peck deck|cruce de poleas|pullover/.test(n))return 'Pecho';
 if(/remo|jalon|dominada|pull.?down|encogimiento|shrug/.test(n))return 'Espalda';
 if(/press militar|elevacion lateral|face pull|pajaro|hombro|arnold/.test(n))return 'Hombros';
 if(/plancha|abdominal|crunch|dead bug|pallof|rueda abdominal/.test(n))return 'Core';
 if(/gemelo|soleo|elevacion de talones/.test(n))return 'Gemelos';
 if(/antebrazo|wrist curl|agarre|farmer/.test(n))return 'Antebrazos';
 return 'Otros';
}
const exerciseCatalog = ['Press banca con barra','Press banca con mancuernas','Press inclinado con barra','Press inclinado con mancuernas','Press declinado','Press en máquina convergente','Aperturas con mancuernas','Aperturas en polea','Cruce de poleas','Peck deck','Flexiones','Flexiones inclinadas','Pullover con mancuerna','Press militar con barra','Press militar con mancuernas','Press Arnold','Elevaciones laterales con mancuernas','Elevaciones laterales en polea','Elevaciones frontales','Pájaros con mancuernas','Pájaros en máquina','Face pull','Remo al mentón','Remo con barra','Remo Pendlay','Remo con mancuerna','Remo en polea baja','Remo sentado','Remo pecho apoyado','Remo en máquina','Jalón al pecho agarre ancho','Jalón al pecho agarre estrecho','Jalón agarre neutro','Jalón unilateral','Dominadas pronas','Dominadas supinas','Dominadas asistidas','Peso muerto convencional','Peso muerto sumo','Hiperextensiones lumbares','Encogimientos de trapecio','Curl de bíceps con barra','Curl de bíceps con barra Z','Curl alterno con mancuernas','Curl martillo','Curl martillo cruzado','Curl concentrado','Curl predicador','Curl Scott con barra Z','Curl en polea baja','Curl en polea alta','Curl bayesian','Curl spider','Curl en banco inclinado','Curl de bíceps en máquina','Curl 21','Press francés con barra Z','Press francés con mancuernas','Extensión de tríceps en polea','Extensión de tríceps con cuerda','Extensión de tríceps por encima de la cabeza','Extensión unilateral en polea','Patada de tríceps','Fondos en paralelas','Fondos asistidos','Rompecráneos','Press banca agarre cerrado','Sentadilla con barra','Sentadilla frontal','Sentadilla goblet','Sentadilla búlgara','Sentadilla hack','Prensa inclinada','Prensa horizontal','Extensión de cuádriceps','Sissy squat','Zancadas caminando','Zancadas inversas','Step-up al cajón','Peso muerto rumano','Peso muerto piernas rígidas','Curl femoral tumbado','Curl femoral sentado','Curl femoral unilateral','Nordic curl','Buenos días','Hip thrust con barra','Hip thrust en máquina','Puente de glúteos','Patada de glúteo en polea','Abducción de cadera en máquina','Abducción de cadera en polea','Peso muerto a una pierna','Gemelos de pie','Gemelos sentado','Gemelos en prensa','Elevación de talones unilateral','Plancha','Plancha lateral','Crunch abdominal','Crunch en polea','Elevación de piernas','Elevación de rodillas colgado','Rueda abdominal','Dead bug','Pallof press','Russian twist','Curl de muñeca','Curl inverso de muñeca','Farmer walk','Agarre de pinza']
function muscleTargets(name:string):string[]{
 const n=normalizeExercise(name);
 // Glúteo y cadera: reglas específicas antes de cualquier término genérico como "patada".
 if(/patada de gluteo|kickback|hip thrust|puente de gluteos/.test(n))return ['glutes','hamstrings'];
 if(/abduccion de cadera/.test(n))return ['abductors','glutes'];
 if(/aduccion de cadera/.test(n))return ['adductors'];
 if(/patada de triceps|extension de triceps|extension unilateral en polea|press frances|rompecraneos|fondos|press banca agarre cerrado/.test(n))return ['triceps'];
 if(/curl.*biceps|biceps|martillo|curl predicador|curl scott/.test(n))return ['biceps','forearms'];
 if(/sentadilla|prensa|extension de cuadriceps|zancada|step.?up|sissy squat/.test(n))return ['quadriceps','glutes','adductors'];
 if(/peso muerto|curl femoral|rumano|buenos dias|nordic|hiperextension/.test(n))return ['hamstrings','glutes','lower back'];
 if(/press banca|press inclinado|press declinado|apertura|flexiones|peck deck|cruce de poleas|press en maquina/.test(n))return ['chest','triceps','shoulders'];
 if(/pullover/.test(n))return ['lats','chest'];
 if(/remo al menton/.test(n))return ['shoulders','traps'];
 if(/remo/.test(n))return ['middle back','lats','biceps'];
 if(/jalon|dominada|pull.?down/.test(n))return ['lats','biceps','middle back'];
 if(/encogimiento|shrug/.test(n))return ['traps'];
 if(/press militar|press arnold|elevacion lateral|elevacion frontal|face pull|pajaro/.test(n))return ['shoulders','triceps','traps'];
 if(/plancha|abdominal|crunch|dead bug|pallof|rueda abdominal|elevacion de piernas|russian twist/.test(n))return ['abdominals'];
 if(/gemelo|soleo|elevacion de talones/.test(n))return ['calves'];
 if(/antebrazo|curl de muneca|agarre|farmer/.test(n))return ['forearms'];
 return [];
}
function sessionMuscleGroups(active:AppData['active'], exercise:string, customExercise:string):string[]{
 const groups=new Set<string>();
 active?.sets.forEach(set=>muscleTargets(set.exercise).forEach(group=>groups.add(group)));
 const selected=exercise==='__custom__'?customExercise.trim():exercise.trim();
 if(selected)muscleTargets(selected).forEach(group=>groups.add(group));
 return [...groups];
}
function bodyFatEstimate(weight:number,heightCm:number,age:number,sex:'male'|'female'){if(!weight||!heightCm||!age)return null;const bmi=weight/((heightCm/100)**2);return Math.max(3,Math.min(60,1.2*bmi+0.23*age-(sex==='male'?10.8:0)-5.4));}


type AppProps = {
  initialData?: AppData
  currentPerson?: Person
  partnerPerson?: Person | null
  partnerUserId?: string | null
  cloudEnabled?: boolean
  groupInviteCode?: string
  onWorkoutSave?: (ownWorkout: Workout, partnerWorkout: Workout | null) => Promise<void>
  onWorkoutDelete?: (workoutId: string) => Promise<void>
  onProfileSave?: (data: AppData) => Promise<void>
  onSignOut?: () => void
}

export default function App({ initialData, currentPerson, partnerPerson, partnerUserId, cloudEnabled = false, groupInviteCode, onWorkoutSave, onWorkoutDelete, onProfileSave, onSignOut }: AppProps) {
  const [data, setData] = useState<AppData>(() => initialData ?? load())
  const [tab, setTab] = useState<Tab>('train')
  const [person, setPerson] = useState<Person>(currentPerson ?? 'jorge')
  const [exercise, setExercise] = useState('')
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [exerciseOpen, setExerciseOpen] = useState(false)
  const [customExercise, setCustomExercise] = useState('')
  const [finishing, setFinishing] = useState(false)
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
  const [historyExercise, setHistoryExercise] = useState('')
  const [historyRange, setHistoryRange] = useState('all')
  const [heightCm, setHeightCm] = useState('')
  const [ageYears, setAgeYears] = useState('')
  const [bodySex, setBodySex] = useState<'male'|'female'>('male')
  const [targetWeight, setTargetWeight] = useState('')
  const [sleep, setSleep] = useState('8')
  const [feeling, setFeeling] = useState('4')
  const [fatigue, setFatigue] = useState('3')
  const [recoveryNote, setRecoveryNote] = useState('')
  const [timer, setTimer] = useState(0)
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => { if (!cloudEnabled) localStorage.setItem(KEY, JSON.stringify(data)) }, [data, cloudEnabled])
  useEffect(() => { if (initialData) { setData(initialData); if (initialData.bodyProfile) { setHeightCm(String(initialData.bodyProfile.heightCm || '')); setAgeYears(String(initialData.bodyProfile.age || '')); setBodySex(initialData.bodyProfile.sex || 'male'); setTargetWeight(String(initialData.bodyProfile.targetWeight || '')) } } }, [initialData])
  useEffect(() => { if (currentPerson) { setPerson(currentPerson); setRoutineOwner(currentPerson) } }, [currentPerson])
  useEffect(() => {
    if (!cloudEnabled || !onProfileSave) return
    const id = window.setTimeout(() => { void onProfileSave(data).catch(() => setNotice('No se pudieron sincronizar los cambios')) }, 650)
    return () => window.clearTimeout(id)
  }, [data, cloudEnabled, onProfileSave])
  useEffect(() => { if (!running || timer <= 0) return; const id = window.setInterval(() => setTimer(t => { if (t <= 1) { setRunning(false); return 0 } return t - 1 }), 1000); return () => window.clearInterval(id) }, [running, timer])
  useEffect(() => { if (!notice) return; const id = window.setTimeout(() => setNotice(''), 2400); return () => window.clearTimeout(id) }, [notice])

  const workouts = data.workouts.filter(w => w.people.includes(person))
  const sets = workouts.flatMap(w => w.sets.filter(s => s.person === person))
  const totalVolume = vol(sets)
  const week = workouts.filter(w => Date.now() - new Date(w.date + 'T23:59:59').getTime() < 604800000).length
  const records = useMemo(() => {
    const best = new Map<string, number>()
    workouts.forEach(w => w.sets.filter(s => s.person === person).forEach(s => best.set(s.exercise, Math.max(best.get(s.exercise) || 0, s.weight))))
    return Array.from(best.entries()).sort((a, b) => b[1] - a[1])
  }, [workouts, person])
  const oneRepMax = useMemo(() => {
    const best = new Map<string, number>()
    sets.forEach(s => best.set(s.exercise, Math.max(best.get(s.exercise) || 0, estimatedOneRepMax(s.weight, s.reps))))
    return Array.from(best.entries()).sort((a, b) => b[1] - a[1])
  }, [sets])
  const muscleVolumes = useMemo(() => {
    const totals = new Map<string, number>()
    sets.forEach(s => { const group = muscleGroup(s.exercise); totals.set(group, (totals.get(group) || 0) + s.weight * s.reps) })
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  }, [sets])

  function start(next: Mode, firstExercise = '') {
    const people: Person[] = next === 'together' ? ['jorge', 'marta'] : [next]
    setSetPerson(people.includes(person) ? person : people[0])
    setData(d => ({ ...d, active: { mode: next, people, startedAt: Date.now(), sets: [], note: '' } }))
    setExercise(firstExercise); setExerciseSearch(firstExercise); setCustomExercise(''); setExerciseOpen(false)
    setTab('train'); setNotice('Entrenamiento iniciado')
  }
  function addSet() {
    if (!data.active) return
    const p = data.active.people.includes(activeSetPerson) ? activeSetPerson : data.active.people[0]
    const chosenExercise=exercise==='__custom__'?customExercise.trim():exercise.trim()
    if(!chosenExercise){setNotice('Selecciona o escribe un ejercicio');return}
    const entry: SetEntry = { id: uid(), exercise: chosenExercise || 'Ejercicio', person: p, weight: Math.max(0, Number(weight) || 0), reps: Math.max(0, Number(reps) || 0), rpe: Math.min(10, Math.max(1, Number(rpe) || 7)), rest: Math.max(0, Number(rest) || 0) }
    setData(d => d.active ? { ...d, active: { ...d.active, sets: [...d.active.sets, entry] } } : d)
    setTimer(entry.rest); setRunning(true); setNotice('Serie guardada · ' + names[p])
  }
  async function finish() {
    if (!data.active) return
    if (!data.active.sets.length) { setNotice('Añade al menos una serie'); return }
    const a = data.active
    const workout: Workout = { id: uid(), date: today(), mode: a.mode, people: a.people, sets: a.sets, duration: Math.max(1, Math.round((Date.now() - a.startedAt) / 60000)), note: a.note }
    setFinishing(true)
    if (cloudEnabled && onWorkoutSave) {
      const ownWorkout: Workout = { ...workout, people: [person], sets: workout.sets.filter(s => s.person === person) }
      const partnerWorkout = a.mode === 'together' && partnerPerson && partnerUserId
        ? { ...workout, people: [partnerPerson], sets: workout.sets.filter(s => s.person === partnerPerson) }
        : null
      if (!ownWorkout.sets.length) { setNotice('Añade al menos una serie de tu perfil'); setFinishing(false); return }
      if (a.mode === 'together' && (!partnerWorkout || !partnerWorkout.sets.length)) { setNotice('Faltan series de la otra persona'); setFinishing(false); return }
      try { await onWorkoutSave(ownWorkout, partnerWorkout) }
      catch (e) { setNotice('Error al sincronizar: '+(e instanceof Error?e.message:'revisa tu conexión')); setFinishing(false); return }
      setData(d => ({ ...d, workouts: [ownWorkout, ...d.workouts], active: null }))
    } else {
      setData(d => ({ ...d, workouts: [workout, ...d.workouts], active: null }))
    }
    setRunning(false); setTimer(0); setTab('history'); setNotice('Entrenamiento guardado'); setFinishing(false)
  }
  async function deleteWorkout(workoutId: string) {
    if (cloudEnabled && onWorkoutDelete) {
      try { await onWorkoutDelete(workoutId) }
      catch (e) { setNotice('No se pudo eliminar: ' + (e instanceof Error ? e.message : 'revisa la conexión')); return }
    }
    setData(d => ({ ...d, workouts: d.workouts.filter(w => w.id !== workoutId) }))
    setNotice('Entrenamiento eliminado')
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
  function saveBodyProfile() {
    const h = Number(heightCm), age = Number(ageYears), target = Number(targetWeight)
    if (h < 100 || h > 230 || age < 15 || age > 100 || target < 30 || target > 300) { setNotice('Revisa altura, edad y peso objetivo'); return }
    setData(d => ({ ...d, bodyProfile: { heightCm: h, age, sex: bodySex, targetWeight: target } }))
    setNotice('Perfil corporal guardado')
  }
  function addMetric() {
    if (!(Number(metricWeight) > 0) || Number(metricWeight) > 400 || (metricWaist && (Number(metricWaist) < 30 || Number(metricWaist) > 250))) { setNotice('Introduce un peso válido y, si quieres, una cintura válida'); return }
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
    { id: 'train', label: 'ENTRENO', icon: Dumbbell }, { id: 'routines', label: 'RUTINAS', icon: CalendarDays },
    { id: 'history', label: 'HISTORIAL', icon: History }, { id: 'prs', label: 'PRs', icon: Trophy },
    { id: 'stats', label: 'STATS', icon: Activity }, { id: 'charts', label: 'GRÁFICAS', icon: BarChart3 },
    { id: 'body', label: 'CUERPO', icon: HeartPulse }
  ]

  return <div className="layout">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('train') }}><span className="brand-icon"><Dumbbell size={19} /></span><span>gym<span>log</span></span></a>
      <div className="side-label">TU ESPACIO</div>
      <nav>{nav.map(n => <button key={n.id} className={'nav-item ' + (tab === n.id ? 'active' : '')} onClick={() => setTab(n.id)}><n.icon size={18} /><span>{n.label}</span>{n.id === 'train' && data.active && <i />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><Activity size={16} /><span>Guardado automático<br /><b>{cloudEnabled ? 'Sincronizado' : 'En este dispositivo'}</b></span></div><small>GYMLOG · {cloudEnabled ? 'CLOUD' : 'BETA LOCAL'}</small></div>
    </aside>
    <main className="main">
      <header className="mobile-header"><a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('home') }}><span className="brand-icon"><Dumbbell size={18} /></span><span>gym<span>log</span></span></a><span className="local-pill"><i /> {cloudEnabled ? 'Nube' : 'Local'}</span></header>
      <div className="page-top"><div><div className="eyebrow">TU ENTRENAMIENTO · VUESTRO PROGRESO</div><h1>{nav.find(n => n.id === tab)?.label}</h1></div><div className="person-switch">{cloudEnabled
        ? <button className={'chosen ' + person}><span>{person === 'jorge' ? 'J' : 'M'}</span>{names[person]}</button>
        : (['jorge', 'marta'] as Person[]).map(p => <button key={p} className={person === p ? 'chosen ' + p : ''} onClick={() => setPerson(p)}><span>{p === 'jorge' ? 'J' : 'M'}</span>{names[p]}</button>)}</div></div>

      {tab === 'home' && <section className="page-content">
        <div className="welcome-card"><div><span className="eyebrow">HOLA, {names[person].toUpperCase()}</span><h2>Hoy cuenta.<br /><em>Vamos a por ello.</em></h2><p>Tu progreso, sesión a sesión.</p><button className="primary-btn" onClick={() => start(person)}><Dumbbell size={17} /> Empezar entrenamiento</button></div><div className="welcome-art"><div className="art-ring"><Dumbbell size={64} /></div><span>01 / CONSTANCIA</span></div></div>
        <div className="metric-grid"><Metric label="ENTRENAMIENTOS · 7 DÍAS" value={String(week)} detail="Esta semana" /><Metric label="VOLUMEN TOTAL" value={Math.round(totalVolume).toLocaleString('es-ES') + ' kg'} detail="Carga acumulada" /><Metric label="SERIES REGISTRADAS" value={String(sets.length)} detail="Trabajo realizado" /></div>
        <div className="section-title"><div><span className="eyebrow">TU ACTIVIDAD</span><h2>Últimas sesiones</h2></div><button className="text-btn" onClick={() => setTab('history')}>Ver historial <ChevronRight size={15} /></button></div>
        {workouts.length ? <div className="session-list">{workouts.slice(0, 4).map(w => <Session key={w.id} workout={w} person={person} />)}</div> : <Empty title="Tu primera sesión empieza aquí" text="Registra tu entrenamiento y verás aparecer tu evolución." />}
        <div className="section-title"><div><span className="eyebrow">ACCESO RÁPIDO</span><h2>Tu espacio</h2></div></div>
        <div className="quick-grid">{nav.filter(n => ['routines', 'history', 'prs', 'stats', 'charts', 'body'].includes(n.id)).map(n => <button className="quick-card" key={n.id} onClick={() => setTab(n.id)}><n.icon size={20} /><b>{n.label}</b><ChevronRight size={16} /></button>)}</div>
      </section>}

      {tab === 'train' && <section className="page-content">
        {!data.active ? <div className="panel start-panel"><div className="panel-heading"><div><span className="eyebrow">NUEVA SESIÓN</span><h2>¿Cómo vais a entrenar?</h2></div><Dumbbell size={24} /></div><div className="mode-grid">{cloudEnabled
            ? <button onClick={() => start(person)}><span className={'person-bubble ' + person}>{person === 'jorge' ? 'J' : 'M'}</span><b>{names[person]}</b><small>Individual</small></button>
            : <><button onClick={() => start('jorge')}><span className="person-bubble jorge">J</span><b>Jorge</b><small>Individual</small></button><button onClick={() => start('marta')}><span className="person-bubble marta">M</span><b>Marta</b><small>Individual</small></button></>}
            {(!cloudEnabled || partnerPerson) && <button onClick={() => start('together')}><span className="person-bubble joint"><Users size={20} /></span><b>Juntos</b><small>Un móvil, dos registros</small></button>}</div><p className="helper">En modo conjunto, cada serie queda vinculada a la persona seleccionada.</p></div> : <>
          <div className="active-banner"><div><i /> SESIÓN EN CURSO <b>· {data.active.mode === 'together' ? 'Juntos' : names[data.active.people[0]]}</b></div><div className="active-actions"><button type="button" className="outline-btn" onClick={()=>{if(window.confirm('¿Descartar esta sesión? Se perderán las series que no hayas guardado como entrenamiento.')){setData(d=>({...d,active:null}));setExercise('');setExerciseSearch('');setCustomExercise('');setRunning(false);setTimer(0);setNotice('Sesión descartada')}}}>Descartar</button><button className="finish-btn" onClick={finish} disabled={finishing}><Check size={16} /> {finishing?'Guardando…':'Finalizar'}</button></div></div>
          <div className="panel workout-muscle-panel"><div className="section-title"><div><span className="eyebrow">MÚSCULOS DE ESTA SESIÓN</span><h2>Mapa muscular</h2></div><Activity size={20}/></div><BodyMap active={sessionMuscleGroups(data.active, exercise, customExercise)}/><p className="helper">Solo se resaltan los músculos de los ejercicios registrados en esta sesión y del ejercicio que tengas seleccionado. Si no hay ninguno, el cuerpo queda neutro.</p></div>
          <div className="training-grid"><div className="panel log-panel"><div className="panel-heading"><div><span className="eyebrow">REGISTRO DE SERIES</span><h2>Añadir serie</h2></div><Dumbbell size={22} /></div>
            <div className="exercise-picker"><label htmlFor="exercise-search">Ejercicio</label><div className="exercise-search-wrap"><input id="exercise-search" type="search" value={exerciseSearch} onFocus={()=>{setExerciseSearch('');setExerciseOpen(true)}} onChange={e=>{setExerciseSearch(e.target.value);setExerciseOpen(true)}} placeholder="Escribe un ejercicio, por ejemplo press…"/><span className="picker-chevron">⌕</span></div>{exerciseOpen&&<div className="exercise-options">{Array.from(new Set([...exerciseCatalog,...data.routines.flatMap(r=>r.exercises.map(e=>e.name))])) .filter(name=>{const q=exerciseSearch.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();const n=name.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');const g=muscleGroup(name).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return !q||n.includes(q)||g.includes(q)}).map(name=><button type="button" key={name} className={'exercise-option '+(exercise===name?'selected':'')} onClick={()=>{setExercise(name);setExerciseSearch(name);setExerciseOpen(false);const previous=workouts.flatMap(w=>w.sets.filter(x=>x.person===person&&x.exercise===name).map(x=>({date:w.date,weight:x.weight,reps:x.reps}))).sort((a,b)=>b.date.localeCompare(a.date))[0];if(previous){setWeight(String(previous.weight));setReps(String(previous.reps));setNotice('Última carga recuperada: '+previous.weight+' kg')}}}><ExerciseThumb name={name}/><span className="exercise-option-copy"><b>{name}</b><small>{muscleGroup(name)}</small></span><ChevronRight size={15}/></button>)}{!Array.from(new Set([...exerciseCatalog,...data.routines.flatMap(r=>r.exercises.map(e=>e.name))])).some(name=>name.toLocaleLowerCase('es').includes(exerciseSearch.toLocaleLowerCase('es')))&&<p className="no-exercise-results">No hay coincidencias. Puedes añadirlo como ejercicio personalizado.</p>}<button type="button" className="custom-option" onClick={()=>{setExercise('__custom__');setExerciseSearch('');setExerciseOpen(false)}}>＋ Añadir ejercicio personalizado</button></div>}{exercise==='__custom__'&&<input className="custom-exercise-input" value={customExercise} onChange={e=>setCustomExercise(e.target.value)} placeholder="Escribe el nombre del ejercicio"/>}<small className="selected-exercise">{exercise ? <>Seleccionado: {exercise==='__custom__'?(customExercise||'Personalizado'):exercise} · <button type="button" className="clear-exercise" onClick={()=>{setExercise('');setExerciseSearch('');setCustomExercise('')}}>Quitar selección</button></> : 'Ningún ejercicio seleccionado'}</small></div>
            {data.active.people.length > 1 && <div className="field"><span>¿De quién es esta serie?</span><div className="person-pills">{data.active.people.map(p => <button key={p} className={activeSetPerson === p ? 'selected ' + p : ''} onClick={() => setSetPerson(p)}>{names[p]}</button>)}</div></div>}
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
        {data.routines.filter(r => r.owner === person || r.owner === 'shared').map(r => <article className="panel routine-card" key={r.id}><div className="routine-top"><span className="routine-icon"><Dumbbell size={20} /></span><span className="tag">{r.owner === 'shared' ? 'COMPARTIDA' : names[r.owner].toUpperCase()}</span></div><h3>{r.name}</h3><p>{r.exercises.length} ejercicios · {r.exercises.reduce((n, e) => n + e.sets, 0)} series previstas</p><div className="exercise-chips">{r.exercises.map(e => <span key={e.id}>{e.name}</span>)}</div><button className="primary-btn full" onClick={() => { start(r.owner === 'shared' ? person : r.owner, r.exercises[0]?.name || '') }}>Usar rutina <ChevronRight size={16} /></button><button className="delete-routine" onClick={() => setData(d => ({ ...d, routines: d.routines.filter(x => x.id !== r.id) }))}><Trash2 size={14} /> Eliminar</button></article>)}</div>
        <div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">PERSONALIZA</span><h2>Crear rutina</h2></div><Plus size={22} /></div><div className="form-grid"><label>Nombre<input value={routineName} onChange={e => setRoutineName(e.target.value)} placeholder="Ej. Full body B" /></label><label>Asignar a<select value={routineOwner} onChange={e => setRoutineOwner(e.target.value as Person | 'shared')}><option value={person}>{names[person]}</option>{!cloudEnabled && <><option value="jorge">Jorge</option><option value="marta">Marta</option></>}<option value="shared">Compartida</option></select></label><label className="wide">Ejercicios separados por comas<textarea value={routineExercises} onChange={e => setRoutineExercises(e.target.value)} /></label></div><button className="primary-btn" onClick={createRoutine}><Plus size={16} /> Guardar rutina</button></div>
      </section>}

      {tab === 'history' && <section className="page-content"><div className="section-title"><div><span className="eyebrow">REGISTRO COMPLETO</span><h2>Historial por ejercicio y día</h2></div><button className="outline-btn" onClick={exportCsv}><ArrowDownToLine size={16} /> Exportar CSV</button></div><div className="panel create-panel history-filter"><label>Filtrar ejercicio<select value={historyExercise} onChange={e=>setHistoryExercise(e.target.value)}><option value="">Todos los ejercicios</option>{Array.from(new Set(sets.map(x=>x.exercise))).sort().map(x=><option key={x}>{x}</option>)}</select></label><label>Periodo<select value={historyRange} onChange={e=>setHistoryRange(e.target.value)}><option value="all">Todo el historial</option><option value="90">Últimos 90 días</option><option value="30">Últimos 30 días</option></select></label></div>{historyExercise && <div className="panel previous-load"><span className="eyebrow">REFERENCIA PARA TU PRÓXIMA SESIÓN</span>{(()=>{const prev=workouts.flatMap(w=>w.sets.filter(x=>x.person===person&&x.exercise===historyExercise).map(x=>({date:w.date,weight:x.weight,reps:x.reps}))).sort((a,b)=>b.date.localeCompare(a.date))[0];return prev?<><h2>{prev.weight} kg × {prev.reps}</h2><p>Último registro · {fmt(prev.date)}</p></>:<p>Sin registros anteriores para este ejercicio.</p>})()}</div>}{workouts.length ? <div className="session-list">{workouts.filter(w=>(historyRange==='all'||Date.now()-new Date(w.date+'T23:59:59').getTime()<=Number(historyRange)*86400000)&&(!historyExercise||w.sets.some(x=>x.person===person&&x.exercise===historyExercise))).map(w=><Session key={w.id} workout={w} person={person} expanded onDelete={() => { void deleteWorkout(w.id) }} />)}</div> : <Empty title="Aún no hay entrenamientos" text="Cuando termines una sesión, aparecerá aquí con todos sus detalles." />}</section>}

      {tab === 'prs' && <section className="page-content"><div className="section-title"><div><span className="eyebrow">PERSONAL RECORDS</span><h2>Tus mejores marcas</h2></div><Trophy size={22}/></div><div className="metric-grid"><Metric label="EJERCICIOS CON MARCA" value={String(records.length)} detail="Con peso registrado"/><Metric label="MEJOR 1RM ESTIMADO" value={oneRepMax.length?Math.max(...oneRepMax.map(x=>x[1])).toFixed(1)+' kg':'—'} detail="Fórmula Epley"/><Metric label="SERIES REGISTRADAS" value={String(sets.length)} detail="Histórico"/></div><div className="panel chart-panel"><div className="section-title"><div><span className="eyebrow">RÉCORD POR EJERCICIO</span><h2>Mejor peso levantado</h2></div></div>{records.length?<div className="bar-list">{records.map(([name,value])=><div className="bar-item" key={name}><div><b>{name}</b><strong>{value} kg</strong></div><div className="bar-track"><i style={{width:(value/Math.max(...records.map(x=>x[1]))*100)+'%'}}/></div></div>)}</div>:<Empty title="Aún no hay PRs" text="Tus mejores marcas aparecerán al registrar entrenamientos."/ >}</div><div className="panel chart-panel"><div className="section-title"><div><span className="eyebrow">FUERZA ESTIMADA</span><h2>1 repetición máxima</h2></div></div>{oneRepMax.map(([name,value])=><div className="set-row" key={name}><div className="set-main"><b>{name}</b><small>1RM estimado</small></div><strong>{value.toFixed(1)} kg</strong></div>)}</div></section>}
      {tab === 'charts' && <section className="page-content"><div className="section-title"><div><span className="eyebrow">EVOLUCIÓN</span><h2>Gráficas de rendimiento</h2></div><BarChart3 size={22}/></div><div className="panel chart-panel"><h2>Volumen por semana</h2><div className="trend-bars">{Array.from({length:8},(_,i)=>{const startDate=new Date();startDate.setDate(startDate.getDate()-((7-i)*7));const endDate=new Date(startDate);endDate.setDate(endDate.getDate()+7);const v=workouts.filter(w=>{const d=new Date(w.date+'T12:00:00');return d>=startDate&&d<endDate}).reduce((n,w)=>n+vol(w.sets.filter(x=>x.person===person)),0);return <div className="trend-column" key={i}><div className="trend-bar" style={{height:Math.max(4,v/(Math.max(1,...workouts.map(w=>vol(w.sets)))*1.15)*150)+'px'}}/><small>{startDate.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})}</small><b>{Math.round(v).toLocaleString('es-ES')}</b></div>})}</div></div><div className="panel chart-panel"><h2>Evolución de fuerza por ejercicio</h2><label>Ejercicio<select value={historyExercise} onChange={e=>setHistoryExercise(e.target.value)}><option value="">Selecciona ejercicio</option>{Array.from(new Set(sets.map(x=>x.exercise))).sort().map(x=><option key={x}>{x}</option>)}</select></label>{historyExercise&&<div className="trend-bars">{workouts.slice().reverse().filter(w=>w.sets.some(x=>x.person===person&&x.exercise===historyExercise)).map(w=><div className="trend-column" key={w.id}><div className="trend-bar" style={{height:Math.max(4,Math.max(...w.sets.filter(x=>x.person===person&&x.exercise===historyExercise).map(x=>x.weight))/Math.max(1,...sets.filter(x=>x.exercise===historyExercise).map(x=>x.weight))*150)+'px'}}/><small>{fmt(w.date)}</small><b>{Math.max(...w.sets.filter(x=>x.person===person&&x.exercise===historyExercise).map(x=>x.weight))} kg</b></div>)}</div>}</div></section>}
      {tab === 'body' && <section className="page-content"><div className="section-title"><div><span className="eyebrow">COMPOSICIÓN Y EVOLUCIÓN</span><h2>Tu cuerpo, tus datos</h2></div><HeartPulse size={22}/></div><div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">PERFIL CORPORAL</span><h2>Datos de referencia</h2></div></div><div className="form-grid"><label>Altura (cm)<input type="number" min="100" max="230" value={heightCm} onChange={e=>setHeightCm(e.target.value)} placeholder="178"/></label><label>Edad<input type="number" min="15" max="100" value={ageYears} onChange={e=>setAgeYears(e.target.value)} placeholder="27"/></label><label>Sexo para fórmula<select value={bodySex} onChange={e=>setBodySex(e.target.value as 'male'|'female')}><option value="male">Hombre</option><option value="female">Mujer</option></select></label><label>Peso objetivo (kg)<input type="number" min="30" max="300" step="0.1" value={targetWeight} onChange={e=>setTargetWeight(e.target.value)} placeholder="65"/></label></div><button className="outline-btn" onClick={saveBodyProfile}><Save size={16}/> Guardar perfil</button><BodyStats metrics={data.metrics.filter(m=>m.person===person)} heightCm={Number(heightCm)} age={Number(ageYears)} sex={bodySex} targetWeight={Number(targetWeight)}/><div className="input-row"><label>Peso (kg)<input type="number" min="0" step="0.1" value={metricWeight} onChange={e=>setMetricWeight(e.target.value)} placeholder="70.0"/></label><label>Cintura (cm)<input type="number" min="0" step="0.5" value={metricWaist} onChange={e=>setMetricWaist(e.target.value)} placeholder="80"/></label></div><button className="primary-btn" onClick={addMetric}><Save size={16}/> Guardar peso y medición</button><div className="history-sets">{data.metrics.filter(m=>m.person===person).slice().reverse().map(m=><span key={m.id}>{fmt(m.date)} · {m.weight?m.weight+' kg':'—'} · IMC {heightCm&&m.weight?(m.weight/((Number(heightCm)/100)**2)).toFixed(1):'—'} · {m.waist?m.waist+' cm cintura':'sin cintura'}</span>)}</div></div></section>}
      {tab === 'stats' && <section className="page-content"><div className="metric-grid"><Metric label="SESIONES" value={String(workouts.length)} detail="Histórico" /><Metric label="VOLUMEN" value={Math.round(totalVolume).toLocaleString('es-ES') + ' kg'} detail="Peso × repeticiones" /><Metric label="SERIES" value={String(sets.length)} detail="Completadas" /></div>
        <div className="panel chart-panel"><div className="section-title"><div><span className="eyebrow">FUERZA</span><h2>Mejores pesos por ejercicio</h2></div><Trophy size={21} /></div>{records.length ? <div className="bar-list">{records.map(([name, value]) => <div className="bar-item" key={name}><div><b>{name}</b><strong>{value} kg</strong></div><div className="bar-track"><i style={{ width: (value / Math.max(...records.map(x => x[1])) * 100) + '%' }} /></div></div>)}</div> : <Empty title="Todavía no hay marcas" text="Registra tus primeras series para ver tus progresos." />}</div>
        <div className="panel chart-panel"><div className="section-title"><div><span className="eyebrow">ESTIMACIÓN</span><h2>1RM estimado por ejercicio</h2></div><Trophy size={21} /></div>{oneRepMax.length ? <div className="bar-list">{oneRepMax.map(([name, value]) => <div className="bar-item" key={name}><div><b>{name}</b><strong>{value.toFixed(1)} kg</strong></div></div>)}</div> : <Empty title="Sin estimaciones" text="Añade series con peso y repeticiones." />}</div>
         <div className="panel chart-panel"><div className="section-title"><div><span className="eyebrow">GRUPOS MUSCULARES</span><h2>Volumen registrado</h2></div><Activity size={21} /></div>{muscleVolumes.length ? <div className="bar-list">{muscleVolumes.map(([name, value]) => <div className="bar-item" key={name}><div><b>{name}</b><strong>{Math.round(value).toLocaleString('es-ES')} kg</strong></div><div className="bar-track"><i style={{ width: (value / Math.max(...muscleVolumes.map(x => x[1])) * 100) + '%' }} /></div></div>)}</div> : <Empty title="Sin datos musculares" text="Registra tus ejercicios para ver el volumen por grupo muscular." />}</div>
      </section>}

      {tab === 'goals' && <section className="page-content"><div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">OBJETIVOS PERSONALES</span><h2>Tu siguiente reto</h2></div><Target size={23} /></div><div className="form-grid"><label className="wide">Objetivo<input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ej. Entrenar 3 veces por semana" /></label><label>Meta numérica<input type="number" min="1" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} /></label></div><button className="primary-btn" onClick={createGoal}><Plus size={16} /> Añadir objetivo</button></div>
        <div className="goal-list">{data.goals.filter(g => g.person === person).map(g => <div className="panel goal-card" key={g.id}><div><span className="eyebrow">{names[g.person].toUpperCase()}</span><h3>{g.title}</h3><p>{g.current} / {g.target} avances</p></div><div className="goal-actions"><div className="goal-progress"><i style={{ width: Math.min(100, g.current / g.target * 100) + '%' }} /></div><button className="small-btn" onClick={() => setData(d => ({ ...d, goals: d.goals.map(x => x.id === g.id ? { ...x, current: Math.min(x.target, x.current + 1) } : x) }))}>+1 progreso</button><button className="icon-btn" onClick={() => setData(d => ({ ...d, goals: d.goals.filter(x => x.id !== g.id) }))}><Trash2 size={15} /></button></div></div>)}</div>{!data.goals.some(g => g.person === person) && <Empty title="Sin objetivos activos" text="Añade una meta para mantener el rumbo." />}</section>}

      {tab === 'profile' && <section className="page-content">{cloudEnabled && groupInviteCode && <div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">INVITACIÓN AL GRUPO</span><h2>Comparte GymLog</h2></div><Users size={22} /></div><p className="helper">Marta puede unirse cuando quiera con este código. Mientras tanto, puedes usar GymLog individualmente.</p><div className="invite-code">{groupInviteCode}</div><button className="outline-btn" onClick={() => { void navigator.clipboard?.writeText(groupInviteCode); setNotice('Código copiado') }}>Copiar código</button></div>}<div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">DATOS Y PRIVACIDAD</span><h2>Perfil de {names[person]}</h2></div><HeartPulse size={22} /></div><p className="helper">{cloudEnabled ? 'Tus datos personales se sincronizan con Supabase. En los entrenamientos conjuntos, cada serie se guarda en el perfil de quien la realiza.' : 'Los datos de esta beta se guardan en este dispositivo. Aún no hay cuentas ni sincronización en la nube: el selector de perfil no sustituye un inicio de sesión.'}</p><div className="data-summary"><b>{workouts.length} entrenamientos</b><b>{sets.length} series</b><b>{data.routines.filter(r => r.owner === person || r.owner === 'shared').length} rutinas visibles</b></div><button className="outline-btn" onClick={exportCsv}><ArrowDownToLine size={16} /> Exportar series a CSV</button>{cloudEnabled && onSignOut && <button className="outline-btn" onClick={onSignOut}>Cerrar sesión</button>}</div><div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">SEGUIMIENTO FÍSICO</span><h2>Mediciones corporales</h2></div><Activity size={22} /></div><div className="form-grid"><label>Altura (cm)<input type="number" min="100" max="230" value={heightCm} onChange={e=>setHeightCm(e.target.value)} placeholder="178"/></label><label>Edad<input type="number" min="15" max="100" value={ageYears} onChange={e=>setAgeYears(e.target.value)} placeholder="27"/></label><label>Sexo para estimación<select value={bodySex} onChange={e=>setBodySex(e.target.value as 'male'|'female')}><option value="male">Hombre</option><option value="female">Mujer</option></select></label><label>Peso objetivo (kg)<input type="number" min="30" max="300" step="0.1" value={targetWeight} onChange={e=>setTargetWeight(e.target.value)} placeholder="65"/></label></div><button className="outline-btn" onClick={saveBodyProfile}><Save size={16}/> Guardar datos corporales</button><BodyStats metrics={data.metrics.filter(m=>m.person===person)} heightCm={Number(heightCm)} age={Number(ageYears)} sex={bodySex} targetWeight={Number(targetWeight)}/><div className="input-row"><label>Peso (kg)<input type="number" min="0" step="0.1" value={metricWeight} onChange={e => setMetricWeight(e.target.value)} placeholder="70.0" /></label><label>Cintura (cm)<input type="number" min="0" step="0.5" value={metricWaist} onChange={e => setMetricWaist(e.target.value)} placeholder="80" /></label></div><button className="primary-btn" onClick={addMetric}><Save size={16} /> Guardar medición</button><div className="history-sets">{data.metrics.filter(m => m.person === person).slice().reverse().slice(0,5).map(m => <span key={m.id}>{fmt(m.date)} · {m.weight ? m.weight + ' kg' : '—'} · {m.waist ? m.waist + ' cm cintura' : '—'}</span>)}</div></div><div className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">RECUPERACIÓN</span><h2>¿Cómo te encuentras?</h2></div><HeartPulse size={22} /></div><div className="input-row"><label>Horas de sueño<input type="number" min="0" max="24" step="0.5" value={sleep} onChange={e => setSleep(e.target.value)} /></label><label>Sensaciones<select value={feeling} onChange={e => setFeeling(e.target.value)}><option value="1">1 · Muy mal</option><option value="2">2 · Mal</option><option value="3">3 · Normal</option><option value="4">4 · Bien</option><option value="5">5 · Muy bien</option></select></label></div><label>Fatiga (1–10)<input type="number" min="1" max="10" value={fatigue} onChange={e => setFatigue(e.target.value)} /></label><label>Notas<textarea value={recoveryNote} onChange={e => setRecoveryNote(e.target.value)} placeholder="Agujetas, energía, molestias..." /></label><button className="primary-btn" onClick={addRecovery}><HeartPulse size={16} /> Registrar recuperación</button><div className="history-sets">{data.recovery.filter(r => r.person === person).slice(0,5).map(r => <span key={r.id}>{fmt(r.date)} · {r.sleep} h sueño · sensaciones {r.feeling}/5 · fatiga {r.fatigue}/10</span>)}</div></div>{!cloudEnabled && <div className="danger-zone"><div><b>Datos de este dispositivo</b><small>Exporta una copia antes de borrar los datos locales.</small></div><button className="outline-btn danger" onClick={() => { if (window.confirm('¿Borrar todos los datos guardados en este dispositivo?')) { localStorage.removeItem(KEY); setData(seed); setNotice('Datos locales reiniciados') } }}>Borrar datos</button></div>}</section>}

      <footer className="page-footer"><span>GYMLOG · BETA</span><span><Save size={13} /> Guardado automático {cloudEnabled ? 'en Supabase' : 'en este dispositivo'}</span></footer>
    </main>
    {notice && <div className="toast"><Check size={16} />{notice}<button onClick={() => setNotice('')}><X size={14} /></button></div>}
    <nav className="mobile-nav">{nav.map(n => <button key={n.id} className={tab === n.id ? 'active' : ''} onClick={() => setTab(n.id)}><n.icon size={19} /><small>{n.label}</small></button>)}</nav>
  </div>
}


const EXERCISE_IMAGE_BASE='https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
function exerciseImageId(name:string):string{
 const n=normalizeExercise(name);
 if(/patada de gluteo/.test(n))return 'Glute_Kickback';
 if(/hip thrust|puente de gluteos/.test(n))return 'Barbell_Hip_Thrust';
 if(/abduccion de cadera/.test(n))return 'Adductor';
 if(/sentadilla goblet/.test(n))return 'Goblet_Squat';
 if(/sentadilla frontal/.test(n))return 'Front_Squat_Clean_Grip';
 if(/sentadilla|zancada|step.?up|sissy squat/.test(n))return 'Barbell_Full_Squat';
 if(/prensa/.test(n))return 'Leg_Press';
 if(/extension de cuadriceps/.test(n))return 'Leg_Extensions';
 if(/curl femoral sentado/.test(n))return 'Seated_Leg_Curl';
 if(/curl femoral/.test(n))return 'Lying_Leg_Curls';
 if(/peso muerto rumano/.test(n))return 'Romanian_Deadlift';
 if(/peso muerto/.test(n))return 'Barbell_Deadlift';
 if(/patada de triceps/.test(n))return 'Tricep_Dumbbell_Kickback';
 if(/press banca con mancuernas/.test(n))return 'Dumbbell_Bench_Press';
 if(/press inclinado con mancuernas/.test(n))return 'Incline_Dumbbell_Bench_Press';
 if(/press inclinado/.test(n))return 'Barbell_Incline_Bench_Press_-_Medium_Grip';
 if(/press banca|press declinado|press en maquina|fondos/.test(n))return 'Barbell_Bench_Press_-_Medium_Grip';
 if(/apertura con mancuernas/.test(n))return 'Dumbbell_Flyes';
 if(/apertura|cruce de poleas|peck deck/.test(n))return 'Cable_Crossover';
 if(/flexiones/.test(n))return 'Pushups';
 if(/pullover/.test(n))return 'Bent-Arm_Dumbbell_Pullover';
 if(/press militar con mancuernas|press arnold/.test(n))return 'Dumbbell_Shoulder_Press';
 if(/press militar/.test(n))return 'Standing_Military_Press';
 if(/elevacion lateral|elevacion frontal|pajaro/.test(n))return 'Lateral_Raise_-_With_Bands';
 if(/face pull/.test(n))return 'Face_Pull';
 if(/remo con mancuerna/.test(n))return 'One-Arm_Dumbbell_Row';
 if(/remo|remo pendlay/.test(n))return 'Bent_Over_Barbell_Row';
 if(/jalon/.test(n))return 'Wide-Grip_Front_Lat_Pulldown';
 if(/dominada/.test(n))return 'Pullups';
 if(/curl martillo/.test(n))return 'Hammer_Curls';
 if(/curl predicador|curl scott/.test(n))return 'Preacher_Curl';
 if(/curl.*biceps|curl bayesian|curl spider/.test(n))return 'Barbell_Curl';
 if(/extension de triceps|press frances|rompecraneos|fondos/.test(n))return 'Triceps_Pushdown';
 if(/curl de muneca|antebrazo|agarre|farmer/.test(n))return 'Farmers_Walk';
 if(/gemelo|soleo|elevacion de talones/.test(n))return 'Standing_Calf_Raises';
 if(/plancha/.test(n))return 'Plank';
 if(/crunch/.test(n))return 'Cable_Crunch';
 if(/elevacion de piernas|elevacion de rodillas/.test(n))return 'Hanging_Leg_Raise';
 if(/rueda abdominal/.test(n))return 'Ab_Roller';
 if(/dead bug/.test(n))return '3_4_Sit-Up';
 if(/pallof/.test(n))return 'Cable_Crunch';
 return 'Barbell_Full_Squat';
}
function ExerciseThumb({name}:{name:string}) {
 const [failed,setFailed]=useState(false);
 const src=EXERCISE_IMAGE_BASE+exerciseImageId(name)+'/0.jpg';
 return <span className="exercise-thumb" aria-hidden="true">{!failed?<img src={src} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<svg viewBox="0 0 72 54"><circle cx="23" cy="13" r="5"/><path d="M23 19 L25 31 L16 43 M25 31 L34 43 M25 23 L13 28 M25 23 L36 28 M42 27 L64 27 M45 22 L45 32 M61 22 L61 32"/></svg>}</span>
}
function paintMuscleGroups(root:THREE.Object3D, groups:Set<string>){
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const info=object.userData as {kind?:string;group?:string};
  if(info.kind!=='muscle')return;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  materials.forEach(material=>{
   if(material instanceof THREE.MeshStandardMaterial){
    const selected=!!info.group&&groups.has(info.group);
    material.color.set(selected?'#D783A5':'#C5D8CC');
    material.emissive.set(selected?'#8C3F60':'#000000');
    material.emissiveIntensity=selected?0.16:0;
   }
  });
 });
}
function BodyMap({active}:{active:string[]}) {
 const mountRef=useRef<HTMLDivElement>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const controlsRef=useRef<OrbitControls|null>(null);
 const modelRef=useRef<THREE.Group|null>(null);
 const activeKey=active.join('|');
 const activeKeyRef=useRef(activeKey);
 activeKeyRef.current=activeKey;
 useEffect(()=>{
  const mount=mountRef.current;
  if(!mount)return;
  let disposed=false;
  let frame=0;
  let model:THREE.Group|null=null;
  const scene=new THREE.Scene();
  scene.background=null;
  const camera=new THREE.PerspectiveCamera(32,1,0.01,100);
  camera.position.set(0,0.25,4.2);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000,0);
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.width='100%';
  renderer.domElement.style.height='100%';
  renderer.domElement.style.display='block';
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;
  controls.dampingFactor=0.075;
  controls.enablePan=false;
  controls.minDistance=1.5;
  controls.maxDistance=7;
  controls.minPolarAngle=0.08;
  controls.maxPolarAngle=Math.PI-0.08;
  scene.add(new THREE.HemisphereLight(0xffffff,0x9ba99f,2.0));
  const keyLight=new THREE.DirectionalLight(0xffffff,2.2);keyLight.position.set(3,5,5);scene.add(keyLight);
  const fillLight=new THREE.DirectionalLight(0xffffff,1.1);fillLight.position.set(-4,1,-3);scene.add(fillLight);
  const rimLight=new THREE.DirectionalLight(0xd8e8df,1.2);rimLight.position.set(0,3,-5);scene.add(rimLight);
  const draco=new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/gh/tiralonghipol/free-muscles@605dd1ca351421ad874a03f673a2a3f915ab254e/public/draco/');
  const loader=new GLTFLoader();loader.setDRACOLoader(draco);
  const modelUrl='https://cdn.jsdelivr.net/gh/tiralonghipol/free-muscles@605dd1ca351421ad874a03f673a2a3f915ab254e/public/anatomy.glb';
  loader.load(modelUrl,gltf=>{
   if(disposed)return;
   model=gltf.scene;
   modelRef.current=model;
   controlsRef.current=controls;
   model.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(model);
   const center=bounds.getCenter(new THREE.Vector3());
   const size=bounds.getSize(new THREE.Vector3());
   model.position.sub(center);
   const maxDim=Math.max(size.x,size.y,size.z);
   const scale=2.35/maxDim;
   model.scale.setScalar(scale);
   model.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const info=object.userData as {kind?:string;group?:string};
    if(info.kind==='muscle'){
     const wasArray=Array.isArray(object.material);
     const materials:THREE.Material[]=wasArray?object.material as THREE.Material[]:[object.material as THREE.Material];
     const updated=materials.map((original:THREE.Material)=>{
      const material=original.clone();
      if(material instanceof THREE.MeshStandardMaterial){
       material.color.set('#C5D8CC');
       material.emissive.set('#000000');
       material.emissiveIntensity=0;
       material.roughness=0.72;
      }
      return material;
     });
     object.material=wasArray?updated:updated[0];
    }
   });
   scene.add(model);
   paintMuscleGroups(model,new Set(activeKeyRef.current?activeKeyRef.current.split('|'):[]));
   camera.position.set(0,0.15,4.25);
   camera.near=0.01;camera.far=100;camera.updateProjectionMatrix();
   controls.target.set(0,0,0);controls.update();
   setLoading(false);
  },undefined,()=>{
   if(!disposed){setError('No se ha podido cargar el modelo anatómico 3D. Comprueba la conexión.');setLoading(false);}
  });
  const resize=()=>{
   if(!mount)return;
   const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);
   camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  };
  const observer=new ResizeObserver(resize);observer.observe(mount);resize();
  const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};
  animate();
  return ()=>{
   disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();controlsRef.current=null;modelRef.current=null;draco.dispose();
   scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(material=>material.dispose());}});
   renderer.dispose();if(renderer.domElement.parentElement===mount)mount.removeChild(renderer.domElement);
  };
 },[]);
 useEffect(()=>{
  const model=modelRef.current;
  if(!model)return;
  paintMuscleGroups(model,new Set(activeKey?activeKey.split('|'):[]));
 },[activeKey]);
 const setPreset=(preset:'front'|'back'|'side')=>{
  const controls=controlsRef.current;
  if(!controls)return;
  const radius=4.25;
  const positions={front:new THREE.Vector3(0,0.15,radius),back:new THREE.Vector3(0,0.15,-radius),side:new THREE.Vector3(radius,0.15,0)};
  controls.object.position.copy(positions[preset]);
  controls.target.set(0,0,0);controls.update();
 };
 return <div className="body-map-v2 body-map-3d">
  <div className="anatomy-stage real-anatomy-stage">
   <div className="anatomy-canvas" ref={mountRef}/>
   {loading&&<div className="anatomy-loading">Cargando modelo anatómico 3D…</div>}
   {error&&<div className="anatomy-loading anatomy-error">{error}</div>}
   <span className="anatomy-hint">Arrastra para girar · Pellizca para acercar</span>
  </div>
  <div className="anatomy-controls">
   <button type="button" onClick={()=>setPreset('front')}>Frontal</button>
   <button type="button" onClick={()=>setPreset('back')}>Espalda</button>
   <button type="button" onClick={()=>setPreset('side')}>Lateral</button>
  </div>
  <div className="muscle-key"><strong>{active.length?'MÚSCULOS DEL EJERCICIO':'MAPA MUSCULAR'}</strong><div>{active.length?active.map(id=><span key={id}><i/>{id}</span>):<small>Selecciona un ejercicio para resaltar sus músculos.</small>}</div><small>Rosa: músculo implicado · Verde: resto de la musculatura</small></div>
  <small className="anatomy-credit">Modelo 3D: Free Muscle · Z-Anatomy / BodyParts3D · CC BY-SA 4.0</small>
 </div>;
}
function BodyStats({metrics,heightCm,age,sex,targetWeight}:{metrics:Metric[];heightCm:number;age:number;sex:'male'|'female';targetWeight:number}) {
 const latest=metrics.filter(m=>m.weight>0).slice().sort((a,b)=>b.date.localeCompare(a.date))[0]; const weight=latest?.weight??0; const bmi=weight&&heightCm?weight/((heightCm/100)**2):0; const bf=bodyFatEstimate(weight,heightCm,age,sex); const min=heightCm?18.5*((heightCm/100)**2):0; const max=heightCm?24.9*((heightCm/100)**2):0; const delta=weight&&targetWeight?weight-targetWeight:0;
 return <div className="body-stats"><div className="metric-grid"><Metric label="IMC" value={bmi?bmi.toFixed(1):'—'} detail="Peso / altura²"/><Metric label="GRASA ESTIMADA" value={bf!==null?bf.toFixed(1)+'%':'—'} detail="Fórmula orientativa"/><Metric label="PESO OBJETIVO" value={targetWeight?targetWeight.toFixed(1)+' kg':'—'} detail={delta>0?'Faltan '+delta.toFixed(1)+' kg':delta<0?'Superado por '+Math.abs(delta).toFixed(1)+' kg':'Define tu objetivo'}/></div><p className="helper">Rango de peso asociado a IMC 18,5–24,9: {min?min.toFixed(1)+'–'+max.toFixed(1)+' kg':'añade altura'}. El porcentaje de grasa es una estimación poblacional (Deurenberg), no una medición clínica.</p></div>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong><small><Activity size={14} /> {detail}</small></div> }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span><Dumbbell size={22} /></span><b>{title}</b><p>{text}</p></div> }
function Session({ workout, person, expanded = false, onDelete }: { workout: Workout; person: Person; expanded?: boolean; onDelete?: () => void }) {
  const sets = workout.sets.filter(s => s.person === person)
  return <article className="session-row"><div className="session-date"><CalendarDays size={17} /><span>{fmt(workout.date)}</span></div><div className="session-detail"><b>{workout.mode === 'together' ? 'Entrenamiento conjunto' : 'Entrenamiento individual'}</b><small>{sets.length} series · {new Set(sets.map(s => s.exercise)).size} ejercicios · {workout.duration} min</small>{expanded && <div className="history-sets">{sets.map(s => <span key={s.id}>{s.exercise}: {s.weight} kg × {s.reps} · RPE {s.rpe}</span>)}</div>}</div><strong className="session-volume">{Math.round(vol(sets)).toLocaleString('es-ES')} kg</strong>{onDelete && <button className="icon-btn" onClick={onDelete} aria-label="Eliminar entrenamiento"><Trash2 size={16} /></button>}</article>
}
