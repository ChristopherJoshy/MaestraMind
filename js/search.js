// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) return;
    
    searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query.length < 2) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            return;
        }
        
        // Get courses from localStorage
        const courses = JSON.parse(localStorage.getItem('courses') || '[]');
        
        // Filter courses based on query
        const filteredCourses = courses.filter(course => 
            course.title.toLowerCase().includes(query) || 
            course.summary.toLowerCase().includes(query) ||
            (course.topics && course.topics.some(topic => topic.toLowerCase().includes(query)))
        ).slice(0, 5); // Limit to 5 results
        
        if (filteredCourses.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No courses found</div>';
        } else {
            searchResults.innerHTML = filteredCourses.map(course => `
                <div class="search-result-item" data-course-id="${course.id}">
                    <h4>${highlightText(course.title, query)}</h4>
                    <p>${highlightText(course.summary.substring(0, 100), query)}...</p>
                </div>
            `).join('');
            
            // Add click event to search results
            document.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const courseId = item.dataset.courseId;
                    viewCourse(courseId);
                    searchResults.innerHTML = '';
                    searchResults.classList.remove('active');
                    searchInput.value = '';
                });
            });
        }
        
        searchResults.classList.add('active');
    }, 300));
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
        }
    });
}

function highlightText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

function viewCourse(courseId) {
    // This function is defined in dashboard.js, but we need a reference here
    // In a real app, this would be properly imported
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('course-view').classList.remove('hidden');
    
    // Dispatch a custom event that dashboard.js can listen for
    const event = new CustomEvent('viewCourse', { detail: { courseId } });
    document.dispatchEvent(event);
}

export { setupSearch };