/**
 * QRIS (Quick Response Code Indonesian Standard) Utility
 *
 * Implements the static → dynamic QRIS conversion algorithm used by
 * Bank Indonesia's QRIS standard (EMVCo CPAS-based TLV format).
 *
 * Algorithm reference: https://github.com/verssache/qris-dinamis
 */

// ---------------------------------------------------------------------------
// CRC-16/CCITT-FALSE (polynomial 0x1021, init 0xFFFF, no reflect)
// ---------------------------------------------------------------------------
function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// ---------------------------------------------------------------------------
// TLV helpers
// ---------------------------------------------------------------------------
interface TlvField {
  tag: string
  length: number
  value: string
}

function parseTlv(qris: string): TlvField[] {
  const fields: TlvField[] = []
  let i = 0
  while (i < qris.length - 4) {
    const tag = qris.substring(i, i + 2)
    const length = parseInt(qris.substring(i + 2, i + 4), 10)
    const value = qris.substring(i + 4, i + 4 + length)
    fields.push({ tag, length, value })
    i += 4 + length
  }
  return fields
}

function buildTlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a static QRIS string into a dynamic one with a specific amount.
 *
 * @param staticQris  The raw static QRIS string (from sticker / PDF)
 * @param amount      Payment amount in IDR (integer, e.g. 150000)
 * @returns           The dynamic QRIS string ready for QR code rendering
 */
export function convertToDynamic(staticQris: string, amount: number): string {
  // Strip trailing CRC field (last 8 chars: "6304XXXX") before processing
  const withoutCrc = staticQris.slice(0, -4)
  const fields = parseTlv(withoutCrc)

  const result: string[] = []

  let hasAmount = false
  for (const field of fields) {
    // Tag 01: Point of Initiation Method — change "11" (static) to "12" (dynamic)
    if (field.tag === '01') {
      result.push(buildTlv('01', '12'))
      continue
    }
    // Tag 54: Transaction Amount — replace/inject
    if (field.tag === '54') {
      hasAmount = true
      result.push(buildTlv('54', String(amount)))
      continue
    }
    // Tag 63: CRC — skip; we will recalculate
    if (field.tag === '63') {
      continue
    }
    result.push(buildTlv(field.tag, field.value))
  }

  // Inject amount if the static QRIS did not have tag 54
  if (!hasAmount) {
    // Insert tag 54 before tag 58 (Country Code) for correct field ordering
    const idx = result.findIndex(s => s.startsWith('58'))
    const amountField = buildTlv('54', String(amount))
    if (idx >= 0) {
      result.splice(idx, 0, amountField)
    } else {
      result.push(amountField)
    }
  }

  // Append CRC placeholder and calculate
  const payload = result.join('') + '6304'
  const checksum = crc16(payload)
  return payload + checksum
}

/**
 * Validate a QRIS string by checking its CRC-16 checksum.
 */
export function validateQris(qris: string): boolean {
  if (qris.length < 8) return false
  const payload = qris.slice(0, -4)
  const providedCrc = qris.slice(-4).toUpperCase()
  return crc16(payload + '6304') === providedCrc
}

/**
 * Extract the merchant name from a QRIS string (tag 59).
 */
export function getMerchantName(qris: string): string {
  const withoutCrc = qris.slice(0, -4)
  const fields = parseTlv(withoutCrc)
  return fields.find(f => f.tag === '59')?.value ?? ''
}
