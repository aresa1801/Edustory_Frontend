'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/auth'
import {
  QrCode,
  Smartphone,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Config key groups
// ---------------------------------------------------------------------------
const CONFIG_GROUPS = [
  {
    id: 'qris',
    label: 'QRIS',
    icon: QrCode,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    description: 'Konfigurasi QRIS dinamis. Paste string QRIS statis dari stiker / PDF merchant Anda.',
    fields: [
      {
        key: 'qris_static_string',
        label: 'String QRIS Statis',
        placeholder: '000201010211...',
        hint: 'Salin persis dari aplikasi bank / file PDF merchant QRIS Anda. Biasanya dimulai dengan "000201".',
        multiline: true,
      },
    ],
  },
  {
    id: 'emoney',
    label: 'E-Money & Dompet Digital',
    icon: Smartphone,
    color: 'text-green-600',
    bg: 'bg-green-50',
    description: 'Nomor dan nama akun e-wallet yang akan ditampilkan kepada siswa saat checkout.',
    fields: [
      { key: 'gopay_number',    label: 'Nomor GoPay',      placeholder: '08xxxxxxxxxx' },
      { key: 'gopay_name',      label: 'Nama GoPay',       placeholder: 'Nama Merchant' },
      { key: 'ovo_number',      label: 'Nomor OVO',        placeholder: '08xxxxxxxxxx' },
      { key: 'ovo_name',        label: 'Nama OVO',         placeholder: 'Nama Merchant' },
      { key: 'dana_number',     label: 'Nomor DANA',       placeholder: '08xxxxxxxxxx' },
      { key: 'dana_name',       label: 'Nama DANA',        placeholder: 'Nama Merchant' },
      { key: 'shopeepay_number',label: 'Nomor ShopeePay', placeholder: '08xxxxxxxxxx' },
      { key: 'shopeepay_name',  label: 'Nama ShopeePay',  placeholder: 'Nama Merchant' },
      { key: 'linkaja_number',  label: 'Nomor LinkAja',   placeholder: '08xxxxxxxxxx' },
      { key: 'linkaja_name',    label: 'Nama LinkAja',    placeholder: 'Nama Merchant' },
    ],
  },
  {
    id: 'bank',
    label: 'Transfer Bank',
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'Rekening bank tujuan transfer. Kosongkan bank yang tidak digunakan.',
    fields: [
      { key: 'bca_number',     label: 'Nomor Rekening BCA',     placeholder: '1234567890' },
      { key: 'bca_name',       label: 'Nama Pemilik BCA',       placeholder: 'Nama Pemilik Rekening' },
      { key: 'bni_number',     label: 'Nomor Rekening BNI',     placeholder: '1234567890' },
      { key: 'bni_name',       label: 'Nama Pemilik BNI',       placeholder: 'Nama Pemilik Rekening' },
      { key: 'bri_number',     label: 'Nomor Rekening BRI',     placeholder: '1234567890' },
      { key: 'bri_name',       label: 'Nama Pemilik BRI',       placeholder: 'Nama Pemilik Rekening' },
      { key: 'mandiri_number', label: 'Nomor Rekening Mandiri', placeholder: '1234567890' },
      { key: 'mandiri_name',   label: 'Nama Pemilik Mandiri',   placeholder: 'Nama Pemilik Rekening' },
      { key: 'permata_number', label: 'Nomor Rekening Permata', placeholder: '1234567890' },
      { key: 'permata_name',   label: 'Nama Pemilik Permata',   placeholder: 'Nama Pemilik Rekening' },
      { key: 'cimb_number',    label: 'Nomor Rekening CIMB',    placeholder: '1234567890' },
      { key: 'cimb_name',      label: 'Nama Pemilik CIMB',      placeholder: 'Nama Pemilik Rekening' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ConfigMap = Record<string, string>

interface SaveState {
  status: 'idle' | 'saving' | 'success' | 'error'
  message?: string
}

// ---------------------------------------------------------------------------
// Field component
// ---------------------------------------------------------------------------
function ConfigField({
  fieldKey,
  label,
  placeholder,
  hint,
  multiline,
  value,
  onChange,
}: {
  fieldKey: string
  label: string
  placeholder: string
  hint?: string
  multiline?: boolean
  value: string
  onChange: (key: string, val: string) => void
}) {
  const baseClass =
    'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono'

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          className={`${baseClass} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main settings page
// ---------------------------------------------------------------------------
export default function AdminSettingsPage() {
  const [config, setConfig] = useState<ConfigMap>({})
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})

  // Load config on mount
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)

      try {
        const res = await fetch('/api/admin/payment-config', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const rows: { config_key: string; config_value: string }[] = await res.json()
          const map: ConfigMap = {}
          for (const row of rows) map[row.config_key] = row.config_value
          setConfig(map)
        }
      } catch (e) {
        console.error('Failed to load config', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleChange = useCallback((key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSaveGroup = async (groupId: string, fields: { key: string }[]) => {
    if (!token) return
    setSaveStates(prev => ({ ...prev, [groupId]: { status: 'saving' } }))
    try {
      const updates = fields.map(f => ({
        config_key: f.key,
        config_value: (config[f.key] ?? '').trim(),
      }))

      const res = await fetch('/api/admin/payment-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan')

      setSaveStates(prev => ({
        ...prev,
        [groupId]: { status: 'success', message: 'Tersimpan!' },
      }))
      setTimeout(() => {
        setSaveStates(prev => ({ ...prev, [groupId]: { status: 'idle' } }))
      }, 3000)
    } catch (e: any) {
      setSaveStates(prev => ({
        ...prev,
        [groupId]: { status: 'error', message: e.message },
      }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Pengaturan Pembayaran</h1>
        <p className="text-muted-foreground text-sm">
          Atur konfigurasi QRIS, E-Money, dan rekening bank yang digunakan siswa untuk membayar.
          Semua nilai disimpan secara aman di database dan langsung aktif setelah disimpan.
        </p>
      </div>

      {/* How-to notice */}
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
          <p className="font-semibold">Cara penggunaan:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs">
            <li>Jalankan SQL migration <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">scripts/006_complete_payment_setup.sql</code> di Supabase SQL Editor (hanya sekali).</li>
            <li>Isi kolom-kolom di bawah sesuai akun merchant Anda.</li>
            <li>Klik <strong>Simpan</strong> per bagian. Perubahan langsung aktif.</li>
            <li>Untuk QRIS: paste string lengkap dari stiker / aplikasi bank (dimulai <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">000201</code>).</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Config groups */}
      {CONFIG_GROUPS.map(group => {
        const saveState = saveStates[group.id] || { status: 'idle' }
        const Icon = group.icon
        return (
          <Card key={group.id} className="border-slate-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${group.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${group.color}`} />
                </div>
                <div>
                  <CardTitle className="text-base">{group.label}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{group.description}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Fields grid */}
              <div className={`grid gap-4 ${group.fields.length > 1 && !group.fields[0].multiline ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                {group.fields.map(field => (
                  <ConfigField
                    key={field.key}
                    fieldKey={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    hint={(field as any).hint}
                    multiline={(field as any).multiline}
                    value={config[field.key] ?? ''}
                    onChange={handleChange}
                  />
                ))}
              </div>

              {/* Save feedback */}
              {saveState.status === 'success' && (
                <Alert className="bg-green-50 border-green-200 py-2">
                  <AlertDescription className="text-green-700 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {saveState.message}
                  </AlertDescription>
                </Alert>
              )}
              {saveState.status === 'error' && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="flex items-center gap-1.5 text-sm">
                    <AlertCircle className="w-4 h-4" /> {saveState.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Save button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => handleSaveGroup(group.id, group.fields)}
                  disabled={saveState.status === 'saving'}
                  size="sm"
                  className="min-w-[110px]"
                >
                  {saveState.status === 'saving' ? (
                    <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Save className="w-3.5 h-3.5 mr-1.5" /> Simpan</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
