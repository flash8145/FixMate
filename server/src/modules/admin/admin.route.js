import { Router } from 'express'
import * as adminController from './admin.controller.js'
import { requireAuth } from '../../middleware/auth.js'
import { rbac } from '../../middleware/rbac.js'

const router = Router()

// All admin routes require authenticated user with role 'admin'
router.use(requireAuth, rbac('admin'))

router.get('/stats', adminController.getStats)
router.get('/workers/pending', adminController.getPendingWorkers)
router.get('/workers', adminController.getAllWorkers)
router.post('/workers', adminController.createWorker)
router.patch('/workers/:id/verify', adminController.verifyWorker)
router.patch('/workers/:id', adminController.updateWorker)
router.delete('/workers/:id', adminController.deleteWorker)

router.get('/customers', adminController.getAllCustomers)
router.post('/customers', adminController.createCustomer)
router.patch('/customers/:id/verify', adminController.verifyCustomer)
router.patch('/customers/:id', adminController.updateCustomer)
router.delete('/customers/:id', adminController.deleteCustomer)

router.post('/categories', adminController.createCategory)
router.patch('/categories/:id', adminController.updateCategory)
router.delete('/categories/:id', adminController.deleteCategory)

router.get('/pricing-config', adminController.getPricingConfig)
router.patch('/pricing-config', adminController.updatePricingConfig)

export default router
