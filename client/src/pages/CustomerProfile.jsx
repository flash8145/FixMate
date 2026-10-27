import { useState, useEffect } from 'react'
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
  User,
  Phone,
  Mail,
  MapPin,
  Camera,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Save,
  ChevronLeft,
  Map,
} from 'lucide-react'

export default function CustomerProfile() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)
  const updateUser = useAuthStore((s) => s.updateUser)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
    address: {
      line: '',
      area: '',
      city: '',
      pincode: '',
      lat: 18.5204,
      lng: 73.8567,
    },
  })

  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isBootstrapping && !user) {
      navigate('/login')
      return
    }

    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
        address: {
          line: user.address?.line || '',
          area: user.address?.area || '',
          city: user.address?.city || 'Pune',
          pincode: user.address?.pincode || '',
          lat: user.address?.location?.coordinates?.[1] || 18.5204,
          lng: user.address?.location?.coordinates?.[0] || 73.8567,
        },
      })
    }
  }, [user, isBootstrapping, navigate])

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser')
      return
    }
    setIsGpsLoading(true)
    setErrorMsg('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const details = await reverseGeocode(latitude, longitude)
        setForm((prev) => ({
          ...prev,
          address: {
            line: details.line || prev.address.line,
            area: details.area || prev.address.area,
            city: details.city || prev.address.city,
            pincode: details.pincode || prev.address.pincode,
            lat: latitude,
            lng: longitude,
          },
        }))
        setIsGpsLoading(false)
        setSuccessMsg('Address auto-filled using your current GPS location!')
        setTimeout(() => setSuccessMsg(''), 3000)
      },
      () => {
        setIsGpsLoading(false)
        setErrorMsg('Could not detect GPS location. You can pick your address on the map.')
      },
    )
  }

  const handleSelectMapLocation = (details) => {
    setForm((prev) => ({
      ...prev,
      address: {
        line: details.line || prev.address.line,
        area: details.area || prev.address.area,
        city: details.city || prev.address.city,
        pincode: details.pincode || prev.address.pincode,
        lat: details.lat,
        lng: details.lng,
      },
    }))
    setSuccessMsg('Location and address captured from map pin!')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!form.name.trim()) {
      setErrorMsg('Name is required.')
      return
    }

    if (form.phone && form.phone.trim().length !== 10) {
      setErrorMsg('Phone number must be exactly 10 digits.')
      return
    }

    setIsSaving(true)
    try {
      const res = await api.patch('/auth/profile', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        avatarUrl: form.avatarUrl.trim(),
        address: form.address,
      })

      updateUser(res.data.data)
      setSuccessMsg('Profile and permanent address saved successfully!')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6"
    >
      {/* Header */}
      <div>
        <Link
          to="/customer"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back to Find Workers</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Customer Profile & Address
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Manage your personal details and set your default permanent service address
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card & Avatar */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-extrabold text-slate-900">Personal Information</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar with Edit Badge */}
            <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
              <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-orange-500/20 shadow-md bg-slate-100">
                <img
                  src={form.avatarUrl || AVATAR_PRESETS[0]}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-md hover:bg-orange-600 transition-colors"
                title="Change Avatar"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Phone (10 Digits)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                        })
                      }
                      placeholder="98XXXXXXXX"
                      className="w-full rounded-2xl border border-slate-200 pl-8 pr-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="your.email@example.com"
                      className="w-full rounded-2xl border border-slate-200 pl-8 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Permanent Address Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Permanent Service Address</h2>
                <p className="text-[11px] text-slate-500">
                  This address will be automatically filled whenever you book a worker
                </p>
              </div>
            </div>

            {/* Quick Auto-fill buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseGps}
                disabled={isGpsLoading}
                className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isGpsLoading ? 'Detecting...' : 'Use GPS'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
              >
                <Map className="w-3.5 h-3.5 text-orange-500" />
                <span>Pick on Map</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                House / Flat / Street Address
              </label>
              <input
                type="text"
                value={form.address.line}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...form.address, line: e.target.value },
                  })
                }
                placeholder="e.g. Flat 402, Sunshine Heights, Main Road"
                className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Area / Locality
                </label>
                <input
                  type="text"
                  value={form.address.area}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: { ...form.address, area: e.target.value },
                    })
                  }
                  placeholder="e.g. Baner / Kothrud"
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={form.address.city}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: { ...form.address, city: e.target.value },
                    })
                  }
                  placeholder="e.g. Pune"
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
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
                  placeholder="411045"
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Location Coordinate Status Badge (No raw numbers) */}
            {form.address.lat && form.address.lng && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Map Coordinates Set: <strong>{form.address.city}</strong> ({form.address.area || 'Locality captured'})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Profile...' : 'Save Profile & Address'}</span>
          </button>
        </div>
      </form>

      {/* Map Picker Modal */}
      <LocationPickerModal
        isOpen={isMapModalOpen}
        initialPosition={[form.address.lat, form.address.lng]}
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
