'use client'

import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'
import { BANKS, bankName } from '@/lib/banks'
import {
  PageHeader,
  SectionCard,
  EmptyState,
  TonePill,
} from '@/components/dashboard/ui'
import {
  Wallet,
  ArrowUp,
  ArrowDown,
  History,
  Landmark,
  Plus,
  Trash2,
  Star,
  Info,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Lock,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface WalletTransaction {
  id: string
  amount: number
  type?: string
  transaction_type?: string
  status?: string
  description?: string
  notes?: string
  reference?: string
  reference_id?: string
  balance_after?: number
  created_at: string
}

interface BankAccount {
  id: string
  bank_code: string
  account_number: string
  account_name: string
  is_primary: boolean
  created_at: string
}

interface Withdrawal {
  id: string
  amount: number
  status: string
  midtrans_reference_no: string | null
  rejection_reason: string | null
  processed_at: string | null
  created_at: string
  bank_accounts: {
    id: string
    bank_code: string
    account_number: string
    account_name: string
  } | null
}

interface Balances {
  balance: number
  hold: number
  available: number
}

type Tone = 'primary' | 'secondary' | 'accent' | 'danger' | 'muted'

// ============================================================
// HELPERS
// ============================================================
const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  rejected: 'Ditolak',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
}

const STATUS_TONES: Record<string, Tone> = {
  pending: 'accent',
  processing: 'primary',
  completed: 'secondary',
  rejected: 'danger',
  failed: 'danger',
  cancelled: 'muted',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status
}

function statusTone(status: string): Tone {
  return STATUS_TONES[status] || 'muted'
}

function rupiah(value: number): string {
  return `Rp ${Math.round(Number(value) || 0).toLocaleString('id-ID')}`
}

function fmtDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} · ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
}

function getTxLabel(tx: WalletTransaction): string {
  if (tx.description) return tx.description
  if (tx.notes) return tx.notes
  const t = (tx.type || tx.transaction_type || '').toLowerCase()
  const LABELS: Record<string, string> = {
    session_earning: 'Pendapatan Sesi',
    session_release: 'Pendapatan Sesi',
    refund: 'Pengembalian Dana',
    withdrawal: 'Penarikan Saldo',
    withdrawal_completed: 'Penarikan Selesai',
    credit: 'Kredit',
    debit: 'Debit',
  }
  return LABELS[t] || 'Transaksi'
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function TutorWalletClient({
  initialBalance,
  tutorId,
  tutorName,
  initialToken,
}: {
  initialBalance: number
  tutorId: string
  tutorName: string
  initialToken?: string | null
}) {
  // -- existing (kept) --
  const [balance, setBalance] = useState(initialBalance)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [txLoading, setTxLoading] = useState(true)

  // -- session --
  const [sessionError, setSessionError] = useState<string | null>(null)

  // -- bank accounts --
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  // add-account form
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [makePrimary, setMakePrimary] = useState(false)
  const [acctSubmitting, setAcctSubmitting] = useState(false)
  const [acctError, setAcctError] = useState<string | null>(null)
  const [acctSuccess, setAcctSuccess] = useState<string | null>(null)
  const [acctActionId, setAcctActionId] = useState<string | null>(null)

  // -- withdrawals --
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [balances, setBalances] = useState<Balances>({
    balance: initialBalance,
    hold: 0,
    available: initialBalance,
  })
  const [minWithdrawal, setMinWithdrawal] = useState(0)
  const [wdLoading, setWdLoading] = useState(true)
  const [wdLoaded, setWdLoaded] = useState(false)
  const [wdError, setWdError] = useState<string | null>(null)

  // withdrawal form
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [wdSubmitting, setWdSubmitting] = useState(false)
  const [wdFormError, setWdFormError] = useState<string | null>(null)
  const [wdSuccess, setWdSuccess] = useState<string | null>(null)
  const [wdActionId, setWdActionId] = useState<string | null>(null)
  const amountTouched = useRef(false)

  const accountsSectionRef = useRef<HTMLDivElement | null>(null)

  // Access token for API calls. Prefer the token the server already read from
  // the session cookie (reliable, no client round-trip). Fall back to the
  // browser Supabase client, with a timeout so the UI never hangs forever.
  const tokenRef = useRef<string | null>(initialToken || null)

  const withToken = async (): Promise<string | null> => {
    if (tokenRef.current) {
      setSessionError(null)
      return tokenRef.current
    }
    try {
      const supabase = createClient()
      const sessionPromise = supabase.auth
        .getSession()
        .then((r) => r?.data?.session ?? null)
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))
      const session = await Promise.race([sessionPromise, timeout])
      const token = session?.access_token || null
      if (!token) {
        setSessionError(
          'Sesi tidak terdeteksi. Muat ulang halaman ini, atau login ulang.'
        )
        return null
      }
      tokenRef.current = token
      setSessionError(null)
      return token
    } catch {
      setSessionError('Sesi tidak terdeteksi. Muat ulang halaman ini, atau login ulang.')
      return null
    }
  }

  // ------------------------------------------------------------
  // Existing wallet data (unchanged endpoints)
  // ------------------------------------------------------------
  const refreshBalance = async () => {
    if (!tutorId) return
    try {
      const res = await fetch(
        `/api/tutors/wallet-balance?tutor_id=${tutorId}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (res.ok) setBalance(Number(data.balance) || 0)
    } catch (err) {
      console.warn('[TutorWallet] balance error:', err)
    }
  }

  const refreshTransactions = async () => {
    if (!tutorId) {
      setTxLoading(false)
      return
    }

    setTxLoading(true)
    try {
      const res = await fetch(
        `/api/tutors/wallet-transactions?tutor_id=${tutorId}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('[TutorWallet] tx error:', err)
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }

  // ------------------------------------------------------------
  // Bank accounts
  // ------------------------------------------------------------
  const loadAccounts = async () => {
    setAccountsLoading(true)
    try {
      const token = await withToken()
      if (!token) return
      const res = await fetch('/api/bank-accounts', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat rekening')
      setAccounts((data.accounts as BankAccount[]) || [])
      setAccountsError(null)
    } catch (err) {
      setAccountsError(
        err instanceof Error ? err.message : 'Gagal memuat rekening'
      )
    } finally {
      setAccountsLoading(false)
    }
  }

  const addAccount = async (e: FormEvent) => {
    e.preventDefault()
    setAcctError(null)
    setAcctSuccess(null)

    const digits = accountNumber.replace(/[^0-9]/g, '')
    if (!bankCode) {
      setAcctError('Pilih bank terlebih dahulu.')
      return
    }
    if (digits.length < 6 || digits.length > 20) {
      setAcctError('Nomor rekening harus 6–20 digit angka.')
      return
    }
    if (accountName.trim().length < 3) {
      setAcctError('Nama pemilik rekening minimal 3 karakter.')
      return
    }

    setAcctSubmitting(true)
    try {
      const token = await withToken()
      if (!token) return
      const res = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bank_code: bankCode,
          account_number: digits,
          account_name: accountName.trim(),
          is_primary: makePrimary,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAcctError(data?.error || 'Gagal menyimpan rekening.')
        return
      }
      setAcctSuccess('Rekening berhasil ditambahkan.')
      setBankCode('')
      setAccountNumber('')
      setAccountName('')
      setMakePrimary(false)
      await loadAccounts()
    } catch {
      setAcctError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setAcctSubmitting(false)
    }
  }

  const setPrimaryAccount = async (id: string) => {
    setAcctError(null)
    setAcctSuccess(null)
    setAcctActionId(id)
    try {
      const token = await withToken()
      if (!token) return
      const res = await fetch('/api/bank-accounts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAcctError(data?.error || 'Gagal menjadikan rekening utama.')
        return
      }
      setAcctSuccess('Rekening utama diperbarui.')
      await loadAccounts()
    } catch {
      setAcctError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setAcctActionId(null)
    }
  }

  const deleteAccount = async (id: string) => {
    if (!window.confirm('Hapus rekening ini? Tindakan ini tidak bisa dibatalkan.')) {
      return
    }
    setAcctError(null)
    setAcctSuccess(null)
    setAcctActionId(id)
    try {
      const token = await withToken()
      if (!token) return
      const res = await fetch(`/api/bank-accounts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setAcctError(data?.error || 'Gagal menghapus rekening.')
        return
      }
      setAcctSuccess('Rekening dihapus.')
      if (selectedAccountId === id) setSelectedAccountId('')
      await loadAccounts()
    } catch {
      setAcctError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setAcctActionId(null)
    }
  }

  // ------------------------------------------------------------
  // Withdrawals
  // ------------------------------------------------------------
  const loadWithdrawals = async () => {
    setWdLoading(true)
    try {
      const token = await withToken()
      if (!token) return
      const res = await fetch('/api/withdrawals', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat data penarikan')
      setWithdrawals((data.withdrawals as Withdrawal[]) || [])
      setBalances(
        (data.balances as Balances) || { balance: 0, hold: 0, available: 0 }
      )
      setMinWithdrawal(Number(data.minWithdrawal) || 0)
      setWdLoaded(true)
      setWdError(null)
    } catch (err) {
      setWdError(
        err instanceof Error ? err.message : 'Gagal memuat data penarikan'
      )
    } finally {
      setWdLoading(false)
    }
  }

  const submitWithdrawal = async (e: FormEvent) => {
    e.preventDefault()
    setWdFormError(null)
    setWdSuccess(null)

    const amt = Math.round(Number(amount))
    if (!selectedAccountId) {
      setWdFormError('Pilih rekening tujuan terlebih dahulu.')
      return
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setWdFormError('Jumlah penarikan tidak valid.')
      return
    }
    if (minWithdrawal > 0 && amt < minWithdrawal) {
      setWdFormError(`Minimal penarikan ${rupiah(minWithdrawal)}.`)
      return
    }
    if (amt > balances.available) {
      setWdFormError(`Saldo tersedia tidak cukup. Tersedia ${rupiah(balances.available)}.`)
      return
    }

    setWdSubmitting(true)
    try {
      const token = await withToken()
      if (!token) return
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amt, bank_account_id: selectedAccountId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setWdFormError(data?.error || 'Gagal mengajukan penarikan.')
        return
      }
      setWdSuccess('Permintaan penarikan berhasil diajukan.')
      setAmount('')
      amountTouched.current = false
      await Promise.all([loadWithdrawals(), refreshBalance(), refreshTransactions()])
    } catch {
      setWdFormError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setWdSubmitting(false)
    }
  }

  const cancelWithdrawal = async (id: string) => {
    if (!window.confirm('Batalkan penarikan ini?')) return
    setWdFormError(null)
    setWdSuccess(null)
    setWdActionId(id)
    try {
      const token = await withToken()
      if (!token) return
      const res = await fetch('/api/withdrawals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setWdFormError(data?.error || 'Gagal membatalkan penarikan.')
        return
      }
      setWdSuccess('Penarikan dibatalkan.')
      await Promise.all([loadWithdrawals(), refreshBalance(), refreshTransactions()])
    } catch {
      setWdFormError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setWdActionId(null)
    }
  }

  // ------------------------------------------------------------
  // Effects
  // ------------------------------------------------------------
  useEffect(() => {
    refreshBalance()
    refreshTransactions()
    loadAccounts()
    loadWithdrawals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorId])

  // Default the withdrawal amount to the available balance until the user edits it.
  useEffect(() => {
    if (!wdLoaded) return
    if (!amountTouched.current) {
      setAmount(balances.available > 0 ? String(balances.available) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wdLoaded, balances.available])

  // Auto-select the primary (or first) account.
  useEffect(() => {
    if (selectedAccountId) return
    if (accounts.length === 0) return
    const primary = accounts.find((a) => a.is_primary) || accounts[0]
    setSelectedAccountId(primary.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts])

  // ------------------------------------------------------------
  // Derived
  // ------------------------------------------------------------
  const visibleTransactions = useMemo(() => {
    return transactions
      .filter((tx) => (tx.status || '').toLowerCase() === 'completed')
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }, [transactions])

  const activeWithdrawal = useMemo(
    () =>
      withdrawals.find(
        (w) => w.status === 'pending' || w.status === 'processing'
      ) || null,
    [withdrawals]
  )

  const displayAvailable = wdLoaded ? balances.available : balance
  const displayHold = wdLoaded ? balances.hold : 0
  const displayTotal = wdLoaded ? balances.balance : balance

  const canWithdraw =
    accounts.length > 0 && !activeWithdrawal && displayAvailable > 0

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="container-page section-pad space-y-6">
      <PageHeader
        eyebrow="DOMPET PENGAJAR"
        title={
          <span className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Wallet Deposit
          </span>
        }
        description={`Halo ${tutorName}, kelola saldo dan penarikan hasil mengajar Anda di sini.`}
      />

      {sessionError ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{sessionError}</p>
        </div>
      ) : null}

      {/* ---------------- BALANCE ---------------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="surface border-primary/20 bg-primary/5 p-5 sm:col-span-2 lg:col-span-1">
          <p className="eyebrow text-primary">Saldo Tersedia</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            {rupiah(displayAvailable)}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Sedang ditahan{' '}
              <span className="font-semibold text-foreground">
                {rupiah(displayHold)}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" />
              Total saldo{' '}
              <span className="font-semibold text-foreground">
                {rupiah(displayTotal)}
              </span>
            </span>
          </div>
        </div>

        <div className="surface p-5 sm:col-span-2 lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Info className="h-4 w-4" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold">Tentang saldo Anda</p>
              <p className="text-sm text-muted-foreground">
                Saldo bertambah setiap sesi mengajar selesai (setelah dipotong fee
                platform). Saldo yang masih ditahan adalah penarikan yang sedang
                diproses.
              </p>
              {minWithdrawal > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Minimal penarikan {rupiah(minWithdrawal)}.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- WITHDRAW + BANK ACCOUNTS ---------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tarik Saldo */}
        <SectionCard
          title="Tarik Saldo"
          description="Pindahkan saldo ke rekening bank Anda."
        >
          {wdLoading && !wdLoaded ? (
            <div className="flex flex-col items-center py-8">
              <Spinner className="h-6 w-6" />
              <p className="mt-2 text-xs text-muted-foreground">
                Memuat data penarikan...
              </p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/10 p-3 text-sm text-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p>
                  Anda belum memiliki rekening bank. Tambahkan rekening terlebih
                  dahulu sebelum menarik saldo.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  accountsSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
              >
                <Plus className="h-4 w-4" /> Tambah Rekening Bank
              </Button>
            </div>
          ) : (
            <form onSubmit={submitWithdrawal} className="space-y-4">
              {activeWithdrawal ? (
                <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    Anda masih memiliki penarikan yang{' '}
                    <span className="font-medium">
                      {statusLabel(activeWithdrawal.status).toLowerCase()}
                    </span>
                    . Tunggu hingga selesai sebelum mengajukan penarikan baru.
                  </p>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label
                  htmlFor="wd-account"
                  className="text-sm font-medium text-foreground"
                >
                  Rekening Tujuan
                </label>
                <select
                  id="wd-account"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  disabled={!!activeWithdrawal}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {bankName(a.bank_code)} · {a.account_number} · {a.account_name}
                      {a.is_primary ? ' (Utama)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="wd-amount"
                  className="text-sm font-medium text-foreground"
                >
                  Jumlah Penarikan
                </label>
                <input
                  id="wd-amount"
                  type="number"
                  inputMode="numeric"
                  min={minWithdrawal || 0}
                  step={1000}
                  value={amount}
                  onChange={(e) => {
                    amountTouched.current = true
                    setAmount(e.target.value)
                  }}
                  disabled={!!activeWithdrawal}
                  placeholder={String(balances.available || 0)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Tersedia {rupiah(displayAvailable)}
                  {minWithdrawal > 0
                    ? ` · Minimal ${rupiah(minWithdrawal)}`
                    : ''}
                </p>
              </div>

              {wdFormError ? (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{wdFormError}</p>
                </div>
              ) : null}
              {wdSuccess ? (
                <div className="flex items-start gap-2 rounded-xl border border-secondary/25 bg-secondary/10 p-3 text-sm text-secondary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{wdSuccess}</p>
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={wdSubmitting || !canWithdraw}
              >
                {wdSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4" /> Mengajukan...
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4" /> Ajukan Penarikan
                  </>
                )}
              </Button>
            </form>
          )}
        </SectionCard>

        {/* Rekening Bank */}
        <div ref={accountsSectionRef} className="scroll-mt-24">
          <SectionCard
            title="Rekening Bank"
            description="Rekening tujuan penarikan saldo Anda."
          >
            <div className="space-y-4">
              {accountsError ? (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{accountsError}</p>
                </div>
              ) : null}

              {accountsLoading ? (
                <div className="flex flex-col items-center py-6">
                  <Spinner className="h-5 w-5" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Memuat rekening...
                  </p>
                </div>
              ) : accounts.length === 0 ? (
                <EmptyState
                  icon={Landmark}
                  title="Belum ada rekening"
                  description="Tambahkan rekening bank untuk mulai menarik saldo."
                  className="py-8"
                />
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border/60">
                  {accounts.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Landmark className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {bankName(a.bank_code)}
                            </p>
                            {a.is_primary ? (
                              <TonePill tone="secondary">
                                <Star className="h-3 w-3" /> Utama
                              </TonePill>
                            ) : null}
                          </div>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {a.account_number}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            a.n. {a.account_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {!a.is_primary ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={acctActionId === a.id}
                            onClick={() => setPrimaryAccount(a.id)}
                          >
                            {acctActionId === a.id ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                            Jadikan Utama
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={acctActionId === a.id}
                          onClick={() => deleteAccount(a.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Hapus
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add form */}
              <form
                onSubmit={addAccount}
                className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4"
              >
                <p className="text-sm font-medium">Tambah Rekening</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="acct-bank"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Bank
                    </label>
                    <select
                      id="acct-bank"
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <option value="">Pilih bank</option>
                      {BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="acct-number"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Nomor Rekening
                    </label>
                    <input
                      id="acct-number"
                      inputMode="numeric"
                      value={accountNumber}
                      onChange={(e) =>
                        setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))
                      }
                      placeholder="6–20 digit"
                      maxLength={20}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="acct-name"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Nama Pemilik Rekening
                  </label>
                  <input
                    id="acct-name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Sesuai buku tabungan"
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={makePrimary}
                    onChange={(e) => setMakePrimary(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Jadikan rekening utama
                </label>

                {acctError ? (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{acctError}</p>
                  </div>
                ) : null}
                {acctSuccess ? (
                  <div className="flex items-start gap-2 rounded-xl border border-secondary/25 bg-secondary/10 p-3 text-sm text-secondary">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{acctSuccess}</p>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={acctSubmitting}
                >
                  {acctSubmitting ? (
                    <>
                      <Spinner className="h-4 w-4" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Tambah Rekening
                    </>
                  )}
                </Button>
              </form>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ---------------- WITHDRAWAL HISTORY ---------------- */}
      <SectionCard
        title="Riwayat Penarikan"
        description="Daftar permintaan penarikan saldo Anda."
      >
        {wdLoading && !wdLoaded ? (
          <div className="flex flex-col items-center py-10">
            <Spinner className="h-6 w-6" />
            <p className="mt-2 text-xs text-muted-foreground">
              Memuat riwayat...
            </p>
          </div>
        ) : wdError ? (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{wdError}</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Belum ada penarikan"
            description="Permintaan penarikan saldo akan muncul di sini."
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {withdrawals.map((w) => {
              const bank = w.bank_accounts
              const canCancel = w.status === 'pending'
              return (
                <li
                  key={w.id}
                  className="rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/20 sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">
                          {rupiah(w.amount)}
                        </p>
                        <TonePill tone={statusTone(w.status)}>
                          {statusLabel(w.status)}
                        </TonePill>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateTime(w.created_at)}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Landmark className="h-3.5 w-3.5" />
                        {bank
                          ? `${bankName(bank.bank_code)} · ${bank.account_number} · a.n. ${bank.account_name}`
                          : 'Rekening tidak tersedia'}
                      </p>
                      {w.status === 'rejected' && w.rejection_reason ? (
                        <p className="text-xs text-destructive">
                          Alasan: {w.rejection_reason}
                        </p>
                      ) : null}
                    </div>

                    {canCancel ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={wdActionId === w.id}
                        onClick={() => cancelWithdrawal(w.id)}
                      >
                        {wdActionId === w.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : null}
                        Batalkan
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {/* ---------------- TRANSACTION LOG (kept) ---------------- */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Log Transaksi
          </span>
        }
        description="Riwayat pendapatan dan transaksi dompet Anda."
      >
        {txLoading ? (
          <div className="flex flex-col items-center py-10">
            <Spinner className="h-6 w-6" />
            <p className="mt-2 text-xs text-muted-foreground">Memuat log...</p>
          </div>
        ) : visibleTransactions.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada transaksi"
            description="Pendapatan dari sesi mengajar akan muncul di sini."
            className="py-8"
          />
        ) : (
          <div className="space-y-2">
            {visibleTransactions.map((tx) => {
              const amt = Number(tx.amount) || 0
              const isIncome = amt > 0
              const absAmount = Math.abs(amt)
              const label = getTxLabel(tx)
              const date = new Date(tx.created_at)

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 p-3 transition-colors hover:bg-muted/20"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isIncome
                          ? 'bg-secondary/15 text-secondary'
                          : 'bg-destructive/15 text-destructive'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        ·{' '}
                        {date.toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`ml-2 shrink-0 text-sm font-semibold ${
                      isIncome ? 'text-secondary' : 'text-destructive'
                    }`}
                  >
                    {isIncome ? '+' : '−'}Rp {absAmount.toLocaleString('id-ID')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
