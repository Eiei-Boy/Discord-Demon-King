/**
 * API Service - Communicates with the backend for persistent storage
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1/contract';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = (await response.json()) as T & { error?: string };

        if (!response.ok) {
            return {
                success: false,
                error: data.error || `HTTP ${response.status}`,
            };
        }

        return { success: true, data };
    } catch (error) {
        console.error(`API request failed: ${endpoint}`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ============== USER API ==============

export interface User {
    id: string;
    discordId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
}

export async function getOrCreateUser(discordId: string, timezone?: string): Promise<ApiResponse<User>> {
    return apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify({ discordId, timezone }),
    });
}

export async function updateUserTimezone(discordId: string, timezone: string): Promise<ApiResponse<User>> {
    return apiRequest<User>(`/users/${discordId}/timezone`, {
        method: 'PATCH',
        body: JSON.stringify({ timezone }),
    });
}

// ============== CONTRACT API ==============

export interface Contract {
    id: string;
    userId: string;
    guildId: string;
    reminderChannelId: string;
    failChannelId: string;
    reminderTime: string;
    isActive: boolean;
    currentStreak: number;
    longestStreak: number;
    totalSubmissions: number;
    createdAt: string;
    updatedAt: string;
    user?: User;
    submissions?: Submission[];
}

export interface CreateContractParams {
    discordId: string;
    guildId: string;
    reminderChannelId: string;
    failChannelId: string;
    reminderTime: string;
    timezone?: string;
}

export async function createContract(params: CreateContractParams): Promise<ApiResponse<Contract>> {
    return apiRequest<Contract>('/contracts', {
        method: 'POST',
        body: JSON.stringify(params),
    });
}

export async function getContract(discordId: string, guildId: string): Promise<ApiResponse<Contract>> {
    return apiRequest<Contract>(`/contracts/${discordId}/${guildId}`);
}

export async function cancelContract(discordId: string, guildId: string): Promise<ApiResponse<{ message: string; contract: Contract }>> {
    return apiRequest(`/contracts/${discordId}/${guildId}`, {
        method: 'DELETE',
    });
}

// ============== SUBMISSION API ==============

export interface Submission {
    id: string;
    contractId: string;
    questionNumber: number;
    questionTitle?: string;
    difficulty?: string;
    submittedAt: string;
}

export interface CreateSubmissionParams {
    discordId: string;
    guildId: string;
    questionNumber: number;
    questionTitle?: string;
    difficulty?: string;
}

export interface SubmissionResult {
    submission: Submission;
    contract: Contract;
}

export async function createSubmission(params: CreateSubmissionParams): Promise<ApiResponse<SubmissionResult>> {
    return apiRequest<SubmissionResult>('/submissions', {
        method: 'POST',
        body: JSON.stringify(params),
    });
}

export async function hasSubmittedToday(
    discordId: string,
    guildId: string
): Promise<ApiResponse<{ hasSubmitted: boolean; submission?: Submission }>> {
    return apiRequest(`/submissions/${discordId}/${guildId}/today`);
}

// ============== SCHEDULER API ==============

export interface ScheduledJob {
    id: string;
    jobType: string;
    userId?: string;
    guildId?: string;
    cronExpression: string;
    nextRunAt: string;
    isActive: boolean;
    metadata?: {
        reminderChannelId?: string;
        discordId?: string;
    };
}

export async function getActiveJobs(): Promise<ApiResponse<ScheduledJob[]>> {
    return apiRequest<ScheduledJob[]>('/jobs/active');
}

export interface ActiveContract extends Contract {
    user: User;
}

export async function getActiveContracts(): Promise<ApiResponse<ActiveContract[]>> {
    return apiRequest<ActiveContract[]>('/contracts/active');
}

export interface FailedUser {
    discordId: string;
    guildId: string;
    failChannelId: string;
    currentStreak: number;
}

export async function processMidnightCheck(): Promise<ApiResponse<{ failedUsers: FailedUser[] }>> {
    return apiRequest('/contracts/midnight-check', {
        method: 'POST',
    });
}
