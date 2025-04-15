import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { currentUser } from './auth.js';
import { loadUserCourses } from './dashboard.js';

const courseView = document.getElementById('course-view');
const courseTitle = document.getElementById('course-title');
const courseSummaryText = document.getElementById('course-summary-text');
const lessonsList = document.getElementById('lessons-list');
const lessonContainer = document.getElementById('lesson-container');
const lessonTitle = document.getElementById('lesson-title');
const lessonText = document.getElementById('lesson-text');
const quizContainer = document.getElementById('quiz-container');
const quizQuestions = document.getElementById('quiz-questions');
const submitQuizBtn = document.getElementById('submit-quiz');
const resetQuizBtn = document.getElementById('reset-quiz');
const flashcardsContainer = document.getElementById('flashcards-container');
const backBtn = document.querySelector('.back-btn');
const prevLessonBtn = document.getElementById('prev-lesson');
const nextLessonBtn = document.getElementById('next-lesson');
const markCompleteBtn = document.getElementById('mark-complete');
const lessonNotes = document.getElementById('lesson-notes');
const saveNotesBtn = document.getElementById('save-notes');
const prevCardBtn = document.getElementById('prev-card');
const nextCardBtn = document.getElementById('next-card');
const cardCounter = document.getElementById('card-counter');

let currentCourse = null;
let currentLesson = null;
let currentCardIndex = 0;

async function loadCourseContent(courseId) {
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);
        
        if (!courseDoc.exists()) {
            showNotification('Error', 'Course not found', 'error');
            return;
        }
        
        currentCourse = {
            id: courseDoc.id,
            ...courseDoc.data()
        };
        
        courseTitle.textContent = currentCourse.title;
        courseSummaryText.textContent = currentCourse.summary;
        
        lessonsList.innerHTML = '';
        
        if (currentCourse.lessons && currentCourse.lessons.length > 0) {
            currentCourse.lessons.forEach((lesson, index) => {
                const lessonItem = document.createElement('li');
                lessonItem.className = 'lesson-item';
                lessonItem.dataset.index = index;
                
                const isCompleted = currentCourse.progress && 
                                   currentCourse.progress[index] && 
                                   currentCourse.progress[index].completed;
                
                lessonItem.innerHTML = `
                    <i class="fas ${isCompleted ? 'fa-check-circle' : 'fa-circle'}"></i>
                    ${lesson.title}
                `;
                
                lessonItem.addEventListener('click', () => {
                    loadLesson(index);
                });
                
                lessonsList.appendChild(lessonItem);
            });
            
            loadLesson(0);
        } else {
            lessonContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <p>No lessons available for this course.</p>
                    <button class="btn btn-primary back-btn">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            `;
            
            lessonContainer.querySelector('.back-btn').addEventListener('click', () => {
                courseView.classList.add('hidden');
                document.getElementById('dashboard').classList.remove('hidden');
            });
        }
    } catch (error) {
        console.error('Error loading course:', error);
        showNotification('Error', 'Failed to load course content', 'error');
    }
}

function loadLesson(lessonIndex) {
    if (!currentCourse || !currentCourse.lessons || !currentCourse.lessons[lessonIndex]) {
        showNotification('Error', 'Lesson not found', 'error');
        return;
    }
    
    currentLesson = {
        index: lessonIndex,
        ...currentCourse.lessons[lessonIndex]
    };
    
    const lessonItems = lessonsList.querySelectorAll('.lesson-item');
    lessonItems.forEach(item => {
        if (parseInt(item.dataset.index) === lessonIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    lessonTitle.textContent = currentLesson.title;
    lessonText.innerHTML = currentLesson.content;
    
    loadLessonNotes(lessonIndex);
    
    if (currentCourse.quizzes && currentCourse.quizzes[lessonIndex]) {
        loadQuiz(lessonIndex);
        quizContainer.classList.remove('hidden');
    } else {
        quizContainer.classList.add('hidden');
    }
    
    if (currentCourse.flashcards && currentCourse.flashcards[lessonIndex]) {
        loadFlashcards(lessonIndex);
        flashcardsContainer.classList.remove('hidden');
        currentCardIndex = 0;
        updateCardCounter();
    } else {
        flashcardsContainer.classList.add('hidden');
    }
    
    updateLessonProgress(lessonIndex, false);
    updateNavigationButtons(lessonIndex);
    updateCompletionButton(lessonIndex);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavigationButtons(lessonIndex) {
    if (lessonIndex === 0) {
        prevLessonBtn.disabled = true;
        prevLessonBtn.classList.add('btn-outline');
        prevLessonBtn.classList.remove('btn-primary');
    } else {
        prevLessonBtn.disabled = false;
        prevLessonBtn.classList.remove('btn-outline');
        prevLessonBtn.classList.add('btn-primary');
    }
    
    if (lessonIndex === currentCourse.lessons.length - 1) {
        nextLessonBtn.disabled = true;
        nextLessonBtn.classList.add('btn-outline');
        nextLessonBtn.classList.remove('btn-primary');
    } else {
        nextLessonBtn.disabled = false;
        nextLessonBtn.classList.remove('btn-outline');
        nextLessonBtn.classList.add('btn-primary');
    }
}

function updateCompletionButton(lessonIndex) {
    const isCompleted = currentCourse.progress && 
                       currentCourse.progress[lessonIndex] && 
                       currentCourse.progress[lessonIndex].completed;
    
    if (isCompleted) {
        markCompleteBtn.innerHTML = '<i class="fas fa-check"></i> Completed';
        markCompleteBtn.classList.remove('btn-success');
        markCompleteBtn.classList.add('btn-outline');
    } else {
        markCompleteBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Complete';
        markCompleteBtn.classList.add('btn-success');
        markCompleteBtn.classList.remove('btn-outline');
    }
}

async function loadLessonNotes(lessonIndex) {
    if (!currentUser || !currentCourse) return;
    
    try {
        const notesDocRef = doc(db, 'notes', `${currentUser.uid}_${currentCourse.id}_${lessonIndex}`);
        const notesDoc = await getDoc(notesDocRef);
        
        if (notesDoc.exists()) {
            lessonNotes.value = notesDoc.data().content;
        } else {
            lessonNotes.value = '';
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        lessonNotes.value = '';
    }
}

async function saveUserNotes() {
    if (!currentUser || !currentCourse || !currentLesson) return;
    
    const notesContent = lessonNotes.value.trim();
    
    try {
        const notesDocRef = doc(db, 'notes', `${currentUser.uid}_${currentCourse.id}_${currentLesson.index}`);
        await setDoc(notesDocRef, {
            userId: currentUser.uid,
            courseId: currentCourse.id,
            lessonIndex: currentLesson.index,
            content: notesContent,
            updatedAt: serverTimestamp()
        });
        
        showNotification('Success', 'Your notes have been saved', 'success');
    } catch (error) {
        console.error('Error saving notes:', error);
        showNotification('Error', 'Failed to save your notes', 'error');
    }
}

function loadQuiz(lessonIndex) {
    if (!currentCourse || !currentCourse.quizzes || !currentCourse.quizzes[lessonIndex]) {
        return;
    }
    
    const quiz = currentCourse.quizzes[lessonIndex];
    
    quizQuestions.innerHTML = '';
    
    quiz.questions.forEach((question, qIndex) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'quiz-question';
        questionElement.innerHTML = `
            <h5>${qIndex + 1}. ${question.question}</h5>
            <ul class="quiz-options" data-question="${qIndex}">
                ${question.options.map((option, oIndex) => `
                    <li class="quiz-option" data-option="${oIndex}">${option}</li>
                `).join('')}
            </ul>
            <div class="quiz-result hidden"></div>
        `;
        
        const options = questionElement.querySelectorAll('.quiz-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });
        
        quizQuestions.appendChild(questionElement);
    });
    
    submitQuizBtn.onclick = () => submitQuizAnswers(lessonIndex);
    resetQuizBtn.onclick = () => resetQuiz(lessonIndex);
}

function submitQuizAnswers(lessonIndex) {
    if (!currentCourse || !currentCourse.quizzes || !currentCourse.quizzes[lessonIndex]) {
        return;
    }
    
    const quiz = currentCourse.quizzes[lessonIndex];
    let score = 0;
    let totalQuestions = quiz.questions.length;
    let allAnswered = true;
    
    quiz.questions.forEach((question, qIndex) => {
        const optionsContainer = document.querySelector(`.quiz-options[data-question="${qIndex}"]`);
        const selectedOption = optionsContainer.querySelector('.quiz-option.selected');
        const resultElement = optionsContainer.nextElementSibling;
        
        if (selectedOption) {
            const selectedIndex = parseInt(selectedOption.dataset.option);
            const isCorrect = selectedIndex === question.correctAnswer;
            
            if (isCorrect) score++;
            
            resultElement.classList.remove('hidden');
            resultElement.classList.add(isCorrect ? 'correct' : 'incorrect');
            resultElement.innerHTML = isCorrect 
                ? '<i class="fas fa-check"></i> Correct!' 
                : `<i class="fas fa-times"></i> Incorrect. The correct answer is: ${question.options[question.correctAnswer]}`;
        } else {
            allAnswered = false;
            optionsContainer.classList.add('unanswered');
            setTimeout(() => optionsContainer.classList.remove('unanswered'), 1000);
        }
    });
    
    if (!allAnswered) {
        showNotification('Warning', 'Please answer all questions', 'warning');
        return;
    }
    
    const percentage = (score / totalQuestions) * 100;
    
    const quizSummary = document.createElement('div');
    quizSummary.className = 'quiz-summary';
    quizSummary.innerHTML = `
        <div class="quiz-score">${score}/${totalQuestions} (${Math.round(percentage)}%)</div>
        <p>${percentage >= 70 ? 'Great job! You\'ve mastered this lesson.' : 'Keep studying! Try again to improve your score.'}</p>
    `;
    
    quizQuestions.appendChild(quizSummary);
    submitQuizBtn.disabled = true;
    
    if (percentage >= 70) {
        updateLessonProgress(lessonIndex, true, percentage);
        showNotification('Success', 'Quiz completed successfully!', 'success');
    } else {
        showNotification('Info', 'Keep practicing to improve your score', 'info');
    }
}

function resetQuiz(lessonIndex) {
    loadQuiz(lessonIndex);
    submitQuizBtn.disabled = false;
    window.scrollTo({ top: quizContainer.offsetTop - 100, behavior: 'smooth' });
}

function loadFlashcards(lessonIndex) {
    if (!currentCourse || !currentCourse.flashcards || !currentCourse.flashcards[lessonIndex]) {
        return;
    }
    
    const flashcards = currentCourse.flashcards[lessonIndex];
    
    const flashcardsDeck = document.querySelector('.flashcards-deck');
    flashcardsDeck.innerHTML = '';
    
    flashcards.forEach((flashcard, index) => {
        const flashcardElement = document.createElement('div');
        flashcardElement.className = 'flashcard';
        flashcardElement.style.display = index === 0 ? 'block' : 'none';
        flashcardElement.dataset.index = index;
        
        flashcardElement.innerHTML = `
            <div class="flashcard-front">
                <h4>${flashcard.term}</h4>
                <p>Click to flip</p>
            </div>
            <div class="flashcard-back">
                <p>${flashcard.definition}</p>
                <p>Click to flip back</p>
            </div>
        `;
        
        flashcardElement.addEventListener('click', () => {
            flashcardElement.classList.toggle('flipped');
        });
        
        flashcardsDeck.appendChild(flashcardElement);
    });
    
    prevCardBtn.addEventListener('click', showPreviousCard);
    nextCardBtn.addEventListener('click', showNextCard);
}

function showPreviousCard() {
    if (!currentCourse || !currentCourse.flashcards || !currentCourse.flashcards[currentLesson.index]) {
        return;
    }
    
    const flashcards = document.querySelectorAll('.flashcard');
    if (flashcards.length === 0) return;
    
    flashcards[currentCardIndex].style.display = 'none';
    flashcards[currentCardIndex].classList.remove('flipped');
    
    currentCardIndex = (currentCardIndex - 1 + flashcards.length) % flashcards.length;
    
    flashcards[currentCardIndex].style.display = 'block';
    updateCardCounter();
}

function showNextCard() {
    if (!currentCourse || !currentCourse.flashcards || !currentCourse.flashcards[currentLesson.index]) {
        return;
    }
    
    const flashcards = document.querySelectorAll('.flashcard');
    if (flashcards.length === 0) return;
    
    flashcards[currentCardIndex].style.display = 'none';
    flashcards[currentCardIndex].classList.remove('flipped');
    
    currentCardIndex = (currentCardIndex + 1) % flashcards.length;
    
    flashcards[currentCardIndex].style.display = 'block';
    updateCardCounter();
}

function updateCardCounter() {
    if (!currentCourse || !currentCourse.flashcards || !currentCourse.flashcards[currentLesson.index]) {
        return;
    }
    
    const totalCards = currentCourse.flashcards[currentLesson.index].length;
    cardCounter.textContent = `${currentCardIndex + 1}/${totalCards}`;
}

async function updateLessonProgress(lessonIndex, completed, score = null) {
    if (!currentUser || !currentCourse) return;
    
    try {
        const progress = {
            viewed: true,
            completed: completed,
            lastViewed: serverTimestamp(),
            timestamp: Date.now()
        };
        
        if (score !== null) {
            progress.score = score;
        }
        
        // Update progress in the course document
        const courseDocRef = doc(db, 'courses', currentCourse.id);
        await updateDoc(courseDocRef, {
            [`progress.${lessonIndex}`]: progress,
            lastUpdated: serverTimestamp()
        });
        
        // If completed, update the completedLessons count
        if (completed) {
            const completedLessons = Object.values(currentCourse.progress || {})
                .filter(p => p.completed).length + (currentCourse.progress && currentCourse.progress[lessonIndex] && currentCourse.progress[lessonIndex].completed ? 0 : 1);
                
            await updateDoc(courseDocRef, {
                completedLessons: completedLessons
            });
        }
        
        // Update the lesson document if it exists
        try {
            const lessonsQuery = query(
                collection(db, 'lessons'),
                where('courseId', '==', currentCourse.id),
                where('lessonIndex', '==', lessonIndex)
            );
            
            const lessonSnapshot = await getDocs(lessonsQuery);
            
            if (!lessonSnapshot.empty) {
                const lessonDoc = lessonSnapshot.docs[0];
                await updateDoc(doc(db, 'lessons', lessonDoc.id), {
                    completed: completed,
                    lastAccessed: serverTimestamp(),
                    score: score !== null ? score : lessonDoc.data().score
                });
            }
        } catch (lessonError) {
            console.error('Error updating lesson document:', lessonError);
        }
        
        // Save study activity for analytics
        try {
            await addDoc(collection(db, 'studyActivity'), {
                userId: currentUser.uid,
                courseId: currentCourse.id,
                lessonIndex: lessonIndex,
                lessonTitle: currentCourse.lessons[lessonIndex].title,
                action: completed ? 'completed' : 'viewed',
                timestamp: serverTimestamp(),
                score: score
            });
        } catch (activityError) {
            console.error('Error saving study activity:', activityError);
        }
        
        // Update local state
        if (!currentCourse.progress) currentCourse.progress = {};
        currentCourse.progress[lessonIndex] = progress;
        
        if (completed) {
            const lessonItem = lessonsList.querySelector(`.lesson-item[data-index="${lessonIndex}"]`);
            if (lessonItem) {
                const icon = lessonItem.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-check-circle';
                }
            }
            updateCompletionButton(lessonIndex);
        }
    } catch (error) {
        console.error('Error updating lesson progress:', error);
        showNotification('Error', 'Failed to update progress', 'error');
    }
}

backBtn.addEventListener('click', () => {
    courseView.classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('study-timer').classList.add('hidden');
    
    loadUserCourses();
});

prevLessonBtn.addEventListener('click', () => {
    if (currentLesson && currentLesson.index > 0) {
        loadLesson(currentLesson.index - 1);
    }
});

nextLessonBtn.addEventListener('click', () => {
    if (currentLesson && currentLesson.index < currentCourse.lessons.length - 1) {
        loadLesson(currentLesson.index + 1);
    }
});

markCompleteBtn.addEventListener('click', () => {
    if (currentLesson) {
        const isCompleted = currentCourse.progress && 
                           currentCourse.progress[currentLesson.index] && 
                           currentCourse.progress[currentLesson.index].completed;
        
        updateLessonProgress(currentLesson.index, !isCompleted);
        
        if (!isCompleted) {
            showNotification('Success', 'Lesson marked as complete!', 'success');
        } else {
            showNotification('Info', 'Lesson marked as incomplete', 'info');
        }
    }
});

saveNotesBtn.addEventListener('click', saveUserNotes);

export { loadCourseContent };