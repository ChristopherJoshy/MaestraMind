import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { currentUser } from './auth.js';

export { processNotesWithGemini };

async function processNotesWithGemini(notesText) {
    const prompt = `You are an expert educational content creator and tutor. Analyze the following study notes and create a comprehensive learning experience by extracting:

1. A clear, descriptive course title based on the content
2. The main topics covered (5-7 topics)
3. A detailed summary of the overall content (200-300 words)
4. For each topic:
   - Create a lesson with detailed explanations, examples, and key points
   - Generate 5 important flashcards (term → definition) that capture key concepts
   - Create 5 challenging multiple-choice quiz questions with 4 options each

Format your response as a structured JSON object with the following schema:
{
  "title": "Generated course title",
  "summary": "Comprehensive summary of the content",
  "topics": ["Topic 1", "Topic 2", ...],
  "lessons": [
    {"title": "Topic 1", "content": "Detailed lesson content with HTML formatting for better readability"},
    ...
  ],
  "flashcards": [
    [{"term": "Term 1", "definition": "Definition 1"}, ...],
    ...
  ],
  "quizzes": [
    {"topic": "Topic 1", "questions": [{"question": "Question text", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": 0}, ...]},
    ...
  ]
}

Make the content engaging, educational, and well-structured. Use HTML formatting in the lesson content for better readability (headings, paragraphs, lists, etc.).`;

    try {
        // Log the processing request to Firebase
        if (currentUser) {
            try {
                await addDoc(collection(db, 'aiProcessingLogs'), {
                    userId: currentUser.uid,
                    timestamp: serverTimestamp(),
                    contentLength: notesText.length,
                    contentPreview: notesText.substring(0, 200) + '...',
                    status: 'processing'
                });
            } catch (logError) {
                console.error('Error logging AI processing request:', logError);
            }
        }
        
        // Process the content with Gemini API
        const response = await callGeminiAPI(prompt, notesText);
        const cleanedResponse = cleanJsonResponse(response);
        const processedData = JSON.parse(cleanedResponse);
        
        // Log the successful processing to Firebase
        if (currentUser) {
            try {
                await addDoc(collection(db, 'aiProcessingLogs'), {
                    userId: currentUser.uid,
                    timestamp: serverTimestamp(),
                    contentLength: notesText.length,
                    status: 'completed',
                    generatedTitle: processedData.title,
                    topicsCount: processedData.topics.length,
                    lessonsCount: processedData.lessons.length
                });
                
                // Save the raw processed data for future reference
                await addDoc(collection(db, 'rawProcessedData'), {
                    userId: currentUser.uid,
                    timestamp: serverTimestamp(),
                    rawData: processedData,
                    contentPreview: notesText.substring(0, 200) + '...'
                });
            } catch (logError) {
                console.error('Error logging AI processing completion:', logError);
            }
        }
        
        return processedData;
    } catch (error) {
        console.error('Error processing notes with Gemini:', error);
        showNotification('Warning', 'AI processing failed. Using fallback processing method.', 'warning');
        
        // Log the failed processing to Firebase
        if (currentUser) {
            try {
                await addDoc(collection(db, 'aiProcessingLogs'), {
                    userId: currentUser.uid,
                    timestamp: serverTimestamp(),
                    contentLength: notesText.length,
                    status: 'failed',
                    error: error.message
                });
            } catch (logError) {
                console.error('Error logging AI processing failure:', logError);
            }
        }
        
        const topics = extractTopics(notesText);
        return generateCourseStructure(notesText, topics);
    }
}

function cleanJsonResponse(response) {
    let cleanedResponse = response;
    
    if (response.includes('```json')) {
        cleanedResponse = response.split('```json')[1].split('```')[0].trim();
    } else if (response.includes('```')) {
        cleanedResponse = response.split('```')[1].split('```')[0].trim();
    }
    
    return cleanedResponse;
}

// Extract topics from notes (placeholder function)
function extractTopics(notesText) {
    // This is a simplified topic extraction
    // In a real implementation, this would be done by Gemini AI
    
    // Split text into paragraphs
    const paragraphs = notesText.split(/\n\s*\n/);
    
    // Extract potential topics (paragraphs that look like headings)
    const potentialTopics = paragraphs
        .filter(p => p.length < 100 && p.trim().length > 0)
        .map(p => p.trim())
        .slice(0, 5); // Limit to 5 topics for demo
    
    // If no topics found, create generic ones
    if (potentialTopics.length === 0) {
        return ['Introduction', 'Main Concepts', 'Advanced Topics', 'Practical Applications', 'Summary'];
    }
    
    return potentialTopics;
}

// Generate course structure (placeholder function)
function generateCourseStructure(notesText, topics) {
    // This is a simplified course generation
    // In a real implementation, this would be done by Gemini AI
    
    // Split text into chunks for lessons
    const textChunks = splitTextIntoChunks(notesText, topics.length);
    
    // Generate title based on content
    const title = generateTitle(notesText);
    
    // Generate summary
    const summary = generateSummary(notesText);
    
    // Generate lessons
    const lessons = topics.map((topic, index) => ({
        title: topic,
        content: textChunks[index] || 'Content for this lesson will be generated by AI.'
    }));
    
    // Generate flashcards
    const flashcards = topics.map(topic => generateFlashcardsForTopic(topic, notesText));
    
    // Generate quizzes
    const quizzes = topics.map(topic => generateQuizForTopic(topic, notesText));
    
    // Return structured course data
    return {
        title,
        summary,
        topics,
        lessons,
        flashcards,
        quizzes
    };
}

// Split text into chunks for lessons
function splitTextIntoChunks(text, numChunks) {
    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // If not enough paragraphs, duplicate some
    while (paragraphs.length < numChunks) {
        paragraphs.push(paragraphs[paragraphs.length % paragraphs.length]);
    }
    
    // Calculate paragraphs per chunk
    const paragraphsPerChunk = Math.ceil(paragraphs.length / numChunks);
    
    // Create chunks
    const chunks = [];
    for (let i = 0; i < numChunks; i++) {
        const start = i * paragraphsPerChunk;
        const end = Math.min(start + paragraphsPerChunk, paragraphs.length);
        chunks.push(paragraphs.slice(start, end).join('\n\n'));
    }
    
    return chunks;
}

// Generate title based on content
function generateTitle(text) {
    // This is a simplified title generation
    // In a real implementation, this would be done by Gemini AI
    
    // Get first line that's not too long
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.trim().length > 0 && line.trim().length < 50) {
            return line.trim();
        }
    }
    
    return 'Course Generated from Your Notes';
}

// Generate summary
function generateSummary(text) {
    // This is a simplified summary generation
    // In a real implementation, this would be done by Gemini AI
    
    // Get first few paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const firstParagraphs = paragraphs.slice(0, 2).join('\n\n');
    
    if (firstParagraphs.length > 0) {
        return firstParagraphs;
    }
    
    return 'This course is generated from your uploaded notes. It covers key concepts and provides interactive quizzes and flashcards to help you master the material.';
}

// Generate flashcards for a topic
function generateFlashcardsForTopic(topic, text) {
    // This is a simplified flashcard generation
    // In a real implementation, this would be done by Gemini AI
    
    // Create 3-5 flashcards per topic
    const numFlashcards = 3 + Math.floor(Math.random() * 3);
    const flashcards = [];
    
    for (let i = 0; i < numFlashcards; i++) {
        flashcards.push({
            term: `Key Concept ${i + 1} for ${topic}`,
            definition: `This is the definition for a key concept related to ${topic}. In a real implementation, this would be generated by Gemini AI based on your notes.`
        });
    }
    
    return flashcards;
}

// Generate quiz for a topic
function generateQuizForTopic(topic, text) {
    // This is a simplified quiz generation
    // In a real implementation, this would be done by Gemini AI
    
    // Create 3-5 questions per topic
    const numQuestions = 3 + Math.floor(Math.random() * 3);
    const questions = [];
    
    for (let i = 0; i < numQuestions; i++) {
        questions.push({
            question: `Question ${i + 1} about ${topic}?`,
            options: [
                `Answer option A for question ${i + 1}`,
                `Answer option B for question ${i + 1}`,
                `Answer option C for question ${i + 1}`,
                `Answer option D for question ${i + 1}`
            ],
            correctAnswer: Math.floor(Math.random() * 4) // Random correct answer
        });
    }
    
    return {
        topic,
        questions
    };
}

async function callGeminiAPI(prompt, text) {
    const apiKey = window.ENV.GEMINI_API_KEY;
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    
    try {
        const response = await fetch(`${endpoint}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `${prompt}\n\nNotes: ${text}`
                            }
                        ]
                    }
                ]
            })
        });
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}