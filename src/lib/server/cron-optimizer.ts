/**
 * Cron Execution Optimizer
 * Prevents unnecessary D1 database reads when no reminder emails are due
 */

export function shouldSkipCronExecution(
	currentTimeMs: number,
	nextScheduledTimeMs: number | null | undefined
): boolean {
	if (!nextScheduledTimeMs || isNaN(nextScheduledTimeMs)) {
		return false;
	}
	return currentTimeMs < nextScheduledTimeMs;
}
