import { getTimesheets, saveTimesheets, logAction } from './storage';

/**
 * Get all unique years from timesheet records.
 * @returns {Array<string>} Sorted array of years (e.g. ["2023", "2024"])
 */
export const getAvailableArchiveYears = () => {
    const timesheets = getTimesheets();
    const years = new Set();
    
    timesheets.forEach(ts => {
        if (ts.periodStart) {
            const year = ts.periodStart.split('-')[0];
            if (year) years.add(year);
        }
    });

    return Array.from(years).sort((a, b) => b.localeCompare(a)); // Descending
};

/**
 * Calculate basic stats for a specific year.
 * @param {string} year 
 * @returns {Object} Data size approximation and record count
 */
export const getArchiveStatsForYear = (year) => {
    const timesheets = getTimesheets();
    const yearData = timesheets.filter(ts => ts.periodStart && ts.periodStart.startsWith(year));
    
    const recordCount = yearData.length;
    // Approximate JSON string size in KB
    const sizeKB = (JSON.stringify(yearData).length / 1024).toFixed(2);
    
    return { recordCount, sizeKB };
};

/**
 * Downloads a JSON file of all timesheets for a given year.
 * @param {string} year 
 */
export const downloadArchiveJSON = (year) => {
    const timesheets = getTimesheets();
    const yearData = timesheets.filter(ts => ts.periodStart && ts.periodStart.startsWith(year));
    
    if (yearData.length === 0) return false;

    const exportObject = {
        metadata: {
            appName: "SitalPayslip",
            type: "Timesheet Archive",
            year: year,
            exportedAt: new Date().toISOString(),
            recordCount: yearData.length
        },
        data: yearData
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sitalpayslip_archive_${year}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    logAction('EXPORT_ARCHIVE', `Exported ${yearData.length} records for year ${year}`);
    return true;
};

/**
 * Purges all timesheet records for a given year and saves.
 * @param {string} year 
 */
export const purgeArchiveYear = async (year) => {
    const timesheets = getTimesheets();
    
    const initialCount = timesheets.length;
    const remainingTimesheets = timesheets.filter(ts => !(ts.periodStart && ts.periodStart.startsWith(year)));
    const purgedCount = initialCount - remainingTimesheets.length;

    if (purgedCount > 0) {
        await saveTimesheets(remainingTimesheets);
        logAction('PURGE_ARCHIVE', `Permanently deleted ${purgedCount} records for year ${year}`);
    }
    
    return purgedCount;
};
