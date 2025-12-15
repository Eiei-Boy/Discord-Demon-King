import { Router } from 'express';
import {
	getOrCreateUser,
	updateUserTimezone,
	createContract,
	getContract,
	cancelContract,
	createSubmission,
	hasSubmittedToday,
	getActiveJobs,
	getActiveContracts,
	processMidnightCheck,
} from '../controllers/contractController';

const router = Router();

// User routes
router.post('/users', getOrCreateUser);
router.patch('/users/:discordId/timezone', updateUserTimezone);

// Contract routes
router.post('/contracts', createContract);
router.get('/contracts/:discordId/:guildId', getContract);
router.delete('/contracts/:discordId/:guildId', cancelContract);

// Submission routes
router.post('/submissions', createSubmission);
router.get('/submissions/:discordId/:guildId/today', hasSubmittedToday);

// Scheduler routes (for bot recovery)
router.get('/jobs/active', getActiveJobs);
router.get('/contracts/active', getActiveContracts);
router.post('/contracts/midnight-check', processMidnightCheck);

export default router;
