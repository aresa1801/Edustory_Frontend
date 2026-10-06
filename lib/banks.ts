// lib/banks.ts
// Daftar kode bank yang dipakai Midtrans Iris (payout) + label untuk UI.

export interface BankOption {
  code: string
  name: string
}

export const BANKS: BankOption[] = [
  { code: 'bca', name: 'BCA' },
  { code: 'bni', name: 'BNI' },
  { code: 'bri', name: 'BRI' },
  { code: 'mandiri', name: 'Mandiri' },
  { code: 'permata', name: 'Permata' },
  { code: 'cimb', name: 'CIMB Niaga' },
  { code: 'danamon', name: 'Danamon' },
  { code: 'bsi', name: 'BSI (Bank Syariah Indonesia)' },
  { code: 'btn', name: 'BTN' },
  { code: 'maybank', name: 'Maybank' },
  { code: 'panin', name: 'Panin' },
  { code: 'uob', name: 'UOB' },
  { code: 'ocbc', name: 'OCBC' },
  { code: 'bdo', name: 'BDO' },
]

export const BANK_CODES = BANKS.map((b) => b.code)

export function bankName(code: string): string {
  return BANKS.find((b) => b.code === code)?.name || code.toUpperCase()
}
