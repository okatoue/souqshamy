/**
 * Formats a duration in seconds to mm:ss format.
 * @param seconds - Duration in seconds
 * @returns Formatted string like "1:30" or "0:45"
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
