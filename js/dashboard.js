import { db } from './firebase-config.js';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { loadCourseContent } from './course.js';
import { currentUser } from './auth.js';

const coursesList = document.getElementById('courses-list');
const uploadNotesBtn = document.getElementById('upload-notes-btn');
const uploadSection = document.getElementById('upload-section');
const dashboardSection = document.getElementById('dashboard');
const emptyState = document.querySelector('.empty-state');
const totalCoursesElement = document.getElementById('total-courses');
const overallProgressElement = document.getElementById('overall-progress');

async function loadUserCourses() {
    if (!currentUser) return;
    
    coursesList.innerHTML = '<div class="loading">Loading your courses...</div>';
    
    try {
        // Get courses created by the user
        const userCoursesQuery = query(
            collection(db, 'courses'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        // Also get courses shared with the user
        const sharedCoursesQuery = query(
            collection(db, 'sharedCourses'),
            where('sharedWithUserId', '==', currentUser.uid)
        );
        
        const [userCoursesSnapshot, sharedCoursesSnapshot] = await Promise.all([
            getDocs(userCoursesQuery),
            getDocs(sharedCoursesQuery)
        ]);
        
        coursesList.innerHTML = '';
        
        // Process shared courses
        const sharedCourseIds = [];
        const sharedCoursePromises = [];
        
        sharedCoursesSnapshot.forEach(sharedDoc => {
            const sharedData = sharedDoc.data();
            sharedCourseIds.push(sharedData.courseId);
            sharedCoursePromises.push(getDoc(doc(db, 'courses', sharedData.courseId)));
        });
        
        const sharedCoursesDocs = await Promise.all(sharedCoursePromises);
        
        // Combine user courses and shared courses
        const allCourses = [];
        let totalProgress = 0;
        
        // Add user courses
        userCoursesSnapshot.forEach(courseDoc => {
            const course = courseDoc.data();
            course.id = courseDoc.id;
            course.isOwner = true;
            allCourses.push(course);
            
            const courseProgress = calculateCourseProgress(course);
            totalProgress += courseProgress;
            
            addCourseToUI(courseDoc.id, course, courseProgress);
        });
        
        // Add shared courses
        sharedCoursesDocs.forEach((courseDoc, index) => {
            if (courseDoc.exists()) {
                const course = courseDoc.data();
                course.id = courseDoc.id;
                course.isOwner = false;
                course.sharedBy = sharedCoursesSnapshot.docs[index].data().sharedByUserName;
                allCourses.push(course);
                
                const courseProgress = calculateCourseProgress(course);
                totalProgress += courseProgress;
                
                addCourseToUI(courseDoc.id, course, courseProgress, true);
            }
        });
        
        if (allCourses.length === 0) {
            emptyState.classList.remove('hidden');
            updateDashboardStats(0, 0);
        } else {
            emptyState.classList.add('hidden');
            
            const averageProgress = allCourses.length > 0 ? Math.round(totalProgress / allCourses.length) : 0;
            updateDashboardStats(allCourses.length, averageProgress);
            
            // Save courses to localStorage for offline access and search functionality
            localStorage.setItem('courses', JSON.stringify(allCourses));
            
            // Also save a timestamp of when courses were last fetched
            localStorage.setItem('coursesLastFetched', Date.now());
        }
        
        // Fetch and update study statistics
        await updateStudyStatistics();
        
    } catch (error) {
        console.error('Error loading courses:', error);
        coursesList.innerHTML = '<div class="error">Failed to load courses. Please try again.</div>';
        showNotification('Error', 'Failed to load your courses. Please try again.', 'error');
        
        // Try to load from localStorage if available
        const cachedCourses = localStorage.getItem('courses');
        if (cachedCourses) {
            try {
                const courses = JSON.parse(cachedCourses);
                if (courses.length > 0) {
                    showNotification('Info', 'Showing cached courses from your last session.', 'info');
                    
                    coursesList.innerHTML = '';
                    let totalProgress = 0;
                    
                    courses.forEach(course => {
                        const courseProgress = calculateCourseProgress(course);
                        totalProgress += courseProgress;
                        addCourseToUI(course.id, course, courseProgress, !course.isOwner);
                    });
                    
                    const averageProgress = courses.length > 0 ? Math.round(totalProgress / courses.length) : 0;
                    updateDashboardStats(courses.length, averageProgress);
                    
                    emptyState.classList.add('hidden');
                }
            } catch (cacheError) {
                console.error('Error loading cached courses:', cacheError);
            }
        }
    }
}

async function updateStudyStatistics() {
    try {
        // Get study activity for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activityQuery = query(
            collection(db, 'studyActivity'),
            where('userId', '==', currentUser.uid),
            where('timestamp', '>=', thirtyDaysAgo),
            orderBy('timestamp', 'desc')
        );
        
        const activitySnapshot = await getDocs(activityQuery);
        
        // Calculate total study time (assuming each lesson view is 15 minutes)
        let totalStudyTime = 0;
        const studyDays = new Set();
        
        activitySnapshot.forEach(activityDoc => {
            const activity = activityDoc.data();
            
            // Add 15 minutes for each lesson viewed
            totalStudyTime += 15;
            
            // Track unique study days for streak calculation
            if (activity.timestamp) {
                const date = activity.timestamp.toDate().toDateString();
                studyDays.add(date);
            }
        });
        
        // Update localStorage with study statistics
        localStorage.setItem('studyTime', totalStudyTime.toString());
        
        // Update UI
        document.getElementById('study-time').textContent = `${totalStudyTime}m`;
        
        // Calculate current streak
        const streak = calculateStreak(Array.from(studyDays));
        localStorage.setItem('studyStreak', streak.toString());
        document.getElementById('study-streak').textContent = `${streak} days`;
        
    } catch (error) {
        console.error('Error updating study statistics:', error);
    }
}

function calculateStreak(studyDays) {
    if (studyDays.length === 0) return 0;
    
    // Sort days in descending order (newest first)
    studyDays.sort((a, b) => new Date(b) - new Date(a));
    
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();
    
    // Check if studied today or yesterday
    const hasStudiedRecently = studyDays.includes(today) || studyDays.includes(yesterdayString);
    
    if (!hasStudiedRecently) return 0;
    
    // Count consecutive days
    let streak = 1;
    let currentDate = new Date(studyDays[0]);
    
    for (let i = 1; i < studyDays.length; i++) {
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        
        const nextStudyDay = new Date(studyDays[i]);
        
        if (prevDate.toDateString() === nextStudyDay.toDateString()) {
            streak++;
            currentDate = nextStudyDay;
        } else {
            break;
        }
    }
    
    return streak;
}

function calculateCourseProgress(course) {
    if (!course.progress || !course.lessons || course.lessons.length === 0) {
        return 0;
    }
    
    const completedLessons = Object.values(course.progress).filter(p => p.completed).length;
    return Math.round((completedLessons / course.lessons.length) * 100);
}

function updateDashboardStats(totalCourses, averageProgress) {
    totalCoursesElement.textContent = totalCourses;
    overallProgressElement.textContent = `${averageProgress}%`;
    
    const lastLoginDate = localStorage.getItem('lastLoginDate');
    const today = new Date().toDateString();
    
    if (lastLoginDate !== today) {
        localStorage.setItem('lastLoginDate', today);
        
        const currentStreak = parseInt(localStorage.getItem('studyStreak') || '0');
        const lastDate = new Date(lastLoginDate || today);
        const currentDate = new Date(today);
        
        const dayDifference = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (dayDifference === 1) {
            localStorage.setItem('studyStreak', currentStreak + 1);
        } else if (dayDifference > 1) {
            localStorage.setItem('studyStreak', 1);
        }
        
        document.getElementById('study-streak').textContent = `${localStorage.getItem('studyStreak') || '0'} days`;
    }
}

function addCourseToUI(courseId, course, progress, isShared = false) {
    const lastUpdated = course.progress ? 
        Object.values(course.progress)
            .sort((a, b) => b.lastViewed?.seconds - a.lastViewed?.seconds)[0]?.lastViewed 
        : course.createdAt;
    
    const formattedDate = formatDate(lastUpdated);
    const lessonCount = course.lessons ? course.lessons.length : 0;
    const completedLessons = course.progress ? 
        Object.values(course.progress).filter(p => p.completed).length : 0;
    
    const courseCard = document.createElement('div');
    courseCard.className = 'course-card';
    if (isShared) courseCard.classList.add('shared-course');
    courseCard.dataset.progress = progress;
    courseCard.dataset.date = lastUpdated ? new Date(lastUpdated.seconds * 1000).getTime() : Date.now();
    courseCard.dataset.courseId = courseId;
    
    courseCard.innerHTML = `
        <div class="course-card-header">
            <h4>${course.title}</h4>
            ${isShared ? `<div class="shared-badge" title="Shared with you by ${course.sharedBy || 'another user'}">
                <i class="fas fa-share-alt"></i> Shared
            </div>` : ''}
        </div>
        <div class="course-card-body">
            <div class="course-meta">
                <span><i class="fas fa-book"></i> ${lessonCount} lessons</span>
                <span><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
                ${course.tags && course.tags.length > 0 ? 
                    `<span><i class="fas fa-tags"></i> ${course.tags.slice(0, 2).join(', ')}</span>` : ''}
            </div>
            <p>${course.summary.substring(0, 120)}${course.summary.length > 120 ? '...' : ''}</p>
            <div class="course-progress">
                <div class="progress-info">
                    <span>${completedLessons}/${lessonCount} lessons completed</span>
                    <span>${Math.round(progress)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="course-actions">
                <button class="btn btn-primary view-course-btn" data-course-id="${courseId}">
                    <i class="fas fa-book-open"></i> 
                    ${progress > 0 ? 'Continue Learning' : 'Start Learning'}
                </button>
                <div class="course-options">
                    ${!isShared ? `
                    <button class="btn btn-icon share-course-btn" title="Share this course" data-course-id="${courseId}">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    ` : ''}
                    <button class="btn btn-icon save-course-btn ${course.savedForLater ? 'active' : ''}" 
                            title="${course.savedForLater ? 'Saved for later' : 'Save for later'}" 
                            data-course-id="${courseId}">
                        <i class="fas ${course.savedForLater ? 'fa-bookmark' : 'fa-bookmark'}"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const viewCourseBtn = courseCard.querySelector('.view-course-btn');
    viewCourseBtn.addEventListener('click', () => {
        viewCourse(courseId);
    });
    
    // Add event listeners for the action buttons
    const saveCourseBtn = courseCard.querySelector('.save-course-btn');
    if (saveCourseBtn) {
        saveCourseBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const courseRef = doc(db, 'courses', courseId);
                const isSaved = saveCourseBtn.classList.contains('active');
                
                await updateDoc(courseRef, {
                    savedForLater: !isSaved
                });
                
                saveCourseBtn.classList.toggle('active');
                saveCourseBtn.title = isSaved ? 'Save for later' : 'Saved for later';
                
                // Update the course in localStorage
                const courses = JSON.parse(localStorage.getItem('courses') || '[]');
                const courseIndex = courses.findIndex(c => c.id === courseId);
                if (courseIndex !== -1) {
                    courses[courseIndex].savedForLater = !isSaved;
                    localStorage.setItem('courses', JSON.stringify(courses));
                }
                
                showNotification(
                    isSaved ? 'Course Unsaved' : 'Course Saved', 
                    isSaved ? 'Course removed from saved items' : 'Course saved for later', 
                    'info'
                );
            } catch (error) {
                console.error('Error updating course saved status:', error);
                showNotification('Error', 'Failed to update course status', 'error');
            }
        });
    }
    
    const shareCourseBtn = courseCard.querySelector('.share-course-btn');
    if (shareCourseBtn) {
        shareCourseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showShareCourseDialog(courseId, course.title);
        });
    }
    
    coursesList.appendChild(courseCard);
}

function showShareCourseDialog(courseId, courseTitle) {
    // In a real implementation, this would show a dialog to share the course
    // For this demo, we'll just show a notification
    showNotification(
        'Share Course', 
        `This would show a dialog to share "${courseTitle}" with other users.`, 
        'info'
    );
}

function viewCourse(courseId) {
    sessionStorage.setItem('currentCourseId', courseId);
    
    dashboardSection.classList.add('hidden');
    document.getElementById('course-view').classList.remove('hidden');
    
    loadCourseContent(courseId);
    
    window.toggleStudyTimer();
}

uploadNotesBtn.addEventListener('click', () => {
    dashboardSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
});

export { loadUserCourses, viewCourse };