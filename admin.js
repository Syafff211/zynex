// ============ CLIENT-SIDE ADMIN AUTHENTICATION ============
// Default password: zynex123 (Change this in the code if needed)
const ADMIN_PASSWORD = "zynex123"; 

const adminContent = document.getElementById('adminContent');
const deniedContent = document.getElementById('deniedContent');

// Check if already authenticated in this session
const isAuthenticated = sessionStorage.getItem('zynex_auth');

if (isAuthenticated === 'true') {
    showAdmin();
} else {
    const pass = prompt("Enter Admin Password:");
    if (pass === ADMIN_PASSWORD) {
        sessionStorage.setItem('zynex_auth', 'true');
        showAdmin();
    } else if (pass !== null) { // If they entered wrong password (not cancelled)
        deniedContent.style.display = 'flex';
    } else { // If they clicked cancel
        deniedContent.style.display = 'flex';
    }
}

function showAdmin() {
    adminContent.style.display = 'block';
    renderMessages();
}

// ============ RENDER MESSAGES ============
function renderMessages() {
    const messages = JSON.parse(localStorage.getItem('zynex_messages')) || [];
    const messageList = document.getElementById('messageList');
    const emptyState = document.getElementById('emptyState');

    if (messages.length === 0) {
        emptyState.classList.remove('hidden');
        messageList.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    
    // Sort by newest first
    messages.sort((a, b) => b.id - a.id);

    messageList.innerHTML = messages.map(msg => `
        <div class="message-card relative group">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                    <h3 class="font-semibold text-lg dark-text">${escapeHtml(msg.name)}</h3>
                    <p class="text-sm text-cyan-400 font-medium">${escapeHtml(msg.type)}</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-xs text-neutral-500 dark-subtext">${msg.date}</span>
                    <button onclick="deleteMessage(${msg.id})" class="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-red-400 p-1" title="Delete Message">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
            <div class="border-t border-white/5 pt-4 dark-subtext">
                <p class="text-neutral-300 whitespace-pre-wrap">${escapeHtml(msg.message)}</p>
            </div>
        </div>
    `).join('');
}

// ============ DELETE MESSAGES ============
function deleteMessage(id) {
    if (confirm('Are you sure you want to delete this message?')) {
        let messages = JSON.parse(localStorage.getItem('zynex_messages')) || [];
        messages = messages.filter(msg => msg.id !== id);
        localStorage.setItem('zynex_messages', JSON.stringify(messages));
        renderMessages();
    }
}

function clearAllMessages() {
    if (confirm('Are you sure you want to delete ALL messages? This cannot be undone.')) {
        localStorage.removeItem('zynex_messages');
        renderMessages();
    }
}

// ============ PREVENT XSS ============
function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}