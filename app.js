/* =====================================================================
   ProxiCraft – Mobile Job-Matching Platform for Nigeria
   MSc Computing Dissertation – Edinburgh Napier University, 2025
   ===================================================================== */

// ===== SEED DATA =====
const SEED_JOBS = [
  { id: 1, title: 'Electrician Needed for Office Rewiring', category: 'Electrical', location: 'Lagos',
    budget: 25000, duration: '2 days',
    description: 'We require a certified electrician to rewire our office space on Victoria Island. The work involves replacing sockets, fitting new light fittings, and testing all circuits. Tools must be supplied by the applicant.',
    employer: 'TechSpace Nigeria Ltd', date: '10/07/2025', urgent: true },
  { id: 2, title: 'Experienced Plumber for Pipe Repairs', category: 'Plumbing', location: 'Abuja',
    budget: 15000, duration: '1 day',
    description: 'Seeking an experienced plumber to fix a burst water pipe and replace two bathroom taps in a residential property at Maitama. Materials will be provided by the client.',
    employer: 'Horizon Properties Abuja', date: '09/07/2025', urgent: false },
  { id: 3, title: 'Carpenter for Custom Furniture Build', category: 'Carpentry', location: 'Port Harcourt',
    budget: 45000, duration: '5 days',
    description: 'Need a skilled carpenter to build custom bookshelves, a kitchen cabinet, and a wardrobe for a new 3-bedroom home. Designs will be provided. Timber to be sourced by the carpenter.',
    employer: 'Green Home Interiors PH', date: '08/07/2025', urgent: false },
  { id: 4, title: 'Painter for 3-Bedroom Apartment', category: 'Painting', location: 'Lagos',
    budget: 30000, duration: '3 days',
    description: 'Full interior painting of a 3-bedroom apartment in Surulere. Must supply own brushes and rollers. Paint and filler provided by client. Experience with gloss and emulsion required.',
    employer: 'Private Client', date: '07/07/2025', urgent: true },
  { id: 5, title: 'Auto Mechanic for Engine Service', category: 'Automobile', location: 'Ibadan',
    budget: 20000, duration: '1 day',
    description: 'Looking for an experienced auto mechanic for full engine service, oil change, and brake pad replacement on a Toyota Corolla 2018. Spare parts to be agreed upon before work starts.',
    employer: 'TransportCo Nigeria', date: '06/07/2025', urgent: false },
  { id: 6, title: 'Professional Cleaner for Office Block', category: 'Cleaning', location: 'Abuja',
    budget: 8000, duration: '1 day',
    description: 'Require a professional cleaner for a thorough deep clean of a 3-floor office building in Garki. Cleaning materials and equipment must be provided by the cleaner.',
    employer: 'Federal Admin Services', date: '05/07/2025', urgent: false },
  { id: 7, title: 'Mason for Foundation Laying Project', category: 'Masonry', location: 'Enugu',
    budget: 60000, duration: '1 week',
    description: 'Experienced block-layer and mason needed for foundation laying and ground-floor block work on a new residential project in GRA Enugu. Concrete and blocks supplied by client.',
    employer: 'BuildRight Construction', date: '04/07/2025', urgent: true },
  { id: 8, title: 'Welder for Security Gate Fabrication', category: 'Welding', location: 'Lagos',
    budget: 35000, duration: '2 days',
    description: 'Need a skilled welder to fabricate and install a heavy-duty steel security gate at a residential property in Ikeja. Design agreed in advance. Welding gas and consumables provided.',
    employer: 'SecureHome Ltd Lagos', date: '03/07/2025', urgent: false }
];

// ===== GLOBAL STATE =====
let currentUser = null;
let currentRole = 'artisan';
let allJobs = [];
let userApps = [];
let activeTab = 'home';
let viewingJobId = null;

// ===== INITIALISE =====
window.addEventListener('DOMContentLoaded', function () {
  allJobs = [...SEED_JOBS];
  const saved = localStorage.getItem('pcSession');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      currentRole = currentUser.role;
      const appsKey = 'pcApps_' + currentUser.id;
      userApps = JSON.parse(localStorage.getItem(appsKey) || '[]');
      setTimeout(function () { showScreen('main'); loadMainApp(); }, 2000);
    } catch (e) {
      setTimeout(function () { showScreen('onboard'); }, 2000);
    }
  } else {
    setTimeout(function () { showScreen('onboard'); }, 2000);
  }
});

// ===== SCREEN NAVIGATION =====
function showScreen(name) {
  var ids = ['splashScreen', 'onboardScreen', 'authScreen', 'mainApp'];
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    el.style.display = 'none';
    el.classList.remove('active');
  });
  var map = { splash: 'splashScreen', onboard: 'onboardScreen', auth: 'authScreen', main: 'mainApp' };
  var el = document.getElementById(map[name] || name);
  if (el) {
    el.style.display = 'flex';
    el.classList.add('active');
  }
}

// ===== ROLE SELECTION =====
function selectRole(role) {
  currentRole = role;
  document.getElementById('authHeading').textContent = role === 'artisan' ? 'Join as Artisan' : 'Join as Client';
  document.getElementById('artisanFields').style.display = role === 'artisan' ? 'block' : 'none';
  document.getElementById('clientFields').style.display = role === 'client' ? 'block' : 'none';
  switchAuth('reg');
  showScreen('auth');
}

function goToLogin() {
  switchAuth('log');
  showScreen('auth');
}

function switchAuth(tab) {
  document.getElementById('regForm').style.display = tab === 'reg' ? 'block' : 'none';
  document.getElementById('logForm').style.display = tab === 'log' ? 'block' : 'none';
  document.getElementById('tabReg').classList.toggle('active', tab === 'reg');
  document.getElementById('tabLog').classList.toggle('active', tab === 'log');
}

// ===== REGISTRATION =====
function handleRegister() {
  var firstName = document.getElementById('rFirst').value.trim();
  var lastName  = document.getElementById('rLast').value.trim();
  var email     = document.getElementById('rEmail').value.trim().toLowerCase();
  var phone     = document.getElementById('rPhone').value.trim();
  var city      = document.getElementById('rCity').value;
  var password  = document.getElementById('rPass').value;
  var confirm   = document.getElementById('rConfirm').value;

  clearErr('regErr');

  if (!firstName || !lastName || !email || !phone || !city || !password) {
    showErr('regErr', 'Please fill in all required fields.'); return;
  }
  if (!email.includes('@')) {
    showErr('regErr', 'Please enter a valid email address.'); return;
  }
  if (password !== confirm) {
    showErr('regErr', 'Passwords do not match.'); return;
  }
  if (password.length < 6) {
    showErr('regErr', 'Password must be at least 6 characters.'); return;
  }

  var users = JSON.parse(localStorage.getItem('pcUsers') || '[]');
  if (users.find(function (u) { return u.email === email; })) {
    showErr('regErr', 'An account with this email already exists.'); return;
  }

  var category = '', rate = '', business = '';
  if (currentRole === 'artisan') {
    category = document.getElementById('rCategory').value;
    rate     = document.getElementById('rRate').value;
  } else {
    business = document.getElementById('rBusiness').value.trim();
  }

  var user = {
    id: Date.now(),
    firstName: firstName, lastName: lastName,
    email: email, phone: phone, city: city,
    role: currentRole, category: category,
    rate: rate, business: business,
    password: password,
    joinedAt: new Date().toLocaleDateString('en-GB')
  };

  users.push(user);
  localStorage.setItem('pcUsers', JSON.stringify(users));
  doLogin(user);
}

// ===== LOGIN =====
function handleLogin() {
  var email    = document.getElementById('lEmail').value.trim().toLowerCase();
  var password = document.getElementById('lPass').value;
  clearErr('logErr');

  if (!email || !password) {
    showErr('logErr', 'Please enter your email and password.'); return;
  }
  var users = JSON.parse(localStorage.getItem('pcUsers') || '[]');
  var found  = users.find(function (u) { return u.email === email && u.password === password; });
  if (!found) {
    showErr('logErr', 'Incorrect email or password. Please try again.'); return;
  }
  doLogin(found);
}

function doLogin(user) {
  currentUser = user;
  currentRole = user.role;
  localStorage.setItem('pcSession', JSON.stringify(user));
  var appsKey = 'pcApps_' + user.id;
  userApps = JSON.parse(localStorage.getItem(appsKey) || '[]');
  showScreen('main');
  loadMainApp();
}

// ===== LOGOUT =====
function handleLogout() {
  localStorage.removeItem('pcSession');
  currentUser = null;
  userApps = [];
  showScreen('onboard');
  showToast('You have been logged out successfully.');
}

// ===== LOAD MAIN APP =====
function loadMainApp() {
  // Greeting
  var hour = new Date().getHours();
  var greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greetMsg').textContent = greet + '!';
  document.getElementById('greetName').textContent = currentUser.firstName + ' ' + currentUser.lastName;

  // Header badge
  var badge = document.getElementById('hdrBadge');
  badge.textContent = currentRole === 'artisan' ? 'Artisan' : 'Client';
  badge.className   = 'role-badge ' + currentRole;

  // Render home job grid
  renderJobs(allJobs, 'homeGrid');
  document.getElementById('jobCountBadge').textContent = allJobs.length + ' jobs';

  // Work tab configuration
  if (currentRole === 'client') {
    document.getElementById('appsPanel').style.display  = 'none';
    document.getElementById('postPanel').style.display  = 'block';
    document.getElementById('workIcon').textContent     = '\u2795';
    document.getElementById('workLbl').textContent      = 'Post';
  } else {
    document.getElementById('appsPanel').style.display  = 'block';
    document.getElementById('postPanel').style.display  = 'none';
    document.getElementById('workIcon').textContent     = '\uD83D\uDCCB';
    document.getElementById('workLbl').textContent      = 'Applied';
  }

  filterJobs();
  loadProfile();
  switchTab('home');
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
  activeTab = tab;
  ['home', 'search', 'work', 'profile'].forEach(function (t) {
    document.getElementById(t + 'Page').classList.remove('active');
    document.getElementById('bn' + t.charAt(0).toUpperCase() + t.slice(1)).classList.remove('active');
  });
  document.getElementById(tab + 'Page').classList.add('active');
  document.getElementById('bn' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  if (tab === 'work' && currentRole === 'artisan') renderApplications();
  if (tab === 'profile') loadProfile();
}

// ===== RENDER JOB CARDS =====
function renderJobs(jobs, containerId) {
  var grid = document.getElementById(containerId);
  if (!jobs || jobs.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No jobs found matching your search.</p></div>';
    return;
  }
  grid.innerHTML = jobs.map(function (job) {
    return '<div class="job-card" onclick="viewJob(' + job.id + ')">' +
      (job.urgent ? '<span class="urgent-tag">Urgent</span>' : '') +
      '<div class="job-title">' + escHtml(job.title) + '</div>' +
      '<span class="cat-badge">' + escHtml(job.category) + '</span>' +
      '<div class="job-meta">' +
        '<span>&#128205; ' + escHtml(job.location) + '</span>' +
        '<span>&#8987; ' + escHtml(job.duration) + '</span>' +
      '</div>' +
      '<div class="job-footer">' +
        '<span class="job-budget">&#8358;' + Number(job.budget).toLocaleString() + '</span>' +
        '<span class="view-link">View &#8594;</span>' +
      '</div></div>';
  }).join('');
}

// ===== SEARCH & FILTER =====
function filterJobs() {
  var q   = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  var cat = document.getElementById('catFilter').value;
  var loc = document.getElementById('locFilter').value;

  var results = allJobs.filter(function (job) {
    var matchQ   = !q || job.title.toLowerCase().includes(q) || job.category.toLowerCase().includes(q) || job.description.toLowerCase().includes(q);
    var matchCat = !cat || job.category === cat;
    var matchLoc = !loc || job.location === loc;
    return matchQ && matchCat && matchLoc;
  });

  var info = document.getElementById('searchInfo');
  info.textContent = results.length + ' job' + (results.length !== 1 ? 's' : '') + ' found';
  renderJobs(results, 'searchGrid');
}

// ===== VIEW JOB DETAIL =====
function viewJob(id) {
  var job = allJobs.find(function (j) { return j.id === id; });
  if (!job) return;
  viewingJobId = id;

  var isApplied = userApps.includes(id);
  var isOwn     = job.postedBy && currentUser && job.postedBy === currentUser.id;

  var html =
    '<div class="detail-title">' + escHtml(job.title) + '</div>' +
    '<div class="detail-meta">' +
      '<span class="cat-badge">' + escHtml(job.category) + '</span>' +
      (job.urgent ? '<span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:#FEE2E2;color:#DC2626;">Urgent</span>' : '') +
    '</div>' +
    '<div class="detail-info-row"><span class="dil">&#128205; Location</span><span>' + escHtml(job.location) + '</span></div>' +
    '<div class="detail-info-row"><span class="dil">&#128176; Budget</span><span style="color:#16A34A;font-weight:800;">&#8358;' + Number(job.budget).toLocaleString() + '</span></div>' +
    '<div class="detail-info-row"><span class="dil">&#8987; Duration</span><span>' + escHtml(job.duration) + '</span></div>' +
    '<div class="detail-info-row"><span class="dil">&#127970; Employer</span><span>' + escHtml(job.employer) + '</span></div>' +
    '<div class="detail-info-row"><span class="dil">&#128197; Posted</span><span>' + escHtml(job.date) + '</span></div>' +
    '<div class="detail-desc"><h4>Job Description</h4><p>' + escHtml(job.description) + '</p></div>';

  if (currentRole === 'artisan') {
    html += isApplied
      ? '<div class="applied-notice">&#10003; You have applied for this job</div>'
      : '<button class="apply-btn" onclick="applyForJob(' + id + ')">Apply for This Job</button>';
  } else if (isOwn) {
    html += '<div class="own-notice">&#128204; You posted this job</div>';
  }

  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('jobModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('jobModal').style.display = 'none';
}

function closeModalOverlay(e) {
  if (e.target === document.getElementById('jobModal')) closeModal();
}

// ===== APPLY FOR JOB =====
function applyForJob(id) {
  if (userApps.includes(id)) {
    showToast('You have already applied for this job.'); return;
  }
  userApps.push(id);
  localStorage.setItem('pcApps_' + currentUser.id, JSON.stringify(userApps));
  closeModal();
  showToast('Application submitted successfully!');
  // Re-open to show applied state
  setTimeout(function () { viewJob(id); }, 400);
}

// ===== POST A JOB =====
function handlePostJob() {
  var title    = document.getElementById('pTitle').value.trim();
  var category = document.getElementById('pCat').value;
  var location = document.getElementById('pLoc').value;
  var budget   = document.getElementById('pBudget').value;
  var duration = document.getElementById('pDuration').value.trim();
  var desc     = document.getElementById('pDesc').value.trim();
  clearErr('postErr');

  if (!title || !category || !location || !budget || !duration || !desc) {
    showErr('postErr', 'Please fill in all fields before posting.'); return;
  }
  if (Number(budget) < 500) {
    showErr('postErr', 'Please enter a valid budget (minimum &#8358;500).'); return;
  }

  var newJob = {
    id: Date.now(), title: title, category: category, location: location,
    budget: Number(budget), duration: duration, description: desc,
    employer: currentUser.business || currentUser.firstName + ' ' + currentUser.lastName,
    date: new Date().toLocaleDateString('en-GB'),
    urgent: false, postedBy: currentUser.id
  };

  allJobs.unshift(newJob);
  renderJobs(allJobs, 'homeGrid');
  document.getElementById('jobCountBadge').textContent = allJobs.length + ' jobs';
  filterJobs();

  // Clear post form
  ['pTitle', 'pBudget', 'pDuration', 'pDesc'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('pCat').value = '';
  document.getElementById('pLoc').value = '';

  showToast('Job posted! It is now live on the platform.');
  switchTab('home');
}

// ===== MY APPLICATIONS =====
function renderApplications() {
  var list = document.getElementById('appsList');
  var count = document.getElementById('appsCount');
  count.textContent = userApps.length;

  if (userApps.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No applications yet.</p><p style="margin-top:8px;font-size:13px;">Browse jobs and tap Apply.</p></div>';
    return;
  }

  var applied = allJobs.filter(function (j) { return userApps.includes(j.id); });
  list.innerHTML = applied.map(function (job) {
    return '<div class="app-card" onclick="viewJob(' + job.id + ')">' +
      '<div class="app-card-top">' +
        '<span class="cat-badge">' + escHtml(job.category) + '</span>' +
        '<span class="applied-tag">Applied &#10003;</span>' +
      '</div>' +
      '<h4>' + escHtml(job.title) + '</h4>' +
      '<div class="job-meta">' +
        '<span>&#128205; ' + escHtml(job.location) + '</span>' +
        '<span style="color:#16A34A;font-weight:700;">&#8358;' + Number(job.budget).toLocaleString() + '</span>' +
      '</div></div>';
  }).join('');
}

// ===== PROFILE =====
function loadProfile() {
  if (!currentUser) return;
  var initials = currentUser.firstName.charAt(0) + currentUser.lastName.charAt(0);
  var avatar = document.getElementById('profAvatar');
  avatar.textContent = initials.toUpperCase();
  avatar.className   = 'prof-avatar ' + currentRole;

  document.getElementById('profName').textContent  = currentUser.firstName + ' ' + currentUser.lastName;
  var badge = document.getElementById('profBadge');
  badge.textContent = currentRole === 'artisan' ? 'Artisan' : 'Client';
  badge.className   = 'role-badge ' + currentRole;

  document.getElementById('profEmail').textContent = currentUser.email;
  document.getElementById('profPhone').textContent = currentUser.phone;
  document.getElementById('profCity').textContent  = currentUser.city;
  document.getElementById('profSince').textContent = currentUser.joinedAt;

  if (currentRole === 'artisan') {
    document.getElementById('artisanRow').style.display = 'flex';
    document.getElementById('clientRow').style.display  = 'none';
    document.getElementById('profCat').textContent      = currentUser.category || 'Not specified';
    document.getElementById('s1v').textContent = userApps.length;
    document.getElementById('s1l').textContent = 'Applied';
    document.getElementById('s2v').textContent = currentUser.rate ? '\u20A6' + Number(currentUser.rate).toLocaleString() : 'N/A';
    document.getElementById('s2l').textContent = 'Daily Rate';
  } else {
    document.getElementById('artisanRow').style.display = 'none';
    document.getElementById('clientRow').style.display  = 'flex';
    document.getElementById('profBiz').textContent      = currentUser.business || 'Not specified';
    var myJobs = allJobs.filter(function (j) { return j.postedBy === currentUser.id; }).length;
    document.getElementById('s1v').textContent = myJobs;
    document.getElementById('s1l').textContent = 'Jobs Posted';
    document.getElementById('s2v').textContent = '0';
    document.getElementById('s2l').textContent = 'Hired';
  }
}

// ===== UTILITIES =====
function showErr(id, msg) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = msg;
}

function clearErr(id) {
  var el = document.getElementById(id);
  if (el) el.textContent = '';
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3200);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
