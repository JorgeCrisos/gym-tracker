import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Dumbbell, LockKeyhole, Users } from 'lucide-react'
import App, { type AppData, type Person, type Workout } from './App'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type GroupMember = { group_id: string; user_id: string; display_name: string }
type GroupInfo = { id: string; name: string; invite_code: string }
type CloudBundle = { group: GroupInfo; members: GroupMember[]; person: Person; partner: GroupMember | null; initialData: AppData }

const blankData = (): AppData => ({ workouts: [], routines: [], goals: [], metrics: [], recovery: [], active: null })
const asPerson = (name: string): Person => name.toLowerCase() === 'marta' ? 'marta' : 'jorge'

export default function CloudGate() {
  const [session, setSession] = useState<Session | null>(null)
  const [booting, setBooting] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [bundle, setBundle] = useState<CloudBundle | null>(null)
  const [groupBusy, setGroupBusy] = useState(false)
  const [displayName, setDisplayName] = useState<Person>('jorge')
  const [inviteCode, setInviteCode] = useState('')
  const [setupMode, setSetupMode] = useState<'create' | 'join'>('create')

  useEffect(() => {
    if (!isSupabaseConfigured) { setBooting(false); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
      .catch(() => setError('No se pudo comprobar la sesión.'))
      .finally(() => setBooting(false))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setBundle(null)
      setError('')
      setMessage('')
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadGroup = useCallback(async (activeSession: Session) => {
    setGroupBusy(true); setError('')
    try {
      const { data: own, error: ownError } = await supabase.from('group_members')
        .select('group_id,user_id,display_name').eq('user_id', activeSession.user.id).maybeSingle()
      if (ownError) throw ownError
      if (!own) { setBundle(null); return }
      const { data: members, error: membersError } = await supabase.from('group_members')
        .select('group_id,user_id,display_name').eq('group_id', own.group_id)
      if (membersError) throw membersError
      const current = (members ?? []).find(m => m.user_id === activeSession.user.id) as GroupMember | undefined
      if (!current) throw new Error('No se ha podido verificar tu perfil del grupo.')
      const { data: group, error: groupError } = await supabase.from('groups')
        .select('id,name,invite_code').eq('id', own.group_id).single()
      if (groupError) throw groupError
      const person = asPerson(current.display_name)
      const partner = ((members ?? []).find(m => m.user_id !== activeSession.user.id) ?? null) as GroupMember | null
      const [{ data: memberData, error: memberError }, { data: sharedData, error: sharedError }] = await Promise.all([
        supabase.from('member_data').select('workouts,body_data').eq('group_id', own.group_id).eq('user_id', activeSession.user.id).maybeSingle(),
        supabase.from('shared_data').select('routines').eq('group_id', own.group_id).maybeSingle()
      ])
      if (memberError) throw memberError
      if (sharedError) throw sharedError
      const body = (memberData?.body_data ?? {}) as {
        personal_routines?: AppData['routines']; goals?: AppData['goals'];
        metrics?: AppData['metrics']; recovery?: AppData['recovery']
      }
      const workouts = Array.isArray(memberData?.workouts) ? memberData.workouts as Workout[] : []
      const sharedRoutines = Array.isArray(sharedData?.routines) ? (sharedData.routines as AppData['routines']).map(r => ({ ...r, owner: 'shared' as const })) : []
      const personalRoutines = Array.isArray(body.personal_routines) ? body.personal_routines.map(r => ({ ...r, owner: person })) : []
      const initialData: AppData = {
        ...blankData(),
        workouts,
        routines: [...personalRoutines, ...sharedRoutines],
        goals: Array.isArray(body.goals) ? body.goals.map(g => ({ ...g, person })) : [],
        metrics: Array.isArray(body.metrics) ? body.metrics.map(m => ({ ...m, person })) : [],
        recovery: Array.isArray(body.recovery) ? body.recovery.map(r => ({ ...r, person })) : []
      }
      setBundle({ group: group as GroupInfo, members: (members ?? []) as GroupMember[], person, partner, initialData })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.')
      setBundle(null)
    } finally { setGroupBusy(false) }
  }, [])

  useEffect(() => { if (session) void loadGroup(session) }, [session, loadGroup])

  async function submitAuth(e: FormEvent) {
    e.preventDefault(); setAuthBusy(true); setError(''); setMessage('')
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        if (!data.session) setMessage('Te hemos enviado un correo para confirmar la cuenta. Cuando la confirmes, inicia sesión aquí.')
        else setMessage('Cuenta creada. Ahora configura el grupo de entrenamiento.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar el acceso.') }
    finally { setAuthBusy(false) }
  }

  async function setupGroup(e: FormEvent) {
    e.preventDefault(); if (!session) return
    setGroupBusy(true); setError(''); setMessage('')
    try {
      const rpc = setupMode === 'create'
        ? await supabase.rpc('create_gym_group', { p_group_name: 'GymLog', p_display_name: displayName === 'jorge' ? 'Jorge' : 'Marta' })
        : await supabase.rpc('join_gym_group', { p_invite_code: inviteCode.trim(), p_display_name: displayName === 'jorge' ? 'Jorge' : 'Marta' })
      if (rpc.error) throw rpc.error
      await loadGroup(session)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo configurar el grupo.') }
    finally { setGroupBusy(false) }
  }

  const saveWorkout = useCallback(async (ownWorkout: Workout, partnerWorkout: Workout | null) => {
    if (!bundle) throw new Error('No hay grupo cargado')
    const { error } = await supabase.rpc('save_gym_workout', {
      p_own_workout: ownWorkout,
      p_partner_user_id: partnerWorkout ? bundle.partner?.user_id ?? null : null,
      p_partner_workout: partnerWorkout
    })
    if (error) throw error
  }, [bundle])

  const saveProfile = useCallback(async (data: AppData) => {
    if (!bundle || !session) return
    const body_data = {
      goals: data.goals.filter(g => g.person === bundle.person),
      metrics: data.metrics.filter(m => m.person === bundle.person),
      recovery: data.recovery.filter(r => r.person === bundle.person),
      personal_routines: data.routines.filter(r => r.owner === bundle.person)
    }
    const { data: existing, error: lookupError } = await supabase.from('member_data')
      .select('user_id').eq('group_id', bundle.group.id).eq('user_id', session.user.id).maybeSingle()
    if (lookupError) throw lookupError
    const memberPayload = { body_data, updated_at: new Date().toISOString() }
    const memberWrite = existing
      ? await supabase.from('member_data').update(memberPayload).eq('group_id', bundle.group.id).eq('user_id', session.user.id)
      : await supabase.from('member_data').insert({
          group_id: bundle.group.id, user_id: session.user.id,
          display_name: bundle.person === 'jorge' ? 'Jorge' : 'Marta',
          workouts: [], body_data
        })
    if (memberWrite.error) throw memberWrite.error
    const { error: sharedError } = await supabase.from('shared_data')
      .update({ routines: data.routines.filter(r => r.owner === 'shared') })
      .eq('group_id', bundle.group.id)
    if (sharedError) throw sharedError
  }, [bundle, session])

  if (booting || groupBusy && !bundle) return <div className="auth-screen"><div className="auth-card"><Dumbbell size={32} /><h1>GymLog</h1><p>Preparando tu espacio de entrenamiento…</p></div></div>
  if (!isSupabaseConfigured) return <div className="auth-screen"><div className="auth-card"><h1>GymLog</h1><p>Falta configurar la conexión con Supabase.</p></div></div>

  if (!session) return <div className="auth-screen"><form className="auth-card" onSubmit={submitAuth}>
    <div className="auth-mark"><Dumbbell size={25} /></div><span className="eyebrow">TU ENTRENAMIENTO, EN LA NUBE</span><h1>{authMode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h1>
    <p>Acceso privado para tus entrenamientos y tu progreso.</p>
    <label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" /></label>
    <label>Contraseña<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></label>
    {error && <div className="auth-error">{error}</div>}{message && <div className="auth-message">{message}</div>}
    <button className="primary-btn" disabled={authBusy}>{authBusy ? 'Un momento…' : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
    <button type="button" className="auth-switch" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>{authMode === 'login' ? '¿No tienes cuenta? Crear una' : 'Ya tengo cuenta · Iniciar sesión'}</button>
    <small><LockKeyhole size={13} /> Tus datos personales están protegidos por Supabase RLS.</small>
  </form></div>

  if (!bundle) return <div className="auth-screen"><form className="auth-card" onSubmit={setupGroup}>
    <div className="auth-mark"><Users size={25} /></div><span className="eyebrow">CONFIGURACIÓN INICIAL</span><h1>Vuestro espacio GymLog</h1>
    <p>Cread un grupo de dos personas. El primer miembro lo crea y comparte el código con el segundo.</p>
    <label>Tu perfil<select value={displayName} onChange={e => setDisplayName(e.target.value as Person)}><option value="jorge">Jorge</option><option value="marta">Marta</option></select></label>
    <div className="auth-choice"><button type="button" className={setupMode === 'create' ? 'selected' : ''} onClick={() => setSetupMode('create')}>Crear grupo</button><button type="button" className={setupMode === 'join' ? 'selected' : ''} onClick={() => setSetupMode('join')}>Unirme con código</button></div>
    {setupMode === 'join' && <label>Código de invitación<input required value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="Ej. A1B2C3D4" /></label>}
    {error && <div className="auth-error">{error}</div>}
    <button className="primary-btn" disabled={groupBusy}>{groupBusy ? 'Configurando…' : setupMode === 'create' ? 'Crear mi grupo' : 'Unirme al grupo'}</button>
    <button type="button" className="auth-switch" onClick={() => void supabase.auth.signOut()}>Cerrar sesión</button>
  </form></div>

  if (bundle.members.length < 2) return <div className="auth-screen"><div className="auth-card">
    <div className="auth-mark"><Users size={25} /></div><span className="eyebrow">GRUPO CREADO</span><h1>Invita a la otra persona</h1>
    <p>Comparte este código con Marta/Jorge para que se una a vuestro espacio.</p>
    <div className="invite-code">{bundle.group.invite_code}</div>
    <button className="primary-btn" onClick={() => { void navigator.clipboard?.writeText(bundle.group.invite_code); setMessage('Código copiado') }}>Copiar código</button>
    {message && <div className="auth-message">{message}</div>}
    <button className="auth-switch" onClick={() => void loadGroup(session)}>Ya se ha unido · Actualizar</button>
    <button className="auth-switch" onClick={() => void supabase.auth.signOut()}>Cerrar sesión</button>
  </div></div>

  return <App initialData={bundle.initialData} currentPerson={bundle.person}
    partnerPerson={bundle.partner ? asPerson(bundle.partner.display_name) : null}
    partnerUserId={bundle.partner?.user_id ?? null} cloudEnabled
    onWorkoutSave={saveWorkout} onProfileSave={saveProfile}
    onSignOut={() => { void supabase.auth.signOut() }} />
}
