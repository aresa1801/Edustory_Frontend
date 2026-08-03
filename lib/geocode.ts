export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim().length < 5) {
    console.warn('[Geocode] Alamat terlalu pendek atau kosong')
    return null
  }

  const encoded = encodeURIComponent(address.trim())
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1`

  try {
    console.log('[Geocode] Fetching:', url)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'EduStory/1.0 (https://edustory.com)',
      },
    })
    if (!res.ok) {
      console.error('[Geocode] HTTP Error:', res.status, res.statusText)
      return null
    }
    const data = await res.json()
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }
    }
    console.warn('[Geocode] Alamat tidak ditemukan:', address)
    return null
  } catch (err) {
    console.error('[Geocode] Error:', err)
    return null
  }
}