// For now only pdf, txt, docx files can be read by agent

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
// let the theme of the page be light
let currentTheme = 'light';


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

// ── Utility: close all dropdowns/sidebars ─────────────────────────────────
function closeAll() {
  document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());
 
  const settingsSidebar = document.getElementById('settingsSidebar');
  const shareSidebar    = document.getElementById('shareSidebar');
  const overlay         = document.getElementById('rishiOverlay');
 
  if (settingsSidebar) settingsSidebar.style.transform = 'translateX(100%)';
  if (shareSidebar)    shareSidebar.style.transform    = 'translateX(100%)';
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
  }
}
 
// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.rishi-dropdown') && !e.target.closest('.header_buttons')) {
    document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());
  }
});
 
// ── Inject shared overlay (once) ──────────────────────────────────────────
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
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });
}
 
// ── 1. GoHomepage ─────────────────────────────────────────────────────────
function GoHomepage() {
  if (confirm('Go to the homepage? Unsaved changes will be lost.')) {
    window.location.href = '/';
  }
}
 
// ── 3. Share — invite by email (slide-in sidebar) ─────────────────────────
function shareConversation() {
  ensureOverlay();
  closeAll();
 
  let sidebar = document.getElementById('shareSidebar');
  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'shareSidebar';
    sidebar.style.cssText = `
      position:fixed; top:0; right:0; width:320px; height:100%;
      background:#fff; box-shadow:-4px 0 20px rgba(0,0,0,0.12);
      z-index:1000; transform:translateX(100%);
      transition:transform 0.3s ease; padding:28px 24px;
      font-family:inherit; box-sizing:border-box; overflow-y:auto;
    `;
    sidebar.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;font-size:18px;font-weight:600;">Share conversation</h2>
        <button onclick="closeAll()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666;">&times;</button>
      </div>
      <p style="font-size:13px;color:#666;margin-bottom:16px;">
        Invite others to view or edit this conversation.
      </p>
      <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">Email address</label>
      <input id="shareEmailInput" type="email" placeholder="name@example.com"
        style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;
               font-size:14px;box-sizing:border-box;margin-bottom:10px;outline:none;">
      <select id="shareRoleSelect"
        style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;
               font-size:14px;box-sizing:border-box;margin-bottom:14px;background:#fff;">
        <option value="viewer">Can view</option>
        <option value="editor">Can edit</option>
      </select>
      <button onclick="sendShareInvite()"
        style="width:100%;padding:11px;background:#1a73e8;color:#fff;border:none;
               border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;">
        Send invite
      </button>
      <div id="shareInvitedList" style="margin-top:20px;"></div>
    `;
    document.body.appendChild(sidebar);
  }
 
  sidebar.style.transform = 'translateX(0)';
  showOverlay();
}
 
function sendShareInvite() {
  const emailInput = document.getElementById('shareEmailInput');
  const roleSelect = document.getElementById('shareRoleSelect');
  const list       = document.getElementById('shareInvitedList');
  const email      = emailInput.value.trim();
 
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailInput.style.borderColor = '#e53935';
    emailInput.focus();
    return;
  }
  emailInput.style.borderColor = '#ddd';
 
  const item = document.createElement('div');
  item.style.cssText = `
    display:flex;justify-content:space-between;align-items:center;
    padding:9px 12px;background:#f5f5f5;border-radius:8px;
    margin-bottom:8px;font-size:13px;
  `;
  item.innerHTML = `
    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px;">${email}</span>
    <span style="font-size:11px;color:#888;text-transform:capitalize;">${roleSelect.value}</span>
  `;
  list.appendChild(item);
  emailInput.value = '';
  // TODO: wire up to your backend to actually send the invite
}
 
// ── 4. Settings — slide-in sidebar ────────────────────────────────────────
function openSettings() {
  ensureOverlay();
  closeAll();

  const btn  = [...document.querySelectorAll('.header_buttons')]
                 .find(b => b.textContent.trim() === 'Settings');
  const rect = btn.getBoundingClientRect();

  const menu = document.createElement('div');
  menu.className = 'rishi-dropdown';
  menu.style.cssText = `
    position:fixed; top:${rect.bottom + 6}px; left:${rect.left}px;
    background:#fff; border:1px solid #e0e0e0; border-radius:10px;
    box-shadow:0 4px 20px rgba(0,0,0,0.12); z-index:1001;
    min-width:280px; padding:16px; font-family:inherit;
    box-sizing:border-box;
  `;

  menu.innerHTML = `
    <div style="margin-bottom:14px;">
      <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">Display name</label>
      <input type="text" placeholder="Your name"
        style="width:100%;padding:9px 11px;border:1px solid #ddd;border-radius:8px;
               font-size:14px;box-sizing:border-box;outline:none;">
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">Theme</label>
      <select onchange="applyTheme(this.value)"
        style="width:100%;padding:9px 11px;border:1px solid #ddd;border-radius:8px;
               font-size:14px;box-sizing:border-box;background:#fff;">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
    <div style="margin-bottom:14px;">
      <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">AI response style</label>
      <select style="width:100%;padding:9px 11px;border:1px solid #ddd;border-radius:8px;
                     font-size:14px;box-sizing:border-box;background:#fff;">
        <option>Concise</option>
        <option selected>Balanced</option>
        <option>Detailed</option>
      </select>
    </div>
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;font-weight:500;">Auto-save conversations</span>
      <label style="position:relative;display:inline-block;width:42px;height:24px;cursor:pointer;">
        <input type="checkbox" checked id="autoSaveToggle" style="opacity:0;width:0;height:0;position:absolute;">
        <span onclick="var cb=document.getElementById('autoSaveToggle');cb.checked=!cb.checked;this.style.background=cb.checked?'#1a73e8':'#ccc';"
          style="position:absolute;inset:0;border-radius:24px;background:#1a73e8;transition:background 0.2s;cursor:pointer;">
          <span style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;left:3px;pointer-events:none;"></span>
        </span>
      </label>
    </div>
    <button onclick="document.querySelectorAll('.rishi-dropdown').forEach(el=>el.remove())"
      style="width:100%;padding:10px;background:#1a73e8;color:#fff;border:none;
             border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;">
      Save settings
    </button>
  `;

  document.body.appendChild(menu);
}
 
function applyTheme(theme) {
  document.body.style.filter = '';
  if (theme === 'dark') {
    document.body.style.background = '#1a1a1a';
    document.body.style.color = '#e0e0e0';
    document.querySelectorAll('.background, .background0, #chatBox, #outputBox, #fileBox, .three_sections, .three_sections1').forEach(el => {
      el.style.background = '#2b2b2b';
      el.style.color = '#e0e0e0';
      el.style.borderColor = '#444';
    });
    document.querySelectorAll('header').forEach(el => {
      el.style.background = '#1f1f1f';
      el.style.borderColor = '#333';
    });
    document.querySelectorAll('input:not(.rishi-dropdown *), textarea:not(.rishi-dropdown *), select:not(.rishi-dropdown *)').forEach(el => {
      el.style.background = '#333';
      el.style.color = '#e0e0e0';
      el.style.borderColor = '#555';
    });
    document.querySelectorAll('.header_buttons').forEach(el => {
      el.style.background = '#2b2b2b';
      el.style.color = '#e0e0e0';
      el.style.borderColor = '#555';
    });
    document.querySelectorAll('.input-container').forEach(el => {
      el.style.background = '#2b2b2b';
      el.style.boxShadow = 'none';
      el.style.border = '1px solid #555';
    });
    document.querySelectorAll('.new-conversation-btn').forEach(el => {
      el.style.background = '#fff';
      el.style.color = '#111';
      el.style.borderColor = '#fff';
    });
    document.querySelectorAll('h3').forEach(el => el.style.color = '#e0e0e0');
    const menu = document.querySelector('.rishi-dropdown');
    if (menu) {
      menu.style.background = '#2b2b2b';
      menu.style.color = '#e0e0e0';
      menu.style.borderColor = '#555';
      menu.querySelectorAll('input, select').forEach(el => {
        el.style.background = '#333';
        el.style.color = '#e0e0e0';
        el.style.borderColor = '#555';
      });
      menu.querySelectorAll('label, span').forEach(el => el.style.color = '#e0e0e0');
    }
  } else {
    document.body.style.background = '';
    document.body.style.color = '';
    document.querySelectorAll('.background, .background0, #chatBox, #outputBox, #fileBox, .three_sections, .three_sections1, header, input:not(.rishi-dropdown *), textarea:not(.rishi-dropdown *), select:not(.rishi-dropdown *), .header_buttons, h3').forEach(el => {
      el.style.background = '';
      el.style.color = '';
      el.style.borderColor = '';
    });
    document.querySelectorAll('.input-container').forEach(el => {
      el.style.background = 'white';
      el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
      el.style.border = '';
    });
    const menu = document.querySelector('.rishi-dropdown');
    if (menu) {
      menu.style.background = '#fff';
      menu.style.color = '#222';
      menu.style.borderColor = '#e0e0e0';
      menu.querySelectorAll('input, select').forEach(el => {
        el.style.background = '#fff';
        el.style.color = '#222';
        el.style.borderColor = '#ddd';
      });
      menu.querySelectorAll('label, span').forEach(el => el.style.color = '#222');
    }
    const sidebar = document.getElementById('settingsSidebar');
    if (sidebar) {
      sidebar.style.background = '#fff';
      sidebar.style.color = '';
      sidebar.querySelectorAll('input, select, label, span, p').forEach(el => {
        el.style.background = '';
        el.style.color = '';
        el.style.borderColor = '';
      });
    }
    document.querySelectorAll('.new-conversation-btn').forEach(el => {
        el.style.background = '#111';
        el.style.color = '#fff';
        el.style.borderColor = '#111';
    });
  }
}

 
// ── 5. Account — dropdown menu ─────────────────────────────────────────────
function openAccount() {
  document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());
 
  const btn  = [...document.querySelectorAll('.header_buttons')]
                 .find(b => b.textContent.trim() === 'Account');
  const rect = btn.getBoundingClientRect();
 
  const menu = document.createElement('div');
  menu.className = 'rishi-dropdown';
  menu.style.cssText = `
    position:fixed; top:${rect.bottom + 6}px; left:${rect.left}px;
    background:#fff; border:1px solid #e0e0e0; border-radius:10px;
    box-shadow:0 4px 20px rgba(0,0,0,0.12); z-index:1001;
    min-width:200px; padding:6px 0; font-family:inherit;
  `;
 
  const items = [
    { icon: '👤', label: 'Profile',           action: () => feature_not_ready() },
    { icon: '🔒', label: 'Change password',   action: () => feature_not_ready() },
    { icon: '💳', label: 'Billing',           action: () => feature_not_ready() },
    { icon: '🔔', label: 'Notifications',     action: () => feature_not_ready() },
    { divider: true },
    { icon: '🚪', label: 'Log out', danger: true,
      action: () => { if (confirm('Log out?')) window.location.href = '/logout'; } },
  ];
 
  items.forEach(item => {
    if (item.divider) {
      const hr = document.createElement('div');
      hr.style.cssText = 'border-top:1px solid #f0f0f0;margin:4px 0;';
      menu.appendChild(hr);
      return;
    }
    const el = document.createElement('div');
    el.style.cssText = `
      padding:10px 16px; cursor:pointer; display:flex; align-items:center;
      gap:10px; font-size:14px; color:${item.danger ? '#e53935' : '#222'};
      transition:background 0.15s;
    `;
    el.innerHTML = `<span style="font-size:15px;">${item.icon}</span>${item.label}`;
    el.onmouseenter = () => el.style.background = '#f5f5f5';
    el.onmouseleave = () => el.style.background = 'transparent';
    el.onclick      = () => { menu.remove(); item.action(); };
    menu.appendChild(el);
  });
 
  document.body.appendChild(menu);
}
 
// ── 6. Other Useful Pages — dropdown list ─────────────────────────────────
function openOtherPages() {
  document.querySelectorAll('.rishi-dropdown').forEach(el => el.remove());
 
  const btn  = [...document.querySelectorAll('.header_buttons')]
                 .find(b => b.textContent.trim() === 'Other Useful Pages');
  const rect = btn.getBoundingClientRect();
 
  const menu = document.createElement('div');
  menu.className = 'rishi-dropdown';
  menu.style.cssText = `
    position:fixed; top:${rect.bottom + 6}px; left:${rect.left}px;
    background:#fff; border:1px solid #e0e0e0; border-radius:10px;
    box-shadow:0 4px 20px rgba(0,0,0,0.12); z-index:1001;
    min-width:220px; padding:6px 0; font-family:inherit;
  `;
 
  // ── Edit these to match your actual pages ──────────────────────────────
  const pages = [
    { icon: '📊', label: 'Dashboard',           href: '/dashboard' },
    { icon: '📁', label: 'My Files',            href: '/files' },
    { icon: '🗂️', label: 'Past Conversations',  href: '/history' },
    { icon: '📚', label: 'Knowledge Base',      href: '/knowledge' },
    { icon: '🛠️', label: 'API Playground',      href: '/api' },
    { icon: '❓', label: 'Help & Docs',         href: '/help' },
  ];
 
  pages.forEach(page => {
    const el = document.createElement('a');
    el.href  = page.href;
    el.style.cssText = `
      padding:10px 16px; display:flex; align-items:center;
      gap:10px; font-size:14px; color:#222; text-decoration:none;
      transition:background 0.15s;
    `;
    el.innerHTML    = `<span style="font-size:15px;">${page.icon}</span>${page.label}`;
    el.onmouseenter = () => el.style.background = '#f5f5f5';
    el.onmouseleave = () => el.style.background = 'transparent';
    el.onclick      = () => menu.remove();
    menu.appendChild(el);
  });
 
  document.body.appendChild(menu);
}
 