// Configuration
const API_URL = 'http://localhost:3000/api';

// State
let selectedFile = null;
let processingInterval = null;
let currentSessionId = null;

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
const historySection = document.getElementById('history-section');

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupEventListeners();
    checkExistingVideo();
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            
            document.getElementById(`${targetTab}-section`).classList.remove('hidden');
            
            if (targetTab === 'history') {
                loadFullHistory();
            } else if (targetTab === 'chat') {
                loadSessions();
            }
        });
    });

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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // New video button
    newVideoBtn.addEventListener('click', resetApp);

    // Refresh history button
    document.getElementById('refresh-history-btn').addEventListener('click', loadFullHistory);
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
    fileSelected.classList.remove('hidden');
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
            uploadSection.classList.add('hidden');
            processingSection.classList.remove('hidden');
            setTimeout(() => startProcessing(), 1000);
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        let errorMessage = error.message;
        
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
            const statusResponse = await fetch(`${API_URL}/process/status`);
            const statusData = await statusResponse.json();
            
            if (statusData.isComplete) {
                document.querySelector('[data-tab="chat"]').click();
                loadSessions();
            }
        }
    } catch (error) {
        console.error('Check video error:', error);
    }
}

// Start Processing
async function startProcessing() {
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
                    document.querySelector('[data-tab="chat"]').click();
                }, 1000);
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }, 2000);
}

function updateProgress(data) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    progressFill.style.width = data.progress + '%';
    progressText.textContent = data.progress + '%';
    
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
            steps[key].querySelector('span').textContent = '✓';
        }
    });
}

// Chat Functions
async function sendMessage() {
    const question = chatInput.value.trim();
    if (!question) return;
    
    addMessage(question, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';
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
            body: JSON.stringify({ 
                question,
                sessionId: currentSessionId 
            })
        });
        
        const data = await response.json();
        
        removeTypingIndicator(typingId);
        
        if (data.success) {
            addMessage(data.answer, 'bot');
            currentSessionId = data.sessionId;
            loadSessions();
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
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const p = document.createElement('p');
    p.textContent = text;
    content.appendChild(p);
    
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.id = 'typing-indicator';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    content.appendChild(typing);
    
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return 'typing-indicator';
}

function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) indicator.remove();
}

// Session Management
async function loadSessions() {
    try {
        const response = await fetch(`${API_URL}/chat/history`);
        const data = await response.json();
        
        const sessionList = document.getElementById('session-list');
        if (data.sessions && data.sessions.length > 0) {
            sessionList.innerHTML = data.sessions.slice(0, 10).map(session => `
                <div class="history-item ${session.id === currentSessionId ? 'active' : ''}" 
                     onclick="loadSession('${session.id}')">
                    <div style="font-weight: 600; margin-bottom: 4px;">
                        ${new Date(session.createdAt).toLocaleDateString()}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-light);">
                        ${session.chats.length} messages
                    </div>
                </div>
            `).join('');
        } else {
            sessionList.innerHTML = '<p style="color: var(--text-light); font-size: 0.9rem;">No sessions yet</p>';
        }
    } catch (error) {
        console.error('Failed to load sessions:', error);
    }
}

async function loadSession(sessionId) {
    try {
        const response = await fetch(`${API_URL}/chat/history/${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
            chatMessages.innerHTML = '';
            
            data.session.chats.forEach(chat => {
                addMessage(chat.question, 'user');
                addMessage(chat.answer, 'bot');
            });
            
            currentSessionId = sessionId;
            loadSessions();
        }
    } catch (error) {
        showStatus('Failed to load session', 'error');
    }
}

async function loadFullHistory() {
    try {
        const response = await fetch(`${API_URL}/chat/history`);
        const data = await response.json();
        
        const historyDiv = document.getElementById('full-history');
        if (data.sessions && data.sessions.length > 0) {
            historyDiv.innerHTML = data.sessions.map(session => `
                <div style="margin: 20px 0; padding: 20px; background: var(--bg); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="font-size: 1.1rem;">${new Date(session.createdAt).toLocaleString()}</h3>
                        <button class="btn" onclick="deleteSession('${session.id}')" 
                                style="padding: 6px 12px; background: var(--danger); color: white; font-size: 0.85rem;">
                            Delete
                        </button>
                    </div>
                    ${session.chats.map(chat => `
                        <div style="margin: 15px 0; padding: 12px; background: white; border-radius: 6px;">
                            <p style="font-weight: 600; margin-bottom: 8px;">Q: ${chat.question}</p>
                            <p style="color: var(--text-light);">A: ${chat.answer}</p>
                            <p style="font-size: 0.8rem; color: var(--text-light); margin-top: 8px;">
                                ${new Date(chat.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    `).join('')}
                </div>
            `).join('');
        } else {
            historyDiv.innerHTML = '<p style="color: var(--text-light);">No chat history available</p>';
        }
    } catch (error) {
        console.error('Failed to load history:', error);
        showStatus('Failed to load history', 'error');
    }
}

async function deleteSession(sessionId) {
    if (!confirm('Delete this session?')) return;
    
    try {
        await fetch(`${API_URL}/chat/history/${sessionId}`, { 
            method: 'DELETE' 
        });
        showStatus('Session deleted', 'success');
        loadFullHistory();
        if (currentSessionId === sessionId) {
            currentSessionId = null;
            loadSessions();
        }
    } catch (error) {
        showStatus('Failed to delete session', 'error');
    }
}

// UI Functions
function showStatus(message, type = 'info') {
    const statusBar = document.getElementById('status-bar');
    const statusMessage = document.getElementById('status-message');
    
    statusMessage.textContent = message;
    statusBar.className = `status-bar ${type}`;
    statusBar.classList.remove('hidden');
    
    setTimeout(() => {
        statusBar.classList.add('hidden');
    }, 3000);
}

function resetApp() {
    if (confirm('Are you sure you want to upload a new video? This will clear the current session.')) {
        selectedFile = null;
        currentSessionId = null;
        chatInput.value = '';
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-content">
                    <p>Hello! I've analyzed your lecture. Ask me anything about the content!</p>
                </div>
            </div>
        `;
        
        fileSelected.classList.add('hidden');
        uploadArea.style.display = 'block';
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Video';
        
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-text').textContent = '0%';
        
        // Reset steps
        ['audio', 'frames', 'transcript', 'ocr', 'combine'].forEach(step => {
            const stepEl = document.getElementById(`step-${step}`);
            if (stepEl) {
                stepEl.classList.remove('completed');
                stepEl.querySelector('span').textContent = '⏳';
            }
        });
        
        document.querySelector('[data-tab="upload"]').click();
    }
}

// Make functions available globally for onclick handlers
window.loadSession = loadSession;
window.deleteSession = deleteSession;