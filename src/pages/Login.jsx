import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, User } from 'lucide-react'
import useAuth from '../hooks/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const { authenticated, login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    identifier: '',
    password: '',
  })

  if (authenticated) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await login(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-left-inner">
          <div className="login-left-center">
            <div className="login-logo-circle">
              <img src="/logo.png" alt="Logo UPI PROBUMISIL" />
            </div>
            <h1 className="login-title">
              Presen<span className="login-title-accent">PRO</span>
            </h1>
            <p className="login-subtitle">
              Sistem Presensi Digital Terpadu Protokol Bumi Siliwangi
              <br />
              Universitas Pendidikan Indonesia.
            </p>
          </div>

          <div className="login-left-footer">
            <img src="/Maskot.PNG" alt="Maskot PresenPRO" className="login-footer-logo" />
          </div>
        </div>
      </section>

      <section className="login-right">
        <div className="login-right-inner">
          <div className="login-mobile-brand">
            <div className="login-mobile-logo-circle">
              <img src="/logo.png" alt="Logo" />
            </div>
            <h1 className="login-mobile-name">
              Presen<span>PRO</span>
            </h1>
          </div>

          <div className="login-card">
            <h2 className="login-card-title">Masuk Sistem</h2>
            <p className="login-card-desc">Silakan masukkan akun untuk melakukan absensi.</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label>NIM-P</label>
                <div className="login-input-box">
                  <User size={16} className="login-input-icon" />
                  <input
                    type="text"
                    value={form.identifier}
                    onChange={(event) => setForm({ ...form, identifier: event.target.value })}
                    placeholder="2406411-1031.XVIII"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Kata Sandi</label>
                <div className="login-input-box has-toggle">
                  <LockKeyhole size={16} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    placeholder="Masukkan kata sandi"
                    required
                  />
                  <button
                    type="button"
                    className="login-toggle-pw"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="login-row">
                <label className="login-check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Ingat saya</span>
                </label>
              </div>

              {error && <p className="login-error-msg">{error}</p>}

              <button className="login-btn-submit" type="submit" disabled={submitting}>
                {submitting ? (
                  <span className="login-loading" />
                ) : (
                  <>
                    Masuk
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="login-help-text">
              Belum punya akun? <Link to="/register">Daftar Anggota</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
