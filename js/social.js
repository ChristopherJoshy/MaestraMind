// Social sharing functionality
function setupSocialSharing() {
    // This is a simplified version for the non-working model
    document.addEventListener('click', (e) => {
        if (e.target.closest('.share-course-btn')) {
            const courseId = e.target.closest('.share-course-btn').dataset.courseId;
            const courseTitle = e.target.closest('.course-card').querySelector('h4').textContent;
            
            showShareDialog(courseId, courseTitle);
        }
    });
}

function showShareDialog(courseId, courseTitle) {
    // Create a modal for sharing
    const modal = document.createElement('div');
    modal.className = 'modal share-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Share "${courseTitle}"</h3>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p>Share this course with others:</p>
                <div class="share-options">
                    <button class="share-option" data-platform="twitter">
                        <i class="fab fa-twitter"></i> Twitter
                    </button>
                    <button class="share-option" data-platform="facebook">
                        <i class="fab fa-facebook"></i> Facebook
                    </button>
                    <button class="share-option" data-platform="linkedin">
                        <i class="fab fa-linkedin"></i> LinkedIn
                    </button>
                    <button class="share-option" data-platform="email">
                        <i class="fas fa-envelope"></i> Email
                    </button>
                </div>
                <div class="share-link">
                    <p>Or copy this link:</p>
                    <div class="copy-link-container">
                        <input type="text" readonly value="https://maestramind.com/course/${courseId}" class="copy-link-input">
                        <button class="copy-link-btn"><i class="fas fa-copy"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelectorAll('.share-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.platform;
            shareToSocialMedia(platform, courseId, courseTitle);
            modal.remove();
        });
    });
    
    modal.querySelector('.copy-link-btn').addEventListener('click', () => {
        const linkInput = modal.querySelector('.copy-link-input');
        linkInput.select();
        document.execCommand('copy');
        
        showNotification('Link Copied', 'Course link copied to clipboard', 'success');
    });
    
    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function shareToSocialMedia(platform, courseId, courseTitle) {
    // This would actually share to social media in a real app
    // For this demo, we'll just show a notification
    showNotification('Share', `Shared "${courseTitle}" to ${platform}`, 'success');
}

function showNotification(title, message, type) {
    // This function is defined in app.js, but we need a reference here
    // In a real app, this would be properly imported
    const event = new CustomEvent('showNotification', { 
        detail: { title, message, type } 
    });
    document.dispatchEvent(event);
}

export { setupSocialSharing };