// Configuration
const API_URL = 'http://localhost:3000/api';

// State
let selectedFile = null;
let processingInterval = null;

// DOM Elements
const uploadArea = document.getElementById('upload-area');
const videoInput = document.getElementById('video-input');
const fileSelected = document.getElementById('file-selected');
const fileName = document.getElementById('file-name');  
const fileSize = document.getElementById('file-size');
const uploadBtn = document.getElementById('upload-btn');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const newVideoBtn = document.getElementById('new-video-btn');

// Sections
const uploadSection = document.getElementById('upload-section');
const processingSection = document.getElementById('processing-section');
const chatSection = document.getElementById('chat-section');

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupEventListeners();
    checkExistingVideo();
}

// Setup Event Listeners
function setupEventListeners() {
    // File input
    videoInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Upload button
    uploadBtn.addEventListener('click', uploadVideo);
    
    // Chat
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Quick questions
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            chatInput.value = btn.dataset.question;
            sendMessage();
        });
    });
    
    // New video button
    newVideoBtn.addEventListener('click', resetApp);
}

// File Selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        displaySelectedFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        selectedFile = file;
        videoInput.files = e.dataTransfer.files;
        displaySelectedFile(file);
    } else {
        showStatus('Please drop a video file', 'error');
    }
}

function displaySelectedFile(file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileSelected.style.display = 'block';
    uploadArea.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Upload Video
async function uploadVideo() {
    if (!selectedFile) return;
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    
    const formData = new FormData();
    formData.append('video', selectedFile);
    
    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showStatus('Video uploaded successfully!', 'success');
            setTimeout(() => startProcessing(), 1000);
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        let errorMessage = error.message;
        
        // Check if backend is running
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Cannot connect to backend. Make sure server is running on http://localhost:3000';
        }
        
        showStatus('Upload failed: ' + errorMessage, 'error');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Video';
    }
}

// Check for existing video
async function checkExistingVideo() {
    try {
        const response = await fetch(`${API_URL}/upload/check`);
        const data = await response.json();
        
        if (data.exists) {
            // Check if already processed
            const statusResponse = await fetch(`${API_URL}/process/status`);
            const statusData = await statusResponse.json();
            
            if (statusData.isComplete) {
                showChatSection();
            }
        }
    } catch (error) {
        console.error('Check video error:', error);
    }
}

// Start Processing
async function startProcessing() {
    showSection('processing');
    
    try {
        const response = await fetch(`${API_URL}/process/start`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            monitorProcessing();
        } else {
            throw new Error(data.error || 'Failed to start processing');
        }
    } catch (error) {
        console.error('Processing error:', error);
        showStatus('Processing failed: ' + error.message, 'error');
    }
}

// Monitor Processing
function monitorProcessing() {
    processingInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/process/status`);
            const data = await response.json();
            
            updateProgress(data);
            
            if (data.isComplete) {
                clearInterval(processingInterval);
                setTimeout(() => {
                    showStatus('Processing complete!', 'success');
                    showChatSection();
                }, 1000);
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }, 2000); // Check every 2 seconds
}

function updateProgress(data) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    progressFill.style.width = data.progress + '%';
    progressText.textContent = data.progress + '%';
    
    // Update step icons
    const steps = {
        audio: document.getElementById('step-audio'),
        frames: document.getElementById('step-frames'),
        transcript: document.getElementById('step-transcript'),
        ocr: document.getElementById('step-ocr'),
        combine: document.getElementById('step-combine')
    };
    
    Object.keys(data.files).forEach(key => {
        if (data.files[key] && steps[key]) {
            steps[key].classList.add('completed');
            steps[key].querySelector('.step-icon').textContent = '✅';
        }
    });
}

// Chat Functions
async function sendMessage() {
    const question = chatInput.value.trim();
    if (!question) return;
    
    // Add user message
    addMessage(question, 'user');
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    // Show typing indicator
    const typingId = addTypingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        if (data.success) {
            addMessage(data.answer, 'bot');
        } else {
            throw new Error(data.error || 'Failed to get answer');
        }
    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator(typingId);
        addMessage('Sorry, I encountered an error. Please try again.', 'bot');
        showStatus('Error: ' + error.message, 'error');
    } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'user' ? '👤' : '🤖';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const p = document.createElement('p');
    p.textContent = text;
    content.appendChild(p);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    content.appendChild(typing);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return 'typing-indicator';
}

function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) indicator.remove();
}

// UI Functions
function showSection(section) {
    uploadSection.style.display = 'none';
    processingSection.style.display = 'none';
    chatSection.style.display = 'none';
    
    if (section === 'upload') {
        uploadSection.style.display = 'block';
    } else if (section === 'processing') {
        processingSection.style.display = 'block';
    } else if (section === 'chat') {
        chatSection.style.display = 'block';
    }
}

function showChatSection() {
    showSection('chat');
    chatInput.focus();
}

function showStatus(message, type = 'info') {
    const statusBar = document.getElementById('status-bar');
    const statusMessage = document.getElementById('status-message');
    
    statusMessage.textContent = message;
    statusBar.className = 'status-bar ' + type;
    statusBar.style.display = 'block';
    
    setTimeout(() => {
        statusBar.style.display = 'none';
    }, 3000);
}

function resetApp() {
    if (confirm('Are you sure you want to upload a new video? This will clear the current session.')) {
        selectedFile = null;
        chatInput.value = '';
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <p>Hello! I've analyzed your lecture. Ask me anything about the content!</p>
                </div>
            </div>
        `;
        
        fileSelected.style.display = 'none';
        uploadArea.style.display = 'block';
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Video';
        
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-text').textContent = '0%';
        
        showSection('upload');
    }
}