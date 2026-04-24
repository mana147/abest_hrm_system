// Pure scheduling functions — no DB calls, fully testable
// Date convention: weekdays 0=Sun(CN), 1=Mon(T2)...6=Sat(T7)
// Matches MySQL weekdays_pattern format e.g. "1,3,5"

function parseLocalDate(input) {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  const [y, m, d] = String(input).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parsePattern(weekdaysPattern) {
  return String(weekdaysPattern).split(',').map(Number);
}

// Returns array of "YYYY-MM-DD" strings, length = totalSessions
// Skips dates in holidaySet (Set of "YYYY-MM-DD" strings)
function generateSessionDates(startDate, weekdaysPattern, totalSessions, holidaySet = new Set()) {
  const pattern = parsePattern(weekdaysPattern);
  const dates   = [];
  const current = parseLocalDate(startDate);
  const limit   = totalSessions * 14; // safety: max 14 days per session (generous)
  let   steps   = 0;

  while (dates.length < totalSessions && steps < limit) {
    const dow     = current.getDay();
    const dateStr = formatDate(current);
    if (pattern.includes(dow) && !holidaySet.has(dateStr)) {
      dates.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
    steps++;
  }

  return dates;
}

// Returns the date of the last (Nth) session
function calcExpectedEndDate(startDate, weekdaysPattern, totalSessions, holidaySet = new Set()) {
  const dates = generateSessionDates(startDate, weekdaysPattern, totalSessions, holidaySet);
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

// Returns the next available opening date:
// = earliest date >= (releaseDate + bufferDays) that falls on a weekday in the pattern
function calcNextOpeningDate(releaseDate, weekdaysPattern, bufferDays = 3) {
  const pattern = parsePattern(weekdaysPattern);
  const current = parseLocalDate(releaseDate);
  current.setDate(current.getDate() + bufferDays);

  for (let i = 0; i < 14; i++) {
    if (pattern.includes(current.getDay())) {
      return formatDate(current);
    }
    current.setDate(current.getDate() + 1);
  }
  return null;
}

// Validates that a given date falls on a weekday in the pattern
// Used to confirm start_date is a valid class day
function isDateInPattern(dateInput, weekdaysPattern) {
  const pattern = parsePattern(weekdaysPattern);
  return pattern.includes(parseLocalDate(dateInput).getDay());
}

// Generates class_code from course_code + start_date
// e.g. "TOEIC_FDN" + "2026-05-01" → "TOEIC_FDN_K260501"
function generateClassCode(courseCode, startDate) {
  const d  = parseLocalDate(startDate);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${courseCode}_K${yy}${mm}${dd}`;
}

module.exports = {
  generateSessionDates,
  calcExpectedEndDate,
  calcNextOpeningDate,
  isDateInPattern,
  generateClassCode,
  formatDate,
  parseLocalDate,
};
