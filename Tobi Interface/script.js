// ── Header button placeholders ───────────────────────────────
// judged to be not necessary for MVP
function feature_not_ready() {
    alert("This feature is not ready yet. Please check back later!");
}

// ── State ─────────────────────────────────────────────────────
// replace later on when real accounts can log in, real auth system
const username = "current user";
// lists uploaded files in the browser, {name, user}
const files = [];
// full chat history, between user and agent
const conversationHistory = [];
// tracks whether documents are included in AI context
let includeDocuments = true;
// tracks current theme so dropdowns open in the right colours
let currentTheme = 'light';
// persists user settings across dropdown open/close
const settings = {
    displayName: '',
    theme: 'light',
    aiStyle: 'Balanced',
    autoSave: true
};


// ── File upload ───────────────────────────────────────────────
const dropZone  = document.getElementById('dropZone');
const filePicker = document.getElementById('filePicker');

// dragover: fires continuously while a file is dragged over the drop zone
// e.preventDefault() stops the browser from opening the file in a new tab
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.background = '#e8e8e8';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.background = '';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = '';
    addFiles(e.dataTransfer.files);
});

filePicker.addEventListener('change', function () {
    addFiles(this.files);
});

// Skip duplicate file names.
// Sends each new file to server.js /upload to extract its text.
// Then re-renders the file list in the UI.
function addFiles(newFiles) {
    for (const file of newFiles) {
        const isDuplicate = files.some(f => f.name === file.name);
        if (!isDuplicate) {
            files.push({ name: file.name, user: username });
            const formData = new FormData();
            formData.append('file', file);
            fetch('/upload', { method: 'POST', body: formData })
                .catch(err => console.error('Upload failed:', err));
        }
    }
    renderFiles();
}

// Creates file list in the UI using DOM nodes (avoids innerHTML += in loop)
function renderFiles() {
    const query = document.getElementById('search').value.toLowerCase();
    const list  = document.getElementById('fileList');
    list.innerHTML = '';
    files
        .filter(f => f.name.toLowerCase().includes(query))
        .forEach(f => {
            const li = document.createElement('li');
            li.style.cssText = 'padding:4px 0;';
            li.innerHTML = `${f.name} <span style="color:gray;font-size:0.85em;">— ${f.user}</span>`;
            list.appendChild(li);
        });
}

function filterFiles() {
    renderFiles();
}

// Toggle function — called by the button in index.html
// Toggles both the button state and the file box visibility
function toggleDocs() {
    includeDocuments = !includeDocuments;
    const btn = document.getElementById('docToggleBtn');
    const box = document.getElementById('fileBox');
    btn.textContent           = `Documents: ${includeDocuments ? 'ON' : 'OFF'}`;
    btn.style.backgroundColor = includeDocuments ? '#1a73e8' : '#aaa';
    box.style.display         = includeDocuments ? '' : 'none';
}

// ── Chat ──────────────────────────────────────────────────────
// Resets height to auto so textarea can shrink and grow with content
function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// Reads user message, adds it to UI and conversation history, then fetches AI reply
async function ask() {
    const input    = document.getElementById('chatInput');
    const box      = document.getElementById('chatBox');
    const userText = input.value.trim();

    if (!userText) return;

    // Send all docs if ON, else empty array
    const selectedDocs = includeDocuments ? files.map(f => f.name) : [];

    // Sanitise user input to prevent XSS before inserting into innerHTML
    const safe      = userText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const formatted = safe.replace(/\n/g, '<br>');
    box.innerHTML += `<p><b>You:</b> ${formatted}</p>`;
    input.value = '';
    autoGrow(input);
    box.scrollTop = box.scrollHeight;

    // Add user message to conversation history
    conversationHistory.push({ role: 'user', content: userText });

    // Show loading indicator while waiting for agent response
    const loadingId = 'loading-' + Date.now();
    box.innerHTML += `<p id="${loadingId}"><b>AI:</b> Thinking...</p>`;
    box.scrollTop = box.scrollHeight;

    try {
        // Send conversationHistory and selectedDocs to server.js /chat
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory, selectedDocs })
        });

        const data  = await response.json();
        const reply = data.reply;

        // Replace loading indicator with actual response
        document.getElementById(loadingId).innerHTML = `<b>AI:</b> ${reply.replace(/\n/g, '<br>')}`;
        conversationHistory.push({ role: 'assistant', content: reply });

    } catch (err) {
        document.getElementById(loadingId).innerHTML = `<b>AI:</b> Error — could not reach the server.`;
        console.error(err);
    }

    box.scrollTop = box.scrollHeight;
}

// ── Conversation clearing ─────────────────────────────────────
// Resets all state for a new conversation
function createNewConversation() {
    conversationHistory.length = 0;
    files.length = 0;
    includeDocuments = true;

    document.getElementById('conversationName').value = '';
    document.getElementById('chatBox').innerHTML      = '';
    document.getElementById('chatInput').value        = '';
    document.getElementById('fileList').innerHTML     = '';
    document.getElementById('search').value           = '';
    document.getElementById('outputBox').innerHTML    = '';

    const btn = document.getElementById('docToggleBtn');
    btn.textContent           = 'Documents: ON';
    btn.style.backgroundColor = '#1a73e8';
    document.getElementById('fileBox').style.display = '';

    clearNotes();
    fetch('/clear', { method: 'POST' }).catch(err => console.error(err));
}

// ── Output area ───────────────────────────────────────────────
function addOutput() {
    // TODO: implement Email, Mind map, Slide generation
    feature_not_ready();
}

// ── Notes panel ───────────────────────────────────────────────
function addNote() {
    const panel  = document.getElementById('notesPanel');
    const isOpen = panel.style.right === '0px';
    panel.style.right = isOpen ? '-340px' : '0px';
}

function clearNotes() {
    document.getElementById('notesInput').value = '';
}

// ── Utility: close all dropdowns / sidebars ───────────────────
function closeAll() {
    document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());
    const shareModal   = document.getElementById('shareModal');
    const shareSidebar = document.getElementById('shareSidebar');
    const overlay      = document.getElementById('rishiOverlay');
    if (shareModal)    shareModal.remove();
    if (shareSidebar)  shareSidebar.style.transform = 'translateX(100%)';
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 200);
    }
}

// Close dropdowns when clicking outside them
document.addEventListener('click', (e) => {
    if (!e.target.closest('.rishi-dropdown') && !e.target.closest('.header_buttons')) {
        document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());
    }
});

// ── Overlay ───────────────────────────────────────────────────
function ensureOverlay() {
    if (document.getElementById('rishiOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'rishiOverlay';
    overlay.style.cssText = `
        display:none; position:fixed; inset:0; background:rgba(0,0,0,0.35);
        z-index:999; opacity:0; transition:opacity 0.2s;
    `;
    overlay.addEventListener('click', closeAll);
    document.body.appendChild(overlay);
}

function showOverlay() {
    const overlay = document.getElementById('rishiOverlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
}

// ── GoHomepage ────────────────────────────────────────────────
function GoHomepage() {
    if (confirm('Go to the homepage? Unsaved changes will be lost.')) {
        feature_not_ready();
    }
}

function shareConversation() {
    ensureOverlay();
    closeAll();

    const dark = currentTheme === 'dark';
    const bg   = dark ? '#2b2b2b' : '#fff';
    const text = dark ? '#e0e0e0' : '#222';
    const bdr  = dark ? '#555'    : '#ddd';
    const inp  = dark ? '#333'    : '#fff';
    const sub  = dark ? '#aaa'    : '#666';

    // Overlay blocks all interaction behind the modal
    const overlay = document.getElementById('rishiOverlay');
    overlay.style.display = 'block';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.style.cssText = `
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:${bg}; border-radius:16px; z-index:1002;
        width:520px; max-width:95vw; max-height:85vh;
        padding:32px; box-sizing:border-box; overflow-y:auto;
        box-shadow:0 8px 40px rgba(0,0,0,0.18); color:${text};
        font-family:inherit;
    `;

    modal.innerHTML = `
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">↗</span>
                <h2 style="margin:0;font-size:18px;font-weight:600;color:${text};">Share conversation</h2>
            </div>
            <button onclick="closeShareModal()"
                style="background:none;border:none;font-size:22px;cursor:pointer;color:${sub};line-height:1;">&times;</button>
        </div>

        <!-- Add people input -->
        <div style="margin-bottom:24px;">
            <input id="shareEmailInput" type="email" placeholder="Add people and groups"
                style="width:100%;padding:12px 14px;border:2px solid #1a73e8;border-radius:8px;
                       font-size:14px;box-sizing:border-box;outline:none;
                       background:${inp};color:${text};">
        </div>

        <!-- People with access -->
        <div style="margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <span style="font-size:15px;font-weight:600;color:${text};">People with access</span>
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:${sub};cursor:pointer;">
                    <input type="checkbox" id="notifyPeople" checked
                        style="width:16px;height:16px;accent-color:#1a73e8;cursor:pointer;">
                    Notify people
                </label>
            </div>
            <div id="shareInvitedList">
                <!-- Current owner row -->
                <div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
                    <div style="width:40px;height:40px;border-radius:50%;background:#1a73e8;
                                display:flex;align-items:center;justify-content:center;
                                color:#fff;font-weight:600;font-size:15px;flex-shrink:0;">
                        ${username.charAt(0).toUpperCase()}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:14px;font-weight:500;color:${text};">${username}</div>
                        <div style="font-size:12px;color:${sub};">Owner</div>
                    </div>
                </div>
            </div>
        </div>

        <hr style="border:none;border-top:1px solid ${bdr};margin-bottom:24px;">

        <!-- Access level -->
        <div style="margin-bottom:24px;">
            <div style="font-size:15px;font-weight:600;color:${text};margin-bottom:14px;">Conversation access</div>
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:50%;background:${dark ? '#444' : '#f0f0f0'};
                            display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🔒</div>
                <div style="flex:1;">
                    <select id="shareRoleSelect"
                        style="width:100%;padding:8px 10px;border:1px solid ${bdr};border-radius:8px;
                               font-size:14px;background:${inp};color:${text};cursor:pointer;">
                        <option value="restricted">Restricted</option>
                        <option value="viewer">Anyone with link — Can view</option>
                        <option value="editor">Anyone with link — Can edit</option>
                    </select>
                    <div style="font-size:12px;color:${sub};margin-top:4px;">
                        Only people with access can open with the link
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer buttons -->
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <button onclick="copyShareLink()"
                style="display:flex;align-items:center;gap:8px;padding:10px 16px;
                       border:1px solid ${bdr};border-radius:8px;background:${inp};
                       color:${text};font-size:14px;cursor:pointer;">
                🔗 Copy link
            </button>
            <button onclick="sendShareInvite()"
                style="padding:10px 28px;background:#1a73e8;color:#fff;border:none;
                       border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;">
                Save
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.remove();
    closeAll();
}

function copyShareLink() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(() => alert('Could not copy link.'));
}

function sendShareInvite() {
    const emailInput = document.getElementById('shareEmailInput');
    const roleSelect = document.getElementById('shareRoleSelect');
    const list       = document.getElementById('shareInvitedList');
    const email      = emailInput.value.trim();
    const dark       = currentTheme === 'dark';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailInput.style.borderColor = '#e53935';
        emailInput.focus();
        return;
    }
    emailInput.style.borderColor = '#1a73e8';

    const item = document.createElement('div');
    item.style.cssText = `display:flex;align-items:center;gap:12px;padding:8px 0;`;
    item.innerHTML = `
        <div style="width:40px;height:40px;border-radius:50%;background:#e0e0e0;
                    display:flex;align-items:center;justify-content:center;
                    color:#555;font-weight:600;font-size:15px;flex-shrink:0;">
            ${email.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:500;color:${dark ? '#e0e0e0' : '#222'};
                        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${email}</div>
            <div style="font-size:12px;color:${dark ? '#aaa' : '#666'};text-transform:capitalize;">
                ${roleSelect.value === 'restricted' ? 'Can view' : roleSelect.value}
            </div>
        </div>
    `;
    list.appendChild(item);
    emailInput.value = '';
    // TODO: wire up to your backend to actually send the invite
}

function applyThemeToDropdown(theme) {
    const menu = document.querySelector('.rishi-dropdown');
    if (!menu) return;
    const dark = theme === 'dark';
    const bg   = dark ? '#2b2b2b' : '#fff';
    const text = dark ? '#e0e0e0' : '#222';
    const bdr  = dark ? '#555'    : '#e0e0e0';
    const inp  = dark ? '#333'    : '#fff';

    menu.style.background  = bg;
    menu.style.color       = text;
    menu.style.borderColor = bdr;
    menu.querySelectorAll('input, select').forEach(el => {
        el.style.background  = inp;
        el.style.color       = text;
        el.style.borderColor = bdr;
    });
    menu.querySelectorAll('label, span').forEach(el => {
        el.style.color = text;
    });
}

// ── Settings — dropdown ───────────────────────────────────────
// Reads currentTheme so colours are always correct on open
function openSettings() {
    document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());

    const btn  = [...document.querySelectorAll('.header_buttons')]
                    .find(b => b.textContent.trim() === 'Settings');
    const rect = btn.getBoundingClientRect();
    const dark = currentTheme === 'dark';
    const bg   = dark ? '#2b2b2b' : '#fff';
    const text = dark ? '#e0e0e0' : '#222';
    const bdr  = dark ? '#555'    : '#e0e0e0';
    const inp  = dark ? '#333'    : '#fff';

    const menu = document.createElement('div');
    menu.className = 'rishi-dropdown';
    menu.style.cssText = `
        position:fixed; top:${rect.bottom + 6}px; right:${window.innerWidth - rect.right}px;
        background:${bg}; border:1px solid ${bdr}; border-radius:10px;
        box-shadow:0 4px 20px rgba(0,0,0,0.12); z-index:1001;
        min-width:280px; padding:16px; font-family:inherit;
        box-sizing:border-box; color:${text};
    `;

    menu.innerHTML = `
        <div style="margin-bottom:14px;">
            <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;color:${text};">Display name</label>
            <input id="settingNameInput" type="text" placeholder="Your name" value="${settings.displayName}"
                style="width:100%;padding:9px 11px;border:1px solid ${bdr};border-radius:8px;
                       font-size:14px;box-sizing:border-box;outline:none;background:${inp};color:${text};">
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;color:${text};">Theme</label>
            <select id="settingThemeSelect" onchange="applyTheme(this.value); applyThemeToDropdown(this.value);"
                style="width:100%;padding:9px 11px;border:1px solid ${bdr};border-radius:8px;
                      font-size:14px;box-sizing:border-box;background:${inp};color:${text};">
                <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                <option value="dark"  ${settings.theme === 'dark'  ? 'selected' : ''}>Dark</option>
            </select>
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;color:${text};">AI response style</label>
            <select id="settingStyleSelect"
                style="width:100%;padding:9px 11px;border:1px solid ${bdr};border-radius:8px;
                       font-size:14px;box-sizing:border-box;background:${inp};color:${text};">
                <option ${settings.aiStyle === 'Concise'  ? 'selected' : ''}>Concise</option>
                <option ${settings.aiStyle === 'Balanced' ? 'selected' : ''}>Balanced</option>
                <option ${settings.aiStyle === 'Detailed' ? 'selected' : ''}>Detailed</option>
            </select>
        </div>
        <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:500;color:${text};">Auto-save conversations</span>
            <label style="position:relative;display:inline-block;width:42px;height:24px;cursor:pointer;">
                <input type="checkbox" id="settingAutoSave" ${settings.autoSave ? 'checked' : ''}
                    style="opacity:0;width:0;height:0;position:absolute;">
                <span onclick="var cb=document.getElementById('settingAutoSave');cb.checked=!cb.checked;this.style.background=cb.checked?'#1a73e8':'#ccc';"
                    style="position:absolute;inset:0;border-radius:24px;background:${settings.autoSave ? '#1a73e8' : '#ccc'};transition:background 0.2s;cursor:pointer;">
                    <span style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;left:3px;pointer-events:none;"></span>
                </span>
            </label>
        </div>
        <button onclick="saveSettings()"
            style="width:100%;padding:10px;background:#1a73e8;color:#fff;border:none;
                   border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;">
            Save settings
        </button>
    `;

    document.body.appendChild(menu);
}

function saveSettings() {
    settings.displayName = document.getElementById('settingNameInput').value.trim();
    settings.theme       = document.getElementById('settingThemeSelect').value;
    settings.aiStyle     = document.getElementById('settingStyleSelect').value;
    settings.autoSave    = document.getElementById('settingAutoSave').checked;

    applyTheme(settings.theme);
    document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());
}


// ── Account — dropdown ────────────────────────────────────────
// Reads currentTheme so colours are always correct on open
function openAccount() {
    document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());

    const btn  = [...document.querySelectorAll('.header_buttons')]
                    .find(b => b.textContent.trim() === 'Account');
    const rect  = btn.getBoundingClientRect();
    const dark  = currentTheme === 'dark';
    const bg    = dark ? '#2b2b2b' : '#fff';
    const text  = dark ? '#e0e0e0' : '#222';
    const bdr   = dark ? '#444'    : '#e0e0e0';
    const hover = dark ? '#3a3a3a' : '#f5f5f5';

    const menu = document.createElement('div');
    menu.className = 'rishi-dropdown';
    menu.style.cssText = `
        position:fixed; top:${rect.bottom + 6}px; right:${window.innerWidth - rect.right}px;
        background:${bg}; border:1px solid ${bdr}; border-radius:10px;
        box-shadow:0 4px 20px rgba(0,0,0,0.12); z-index:1001;
        min-width:200px; padding:6px 0; font-family:inherit;
    `;

    const items = [
        { icon: '👤', label: 'Profile',         action: () => feature_not_ready() },
        { icon: '🔒', label: 'Change password', action: () => feature_not_ready() },
        { icon: '💳', label: 'Billing',         action: () => feature_not_ready() },
        { icon: '🔔', label: 'Notifications',   action: () => feature_not_ready() },
        { divider: true },
        { icon: '🚪', label: 'Log out', danger: true,
          action: () => { if (confirm('Log out?')) window.location.href = '/logout'; } },
    ];

    items.forEach(item => {
        if (item.divider) {
            const hr = document.createElement('div');
            hr.style.cssText = `border-top:1px solid ${bdr};margin:4px 0;`;
            menu.appendChild(hr);
            return;
        }
        const el = document.createElement('div');
        el.style.cssText = `
            padding:10px 16px; cursor:pointer; display:flex; align-items:center;
            gap:10px; font-size:14px; color:${item.danger ? '#e53935' : text};
            transition:background 0.15s;
        `;
        el.innerHTML    = `<span style="font-size:15px;">${item.icon}</span>${item.label}`;
        el.onmouseenter = () => el.style.background = hover;
        el.onmouseleave = () => el.style.background = 'transparent';
        el.onclick      = () => { menu.remove(); item.action(); };
        menu.appendChild(el);
    });

    document.body.appendChild(menu);
}

// ── Other Useful Pages — dropdown ─────────────────────────────
// Reads currentTheme so colours are always correct on open
function openOtherPages() {
    document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());

    const btn  = [...document.querySelectorAll('.header_buttons')]
                    .find(b => b.textContent.trim() === 'Others');
    const rect  = btn.getBoundingClientRect();
    const dark  = currentTheme === 'dark';
    const bg    = dark ? '#2b2b2b' : '#fff';
    const text  = dark ? '#e0e0e0' : '#222';
    const bdr   = dark ? '#444'    : '#e0e0e0';
    const hover = dark ? '#3a3a3a' : '#f5f5f5';

    const menu = document.createElement('div');
    menu.className = 'rishi-dropdown';
    menu.style.cssText = `
        position:fixed; top:${rect.bottom + 6}px; left:${rect.left}px;
        background:${bg}; border:1px solid ${bdr}; border-radius:10px;
        box-shadow:0 4px 20px rgba(0,0,0,0.12); z-index:1001;
        min-width:220px; padding:6px 0; font-family:inherit;
    `;

    // ── Edit these to match your actual pages ──────────────────
    const pages = [
        { icon: '📊', label: 'Dashboard',          href: '/dashboard' },
        { icon: '📁', label: 'My Files',           href: '/files' },
        { icon: '🗂️', label: 'Past Conversations', href: '/history' },
        { icon: '📚', label: 'Knowledge Base',     href: '/knowledge' },
        { icon: '🛠️', label: 'API Playground',     href: '/api' },
        { icon: '❓', label: 'Help & Docs',        href: '/help' },
    ];

    pages.forEach(page => {
        const el = document.createElement('a');
        el.href  = page.href;
        el.style.cssText = `
            padding:10px 16px; display:flex; align-items:center;
            gap:10px; font-size:14px; color:${text}; text-decoration:none;
            transition:background 0.15s;
        `;
        el.innerHTML    = `<span style="font-size:15px;">${page.icon}</span>${page.label}`;
        el.onmouseenter = () => el.style.background = hover;
        el.onmouseleave = () => el.style.background = 'transparent';
        el.onclick      = () => menu.remove();
        menu.appendChild(el);
    });

    document.body.appendChild(menu);
}

// ── Theme ─────────────────────────────────────────────────────
// currentTheme is updated first so all dropdowns opened after
// this call immediately get the right colours
function applyTheme(theme) {
    currentTheme = theme;
    const dark = theme === 'dark';

    document.body.style.background = dark ? '#1a1a1a' : '';
    document.body.style.color      = dark ? '#e0e0e0' : '';

    document.querySelectorAll('.background, .background0, #chatBox, #outputBox, #fileBox, .three_sections, .three_sections1').forEach(el => {
        el.style.background  = dark ? '#2b2b2b' : '';
        el.style.color       = dark ? '#e0e0e0' : '';
        el.style.borderColor = dark ? '#444'    : '';
    });

    document.querySelectorAll('header').forEach(el => {
        el.style.background  = dark ? '#1f1f1f' : '';
        el.style.borderColor = dark ? '#333'    : '';
    });

    // Exclude dropdown internals — they theme themselves on open
    document.querySelectorAll('input:not(.rishi-dropdown *), textarea:not(.rishi-dropdown *), select:not(.rishi-dropdown *)').forEach(el => {
        el.style.background  = dark ? '#333'    : '';
        el.style.color       = dark ? '#e0e0e0' : '';
        el.style.borderColor = dark ? '#555'    : '';
    });

    document.querySelectorAll('.header_buttons').forEach(el => {
        el.style.background  = dark ? '#2b2b2b' : '';
        el.style.color       = dark ? '#e0e0e0' : '';
        el.style.borderColor = dark ? '#555'    : '';
    });

    document.querySelectorAll('.input-container').forEach(el => {
        el.style.background = dark ? '#2b2b2b' : 'white';
        el.style.boxShadow  = dark ? 'none'    : '0 2px 5px rgba(0,0,0,0.05)';
        el.style.border     = dark ? '1px solid #555' : '';
    });

    document.querySelectorAll('h3').forEach(el => {
        el.style.color = dark ? '#e0e0e0' : '';
    });

    // New conversation button always stands out from the rest
    document.querySelectorAll('.new-conversation-btn').forEach(el => {
        el.style.background  = dark ? '#fff' : '#111';
        el.style.color       = dark ? '#111' : '#fff';
        el.style.borderColor = dark ? '#fff' : '#111';
    });

    // Re-theme share sidebar if it has already been created
    const shareSidebar = document.getElementById('shareSidebar');
    if (shareSidebar) {
        shareSidebar.style.background = dark ? '#2b2b2b' : '#fff';
        shareSidebar.style.color      = dark ? '#e0e0e0' : '';
        shareSidebar.querySelectorAll('input, select').forEach(el => {
            el.style.background  = dark ? '#333' : '';
            el.style.color       = dark ? '#e0e0e0' : '';
            el.style.borderColor = dark ? '#555'    : '';
        });
        shareSidebar.querySelectorAll('h2, label, p').forEach(el => {
            el.style.color = dark ? '#e0e0e0' : '';
        });
    }
}
