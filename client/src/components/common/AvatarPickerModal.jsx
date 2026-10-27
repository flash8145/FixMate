import { useState, useRef } from 'react'
import { X, Check, Upload, Camera } from 'lucide-react'
import { AVATAR_PRESETS } from '../../config/images.js'

function compressImage(file, maxWidth = 500, maxHeight = 500, quality = 0.85) {
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

export default function AvatarPickerModal({
  isOpen,
  currentAvatar = '',
  onClose,
  onSelectAvatar,
}) {
  const [selectedUrl, setSelectedUrl] = useState(currentAvatar || AVATAR_PRESETS[0])
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    try {
      const dataUrl = await compressImage(file)
      setSelectedUrl(dataUrl)
    } catch {
      alert('Could not read image file. Please try another photo.')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleConfirm = () => {
    onSelectAvatar(selectedUrl)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Choose Profile Picture</h3>
              <p className="text-[11px] text-slate-500">Upload a photo from your device or select an avatar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selected Preview */}
        <div className="flex flex-col items-center gap-2 py-1">
          <div className="relative h-20 w-20 rounded-full overflow-hidden ring-4 ring-orange-500/20 shadow-md bg-slate-100">
            <img
              src={selectedUrl}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.src = AVATAR_PRESETS[0]
              }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-600">Selected Profile Photo</span>
        </div>

        {/* Upload from Device Component */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Upload From Device
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
            className="flex flex-col items-center justify-center w-full py-4 px-3 rounded-2xl border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/50 hover:bg-orange-50 text-orange-700 transition-all cursor-pointer group"
          >
            <Upload className="w-5 h-5 mb-1 text-orange-500 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-xs font-bold">
              {uploadLoading ? 'Processing Image…' : 'Choose Photo from Device'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              JPG, PNG, WEBP (stored securely)
            </span>
          </button>
        </div>

        {/* Preset Gallery */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Or Choose from Default Avatars
          </label>
          <div className="flex items-center justify-center gap-2.5">
            {AVATAR_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedUrl(preset)}
                className={`relative h-11 w-11 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedUrl === preset
                    ? 'border-orange-500 ring-2 ring-orange-500/30 scale-105 shadow-sm'
                    : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                }`}
              >
                <img src={preset} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover" />
                {selectedUrl === preset && (
                  <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Profile DP</span>
          </button>
        </div>
      </div>
    </div>
  )
}
