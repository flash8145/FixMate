export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      },
    )
    const data = await res.json()
    const addr = data.address || {}
    const road = addr.road || addr.pedestrian || addr.suburb || ''
    const houseNumber = addr.house_number ? `${addr.house_number}, ` : ''
    const line =
      (houseNumber + road).trim() ||
      data.display_name?.split(',')[0]?.trim() ||
      'Selected Location'
    const area =
      addr.suburb ||
      addr.neighbourhood ||
      addr.subdistrict ||
      addr.quarter ||
      addr.residential ||
      ''
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.state_district ||
      'Pune'
    const pincode = addr.postcode || ''

    return {
      line,
      area,
      city,
      pincode,
      display_name: data.display_name || `${line}, ${city}`,
      lat: Number(lat),
      lng: Number(lng),
    }
  } catch {
    return {
      line: '',
      area: '',
      city: 'Pune',
      pincode: '',
      display_name: '',
      lat: Number(lat),
      lng: Number(lng),
    }
  }
}
