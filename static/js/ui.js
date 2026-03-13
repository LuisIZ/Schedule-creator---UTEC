// ui.js - Handles all DOM manipulation, rendering, and User Interactivity

const State = {
    allCourses: [],
    selectedCourse: null,
    // course_code -> { sectionNumber, classes: [Section, ...], allSchedules: [...] }
    enrolledSections: new Map(),
    renderedSchedules: [], // List of active Schedule objects rendered
};

const Elements = {
    courseList: document.getElementById('courseList'),
    searchInput: document.getElementById('courseSearch'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    detailsPanel: document.getElementById('courseDetailsPanel'),
    warningBadge: document.getElementById('conflictWarning'),
    exportBtn: document.getElementById('exportExcelBtn'),
    timeCol: document.querySelector('.time-col'),
};

// Initialize app
async function init() {
    renderTimeLabels();
    setupEventListeners();
    await loadCourses();
}

// Draw the hours column (07:00 to 23:00)
function renderTimeLabels() {
    Elements.timeCol.innerHTML = '';
    for (let h = 7; h <= 23; h++) {
        const timeDiv = document.createElement('div');
        timeDiv.style.height = '60px'; // 1 hour exactly
        timeDiv.style.color = 'var(--text-secondary)';
        timeDiv.style.fontSize = '0.8rem';
        timeDiv.style.padding = '5px';
        timeDiv.innerHTML = `${String(h).padStart(2, '0')}:00`;
        Elements.timeCol.appendChild(timeDiv);
    }
}

async function loadCourses(filter = 'all') {
    Elements.courseList.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">Cargando cursos...</p>';
    State.allCourses = await window.api.fetchCourses();
    renderCourseList(filter);
}

function renderCourseList(filter) {
    Elements.courseList.innerHTML = '';
    const query = Elements.searchInput.value.toLowerCase();

    let filtered = State.allCourses;

    // Apply Type Filter
    if (filter !== 'all') {
        filtered = filtered.filter(c => c.course_type === filter);
    }

    // Apply Search Query
    if (query) {
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.course_code.toLowerCase().includes(query)
        );
    }

    filtered.forEach(course => {
        const li = document.createElement('li');
        li.className = `course-item ${course.course_type?.toLowerCase() || ''}`;
        if (State.selectedCourse?.course_code === course.course_code) {
            li.classList.add('selected');
        }
        // Show a check icon if the course is already enrolled
        const isEnrolled = State.enrolledSections.has(course.course_code);

        li.innerHTML = `
            <div class="course-info">
                <h3>${isEnrolled ? '✅ ' : ''}${course.name}</h3>
                <p>${course.course_code} • ${course.course_type || 'Otro'}</p>
            </div>
        `;

        li.addEventListener('click', () => selectCourse(course));
        Elements.courseList.appendChild(li);
    });
}

/**
 * Extracts the logical section number from a session name.
 * Convention:
 *   "TEORÍA 1"         → section 1
 *   "TEORÍA VIRTUAL 1" → section 1
 *   "LABORATORIO 11"   → section 1 (first digit)
 *   "LABORATORIO 21"   → section 2 (first digit)
 *   "LABORATORIO VIRTUAL 12" → section 1
 */
function extractSectionNumber(sessionName) {
    if (!sessionName) return 0;
    const upper = sessionName.toUpperCase().trim();
    
    // Match the last number(s) in the name
    const match = upper.match(/(\d+)\s*$/);
    if (!match) return 0;
    
    const digits = match[1];
    
    // For TEORÍA: the number IS the section number (TEORÍA 1 → 1, TEORÍA 12 → 12)
    if (upper.includes('TEOR')) {
        return parseInt(digits, 10);
    }
    
    // For LABORATORIO: first digit(s) minus last digit = section number
    // LABORATORIO 11 → section 1, LABORATORIO 21 → section 2
    // LABORATORIO 112 → section 11
    if (upper.includes('LAB')) {
        if (digits.length <= 1) return parseInt(digits, 10);
        // Section number = all digits except the last one
        return parseInt(digits.slice(0, -1), 10);
    }
    
    // Fallback: use the number as-is
    return parseInt(digits, 10);
}

/**
 * Groups a course's flat sections into logical section groups.
 * Returns a Map: sectionNumber -> { number, classes: [section, ...], allSchedules: [...] }
 */
function groupSectionsByNumber(sections) {
    const groups = new Map();
    
    sections.forEach(sec => {
        const num = extractSectionNumber(sec.name);
        
        if (!groups.has(num)) {
            groups.set(num, {
                number: num,
                classes: [],
                allSchedules: [],
            });
        }
        
        const group = groups.get(num);
        group.classes.push(sec);
        // Accumulate all schedules from all classes in this group
        if (sec.schedules) {
            group.allSchedules.push(...sec.schedules);
        }
    });
    
    return groups;
}

function selectCourse(course) {
    State.selectedCourse = course;
    renderCourseList(document.querySelector('.filter-btn.active').dataset.type);
    
    const sectionGroups = groupSectionsByNumber(course.sections);
    
    // Build summary for each group
    let cardsHtml = '';
    // Sort groups by section number
    const sortedGroups = [...sectionGroups.entries()].sort((a, b) => a[0] - b[0]);
    
    sortedGroups.forEach(([num, group]) => {
        const enrolledGroup = State.enrolledSections.get(course.course_code);
        const isSelected = enrolledGroup && enrolledGroup.number === num;
        
        // Build class list summary
        const classNames = group.classes.map(c => c.name).join(', ');
        
        // Get unique professors
        const professors = [...new Set(group.classes.map(c => c.professor_name).filter(Boolean))];
        const profDisplay = professors.length > 0 ? professors.join(', ') : 'Sin Asignar';
        
        // Get unique modalities  
        const modalities = [...new Set(group.classes.map(c => c.modality).filter(Boolean))];
        const modDisplay = modalities.join(', ') || 'Presencial';
        
        // Build schedule summary
        const schedSummary = group.allSchedules
            .map(s => `${s.day}. ${s.start_time}-${s.end_time}`)
            .join(' | ');
        
        // Escape the group object for onclick
        const groupJson = JSON.stringify({
            number: num,
            courseCode: course.course_code,
            classes: group.classes,
            allSchedules: group.allSchedules
        }).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        cardsHtml += `
            <div class="section-card ${isSelected ? 'active' : ''}" 
                 onclick='enrollSectionGroup(JSON.parse(this.dataset.group))'
                 data-group='${JSON.stringify({
                     number: num,
                     courseCode: course.course_code,
                     courseName: course.name,
                     classes: group.classes,
                     allSchedules: group.allSchedules
                 })}'>
                <h4>Sección ${num}</h4>
                <p class="section-classes">${classNames}</p>
                <p>${modDisplay} • ${profDisplay}</p>
                <p class="section-schedule">${schedSummary}</p>
            </div>
        `;
    });

    // Render Sections Panel
    Elements.detailsPanel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>Seleccionar Sección - ${course.name}</h3>
            ${State.enrolledSections.has(course.course_code) ? 
                `<button class="desvincular-btn" onclick="removeCourse('${course.course_code}')">✕ Desvincular</button>` 
            : ''}
        </div>
        <div class="section-list">
            ${cardsHtml}
        </div>
    `;
    Elements.detailsPanel.classList.remove('hidden');
}

// Global scope enrollment — enrolls an entire section group (theory + lab)
window.enrollSectionGroup = function(group) {
    State.enrolledSections.set(group.courseCode, group);
    updateCalendarGrid();
    selectCourse(State.selectedCourse); // re-render section panel
};

window.removeCourse = function(courseCode) {
    State.enrolledSections.delete(courseCode);
    updateCalendarGrid();
    if (State.selectedCourse?.course_code === courseCode) {
        selectCourse(State.selectedCourse);
    }
    renderCourseList(document.querySelector('.filter-btn.active').dataset.type);
};

function updateCalendarGrid() {
    // Clear all existing schedule blocks
    document.querySelectorAll('.schedule-block').forEach(el => el.remove());
    Elements.warningBadge.classList.add('hidden');
    Elements.exportBtn.disabled = false;
    
    // Collect ALL schedules from ALL enrolled section groups
    let allSchedules = [];
    
    State.enrolledSections.forEach((group, courseCode) => {
        // Each group has allSchedules from its classes
        group.allSchedules.forEach(sched => {
            allSchedules.push({
                ...sched,
                courseCode: courseCode,
                courseName: group.courseName || courseCode,
                sectionName: `Sección ${group.number}`
            });
        });
    });
    
    // Find conflicts between DIFFERENT courses only
    const conflicts = window.calendarConfig.findAllConflicts(allSchedules);

    if (conflicts.size > 0) {
        Elements.warningBadge.classList.remove('hidden');
        Elements.exportBtn.disabled = true; // Lock exporting
    }

    // Render blocks onto the correct columns
    allSchedules.forEach(sched => {
        const { day, start_time, end_time, courseCode, courseName, sectionName, id } = sched;
        if (!day || !start_time || !end_time) return;

        const dayColObj = document.querySelector(`.day-col[data-day="${day}"] .slots`);
        if (!dayColObj) return;

        const dims = window.calendarConfig.calculateCSSDimensions(start_time, end_time);
        
        const block = document.createElement('div');
        block.className = `schedule-block ${conflicts.has(id) ? 'conflict' : ''}`;
        block.style.top = dims.top;
        block.style.height = dims.height;
        // Generate a random pleasant color based on courseCode
        block.style.backgroundColor = conflicts.has(id) ? '' : getColorForCourse(courseCode);

        block.innerHTML = `
            <strong>${courseName}</strong>
            <span class="block-meta">${courseCode} • ${sectionName}</span>
            <span class="block-time">${start_time} - ${end_time}</span>
        `;
        dayColObj.appendChild(block);
    });
    
    // Update export button state
    Elements.exportBtn.disabled = State.enrolledSections.size === 0 || conflicts.size > 0;
}

// Color Utility
function getColorForCourse(code) {
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
}

// Event Listeners setup
function setupEventListeners() {
    Elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            Elements.filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderCourseList(e.target.dataset.type);
        });
    });

    Elements.searchInput.addEventListener('input', () => {
        renderCourseList(document.querySelector('.filter-btn.active').dataset.type);
    });

    Elements.exportBtn.addEventListener('click', () => {
        // Collect ALL section IDs from ALL enrolled groups
        const enrolledIds = [];
        State.enrolledSections.forEach(group => {
            group.classes.forEach(cls => {
                enrolledIds.push(cls.id);
            });
        });
        if (enrolledIds.length === 0) {
            window.api.showToast('No has seleccionado ninguna sección todavía.', 'error');
            return;
        }
        window.api.exportSchedule(enrolledIds);
    });
}

document.addEventListener('DOMContentLoaded', init);
