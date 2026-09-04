import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, User, CreditCard } from 'lucide-react'
import Swal from 'sweetalert2'
import useAuth from '../hooks/useAuth'
import { authApi } from '../lib/api'

export default function Register() {
  const { authenticated } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    nimP: '',
    password: '',
    passwordConfirmation: '',
  })

  if (authenticated) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    if (!/^\d{7}-\d{4}\.[IVXLCDM]+$/i.test(form.nimP.trim())) {
      setError('Format NIM-P harus seperti 2406411-1031.XVIII.')
      return
    }

    if (form.password !== form.passwordConfirmation) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    setSubmitting(true)
    try {
      const data = await authApi.register({
        name: form.name,
        nimP: form.nimP.trim().toUpperCase(),
        password: form.password,
      })

      await Swal.fire({
        icon: 'success',
        title: 'Registrasi Terkirim',
        text: data.message || 'Akun Anda menunggu persetujuan.',
        confirmButtonColor: '#10b981',
      })

      setForm({ name: '', nimP: '', password: '', passwordConfirmation: '' })
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
              Registrasi akun anggota untuk presensi digital PROBUMSIL.
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
            <h2 className="login-card-title">Registrasi Anggota</h2>
            <p className="login-card-desc">Akun baru akan aktif setelah disetujui.</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label>Nama Lengkap</label>
                <div className="login-input-box">
                  <User size={16} className="login-input-icon" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label>NIM-P</label>
                <div className="login-input-box">
                  <CreditCard size={16} className="login-input-icon" />
                  <input
                    type="text"
                    value={form.nimP}
                    onChange={(event) => setForm({ ...form, nimP: event.target.value })}
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
                    placeholder="Minimal 6 karakter"
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

              <div className="login-field">
                <label>Konfirmasi Sandi</label>
                <div className="login-input-box">
                  <LockKeyhole size={16} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.passwordConfirmation}
                    onChange={(event) => setForm({ ...form, passwordConfirmation: event.target.value })}
                    placeholder="Ulangi kata sandi"
                    required
                  />
                </div>
              </div>

              {error && <p className="login-error-msg">{error}</p>}

              <button className="login-btn-submit" type="submit" disabled={submitting}>
                {submitting ? (
                  <span className="login-loading" />
                ) : (
                  <>
                    Daftar
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="login-help-text">
              Sudah punya akun? <Link to="/login">Masuk sekarang</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
