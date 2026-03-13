// calendar.js - Contains logic for conflict detection and time calculations

const DAYS = {
    'Lun': 1, 'Mar': 2, 'Mie': 3, 'Jue': 4, 'Vie': 5, 'Sab': 6
};

/**
 * Converts a string time "08:30" to fractional hours 8.5 for exact calculations
 */
function timeToHours(timeStr) {
    if (!timeStr) return 0;
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours + (mins / 60);
}

/**
 * Checks if two time intervals overlap 
 */
function isOverlapping(startA, endA, startB, endB) {
    return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Detects schedule conflicts between DIFFERENT courses only.
 * A section's own schedules are never compared against each other.
 * @param {Array} allSchedules - All active schedules with courseCode metadata
 * @returns {Set} Set of conflicting schedule IDs (to mark them red)
 */
function findAllConflicts(allSchedules) {
    const conflicts = new Set();

    for (let i = 0; i < allSchedules.length; i++) {
        for (let j = i + 1; j < allSchedules.length; j++) {
            const a = allSchedules[i];
            const b = allSchedules[j];

            // Only detect conflicts between DIFFERENT courses
            if (a.courseCode === b.courseCode) continue;

            // Must be on the same day
            if (a.day !== b.day) continue;

            const startA = timeToHours(a.start_time);
            const endA = timeToHours(a.end_time);
            const startB = timeToHours(b.start_time);
            const endB = timeToHours(b.end_time);

            if (isOverlapping(startA, endA, startB, endB)) {
                conflicts.add(a.id);
                conflicts.add(b.id);
            }
        }
    }

    return conflicts;
}

// Calculate top percentage and height percentage for absolutely positioned grid blocks
function calculateCSSDimensions(startTime, endTime) {
    const startHourNum = 7; // Calendar starts at 7:00 AM
    const endHourNum = 23;  // Calendar ends at 23:00 PM (11 PM)
    const totalHours = endHourNum - startHourNum; 

    const startH = timeToHours(startTime);
    const endH = timeToHours(endTime);

    const topPercentage = ((startH - startHourNum) / totalHours) * 100;
    const heightPercentage = ((endH - startH) / totalHours) * 100;

    return {
        top: `${Math.max(0, topPercentage)}%`,
        height: `${heightPercentage}%`
    };
}

window.calendarConfig = {
    DAYS,
    findAllConflicts,
    calculateCSSDimensions
};
