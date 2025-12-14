import { Request, Response } from 'express';
import prisma from '../config/database';

// ============== USER OPERATIONS ==============

/**
 * Get or create a user by Discord ID
 */
export const getOrCreateUser = async (req: Request, res: Response) => {
	try {
		const { discordId, timezone } = req.body;

		if (!discordId) {
			return res.status(400).json({ error: 'discordId is required' });
		}

		const user = await prisma.user.upsert({
			where: { discordId },
			update: { timezone: timezone || undefined },
			create: {
				discordId,
				timezone: timezone || 'UTC',
			},
		});

		return res.json(user);
	} catch (error) {
		console.error('Error in getOrCreateUser:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

/**
 * Update user timezone
 */
export const updateUserTimezone = async (req: Request, res: Response) => {
	try {
		const { discordId } = req.params;
		const { timezone } = req.body;

		if (!timezone) {
			return res.status(400).json({ error: 'timezone is required' });
		}

		const user = await prisma.user.update({
			where: { discordId },
			data: { timezone },
		});

		return res.json(user);
	} catch (error) {
		console.error('Error in updateUserTimezone:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ============== CONTRACT OPERATIONS ==============

/**
 * Create a new contract for a user
 */
export const createContract = async (req: Request, res: Response) => {
	try {
		const {
			discordId,
			guildId,
			reminderChannelId,
			failChannelId,
			reminderTime,
			timezone,
		} = req.body;

		if (
			!discordId ||
			!guildId ||
			!reminderChannelId ||
			!failChannelId ||
			!reminderTime
		) {
			return res.status(400).json({
				error: 'discordId, guildId, reminderChannelId, failChannelId, and reminderTime are required',
			});
		}

		// First, ensure user exists
		const user = await prisma.user.upsert({
			where: { discordId },
			update: { timezone: timezone || undefined },
			create: {
				discordId,
				timezone: timezone || 'UTC',
			},
		});

		// Check if contract already exists for this user in this guild
		const existingContract = await prisma.contract.findUnique({
			where: {
				userId_guildId: {
					userId: user.id,
					guildId,
				},
			},
		});

		if (existingContract && existingContract.isActive) {
			return res.status(409).json({
				error: 'Active contract already exists for this user in this guild',
				contract: existingContract,
			});
		}

		// Create or update contract
		const contract = await prisma.contract.upsert({
			where: {
				userId_guildId: {
					userId: user.id,
					guildId,
				},
			},
			update: {
				reminderChannelId,
				failChannelId,
				reminderTime,
				isActive: true,
				currentStreak: 0, // Reset streak on new contract
			},
			create: {
				userId: user.id,
				guildId,
				reminderChannelId,
				failChannelId,
				reminderTime,
			},
			include: {
				user: true,
			},
		});

		// Create scheduled job for reminder
		const [hour, minute] = reminderTime.split(':');
		const cronExpression = `${minute} ${hour} * * *`;

		await prisma.scheduledJob.upsert({
			where: {
				jobType_userId_guildId: {
					jobType: 'reminder',
					userId: user.id,
					guildId,
				},
			},
			update: {
				cronExpression,
				isActive: true,
				nextRunAt: calculateNextRun(reminderTime, timezone || 'UTC'),
				metadata: {
					reminderChannelId,
					discordId,
				},
			},
			create: {
				jobType: 'reminder',
				userId: user.id,
				guildId,
				cronExpression,
				nextRunAt: calculateNextRun(reminderTime, timezone || 'UTC'),
				isActive: true,
				metadata: {
					reminderChannelId,
					discordId,
				},
			},
		});

		return res.status(201).json(contract);
	} catch (error) {
		console.error('Error in createContract:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

/**
 * Get contract by Discord ID and Guild ID
 */
export const getContract = async (req: Request, res: Response) => {
	try {
		const { discordId, guildId } = req.params;

		const user = await prisma.user.findUnique({
			where: { discordId },
		});

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		const contract = await prisma.contract.findUnique({
			where: {
				userId_guildId: {
					userId: user.id,
					guildId,
				},
			},
			include: {
				user: true,
				submissions: {
					orderBy: { submittedAt: 'desc' },
					take: 10,
				},
			},
		});

		if (!contract) {
			return res.status(404).json({ error: 'Contract not found' });
		}

		return res.json(contract);
	} catch (error) {
		console.error('Error in getContract:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

/**
 * Cancel (deactivate) a contract
 */
export const cancelContract = async (req: Request, res: Response) => {
	try {
		const { discordId, guildId } = req.params;

		const user = await prisma.user.findUnique({
			where: { discordId },
		});

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		const contract = await prisma.contract.update({
			where: {
				userId_guildId: {
					userId: user.id,
					guildId,
				},
			},
			data: {
				isActive: false,
			},
		});

		// Deactivate the scheduled job
		await prisma.scheduledJob.updateMany({
			where: {
				userId: user.id,
				guildId,
				jobType: 'reminder',
			},
			data: {
				isActive: false,
			},
		});

		return res.json({ message: 'Contract cancelled', contract });
	} catch (error) {
		console.error('Error in cancelContract:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ============== SUBMISSION OPERATIONS ==============

/**
 * Submit a LeetCode solution
 */
export const createSubmission = async (req: Request, res: Response) => {
	try {
		const { discordId, guildId, questionNumber, questionTitle, difficulty } =
			req.body;

		if (!discordId || !guildId || !questionNumber) {
			return res
				.status(400)
				.json({ error: 'discordId, guildId, and questionNumber are required' });
		}

		const user = await prisma.user.findUnique({
			where: { discordId },
		});

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		const contract = await prisma.contract.findUnique({
			where: {
				userId_guildId: {
					userId: user.id,
					guildId,
				},
			},
		});

		if (!contract || !contract.isActive) {
			return res.status(404).json({ error: 'No active contract found' });
		}

		// Check if user already submitted today
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const existingSubmission = await prisma.submission.findFirst({
			where: {
				contractId: contract.id,
				submittedAt: {
					gte: today,
					lt: tomorrow,
				},
			},
		});

		if (existingSubmission) {
			return res.status(409).json({
				error: 'Already submitted today',
				submission: existingSubmission,
			});
		}

		// Create submission and update streak
		const [submission, updatedContract] = await prisma.$transaction([
			prisma.submission.create({
				data: {
					contractId: contract.id,
					questionNumber,
					questionTitle,
					difficulty,
				},
			}),
			prisma.contract.update({
				where: { id: contract.id },
				data: {
					currentStreak: { increment: 1 },
					totalSubmissions: { increment: 1 },
					longestStreak: Math.max(
						contract.longestStreak,
						contract.currentStreak + 1
					),
				},
			}),
		]);

		return res.status(201).json({
			submission,
			contract: updatedContract,
		});
	} catch (error) {
		console.error('Error in createSubmission:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

/**
 * Check if user has submitted today
 */
export const hasSubmittedToday = async (req: Request, res: Response) => {
	try {
		const { discordId, guildId } = req.params;

		const user = await prisma.user.findUnique({
			where: { discordId },
		});

		if (!user) {
			return res.json({ hasSubmitted: false });
		}

		const contract = await prisma.contract.findUnique({
			where: {
				userId_guildId: {
					userId: user.id,
					guildId,
				},
			},
		});

		if (!contract) {
			return res.json({ hasSubmitted: false });
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const submission = await prisma.submission.findFirst({
			where: {
				contractId: contract.id,
				submittedAt: {
					gte: today,
					lt: tomorrow,
				},
			},
		});

		return res.json({ hasSubmitted: !!submission, submission });
	} catch (error) {
		console.error('Error in hasSubmittedToday:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ============== SCHEDULED JOBS OPERATIONS ==============

/**
 * Get all active scheduled jobs (for bot recovery)
 */
export const getActiveJobs = async (_req: Request, res: Response) => {
	try {
		const jobs = await prisma.scheduledJob.findMany({
			where: { isActive: true },
		});

		return res.json(jobs);
	} catch (error) {
		console.error('Error in getActiveJobs:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

/**
 * Get all active contracts (for midnight check)
 */
export const getActiveContracts = async (_req: Request, res: Response) => {
	try {
		const contracts = await prisma.contract.findMany({
			where: { isActive: true },
			include: {
				user: true,
			},
		});

		return res.json(contracts);
	} catch (error) {
		console.error('Error in getActiveContracts:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

/**
 * Process midnight check - reset streaks for users who didn't submit
 */
export const processMidnightCheck = async (req: Request, res: Response) => {
	try {
		const activeContracts = await prisma.contract.findMany({
			where: { isActive: true },
			include: { user: true },
		});

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const failedUsers: Array<{
			discordId: string;
			guildId: string;
			failChannelId: string;
			currentStreak: number;
		}> = [];

		for (const contract of activeContracts) {
			// Check if user submitted yesterday
			const submission = await prisma.submission.findFirst({
				where: {
					contractId: contract.id,
					submittedAt: {
						gte: yesterday,
						lt: today,
					},
				},
			});

			if (!submission) {
				// User failed - reset streak
				await prisma.contract.update({
					where: { id: contract.id },
					data: { currentStreak: 0 },
				});

				failedUsers.push({
					discordId: contract.user.discordId,
					guildId: contract.guildId,
					failChannelId: contract.failChannelId,
					currentStreak: contract.currentStreak,
				});
			}
		}

		return res.json({ failedUsers });
	} catch (error) {
		console.error('Error in processMidnightCheck:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ============== HELPER FUNCTIONS ==============

function calculateNextRun(reminderTime: string, _timezone: string): Date {
	const [hour, minute] = reminderTime.split(':').map(Number);
	const now = new Date();
	const nextRun = new Date();

	nextRun.setHours(hour, minute, 0, 0);

	// If the time has already passed today, schedule for tomorrow
	if (nextRun <= now) {
		nextRun.setDate(nextRun.getDate() + 1);
	}

	return nextRun;
}
