// ============================================================
// SECURITY UTILS
// ============================================================

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

// Karakter berbahaya: HTML special chars + kontrol + null
const FORBIDDEN_CHARS_REGEX = /[<>"'`\\\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\ufeff]/g

/**
 * Sanitize text input (untuk label, nama folder, dsb)
 * - Strip HTML special chars
 * - Strip control chars
 * - Normalize Unicode (cegah bypass)
 * - Limit panjang
 */
export function sanitizeText(
  input: unknown,
  maxLength: number = 50
): { ok: boolean; sanitized: string; error?: string } {
  if (typeof input !== 'string') {
    return { ok: false, sanitized: '', error: 'Input harus teks' }
  }

  let cleaned = input.trim()

  // Normalize Unicode
  try {
    cleaned = cleaned.normalize('NFKC')
  } catch {
    return { ok: false, sanitized: '', error: 'Karakter tidak valid' }
  }

  // Cek panjang
  if (cleaned.length === 0) {
    return { ok: false, sanitized: '', error: 'Tidak boleh kosong' }
  }
  if (cleaned.length > maxLength) {
    return {
      ok: false,
      sanitized: '',
      error: `Maksimal ${maxLength} karakter`,
    }
  }

  // Cek karakter berbahaya
  if (FORBIDDEN_CHARS_REGEX.test(cleaned)) {
    return {
      ok: false,
      sanitized: '',
      error: 'Mengandung karakter yang tidak diizinkan',
    }
  }

  // Whitelist: huruf, angka, spasi, titik, koma, dash, underscore, ()
  // Bisa disesuaikan
  const ALLOWED_REGEX = /^[a-zA-Z0-9\s.,\-_()&/]+$/u
  if (!ALLOWED_REGEX.test(cleaned)) {
    return {
      ok: false,
      sanitized: '',
      error: 'Hanya boleh huruf, angka, spasi, dan simbol umum',
    }
  }

  return { ok: true, sanitized: cleaned }
}