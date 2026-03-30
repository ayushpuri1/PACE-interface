// For now only pdf, txt, docx files can be read by agent

// ── Header button placeholders ───────────────────────────────
// judged to be not necessary for MVP
function feature_not_ready() {
    alert("This feature is not ready yet. Please check back later!");
}

function shareConversation() { feature_not_ready(); }
function openSettings() { feature_not_ready(); }
function openAccount() { feature_not_ready(); }
function openOtherPages() { feature_not_ready(); }

// ── State ─────────────────────────────────────────────────────
// replace later on when real accounts can log in, real auth system
const username = "current user";
// lists uploaded files in the browser, {name, user}
const files = [];
// full chat history, between user and agent
const conversationHistory = [];

// tracks whether documents are included in AI context
let includeDocuments = true;

// ── File upload ──────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const filePicker = document.getElementById('filePicker');

// dragover: fires continuously while a file is dragged over the drop zone
// e.preventDefault(); stops the browser from opening the folder in new tab
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.background = '#f0f0f0';        // visual
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.background = '';                 // visual
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = '';
    // dropped files
    addFiles(e.dataTransfer.files);
});

filePicker.addEventListener('change', function () {
    addFiles(this.files);
});

// skip the file name if it was uploaded before
// sends each new file to server.js and to /uploads folder to extract its text and stored in uploadedDocs
// then render file list in UI
function addFiles(newFiles) {
    for (const file of newFiles) {
        const isDuplicate = files.some(f => f.name === file.name);
        if (!isDuplicate) {
            files.push({ name: file.name, user: username });

            // Send file to server for text extraction
            const formData = new FormData();
            formData.append('file', file);
            // append each file to /upload folder
            fetch('/upload', { method: 'POST', body: formData })
                .catch(err => console.error('Upload failed:', err));
        }
    }
    renderFiles();
}

// Toggle function — called by the button in index.html
function toggleDocs() {
    includeDocuments = !includeDocuments;
    const btn = document.getElementById('docToggleBtn');
    btn.textContent = `Documents: ${includeDocuments ? 'ON' : 'OFF'}`;
    btn.style.backgroundColor = includeDocuments ? '#1a73e8' : '#aaa';
}

// creates file list in the UI
// Updated renderFiles() — remove the checkbox, just show the filename and user
function renderFiles() {
    const query = document.getElementById('search').value.toLowerCase();
    const list = document.getElementById('fileList');
    list.innerHTML = '';
    files
        .filter(f => f.name.toLowerCase().includes(query))
        .forEach(f => {
            list.innerHTML += `
                <li style="padding:4px 0;">
                    ${f.name} <span style="color:gray; font-size:0.85em;">— ${f.user}</span>
                </li>`;
        });
}

function filterFiles() {
    renderFiles();
}

// ── Chat ─────────────────────────────────────────────────────
// resets height to auto, so it can shrink and grow to fit the content 
function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// read user message and add it to UI, and conversation history
// display AI reply later
async function ask() {
    const input = document.getElementById('chatInput');
    const box = document.getElementById('chatBox');
    const userText = input.value.trim();

    // return if input is empty
    if (!userText) return;

    // Send all if ON, else empty
    const selectedDocs = includeDocuments ? files.map(f => f.name) : [];

    // display user message in chatbox
    // replace \n with <br>, to do line break with shift+enter
    const formatted = userText.replace(/\n/g, '<br>');
    box.innerHTML += `<p><b>You:</b> ${formatted}</p>`;
    input.value = '';
    autoGrow(input);
    box.scrollTop = box.scrollHeight;       // scroll to bottom

    // add user message to conversation history
    conversationHistory.push({ role: 'user', content: userText });

    // show loading while waiting for agent response
    const loadingId = 'loading-' + Date.now();
    box.innerHTML += `<p id="${loadingId}"><b>AI:</b> Thinking...</p>`;
    box.scrollTop = box.scrollHeight;

    try {
        // sends conversationHistory, selectedDocs to server.js /chat
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory, selectedDocs })
        });

        const data = await response.json();
        const reply = data.reply;

        // replace loading indicator with actual response
        document.getElementById(loadingId).innerHTML = `<b>AI:</b> ${reply.replace(/\n/g, '<br>')}`;
        // add agent reply to conversationHistory
        conversationHistory.push({ role: 'assistant', content: reply });

    } catch (err) {
        document.getElementById(loadingId).innerHTML = `<b>AI:</b> Error — could not reach the server.`;
    }

    box.scrollTop = box.scrollHeight;
}

// ── Conversation clearing ───────────────────────────────────
// resets all states for new conversation
function createNewConversation() {
    includeDocuments = true;
    const btn = document.getElementById('docToggleBtn');
    btn.textContent = 'Documents: ON';
    btn.style.backgroundColor = '#1a73e8';
    
    conversationHistory.length = 0;
    document.getElementById('conversationName').value = '';
    document.getElementById('chatBox').innerHTML = '';
    document.getElementById('chatInput').value = '';
    files.length = 0;
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('search').value = '';
    document.getElementById('outputBox').innerHTML = '';
    clearNotes();
    fetch('/clear', { method: 'POST' }); // clear docs on server too
}

// ── Output area ───────────────────────────────────────────────
function addOutput() {
    const box = document.getElementById('outputBox');
    box.innerHTML += `<p>Loading...</p>`;
}

// ── Notes panel ───────────────────────────────────────────────
function addNote() {
    const panel = document.getElementById('notesPanel');
    const isOpen = panel.style.right === '0px';
    panel.style.right = isOpen ? '-340px' : '0px';
}

function clearNotes() {
    document.getElementById('notesInput').value = '';
}