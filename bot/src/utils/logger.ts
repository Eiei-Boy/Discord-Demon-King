/**
 * Simple logger utility with colored output
 */

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function getTimestamp(): string {
    return new Date().toISOString();
}

export const logger = {
    info: (message: string, ...args: unknown[]) => {
        console.log(`${colors.blue}[INFO]${colors.reset} ${getTimestamp()} - ${message}`, ...args);
    },

    success: (message: string, ...args: unknown[]) => {
        console.log(
            `${colors.green}[SUCCESS]${colors.reset} ${getTimestamp()} - ${message}`,
            ...args,
        );
    },

    warn: (message: string, ...args: unknown[]) => {
        console.warn(
            `${colors.yellow}[WARN]${colors.reset} ${getTimestamp()} - ${message}`,
            ...args,
        );
    },

    error: (message: string, ...args: unknown[]) => {
        console.error(
            `${colors.red}[ERROR]${colors.reset} ${getTimestamp()} - ${message}`,
            ...args,
        );
    },

    debug: (message: string, ...args: unknown[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(
                `${colors.magenta}[DEBUG]${colors.reset} ${getTimestamp()} - ${message}`,
                ...args,
            );
        }
    },

    command: (commandName: string, userId: string, guildName?: string) => {
        console.log(
            `${colors.cyan}[CMD]${colors.reset} ${getTimestamp()} - /${commandName} by ${userId}${guildName ? ` in ${guildName}` : ''}`,
        );
    },
};
