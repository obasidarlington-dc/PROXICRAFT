/* ================================================================
   ProxiCraft v2 – Mobile Job-Matching Platform, Nigeria
   MSc Computing Dissertation – Edinburgh Napier University 2025
   ================================================================ */

/* ===================== PROXIDB – DATABASE LAYER ===================== */
var ProxiDB = {
  _d: null,

  init: function () {
    try {
      var raw = localStorage.getItem('pxdb_v4');
      this._d = raw ? JSON.parse(raw) : null;
    } catch (e) { this._d = null; }
    if (!this._d || !this._d.users) {
      this._d = { users: {}, jobs: {}, applications: {}, reports: {} };
      this._seed();
    }
  },

  _save: function () {
    try { localStorage.setItem('pxdb_v4', JSON.stringify(this._d)); }
    catch (e) { showToast('Storage limit reached. Some data may not be saved.'); }
  },

  _hash: function (str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
    return h.toString(16);
  },

  _uid: function (p) { return (p || 'x') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); },

  _seed: function () {
    var now = new Date().toISOString();
    /* Admin */
    this._d.users['admin_001'] = {
      userId:'admin_001', username:'admin', email:'admin@proxicraft.ng',
      password:this._hash('Admin2025!'), role:'admin',
      firstName:'ProxiCraft', lastName:'Admin', phone:'08000000001',
      city:'Lagos', status:'active', createdAt:now,
      securityQuestion:"What is your favourite food?",
      securityAnswer:this._hash('rice'), profileImage:null
    };
    /* Demo artisan */
    this._d.users['art_demo'] = {
      userId:'art_demo', username:'emeka_elec', email:'chukwu@example.com',
      password:this._hash('Artisan2025!'), role:'artisan',
      firstName:'Emeka', lastName:'Chukwu', phone:'08031234567',
      city:'Lagos', category:'Electrical', qualification:'ond',
      rate:'15000', status:'active', createdAt:now,
      securityQuestion:"What is the name of your primary school?",
      securityAnswer:this._hash('community school'),
      profileImage:null, cv:null, cvName:null, business:''
    };
    /* Demo client */
    this._d.users['cli_demo'] = {
      userId:'cli_demo', username:'horizon_ng', email:'horizon@example.com',
      password:this._hash('Client2025!'), role:'client',
      firstName:'Horizon', lastName:'Properties', phone:'08098765432',
      city:'Abuja', business:'Horizon Properties Ltd', status:'active', createdAt:now,
      securityQuestion:"What is your mother's maiden name?",
      securityAnswer:this._hash('ibrahim'),
      profileImage:null, cv:null, cvName:null, category:''
    };
    /* Seed jobs */
    [
      {title:'Electrician for Office Rewiring',category:'Electrical',location:'Lagos',budget:25000,duration:'2 days',description:'Certified electrician needed to rewire our office space on Victoria Island. Involves replacing sockets, fitting new light fittings, and circuit testing. All tools must be supplied by the applicant.',employer:'TechSpace Nigeria Ltd',urgent:true},
      {title:'Experienced Plumber for Pipe Repairs',category:'Plumbing',location:'Abuja',budget:15000,duration:'1 day',description:'Plumber required to fix a burst pipe and replace two bathroom taps in a residential property at Maitama. Materials provided by client.',employer:'Horizon Properties',urgent:false},
      {title:'Carpenter for Custom Furniture Build',category:'Carpentry',location:'Port Harcourt',budget:45000,duration:'5 days',description:'Skilled carpenter needed to build custom bookshelves, kitchen cabinet, and wardrobe for a new 3-bedroom home. Designs will be provided.',employer:'Green Home Interiors PH',urgent:false},
      {title:'Painter for 3-Bedroom Apartment',category:'Painting',location:'Lagos',budget:30000,duration:'3 days',description:'Full interior painting of a 3-bedroom flat in Surulere. Supply own brushes and rollers. Paint and filler provided by client.',employer:'Private Client',urgent:true},
      {title:'Auto Mechanic for Engine Service',category:'Automobile',location:'Ibadan',budget:20000,duration:'1 day',description:'Experienced mechanic needed for full engine service, oil change, and brake pad replacement on a Toyota Corolla 2018.',employer:'TransportCo Nigeria',urgent:false},
      {title:'Deep Cleaner for Office Block',category:'Cleaning',location:'Abuja',budget:8000,duration:'1 day',description:'Professional cleaner needed for a thorough deep-clean of a 3-floor office building in Garki. Cleaning materials and equipment must be supplied.',employer:'Federal Admin Services',urgent:false},
      {title:'Mason for Foundation Laying',category:'Masonry',location:'Enugu',budget:60000,duration:'1 week',description:'Experienced block-layer needed for foundation and ground-floor work on a new residential project in GRA Enugu. Concrete and blocks supplied.',employer:'BuildRight Construction',urgent:true},
      {title:'Welder for Security Gate Fabrication',category:'Welding',location:'Lagos',budget:35000,duration:'2 days',description:'Skilled welder needed to fabricate and install a heavy-duty steel security gate at a residential property in Ikeja. Design agreed in advance.',employer:'SecureHome Ltd',urgent:false}
    ].forEach(function(j){
      var id = 'j_' + j.category.slice(0,3).toLowerCase() + '_' + Math.random().toString(36).slice(2,5);
      j.jobId = id; j.status = 'open'; j.employerId = 'cli_demo';
      j.date = new Date().toLocaleDateString('en-GB');
      j.createdAt = new Date().toISOString();
      this._d.jobs[id] = j;
    }.bind(this));
    this._save();
  },

  /* User CRUD */
  getUserByEmail:    function(e) { return Object.values(this._d.users).find(function(u){return u.email===e.toLowerCase();})||null; },
  getUserByUsername: function(u) { return Object.values(this._d.users).find(function(x){return x.username===u.toLowerCase();})||null; },
  getUserById:       function(id){ return this._d.users[id]||null; },
  getAllArtisans:     function()  { return Object.values(this._d.users).filter(function(u){return u.role==='artisan';}); },
  getAllClients:      function()  { return Object.values(this._d.users).filter(function(u){return u.role==='client';}); },

  createUser: function(data) {
    var uid = this._uid('u');
    var u = Object.assign({}, data, {
      userId:uid, password:this._hash(data.password),
      status:'active', createdAt:new Date().toISOString(),
      profileImage:null, cv:null, cvName:null
    });
    this._d.users[uid] = u; this._save(); return u;
  },

  updateUser: function(uid, changes) {
    if (!this._d.users[uid]) return null;
    Object.assign(this._d.users[uid], changes);
    this._save(); return this._d.users[uid];
  },

  deleteUser: function(uid) {
    if (!this._d.users[uid]) return false;
    delete this._d.users[uid];
    var d = this._d;
    Object.keys(d.applications).forEach(function(k){var a=d.applications[k];if(a.artisanId===uid||a.clientId===uid)delete d.applications[k];});
    Object.keys(d.jobs).forEach(function(k){if(d.jobs[k].employerId===uid)delete d.jobs[k];});
    this._save(); return true;
  },

  verifyPW: function(uid,pw)     { var u=this._d.users[uid]; return u&&u.password===this._hash(pw); },
  verifySecA: function(uid,ans)  { var u=this._d.users[uid]; return u&&u.securityAnswer===this._hash(ans.toLowerCase().trim()); },

  /* Job CRUD */
  getAllJobs: function()    { return Object.values(this._d.jobs).sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);}); },
  getJobsByCat: function(c) { return Object.values(this._d.jobs).filter(function(j){return j.category===c&&j.status==='open';}).sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);}); },
  getJobById: function(id)  { return this._d.jobs[id]||null; },
  getJobsByEmp: function(eid){ return Object.values(this._d.jobs).filter(function(j){return j.employerId===eid;}); },

  createJob: function(data) {
    var jid = this._uid('j');
    var j = Object.assign({},data,{jobId:jid,status:'open',createdAt:new Date().toISOString()});
    this._d.jobs[jid]=j; this._save(); return j;
  },

  /* Applications */
  hasApplied: function(aid,jid) { return Object.values(this._d.applications).some(function(a){return a.artisanId===aid&&a.jobId===jid;}); },
  getAppsByArtisan: function(aid){ return Object.values(this._d.applications).filter(function(a){return a.artisanId===aid;}); },
  getAppsByJob: function(jid)    { return Object.values(this._d.applications).filter(function(a){return a.jobId===jid;}); },

  createApp: function(aid,jid) {
    var id = this._uid('ap');
    var a = {applicationId:id,artisanId:aid,jobId:jid,status:'pending',createdAt:new Date().toISOString()};
    this._d.applications[id]=a; this._save(); return a;
  },

  /* Reports */
  createReport: function(data) {
    var id = this._uid('r');
    var r = Object.assign({},data,{reportId:id,status:'pending',createdAt:new Date().toISOString()});
    this._d.reports[id]=r; this._save(); return r;
  },
  getAllReports: function()   { return Object.values(this._d.reports).sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);}); },
  resolveReport: function(id){ if(this._d.reports[id]){this._d.reports[id].status='resolved';this._save();return true;}return false; },

  /* Session */
  setSession:   function(uid){ localStorage.setItem('pxsess_v4',uid); },
  getSession:   function()   { return localStorage.getItem('pxsess_v4'); },
  clearSession: function()   { localStorage.removeItem('pxsess_v4'); }
};

/* ===================== STATE ===================== */
var currentUser   = null;
var currentRole   = 'artisan';
var forgotUID     = null;
var pendingRegPic = null;   // base64 – set during registration
var pendingNewPic = null;   // base64 – set when updating photo
var pendingCVData = null;   // { data, name } – set during registration

/* ===================== INIT ===================== */
window.addEventListener('DOMContentLoaded', function () {
  ProxiDB.init();
  ProxiDB.clearSession(); // Always start fresh — welcome screen on every page load
  setTimeout(function () { showScreen('welcome'); }, 2000);
});

/* ===================== SCREEN NAVIGATION ===================== */
var SCREEN_MAP = {
  splash:'splashScreen', welcome:'welcomeScreen', register:'registerScreen',
  login:'loginScreen', forgot:'forgotScreen', main:'mainApp', admin:'adminApp'
};

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  var id = SCREEN_MAP[name] || name;
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ===================== ROLE SELECTION ===================== */
function selectRole(role) {
  currentRole = role;
  pendingRegPic = null; pendingCVData = null;
  // Reset registration avatar
  var av = g('regAvPrev');
  av.innerHTML = '<span id="regAvInit" class="av-init">&#128247;</span>';

  g('regTitle').textContent = role === 'artisan' ? 'Create Artisan Account' : 'Create Client Account';
  g('artisanFields').style.display = role === 'artisan' ? 'block' : 'none';
  g('clientFields').style.display  = role === 'client'  ? 'block' : 'none';

  // Clear all registration fields
  ['rFirst','rLast','rUsername','rEmail','rPhone','rRate','rBusiness','rSecA','rPass','rConfirm'].forEach(function(id){ var el=g(id); if(el) el.value=''; });
  g('rCity').value=''; g('rQual').value=''; g('rCategory').value=''; g('rSecQ').value='';
  g('rTerms').checked = false;
  g('rCV').value = ''; g('cvLabel').textContent = 'No file selected';
  clearErr('regErr');

  showScreen('register');
  // Scroll register screen to top
  var body = document.querySelector('#registerScreen .screen-body');
  if (body) body.scrollTop = 0;
}

/* ===================== SHOW/HIDE PASSWORD ===================== */
function togglePW(inputId, btn) {
  var inp = g(inputId);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; btn.innerHTML = '&#128584;'; }
  else { inp.type = 'password'; btn.innerHTML = '&#128065;'; }
}

/* ===================== PHOTO / FILE PREVIEWS ===================== */
function previewRegPhoto(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (!file.type.startsWith('image/')) { showToast('Please select an image file.'); return; }
  resizeImg(file, 200, function (b64) {
    pendingRegPic = b64;
    g('regAvPrev').innerHTML = '<img src="' + b64 + '" alt="photo">';
  });
}

function previewCV(input) {
  var lbl = g('cvLabel');
  if (!input.files || !input.files[0]) { lbl.textContent = 'No file selected'; return; }
  var file = input.files[0];
  if (file.type !== 'application/pdf') { showToast('Please select a PDF file.'); input.value=''; return; }
  if (file.size > 1048576) { showToast('CV must be under 1MB.'); input.value=''; return; }
  lbl.textContent = file.name + ' (' + (file.size/1024).toFixed(0) + ' KB)';
  var rd = new FileReader();
  rd.onload = function(e){ pendingCVData = {data:e.target.result, name:file.name}; };
  rd.readAsDataURL(file);
}

function resizeImg(file, px, cb) {
  var rd = new FileReader();
  rd.onload = function(e){
    var img = new Image();
    img.onload = function(){
      var cv = document.createElement('canvas');
      cv.width = px; cv.height = px;
      var ctx = cv.getContext('2d');
      var s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, px, px);
      cb(cv.toDataURL('image/jpeg', 0.75));
    };
    img.src = e.target.result;
  };
  rd.readAsDataURL(file);
}

/* ===================== REGISTRATION ===================== */
function handleRegister() {
  var first = g('rFirst').value.trim();
  var last  = g('rLast').value.trim();
  var uname = g('rUsername').value.trim().toLowerCase().replace(/\s+/g,'');
  var email = g('rEmail').value.trim().toLowerCase();
  var phone = g('rPhone').value.trim();
  var city  = g('rCity').value;
  var secQ  = g('rSecQ').value;
  var secA  = g('rSecA').value.trim();
  var pass  = g('rPass').value;
  var conf  = g('rConfirm').value;
  var terms = g('rTerms').checked;
  clearErr('regErr');

  if (!first || !last || !uname || !email || !phone || !city || !secQ || !secA || !pass || !conf) {
    return showErr('regErr', 'Please fill in all required fields (marked with *).');
  }
  if (uname.length < 3) return showErr('regErr', 'Username must be at least 3 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr('regErr', 'Please enter a valid email address.');
  if (pass !== conf) return showErr('regErr', 'Passwords do not match. Please re-enter.');
  if (pass.length < 8) return showErr('regErr', 'Password must be at least 8 characters.');
  if (!terms) return showErr('regErr', 'You must accept the Terms and Conditions to create an account.');

  if (ProxiDB.getUserByEmail(email)) {
    return showErr('regErr', 'This email address is already linked to an existing account. Each email may only be used for one account.');
  }
  if (ProxiDB.getUserByUsername(uname)) {
    return showErr('regErr', 'This username is already taken. Please choose a different username.');
  }

  var qual='', cat='', rate='', cvD=null, cvN=null, biz='';

  if (currentRole === 'artisan') {
    qual = g('rQual').value;
    cat  = g('rCategory').value;
    rate = g('rRate').value;
    if (!qual || qual === 'none') {
      return showErr('regErr', 'Artisans must hold a minimum SSCE/WAEC qualification to register on ProxiCraft. Applicants without this qualification do not meet the platform\'s eligibility requirements.');
    }
    if (!cat) return showErr('regErr', 'Please select your trade / skill category.');
    if (pendingCVData) { cvD = pendingCVData.data; cvN = pendingCVData.name; }
  } else {
    biz = g('rBusiness').value.trim();
  }

  var newUser = ProxiDB.createUser({
    firstName:first, lastName:last, username:uname, email:email,
    phone:phone, city:city, role:currentRole,
    qualification:qual, category:cat, rate:rate,
    business:biz, cv:cvD, cvName:cvN,
    profileImage:pendingRegPic || null,
    securityQuestion:secQ,
    securityAnswer:ProxiDB._hash(secA.toLowerCase().trim()),
    termsAccepted:true
  });

  doLogin(newUser);
  showToast('Welcome to ProxiCraft, ' + first + '!');
}

/* ===================== LOGIN ===================== */
function handleLogin() {
  var email = g('lEmail').value.trim().toLowerCase();
  var pass  = g('lPass').value;
  clearErr('logErr');
  if (!email || !pass) return showErr('logErr', 'Please enter your email and password.');

  var user = ProxiDB.getUserByEmail(email);
  if (!user) return showErr('logErr', 'No account found with this email address.');
  if (!ProxiDB.verifyPW(user.userId, pass)) return showErr('logErr', 'Incorrect password. Please try again.');
  if (user.status === 'suspended') {
    return showErr('logErr', 'Your account has been suspended by the administrator. Please contact ProxiCraft support.');
  }
  doLogin(user);
}

function doLogin(user) {
  currentUser = user;
  currentRole = user.role;
  ProxiDB.setSession(user.userId);
  if (user.role === 'admin') { showScreen('admin'); loadAdmin(); }
  else { showScreen('main'); loadMainApp(); }
}

function handleLogout() {
  ProxiDB.clearSession();
  currentUser = null;
  // Reset login form
  g('lEmail').value=''; g('lPass').value=''; clearErr('logErr');
  showScreen('welcome');
  showToast('You have been signed out successfully.');
}

/* ===================== FORGOT PASSWORD ===================== */
function showForgotStep(n) {
  [1,2,3].forEach(function(i){
    var s = g('fStep'+i); if(s) s.style.display = (i===n?'block':'none');
    var dot = g('stepDot'+i);
    if(dot){dot.classList.toggle('active',i===n);dot.classList.toggle('done',i<n);}
    var line = g('stepLine'+i);
    if(line) line.classList.toggle('done',i<n);
  });
}

function forgotStep1() {
  var email = g('fEmail').value.trim().toLowerCase();
  clearErr('fErr1');
  if (!email) return showErr('fErr1','Please enter your email address.');
  var user = ProxiDB.getUserByEmail(email);
  if (!user || user.role==='admin') return showErr('fErr1','No user account found with this email address.');
  forgotUID = user.userId;
  g('fQuestion').value = user.securityQuestion;
  g('fAnswer').value = '';
  showForgotStep(2);
}

function forgotStep2() {
  var ans = g('fAnswer').value.trim();
  clearErr('fErr2');
  if (!ans) return showErr('fErr2','Please type your security answer.');
  if (!ProxiDB.verifySecA(forgotUID, ans)) return showErr('fErr2','Incorrect answer. Please try again.');
  g('fNew').value=''; g('fNewConfirm').value='';
  showForgotStep(3);
}

function forgotStep3() {
  var np = g('fNew').value;
  var nc = g('fNewConfirm').value;
  clearErr('fErr3');
  if (!np || !nc) return showErr('fErr3','Please enter and confirm your new password.');
  if (np.length < 8) return showErr('fErr3','Password must be at least 8 characters.');
  if (np !== nc) return showErr('fErr3','Passwords do not match.');
  ProxiDB.updateUser(forgotUID,{password:ProxiDB._hash(np)});
  forgotUID = null;
  g('fEmail').value=''; g('fAnswer').value=''; g('fNew').value=''; g('fNewConfirm').value='';
  showForgotStep(1);
  showToast('Password reset successfully! Please sign in with your new password.');
  showScreen('login');
}

// Initialise forgot screen on page load
(function(){ setTimeout(function(){ showForgotStep(1); }, 100); })();

/* ===================== TERMS ===================== */
function openTerms()     { g('termsModal').style.display='flex'; }
function closeTerms()    { g('termsModal').style.display='none'; }
function closeTermsOv(e) { if(e.target===g('termsModal')) closeTerms(); }

/* ===================== MAIN APP ===================== */
function loadMainApp() {
  currentUser = ProxiDB.getUserById(currentUser.userId);
  var h = new Date().getHours();
  var greet = h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  g('greetMsg').textContent  = greet + '!';
  g('greetName').textContent = currentUser.firstName + ' ' + currentUser.lastName;

  var badge = g('hdrBadge');
  badge.textContent = currentRole==='artisan'?'Artisan':'Client';
  badge.className   = 'role-badge ' + currentRole;

  if (currentRole === 'artisan') {
    g('artisanNotice').style.display='block';
    g('artisanNotice').textContent = '&#128119; Showing ' + currentUser.category + ' jobs only. You can apply only for jobs matching your registered trade.';
    g('appsPanel').style.display='block'; g('postPanel').style.display='none';
    g('workIco').innerHTML='&#128203;'; g('workLbl').textContent='Applied';
    g('catFilter').value=currentUser.category; g('catFilter').disabled=true;
  } else {
    g('artisanNotice').style.display='none';
    g('appsPanel').style.display='none'; g('postPanel').style.display='block';
    g('workIco').innerHTML='&#43;'; g('workLbl').textContent='Post';
    g('catFilter').disabled=false;
  }

  renderHomeJobs(); doSearch(); loadProfile(); switchTab('home');
}

function switchTab(tab) {
  ['home','search','work','profile'].forEach(function(t){
    g(t+'Page').classList.remove('active');
    g('bn'+t.charAt(0).toUpperCase()+t.slice(1)).classList.remove('active');
  });
  g(tab+'Page').classList.add('active');
  g('bn'+tab.charAt(0).toUpperCase()+tab.slice(1)).classList.add('active');
  if (tab==='work')    { if(currentRole==='artisan') renderMyApps(); else renderMyJobs(); }
  if (tab==='profile') loadProfile();
}

function switchPostTab(t) {
  g('ptPost').classList.toggle('active', t==='post');
  g('ptMy').classList.toggle('active',   t==='my');
  g('postFormDiv').style.display = t==='post'?'block':'none';
  g('myJobsDiv').style.display   = t==='my'?'block':'none';
  if (t==='my') renderMyJobs();
}

/* ===================== HOME JOBS ===================== */
function renderHomeJobs() {
  var jobs = currentRole==='artisan'
    ? ProxiDB.getJobsByCat(currentUser.category)
    : ProxiDB.getAllJobs();
  g('homeCount').textContent = jobs.length + ' job'+(jobs.length!==1?'s':'');
  renderJobGrid(jobs,'homeGrid');
}

/* ===================== SEARCH ===================== */
function doSearch() {
  var q   = (g('srchInput').value||'').trim().toLowerCase();
  var cat = g('catFilter').value;
  var loc = g('locFilter').value;

  // Force artisan category
  if (currentUser && currentRole==='artisan') {
    cat = currentUser.category;
    g('catFilter').value = cat;
  }

  var res = ProxiDB.getAllJobs().filter(function(j){
    return (!q || j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q))
        && (!cat || j.category===cat)
        && (!loc || j.location===loc);
  });
  g('srchInfo').textContent = res.length + ' job'+(res.length!==1?'s':'')+' found';
  renderJobGrid(res,'srchGrid');
}

/* ===================== RENDER JOB CARDS ===================== */
function renderJobGrid(jobs, cid) {
  var el = g(cid);
  if (!jobs||!jobs.length) {
    el.innerHTML='<div class="empty-state"><p>No jobs found.</p><p>Try changing your search filters.</p></div>';
    return;
  }
  el.innerHTML = jobs.map(function(job){
    return '<div class="job-card" onclick="viewJob(\''+job.jobId+'\')">'+
      (job.urgent?'<span class="urgent-tag">Urgent</span>':'')+
      '<div class="job-title">'+esc(job.title)+'</div>'+
      '<span class="cat-badge">'+esc(job.category)+'</span>'+
      '<div class="job-meta"><span>&#128205; '+esc(job.location)+'</span><span>&#8987; '+esc(job.duration)+'</span></div>'+
      '<div class="job-footer"><span class="job-budget">&#8358;'+Number(job.budget).toLocaleString()+'</span><span class="view-link">View &#8594;</span></div>'+
      '</div>';
  }).join('');
}

/* ===================== JOB DETAIL MODAL ===================== */
function viewJob(jid) {
  var job = ProxiDB.getJobById(jid); if(!job) return;
  var isApplied = currentUser && ProxiDB.hasApplied(currentUser.userId,jid);
  var isOwn     = currentUser && job.employerId===currentUser.userId;
  var catOK     = currentUser && currentRole==='artisan' && job.category===currentUser.category;

  var html =
    '<div class="detail-title">'+esc(job.title)+'</div>'+
    '<div class="detail-meta"><span class="cat-badge">'+esc(job.category)+'</span>'+
    (job.urgent?'<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:#FEE2E2;color:#DC2626">Urgent</span>':'')+
    '</div>'+
    '<div class="d-row"><span class="dil">&#128205; Location</span><span>'+esc(job.location)+'</span></div>'+
    '<div class="d-row"><span class="dil">&#8358; Budget</span><span style="color:#16A34A;font-weight:800">&#8358;'+Number(job.budget).toLocaleString()+'</span></div>'+
    '<div class="d-row"><span class="dil">&#8987; Duration</span><span>'+esc(job.duration)+'</span></div>'+
    '<div class="d-row"><span class="dil">&#127970; Employer</span><span>'+esc(job.employer)+'</span></div>'+
    '<div class="d-row"><span class="dil">&#128197; Posted</span><span>'+esc(job.date)+'</span></div>'+
    '<div class="det-desc"><h4>Description</h4><p>'+esc(job.description)+'</p></div>';

  if (currentRole==='artisan') {
    if (!catOK) {
      html += '<div class="restrict-note">&#128683; This job requires a <strong>'+esc(job.category)+'</strong> artisan. Your registered trade is <strong>'+esc(currentUser.category)+'</strong>. You can only apply for jobs in your registered trade.</div>';
    } else if (isApplied) {
      html += '<div class="applied-tag-lg">&#10003; You have already applied for this job.</div>';
    } else {
      html += '<button class="apply-btn" onclick="applyForJob(\''+jid+'\')">Apply for This Job</button>';
    }
    html += '<button class="report-job-btn" onclick="openReportModal(\''+job.employerId+'\',\''+esc(job.employer)+'\')">&#9888; Report This Employer</button>';
  } else if (currentRole==='client' && !isOwn) {
    html += '<button class="report-job-btn" onclick="closeJobModal()">&#128272; Contact for this job</button>';
  } else if (isOwn) {
    var appCount = ProxiDB.getAppsByJob(jid).length;
    html += '<div class="applied-tag-lg">&#128204; You posted this job &bull; '+appCount+' applicant'+(appCount!==1?'s':'')+'</div>';
  }

  g('jobModalBody').innerHTML = html;
  g('jobModal').style.display = 'flex';
}

function closeJobModal()  { g('jobModal').style.display='none'; }
function closeJobOv(e)    { if(e.target===g('jobModal')) closeJobModal(); }

/* ===================== APPLY ===================== */
function applyForJob(jid) {
  var job = ProxiDB.getJobById(jid);
  if (!job) return;
  if (job.category !== currentUser.category) {
    return showToast('You can only apply for '+currentUser.category+' jobs.');
  }
  if (ProxiDB.hasApplied(currentUser.userId,jid)) {
    return showToast('You have already applied for this job.');
  }
  ProxiDB.createApp(currentUser.userId,jid);
  closeJobModal();
  showToast('Application submitted successfully!');
  setTimeout(function(){viewJob(jid);},400);
}

/* ===================== POST JOB ===================== */
function handlePostJob() {
  var t=g('pTitle').value.trim(), c=g('pCat').value, l=g('pLoc').value,
      b=g('pBudget').value, d=g('pDuration').value.trim(), desc=g('pDesc').value.trim();
  clearErr('postErr');
  if (!t||!c||!l||!b||!d||!desc) return showErr('postErr','Please fill in all required fields.');
  if (Number(b)<500) return showErr('postErr','Please enter a valid budget (minimum &#8358;500).');

  ProxiDB.createJob({
    title:t, category:c, location:l, budget:Number(b), duration:d,
    description:desc, urgent:g('pUrgent').checked,
    employer:currentUser.business||currentUser.firstName+' '+currentUser.lastName,
    employerId:currentUser.userId, date:new Date().toLocaleDateString('en-GB')
  });
  ['pTitle','pBudget','pDuration','pDesc'].forEach(function(id){g(id).value='';});
  g('pCat').value=''; g('pLoc').value=''; g('pUrgent').checked=false;
  renderHomeJobs();
  showToast('Job posted successfully! It is now live.');
  switchTab('home');
}

/* ===================== MY APPLICATIONS ===================== */
function renderMyApps() {
  var apps = ProxiDB.getAppsByArtisan(currentUser.userId);
  g('appsCount').textContent = apps.length;
  var list = g('appsList');
  if (!apps.length) {
    list.innerHTML='<div class="empty-state"><p>No applications yet.</p><p>Browse '+currentUser.category+' jobs and tap Apply.</p></div>';
    return;
  }
  list.innerHTML = apps.map(function(app){
    var job = ProxiDB.getJobById(app.jobId); if(!job) return '';
    return '<div class="app-card" onclick="viewJob(\''+job.jobId+'\')">'+
      '<div class="app-top"><span class="cat-badge">'+esc(job.category)+'</span><span class="app-tag">Applied &#10003;</span></div>'+
      '<h4>'+esc(job.title)+'</h4>'+
      '<div class="job-meta"><span>&#128205; '+esc(job.location)+'</span><span style="color:#16A34A;font-weight:700">&#8358;'+Number(job.budget).toLocaleString()+'</span></div>'+
      '</div>';
  }).join('');
}

/* ===================== MY POSTED JOBS ===================== */
function renderMyJobs() {
  var jobs = ProxiDB.getJobsByEmp(currentUser.userId);
  var list = g('myJobsList');
  if (!jobs.length) { list.innerHTML='<div class="empty-state"><p>You have not posted any jobs yet.</p></div>'; return; }
  list.innerHTML = jobs.map(function(job){
    var apps = ProxiDB.getAppsByJob(job.jobId).length;
    return '<div class="job-card">'+
      '<div class="job-title">'+esc(job.title)+'</div>'+
      '<span class="cat-badge">'+esc(job.category)+'</span>'+
      '<div class="job-meta"><span>&#128205; '+esc(job.location)+'</span><span>&#128101; '+apps+' applicant'+(apps!==1?'s':'')+'</span></div>'+
      '<div class="job-footer"><span class="job-budget">&#8358;'+Number(job.budget).toLocaleString()+'</span><span class="view-link">'+esc(job.date)+'</span></div>'+
      '</div>';
  }).join('');
}

/* ===================== PROFILE ===================== */
function loadProfile() {
  currentUser = ProxiDB.getUserById(currentUser.userId);
  var initials = currentUser.firstName.charAt(0)+currentUser.lastName.charAt(0);
  var av = g('profAv');
  if (currentUser.profileImage) av.innerHTML='<img src="'+currentUser.profileImage+'" alt="photo">';
  else av.textContent = initials.toUpperCase();
  av.className = 'prof-av'+(currentRole==='client'?' client-av':'');

  g('profName').textContent = currentUser.firstName+' '+currentUser.lastName;
  var badge=g('profBadge'); badge.textContent=currentRole==='artisan'?'Artisan':'Client'; badge.className='role-badge '+currentRole;

  g('pUser').textContent  = '@'+currentUser.username;
  g('pEmail').textContent = currentUser.email;
  g('pPhone').textContent = currentUser.phone;
  g('pCity').textContent  = currentUser.city;
  g('pSince').textContent = new Date(currentUser.createdAt).toLocaleDateString('en-GB');

  if (currentRole==='artisan') {
    ['aRow1','aRow2','aRow3'].forEach(function(r){g(r).style.display='flex';});
    g('cRow1').style.display='none';
    g('pCat').textContent  = currentUser.category;
    g('pQual').textContent = qualLabel(currentUser.qualification);
    g('pCv').textContent   = currentUser.cvName ? currentUser.cvName+' (uploaded)' : 'No CV uploaded';
    g('cvSection').style.display='block';
    g('profCVLabel').textContent = currentUser.cvName||'No CV uploaded';

    var cnt = ProxiDB.getAppsByArtisan(currentUser.userId).length;
    g('sv1').textContent=cnt; g('sl1').textContent='Applications';
    g('sv2').innerHTML=currentUser.rate?'&#8358;'+Number(currentUser.rate).toLocaleString():'N/A';
    g('sl2').textContent='Daily Rate';
  } else {
    ['aRow1','aRow2','aRow3'].forEach(function(r){g(r).style.display='none';});
    g('cRow1').style.display='flex'; g('cvSection').style.display='none';
    g('pBiz').textContent = currentUser.business||'Not specified';
    var mj = ProxiDB.getJobsByEmp(currentUser.userId).length;
    g('sv1').textContent=mj; g('sl1').textContent='Jobs Posted';
    g('sv2').textContent='0'; g('sl2').textContent='Hired';
  }
}

function uploadCV(input) {
  if (!input.files||!input.files[0]) return;
  var file=input.files[0];
  if (file.type!=='application/pdf') { showToast('Please select a PDF file.'); input.value=''; return; }
  if (file.size>1048576) { showToast('CV file must be under 1MB.'); input.value=''; return; }
  var rd=new FileReader();
  rd.onload=function(e){
    ProxiDB.updateUser(currentUser.userId,{cv:e.target.result,cvName:file.name});
    currentUser=ProxiDB.getUserById(currentUser.userId);
    g('profCVLabel').textContent=file.name+' (uploaded)';
    g('pCv').textContent=file.name+' (uploaded)';
    showToast('CV uploaded successfully!');
  };
  rd.readAsDataURL(file);
}

/* ===================== PROFILE IMAGE UPDATE ===================== */
function openImgModal() {
  pendingNewPic = currentUser.profileImage||null;
  var prev=g('imgPreview');
  if (pendingNewPic) prev.innerHTML='<img src="'+pendingNewPic+'" alt="photo">';
  else { prev.innerHTML=''; prev.textContent=currentUser.firstName.charAt(0)+currentUser.lastName.charAt(0); }
  clearErr('imgErr');
  g('imgInput').value='';
  g('imgModal').style.display='flex';
}

function previewNewPhoto(input) {
  if (!input.files||!input.files[0]) return;
  var file=input.files[0];
  if (!file.type.startsWith('image/')) { showErr('imgErr','Please select an image file.'); return; }
  resizeImg(file,200,function(b64){ pendingNewPic=b64; g('imgPreview').innerHTML='<img src="'+b64+'" alt="preview">'; });
}

function savePhoto() {
  if (!pendingNewPic) { showErr('imgErr','Please choose a photo first.'); return; }
  ProxiDB.updateUser(currentUser.userId,{profileImage:pendingNewPic});
  currentUser=ProxiDB.getUserById(currentUser.userId);
  closeImgModal(); loadProfile(); showToast('Profile photo updated!');
}

function closeImgModal() { g('imgModal').style.display='none'; pendingNewPic=null; }

/* ===================== REPORT SYSTEM ===================== */
function openReportModal(uid,label) {
  g('reportedId').value=uid;
  g('reportTarget').textContent='You are reporting: '+label;
  g('repReason').value=''; g('repDetails').value='';
  clearErr('repErr');
  g('reportModal').style.display='flex';
}

function closeReportModal() { g('reportModal').style.display='none'; }

function submitReport() {
  var rid=g('reportedId').value, reason=g('repReason').value, details=g('repDetails').value.trim();
  clearErr('repErr');
  if (!reason)  return showErr('repErr','Please select a reason for this report.');
  if (!details) return showErr('repErr','Please provide details describing the issue.');
  var rep = ProxiDB.getUserById(rid);
  ProxiDB.createReport({
    reporterId:currentUser.userId,
    reporterName:currentUser.firstName+' '+currentUser.lastName,
    reportedId:rid,
    reportedName:rep?(rep.firstName+' '+rep.lastName):'Unknown',
    reason:reason, details:details
  });
  closeReportModal();
  showToast('Report submitted. The admin team will review it within 48 hours.');
}

/* ===================== ACCOUNT DELETION ===================== */
function openDeleteModal()  { g('delPass').value=''; g('delChk').checked=false; clearErr('delErr'); g('deleteModal').style.display='flex'; }
function closeDeleteModal() { g('deleteModal').style.display='none'; }

function confirmDelete() {
  var pass=g('delPass').value, chk=g('delChk').checked;
  clearErr('delErr');
  if (!pass) return showErr('delErr','Please enter your password to confirm.');
  if (!chk)  return showErr('delErr','Please tick the confirmation checkbox.');
  if (!ProxiDB.verifyPW(currentUser.userId,pass)) return showErr('delErr','Incorrect password.');
  var uid = currentUser.userId;
  ProxiDB.clearSession(); ProxiDB.deleteUser(uid);
  currentUser=null;
  closeDeleteModal(); showScreen('welcome');
  showToast('Your account has been permanently deleted.');
}

/* ===================== ADMIN PANEL ===================== */
function loadAdmin() { renderAdminDashboard(); switchAdminTab('dash'); }

function switchAdminTab(tab) {
  ['dash','artisans','clients','reports','jobs'].forEach(function(t){
    g('ad'+cap(t)).classList.remove('active');
    g('an'+cap(t)).classList.remove('active');
  });
  g('ad'+cap(tab)).classList.add('active');
  g('an'+cap(tab)).classList.add('active');
  if (tab==='dash')     renderAdminDashboard();
  if (tab==='artisans') renderAdminUsers('artisan');
  if (tab==='clients')  renderAdminUsers('client');
  if (tab==='reports')  renderAdminReports();
  if (tab==='jobs')     renderAdminJobs();
}

function renderAdminDashboard() {
  g('dc1').textContent = ProxiDB.getAllArtisans().length;
  g('dc2').textContent = ProxiDB.getAllClients().length;
  g('dc3').textContent = ProxiDB.getAllJobs().length;
  g('dc4').textContent = ProxiDB.getAllReports().filter(function(r){return r.status==='pending';}).length;

  var recent = ProxiDB.getAllArtisans().concat(ProxiDB.getAllClients())
    .sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);}).slice(0,5);

  g('dashRecent').innerHTML = recent.length ? recent.map(function(u){
    return adminUserCard(u, false);
  }).join('') : '<div class="empty-state"><p>No registered users yet.</p></div>';
}

function renderAdminUsers(role) {
  var sid  = role==='artisan'?'artSrch':'cliSrch';
  var cid  = role==='artisan'?'artisanList':'clientList';
  var q    = (g(sid).value||'').toLowerCase();
  var list = role==='artisan'?ProxiDB.getAllArtisans():ProxiDB.getAllClients();
  if (q) list = list.filter(function(u){
    return (u.firstName+' '+u.lastName).toLowerCase().includes(q)||u.email.includes(q)||u.username.includes(q);
  });
  g(cid).innerHTML = list.length ? list.map(function(u){ return adminUserCard(u,true); }).join('') :
    '<div class="empty-state"><p>No '+role+'s found.</p></div>';
}

function adminUserCard(u, withActions) {
  var initials = u.firstName.charAt(0)+u.lastName.charAt(0);
  var avHtml = u.profileImage ? '<img src="'+u.profileImage+'" alt="">' : initials.toUpperCase();
  return '<div class="a-user-card'+(u.status==='suspended'?' suspended':'')+'">'+
    '<div class="auc-av'+(u.role==='client'?' ca':'')+'">' + avHtml + '</div>'+
    '<div class="auc-info">'+
      '<div class="auc-name">'+esc(u.firstName)+' '+esc(u.lastName)+'</div>'+
      '<div class="auc-sub">@'+esc(u.username)+' &bull; '+esc(u.city)+(u.role==='artisan'?' &bull; '+esc(u.category):'')+
      ' &bull; <span class="sta-'+u.status+'">'+cap(u.status)+'</span></div>'+
    '</div>'+
    (withActions?
    '<div class="auc-btns">'+
      '<button class="btn-vw" onclick="viewUserDetail(\''+u.userId+'\')">View</button>'+
      (u.status==='active'?
        '<button class="btn-sus" onclick="adminSuspend(\''+u.userId+'\')">Suspend</button>':
        '<button class="btn-rei" onclick="adminReinstate(\''+u.userId+'\')">Reinstate</button>')+
    '</div>':'')+
    '</div>';
}

function adminSuspend(uid) {
  ProxiDB.updateUser(uid,{status:'suspended'});
  renderAdminDashboard(); renderAdminUsers(ProxiDB.getUserById(uid).role);
  showToast('Account suspended.');
}

function adminReinstate(uid) {
  ProxiDB.updateUser(uid,{status:'active'});
  renderAdminDashboard(); renderAdminUsers(ProxiDB.getUserById(uid).role);
  showToast('Account reinstated.');
}

function viewUserDetail(uid) {
  var u=ProxiDB.getUserById(uid); if(!u) return;
  var apps = u.role==='artisan'?ProxiDB.getAppsByArtisan(uid).length:0;
  var jobs = u.role==='client'?ProxiDB.getJobsByEmp(uid).length:0;
  var initials=u.firstName.charAt(0)+u.lastName.charAt(0);
  var avHtml = u.profileImage?'<img src="'+u.profileImage+'" alt="">':initials.toUpperCase();

  g('userDetailBody').innerHTML =
    '<div class="ud-hdr"><div class="ud-av'+(u.role==='client'?' ca':'')+'">' + avHtml + '</div>'+
    '<div><div class="ud-name">'+esc(u.firstName)+' '+esc(u.lastName)+'</div>'+
    '<span class="role-badge '+u.role+'">'+cap(u.role)+'</span> '+
    '<span class="sta-'+u.status+'">'+cap(u.status)+'</span></div></div>'+
    '<div class="detail-card">'+
    drow('Username','@'+u.username)+drow('Email',u.email)+drow('Phone',u.phone)+drow('City',u.city)+
    (u.role==='artisan'?drow('Trade',u.category)+drow('Qualification',qualLabel(u.qualification))+drow('CV',u.cvName||'None'):'')+
    (u.role==='client'?drow('Business',u.business||'N/A'):'')+
    drow('Joined',new Date(u.createdAt).toLocaleDateString('en-GB'))+
    (u.role==='artisan'?drow('Applications',apps):'')+
    (u.role==='client'?drow('Jobs Posted',jobs):'')+
    '</div>';

  g('userDetailActions').innerHTML =
    '<button class="btn-outline" onclick="closeUserDetail()" style="flex:1">Close</button>'+
    (u.status==='active'?
      '<button class="btn-sus" style="flex:1;padding:11px" onclick="adminSuspend(\''+uid+'\');closeUserDetail()">Suspend</button>':
      '<button class="btn-rei" style="flex:1;padding:11px" onclick="adminReinstate(\''+uid+'\');closeUserDetail()">Reinstate</button>')+
    '<button class="btn-danger-sm" onclick="adminDeleteUser(\''+uid+'\')">Delete</button>';

  g('userDetailModal').style.display='flex';
}

function closeUserDetail() { g('userDetailModal').style.display='none'; }

function adminDeleteUser(uid) {
  if (!confirm('Permanently delete this account? This action cannot be undone.')) return;
  var u=ProxiDB.getUserById(uid);
  ProxiDB.deleteUser(uid);
  closeUserDetail(); renderAdminDashboard(); if(u) renderAdminUsers(u.role);
  showToast('Account permanently deleted.');
}

function renderAdminReports() {
  var f = g('repFilter').value;
  var reps = ProxiDB.getAllReports().filter(function(r){ return f==='all'||r.status===f; });
  g('reportsList').innerHTML = reps.length ? reps.map(function(r){
    return '<div class="rep-card'+(r.status==='resolved'?' resolved':'')+'">'+
      '<div class="rep-hdr"><div class="rep-title">'+esc(r.reason)+'</div>'+
      '<span class="rep-sta '+r.status+'">'+cap(r.status)+'</span></div>'+
      '<div class="rep-body">From: <strong>'+esc(r.reporterName)+'</strong> &rarr; Against: <strong>'+esc(r.reportedName)+'</strong><br>'+
      esc(r.details)+'<br><small>'+new Date(r.createdAt).toLocaleDateString('en-GB')+'</small></div>'+
      (r.status==='pending'?'<button class="btn-res" onclick="resolveReport(\''+r.reportId+'\')">&#10003; Mark Resolved</button>':'')+
      '</div>';
  }).join('') : '<div class="empty-state"><p>No reports found.</p></div>';
}

function resolveReport(rid) {
  ProxiDB.resolveReport(rid); renderAdminReports(); renderAdminDashboard();
  showToast('Report marked as resolved.');
}

function renderAdminJobs() {
  renderJobGrid(ProxiDB.getAllJobs(),'adminJobGrid');
}

/* ===================== UTILITIES ===================== */
function qualLabel(q) {
  var m={none:'None',ssce:'SSCE/WAEC/NECO',nabteb:'NABTEB',ond:'OND',hnd:'HND',bsc:'BSc/B.Tech',msc:'MSc/M.Tech',other:'Other Equivalent'};
  return m[q]||q||'Not specified';
}
function drow(lbl,val) {
  return '<div class="drow"><span class="dlbl">'+lbl+'</span><span class="dval">'+esc(String(val||''))+'</span></div>';
}
function cap(s) { return s?s.charAt(0).toUpperCase()+s.slice(1):''; }
function g(id)  { return document.getElementById(id); }
function showErr(id,msg)  { var e=g(id); if(e) e.innerHTML=msg; }
function clearErr(id)     { var e=g(id); if(e) e.textContent=''; }
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg) {
  var t=g('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},3500);
}
