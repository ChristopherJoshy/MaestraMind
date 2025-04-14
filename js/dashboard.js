import { db } from './firebase-config.js';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { loadCourseContent } from './course.js';
import { currentUser } from './auth.js';

const coursesList = document.getElementById('courses-list');
const uploadNotesBtn = document.getElementById('upload-notes-btn');
const uploadSection = document.getElementById('upload-section');
const dashboardSection = document.getElementById('dashboard');
const emptyState = document.querySelector('.empty-state');

async function loadUserCourses() {
    if (!currentUser) return;
    
    coursesList.innerHTML = '<div class="loading">Loading your courses...</div>';
    
    try {
        const coursesQuery = query(
            collection(db, 'courses'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(coursesQuery);
        
        coursesList.innerHTML = '';
        
        if (snapshot.empty) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            
            snapshot.forEach(doc => {
                const course = doc.data();
                addCourseToUI(doc.id, course);
            });
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        coursesList.innerHTML = '<div class="error">Failed to load courses. Please try again.</div>';
    }
}

function addCourseToUI(courseId, course) {
    let progress = 0;
    if (course.progress && course.lessons) {
        const completedLessons = Object.values(course.progress).filter(p => p.completed).length;
        progress = (completedLessons / course.lessons.length) * 100;
    }
    
    const courseCard = document.createElement('div');
    courseCard.className = 'course-card';
    courseCard.innerHTML = `
        <div class="course-card-header">
            <h4>${course.title}</h4>
        </div>
        <div class="course-card-body">
            <p>${course.summary.substring(0, 100)}${course.summary.length > 100 ? '...' : ''}</p>
            <div class="course-progress">
                <div class="progress-info">
                    <span>Progress: ${Math.round(progress)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            <button class="btn btn-primary view-course-btn" data-course-id="${courseId}">Continue Learning</button>
        </div>
    `;
    
    const viewCourseBtn = courseCard.querySelector('.view-course-btn');
    viewCourseBtn.addEventListener('click', () => {
        viewCourse(courseId);
    });
    
    coursesList.appendChild(courseCard);
}

function viewCourse(courseId) {
    sessionStorage.setItem('currentCourseId', courseId);
    
    dashboardSection.classList.add('hidden');
    document.getElementById('course-view').classList.remove('hidden');
    
    loadCourseContent(courseId);
}

uploadNotesBtn.addEventListener('click', () => {
    dashboardSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
});

export { loadUserCourses };