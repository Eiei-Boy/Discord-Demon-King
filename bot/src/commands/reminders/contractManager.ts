import { UserContract } from '../types'; // Define this type somewhere

// In-memory store for contracts (Persistence should use a DB in production)
const contracts = new Map<string, UserContract>();

// Tracks submission status for the CURRENT day (resets at midnight via the scheduler)
const dailySubmissions = new Set<string>(); // Stores User IDs of those who submitted

export interface UserContract {
    userId: string;
    reminderTime: string; // HH:MM
    guildId: string;
    reminderChannelId: string;
    failChannelId: string;
}

export function setContract(userId: string, contract: UserContract): void {
    contracts.set(userId, contract);
    console.log(`Contract set for ${userId}`);
}

export function getContractEntries(): [string, UserContract][] {
    return Array.from(contracts.entries());
}

export function getUserContract(userId: string): UserContract | undefined {
    return contracts.get(userId);
}

export function submitDailyTask(userId: string): boolean {
    if (contracts.has(userId)) {
        dailySubmissions.add(userId);
        console.log(`Submission recorded for ${userId}`);
        return true;
    }
    return false;
}

export function hasSubmittedToday(userId: string): boolean {
    return dailySubmissions.has(userId);
}

export function resetDailySubmissions(): Set<string> {
    const failedUsers = new Set<string>();

    // Check every user with a contract to see if they failed to submit
    for (const userId of contracts.keys()) {
        if (!dailySubmissions.has(userId)) {
            failedUsers.add(userId);
        }
    }

    // Reset the submission tracking for the new day
    dailySubmissions.clear();
    console.log(`Daily submissions reset. Failed users: ${Array.from(failedUsers).join(', ')}`);
    return failedUsers; // Return the list of IDs that failed the contract
}
