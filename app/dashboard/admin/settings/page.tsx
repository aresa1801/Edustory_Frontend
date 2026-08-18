'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

// ===== TYPES =====
type ConfigMap = Record<string, string>

interface SaveState {
  status: 'idle' | 'saving' | 'success' | 'error'
  message?: string
}

interface FieldConfig {
  key: string
  label: string
  placeholder: string
  hint?: string
  multiline?: boolean
}

interface ConfigGroup {
  id: string
  label: string
  icon: React.ElementType
  color: string
  bg: string
  description: string
  fields: FieldConfig[]
}

// ===== CONFIG GROUPS =====
const CONFIG_GROUPS: ConfigGroup[] = [
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

// ===== FIELD COMPONENT =====
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

// ===== AMBIL TOKEN DARI COOKIE =====
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

// ===== MAIN SETTINGS PAGE =====
export default function AdminSettingsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<ConfigMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const init = async () => {
      console.log('[Admin Settings] Init start')
      try {
        const supabase = createClient()
        console.log('[Admin Settings] Supabase client created')

        // === AMBIL TOKEN DARI COOKIE ===
        const cookieNames = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token']
        let token: string | null = null
        
        // Coba cari token di cookie
        for (const name of cookieNames) {
          const val = getCookie(name)
          if (val) {
            try {
              const parsed = JSON.parse(decodeURIComponent(val))
              if (parsed?.access_token) {
                token = parsed.access_token
                break
              }
            } catch {}
          }
        }

        // Jika tidak ketemu, coba di localStorage
        if (!token) {
          const tokenKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.includes('auth-token'))
          if (tokenKey) {
            const raw = localStorage.getItem(tokenKey)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (parsed?.access_token) {
                token = parsed.access_token
              }
            }
          }
        }

        if (!token) {
          throw new Error('Token tidak ditemukan. Silakan login ulang.')
        }

        console.log('[Admin Settings] Token found, verifying user...')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)
        if (userError || !user) {
          throw new Error(userError?.message || 'User tidak valid')
        }
        console.log('[Admin Settings] User verified:', user.email)

        // === CEK ADMIN ===
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          throw new Error('Gagal cek profil: ' + profileError.message)
        }

        if (!profile || profile.role !== 'admin') {
          throw new Error('Akses ditolak. Hanya admin.')
        }
        console.log('[Admin Settings] Is admin')

        // === FETCH CONFIG ===
        const { data: rows, error: fetchError } = await supabase
          .from('payment_config')
          .select('config_key, config_value')

        if (fetchError) throw new Error(fetchError.message)

        if (isMounted) {
          const map: ConfigMap = {}
          for (const row of rows || []) {
            map[row.config_key] = row.config_value || ''
          }
          setConfig(map)
          console.log('[Admin Settings] Config loaded')
          setLoading(false)
        }
      } catch (err: any) {
        console.error('[Admin Settings] Error:', err)
        if (isMounted) {
          setError(err.message || 'Gagal memuat konfigurasi')
          setLoading(false)
        }
      }
    }

    init()

    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[Admin Settings] FORCE STOP LOADING (timeout)')
        setError('Waktu muat habis. Silakan refresh atau cek koneksi database.')
        setLoading(false)
      }
    }, 5000)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveGroup = async (groupId: string, fields: FieldConfig[]) => {
    setSaveStates(prev => ({ ...prev, [groupId]: { status: 'saving' } }))

    try {
      const supabase = createClient()
      // Ambil token lagi
      let token: string | null = null
      const cookieNames = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token']
      for (const name of cookieNames) {
        const val = getCookie(name)
        if (val) {
          try {
            const parsed = JSON.parse(decodeURIComponent(val))
            if (parsed?.access_token) {
              token = parsed.access_token
              break
            }
          } catch {}
        }
      }
      if (!token) {
        const tokenKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.includes('auth-token'))
        if (tokenKey) {
          const raw = localStorage.getItem(tokenKey)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.access_token) token = parsed.access_token
          }
        }
      }
      if (!token) throw new Error('Token tidak ditemukan')

      const { data: { user } } = await supabase.auth.getUser(token)
      if (!user) throw new Error('User tidak valid')

      // Upsert setiap field
      for (const field of fields) {
        const { error } = await supabase
          .from('payment_config')
          .upsert({
            config_key: field.key,
            config_value: (config[field.key] ?? '').trim(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'config_key' })

        if (error) throw error
      }

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
        [groupId]: { status: 'error', message: e.message || 'Gagal menyimpan' },
      }))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat pengaturan pembayaran...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-3xl mx-auto">
        <AlertDescription>
          <strong>Error:</strong> {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={() => window.location.reload()}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="ml-2" onClick={() => router.push('/auth/login')}>
            Login Ulang
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Pengaturan Pembayaran</h1>
        <p className="text-muted-foreground text-sm">
          Atur konfigurasi QRIS, E-Money, dan rekening bank.
        </p>
      </div>

      {CONFIG_GROUPS.map(group => {
        const saveState = saveStates[group.id] || { status: 'idle' }
        const Icon = group.icon
        const firstField = group.fields[0]
        const isMultiline = firstField?.multiline || false

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
              <div className={`grid gap-4 ${group.fields.length > 1 && !isMultiline ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                {group.fields.map(field => (
                  <ConfigField
                    key={field.key}
                    fieldKey={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    hint={field.hint}
                    multiline={field.multiline}
                    value={config[field.key] ?? ''}
                    onChange={handleChange}
                  />
                ))}
              </div>

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