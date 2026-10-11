// Menghitung hash isi berkas. Dipakai untuk nama aset dan data JSON hasil build.
import { createHash } from 'node:crypto';

/**
 * Mengembalikan 8 karakter pertama sha256 dari data yang diberikan.
 * Dipakai sebagai penanda unik isi berkas, bukan sebagai fungsi keamanan.
 */
export function hashIsi(data, panjang = 8) {
  return createHash('sha256').update(data).digest('hex').slice(0, panjang);
}
