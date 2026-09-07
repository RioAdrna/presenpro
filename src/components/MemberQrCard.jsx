import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function MemberQrCard({ profile }) {
  const [qrImage, setQrImage] = useState('')
  const qrValue = profile?.qrPayload || profile?.qrToken || profile?.nim || ''

  useEffect(() => {
    let cancelled = false

    if (!qrValue) {
      return
    }

    QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#18181b',
        light: '#ffffff',
      },
    }).then((url) => {
      if (!cancelled) setQrImage(url)
    })

    return () => {
      cancelled = true
    }
  }, [qrValue])

  if (!qrValue) return null

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
          <img src={qrImage} alt="QR absensi" className="mx-auto aspect-square w-full max-w-[260px]" />
        ) : (
          <div className="mx-auto aspect-square w-full max-w-[260px] animate-pulse rounded-lg bg-zinc-100" />
        )}
      </div>
    </section>
  )
}
