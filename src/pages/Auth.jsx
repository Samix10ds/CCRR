import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import styles from './Auth.module.css'

const CLASSI = ['1A', '1B', '2A', '2B', '3A', '3B']

export default function AuthPage() {
  const { signIn, signUp, signInAdmin, signUpAdmin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')       // 'login' | 'register' | 'admin'
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    nome: '', cognome: '', classe: '1A', email: ''
  })
  const [adminForm, setAdminForm] = useState({
    email: '', password: '', nome: '', cognome: '', classe: '1A', isNew: false
  })

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { nome, cognome, classe, email } = form

    if (!nome.trim() || !cognome.trim()) { toast.error('Inserisci nome e cognome'); return }
    if (!email.trim()) { toast.error('Inserisci la tua email'); return }

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn({ email: email.trim().toLowerCase(), nome, cognome, classe })
        toast.success('Bentornato!')
      } else {
        await signUp({ nome, cognome, classe, email: email.trim().toLowerCase() })
        toast.success('Account creato!')
      }
      navigate('/')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        toast.error('Email già registrata. Usa Accedi.')
      } else if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
        toast.error('Dati non corretti. Controlla email, nome, cognome e classe.')
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Controlla la tua email e conferma l\'account, poi riprova.')
      } else {
        toast.error(msg || 'Errore sconosciuto')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminSubmit(e) {
    e.preventDefault()
    const { email, password, nome, cognome, classe, isNew } = adminForm
    if (!email || !password) { toast.error('Email e password obbligatorie'); return }

    setLoading(true)
    try {
      if (isNew) {
        if (!nome || !cognome) { toast.error('Inserisci anche nome e cognome'); setLoading(false); return }
        await signUpAdmin({ email, password, nome, cognome, classe })
        toast.success('Account creato! Chiedi a Davide di impostare il ruolo admin su Supabase.')
      } else {
        await signInAdmin({ email, password })
        toast.success('Bentornato, admin!')
      }
      navigate('/')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
        toast.error('Email o password errate.')
      } else {
        toast.error(msg || 'Errore sconosciuto')
      }
    } finally {
      setLoading(false)
    }
  }

  // slider position
  const sliderPos = { login: '0%', register: '33.33%', admin: '66.66%' }

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.blob1} /><div className={styles.blob2} />
      </div>

      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logoIcon}>◈</span>
          <h1 className={styles.title}>CCRR</h1>
          <p className={styles.sub}>Community delle classi</p>
        </div>

        {/* 3 tab */}
        <div className={styles.tabs}>
          {['login','register','admin'].map(m => (
            <button key={m}
              className={[styles.tab, mode === m ? styles.tabActive : ''].join(' ')}
              onClick={() => setMode(m)}>
              {m === 'login' ? 'Accedi' : m === 'register' ? 'Registrati' : 'Admin'}
            </button>
          ))}
          <div className={styles.tabSlider}
            style={{ transform: `translateX(${sliderPos[mode] === '0%' ? '0' : sliderPos[mode] === '33.33%' ? '100%' : '200%'})` }}
          />
        </div>

        {/* Form utenti normali */}
        {(mode === 'login' || mode === 'register') && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Nome</label>
                <input name="nome" value={form.nome} onChange={handleChange}
                  placeholder="Mario" required />
              </div>
              <div className={styles.field}>
                <label>Cognome</label>
                <input name="cognome" value={form.cognome} onChange={handleChange}
                  placeholder="Rossi" required />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Classe</label>
                <select name="classe" value={form.classe} onChange={handleChange}>
                  {CLASSI.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="mario@example.com" required autoComplete="email" />
              </div>
            </div>

            {mode === 'login' && (
              <p className={styles.loginHint}>
                💡 Usa la stessa email con cui ti sei registrato
              </p>
            )}

            <Button type="submit" loading={loading} fullWidth size="lg">
              {mode === 'login' ? 'Accedi' : 'Crea account'}
            </Button>
          </form>
        )}

        {/* Form admin */}
        {mode === 'admin' && (
          <form className={styles.form} onSubmit={handleAdminSubmit}>
            <div className={styles.adminToggle}>
              <button type="button"
                className={[styles.adminTab, !adminForm.isNew ? styles.adminTabActive : ''].join(' ')}
                onClick={() => setAdminForm(p => ({ ...p, isNew: false }))}>
                Accedi
              </button>
              <button type="button"
                className={[styles.adminTab, adminForm.isNew ? styles.adminTabActive : ''].join(' ')}
                onClick={() => setAdminForm(p => ({ ...p, isNew: true }))}>
                Nuovo account
              </button>
            </div>

            {adminForm.isNew && (
              <>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Nome</label>
                    <input value={adminForm.nome}
                      onChange={e => setAdminForm(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Davide" required />
                  </div>
                  <div className={styles.field}>
                    <label>Cognome</label>
                    <input value={adminForm.cognome}
                      onChange={e => setAdminForm(p => ({ ...p, cognome: e.target.value }))}
                      placeholder="Rossi" required />
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Classe</label>
                  <select value={adminForm.classe}
                    onChange={e => setAdminForm(p => ({ ...p, classe: e.target.value }))}>
                    {CLASSI.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={adminForm.email}
                onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))}
                placeholder="davide@example.com" required autoComplete="email" />
            </div>
            <div className={styles.field}>
              <label>Password</label>
              <input type="password" value={adminForm.password}
                onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••" required autoComplete="current-password" />
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg">
              {adminForm.isNew ? 'Crea account admin' : 'Accedi'}
            </Button>

            <p className={styles.adminHint}>
              Dopo la registrazione, imposta <code>role = admin</code> su Supabase.
              Puoi avere più admin, ognuno con la propria email e password.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
