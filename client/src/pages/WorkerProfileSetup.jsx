import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../services/api.js'
import { useAuthStore } from '../store/authStore.js'
import { pageVariants } from '../utils/motion.js'
import LocationPickerModal from '../components/map/LocationPickerModal.jsx'
import { reverseGeocode } from '../services/geocoding.js'
import AvatarPickerModal from '../components/common/AvatarPickerModal.jsx'
import { AVATAR_PRESETS } from '../config/images.js'
import {
  Navigation,
  Map,
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Camera,
  Upload,
} from 'lucide-react'

function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const emptySkill = { categoryId: '', baseRate: '', rateUnit: 'PER_VISIT' }

export default function WorkerProfileSetup() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)
  const updateUser = useAuthStore((s) => s.updateUser)

  const photoInputRef = useRef(null)
  const [isPhotoUploading, setIsPhotoUploading] = useState(false)

  const [categories, setCategories] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [form, setForm] = useState({
    bio: '',
    experienceYrs: '',
    skills: [emptySkill],
    visitCharge: '',
    perKmRate: '',
    avatarUrl: '',
    photos: [],
    lat: 18.5204,
    lng: 73.8567,
    address: { line: '', area: '', city: 'Pune', pincode: '' },
    serviceRadiusKm: 15,
  })

  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load categories and worker's existing profile
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isBootstrapping && (!user || user.role !== 'worker')) {
      navigate('/login')
      return
    }

    if (user) {
      setLoadingProfile(true)
      api
        .get('/workers/profile/me')
        .then((res) => {
          const p = res.data.data
          if (p) {
            setForm({
              bio: p.bio || '',
              experienceYrs: p.experienceYrs || '',
              skills:
                p.skills && p.skills.length
                  ? p.skills.map((s) => ({
                      categoryId: s.categoryId?._id || s.categoryId || '',
                      baseRate: s.baseRate || '',
                      rateUnit: s.rateUnit || 'PER_VISIT',
                    }))
                  : [emptySkill],
              visitCharge: p.visitCharge ?? '',
              perKmRate: p.perKmRate ?? '',
              avatarUrl: p.userId?.avatarUrl || user.avatarUrl || '',
              photos: Array.isArray(p.photos) ? p.photos : [],
              lat: p.location?.coordinates?.[1] || 18.5204,
              lng: p.location?.coordinates?.[0] || 73.8567,
              address: {
                line: p.address?.line || '',
                area: p.address?.area || '',
                city: p.address?.city || 'Pune',
                pincode: p.address?.pincode || '',
              },
              serviceRadiusKm: p.serviceRadiusM ? Math.round(p.serviceRadiusM / 1000) : 15,
            })
          } else {
            // New worker, initialize with user's avatar if present
            setForm((prev) => ({
              ...prev,
              avatarUrl: user.avatarUrl || '',
              photos: [],
            }))
          }
        })
        .catch(() => {})
        .finally(() => setLoadingProfile(false))
    }
  }, [isBootstrapping, user, navigate])

  const handleWorkPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setIsPhotoUploading(true)
    setError('')
    try {
      const newPhotos = await Promise.all(
        files.map((file) => compressImage(file, 800, 800, 0.82)),
      )
      setForm((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), ...newPhotos],
      }))
      setSuccess(`${newPhotos.length} work photo(s) added! Click Save below to persist.`)
      setTimeout(() => setSuccess(''), 3500)
    } catch {
      setError('Could not process some uploaded work photos.')
    } finally {
      setIsPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = (index) => {
    setForm((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index),
    }))
  }

  const updateField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const updateAddress = (field) => (e) =>
    setForm((f) => ({ ...f, address: { ...f.address, [field]: e.target.value } }))

  const updateSkill = (index, field) => (e) => {
    const value = e.target.value
    setForm((f) => ({
      ...f,
      skills: f.skills.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }))
  }

  const addSkill = () => setForm((f) => ({ ...f, skills: [...f.skills, emptySkill] }))
  const removeSkill = (index) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((_, i) => i !== index) }))

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    setIsGpsLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const details = await reverseGeocode(latitude, longitude)
        setForm((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          address: {
            line: details.line || prev.address.line,
            area: details.area || prev.address.area,
            city: details.city || prev.address.city,
            pincode: details.pincode || prev.address.pincode,
          },
        }))
        setIsGpsLoading(false)
        setSuccess('Base location auto-filled using your GPS coordinates!')
        setTimeout(() => setSuccess(''), 3000)
      },
      () => {
        setIsGpsLoading(false)
        setError('Could not get GPS location. Please choose your location on the map.')
      },
    )
  }

  const handleSelectMapLocation = (details) => {
    setForm((prev) => ({
      ...prev,
      lat: details.lat,
      lng: details.lng,
      address: {
        line: details.line || prev.address.line,
        area: details.area || prev.address.area,
        city: details.city || prev.address.city,
        pincode: details.pincode || prev.address.pincode,
      },
    }))
    setSuccess('Location and address captured from map pin!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.skills.some((s) => !s.categoryId || !s.baseRate)) {
      setError('Please fill in every skill entry, or delete incomplete rows.')
      return
    }
    if (!form.address.city || !form.address.city.trim()) {
      setError('City is required in your base address.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        bio: form.bio || '',
        experienceYrs: Number(form.experienceYrs) || 0,
        visitCharge: Number(form.visitCharge) || 0,
        perKmRate: Number(form.perKmRate) || 0,
        lat: Number(form.lat),
        lng: Number(form.lng),
        serviceRadiusKm: Number(form.serviceRadiusKm) || 15,
        skills: form.skills.map((s) => ({
          categoryId: s.categoryId,
          baseRate: Number(s.baseRate) || 0,
          rateUnit: s.rateUnit || 'PER_VISIT',
        })),
        address: {
          line: form.address?.line || '',
          area: form.address?.area || '',
          city: form.address?.city || 'Pune',
          pincode: form.address?.pincode || '',
        },
        avatarUrl: form.avatarUrl || '',
        photos: Array.isArray(form.photos) ? form.photos : [],
      }

      await api.post('/workers/profile', payload)

      if (form.avatarUrl) {
        updateUser({ avatarUrl: form.avatarUrl })
      }

      setSuccess('Profile configuration saved successfully! Redirecting to hub…')
      setTimeout(() => navigate('/worker'), 1200)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm font-medium text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span>Loading your profile…</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/worker"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Worker Hub</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Worker Profile & Pricing
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Configure your skills, rates, and coverage radius for nearby customer discovery
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile DP & Personal Avatar */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Profile Photo & Avatar
          </h2>
          <div className="flex items-center gap-5">
            <div
              className="relative group cursor-pointer"
              onClick={() => setIsAvatarModalOpen(true)}
            >
              <div className="h-20 w-20 rounded-full overflow-hidden ring-4 ring-orange-500/20 shadow-md bg-slate-100">
                <img
                  src={form.avatarUrl || AVATAR_PRESETS[1]}
                  alt="Worker Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white shadow-md hover:bg-orange-600 transition-colors"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Professional Display Photo</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                A clear face photo helps build trust with local residents looking to book you.
              </p>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="mt-2 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                Change Photo / Avatar →
              </button>
            </div>
          </div>
        </div>

        {/* Work & Portfolio Photos Management */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Work & Portfolio Photos ({form.photos?.length || 0})
              </h2>
              <p className="text-[11px] text-slate-500">
                Upload photos of your completed repairs, tools, and workshop. Customers see these on the map sidecard when booking you!
              </p>
            </div>
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleWorkPhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isPhotoUploading}
                className="flex items-center gap-1.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isPhotoUploading ? 'Uploading…' : 'Upload Work Photos'}</span>
              </button>
            </div>
          </div>

          {form.photos && form.photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {form.photos.map((photoUrl, idx) => (
                <div
                  key={idx}
                  className="group relative h-28 rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100"
                >
                  <img
                    src={photoUrl}
                    alt={`Work ${idx + 1}`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-colors cursor-pointer"
                      title="Remove this photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="absolute bottom-1.5 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                    Photo #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={() => photoInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-orange-400 p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-orange-50/20 transition-colors space-y-2"
            >
              <Camera className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No work photos uploaded yet</p>
              <p className="text-[11px] text-slate-400">
                Click here or tap "Upload Work Photos" above to add pictures directly from your device.
              </p>
            </div>
          )}
        </div>

        {/* Basic Background & Bio */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            General Background & Pricing
          </h2>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              About / Bio
            </label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={updateField('bio')}
              placeholder="E.g., Specialist in split & window AC gas charging, jet pump servicing, compressor diagnostics..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                value={form.experienceYrs}
                onChange={updateField('experienceYrs')}
                placeholder="e.g. 5"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Inspection Charge (₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.visitCharge}
                onChange={updateField('visitCharge')}
                placeholder="e.g. 199"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Per KM Travel Rate (₹/km)
              </label>
              <input
                type="number"
                min="0"
                value={form.perKmRate}
                onChange={updateField('perKmRate')}
                placeholder="Default: ₹15/km"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Skills & Base Rates */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Skills & Service Base Rates
            </h2>
            <button
              type="button"
              onClick={addSkill}
              className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
          </div>

          <div className="space-y-3">
            {form.skills.map((skill, i) => (
              <div
                key={i}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 rounded-2xl bg-slate-50 p-3 border border-slate-200/70"
              >
                <select
                  value={skill.categoryId}
                  onChange={updateSkill(i, 'categoryId')}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                >
                  <option value="">Select Service Category…</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="relative w-32">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Base Rate"
                    value={skill.baseRate}
                    onChange={updateSkill(i, 'baseRate')}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-6 pr-2 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                  />
                </div>

                <select
                  value={skill.rateUnit}
                  onChange={updateSkill(i, 'rateUnit')}
                  className="w-28 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-orange-500"
                >
                  <option value="PER_VISIT">per visit</option>
                  <option value="PER_HOUR">per hour</option>
                </select>

                {form.skills.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSkill(i)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Base Location & Coverage Radius (NO RAW LATITUDE / LONGITUDE) */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Base Location & Coverage
              </h2>
              <p className="text-[11px] text-slate-500">
                Use GPS or click on the map to set your service hub location automatically
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseGps}
                disabled={isGpsLoading}
                className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isGpsLoading ? 'Detecting...' : 'Use GPS Location'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
              >
                <Map className="w-3.5 h-3.5 text-orange-500" />
                <span>Choose on Map</span>
              </button>
            </div>
          </div>

          {/* Clean Location Coordinates Status Badge */}
          {form.lat && form.lng && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 px-4 py-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Base Location Set: <strong>{form.address.city}</strong>{' '}
                {form.address.area ? `(${form.address.area})` : ''} — Coordinates safely captured
              </span>
            </div>
          )}

          {/* Address Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Street / Workshop / Line
              </label>
              <input
                type="text"
                placeholder="Shop 4, Market Yard"
                value={form.address.line}
                onChange={updateAddress('line')}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Area / Locality
              </label>
              <input
                type="text"
                placeholder="Baner"
                value={form.address.area}
                onChange={updateAddress('area')}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                City
              </label>
              <input
                type="text"
                placeholder="Pune"
                value={form.address.city}
                onChange={updateAddress('city')}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Pincode
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="411045"
                value={form.address.pincode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: {
                      ...form.address,
                      pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                    },
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-mono text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Service Radius Slider */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Service Radius: <span className="text-orange-600">{form.serviceRadiusKm} km</span>
              </label>
              <span className="text-[11px] text-slate-400">Max travel distance from base</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={form.serviceRadiusKm}
              onChange={updateField('serviceRadiusKm')}
              className="w-full accent-orange-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Profile...' : 'Save Worker Profile & Rates'}</span>
          </button>
        </div>
      </form>

      {/* Map Picker Modal */}
      <LocationPickerModal
        isOpen={isMapModalOpen}
        initialPosition={[form.lat, form.lng]}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={handleSelectMapLocation}
      />

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        currentAvatar={form.avatarUrl}
        onClose={() => setIsAvatarModalOpen(false)}
        onSelectAvatar={(url) => setForm({ ...form, avatarUrl: url })}
      />
    </motion.div>
  )
}
