import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { usersApi } from '../lib/api'

export default function MemberQrCard({ profile }) {
  const [qrImage, setQrImage] = useState('')

  useEffect(() => {
    let cancelled = false

    let refreshTimer
    async function refreshQr() {
      try {
        const data = await usersApi.getQrToken()
        if (cancelled) return
        const url = await QRCode.toDataURL(data.payload, {
          errorCorrectionLevel: 'M', margin: 2, width: 280,
          color: { dark: '#18181b', light: '#ffffff' },
        })
        if (!cancelled) {
          setQrImage(url)
        }
      } catch {
        if (!cancelled) setQrImage('')
      }
    }
    refreshQr()
    refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshQr()
    }, 15000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshQr()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(refreshTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [profile?.nim])

  if (!profile?.nim) return null

  return (
    <section className="rounded-lg bg-zinc-950 p-5 text-white shadow-[0_14px_30px_rgba(24,24,27,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-[#ffc400]">QR ABSENSI</p>
          <h2 className="mt-2 text-xl font-black leading-tight">{profile?.name || 'Anggota'}</h2>
          <p className="mt-1 text-xs font-semibold text-zinc-300">NIM-P: {profile?.nim || '-'}</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-white p-4">
        {qrImage ? (
          <img src={qrImage} alt="QR absensi dinamis" className="mx-auto aspect-square w-full max-w-[260px]" />
        ) : (
          <div className="mx-auto aspect-square w-full max-w-[260px] animate-pulse rounded-lg bg-zinc-100" />
        )}
      </div>
    </section>
  )
}
