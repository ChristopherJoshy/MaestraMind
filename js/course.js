import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
const flashcardsContainer = document.getElementById('flashcards-container');
const backBtn = document.querySelector('.back-btn');

let currentCourse = null;
let currentLesson = null;

async function loadCourseContent(courseId) {
    try {
        const courseDocRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseDocRef);
        
        if (!courseDoc.exists()) {
            console.error('Course not found');
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
                    ${isCompleted ? '<i class="fas fa-check-circle"></i> ' : ''}
                    ${lesson.title}
                `;
                
                lessonItem.addEventListener('click', () => {
                    loadLesson(index);
                });
                
                lessonsList.appendChild(lessonItem);
            });
            
            loadLesson(0);
        } else {
            lessonContainer.innerHTML = '<p>No lessons available for this course.</p>';
        }
    } catch (error) {
        console.error('Error loading course:', error);
    }
}

function loadLesson(lessonIndex) {
    if (!currentCourse || !currentCourse.lessons || !currentCourse.lessons[lessonIndex]) {
        console.error('Lesson not found');
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
    
    if (currentCourse.quizzes && currentCourse.quizzes[lessonIndex]) {
        loadQuiz(lessonIndex);
        quizContainer.classList.remove('hidden');
    } else {
        quizContainer.classList.add('hidden');
    }
    
    if (currentCourse.flashcards && currentCourse.flashcards[lessonIndex]) {
        loadFlashcards(lessonIndex);
        flashcardsContainer.classList.remove('hidden');
    } else {
        flashcardsContainer.classList.add('hidden');
    }
    
    updateLessonProgress(lessonIndex, false);
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
}

function submitQuizAnswers(lessonIndex) {
    if (!currentCourse || !currentCourse.quizzes || !currentCourse.quizzes[lessonIndex]) {
        return;
    }
    
    const quiz = currentCourse.quizzes[lessonIndex];
    let score = 0;
    let totalQuestions = quiz.questions.length;
    
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
        }
    });
    
    const percentage = (score / totalQuestions) * 100;
    
    alert(`You scored ${score} out of ${totalQuestions} (${Math.round(percentage)}%)`);
    
    if (percentage >= 70) {
        updateLessonProgress(lessonIndex, true, percentage);
    }
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
        flashcardElement.innerHTML = `
            <div class="flashcard-front">
                <h4>${flashcard.term}</h4>
            </div>
            <div class="flashcard-back">
                <p>${flashcard.definition}</p>
            </div>
        `;
        
        flashcardElement.addEventListener('click', () => {
            flashcardElement.classList.toggle('flipped');
        });
        
        flashcardsDeck.appendChild(flashcardElement);
    });
}

async function updateLessonProgress(lessonIndex, completed, score = null) {
    if (!currentUser || !currentCourse) return;
    
    try {
        const progress = {
            viewed: true,
            completed: completed,
            lastViewed: serverTimestamp()
        };
        
        if (score !== null) {
            progress.score = score;
        }
        
        const courseDocRef = doc(db, 'courses', currentCourse.id);
        await updateDoc(courseDocRef, {
            [`progress.${lessonIndex}`]: progress
        });
        
        if (!currentCourse.progress) currentCourse.progress = {};
        currentCourse.progress[lessonIndex] = progress;
        
        if (completed) {
            const lessonItem = lessonsList.querySelector(`.lesson-item[data-index="${lessonIndex}"]`);
            if (lessonItem && !lessonItem.innerHTML.includes('fa-check-circle')) {
                lessonItem.innerHTML = `<i class="fas fa-check-circle"></i> ${currentCourse.lessons[lessonIndex].title}`;
            }
        }
    } catch (error) {
        console.error('Error updating lesson progress:', error);
    }
}

backBtn.addEventListener('click', () => {
    courseView.classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    loadUserCourses();
});

export { loadCourseContent };