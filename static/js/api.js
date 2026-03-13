// api.js - Handles all communication with the Flask Backend API

const API_BASE = '/api';

/**
 * Fetches courses from the backend.
 * @param {string} filterType 'all', 'Obligatorio', or 'Electivo'
 * @returns {Promise<Array>} List of courses
 */
async function fetchCourses(filterType = 'all') {
    let url = `${API_BASE}/courses`;
    if (filterType !== 'all') {
        url += `?type=${encodeURIComponent(filterType)}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch courses');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast('Error cargando cursos del servidor.', 'error');
        return [];
    }
}

/**
 * Sends the selected schedule to the backend to generate an Excel file.
 * @param {Array} selectedSections Array of selected section IDs
 */
async function exportSchedule(selectedSections) {
    try {
        const response = await fetch(`${API_BASE}/export`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sections: selectedSections })
        });

        if (!response.ok) throw new Error('Export failed');
        
        // Handle file download — ensure blob has correct MIME type for xlsx
        const data = await response.arrayBuffer();
        const blob = new Blob([data], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'Mi_Horario_UTEC.xlsx';
        a.style.display = 'none';
        document.body.appendChild(a);
        setTimeout(() => {
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        }, 100);
        
        showToast('¡Horario exportado exitosamente!', 'success');
    } catch (error) {
        console.error('Export Error:', error);
        showToast('Error al exportar el horario.', 'error');
    }
}

// Simple Toast Notification helper
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.borderLeft = `4px solid ${type === 'error' ? 'var(--danger-color)' : 'var(--success-color)'}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Expose to window for other modules
window.api = {
    fetchCourses,
    exportSchedule,
    showToast
};
