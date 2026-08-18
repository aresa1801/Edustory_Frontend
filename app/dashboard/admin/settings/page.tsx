import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QrCode, Smartphone, Building2, Save, CheckCircle2, AlertCircle } from 'lucide-react'

// ===== TYPES =====
type ConfigMap = Record<string, string>

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

// ===== SERVER ACTION =====
async function saveConfig(formData: FormData) {
  'use server'
  
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  // Cek admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    throw new Error('Forbidden')
  }

  // Kumpulkan semua config dari form
  const updates: { key: string; value: string }[] = []
  for (const group of CONFIG_GROUPS) {
    for (const field of group.fields) {
      const value = formData.get(field.key) as string || ''
      updates.push({ key: field.key, value: value.trim() })
    }
  }

  // Upsert ke database
  for (const update of updates) {
    const { error } = await supabase
      .from('payment_config')
      .upsert({
        config_key: update.key,
        config_value: update.value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'config_key' })
    if (error) throw error
  }

  revalidatePath('/dashboard/admin/settings')
}

// ===== SERVER COMPONENT =====
export default async function AdminSettingsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/auth/login')
  }

  // Cek admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Ambil config
  const { data: rows } = await supabase
    .from('payment_config')
    .select('config_key, config_value')

  const configMap: ConfigMap = {}
  for (const row of rows || []) {
    configMap[row.config_key] = row.config_value || ''
  }

  // Cek apakah ada data QRIS yang tersimpan (untuk menampilkan notifikasi)
  const hasQris = configMap['qris_static_string']?.length > 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Pengaturan Pembayaran</h1>
        <p className="text-muted-foreground text-sm">
          Atur konfigurasi QRIS, E-Money, dan rekening bank yang digunakan siswa untuk membayar.
        </p>
      </div>

      {hasQris ? (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> QRIS sudah dikonfigurasi. Siswa dapat melakukan top-up.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertDescription className="text-yellow-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> QRIS belum dikonfigurasi. Siswa belum bisa melakukan top-up.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-700 text-sm space-y-1">
          <p className="font-semibold">Cara penggunaan:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs">
            <li>Isi kolom-kolom di bawah sesuai akun merchant Anda.</li>
            <li>Klik <strong>Simpan</strong> per bagian. Perubahan langsung aktif.</li>
            <li>Untuk QRIS: paste string lengkap dari stiker / aplikasi bank (dimulai <code className="bg-blue-100 px-1 rounded">000201</code>).</li>
            <li>Kosongkan kolom untuk metode yang tidak digunakan.</li>
          </ol>
        </AlertDescription>
      </Alert>

      <form action={saveConfig}>
        {CONFIG_GROUPS.map(group => {
          const Icon = group.icon
          const firstField = group.fields[0]
          const isMultiline = firstField?.multiline || false

          return (
            <Card key={group.id} className="border-slate-200 dark:border-gray-700 mb-6">
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
                  {group.fields.map(field => {
                    const value = configMap[field.key] || ''
                    const name = field.key
                    return (
                      <div key={field.key} className="space-y-1">
                        <label htmlFor={name} className="text-sm font-medium text-foreground">
                          {field.label}
                        </label>
                        {field.multiline ? (
                          <textarea
                            id={name}
                            name={name}
                            rows={3}
                            defaultValue={value}
                            placeholder={field.placeholder}
                            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono resize-y"
                          />
                        ) : (
                          <input
                            id={name}
                            name={name}
                            type="text"
                            defaultValue={value}
                            placeholder={field.placeholder}
                            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                          />
                        )}
                        {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="min-w-[110px]">
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Simpan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </form>
    </div>
  )
}