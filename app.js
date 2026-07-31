/**
 * Release Notes Generator & Automation Application Logic
 * Implements Pattern 1: Async Quick Add + Lead Review Dashboard + Live HTML Engine
 * Realtime Sync: Firebase Realtime Database (with LocalStorage Fallback)
 */

// User's Firebase Configuration (Pre-configured)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyCd_QlfIqTpEnvx6jcdtriHFXceJCbpRLs",
  authDomain: "releaseguideline.firebaseapp.com",
  databaseURL: "https://releaseguideline-default-rtdb.firebaseio.com",
  projectId: "releaseguideline",
  storageBucket: "releaseguideline.firebasestorage.app",
  messagingSenderId: "562524973465",
  appId: "1:562524973465:web:caf9c28afce073eabdcb08",
  measurementId: "G-2HYTWZRY84"
};

// Initial State with exact sample data from Release_Note_V2.html
const defaultState = {
  releaseMeta: {
    title: "Release Notes",
    subtitle: "We have updated our system, which includes the following changes",
    releaseDate: "07-30-2026"
  },
  items: [
    {
      id: "item-1",
      category: "features",
      module: "Claims List",
      text: "",
      subBullets: [
        "Claims List & Import Enhancements: Added new columns (Insurance Type, Plan Type, Sequence, Priority, and Last Work By) across the Add Claim, Import RAR/RA, and main grid views, with default sorting now set by Sequence.",
        "Priority Filter: Added a new Priority Filter in the Advanced filters for quicker filtering.",
        "Import Reassignment Claim: Added a new \"Import Reassignment Claim\" button. This functionality allows users to reassign claims based on RAR ID and Account ID, as well as update sequence and priority from the same sheet."
      ],
      author: "Hitarth"
    },
    {
      id: "item-2",
      category: "improvements",
      module: "Authorization Tracking",
      text: "Added functionality to quickly find pending authorizations based on how soon the service date is. Use 2D for the most urgent (0–2 days away), 4D for 3–4 days, 7D for 5–7 days, or 7D+ for anything further out. Click any button to filter the list instantly.",
      subBullets: [],
      author: "Alex"
    },
    {
      id: "item-3",
      category: "improvements",
      module: "Account Offboarding",
      text: "Added the functionality to add new churn reasons in the dropdown.",
      subBullets: [],
      author: "Alex"
    },
    {
      id: "item-4",
      category: "improvements",
      module: "Service Delivery KPIs (Employee)",
      text: "Added functionality to display the \"Files\" button on the BRM Metric MOM Details page.",
      subBullets: [],
      author: "Sam"
    },
    {
      id: "item-5",
      category: "improvements",
      module: "Service Delivery KPIs (Client)",
      text: "Added functionality to display the \"Files\" button on the AHS Metric MOM Details page.",
      subBullets: [],
      author: "Sam"
    },
    {
      id: "item-6",
      category: "improvements",
      module: "Account Management KPIs",
      text: "Added functionality to display the \"Files\" button on the AHS Metric MOM Details page.",
      subBullets: [],
      author: "Sam"
    },
    {
      id: "item-7",
      category: "improvements",
      module: "Ask AI features Enhancement (Claim List)",
      text: "",
      subBullets: [
        "Only users with access can use this functionality.",
        "Removed the mandatory requirement for the Appeal Letter field, allowing users to proceed without entering appeal letter content.",
        "Increased the Additional Options text area size to improve visibility and provide a better editing experience.",
        "Added support for file attachments during the appeal letter generation process.",
        "Introduced a Review AI Instructions modal, allowing users to review the AI prompt before generating the appeal letter.",
        "Added the User System Prompt to the Review AI Instructions modal."
      ],
      author: "Taylor"
    },
    {
      id: "item-8",
      category: "improvements",
      module: "Quality Forms",
      text: "",
      subBullets: [
        "File Upload Validation: Added a validation message requiring a file upload if Total Error > 0.",
        "Zero-Error Logic: Updated rules to allow Total Error = 0. When total error is 0, description and error type are no longer required.",
        "Audit Date Restriction: Restricted date selection to prevent selecting future dates in the Audit Date column during add/update.",
        "Resolved file attachment-related issues."
      ],
      author: "Jordan"
    },
    {
      id: "item-9",
      category: "improvements",
      module: "Insurance master",
      text: "Upgraded under-the-hood logic to enhance overall stability and reliability.",
      subBullets: [],
      author: "Morgan"
    },
    {
      id: "item-10",
      category: "fixes",
      module: "MFA",
      text: "Updated the day calculation logic to correctly display a maximum of 30 days.",
      subBullets: [],
      author: "Dev Team"
    }
  ]
};

// Global Firebase Instance & DB Reference
let firebaseApp = null;
let dbRef = null;
let isConnectedToFirebase = false;

// Current Active Application State
let appState = loadLocalState();

// Initialize App on DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  initEventListeners();
  renderApp(false);
});

// Load state from local storage fallback
function loadLocalState() {
  const saved = localStorage.getItem("release_notes_app_state");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved state:", e);
    }
  }
  return JSON.parse(JSON.stringify(defaultState));
}

// Save state (Pushes to Firebase if connected, and saves locally)
function saveState(pushToCloud = true) {
  localStorage.setItem("release_notes_app_state", JSON.stringify(appState));
  
  if (pushToCloud && isConnectedToFirebase && dbRef) {
    dbRef.set(appState).catch(err => {
      console.error("Firebase write error:", err);
      showToast("Firebase Sync Error: " + err.message, "error");
    });
  }

  renderApp(false);
}

// Initialize Firebase Realtime Database
function initFirebase() {
  const savedConfig = localStorage.getItem("firebase_config_credentials");
  let fbConfig = defaultFirebaseConfig;

  if (savedConfig) {
    try {
      fbConfig = JSON.parse(savedConfig);
    } catch (e) {
      console.error("Invalid saved firebase config, falling back to default:", e);
    }
  }

  // Pre-fill inputs in modal
  if (fbConfig && document.getElementById("fbApiKey")) {
    document.getElementById("fbApiKey").value = fbConfig.apiKey || "";
    document.getElementById("fbDbUrl").value = fbConfig.databaseURL || "";
    document.getElementById("fbProjectId").value = fbConfig.projectId || "";
  }

  if (window.firebase && fbConfig && fbConfig.databaseURL) {
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(fbConfig);
      } else {
        firebaseApp = firebase.app();
      }
      
      dbRef = firebase.database().ref("release_notes/active_draft");

      // Set up Realtime Sync Listener
      dbRef.on("value", (snapshot) => {
        const cloudData = snapshot.val();
        if (cloudData) {
          appState = cloudData;
          localStorage.setItem("release_notes_app_state", JSON.stringify(appState));
          renderApp(false);
        } else {
          // Push initial sample data to cloud database on first setup
          dbRef.set(appState);
        }
      });

      isConnectedToFirebase = true;
      updateSyncStatusUI(true);
      console.log("🔥 Connected to Firebase Realtime Database (releaseguideline)!");
    } catch (err) {
      console.error("Firebase init error:", err);
      isConnectedToFirebase = false;
      updateSyncStatusUI(false);
    }
  } else {
    isConnectedToFirebase = false;
    updateSyncStatusUI(false);
  }
}

// Update Sync Badge UI
function updateSyncStatusUI(online) {
  const badge = document.getElementById("syncStatusBadge");
  const text = document.getElementById("syncStatusText");
  if (!badge || !text) return;

  if (online) {
    badge.className = "status-badge badge-online";
    text.textContent = "🔥 Realtime Synced";
  } else {
    badge.className = "status-badge badge-offline";
    text.textContent = "Local Mode";
  }
}

// Event Listeners Initialization
function initEventListeners() {
  // Tab Switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      
      const tabId = btn.getAttribute("data-tab");
      btn.classList.add("active");
      document.getElementById(tabId).classList.add("active");
    });
  });

  // View Mode Switching
  document.querySelectorAll(".view-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const mode = btn.getAttribute("data-mode");
      const frame = document.getElementById("emailFrameContainer");
      const code = document.getElementById("codeContainer");
      
      if (mode === "email") {
        frame.style.display = "block";
        code.style.display = "none";
      } else {
        frame.style.display = "none";
        code.style.display = "block";
      }
    });
  });

  // Quick Add Form Submit
  const quickAddForm = document.getElementById("quickAddForm");
  if (quickAddForm) {
    quickAddForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const category = document.getElementById("addCategory").value;
      const moduleName = document.getElementById("addModule").value.trim();
      const text = document.getElementById("addText").value.trim();
      const rawSubBullets = document.getElementById("addSubBullets").value.trim();
      const author = document.getElementById("addAuthor").value.trim() || "Developer";

      if (!moduleName) {
        showToast("Please specify a module or title", "error");
        return;
      }

      const subBullets = rawSubBullets
        ? rawSubBullets.split("\n").map(s => s.trim()).filter(Boolean)
        : [];

      const newItem = {
        id: "item-" + Date.now(),
        category,
        module: moduleName,
        text,
        subBullets,
        author
      };

      if (!appState.items) appState.items = [];
      appState.items.push(newItem);
      saveState(true);
      
      // Reset form
      document.getElementById("addModule").value = "";
      document.getElementById("addText").value = "";
      document.getElementById("addSubBullets").value = "";
      
      showToast(`Added note under ${category.toUpperCase()}!`, "success");
    });
  }

  // Header Metadata Inputs
  document.getElementById("metaTitle")?.addEventListener("change", (e) => {
    appState.releaseMeta.title = e.target.value;
    saveState(true);
  });
  document.getElementById("metaSubtitle")?.addEventListener("change", (e) => {
    appState.releaseMeta.subtitle = e.target.value;
    saveState(true);
  });
  document.getElementById("metaDate")?.addEventListener("change", (e) => {
    appState.releaseMeta.releaseDate = e.target.value;
    saveState(true);
  });

  // Top Bar Action Buttons
  document.getElementById("btnCopyHtml")?.addEventListener("click", copyHtmlToClipboard);
  document.getElementById("btnDownloadHtml")?.addEventListener("click", downloadHtmlFile);
  document.getElementById("btnResetData")?.addEventListener("click", resetToSampleData);
  document.getElementById("btnAiPolish")?.addEventListener("click", runAiPolish);

  // Firebase Config Modal Open / Close
  const modal = document.getElementById("firebaseModal");
  document.getElementById("btnOpenFirebaseModal")?.addEventListener("click", () => {
    modal.classList.add("active");
  });
  document.getElementById("btnCloseFirebaseModal")?.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  // Save Firebase Config
  document.getElementById("btnSaveFirebaseConfig")?.addEventListener("click", () => {
    const apiKey = document.getElementById("fbApiKey").value.trim();
    const databaseURL = document.getElementById("fbDbUrl").value.trim();
    const projectId = document.getElementById("fbProjectId").value.trim();

    if (!databaseURL) {
      showToast("Please enter at least the Database URL", "error");
      return;
    }

    const config = { ...defaultFirebaseConfig, apiKey, databaseURL, projectId };
    localStorage.setItem("firebase_config_credentials", JSON.stringify(config));
    modal.classList.remove("active");

    showToast("Firebase Config Saved! Initializing sync...", "info");
    initFirebase();
  });

  // Clear Firebase Config
  document.getElementById("btnClearFirebaseConfig")?.addEventListener("click", () => {
    localStorage.removeItem("firebase_config_credentials");
    modal.classList.remove("active");
    isConnectedToFirebase = false;
    updateSyncStatusUI(false);
    showToast("Disconnected Firebase. Using Local Storage.", "info");
  });
}

// Render the application views and live HTML
function renderApp(pushToCloud = false) {
  // Update Header Inputs
  if (document.getElementById("metaTitle")) {
    document.getElementById("metaTitle").value = appState.releaseMeta?.title || "Release Notes";
    document.getElementById("metaSubtitle").value = appState.releaseMeta?.subtitle || "";
    document.getElementById("metaDate").value = appState.releaseMeta?.releaseDate || "07-30-2026";
  }

  // Render Items List in Manage Tab
  renderManageItems();

  // Generate HTML Output
  const htmlContent = generateReleaseHTML(appState);

  // Update Iframe Preview
  const iframe = document.getElementById("previewIframe");
  if (iframe) {
    iframe.srcdoc = htmlContent;
  }

  // Update Code View
  const codeElem = document.getElementById("codeContainer");
  if (codeElem) {
    codeElem.textContent = htmlContent;
  }
}

// Render items inside the Manage tab
function renderManageItems() {
  const container = document.getElementById("manageItemsContainer");
  if (!container) return;

  const items = appState.items || [];
  const categories = [
    { key: "features", title: "New Features", class: "tag-features" },
    { key: "improvements", title: "Improvements", class: "tag-improvements" },
    { key: "fixes", title: "Bug Fixes", class: "tag-fixes" }
  ];

  let html = "";

  categories.forEach(cat => {
    const catItems = items.filter(i => i.category === cat.key);

    html += `
      <div class="section-card">
        <div class="section-card-header">
          <span class="section-tag ${cat.class}">
            ${cat.title} (${catItems.length})
          </span>
        </div>
        <div class="item-list">
    `;

    if (catItems.length === 0) {
      html += `<div class="empty-state">No items added to ${cat.title} yet.</div>`;
    } else {
      catItems.forEach((item) => {
        html += `
          <div class="item-card">
            <div class="item-card-head">
              <span class="item-title">${escapeHtml(item.module)}</span>
              <div class="item-actions">
                <span class="item-author">By: ${escapeHtml(item.author || "Dev")}</span>
                <button class="btn btn-danger btn-sm btn-icon-only" onclick="deleteItem('${item.id}')" title="Delete">
                  🗑️
                </button>
              </div>
            </div>
            ${item.text ? `<div style="font-size:0.8rem; color:var(--text-sub); margin-top:4px;">${escapeHtml(item.text)}</div>` : ''}
            ${item.subBullets && item.subBullets.length > 0 ? `
              <ul class="item-subbullets">
                ${item.subBullets.map(sb => `<li>${escapeHtml(sb)}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Global Delete Item Handler
window.deleteItem = function(id) {
  appState.items = (appState.items || []).filter(i => i.id !== id);
  saveState(true);
  showToast("Item removed", "info");
};

// Generate exact Release_Note_V2.html structure
function generateReleaseHTML(state) {
  const meta = state.releaseMeta || {};
  const items = state.items || [];
  const features = items.filter(i => i.category === "features");
  const improvements = items.filter(i => i.category === "improvements");
  const fixes = items.filter(i => i.category === "fixes");

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(meta.title || "Release Notes")}</title>
</head>
<body style="margin:0; padding:0; background-color:#f2f4f7; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f7; padding:24px 0;">
<tr>
<td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e2e5ea;">

<!-- Header -->
<tr>
<td style="background-color:#1ab394; padding:28px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td valign="middle">
        <h1 style="margin:0; color:#ffffff; font-size:22px; font-family:Arial, Helvetica, sans-serif;">${escapeHtml(meta.title || "Release Notes")}</h1>
        <p style="margin:6px 0 0 0; color:#ffffff; font-size:13px;">${escapeHtml(meta.subtitle || "")}</p>
      </td>
      <td align="right" valign="middle" style="padding-left:16px;">
        <!-- RELEASE DATE BADGE -->
        <span style="background-color:rgba(255, 255, 255, 0.2); color:#ffffff; font-size:12px; padding:6px 12px; border-radius:16px; white-space:nowrap; font-weight:bold; display:inline-block;margin-bottom: 19px;">
          Date: ${escapeHtml(meta.releaseDate || "")}
        </span>
      </td>
    </tr>
  </table>
</td>
</tr>
`;

  // New Features Section
  if (features.length > 0) {
    html += `
<!-- New Features Banner -->
<tr>
<td style="padding:24px 32px 8px 32px;">
<h2 style="margin:0 0 4px 0; font-size:17px; color:#1ab394; border-bottom:2px solid #1ab394; padding-bottom:6px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3c6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px; margin-right:6px;"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>
 New Features</h2>
</td>
</tr>
<tr>
<td style="padding:8px 32px;">
<ul style="margin:0; padding-left:20px; color:#374151; font-size:14px; line-height:1.7;">
`;
    features.forEach(item => {
      html += renderItemHTML(item);
    });
    html += `
</ul>
</td>
</tr>
`;
  }

  // Improvements Section
  if (improvements.length > 0) {
    html += `
<!-- Improvements -->
<tr>
<td style="padding:20px 32px 8px 32px;">
<h2 style="margin:0 0 4px 0; font-size:17px; color:#1ab394; border-bottom:2px solid #1ab394; padding-bottom:6px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3c6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px; margin-right:6px;"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>
 Improvements</h2>
</td>
</tr>
<tr>
<td style="padding:8px 32px;">
<ul style="margin:0; padding-left:20px; color:#374151; font-size:14px; line-height:1.7;">
`;
    improvements.forEach(item => {
      html += renderItemHTML(item);
    });
    html += `
</ul>
</td>
</tr>
`;
  }

  // Bug Fixes Section
  if (fixes.length > 0) {
    html += `
<!-- Bug Fixes -->
<tr>
<td style="padding:20px 32px 8px 32px;">
<h2 style="margin:0 0 4px 0; font-size:17px; color:#1ab394; border-bottom:2px solid #1ab394; padding-bottom:6px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3c6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px; margin-right:6px;"><rect x="8" y="6" width="8" height="12" rx="4"/><path d="M12 6V4"/><path d="M8 10H4"/><path d="M8 14H4"/><path d="M16 10h4"/><path d="M16 14h4"/><path d="M9 3l1 2"/><path d="M15 3l-1 2"/><path d="M8 18l-2 3"/><path d="M16 18l2 3"/></svg>
 Bug Fixes</h2>
</td>
</tr>
<tr>
<td style="padding:8px 32px;">
`;
    fixes.forEach(item => {
      html += `
<h3 style="margin:14px 0 6px 0; font-size:15px; color:#111827;">${escapeHtml(item.module)}</h3>
<ul style="margin:0 0 4px 0; padding-left:20px; color:#374151; font-size:14px; line-height:1.6;">
`;
      if (item.text) {
        html += `<li>${formatBoldText(item.text)}</li>\n`;
      }
      if (item.subBullets && item.subBullets.length > 0) {
        item.subBullets.forEach(sb => {
          html += `<li>${formatBoldText(sb)}</li>\n`;
        });
      }
      html += `</ul>\n`;
    });
    html += `
</td>
</tr>
`;
  }

  html += `
</table>
</td>
</tr>
</table>
</body>
</html>`;

  return html;
}

// Render single item HTML block for Features/Improvements
function renderItemHTML(item) {
  let out = "<li>\n";
  
  if (item.subBullets && item.subBullets.length > 0) {
    out += `  <strong>${escapeHtml(item.module)}:</strong>\n`;
    if (item.text) {
      out += `  <div style="margin-top:2px;">${formatBoldText(item.text)}</div>\n`;
    }
    out += `  <ul style="margin:4px 0 8px 0; padding-left:20px;">\n`;
    item.subBullets.forEach(sb => {
      out += `    <li>${formatBoldText(sb)}</li>\n`;
    });
    out += `  </ul>\n`;
  } else {
    out += `  <strong>${escapeHtml(item.module)}:</strong> ${formatBoldText(item.text)}\n`;
  }
  
  out += "</li>\n";
  return out;
}

// Format bold text automatically for key terms inside bullet points
function formatBoldText(str) {
  let safe = escapeHtml(str);
  safe = safe.replace(/&quot;(.*?)&quot;/g, '<strong>"$1"</strong>');
  return safe;
}

// Copy HTML to Clipboard
function copyHtmlToClipboard() {
  const html = generateReleaseHTML(appState);
  navigator.clipboard.writeText(html).then(() => {
    showToast("HTML copied to clipboard!", "success");
  }).catch(err => {
    console.error("Failed to copy:", err);
    showToast("Failed to copy automatically. Use Code View to copy.", "error");
  });
}

// Download HTML file
function downloadHtmlFile() {
  const html = generateReleaseHTML(appState);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Release_Note_${(appState.releaseMeta?.releaseDate || "draft").replace(/[\/\s]/g, "-")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Downloaded HTML file!", "success");
}

// Reset to initial sample data matching Release_Note_V2.html
function resetToSampleData() {
  if (confirm("Reset current draft to standard sample release notes?")) {
    appState = JSON.parse(JSON.stringify(defaultState));
    saveState(true);
    showToast("Reset to sample release notes", "info");
  }
}

// Simulated AI Polish
function runAiPolish() {
  showToast("Running AI Polish & Formatting...", "info");
  setTimeout(() => {
    (appState.items || []).forEach(item => {
      if (item.text) {
        item.text = item.text.trim();
        if (!item.text.endsWith('.')) item.text += '.';
      }
      if (item.subBullets) {
        item.subBullets = item.subBullets.map(sb => {
          let s = sb.trim();
          if (!s.endsWith('.')) s += '.';
          return s;
        });
      }
    });
    saveState(true);
    showToast("✨ AI Polish complete! Bullet formatting standardized.", "success");
  }, 600);
}

// Escape HTML utility
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Toast notification display
function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
