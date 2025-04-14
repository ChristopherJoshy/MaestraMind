import { db, storage } from './firebase-config.js';
import { collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { currentUser } from './auth.js';
import { loadUserCourses } from './dashboard.js';
import { processNotesWithGemini } from './gemini.js';

const uploadTabs = document.querySelectorAll('.upload-tab');
const uploadPanels = document.querySelectorAll('.upload-panel');
const notesTextarea = document.getElementById('notes-text');
const submitTextBtn = document.getElementById('submit-text');
const fileDropArea = document.querySelector('.file-drop-area');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const submitFilesBtn = document.getElementById('submit-files');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');

let selectedFiles = [];

function switchUploadTab(tabName) {
    uploadTabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    uploadPanels.forEach(panel => {
        if (panel.id === `${tabName}-upload`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
}

function handleFileSelection(files) {
    fileList.innerHTML = '';
    selectedFiles = [];
    
    Array.from(files).forEach(file => {
        const validTypes = ['.pdf', '.txt', '.md', '.docx'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!validTypes.includes(fileExtension)) {
            alert(`File type ${fileExtension} is not supported. Please upload PDF, TXT, MD, or DOCX files.`);
            return;
        }
        
        selectedFiles.push(file);
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${file.name} (${formatFileSize(file.size)})</span>
            <span class="file-remove" data-file="${file.name}">✕</span>
        `;
        
        const removeBtn = fileItem.querySelector('.file-remove');
        removeBtn.addEventListener('click', () => {
            selectedFiles = selectedFiles.filter(f => f.name !== file.name);
            fileItem.remove();
        });
        
        fileList.appendChild(fileItem);
    });
    
    submitFilesBtn.disabled = selectedFiles.length === 0;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

async function processTextNotes() {
    const notesText = notesTextarea.value.trim();
    
    if (!notesText) {
        alert('Please enter your notes before submitting.');
        return;
    }
    
    loadingOverlay.classList.remove('hidden');
    loadingMessage.textContent = 'Processing your notes with AI...';
    
    try {
        const noteRef = await addDoc(collection(db, 'notes'), {
            userId: currentUser.uid,
            content: notesText,
            dateUploaded: serverTimestamp(),
            processed: false
        });
        
        const processedData = await processNotesWithGemini(notesText);
        
        await updateDoc(noteRef, {
            processed: true,
            aiSummary: processedData.summary,
            aiTopics: processedData.topics,
            aiQuizzes: processedData.quizzes,
            aiFlashcards: processedData.flashcards
        });
        
        await createCourseFromProcessedData(processedData);
        
        loadingOverlay.classList.add('hidden');
        
        alert('Your notes have been successfully processed! A new course has been created.');
        
        notesTextarea.value = '';
        
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        
        loadUserCourses();
    } catch (error) {
        console.error('Error processing notes:', error);
        
        loadingOverlay.classList.add('hidden');
        
        alert('Failed to process your notes. Please try again.');
    }
}

async function processFileUploads() {
    if (selectedFiles.length === 0) {
        alert('Please select files to upload.');
        return;
    }
    
    loadingOverlay.classList.remove('hidden');
    loadingMessage.textContent = 'Uploading and processing your files...';
    
    try {
        for (const file of selectedFiles) {
            const storageRef = ref(storage, `notes/${currentUser.uid}/${file.name}`);
            await uploadBytes(storageRef, file);
            
            const downloadURL = await getDownloadURL(storageRef);
            
            const fileText = await extractTextFromFile(file);
            
            const noteRef = await addDoc(collection(db, 'notes'), {
                userId: currentUser.uid,
                fileName: file.name,
                fileURL: downloadURL,
                content: fileText,
                dateUploaded: serverTimestamp(),
                processed: false
            });
            
            const processedData = await processNotesWithGemini(fileText);
            
            await updateDoc(noteRef, {
                processed: true,
                aiSummary: processedData.summary,
                aiTopics: processedData.topics,
                aiQuizzes: processedData.quizzes,
                aiFlashcards: processedData.flashcards
            });
            
            await createCourseFromProcessedData(processedData, file.name);
        }
        
        loadingOverlay.classList.add('hidden');
        
        alert('Your files have been successfully processed! New courses have been created.');
        
        fileList.innerHTML = '';
        selectedFiles = [];
        
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        
        loadUserCourses();
    } catch (error) {
        console.error('Error processing files:', error);
        
        loadingOverlay.classList.add('hidden');
        
        alert('Failed to process your files. Please try again.');
    }
}

async function extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            resolve(event.target.result);
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (fileExtension === '.txt' || fileExtension === '.md') {
            reader.readAsText(file);
        } else {
            reader.readAsText(file);
        }
    });
}

async function createCourseFromProcessedData(processedData, fileName = null) {
    return addDoc(collection(db, 'courses'), {
        userId: currentUser.uid,
        title: fileName ? `Course from ${fileName}` : processedData.title || 'New Course',
        summary: processedData.summary,
        topics: processedData.topics,
        lessons: processedData.lessons,
        flashcards: processedData.flashcards,
        quizzes: processedData.quizzes,
        createdAt: serverTimestamp(),
        progress: {}
    });
}

uploadTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        switchUploadTab(tab.dataset.tab);
    });
});

fileDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropArea.classList.add('active');
});

fileDropArea.addEventListener('dragleave', () => {
    fileDropArea.classList.remove('active');
});

fileDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropArea.classList.remove('active');
    handleFileSelection(e.dataTransfer.files);
});

fileDropArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    handleFileSelection(fileInput.files);
});

submitTextBtn.addEventListener('click', processTextNotes);
submitFilesBtn.addEventListener('click', processFileUploads);