// ===== NAV SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  mobileMenu.setAttribute('aria-hidden', !isOpen);
});
document.querySelectorAll('.mob-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
  });
});

// ===== SMOOTH SCROLL FOR ALL ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== ACTIVE NAV LINK =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
      });
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => observer.observe(s));

// ===== REVEAL ON SCROLL =====
document.querySelectorAll('.project-card, .venture-card, .info-card, .skill-category, .ci-item').forEach(el => {
  el.classList.add('reveal');
});
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ===== STAT NUMBER COUNTER =====
const statNums = document.querySelectorAll('.stat-num');
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      let current = 0;
      const step = Math.ceil(target / 30);
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(interval);
      }, 40);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
statNums.forEach(el => counterObserver.observe(el));

// ===== SKILL BAR ANIMATION =====
const skillFills = document.querySelectorAll('.sb-fill');
const skillObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      el.style.width = el.dataset.width + '%';
      skillObserver.unobserve(el);
    }
  });
}, { threshold: 0.3 });
skillFills.forEach(el => skillObserver.observe(el));

// ===== CONTACT FORM VALIDATION =====
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

function validateField(id, errId, validator, message) {
  const val = document.getElementById(id).value.trim();
  const errEl = document.getElementById(errId);
  if (!validator(val)) {
    errEl.textContent = message;
    document.getElementById(id).style.borderColor = '#f87171';
    return false;
  }
  errEl.textContent = '';
  document.getElementById(id).style.borderColor = '';
  return true;
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const v1 = validateField('cf-name', 'err-name', v => v.length >= 2, 'Please enter your full name.');
  const v2 = validateField('cf-email', 'err-email', v => emailRegex.test(v), 'Please enter a valid email address.');
  const v3 = validateField('cf-subject', 'err-subject', v => v.length >= 3, 'Subject must be at least 3 characters.');
  const v4 = validateField('cf-message', 'err-message', v => v.length >= 20, 'Message must be at least 20 characters.');

  if (v1 && v2 && v3 && v4) {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Sending...';
    setTimeout(() => {
      form.reset();
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'Send Message';
      formSuccess.textContent = '✓ Message sent! I\'ll get back to you shortly.';
      setTimeout(() => formSuccess.textContent = '', 5000);
    }, 1500);
  }
});

// Clear errors on input
['cf-name','cf-email','cf-subject','cf-message'].forEach(id => {
  document.getElementById(id).addEventListener('input', function() {
    this.style.borderColor = '';
    document.getElementById('err-' + id.replace('cf-', '')).textContent = '';
  });
});

// ===== CURSOR GLOW (desktop only) =====
if (window.matchMedia('(pointer: fine)').matches) {
  const glow = document.createElement('div');
  glow.style.cssText = 'position:fixed;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(0,212,170,0.04),transparent 70%);pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:left 0.12s ease,top 0.12s ease;';
  document.body.appendChild(glow);
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  });
}

// ===== RESUME & CERTIFICATE SYSTEM =====
const DB_KEY_PROFILE = 'portfolio_profile';
const DB_KEY_RESUME = 'portfolio_resume';
const DB_KEY_CERTS  = 'portfolio_certs';
let stagedProfile = null;
let stagedResume = null;
let stagedCerts  = [];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('PortfolioDB', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('files');
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}
async function dbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(value, key).onsuccess = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}
async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const req = tx.objectStore('files').get(key);
    req.onsuccess = e => resolve(e.target.result || null);
    req.onerror   = e => reject(e.target.error);
  });
}
async function dbDel(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').delete(key).onsuccess = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}
function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = e => reject(e);
    r.readAsDataURL(file);
  });
}

// --- Render resume card (public) ---
function renderResumeCard(data) {
  const rh      = document.getElementById('resumeHero');
  const empty   = document.getElementById('resumeEmpty');
  const info    = rh.querySelector('.rh-info');
  const actions = rh.querySelector('.rh-actions');
  if (data && data.dataUrl) {
    document.getElementById('resumeTitle').textContent = data.name || 'Resume';
    document.getElementById('resumeMeta').textContent  = 'PDF · ' + Math.round(data.size / 1024) + ' KB';
    info.hidden = false; actions.hidden = false; empty.hidden = true;
    rh.classList.add('has-file');
  } else {
    info.hidden = true; actions.hidden = true; empty.hidden = false;
    rh.classList.remove('has-file');
  }
}

// --- Render profile image (public) ---
function renderProfileCard(data) {
  const avatarImg = document.getElementById('avatarImg');
  avatarImg.src = 'assets/profile.jpeg';
  avatarImg.style.display = 'block';
}

// --- Render certs grid (public) ---
function renderCertsGrid(certs) {
  const grid  = document.getElementById('certsGrid');
  const empty = document.getElementById('certEmptyState');
  document.getElementById('certCount').textContent = certs.length + ' certificate' + (certs.length !== 1 ? 's' : '');
  grid.querySelectorAll('.cert-card').forEach(c => c.remove());
  if (!certs.length) { empty.hidden = false; return; }
  empty.hidden = true;
  certs.forEach(cert => {
    const card = document.createElement('div');
    card.className = 'cert-card reveal';
    const isImg = cert.type && cert.type.startsWith('image/');
    card.innerHTML = `
      <div class="cc-thumb">${isImg
        ? `<img src="${cert.dataUrl}" alt="${cert.name}" class="cc-img" />`
        : `<div class="cc-pdf-icon">📄</div>`}
      </div>
      <div class="cc-body">
        <p class="cc-name">${cert.name}</p>
        <div class="cc-actions">
          <button class="btn btn-primary cc-btn" onclick="downloadFile('cert','${cert.id}')">⬇ Download</button>
          <button class="btn btn-ghost cc-btn" onclick="viewFile('cert','${cert.id}')">👁 Preview</button>
        </div>
      </div>`;
    grid.appendChild(card);
    setTimeout(() => card.classList.add('visible'), 80);
  });
}

// --- Public download/view ---
window.downloadFile = async function(type, certId) {
  const data = type === 'resume'
    ? await dbGet(DB_KEY_RESUME)
    : ((await dbGet(DB_KEY_CERTS)) || []).find(c => c.id === certId);
  if (!data) return;
  const a = document.createElement('a');
  a.href = data.dataUrl; a.download = data.name; a.click();
};
window.viewFile = async function(type, certId) {
  const data = type === 'resume'
    ? await dbGet(DB_KEY_RESUME)
    : ((await dbGet(DB_KEY_CERTS)) || []).find(c => c.id === certId);
  if (!data) return;
  const win = window.open('', '_blank');
  if (data.type && data.type.startsWith('image/')) {
    win.document.write(`<img src="${data.dataUrl}" style="max-width:100%;display:block;margin:auto;" />`);
  } else {
    win.document.write(`<iframe src="${data.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`);
  }
};

// --- Admin modal ---
const adminModal    = document.getElementById('adminModal');
const adminClose    = document.getElementById('adminClose');
const adminBackdrop = document.getElementById('adminBackdrop');
const apSaveBtn     = document.getElementById('apSaveBtn');
const apNote        = document.getElementById('apNote');
const profileInput   = document.getElementById('profileInput');
const profilePreview = document.getElementById('profilePreview');
const profileZone    = document.getElementById('profileZone');
const resumeInput   = document.getElementById('resumeInput');
const certInput     = document.getElementById('certInput');
const resumePreview = document.getElementById('resumePreview');
const certUploadList= document.getElementById('certUploadList');

function openAdmin() {
  adminModal.hidden = false;
  document.body.style.overflow = 'hidden';
  loadAdminState();
}
function closeAdmin() {
  adminModal.hidden = true;
  document.body.style.overflow = '';
  stagedProfile = null; stagedResume = null; stagedCerts = [];
  renderUploadList();
}
adminClose.addEventListener('click', closeAdmin);
adminBackdrop.addEventListener('click', closeAdmin);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAdmin(); });

// Logo triple-click unlock
let logoClicks = 0, logoTimer;
document.querySelector('.nav-logo').addEventListener('click', e => {
  e.preventDefault();
  logoClicks++;
  clearTimeout(logoTimer);
  logoTimer = setTimeout(() => { logoClicks = 0; }, 800);
  if (logoClicks >= 3) { logoClicks = 0; openAdmin(); }
});

async function loadAdminState() {
  const profile = await dbGet(DB_KEY_PROFILE);
  renderProfileAdminPreview(profile);
  const resume = await dbGet(DB_KEY_RESUME);
  renderResumeAdminPreview(resume);
  stagedCerts = ((await dbGet(DB_KEY_CERTS)) || []).map(c => ({ ...c }));
  renderUploadList();
}
function renderProfileAdminPreview(data) {
  if (data) {
    document.getElementById('profilePreviewName').textContent = data.name;
    profilePreview.hidden = false;
    profileZone.style.display = 'none';
  } else {
    profilePreview.hidden = true;
    profileZone.style.display = '';
  }
}
function renderResumeAdminPreview(data) {
  if (data) {
    document.getElementById('resumePreviewName').textContent = data.name;
    resumePreview.hidden = false;
    document.getElementById('resumeZone').style.display = 'none';
  } else {
    resumePreview.hidden = true;
    document.getElementById('resumeZone').style.display = '';
  }
}
function renderUploadList() {
  certUploadList.innerHTML = '';
  stagedCerts.forEach(cert => {
    const row = document.createElement('div');
    row.className = 'cup-row';
    const isImg = cert.type && cert.type.startsWith('image/');
    row.innerHTML = `
      <span class="cup-icon">${isImg ? '🖼' : '📄'}</span>
      <span class="cup-name">${cert.name}</span>
      <span class="cup-size">${Math.round(cert.size / 1024)} KB</span>
      <button class="up-remove" onclick="removeStagedCert('${cert.id}')" aria-label="Remove">✕</button>`;
    certUploadList.appendChild(row);
  });
}
window.removeStagedCert = function(id) {
  stagedCerts = stagedCerts.filter(c => c.id !== id);
  renderUploadList();
};

// Profile photo input
profileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { apNote.textContent = '⚠ Profile picture must be under 5 MB.'; return; }
  const dataUrl = await toDataUrl(file);
  stagedProfile = { name: file.name, dataUrl, size: file.size };
  document.getElementById('profilePreviewName').textContent = file.name;
  profilePreview.hidden = false;
  profileZone.style.display = 'none';
  apNote.textContent = '';
});

// Resume file input
resumeInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { apNote.textContent = '⚠ Resume must be under 10 MB.'; return; }
  const dataUrl = await toDataUrl(file);
  stagedResume = { name: file.name, dataUrl, size: file.size };
  document.getElementById('resumePreviewName').textContent = file.name;
  resumePreview.hidden = false;
  document.getElementById('resumeZone').style.display = 'none';
  apNote.textContent = '';
});
window.removeFile = function(type) {
  if (type === 'profile') {
    stagedProfile = { _delete: true };
    profilePreview.hidden = true;
    profileZone.style.display = '';
    profileInput.value = '';
  } else if (type === 'resume') {
    stagedResume = { _delete: true };
    resumePreview.hidden = true;
    document.getElementById('resumeZone').style.display = '';
    resumeInput.value = '';
  }
};

// Cert file input
certInput.addEventListener('change', async e => {
  for (const file of Array.from(e.target.files)) {
    if (file.size > 5 * 1024 * 1024) { apNote.textContent = `⚠ ${file.name} exceeds 5 MB, skipped.`; continue; }
    const dataUrl = await toDataUrl(file);
    stagedCerts.push({ id: 'cert_' + Date.now() + '_' + Math.random().toString(36).slice(2), name: file.name, dataUrl, size: file.size, type: file.type });
  }
  renderUploadList();
  certInput.value = '';
});

// Drag & drop
[document.getElementById('profileZone'), document.getElementById('resumeZone'), document.getElementById('certZone')].forEach(zone => {
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', async e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const isProfile = zone.id === 'profileZone';
    const isResume = zone.id === 'resumeZone';
    for (const file of Array.from(e.dataTransfer.files)) {
      if (isProfile) {
        if (!file.type.startsWith('image/')) { apNote.textContent = '⚠ Only images (PNG, JPG, WebP) for profile photo.'; continue; }
        if (file.size > 5 * 1024 * 1024) { apNote.textContent = '⚠ Under 5 MB only.'; continue; }
        const dataUrl = await toDataUrl(file);
        stagedProfile = { name: file.name, dataUrl, size: file.size };
        document.getElementById('profilePreviewName').textContent = file.name;
        profilePreview.hidden = false;
        profileZone.style.display = 'none';
      } else if (isResume) {
        if (!file.type.includes('pdf')) { apNote.textContent = '⚠ Only PDF for resume.'; continue; }
        if (file.size > 10 * 1024 * 1024) { apNote.textContent = '⚠ Under 10 MB only.'; continue; }
        const dataUrl = await toDataUrl(file);
        stagedResume = { name: file.name, dataUrl, size: file.size };
        document.getElementById('resumePreviewName').textContent = file.name;
        resumePreview.hidden = false;
        document.getElementById('resumeZone').style.display = 'none';
      } else {
        if (file.size > 5 * 1024 * 1024) { apNote.textContent = `⚠ ${file.name} too large.`; continue; }
        const dataUrl = await toDataUrl(file);
        stagedCerts.push({ id: 'cert_' + Date.now() + '_' + Math.random().toString(36).slice(2), name: file.name, dataUrl, size: file.size, type: file.type });
        renderUploadList();
      }
    }
    apNote.textContent = '';
  });
});

// Save
apSaveBtn.addEventListener('click', async () => {
  apSaveBtn.disabled = true; apSaveBtn.textContent = 'Saving...';
  try {
    if (stagedProfile && !stagedProfile._delete) {
      await dbSet(DB_KEY_PROFILE, stagedProfile);
      renderProfileCard(stagedProfile);
    } else if (stagedProfile && stagedProfile._delete) {
      await dbDel(DB_KEY_PROFILE);
      renderProfileCard(null);
    }
    if (stagedResume && !stagedResume._delete) {
      await dbSet(DB_KEY_RESUME, stagedResume);
      renderResumeCard(stagedResume);
    } else if (stagedResume && stagedResume._delete) {
      await dbDel(DB_KEY_RESUME);
      renderResumeCard(null);
    }
    await dbSet(DB_KEY_CERTS, stagedCerts);
    renderCertsGrid(stagedCerts);
    apNote.textContent = '✓ Saved!'; apNote.style.color = 'var(--teal)';
    setTimeout(closeAdmin, 1000);
  } catch(err) {
    apNote.textContent = '✗ ' + err.message; apNote.style.color = '#f87171';
  } finally {
    apSaveBtn.disabled = false; apSaveBtn.textContent = '💾 Save Changes';
  }
});

// Init on load
(async () => {
  // Clear any existing database profile picture once to ensure the new GitHub default displays
  if (!localStorage.getItem('profile_cleared_v4')) {
    await dbDel(DB_KEY_PROFILE);
    localStorage.setItem('profile_cleared_v4', 'true');
  }
  renderProfileCard(await dbGet(DB_KEY_PROFILE));
  renderResumeCard(await dbGet(DB_KEY_RESUME));
  renderCertsGrid((await dbGet(DB_KEY_CERTS)) || []);
})();
