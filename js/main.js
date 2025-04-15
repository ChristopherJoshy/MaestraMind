import { auth, db, googleProvider, signInWithPopup } from './firebase-config.js';
import { processNotesWithAI } from './ai-processor.js';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing app');
    initApp();
});

// Also handle window load event to ensure everything is loaded
window.addEventListener('load', () => {
    console.log('Window loaded, checking auth state');
    
    // Ensure all UI elements are properly initialized
    const courseView = document.getElementById('course-view');
    const courseTitle = document.getElementById('course-title');
    const courseSummary = document.getElementById('course-summary-text');
    
    if (!courseView || !courseTitle || !courseSummary) {
        console.error('Course view elements not properly initialized');
    } else {
        console.log('Course view elements initialized successfully');
    }
    
    // Load user courses if user is logged in
    const currentUser = auth.currentUser;
    if (currentUser) {
        console.log('User is already logged in on window load:', currentUser.uid);
        loadUserCourses(currentUser.uid);
    }
});

function initApp() {
    console.log('Initializing app...');
    setupNavigationListeners();
    setupNotifications();
    setupThemeToggle();
    setupStudyTimer();
    setupAuth();
    setupUploadSection();
    
    // Check if user is already logged in
    const currentUser = auth.currentUser;
    console.log('Current user on init:', currentUser?.uid);
    
    if (currentUser) {
        // User is already logged in, load their courses immediately
        handleAuthStateChange(currentUser);
    }
    
    // Set up auth state change listener for future changes
    onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed, user:', user?.uid);
        handleAuthStateChange(user);
    });
}

function setupAuth() {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    
    if (loginButton) {
        loginButton.addEventListener('click', async () => {
            try {
                googleProvider.setCustomParameters({
                    prompt: 'select_account'
                });
                await signInWithPopup(auth, googleProvider);
            } catch (error) {
                console.error('Error signing in:', error);
                showNotification('Error', 'Failed to sign in. Please try again.', 'error');
            }
        });
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error('Error signing out:', error);
                showNotification('Error', 'Failed to sign out. Please try again.', 'error');
            }
        });
    }
}

async function loadUserCourses(userId) {
    try {
        console.log('Loading courses for user:', userId);
        const coursesRef = collection(db, 'users', userId, 'courses');
        const q = query(coursesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        console.log('Courses query result:', querySnapshot.size, 'documents found');
        
        const coursesList = document.getElementById('courses-list');
        if (!coursesList) {
            console.error('Could not find courses-list element');
            return;
        }
        
        const emptyState = coursesList.querySelector('.empty-state');
        const totalCoursesElement = document.getElementById('total-courses');
        
        if (querySnapshot.empty) {
            console.log('No courses found for user');
            if (emptyState) emptyState.classList.remove('hidden');
            if (totalCoursesElement) totalCoursesElement.textContent = '0';
            return;
        }
        
        if (emptyState) emptyState.classList.add('hidden');
        
        let coursesHTML = '';
        let totalCourses = 0;
        let totalProgress = 0;
        
        querySnapshot.forEach((doc) => {
            const course = doc.data();
            course.id = doc.id;
            totalCourses++;
            
            console.log('Found course:', course.id, course.title);
            
            const progress = calculateCourseProgress(course);
            totalProgress += progress;
            
            coursesHTML += `
                <div class="course-card" data-id="${course.id}">
                    <div class="course-header">
                        <h4>${course.title}</h4>
                        <span class="course-date"><i class="far fa-calendar-alt"></i> ${formatDate(course.createdAt?.toDate() || new Date())}</span>
                    </div>
                    <p class="course-summary">${course.summary.substring(0, 120)}...</p>
                    <div class="course-footer">
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text"><i class="fas fa-chart-line"></i> ${progress}% Complete</span>
                        <div class="course-actions">
                            <button class="btn btn-sm btn-primary view-course-btn"><i class="fas fa-book-open"></i> Continue</button>
                            <button class="btn btn-sm btn-danger delete-course-btn"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (coursesList) {
            coursesList.innerHTML = coursesHTML + (emptyState ? emptyState.outerHTML : '');
            console.log('Updated courses list with', totalCourses, 'courses');
            
            // Add event listeners to course cards
            const courseCards = coursesList.querySelectorAll('.course-card');
            courseCards.forEach(card => {
                const viewButton = card.querySelector('.view-course-btn');
                const deleteButton = card.querySelector('.delete-course-btn');
                const courseId = card.dataset.id;
                
                if (viewButton) {
                    viewButton.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (!courseId) {
                            console.error('No course ID found on card');
                            showNotification('Error', 'Could not open course', 'error');
                            return;
                        }
                        
                        try {
                            console.log('Opening course:', courseId);
                            await viewCourse(courseId);
                        } catch (error) {
                            console.error('Error opening course:', error);
                            showNotification('Error', 'Failed to open course', 'error');
                        }
                    });
                }
                
                if (deleteButton) {
                    deleteButton.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (!courseId) {
                            console.error('No course ID found on card');
                            showNotification('Error', 'Could not delete course', 'error');
                            return;
                        }
                        
                        // Show confirmation modal
                        showConfirmModal(
                            'Delete Course', 
                            'Are you sure you want to delete this course? This action cannot be undone.',
                            async () => {
                                try {
                                    console.log('Deleting course:', courseId);
                                    await deleteCourse(courseId);
                                    
                                    // Remove the card from the DOM
                                    card.remove();
                                    
                                    // Update the course count
                                    const totalCoursesElement = document.getElementById('total-courses');
                                    if (totalCoursesElement) {
                                        const currentCount = parseInt(totalCoursesElement.textContent);
                                        totalCoursesElement.textContent = (currentCount - 1).toString();
                                    }
                                    
                                    // Show empty state if no courses left
                                    const remainingCards = coursesList.querySelectorAll('.course-card');
                                    if (remainingCards.length === 0) {
                                        const emptyState = coursesList.querySelector('.empty-state');
                                        if (emptyState) emptyState.classList.remove('hidden');
                                    }
                                    
                                    // Update overall progress
                                    updateOverallProgress();
                                    
                                    showNotification('Success', 'Course deleted successfully', 'success');
                                } catch (error) {
                                    console.error('Error deleting course:', error);
                                    showNotification('Error', 'Failed to delete course', 'error');
                                }
                            }
                        );
                    });
                }
            });
        }
        
        if (totalCoursesElement) totalCoursesElement.textContent = totalCourses;
        
        const overallProgressElement = document.getElementById('overall-progress');
        if (overallProgressElement && totalCourses > 0) {
            const averageProgress = Math.round(totalProgress / totalCourses);
            overallProgressElement.textContent = `${averageProgress}%`;
        }
        
    } catch (error) {
        console.error('Error loading courses:', error);
        console.error(error.stack);
        showNotification('Error', 'Failed to load your courses', 'error');
    }
}

function calculateCourseProgress(course) {
    if (!course.lessons || course.lessons.length === 0) return 0;
    
    const completedLessons = course.lessons.filter(lesson => lesson.completed).length;
    return Math.round((completedLessons / course.lessons.length) * 100);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

async function deleteCourse(courseId) {
    try {
        if (!auth.currentUser) {
            throw new Error('User not authenticated');
        }
        
        console.log('Deleting course:', courseId, 'for user:', auth.currentUser.uid);
        
        // Delete the course document from Firestore
        const courseRef = doc(db, 'users', auth.currentUser.uid, 'courses', courseId);
        await deleteDoc(courseRef);
        
        console.log('Course deleted successfully');
        return true;
    } catch (error) {
        console.error('Error deleting course:', error);
        throw error;
    }
}

function showConfirmModal(title, message, confirmCallback) {
    const modal = document.getElementById('confirm-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    const closeBtn = document.querySelector('.modal-close');
    
    if (!modal || !modalTitle || !modalMessage || !confirmBtn || !cancelBtn) {
        console.error('Modal elements not found');
        return;
    }
    
    // Set modal content
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Remove any existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newCloseBtn = closeBtn.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    
    // Add event listeners
    newConfirmBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    newCancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    newCloseBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function updateOverallProgress() {
    const courseCards = document.querySelectorAll('.course-card');
    let totalProgress = 0;
    let totalCourses = courseCards.length;
    
    if (totalCourses === 0) {
        const overallProgressElement = document.getElementById('overall-progress');
        if (overallProgressElement) {
            overallProgressElement.textContent = '0%';
        }
        return;
    }
    
    courseCards.forEach(card => {
        const progressText = card.querySelector('.progress-text');
        if (progressText) {
            const progressValue = parseInt(progressText.textContent);
            if (!isNaN(progressValue)) {
                totalProgress += progressValue;
            }
        }
    });
    
    const averageProgress = Math.round(totalProgress / totalCourses);
    const overallProgressElement = document.getElementById('overall-progress');
    if (overallProgressElement) {
        overallProgressElement.textContent = `${averageProgress}%`;
    }
}

async function viewCourse(courseId) {
    try {
        const courseRef = doc(db, 'users', auth.currentUser.uid, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        
        if (!courseSnap.exists()) {
            showNotification('Error', 'Course not found', 'error');
            return;
        }
        
        const course = courseSnap.data();
        course.id = courseSnap.id;
        
        // Update last accessed timestamp
        await updateDoc(courseRef, {
            lastAccessed: serverTimestamp()
        });
        
        // Show course view
        const dashboard = document.getElementById('dashboard');
        const courseView = document.getElementById('course-view');
        
        if (dashboard) dashboard.classList.add('hidden');
        if (courseView) courseView.classList.remove('hidden');
        
        // Populate course data
        const courseTitleElement = document.getElementById('course-title');
        const courseSummaryElement = document.getElementById('course-summary-text');
        
        if (courseTitleElement) courseTitleElement.textContent = course.title;
        if (courseSummaryElement) courseSummaryElement.textContent = course.summary;
        
        // Load lessons
        const lessonsList = document.getElementById('lessons-list');
        if (lessonsList && course.lessons) {
            lessonsList.innerHTML = '';
            
            course.lessons.forEach((lesson, index) => {
                const lessonItem = document.createElement('div');
                lessonItem.className = `lesson-item ${lesson.completed ? 'completed' : ''}`;
                lessonItem.dataset.id = lesson.id;
                
                lessonItem.innerHTML = `
                    <div class="lesson-header">
                        <h4>${lesson.title}</h4>
                        <div class="lesson-status">
                            <i class="fas ${lesson.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                        </div>
                    </div>
                    <div class="lesson-actions">
                        <button class="btn btn-sm btn-primary view-lesson-btn">Study</button>
                    </div>
                `;
                
                lessonsList.appendChild(lessonItem);
                
                // Add event listener to view lesson
                lessonItem.querySelector('.view-lesson-btn').addEventListener('click', () => {
                    viewLesson(course, lesson);
                });
            });
        }
        
    } catch (error) {
        console.error('Error viewing course:', error);
        showNotification('Error', 'Failed to load course', 'error');
    }
}

async function viewLesson(course, lesson) {
    try {
        console.log('Viewing lesson:', lesson.id, lesson.title);
        
        // Show lesson content
        const lessonContent = document.getElementById('lesson-content');
        const lessonTitle = document.getElementById('lesson-title');
        const lessonText = document.getElementById('lesson-text');
        const quizContainer = document.getElementById('quiz-container');
        const flashcardsContainer = document.getElementById('flashcards-container');
        
        // Check if elements exist before manipulating them
        if (!lessonContent || !lessonTitle || !lessonText) {
            console.error('Required lesson elements not found in the DOM:', {
                lessonContent: !!lessonContent,
                lessonTitle: !!lessonTitle,
                lessonText: !!lessonText
            });
            showNotification('Error', 'Could not display lesson content', 'error');
            return;
        }
        
        lessonTitle.textContent = lesson.title;
        lessonContent.classList.remove('hidden');
        lessonText.innerHTML = lesson.content;
        
        // Set up the notes textarea
        const lessonNotes = document.getElementById('lesson-notes');
        if (lessonNotes) {
            // If the lesson has saved notes, populate them
            if (lesson.userNotes) {
                lessonNotes.value = lesson.userNotes;
            } else {
                lessonNotes.value = ''; // Clear any previous notes
            }
        }
        
        // Load quiz if available
        if (quizContainer && lesson.quiz && lesson.quiz.questions && lesson.quiz.questions.length > 0) {
            quizContainer.classList.remove('hidden');
            
            const quizQuestions = document.getElementById('quiz-questions');
            if (quizQuestions) {
                quizQuestions.innerHTML = '';
                
                lesson.quiz.questions.forEach((question, index) => {
                    const questionElement = document.createElement('div');
                    questionElement.className = 'quiz-question';
                    questionElement.dataset.id = index;
                    
                    let optionsHTML = '';
                    question.options.forEach((option, optIndex) => {
                        optionsHTML += `
                            <div class="quiz-option">
                                <input type="radio" id="q${index}_o${optIndex}" name="q${index}" value="${optIndex}">
                                <label for="q${index}_o${optIndex}">${option}</label>
                            </div>
                        `;
                    });
                    
                    questionElement.innerHTML = `
                        <div class="question-text">
                            <span class="question-number">${index + 1}.</span>
                            <p>${question.text}</p>
                        </div>
                        <div class="question-options">
                            ${optionsHTML}
                        </div>
                    `;
                    
                    quizQuestions.appendChild(questionElement);
                });
            }
        } else if (quizContainer) {
            quizContainer.classList.add('hidden');
        }
        
        // Set up save notes button
        const saveNotesBtn = document.getElementById('save-notes');
        if (saveNotesBtn) {
            // Remove any existing event listeners
            const newSaveBtn = saveNotesBtn.cloneNode(true);
            saveNotesBtn.parentNode.replaceChild(newSaveBtn, saveNotesBtn);
            
            // Add new event listener
            newSaveBtn.addEventListener('click', async () => {
                const notesText = document.getElementById('lesson-notes').value;
                try {
                    // Update the lesson in the course
                    const updatedLessons = course.lessons.map(l => {
                        if (l.id === lesson.id) {
                            return { ...l, userNotes: notesText };
                        }
                        return l;
                    });
                    
                    // Update in Firestore
                    const courseRef = doc(db, 'users', auth.currentUser.uid, 'courses', course.id);
                    await updateDoc(courseRef, { lessons: updatedLessons });
                    
                    showNotification('Success', 'Notes saved successfully', 'success');
                } catch (error) {
                    console.error('Error saving notes:', error);
                    showNotification('Error', 'Failed to save notes', 'error');
                }
            });
        }
        
        // Load flashcards if available
        if (flashcardsContainer && lesson.flashcards && lesson.flashcards.length > 0) {
            flashcardsContainer.classList.remove('hidden');
            
            const flashcardsDeck = flashcardsContainer.querySelector('.flashcards-deck');
            if (flashcardsDeck) {
                flashcardsDeck.innerHTML = '';
                
                lesson.flashcards.forEach((flashcard, index) => {
                    const card = document.createElement('div');
                    card.className = 'flashcard' + (index === 0 ? ' active' : '');
                    
                    card.innerHTML = `
                        <div class="flashcard-inner">
                            <div class="flashcard-front">
                                <div class="flashcard-content">${flashcard.term}</div>
                            </div>
                            <div class="flashcard-back">
                                <div class="flashcard-content">${flashcard.definition}</div>
                            </div>
                        </div>
                    `;
                    
                    flashcardsDeck.appendChild(card);
                    
                    card.addEventListener('click', () => {
                        card.classList.toggle('flipped');
                    });
                });
                
                // Update card counter
                const cardCounter = document.getElementById('card-counter');
                if (cardCounter) {
                    cardCounter.textContent = `1/${lesson.flashcards.length}`;
                }
                
                // Setup flashcard navigation
                setupFlashcardNavigation(flashcardsDeck);
            }
        } else if (flashcardsContainer) {
            flashcardsContainer.classList.add('hidden');
        }
        
        // Mark lesson as viewed in Firestore
        if (!lesson.completed && auth.currentUser) {
            const courseRef = doc(db, 'users', auth.currentUser.uid, 'courses', course.id);
            const updatedLessons = course.lessons.map(l => {
                if (l.id === lesson.id) {
                    return { ...l, completed: true };
                }
                return l;
            });
            
            await updateDoc(courseRef, {
                lessons: updatedLessons
            });
        }
        
    } catch (error) {
        console.error('Error viewing lesson:', error);
        showNotification('Error', 'Failed to load lesson content', 'error');
    }
}

function setupFlashcardNavigation(flashcardsDeck) {
    let currentCardIndex = 0;
    const prevCardBtn = document.getElementById('prev-card');
    const nextCardBtn = document.getElementById('next-card');
    const cardCounter = document.getElementById('card-counter');
    
    function updateCardDisplay() {
        const cards = flashcardsDeck.querySelectorAll('.flashcard');
        cards.forEach((card, index) => {
            card.classList.remove('active');
            if (index === currentCardIndex) {
                card.classList.add('active');
            }
        });
        cardCounter.textContent = `${currentCardIndex + 1}/${cards.length}`;
    }
    
    if (prevCardBtn) {
        prevCardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const cards = flashcardsDeck.querySelectorAll('.flashcard');
            
            if (currentCardIndex > 0) {
                currentCardIndex--;
                updateCardDisplay();
            }
        });
    }
    
    if (nextCardBtn) {
        nextCardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const cards = flashcardsDeck.querySelectorAll('.flashcard');
            
            if (currentCardIndex < cards.length - 1) {
                currentCardIndex++;
                updateCardDisplay();
            }
        });
    }
}

async function handleAuthStateChange(user) {
    console.log('Handling auth state change, user:', user?.uid);
    
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userProfile = document.getElementById('user-profile');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');
    const landingPage = document.getElementById('landing-page');
    const dashboard = document.getElementById('dashboard');
    
    if (user) {
        console.log('User is logged in:', user.uid);
        
        if (loginButton) loginButton.classList.add('hidden');
        if (logoutButton) logoutButton.classList.remove('hidden');
        if (userProfile) userProfile.classList.remove('hidden');
        
        if (userPhoto) userPhoto.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email) + '&background=4361ee&color=fff';
        if (userName) userName.textContent = user.displayName || user.email;
        
        if (landingPage) landingPage.classList.add('hidden');
        if (dashboard) dashboard.classList.remove('hidden');
        
        try {
            // Update user document
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: serverTimestamp()
            };
            
            if (!docSnap.exists()) {
                userData.createdAt = serverTimestamp();
                userData.role = 'user';
                
                console.log('Creating new user document');
                await setDoc(userRef, userData);
                showNotification('Welcome', 'Your account has been created successfully!', 'success');
            } else {
                console.log('Updating existing user document');
                await updateDoc(userRef, userData);
            }
            
            // Load user courses
            console.log('Loading courses for user after authentication');
            await loadUserCourses(user.uid);
            
        } catch (error) {
            console.error('Error updating user document:', error);
            console.error(error.stack);
        }
    } else {
        console.log('User is logged out');
        
        if (loginButton) loginButton.classList.remove('hidden');
        if (logoutButton) logoutButton.classList.add('hidden');
        if (userProfile) userProfile.classList.add('hidden');
        
        if (landingPage) landingPage.classList.remove('hidden');
        if (dashboard) dashboard.classList.add('hidden');
        
        const uploadSection = document.getElementById('upload-section');
        const courseView = document.getElementById('course-view');
        
        if (uploadSection) uploadSection.classList.add('hidden');
        if (courseView) courseView.classList.add('hidden');
    }
}

function setupUploadSection() {
    const uploadNotesBtn = document.getElementById('upload-notes-btn');
    const emptyUploadBtn = document.getElementById('empty-upload-btn');
    const backToDashboardBtn = document.querySelector('.back-btn');
    const submitTextBtn = document.getElementById('submit-text');
    
    if (uploadNotesBtn) {
        uploadNotesBtn.addEventListener('click', () => {
            const dashboard = document.getElementById('dashboard');
            const uploadSection = document.getElementById('upload-section');
            
            if (dashboard) dashboard.classList.add('hidden');
            if (uploadSection) uploadSection.classList.remove('hidden');
        });
    }
    
    if (emptyUploadBtn) {
        emptyUploadBtn.addEventListener('click', () => {
            const dashboard = document.getElementById('dashboard');
            const uploadSection = document.getElementById('upload-section');
            
            if (dashboard) dashboard.classList.add('hidden');
            if (uploadSection) uploadSection.classList.remove('hidden');
        });
    }
    
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', async () => {
            const dashboard = document.getElementById('dashboard');
            const uploadSection = document.getElementById('upload-section');
            const courseView = document.getElementById('course-view');
            
            if (uploadSection) uploadSection.classList.add('hidden');
            if (courseView) courseView.classList.add('hidden');
            if (dashboard) dashboard.classList.remove('hidden');
            
            // Reload courses when returning to dashboard
            if (auth.currentUser) {
                console.log('Reloading courses when returning to dashboard');
                await loadUserCourses(auth.currentUser.uid);
            }
        });
    }
    
    if (submitTextBtn) {
        submitTextBtn.addEventListener('click', async () => {
            const notesText = document.getElementById('notes-text').value.trim();
            console.log('Submit text button clicked, text length:', notesText.length);
            
            if (!notesText) {
                showNotification('Error', 'Please enter some notes to process', 'error');
                return;
            }
            
            if (!auth.currentUser) {
                console.error('User not authenticated');
                showNotification('Error', 'You must be signed in to create courses', 'error');
                return;
            }
            
            console.log('Processing notes for user:', auth.currentUser.uid);
            const loadingOverlay = document.getElementById('loading-overlay');
            const loadingMessage = document.getElementById('loading-message');
            
            try {
                loadingOverlay.classList.remove('hidden');
                loadingMessage.textContent = 'Processing your notes with AI...';
                
                console.log('Calling AI processor...');
                const course = await processNotesWithAI(notesText);
                console.log('AI processing complete, course generated:', course);
                
                console.log('Saving course to Firestore...');
                // Create a clean course object with proper timestamps
                const courseData = {
                    ...course,
                    createdAt: serverTimestamp(),
                    lastAccessed: serverTimestamp()
                };
                
                // Save to Firestore
                const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'courses'), courseData);
                console.log('Course saved with ID:', docRef.id);
                
                // Hide loading overlay
                loadingOverlay.classList.add('hidden');
                
                // Switch to dashboard view
                const dashboard = document.getElementById('dashboard');
                const uploadSection = document.getElementById('upload-section');
                
                if (uploadSection) uploadSection.classList.add('hidden');
                if (dashboard) dashboard.classList.remove('hidden');
                
                // Reload user courses to show the new course
                await loadUserCourses(auth.currentUser.uid);
                
                showNotification('Success', 'Your notes have been processed successfully!', 'success');
            } catch (error) {
                console.error('Error processing notes:', error);
                console.error(error.stack);
                loadingOverlay.classList.add('hidden');
                showNotification('Error', 'Failed to process notes. Please try again.', 'error');
            }
        });
    }
}

function setupNotifications() {
    // Create notifications container if it doesn't exist
    let notificationsContainer = document.querySelector('.notifications-container');
    
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.className = 'notifications-container';
        document.body.appendChild(notificationsContainer);
    }
    
    // Listen for custom notification events
    document.addEventListener('showNotification', (e) => {
        const { title, message, type } = e.detail;
        showNotification(title, message, type);
    });
}

// Show notification
window.showNotification = function(title, message, type = 'info') {
    const notificationsContainer = document.querySelector('.notifications-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${getNotificationIcon(type)}"></i>
        </div>
        <div class="notification-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notificationsContainer.appendChild(notification);
    
    // Add animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove after 5 seconds
    const timeout = setTimeout(() => {
        removeNotification(notification);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        clearTimeout(timeout);
        removeNotification(notification);
    });
}

function removeNotification(notification) {
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    // Remove from DOM after animation
    setTimeout(() => {
        notification.remove();
    }, 300);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info':
        default: return 'fa-info-circle';
    }
}

function setupNavigationListeners() {
    // Smooth scroll to About section
    document.querySelectorAll('a[href="#about-section"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const aboutSection = document.getElementById('about-section');
            aboutSection.scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    // Learn More button
    const learnMoreBtn = document.getElementById('learn-more-btn');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', () => {
            const featuresSection = document.querySelector('.features');
            if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', theme);
    }
    
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });
}

function setupStudyTimer() {
    import('./study-timer.js')
        .then(module => {
            module.initializeTimerUI();
        })
        .catch(error => {
            console.error('Error loading study timer module:', error);
        });
}