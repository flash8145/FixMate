import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../services/api.js'
import { useAuthStore } from '../store/authStore.js'
import { pageVariants } from '../utils/motion.js'
import {
  Users,
  CheckCircle2,
  Calendar,
  Sliders,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Save,
  Check,
  Search,
  Briefcase,
  Layers,
  Trash2,
  Edit,
  Plus,
  X,
  Lock,
  Unlock,
} from 'lucide-react'


export default function AdminPanel() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  const [activeSection, setActiveSection] = useState('overview') // 'overview' | 'find_workers' | 'workers' | 'customers' | 'categories' | 'pricing'

  // Data states
  const [stats, setStats] = useState(null)
  const [workers, setWorkers] = useState([])
  const [customers, setCustomers] = useState([])
  const [categories, setCategories] = useState([])
  const [pricingConfig, setPricingConfig] = useState({
    perKmRate: 15,
    freeDistanceM: 1000,
    urgencyFee: 100,
    nightMultiplier: 1.25,
    nightStartHour: 21,
    nightEndHour: 6,
    estimateSpreadPct: 0.15,
    deviationThresholdPct: 0.2,
  })

  // Filters & Searches
  const [workerSearch, setWorkerSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [verificationTab, setVerificationTab] = useState('all') // 'all' | 'workers' | 'customers'
  const [verificationSearch, setVerificationSearch] = useState('')

  // Modals & Forms
  const [categoryModal, setCategoryModal] = useState(null) // null or { mode: 'create'|'edit', data }
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', icon: '🛠️', isActive: true })

  const [workerModal, setWorkerModal] = useState(null)
  const [workerForm, setWorkerForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    categoryId: '',
    baseRate: '',
    rateUnit: 'PER_VISIT',
    visitCharge: 100,
    perKmRate: 15,
    experienceYrs: 2,
    city: 'Pune',
    area: '',
    line: '',
    bio: '',
    isVerified: true,
    isActive: true,
  })

  const [customerModal, setCustomerModal] = useState(null)
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    city: 'Pune',
    area: '',
    line: '',
    pincode: '',
    isActive: true,
  })

  // React validation error states (replacing native HTML5 validation bubbles)
  const [workerErrors, setWorkerErrors] = useState({})
  const [customerErrors, setCustomerErrors] = useState({})
  const [categoryErrors, setCategoryErrors] = useState({})
  const [configErrors, setConfigErrors] = useState({})

  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSuccess, setConfigSuccess] = useState(false)
  const [error, setError] = useState('')

  const loadData = () => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get('/admin/stats').then((res) => setStats(res.data.data)),
      api.get('/admin/workers').then((res) => setWorkers(res.data.data)),
      api.get('/admin/customers').then((res) => setCustomers(res.data.data)),
      api.get('/categories').then((res) => setCategories(res.data.data)),
      api.get('/admin/pricing-config').then((res) => {
        if (res.data.data) setPricingConfig(res.data.data)
      }),
    ])
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to load admin data')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isBootstrapping) return
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }
    loadData()
  }, [user, isBootstrapping, navigate])

  // Worker Actions
  const handleVerifyWorker = async (workerId, isVerified) => {
    try {
      await api.patch(`/admin/workers/${workerId}/verify`, { isVerified })
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Verification update failed')
    }
  }

  const handleToggleWorkerActive = async (workerId, currentActive) => {
    try {
      await api.patch(`/admin/workers/${workerId}`, { isActive: !currentActive })
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update worker status')
    }
  }

  const handleDeleteWorker = async (workerId, workerName) => {
    if (!confirm(`Are you sure you want to permanently delete worker ${workerName}?`)) return
    try {
      await api.delete(`/admin/workers/${workerId}`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete worker')
    }
  }

  const openWorkerModal = (mode, worker = null) => {
    setWorkerErrors({})
    if (mode === 'edit' && worker) {
      const firstSkill = worker.skills?.[0]
      setWorkerForm({
        name: worker.userId?.name || '',
        phone: worker.userId?.phone || '',
        email: worker.userId?.email || '',
        password: '',
        categoryId: firstSkill?.categoryId?._id || firstSkill?.categoryId || (categories[0]?._id || ''),
        baseRate: firstSkill?.baseRate ?? 299,
        rateUnit: firstSkill?.rateUnit || 'PER_VISIT',
        visitCharge: worker.visitCharge ?? 100,
        perKmRate: worker.perKmRate ?? 15,
        experienceYrs: worker.experienceYrs ?? 2,
        city: worker.address?.city || 'Pune',
        area: worker.address?.area || '',
        line: worker.address?.line || '',
        bio: worker.bio || '',
        isVerified: worker.isVerified ?? true,
        isActive: worker.userId?.isActive !== false,
      })
      setWorkerModal({ mode: 'edit', id: worker._id })
    } else {
      setWorkerForm({
        name: '',
        phone: '',
        email: '',
        password: '',
        categoryId: categories[0]?._id || '',
        baseRate: 299,
        rateUnit: 'PER_VISIT',
        visitCharge: 100,
        perKmRate: 15,
        experienceYrs: 2,
        city: 'Pune',
        area: '',
        line: '',
        bio: '',
        isVerified: true,
        isActive: true,
      })
      setWorkerModal({ mode: 'create' })
    }
  }

  const validateWorkerForm = () => {
    const errs = {}
    if (!workerForm.name || !workerForm.name.trim()) {
      errs.name = 'Full name is required'
    } else if (workerForm.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters'
    }

    const cleanPhone = (workerForm.phone || '').trim()
    if (!cleanPhone) {
      errs.phone = 'Phone number is required'
    } else if (!/^[0-9]{10}$/.test(cleanPhone)) {
      errs.phone = 'Phone must be exactly 10 digits'
    }

    if (workerForm.email && workerForm.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workerForm.email.trim())) {
        errs.email = 'Enter a valid email address'
      }
    }

    if (workerModal?.mode === 'create') {
      if (!workerForm.password) {
        errs.password = 'Password is required'
      } else if (workerForm.password.length < 6) {
        errs.password = 'Password must be at least 6 characters'
      }
    }

    if (!workerForm.city || !workerForm.city.trim()) {
      errs.city = 'City is required'
    }

    return errs
  }

  const handleWorkerSubmit = async (e) => {
    e.preventDefault()
    const errs = validateWorkerForm()
    if (Object.keys(errs).length > 0) {
      setWorkerErrors(errs)
      return
    }
    setWorkerErrors({})
    try {
      const payload = {
        name: workerForm.name,
        phone: workerForm.phone,
        email: workerForm.email,
        password: workerForm.password || undefined,
        skills: workerForm.categoryId
          ? [
              {
                categoryId: workerForm.categoryId,
                baseRate: Number(workerForm.baseRate) || 0,
                rateUnit: workerForm.rateUnit,
              },
            ]
          : [],
        visitCharge: Number(workerForm.visitCharge) || 0,
        perKmRate: Number(workerForm.perKmRate) || 15,
        experienceYrs: Number(workerForm.experienceYrs) || 0,
        bio: workerForm.bio,
        address: {
          city: workerForm.city,
          area: workerForm.area,
          line: workerForm.line,
        },
        isVerified: workerForm.isVerified,
        isActive: workerForm.isActive,
      }

      if (workerModal.mode === 'create') {
        await api.post('/admin/workers', payload)
      } else {
        await api.patch(`/admin/workers/${workerModal.id}`, payload)
      }
      setWorkerModal(null)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save worker')
    }
  }

  // Customer Actions
  const openCustomerModal = (mode, customer = null) => {
    setCustomerErrors({})
    if (mode === 'edit' && customer) {
      setCustomerForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        password: '',
        city: customer.address?.city || 'Pune',
        area: customer.address?.area || '',
        line: customer.address?.line || '',
        pincode: customer.address?.pincode || '',
        isActive: customer.isActive !== false,
      })
      setCustomerModal({ mode: 'edit', id: customer._id })
    } else {
      setCustomerForm({
        name: '',
        phone: '',
        email: '',
        password: '',
        city: 'Pune',
        area: '',
        line: '',
        pincode: '',
        isActive: true,
      })
      setCustomerModal({ mode: 'create' })
    }
  }

  const validateCustomerForm = () => {
    const errs = {}
    if (!customerForm.name || !customerForm.name.trim()) {
      errs.name = 'Full name is required'
    } else if (customerForm.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters'
    }

    const cleanPhone = (customerForm.phone || '').trim()
    if (!cleanPhone) {
      errs.phone = 'Phone number is required'
    } else if (!/^[0-9]{10}$/.test(cleanPhone)) {
      errs.phone = 'Phone must be exactly 10 digits'
    }

    if (customerForm.email && customerForm.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email.trim())) {
        errs.email = 'Enter a valid email address'
      }
    }

    if (customerModal?.mode === 'create') {
      if (!customerForm.password) {
        errs.password = 'Password is required'
      } else if (customerForm.password.length < 6) {
        errs.password = 'Password must be at least 6 characters'
      }
    }

    return errs
  }

  const handleCustomerSubmit = async (e) => {
    e.preventDefault()
    const errs = validateCustomerForm()
    if (Object.keys(errs).length > 0) {
      setCustomerErrors(errs)
      return
    }
    setCustomerErrors({})
    try {
      const payload = {
        name: customerForm.name,
        phone: customerForm.phone,
        email: customerForm.email,
        password: customerForm.password || undefined,
        address: {
          city: customerForm.city,
          area: customerForm.area,
          line: customerForm.line,
          pincode: customerForm.pincode,
        },
        isActive: customerForm.isActive,
      }

      if (customerModal.mode === 'create') {
        await api.post('/admin/customers', payload)
      } else {
        await api.patch(`/admin/customers/${customerModal.id}`, payload)
      }
      setCustomerModal(null)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save customer')
    }
  }
  const handleToggleCustomerActive = async (customerId, currentActive) => {
    try {
      await api.patch(`/admin/customers/${customerId}`, { isActive: !currentActive })
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update customer status')
    }
  }

  const handleDeleteCustomer = async (customerId, customerName) => {
    if (!confirm(`Are you sure you want to permanently delete customer ${customerName}?`)) return
    try {
      await api.delete(`/admin/customers/${customerId}`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete customer')
    }
  }

  const handleVerifyCustomer = async (customerId, isVerified) => {
    try {
      await api.patch(`/admin/customers/${customerId}/verify`, { isVerified })
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Verification update failed')
    }
  }

  // Category Actions
  const openCategoryModal = (mode, cat = null) => {
    setCategoryErrors({})
    if (mode === 'edit' && cat) {
      setCategoryForm({ name: cat.name, slug: cat.slug, icon: cat.icon || '🛠️', isActive: cat.isActive })
      setCategoryModal({ mode: 'edit', id: cat._id })
    } else {
      setCategoryForm({ name: '', slug: '', icon: '🛠️', isActive: true })
      setCategoryModal({ mode: 'create' })
    }
  }

  const handleCategorySubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!categoryForm.name || !categoryForm.name.trim()) {
      errs.name = 'Category name is required'
    }
    if (!categoryForm.icon || !categoryForm.icon.trim()) {
      errs.icon = 'Category icon emoji is required'
    }
    if (Object.keys(errs).length > 0) {
      setCategoryErrors(errs)
      return
    }
    setCategoryErrors({})
    try {
      if (categoryModal.mode === 'create') {
        await api.post('/admin/categories', categoryForm)
      } else {
        await api.patch(`/admin/categories/${categoryModal.id}`, categoryForm)
      }
      setCategoryModal(null)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save category')
    }
  }

  const handleDeleteCategory = async (catId, catName) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return
    try {
      await api.delete(`/admin/categories/${catId}`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete category')
    }
  }

  // Pricing Config Actions
  const handleConfigSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (pricingConfig.urgencyFee === '' || Number(pricingConfig.urgencyFee) < 0) {
      errs.urgencyFee = 'Urgency fee must be 0 or greater'
    }
    if (pricingConfig.nightMultiplier === '' || Number(pricingConfig.nightMultiplier) < 1) {
      errs.nightMultiplier = 'Night multiplier must be at least 1.0'
    }
    if (
      pricingConfig.nightStartHour === '' ||
      Number(pricingConfig.nightStartHour) < 0 ||
      Number(pricingConfig.nightStartHour) > 23
    ) {
      errs.nightStartHour = 'Night start hour must be between 0 and 23'
    }
    if (pricingConfig.estimateSpreadPct === '' || Number(pricingConfig.estimateSpreadPct) < 0) {
      errs.estimateSpreadPct = 'Estimate spread must be 0 or greater'
    }
    if (Object.keys(errs).length > 0) {
      setConfigErrors(errs)
      return
    }
    setConfigErrors({})
    setSavingConfig(true)
    setConfigSuccess(false)
    try {
      const res = await api.patch('/admin/pricing-config', {
        perKmRate: Number(pricingConfig.perKmRate),
        freeDistanceM: Number(pricingConfig.freeDistanceM),
        urgencyFee: Number(pricingConfig.urgencyFee),
        nightMultiplier: Number(pricingConfig.nightMultiplier),
        nightStartHour: Number(pricingConfig.nightStartHour),
        nightEndHour: Number(pricingConfig.nightEndHour),
        estimateSpreadPct: Number(pricingConfig.estimateSpreadPct),
        deviationThresholdPct: Number(pricingConfig.deviationThresholdPct),
      })
      setPricingConfig(res.data.data)
      setConfigSuccess(true)
      setTimeout(() => setConfigSuccess(false), 3000)
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Could not update pricing configuration')
    } finally {
      setSavingConfig(false)
    }
  }

  // Filtered Lists
  const filteredWorkers = workers.filter((w) => {
    const term = workerSearch.toLowerCase()
    const nameMatch = w.userId?.name?.toLowerCase().includes(term)
    const phoneMatch = w.userId?.phone?.includes(term)
    const cityMatch = w.address?.city?.toLowerCase().includes(term)
    const categoryMatch =
      categoryFilter === 'ALL' ||
      w.skills?.some((s) => {
        const catId = s.categoryId?._id || s.categoryId
        return catId && catId.toString() === categoryFilter.toString()
      })
    return (nameMatch || phoneMatch || cityMatch) && categoryMatch
  })

  const filteredCustomers = customers.filter((c) => {
    const term = customerSearch.toLowerCase()
    return (
      c.name?.toLowerCase().includes(term) ||
      c.phone?.includes(term) ||
      c.email?.toLowerCase().includes(term)
    )
  })

  const pendingWorkersList = workers.filter((w) => !w.isVerified)
  const pendingCustomersList = customers.filter((c) => !c.isVerified)
  const pendingCount = pendingWorkersList.length
  const totalPendingCount = pendingWorkersList.length + pendingCustomersList.length

  const displayedPending = useMemo(() => {
    const list = []
    if (verificationTab === 'all' || verificationTab === 'workers') {
      pendingWorkersList.forEach((w) => {
        list.push({
          id: `worker-${w._id}`,
          rawId: w._id,
          type: 'worker',
          name: w.userId?.name || 'Worker',
          phone: w.userId?.phone || '—',
          email: w.userId?.email || '',
          avatarUrl: w.userId?.avatarUrl,
          city: w.address?.city || 'Pune',
          visitCharge: w.visitCharge || 0,
          skills: w.skills || [],
          bio: w.bio,
          isActive: w.userId?.isActive !== false,
        })
      })
    }
    if (verificationTab === 'all' || verificationTab === 'customers') {
      pendingCustomersList.forEach((c) => {
        list.push({
          id: `customer-${c._id}`,
          rawId: c._id,
          type: 'customer',
          name: c.name || 'Customer',
          phone: c.phone || '—',
          email: c.email || '',
          avatarUrl: c.avatarUrl,
          city: c.address?.city || 'Pune',
          addressLine: c.address?.line,
          isActive: c.isActive !== false,
        })
      })
    }
    if (!verificationSearch.trim()) return list
    const q = verificationSearch.toLowerCase()
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.city.toLowerCase().includes(q),
    )
  }, [verificationTab, verificationSearch, pendingWorkersList, pendingCustomersList])

  if (isBootstrapping || loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm font-medium text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span>Loading platform administration…</span>
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
      className="min-h-[calc(100vh-61px)] bg-slate-100 flex flex-col md:flex-row"
    >
      {/* Sleek Admin Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 shrink-0 p-4 space-y-6">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20 font-black text-sm">
            🛡️
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 leading-tight">Admin Console</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">FixMate Operations</p>
          </div>
        </div>

        <nav className="space-y-1">
          {[
            { id: 'overview', label: 'Platform Overview', icon: TrendingUp },
            {
              id: 'verifications',
              label: 'Account Verifications',
              icon: CheckCircle2,
              badge: totalPendingCount > 0 ? totalPendingCount : null,
            },
            {
              id: 'workers',
              label: 'Worker Management',
              icon: Briefcase,
              badge: pendingCount > 0 ? pendingCount : null,
            },
            {
              id: 'customers',
              label: 'Customer Management',
              icon: Users,
              badge: pendingCustomersList.length > 0 ? pendingCustomersList.length : null,
            },
            { id: 'categories', label: 'Service Categories', icon: Layers },
            { id: 'pricing', label: 'Dynamic Pricing', icon: Sliders },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isActive ? 'bg-white text-orange-600' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Quick System Status Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5 space-y-2 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Health</p>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Active Workers:</span>
            <span className="font-extrabold text-emerald-600">{stats?.activeWorkers || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Pending Approvals:</span>
            <span className="font-extrabold text-amber-600">{pendingCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Total Bookings:</span>
            <span className="font-extrabold text-slate-800">{stats?.totalBookings || 0}</span>
          </div>
        </div>
      </aside>

      {/* Main Admin Workspace Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl overflow-y-auto">
        {/* Top Breadcrumb & Refresh */}
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight capitalize">
              {activeSection.replace('_', ' ')}
            </h1>
            <p className="text-xs text-slate-500">Live administrative controls and platform operations</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SECTION 1: OVERVIEW & KPIS */}
        {activeSection === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {stats && (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Users</span>
                    <Users className="w-4 h-4 text-orange-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900">{stats.totalUsers}</p>
                  <p className="text-[11px] text-slate-500">Platform customer & worker accounts</p>
                </div>

                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Workers</span>
                    <Briefcase className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900">{stats.totalWorkers}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold">{stats.activeWorkers} online & verified</p>
                </div>

                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Bookings</span>
                    <Calendar className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-900">{stats.totalBookings}</p>
                  <p className="text-[11px] text-slate-500">Service requests created</p>
                </div>

                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Jobs</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-black text-emerald-600">{stats.completedBookings}</p>
                  <p className="text-[11px] text-slate-500">Successful offline settlements</p>
                </div>
              </div>
            )}

            {/* Quick Action Alerts */}
            {totalPendingCount > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white font-extrabold text-lg">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-950">
                      {totalPendingCount} New Account{totalPendingCount > 1 ? 's' : ''} Awaiting Verification
                    </h3>
                    <p className="text-xs text-amber-800">
                      {pendingWorkersList.length} worker application{pendingWorkersList.length !== 1 ? 's' : ''} and {pendingCustomersList.length} customer account{pendingCustomersList.length !== 1 ? 's' : ''} awaiting admin verification.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('verifications')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Review Verifications ({totalPendingCount}) →
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECTION: ACCOUNT VERIFICATIONS (FOR BOTH WORKERS & CUSTOMERS) */}
        {activeSection === 'verifications' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header / Subtabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => setVerificationTab('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    verificationTab === 'all'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Pending ({totalPendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationTab('workers')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    verificationTab === 'workers'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Workers ({pendingWorkersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationTab('customers')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    verificationTab === 'customers'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Customers ({pendingCustomersList.length})
                </button>
              </div>

              <div className="relative max-w-xs">
                <input
                  type="text"
                  placeholder="Filter pending by name, phone, city..."
                  value={verificationSearch}
                  onChange={(e) => setVerificationSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Verification Cards or Empty State */}
            {displayedPending.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-extrabold text-2xl">
                  ✓
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  All Accounts Verified!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  There are currently no unverified worker applications or customer accounts requiring authorization.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedPending.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl overflow-hidden ring-2 ring-slate-100 bg-slate-100 shrink-0">
                          <img
                            src={
                              item.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900">{item.name}</h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                item.type === 'worker'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              }`}
                            >
                              {item.type === 'worker' ? 'Worker Application' : 'Customer Account'}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-600 mt-0.5">{item.phone}</p>
                          {item.email && <p className="text-[11px] text-slate-400">{item.email}</p>}
                        </div>
                      </div>

                      <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 text-[10px] font-black uppercase">
                        Pending
                      </span>
                    </div>

                    {/* Worker skills / Details */}
                    {item.type === 'worker' && (
                      <div className="rounded-2xl bg-slate-50 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Base Location:</span>
                          <span className="font-semibold text-slate-800">{item.city}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Visit / Inspection Fee:</span>
                          <span className="font-extrabold text-slate-900">₹{item.visitCharge}</span>
                        </div>
                        {item.skills?.length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1">
                            {item.skills.map((s, idx) => (
                              <span
                                key={idx}
                                className="bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-700"
                              >
                                {s.categoryId?.name || 'Service'}: ₹{s.baseRate}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.bio && (
                          <p className="text-[11px] text-slate-500 italic border-t border-slate-200/60 pt-1 line-clamp-2">
                            "{item.bio}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Customer location / details */}
                    {item.type === 'customer' && (
                      <div className="rounded-2xl bg-slate-50 p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Registered City:</span>
                          <span className="font-semibold text-slate-800">{item.city || 'Pune'}</span>
                        </div>
                        {item.addressLine && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Address:</span>
                            <span className="font-medium text-slate-800 truncate max-w-[200px]">
                              {item.addressLine}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          item.type === 'worker'
                            ? handleVerifyWorker(item.rawId, true)
                            : handleVerifyCustomer(item.rawId, true)
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Verify</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          item.type === 'worker'
                            ? handleToggleWorkerActive(item.rawId, true)
                            : handleToggleCustomerActive(item.rawId, true)
                        }
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                        title="Disable account"
                      >
                        Disable
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          item.type === 'worker'
                            ? handleDeleteWorker(item.rawId, item.name)
                            : handleDeleteCustomer(item.rawId, item.name)
                        }
                        className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                        title="Delete account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: WORKERS MANAGEMENT (FULL CRUD) */}
        {activeSection === 'workers' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search workers by name, phone, city..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs shrink-0"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">{filteredWorkers.length} Workers</span>
                <button
                  type="button"
                  onClick={() => openWorkerModal('create')}
                  className="flex items-center gap-1.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Worker</span>
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="p-3.5">Worker Name</th>
                      <th className="p-3.5">Contact</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5">Skills / Rates</th>
                      <th className="p-3.5">Rating & Jobs</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWorkers.map((w) => (
                      <tr key={w._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-slate-200 bg-slate-100 shrink-0">
                              <img
                                src={w.userId?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div>
                              <p>{w.userId?.name || 'Worker'}</p>
                              <span
                                className={`text-[10px] font-bold ${
                                  w.isVerified ? 'text-emerald-600' : 'text-amber-600'
                                }`}
                              >
                                {w.isVerified ? 'Verified' : 'Unverified'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <p className="font-mono text-slate-800">{w.userId?.phone}</p>
                          <p className="text-[10px] text-slate-400">{w.userId?.email || 'No email'}</p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-800">{w.address?.city || 'Pune'}</p>
                          <p className="text-[10px] text-slate-400">{w.address?.area || 'Area'}</p>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {w.skills?.map((s, idx) => (
                              <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                {s.categoryId?.name || 'Service'}: ₹{s.baseRate}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-amber-600">
                            ★ {w.ratingAgg?.avg ? w.ratingAgg.avg.toFixed(1) : 'New'}
                          </span>
                          <p className="text-[10px] text-slate-400">{w.jobsCompleted || 0} jobs</p>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              w.userId?.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {w.userId?.isActive !== false ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openWorkerModal('edit', w)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Worker Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVerifyWorker(w._id, !w.isVerified)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                              w.isVerified
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={w.isVerified ? 'Revoke verification' : 'Approve verification'}
                          >
                            {w.isVerified ? 'Revoke' : 'Verify'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleWorkerActive(w._id, w.userId?.isActive !== false)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={w.userId?.isActive !== false ? 'Disable account' : 'Enable account'}
                          >
                            {w.userId?.isActive !== false ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteWorker(w._id, w.userId?.name)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete worker profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: CUSTOMERS MANAGEMENT (FULL CRUD) */}
        {activeSection === 'customers' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 relative max-w-md">
                <input
                  type="text"
                  placeholder="Search customers by name, phone, or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">{filteredCustomers.length} Customers</span>
                <button
                  type="button"
                  onClick={() => openCustomerModal('create')}
                  className="flex items-center gap-1.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Customer</span>
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="p-3.5">Customer Name</th>
                      <th className="p-3.5">Phone Number</th>
                      <th className="p-3.5">Email Address</th>
                      <th className="p-3.5">Permanent Address</th>
                      <th className="p-3.5">Bookings Placed</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-slate-200 bg-slate-100 shrink-0">
                              <img
                                src={c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <span>{c.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-800">{c.phone}</td>
                        <td className="p-3.5 text-slate-500">{c.email || '—'}</td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-800 truncate max-w-[160px]">
                            {c.address?.line || '—'}
                          </p>
                          <p className="text-[10px] text-slate-400">{c.address?.city || ''}</p>
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">{c.totalBookings || 0}</td>
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                c.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {c.isActive !== false ? 'Active' : 'Blocked'}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                c.isVerified ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {c.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openCustomerModal('edit', c)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Customer Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVerifyCustomer(c._id, !c.isVerified)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                              c.isVerified
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={c.isVerified ? 'Revoke verification' : 'Approve verification'}
                          >
                            {c.isVerified ? 'Revoke' : 'Verify'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleCustomerActive(c._id, c.isActive !== false)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={c.isActive !== false ? 'Block Customer' : 'Unblock Customer'}
                          >
                            {c.isActive !== false ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(c._id, c.name)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: SERVICE CATEGORIES MANAGEMENT (FULL CRUD) */}
        {activeSection === 'categories' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Service Categories</h2>
                <p className="text-[11px] text-slate-500">Add, edit, or disable home repair service categories</p>
              </div>
              <button
                type="button"
                onClick={() => openCategoryModal('create')}
                className="flex items-center gap-1.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{cat.icon || '🛠️'}</span>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">{cat.name}</h3>
                        <p className="font-mono text-[10px] text-slate-400">/{cat.slug}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        cat.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openCategoryModal('edit', cat)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat._id, cat.name)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 6: DYNAMIC PRICING CONFIGURATION */}
        {activeSection === 'pricing' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Dynamic Pricing Engine Parameters
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Adjust travel charges, free radii, night multipliers, and urgency fees without restarting the server
                </p>
              </div>

              {configSuccess && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pricing parameters updated successfully!</span>
                </div>
              )}

              <form onSubmit={handleConfigSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Per KM Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={pricingConfig.perKmRate}
                      onChange={(e) => {
                        setPricingConfig({ ...pricingConfig, perKmRate: e.target.value })
                        if (configErrors.perKmRate) setConfigErrors({ ...configErrors, perKmRate: null })
                      }}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Free Distance Radius (Meters)
                    </label>
                    <input
                      type="number"
                      value={pricingConfig.freeDistanceM}
                      onChange={(e) => {
                        setPricingConfig({ ...pricingConfig, freeDistanceM: e.target.value })
                        if (configErrors.freeDistanceM) setConfigErrors({ ...configErrors, freeDistanceM: null })
                      }}
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Urgency Surcharge (₹)
                    </label>
                    <input
                      type="number"
                      value={pricingConfig.urgencyFee}
                      onChange={(e) => {
                        setPricingConfig({ ...pricingConfig, urgencyFee: e.target.value })
                        if (configErrors.urgencyFee) setConfigErrors({ ...configErrors, urgencyFee: null })
                      }}
                      className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none transition-colors ${
                        configErrors.urgencyFee
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-slate-200 focus:border-orange-500'
                      }`}
                    />
                    {configErrors.urgencyFee && (
                      <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {configErrors.urgencyFee}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Night Multiplier (e.g. 1.25)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={pricingConfig.nightMultiplier}
                      onChange={(e) => {
                        setPricingConfig({ ...pricingConfig, nightMultiplier: e.target.value })
                        if (configErrors.nightMultiplier) setConfigErrors({ ...configErrors, nightMultiplier: null })
                      }}
                      className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none transition-colors ${
                        configErrors.nightMultiplier
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-slate-200 focus:border-orange-500'
                      }`}
                    />
                    {configErrors.nightMultiplier && (
                      <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {configErrors.nightMultiplier}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Night Start Hour (24h)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={pricingConfig.nightStartHour}
                      onChange={(e) => {
                        setPricingConfig({ ...pricingConfig, nightStartHour: e.target.value })
                        if (configErrors.nightStartHour) setConfigErrors({ ...configErrors, nightStartHour: null })
                      }}
                      className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none transition-colors ${
                        configErrors.nightStartHour
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-slate-200 focus:border-orange-500'
                      }`}
                    />
                    {configErrors.nightStartHour && (
                      <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {configErrors.nightStartHour}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Estimate Spread Percentage (e.g. 0.15 = ±15%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricingConfig.estimateSpreadPct}
                      onChange={(e) => {
                        setPricingConfig({ ...pricingConfig, estimateSpreadPct: e.target.value })
                        if (configErrors.estimateSpreadPct) setConfigErrors({ ...configErrors, estimateSpreadPct: null })
                      }}
                      className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none transition-colors ${
                        configErrors.estimateSpreadPct
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-slate-200 focus:border-orange-500'
                      }`}
                    />
                    {configErrors.estimateSpreadPct && (
                      <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {configErrors.estimateSpreadPct}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingConfig ? 'Saving Parameters…' : 'Save Pricing Parameters'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Category Create/Edit Modal */}
      {categoryModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {categoryModal.mode === 'create' ? 'Add Service Category' : 'Edit Category'}
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModal(null)}
                className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Appliance Repair"
                  value={categoryForm.name}
                  onChange={(e) => {
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                    if (categoryErrors.name) setCategoryErrors({ ...categoryErrors, name: null })
                  }}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 focus:outline-none transition-colors ${
                    categoryErrors.name
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 focus:border-orange-500'
                  }`}
                />
                {categoryErrors.name && (
                  <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {categoryErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Category Icon (Emoji) *
                </label>
                <input
                  type="text"
                  placeholder="🛠️"
                  value={categoryForm.icon}
                  onChange={(e) => {
                    setCategoryForm({ ...categoryForm, icon: e.target.value })
                    if (categoryErrors.icon) setCategoryErrors({ ...categoryErrors, icon: null })
                  }}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-800 focus:outline-none transition-colors ${
                    categoryErrors.icon
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 focus:border-orange-500'
                  }`}
                />
                {categoryErrors.icon && (
                  <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {categoryErrors.icon}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  className="rounded text-orange-500 focus:ring-orange-500 h-4 w-4"
                />
                <label htmlFor="catActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Active (visible on search map)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCategoryModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20"
                >
                  {categoryModal.mode === 'create' ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worker Create/Edit Modal */}
      {workerModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {workerModal.mode === 'create' ? 'Add New Worker Profile' : 'Edit Worker Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setWorkerModal(null)}
                className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWorkerSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={workerForm.name}
                    onChange={(e) => {
                      setWorkerForm({ ...workerForm, name: e.target.value })
                      if (workerErrors.name) setWorkerErrors({ ...workerErrors, name: null })
                    }}
                    placeholder="e.g. Ramesh Patil"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none transition-colors ${
                      workerErrors.name
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-400/20'
                        : 'border-slate-200 focus:border-orange-500'
                    }`}
                  />
                  {workerErrors.name && (
                    <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {workerErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Phone (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={workerForm.phone}
                    onChange={(e) => {
                      setWorkerForm({ ...workerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      if (workerErrors.phone) setWorkerErrors({ ...workerErrors, phone: null })
                    }}
                    placeholder="9820098200"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none transition-colors ${
                      workerErrors.phone
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-400/20'
                        : 'border-slate-200 focus:border-orange-500'
                    }`}
                  />
                  {workerErrors.phone && (
                    <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {workerErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={workerForm.email}
                    onChange={(e) => {
                      setWorkerForm({ ...workerForm, email: e.target.value })
                      if (workerErrors.email) setWorkerErrors({ ...workerErrors, email: null })
                    }}
                    placeholder="ramesh@worker.in"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 focus:outline-none transition-colors ${
                      workerErrors.email
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-400/20'
                        : 'border-slate-200 focus:border-orange-500'
                    }`}
                  />
                  {workerErrors.email && (
                    <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {workerErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {workerModal.mode === 'create' ? 'Password *' : 'Password (leave blank to keep)'}
                  </label>
                  <input
                    type="password"
                    value={workerForm.password}
                    onChange={(e) => {
                      setWorkerForm({ ...workerForm, password: e.target.value })
                      if (workerErrors.password) setWorkerErrors({ ...workerErrors, password: null })
                    }}
                    placeholder={workerModal.mode === 'create' ? 'Worker@123' : '••••••••'}
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 focus:outline-none transition-colors ${
                      workerErrors.password
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-400/20'
                        : 'border-slate-200 focus:border-orange-500'
                    }`}
                  />
                  {workerErrors.password && (
                    <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {workerErrors.password}
                    </p>
                  )}
                </div>
              </div>

              {/* Category & Rates */}
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Service Category & Rates</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Category</label>
                    <select
                      value={workerForm.categoryId}
                      onChange={(e) => setWorkerForm({ ...workerForm, categoryId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Base Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={workerForm.baseRate}
                      onChange={(e) => setWorkerForm({ ...workerForm, baseRate: e.target.value })}
                      placeholder="299"
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Billing Unit</label>
                    <select
                      value={workerForm.rateUnit}
                      onChange={(e) => setWorkerForm({ ...workerForm, rateUnit: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    >
                      <option value="PER_VISIT">per visit</option>
                      <option value="PER_HOUR">per hour</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Visit Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={workerForm.visitCharge}
                      onChange={(e) => setWorkerForm({ ...workerForm, visitCharge: e.target.value })}
                      placeholder="99"
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Per KM Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={workerForm.perKmRate}
                      onChange={(e) => setWorkerForm({ ...workerForm, perKmRate: e.target.value })}
                      placeholder="15"
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Experience (Yrs)</label>
                    <input
                      type="number"
                      min="0"
                      value={workerForm.experienceYrs}
                      onChange={(e) => setWorkerForm({ ...workerForm, experienceYrs: e.target.value })}
                      placeholder="3"
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Base Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">City *</label>
                  <input
                    type="text"
                    value={workerForm.city}
                    onChange={(e) => {
                      setWorkerForm({ ...workerForm, city: e.target.value })
                      if (workerErrors.city) setWorkerErrors({ ...workerErrors, city: null })
                    }}
                    placeholder="Pune"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 focus:outline-none transition-colors ${
                      workerErrors.city
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-400/20'
                        : 'border-slate-200 focus:border-orange-500'
                    }`}
                  />
                  {workerErrors.city && (
                    <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {workerErrors.city}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={workerForm.area}
                    onChange={(e) => setWorkerForm({ ...workerForm, area: e.target.value })}
                    placeholder="Kothrud"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Street / Workshop</label>
                  <input
                    type="text"
                    value={workerForm.line}
                    onChange={(e) => setWorkerForm({ ...workerForm, line: e.target.value })}
                    placeholder="Shop 12, Main Road"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Bio / Profile Summary</label>
                <textarea
                  rows={2}
                  value={workerForm.bio}
                  onChange={(e) => setWorkerForm({ ...workerForm, bio: e.target.value })}
                  placeholder="Professional technician with certified skills..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Status Toggles */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={workerForm.isVerified}
                    onChange={(e) => setWorkerForm({ ...workerForm, isVerified: e.target.checked })}
                    className="rounded text-orange-500 focus:ring-orange-500 h-4 w-4"
                  />
                  <span>Verified Partner</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={workerForm.isAvailable}
                    onChange={(e) => setWorkerForm({ ...workerForm, isAvailable: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Online / Available</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={workerForm.isActive}
                    onChange={(e) => setWorkerForm({ ...workerForm, isActive: e.target.checked })}
                    className="rounded text-blue-500 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Account Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWorkerModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20"
                >
                  {workerModal.mode === 'create' ? 'Create Worker Profile' : 'Save Worker Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Create/Edit Modal */}
      {customerModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {customerModal.mode === 'create' ? 'Add New Customer' : 'Edit Customer'}
              </h3>
              <button
                type="button"
                onClick={() => setCustomerModal(null)}
                className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCustomerSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => {
                    setCustomerForm({ ...customerForm, name: e.target.value })
                    if (customerErrors.name) setCustomerErrors({ ...customerErrors, name: null })
                  }}
                  placeholder="e.g. Priya Mehta"
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none transition-colors ${
                    customerErrors.name
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-400/20'
                      : 'border-slate-200 focus:border-orange-500'
                  }`}
                />
                {customerErrors.name && (
                  <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {customerErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Phone (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerForm.phone}
                    onChange={(e) => {
                      setCustomerForm({ ...customerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      if (customerErrors.phone) setCustomerErrors({ ...customerErrors, phone: null })
                    }}
                    placeholder="9819998199"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none transition-colors ${
                      customerErrors.phone
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-400/20'
                        : 'border-slate-200 focus:border-orange-500'
                    }`}
                  />
                  {customerErrors.phone && (
                    <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {customerErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => {
                      setCustomerForm({ ...customerForm, email: e.target.value })
                      if (customerErrors.email) setCustomerErrors({ ...customerErrors, email: null })
                    }}
                    placeholder="priya@fixmate.in"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 focus:outline-none transition-colors ${
                      customerErrors.email
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-400/20'
                        : 'border-slate-200 focus:border-orange-500'
                    }`}
                  />
                  {customerErrors.email && (
                    <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {customerErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {customerModal.mode === 'create' ? 'Password *' : 'Password (leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={customerForm.password}
                  onChange={(e) => {
                    setCustomerForm({ ...customerForm, password: e.target.value })
                    if (customerErrors.password) setCustomerErrors({ ...customerErrors, password: null })
                  }}
                  placeholder={customerModal.mode === 'create' ? 'Customer@123' : '••••••••'}
                  className={`w-full rounded-xl border px-3.5 py-2 text-xs text-slate-800 focus:outline-none transition-colors ${
                    customerErrors.password
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 ring-1 ring-rose-400/20'
                      : 'border-slate-200 focus:border-orange-500'
                  }`}
                />
                {customerErrors.password && (
                  <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {customerErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-1 border-t border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Default Service Address</p>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Street / Flat / House</label>
                  <input
                    type="text"
                    value={customerForm.line}
                    onChange={(e) => setCustomerForm({ ...customerForm, line: e.target.value })}
                    placeholder="Flat 204, Green Heights"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">City</label>
                    <input
                      type="text"
                      value={customerForm.city}
                      onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                      placeholder="Pune"
                      className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Area</label>
                    <input
                      type="text"
                      value={customerForm.area}
                      onChange={(e) => setCustomerForm({ ...customerForm, area: e.target.value })}
                      placeholder="Baner"
                      className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={customerForm.pincode}
                      onChange={(e) => setCustomerForm({ ...customerForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="411045"
                      className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="custActive"
                  checked={customerForm.isActive}
                  onChange={(e) => setCustomerForm({ ...customerForm, isActive: e.target.checked })}
                  className="rounded text-orange-500 focus:ring-orange-500 h-4 w-4"
                />
                <label htmlFor="custActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Account Active (allowed to book services)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomerModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20"
                >
                  {customerModal.mode === 'create' ? 'Create Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  )
}
