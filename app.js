/* ================================================================
   ProxiCraft v2  –  Mobile Job-Matching Platform, Nigeria
   MSc Computing Dissertation – Edinburgh Napier University 2025
   All event handlers wired via addEventListener (no inline onclick)
   Compatible with older Android browsers (ES5-safe)
   ================================================================ */

/* ============================================================
   PROXIDB  –  localStorage database layer
   Uses Object.keys() not Object.values() for ES5 compatibility
   ============================================================ */
var ProxiDB = {
  _d: null,

  /* ---- helpers ---- */
  _vals: function (obj) {               /* Object.values polyfill */
    var arr = [], keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) arr.push(obj[keys[i]]);
    return arr;
  },

  _hash: function (str) {               /* djb2  –  no Math.imul */
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
      h = h & h;                        /* keep 32-bit integer */
    }
    return (h >>> 0).toString(16);
  },

  _uid: function (p) {
    return (p || 'x') + '_' + Date.now() + '_' +
           Math.random().toString(36).slice(2, 6);
  },

  /* ---- init ---- */
  init: function () {
    try {
      var raw = localStorage.getItem('pxdb_v5');
      this._d = raw ? JSON.parse(raw) : null;
    } catch (e) { this._d = null; }
    if (!this._d || !this._d.users) {
      this._d = { users: {}, jobs: {}, applications: {}, reports: {} };
      try { this._seed(); } catch (e) { /* seed failed; app still works */ }
    }
  },

  _save: function () {
    try { localStorage.setItem('pxdb_v5', JSON.stringify(this._d)); }
    catch (e) { showToast('Storage limit reached.'); }
  },

  _seed: function () {
    var now = new Date().toISOString();
    this._d.users['admin_001'] = {
      userId:'admin_001', username:'admin', email:'admin@proxicraft.ng',
      password:this._hash('Admin2025!'), role:'admin',
      firstName:'ProxiCraft', lastName:'Admin', phone:'08000000001',
      city:'Lagos', status:'active', createdAt:now,
      securityQuestion:'What is your favourite food?',
      securityAnswer:this._hash('rice'), profileImage:null
    };
    this._d.users['art_demo'] = {
      userId:'art_demo', username:'emeka_elec', email:'chukwu@example.com',
      password:this._hash('Artisan2025!'), role:'artisan',
      firstName:'Emeka', lastName:'Chukwu', phone:'08031234567',
      city:'Lagos', category:'Electrical', qualification:'ond',
      rate:'15000', status:'active', createdAt:now,
      securityQuestion:'What is the name of your primary school?',
      securityAnswer:this._hash('community school'),
      profileImage:null, cv:null, cvName:null, business:''
    };
    this._d.users['cli_demo'] = {
      userId:'cli_demo', username:'horizon_ng', email:'horizon@example.com',
      password:this._hash('Client2025!'), role:'client',
      firstName:'Horizon', lastName:'Properties', phone:'08098765432',
      city:'Abuja', business:'Horizon Properties Ltd', status:'active', createdAt:now,
      securityQuestion:"What is your mother's maiden name?",
      securityAnswer:this._hash('ibrahim'),
      profileImage:null, cv:null, cvName:null, category:''
    };
    var seedJobs = [
      {title:'Electrician for Office Rewiring',     category:'Electrical', location:'Lagos',         budget:25000, duration:'2 days',  description:'Certified electrician needed to rewire our office space on Victoria Island. Involves replacing sockets, fitting new light fittings, and circuit testing.',  employer:'TechSpace Nigeria Ltd',   urgent:true},
      {title:'Experienced Plumber for Pipe Repairs',category:'Plumbing',   location:'Abuja',         budget:15000, duration:'1 day',   description:'Plumber required to fix a burst pipe and replace two bathroom taps in a residential property at Maitama.',                                              employer:'Horizon Properties',      urgent:false},
      {title:'Carpenter for Custom Furniture',      category:'Carpentry',  location:'Port Harcourt', budget:45000, duration:'5 days',  description:'Skilled carpenter needed to build custom bookshelves, kitchen cabinet, and wardrobe. Designs provided.',                                              employer:'Green Home Interiors PH', urgent:false},
      {title:'Painter for 3-Bedroom Apartment',     category:'Painting',   location:'Lagos',         budget:30000, duration:'3 days',  description:'Full interior painting of a 3-bedroom flat in Surulere. Supply own brushes; paint provided by client.',                                              employer:'Private Client',          urgent:true},
      {title:'Auto Mechanic for Engine Service',    category:'Automobile', location:'Ibadan',        budget:20000, duration:'1 day',   description:'Experienced mechanic for full engine service, oil change, and brake pad replacement on a Toyota Corolla 2018.',                                    employer:'TransportCo Nigeria',     urgent:false},
      {title:'Deep Cleaner for Office Block',       category:'Cleaning',   location:'Abuja',         budget:8000,  duration:'1 day',   description:'Professional cleaner for a thorough deep-clean of a 3-floor office building in Garki. Bring own materials and equipment.',                          employer:'Federal Admin Services',  urgent:false},
      {title:'Mason for Foundation Laying',         category:'Masonry',    location:'Enugu',         budget:60000, duration:'1 week',  description:'Experienced block-layer for foundation laying and ground-floor work on a new residential project in GRA Enugu.',                                    employer:'BuildRight Construction', urgent:true},
      {title:'Welder for Security Gate',            category:'Welding',    location:'Lagos',         budget:35000, duration:'2 days',  description:'Skilled welder to fabricate and install a heavy-duty steel security gate at a residential property in Ikeja.',                                      employer:'SecureHome Ltd',          urgent:false}
    ];
    for (var k = 0; k < seedJobs.length; k++) {
      var j = seedJobs[k];
      var jid = 'j_' + j.category.slice(0,3).toLowerCase() + '_' + (k+1);
      j.jobId = jid; j.status = 'open'; j.employerId = 'cli_demo';
      j.date = new Date().toLocaleDateString('en-GB');
      j.createdAt = new Date().toISOString();
      this._d.jobs[jid] = j;
    }
    this._save();
  },

  /* ---- user CRUD ---- */
  getUserByEmail:    function (e) { var v = this._vals(this._d.users); for(var i=0;i<v.length;i++) if(v[i].email===e.toLowerCase()) return v[i]; return null; },
  getUserByUsername: function (u) { var v = this._vals(this._d.users); for(var i=0;i<v.length;i++) if(v[i].username===u.toLowerCase()) return v[i]; return null; },
  getUserById:       function (id){ return this._d.users[id] || null; },
  getAllArtisans:     function ()  { var v=this._vals(this._d.users),r=[]; for(var i=0;i<v.length;i++) if(v[i].role==='artisan') r.push(v[i]); return r; },
  getAllClients:      function ()  { var v=this._vals(this._d.users),r=[]; for(var i=0;i<v.length;i++) if(v[i].role==='client')  r.push(v[i]); return r; },

  createUser: function (data) {
    var uid = this._uid('u'), u = {};
    for (var k in data) u[k] = data[k];
    u.userId = uid; u.password = this._hash(data.password);
    u.status = 'active'; u.createdAt = new Date().toISOString();
    u.profileImage = null; u.cv = null; u.cvName = null;
    this._d.users[uid] = u; this._save(); return u;
  },

  updateUser: function (uid, changes) {
    if (!this._d.users[uid]) return null;
    for (var k in changes) this._d.users[uid][k] = changes[k];
    this._save(); return this._d.users[uid];
  },

  deleteUser: function (uid) {
    if (!this._d.users[uid]) return false;
    delete this._d.users[uid];
    var ak = Object.keys(this._d.applications);
    for (var i=0;i<ak.length;i++) { var a=this._d.applications[ak[i]]; if(a.artisanId===uid||a.clientId===uid) delete this._d.applications[ak[i]]; }
    var jk = Object.keys(this._d.jobs);
    for (var i=0;i<jk.length;i++) { if(this._d.jobs[jk[i]].employerId===uid) delete this._d.jobs[jk[i]]; }
    this._save(); return true;
  },

  verifyPW:  function (uid, pw)  { var u=this._d.users[uid]; return u && u.password===this._hash(pw); },
  verifySecA:function (uid, ans) { var u=this._d.users[uid]; return u && u.securityAnswer===this._hash(ans.toLowerCase().trim()); },

  /* ---- job CRUD ---- */
  getAllJobs: function () {
    var v = this._vals(this._d.jobs);
    v.sort(function(a,b){ return new Date(b.createdAt)-new Date(a.createdAt); });
    return v;
  },
  getJobsByCat: function (cat) {
    var v = this._vals(this._d.jobs), r = [];
    for (var i=0;i<v.length;i++) if(v[i].category===cat && v[i].status==='open') r.push(v[i]);
    r.sort(function(a,b){ return new Date(b.createdAt)-new Date(a.createdAt); });
    return r;
  },
  getJobById:   function (id)  { return this._d.jobs[id] || null; },
  getJobsByEmp: function (eid) { var v=this._vals(this._d.jobs),r=[]; for(var i=0;i<v.length;i++) if(v[i].employerId===eid) r.push(v[i]); return r; },
  createJob: function (data) {
    var jid = this._uid('j'), j = {};
    for (var k in data) j[k] = data[k];
    j.jobId = jid; j.status = 'open'; j.createdAt = new Date().toISOString();
    this._d.jobs[jid] = j; this._save(); return j;
  },

  /* ---- applications ---- */
  hasApplied:       function (aid,jid){ var v=this._vals(this._d.applications); for(var i=0;i<v.length;i++) if(v[i].artisanId===aid&&v[i].jobId===jid) return true; return false; },
  getAppsByArtisan: function (aid)    { var v=this._vals(this._d.applications),r=[]; for(var i=0;i<v.length;i++) if(v[i].artisanId===aid) r.push(v[i]); return r; },
  getAppsByJob:     function (jid)    { var v=this._vals(this._d.applications),r=[]; for(var i=0;i<v.length;i++) if(v[i].jobId===jid) r.push(v[i]); return r; },
  createApp: function (aid, jid) {
    var id=this._uid('ap'); this._d.applications[id]={applicationId:id,artisanId:aid,jobId:jid,status:'pending',createdAt:new Date().toISOString()}; this._save();
  },

  /* ---- reports ---- */
  getAllReports: function () { var v=this._vals(this._d.reports); v.sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);}); return v; },
  createReport: function (data) {
    var id=this._uid('r'), r={};
    for(var k in data) r[k]=data[k];
    r.reportId=id; r.status='pending'; r.createdAt=new Date().toISOString();
    this._d.reports[id]=r; this._save();
  },
  resolveReport: function (id) { if(this._d.reports[id]){this._d.reports[id].status='resolved';this._save();return true;} return false; },

  /* ---- session ---- */
  setSession:   function (uid){ localStorage.setItem('pxsess_v5',uid); },
  getSession:   function ()   { return localStorage.getItem('pxsess_v5'); },
  clearSession: function ()   { localStorage.removeItem('pxsess_v5'); }
};

/* ============================================================
   STATE
   ============================================================ */
var currentUser   = null;
var currentRole   = 'artisan';
var forgotUID     = null;
var pendingRegPic = null;
var pendingNewPic = null;
var pendingCVData = null;

/* ============================================================
   SCREEN MAP  –  name → element id
   ============================================================ */
var SCREENS = {
  splash:'splashScreen', welcome:'welcomeScreen',
  register:'registerScreen', login:'loginScreen',
  forgot:'forgotScreen', main:'mainApp', admin:'adminApp'
};

function showScreen(name) {
  /* ES5-safe loop  –  avoids NodeList.forEach which is ES6 */
  var all = document.querySelectorAll('.screen');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
  var id = SCREENS[name] || name;
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ============================================================
   INIT  –  wire ALL event listeners here, nothing inline
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  ProxiDB.init();
  ProxiDB.clearSession();      /* always start fresh */

  /* Welcome screen */
  on('btnArtisan',    function(){ selectRole('artisan'); });
  on('btnClient',     function(){ selectRole('client'); });
  on('btnSignIn',     function(){ showScreen('login'); });
  on('btnAdminAccess',function(){ showScreen('login'); });

  /* Register screen */
  on('btnRegBack',    function(){ showScreen('welcome'); });
  on('btnChoosePhoto',function(){ g('rPhoto').click(); });
  on('rPhoto',        function(){ previewRegPhoto(this); });
  on('rCV',           function(){ previewCV(this); });
  on('btnOpenTerms',  function(){ openTerms(); });
  on('rTerms',        null);  /* just a checkbox */
  on('eyeRPass',      function(){ togglePW('rPass',this); });
  on('eyeRConfirm',   function(){ togglePW('rConfirm',this); });
  on('btnRegister',   function(){ handleRegister(); });
  on('btnRegToLogin', function(){ showScreen('login'); });

  /* Login screen */
  on('btnLoginBack',  function(){ showScreen('welcome'); });
  on('eyeLPass',      function(){ togglePW('lPass',this); });
  on('btnLogin',      function(){ handleLogin(); });
  on('btnForgot',     function(){ showScreen('forgot'); resetForgot(); });
  on('btnLoginToWelcome',function(){ showScreen('welcome'); });

  /* Forgot password screen */
  on('btnForgotBack', function(){ showScreen('login'); });
  on('btnForgot1',    function(){ forgotStep1(); });
  on('btnForgot2',    function(){ forgotStep2(); });
  on('btnForgot3',    function(){ forgotStep3(); });
  on('eyeFNew',       function(){ togglePW('fNew',this); });
  on('eyeFConfirm',   function(){ togglePW('fNewConfirm',this); });

  /* Main app nav */
  on('bnHome',    function(){ switchTab('home'); });
  on('bnSearch',  function(){ switchTab('search'); });
  on('bnWork',    function(){ switchTab('work'); });
  on('bnProfile', function(){ switchTab('profile'); });

  /* Search inputs */
  on('srchInput', function(){ doSearch(); }, 'input');
  on('catFilter', function(){ doSearch(); }, 'change');
  on('locFilter', function(){ doSearch(); }, 'change');

  /* Work tab post-job */
  on('ptPost',    function(){ switchPostTab('post'); });
  on('ptMy',      function(){ switchPostTab('my'); });
  on('btnPostJob',function(){ handlePostJob(); });

  /* Profile page */
  on('btnChangePhoto', function(){ openImgModal(); });
  on('profCV',         function(){ uploadCV(this); }, 'change');
  on('btnLogout',      function(){ handleLogout(); });
  on('btnDeleteAcct',  function(){ openDeleteModal(); });

  /* Admin nav */
  on('anDash',     function(){ switchAdminTab('dash'); });
  on('anArtisans', function(){ switchAdminTab('artisans'); });
  on('anClients',  function(){ switchAdminTab('clients'); });
  on('anReports',  function(){ switchAdminTab('reports'); });
  on('anJobs',     function(){ switchAdminTab('jobs'); });
  on('btnAdminLogout', function(){ handleLogout(); });

  /* Admin search */
  on('artSrch',  function(){ renderAdminUsers('artisan'); }, 'input');
  on('cliSrch',  function(){ renderAdminUsers('client');  }, 'input');
  on('repFilter',function(){ renderAdminReports(); }, 'change');

  /* Terms modal */
  on('btnCloseTerms', function(){ closeTerms(); });
  on('termsModal',    function(e){ if(e.target===g('termsModal')) closeTerms(); });

  /* Job modal */
  on('btnCloseJob', function(){ closeJobModal(); });
  on('jobModal',    function(e){ if(e.target===g('jobModal')) closeJobModal(); });

  /* Report modal */
  on('btnCancelReport', function(){ closeReportModal(); });
  on('btnSubmitReport', function(){ submitReport(); });

  /* Delete modal */
  on('eyeDelPass',      function(){ togglePW('delPass',this); });
  on('btnCancelDelete', function(){ closeDeleteModal(); });
  on('btnConfirmDelete',function(){ confirmDelete(); });

  /* Image modal */
  on('btnPickImg',   function(){ g('imgInput').click(); });
  on('imgInput',     function(){ previewNewPhoto(this); }, 'change');
  on('btnCancelImg', function(){ closeImgModal(); });
  on('btnSavePhoto', function(){ savePhoto(); });

  /* Start app */
  setTimeout(function(){ showScreen('welcome'); }, 2000);
});

/* on(id, fn, event) – safe addEventListener helper */
function on(id, fn, evt) {
  var el = document.getElementById(id);
  if (el && fn) el.addEventListener(evt || 'click', fn);
}

/* ============================================================
   ROLE SELECTION
   ============================================================ */
function selectRole(role) {
  currentRole   = role;
  pendingRegPic = null;
  pendingCVData = null;

  var av = g('regAvPrev');
  if (av) av.innerHTML = '<span class="av-init">&#128247;</span>';

  var rt = g('regTitle');
  if (rt) rt.textContent = role === 'artisan' ? 'Create Artisan Account' : 'Create Client Account';

  setDisplay('artisanFields', role === 'artisan' ? 'block' : 'none');
  setDisplay('clientFields',  role === 'client'  ? 'block' : 'none');

  /* clear fields */
  var ids = ['rFirst','rLast','rUsername','rEmail','rPhone','rRate','rBusiness','rSecA','rPass','rConfirm'];
  for (var i = 0; i < ids.length; i++) { var el = g(ids[i]); if (el) el.value = ''; }
  ['rCity','rQual','rCategory','rSecQ'].forEach(function(id){ var el=g(id); if(el) el.value=''; });
  var tc = g('rTerms'); if (tc) tc.checked = false;
  var cv = g('rCV'); try { if(cv) cv.value=''; } catch(e){}
  var cl = g('cvLabel'); if(cl) cl.textContent = 'No file selected';
  clearErr('regErr');

  showScreen('register');
  var body = document.querySelector('#registerScreen .screen-body');
  if (body) body.scrollTop = 0;
}

/* ============================================================
   SHOW / HIDE PASSWORD
   ============================================================ */
function togglePW(inputId, btn) {
  var inp = g(inputId);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text';     if(btn) btn.innerHTML = '&#128584;'; }
  else                         { inp.type = 'password'; if(btn) btn.innerHTML = '&#128065;'; }
}

/* ============================================================
   PHOTO PREVIEWS / UPLOADS
   ============================================================ */
function previewRegPhoto(input) {
  if (!input || !input.files || !input.files[0]) return;
  var file = input.files[0];
  if (!file.type || file.type.indexOf('image/') !== 0) { showToast('Please select an image file.'); return; }
  resizeImg(file, 200, function (b64) {
    pendingRegPic = b64;
    var av = g('regAvPrev');
    if (av) av.innerHTML = '<img src="' + b64 + '" alt="photo">';
  });
}

function previewCV(input) {
  var lbl = g('cvLabel');
  if (!input || !input.files || !input.files[0]) { if(lbl) lbl.textContent = 'No file selected'; return; }
  var file = input.files[0];
  if (file.type !== 'application/pdf') { showToast('Please select a PDF file.'); try{input.value='';}catch(e){} return; }
  if (file.size > 1048576) { showToast('CV must be under 1MB.'); try{input.value='';}catch(e){} return; }
  if (lbl) lbl.textContent = file.name + ' (' + Math.round(file.size/1024) + ' KB)';
  var rd = new FileReader();
  rd.onload = function (e) { pendingCVData = { data: e.target.result, name: file.name }; };
  rd.readAsDataURL(file);
}

function resizeImg(file, px, cb) {
  var rd = new FileReader();
  rd.onload = function (e) {
    var img = new Image();
    img.onload = function () {
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

/* ============================================================
   REGISTRATION
   ============================================================ */
function handleRegister() {
  var first = val('rFirst'), last  = val('rLast'),
      uname = val('rUsername').toLowerCase().replace(/\s+/g,''),
      email = val('rEmail').toLowerCase(),
      phone = val('rPhone'), city  = val('rCity');
  var secQ  = val('rSecQ'),  secA  = val('rSecA'),
      pass  = val('rPass'),  conf  = val('rConfirm');
  var terms = g('rTerms') && g('rTerms').checked;
  clearErr('regErr');

  if (!first||!last||!uname||!email||!phone||!city||!secQ||!secA||!pass||!conf)
    return showErr('regErr','Please fill in all required fields (marked *).');
  if (uname.length < 3)
    return showErr('regErr','Username must be at least 3 characters.');
  if (email.indexOf('@') < 1 || email.indexOf('.') < 1)
    return showErr('regErr','Please enter a valid email address.');
  if (pass !== conf)
    return showErr('regErr','Passwords do not match. Please re-enter.');
  if (pass.length < 8)
    return showErr('regErr','Password must be at least 8 characters.');
  if (!terms)
    return showErr('regErr','You must accept the Terms and Conditions to register.');
  if (ProxiDB.getUserByEmail(email))
    return showErr('regErr','This email is already linked to an existing account. Each email may only be used for one account.');
  if (ProxiDB.getUserByUsername(uname))
    return showErr('regErr','This username is already taken. Please choose a different username.');

  var qual='', cat='', rate='', cvD=null, cvN=null, biz='';
  if (currentRole === 'artisan') {
    qual = val('rQual'); cat = val('rCategory'); rate = val('rRate');
    if (!qual || qual === 'none')
      return showErr('regErr','Artisans must hold a minimum SSCE/WAEC qualification. Applicants below this standard are not eligible.');
    if (!cat)
      return showErr('regErr','Please select your trade / skill category.');
    if (pendingCVData) { cvD = pendingCVData.data; cvN = pendingCVData.name; }
  } else {
    biz = val('rBusiness');
  }

  var u = ProxiDB.createUser({
    firstName:first, lastName:last, username:uname, email:email,
    phone:phone, city:city, role:currentRole,
    qualification:qual, category:cat, rate:rate, business:biz,
    cv:cvD, cvName:cvN, profileImage:pendingRegPic||null,
    securityQuestion:secQ,
    securityAnswer:ProxiDB._hash(secA.toLowerCase().trim()),
    termsAccepted:true
  });
  doLogin(u);
  showToast('Welcome to ProxiCraft, ' + first + '!');
}

/* ============================================================
   LOGIN
   ============================================================ */
function handleLogin() {
  var email = val('lEmail').toLowerCase(), pass = val('lPass');
  clearErr('logErr');
  if (!email || !pass) return showErr('logErr','Please enter your email and password.');
  var user = ProxiDB.getUserByEmail(email);
  if (!user) return showErr('logErr','No account found with this email address.');
  if (!ProxiDB.verifyPW(user.userId, pass)) return showErr('logErr','Incorrect password. Please try again.');
  if (user.status === 'suspended')
    return showErr('logErr','Your account has been suspended by the administrator. Please contact ProxiCraft support.');
  doLogin(user);
}

function doLogin(user) {
  currentUser = user; currentRole = user.role;
  ProxiDB.setSession(user.userId);
  if (user.role === 'admin') { showScreen('admin'); loadAdmin(); }
  else                       { showScreen('main');  loadMainApp(); }
}

function handleLogout() {
  ProxiDB.clearSession();
  currentUser = null;
  var le = g('lEmail'); if(le) le.value = '';
  var lp = g('lPass');  if(lp) lp.value = '';
  clearErr('logErr');
  showScreen('welcome');
  showToast('You have been signed out.');
}

/* ============================================================
   FORGOT PASSWORD
   ============================================================ */
function resetForgot() {
  showForgotStep(1);
  ['fEmail','fAnswer','fNew','fNewConfirm'].forEach(function(id){ var e=g(id); if(e) e.value=''; });
  clearErr('fErr1'); clearErr('fErr2'); clearErr('fErr3');
}

function showForgotStep(n) {
  for (var i = 1; i <= 3; i++) {
    var s    = g('fStep'+i);
    var dot  = g('stepDot'+i);
    var line = g('stepLine'+i);
    if (s)   s.style.display = (i === n ? 'block' : 'none');
    if (dot) {
      if (i === n)  { dot.classList.add('active');  dot.classList.remove('done'); }
      else if (i<n) { dot.classList.remove('active'); dot.classList.add('done'); }
      else          { dot.classList.remove('active','done'); }
    }
    if (line) {
      if (i < n) line.classList.add('done');
      else       line.classList.remove('done');
    }
  }
}

function forgotStep1() {
  var email = val('fEmail').toLowerCase();
  clearErr('fErr1');
  if (!email) return showErr('fErr1','Please enter your email address.');
  var user = ProxiDB.getUserByEmail(email);
  if (!user || user.role === 'admin') return showErr('fErr1','No user account found with this email address.');
  forgotUID = user.userId;
  var fq = g('fQuestion'); if(fq) fq.value = user.securityQuestion;
  showForgotStep(2);
}

function forgotStep2() {
  var ans = val('fAnswer');
  clearErr('fErr2');
  if (!ans) return showErr('fErr2','Please type your security answer.');
  if (!ProxiDB.verifySecA(forgotUID, ans)) return showErr('fErr2','Incorrect answer. Please try again.');
  showForgotStep(3);
}

function forgotStep3() {
  var np = val('fNew'), nc = val('fNewConfirm');
  clearErr('fErr3');
  if (!np||!nc) return showErr('fErr3','Please enter and confirm your new password.');
  if (np.length < 8) return showErr('fErr3','Password must be at least 8 characters.');
  if (np !== nc) return showErr('fErr3','Passwords do not match.');
  ProxiDB.updateUser(forgotUID, { password: ProxiDB._hash(np) });
  forgotUID = null;
  resetForgot();
  showToast('Password reset! Please sign in with your new password.');
  showScreen('login');
}

/* ============================================================
   TERMS MODAL
   ============================================================ */
function openTerms()  { setDisplay('termsModal','flex'); }
function closeTerms() { setDisplay('termsModal','none'); }

/* ============================================================
   MAIN APP
   ============================================================ */
function loadMainApp() {
  currentUser = ProxiDB.getUserById(currentUser.userId);
  var h = new Date().getHours();
  var greet = h<12 ? 'Good morning' : h<17 ? 'Good afternoon' : 'Good evening';
  setText('greetMsg', greet + '!');
  setText('greetName', currentUser.firstName + ' ' + currentUser.lastName);

  var badge = g('hdrBadge');
  if (badge) { badge.textContent = currentRole==='artisan'?'Artisan':'Client'; badge.className='role-badge '+currentRole; }

  if (currentRole === 'artisan') {
    var an = g('artisanNotice');
    if (an) { an.style.display='block'; an.textContent='Showing '+currentUser.category+' jobs only. You can apply only for jobs matching your registered trade.'; }
    setDisplay('appsPanel','block'); setDisplay('postPanel','none');
    setText('workIco','&#128203;'); setText('workLbl','Applied');
    var cf = g('catFilter'); if(cf){ cf.value=currentUser.category; cf.disabled=true; }
  } else {
    setDisplay('artisanNotice','none');
    setDisplay('appsPanel','none'); setDisplay('postPanel','block');
    setText('workIco','&#43;'); setText('workLbl','Post');
    var cf2 = g('catFilter'); if(cf2) cf2.disabled=false;
  }

  renderHomeJobs(); doSearch(); loadProfile(); switchTab('home');
}

function switchTab(tab) {
  var tabs = ['home','search','work','profile'];
  for (var i=0;i<tabs.length;i++) {
    var pg = g(tabs[i]+'Page'); if(pg) pg.classList.remove('active');
    var bn = g('bn'+tabs[i].charAt(0).toUpperCase()+tabs[i].slice(1));
    if(bn) bn.classList.remove('active');
  }
  var pg2 = g(tab+'Page'); if(pg2) pg2.classList.add('active');
  var bn2 = g('bn'+tab.charAt(0).toUpperCase()+tab.slice(1)); if(bn2) bn2.classList.add('active');
  if (tab==='work')    { currentRole==='artisan' ? renderMyApps() : renderMyJobs(); }
  if (tab==='profile') loadProfile();
}

function switchPostTab(t) {
  var pp=g('ptPost'), pm=g('ptMy');
  if(pp) { if(t==='post') pp.classList.add('active'); else pp.classList.remove('active'); }
  if(pm) { if(t==='my')   pm.classList.add('active'); else pm.classList.remove('active'); }
  setDisplay('postFormDiv', t==='post' ? 'block' : 'none');
  setDisplay('myJobsDiv',   t==='my'   ? 'block' : 'none');
  if (t==='my') renderMyJobs();
}

/* ============================================================
   JOB RENDERING
   ============================================================ */
function renderHomeJobs() {
  var jobs = currentRole==='artisan' ? ProxiDB.getJobsByCat(currentUser.category) : ProxiDB.getAllJobs();
  setText('homeCount', jobs.length + ' job' + (jobs.length!==1?'s':''));
  renderJobGrid(jobs, 'homeGrid');
}

function doSearch() {
  var q   = (val('srchInput')||'').toLowerCase();
  var cat = val('catFilter');
  var loc = val('locFilter');
  if (currentUser && currentRole==='artisan') {
    cat = currentUser.category;
    var cf = g('catFilter'); if(cf) { cf.value=cat; cf.disabled=true; }
  }
  var all = ProxiDB.getAllJobs(), res = [];
  for (var i=0;i<all.length;i++) {
    var j = all[i];
    if ((!q || j.title.toLowerCase().indexOf(q)>-1 || j.description.toLowerCase().indexOf(q)>-1) &&
        (!cat || j.category===cat) && (!loc || j.location===loc)) res.push(j);
  }
  setText('srchInfo', res.length + ' job' + (res.length!==1?'s':'')+' found');
  renderJobGrid(res, 'srchGrid');
}

function renderJobGrid(jobs, cid) {
  var el = g(cid); if(!el) return;
  if (!jobs || !jobs.length) {
    el.innerHTML = '<div class="empty-state"><p>No jobs found.</p><p>Try adjusting filters.</p></div>';
    return;
  }
  var html = '';
  for (var i=0;i<jobs.length;i++) {
    var j = jobs[i];
    html += '<div class="job-card" data-jid="'+esc(j.jobId)+'">'
      + (j.urgent ? '<span class="urgent-tag">Urgent</span>' : '')
      + '<div class="job-title">'     + esc(j.title)    + '</div>'
      + '<span class="cat-badge">'    + esc(j.category) + '</span>'
      + '<div class="job-meta"><span>&#128205; '+esc(j.location)+'</span><span>&#8987; '+esc(j.duration)+'</span></div>'
      + '<div class="job-footer"><span class="job-budget">&#8358;'+numFmt(j.budget)+'</span>'
      + '<span class="view-link">View &#8594;</span></div></div>';
  }
  el.innerHTML = html;
  /* Attach click to each card via delegation-safe loop */
  var cards = el.querySelectorAll('.job-card');
  for (var k=0;k<cards.length;k++) {
    cards[k].addEventListener('click', (function(jid){ return function(){ viewJob(jid); }; })(jobs[k].jobId));
  }
}

/* ============================================================
   JOB DETAIL
   ============================================================ */
function viewJob(jid) {
  var job = ProxiDB.getJobById(jid); if(!job) return;
  var isApplied = currentUser && ProxiDB.hasApplied(currentUser.userId, jid);
  var isOwn     = currentUser && job.employerId === currentUser.userId;
  var catOK     = currentUser && currentRole==='artisan' && job.category===currentUser.category;

  var html =
    '<div class="detail-title">'+esc(job.title)+'</div>'
    +'<div class="detail-meta"><span class="cat-badge">'+esc(job.category)+'</span>'
    +(job.urgent?'<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:#FEE2E2;color:#DC2626">Urgent</span>':'')
    +'</div>'
    +'<div class="d-row"><span class="dil">&#128205; Location</span><span>'+esc(job.location)+'</span></div>'
    +'<div class="d-row"><span class="dil">&#8358; Budget</span><span style="color:#16A34A;font-weight:800">&#8358;'+numFmt(job.budget)+'</span></div>'
    +'<div class="d-row"><span class="dil">&#8987; Duration</span><span>'+esc(job.duration)+'</span></div>'
    +'<div class="d-row"><span class="dil">&#127970; Employer</span><span>'+esc(job.employer)+'</span></div>'
    +'<div class="d-row"><span class="dil">&#128197; Posted</span><span>'+esc(job.date)+'</span></div>'
    +'<div class="det-desc"><h4>Description</h4><p>'+esc(job.description)+'</p></div>';

  if (currentRole==='artisan') {
    if (!catOK)
      html += '<div class="restrict-note">&#128683; This job requires a <strong>'+esc(job.category)+'</strong> artisan. Your trade is <strong>'+esc(currentUser.category)+'</strong>. You may only apply for jobs in your registered trade.</div>';
    else if (isApplied)
      html += '<div class="applied-tag-lg">&#10003; You have already applied for this job.</div>';
    else
      html += '<button type="button" class="apply-btn" id="modalApplyBtn">Apply for This Job</button>';
    html += '<button type="button" class="report-job-btn" id="modalReportBtn">&#9888; Report This Employer</button>';
  } else if (isOwn) {
    var appCount = ProxiDB.getAppsByJob(jid).length;
    html += '<div class="applied-tag-lg">&#128204; You posted this job &bull; '+appCount+' applicant'+(appCount!==1?'s':'')+'</div>';
  }

  var body = g('jobModalBody'); if(body) body.innerHTML = html;
  setDisplay('jobModal','flex');

  /* Wire modal action buttons */
  var ab = g('modalApplyBtn');
  if (ab) ab.addEventListener('click', function(){ applyForJob(jid); });
  var rb = g('modalReportBtn');
  if (rb) rb.addEventListener('click', function(){ openReportModal(job.employerId, 'Employer: '+job.employer); });
}

function closeJobModal() { setDisplay('jobModal','none'); }

/* ============================================================
   APPLY
   ============================================================ */
function applyForJob(jid) {
  var job = ProxiDB.getJobById(jid);
  if (!job) return;
  if (job.category !== currentUser.category) return showToast('You can only apply for '+currentUser.category+' jobs.');
  if (ProxiDB.hasApplied(currentUser.userId, jid)) return showToast('You have already applied for this job.');
  ProxiDB.createApp(currentUser.userId, jid);
  closeJobModal();
  showToast('Application submitted successfully!');
  setTimeout(function(){ viewJob(jid); }, 350);
}

/* ============================================================
   POST JOB
   ============================================================ */
function handlePostJob() {
  var t=val('pTitle'), c=val('pCat'), l=val('pLoc'),
      b=val('pBudget'), d=val('pDuration'), desc=val('pDesc');
  var urg = g('pUrgent') && g('pUrgent').checked;
  clearErr('postErr');
  if (!t||!c||!l||!b||!d||!desc) return showErr('postErr','Please fill in all required fields.');
  if (Number(b)<500) return showErr('postErr','Please enter a valid budget (minimum &#8358;500).');
  ProxiDB.createJob({
    title:t, category:c, location:l, budget:Number(b), duration:d,
    description:desc, urgent:urg,
    employer: currentUser.business || (currentUser.firstName+' '+currentUser.lastName),
    employerId:currentUser.userId, date:new Date().toLocaleDateString('en-GB')
  });
  ['pTitle','pBudget','pDuration','pDesc'].forEach(function(id){ var e=g(id); if(e) e.value=''; });
  var pc=g('pCat'); if(pc) pc.value='';
  var pl=g('pLoc'); if(pl) pl.value='';
  var pu=g('pUrgent'); if(pu) pu.checked=false;
  renderHomeJobs();
  showToast('Job posted successfully!');
  switchTab('home');
}

/* ============================================================
   MY APPLICATIONS
   ============================================================ */
function renderMyApps() {
  var apps = ProxiDB.getAppsByArtisan(currentUser.userId);
  setText('appsCount', apps.length);
  var list = g('appsList'); if(!list) return;
  if (!apps.length) { list.innerHTML='<div class="empty-state"><p>No applications yet.</p><p>Browse '+currentUser.category+' jobs and tap Apply.</p></div>'; return; }
  var html = '';
  for (var i=0;i<apps.length;i++) {
    var job = ProxiDB.getJobById(apps[i].jobId); if(!job) continue;
    html += '<div class="app-card" data-jid="'+esc(job.jobId)+'">'
      +'<div class="app-top"><span class="cat-badge">'+esc(job.category)+'</span><span class="app-tag">Applied &#10003;</span></div>'
      +'<h4>'+esc(job.title)+'</h4>'
      +'<div class="job-meta"><span>&#128205; '+esc(job.location)+'</span><span style="color:#16A34A;font-weight:700">&#8358;'+numFmt(job.budget)+'</span></div>'
      +'</div>';
  }
  list.innerHTML = html;
  var cards = list.querySelectorAll('.app-card');
  for (var k=0;k<cards.length;k++) {
    var jid = cards[k].getAttribute('data-jid');
    cards[k].addEventListener('click', (function(id){ return function(){ viewJob(id); }; })(jid));
  }
}

/* ============================================================
   MY POSTED JOBS
   ============================================================ */
function renderMyJobs() {
  var jobs = ProxiDB.getJobsByEmp(currentUser.userId);
  var list = g('myJobsList'); if(!list) return;
  if (!jobs.length) { list.innerHTML='<div class="empty-state"><p>You have not posted any jobs yet.</p></div>'; return; }
  var html = '';
  for (var i=0;i<jobs.length;i++) {
    var j=jobs[i], apps=ProxiDB.getAppsByJob(j.jobId).length;
    html += '<div class="job-card"><div class="job-title">'+esc(j.title)+'</div>'
      +'<span class="cat-badge">'+esc(j.category)+'</span>'
      +'<div class="job-meta"><span>&#128205; '+esc(j.location)+'</span><span>&#128101; '+apps+' applicant'+(apps!==1?'s':'')+'</span></div>'
      +'<div class="job-footer"><span class="job-budget">&#8358;'+numFmt(j.budget)+'</span><span class="view-link">'+esc(j.date)+'</span></div></div>';
  }
  list.innerHTML = html;
}

/* ============================================================
   PROFILE
   ============================================================ */
function loadProfile() {
  currentUser = ProxiDB.getUserById(currentUser.userId);
  var initials = currentUser.firstName.charAt(0) + currentUser.lastName.charAt(0);
  var av = g('profAv');
  if (av) {
    if (currentUser.profileImage) av.innerHTML = '<img src="'+currentUser.profileImage+'" alt="photo">';
    else av.textContent = initials.toUpperCase();
    av.className = 'prof-av' + (currentRole==='client' ? ' client-av' : '');
  }
  setText('profName', currentUser.firstName+' '+currentUser.lastName);
  var badge=g('profBadge'); if(badge){ badge.textContent=currentRole==='artisan'?'Artisan':'Client'; badge.className='role-badge '+currentRole; }
  setText('pUser',  '@'+currentUser.username);
  setText('pEmail', currentUser.email);
  setText('pPhone', currentUser.phone);
  setText('pCity',  currentUser.city);
  setText('pSince', new Date(currentUser.createdAt).toLocaleDateString('en-GB'));

  if (currentRole==='artisan') {
    ['aRow1','aRow2','aRow3'].forEach(function(r){ setDisplay(r,'flex'); });
    setDisplay('cRow1','none');
    setText('pCat',  currentUser.category);
    setText('pQual', qualLabel(currentUser.qualification));
    setText('pCv',   currentUser.cvName ? currentUser.cvName+' (uploaded)' : 'No CV uploaded');
    setDisplay('cvSection','block');
    setText('profCVLabel', currentUser.cvName || 'No CV uploaded');
    var cnt = ProxiDB.getAppsByArtisan(currentUser.userId).length;
    setText('sv1',cnt); setText('sl1','Applications');
    setText('sv2',currentUser.rate ? '&#8358;'+numFmt(Number(currentUser.rate)) : 'N/A');
    setText('sl2','Daily Rate');
  } else {
    ['aRow1','aRow2','aRow3'].forEach(function(r){ setDisplay(r,'none'); });
    setDisplay('cRow1','flex'); setDisplay('cvSection','none');
    setText('pBiz', currentUser.business||'Not specified');
    var mj = ProxiDB.getJobsByEmp(currentUser.userId).length;
    setText('sv1',mj); setText('sl1','Jobs Posted');
    setText('sv2','0'); setText('sl2','Hired');
  }
}

function uploadCV(input) {
  if (!input||!input.files||!input.files[0]) return;
  var file=input.files[0];
  if (file.type!=='application/pdf') { showToast('Please select a PDF file.'); try{input.value='';}catch(e){} return; }
  if (file.size>1048576) { showToast('CV must be under 1MB.'); try{input.value='';}catch(e){} return; }
  var rd=new FileReader();
  rd.onload=function(e){
    ProxiDB.updateUser(currentUser.userId,{cv:e.target.result,cvName:file.name});
    currentUser=ProxiDB.getUserById(currentUser.userId);
    setText('profCVLabel',file.name+' (uploaded)');
    setText('pCv',file.name+' (uploaded)');
    showToast('CV uploaded successfully!');
  };
  rd.readAsDataURL(file);
}

/* ============================================================
   PROFILE IMAGE UPDATE
   ============================================================ */
function openImgModal() {
  pendingNewPic = currentUser.profileImage||null;
  var prev = g('imgPreview');
  if (prev) {
    if (pendingNewPic) prev.innerHTML='<img src="'+pendingNewPic+'" alt="photo">';
    else prev.textContent = currentUser.firstName.charAt(0)+currentUser.lastName.charAt(0);
  }
  clearErr('imgErr');
  var ii=g('imgInput'); try{if(ii) ii.value='';}catch(e){}
  setDisplay('imgModal','flex');
}

function previewNewPhoto(input) {
  if (!input||!input.files||!input.files[0]) return;
  var file=input.files[0];
  if (!file.type||file.type.indexOf('image/')<0) { showErr('imgErr','Please select an image file.'); return; }
  resizeImg(file,200,function(b64){
    pendingNewPic=b64;
    var prev=g('imgPreview'); if(prev) prev.innerHTML='<img src="'+b64+'" alt="preview">';
  });
}

function savePhoto() {
  if (!pendingNewPic) { showErr('imgErr','Please choose a photo first.'); return; }
  ProxiDB.updateUser(currentUser.userId,{profileImage:pendingNewPic});
  currentUser=ProxiDB.getUserById(currentUser.userId);
  closeImgModal(); loadProfile(); showToast('Profile photo updated!');
}

function closeImgModal() { setDisplay('imgModal','none'); pendingNewPic=null; }

/* ============================================================
   REPORT SYSTEM
   ============================================================ */
function openReportModal(uid, label) {
  var ri=g('reportedId'); if(ri) ri.value=uid;
  setText('reportTarget','Reporting: '+label);
  var rr=g('repReason'); if(rr) rr.value='';
  var rd=g('repDetails'); if(rd) rd.value='';
  clearErr('repErr');
  setDisplay('reportModal','flex');
}

function closeReportModal() { setDisplay('reportModal','none'); }

function submitReport() {
  var rid=val('reportedId'), reason=val('repReason'), details=val('repDetails');
  clearErr('repErr');
  if (!reason)  return showErr('repErr','Please select a reason for this report.');
  if (!details) return showErr('repErr','Please provide details.');
  var rep = ProxiDB.getUserById(rid);
  ProxiDB.createReport({
    reporterId:currentUser.userId,
    reporterName:currentUser.firstName+' '+currentUser.lastName,
    reportedId:rid,
    reportedName:rep?(rep.firstName+' '+rep.lastName):'Unknown',
    reason:reason, details:details
  });
  closeReportModal();
  showToast('Report submitted. Admin will review within 48 hours.');
}

/* ============================================================
   ACCOUNT DELETION
   ============================================================ */
function openDeleteModal()  { setText('delPass',''); var c=g('delChk');if(c)c.checked=false; clearErr('delErr'); setDisplay('deleteModal','flex'); }
function closeDeleteModal() { setDisplay('deleteModal','none'); }

function confirmDelete() {
  var pass=val('delPass'), chk=g('delChk')&&g('delChk').checked;
  clearErr('delErr');
  if (!pass) return showErr('delErr','Please enter your password to confirm.');
  if (!chk)  return showErr('delErr','Please tick the confirmation checkbox.');
  if (!ProxiDB.verifyPW(currentUser.userId,pass)) return showErr('delErr','Incorrect password.');
  var uid=currentUser.userId;
  ProxiDB.clearSession(); ProxiDB.deleteUser(uid);
  currentUser=null; closeDeleteModal(); showScreen('welcome');
  showToast('Your account has been permanently deleted.');
}

/* ============================================================
   ADMIN PANEL
   ============================================================ */
function loadAdmin() { renderAdminDashboard(); switchAdminTab('dash'); }

function switchAdminTab(tab) {
  var tabs=['dash','artisans','clients','reports','jobs'];
  for (var i=0;i<tabs.length;i++) {
    var ap=g('ad'+cap(tabs[i])); if(ap) ap.classList.remove('active');
    var an=g('an'+cap(tabs[i])); if(an) an.classList.remove('active');
  }
  var ap2=g('ad'+cap(tab)); if(ap2) ap2.classList.add('active');
  var an2=g('an'+cap(tab)); if(an2) an2.classList.add('active');
  if(tab==='dash')     renderAdminDashboard();
  if(tab==='artisans') renderAdminUsers('artisan');
  if(tab==='clients')  renderAdminUsers('client');
  if(tab==='reports')  renderAdminReports();
  if(tab==='jobs')     renderAdminJobs();
}

function renderAdminDashboard() {
  setText('dc1', ProxiDB.getAllArtisans().length);
  setText('dc2', ProxiDB.getAllClients().length);
  setText('dc3', ProxiDB.getAllJobs().length);
  var reps=ProxiDB.getAllReports(), cnt=0;
  for(var i=0;i<reps.length;i++) if(reps[i].status==='pending') cnt++;
  setText('dc4', cnt);

  var recent = ProxiDB.getAllArtisans().concat(ProxiDB.getAllClients());
  recent.sort(function(a,b){ return new Date(b.createdAt)-new Date(a.createdAt); });
  recent = recent.slice(0,5);
  var dr = g('dashRecent');
  if (dr) {
    if (!recent.length) { dr.innerHTML='<div class="empty-state"><p>No users yet.</p></div>'; return; }
    dr.innerHTML = buildUserCards(recent, false);
  }
}

function renderAdminUsers(role) {
  var sid  = role==='artisan' ? 'artSrch' : 'cliSrch';
  var cid  = role==='artisan' ? 'artisanList' : 'clientList';
  var q    = (val(sid)||'').toLowerCase();
  var list = role==='artisan' ? ProxiDB.getAllArtisans() : ProxiDB.getAllClients();
  if (q) {
    var filtered=[];
    for(var i=0;i<list.length;i++){
      var u=list[i];
      if((u.firstName+' '+u.lastName).toLowerCase().indexOf(q)>-1||u.email.indexOf(q)>-1||u.username.indexOf(q)>-1) filtered.push(u);
    }
    list=filtered;
  }
  var el=g(cid); if(!el) return;
  if (!list.length) { el.innerHTML='<div class="empty-state"><p>No '+role+'s found.</p></div>'; return; }
  el.innerHTML = buildUserCards(list, true);
  wireAdminButtons(el);
}

function buildUserCards(users, withActions) {
  var html='';
  for(var i=0;i<users.length;i++) {
    var u=users[i];
    var ini=(u.firstName.charAt(0)+u.lastName.charAt(0)).toUpperCase();
    var avHtml = u.profileImage ? '<img src="'+u.profileImage+'" alt="">' : ini;
    html += '<div class="a-user-card'+(u.status==='suspended'?' suspended':'')+'">'
      +'<div class="auc-av'+(u.role==='client'?' ca':'')+'">' + avHtml + '</div>'
      +'<div class="auc-info">'
        +'<div class="auc-name">'+esc(u.firstName)+' '+esc(u.lastName)+'</div>'
        +'<div class="auc-sub">@'+esc(u.username)+' &bull; '+esc(u.city)+(u.role==='artisan'?' &bull; '+esc(u.category):'')+
        ' &bull; <span class="sta-'+u.status+'">'+cap(u.status)+'</span></div>'
      +'</div>'
      +(withActions
        ? '<div class="auc-btns">'
          +'<button type="button" class="btn-vw" data-uid="'+esc(u.userId)+'">View</button>'
          +(u.status==='active'
            ?'<button type="button" class="btn-sus" data-uid="'+esc(u.userId)+'">Suspend</button>'
            :'<button type="button" class="btn-rei" data-uid="'+esc(u.userId)+'">Reinstate</button>')
          +'</div>'
        : '')
      +'</div>';
  }
  return html;
}

function wireAdminButtons(container) {
  var vw  = container.querySelectorAll('.btn-vw');
  var sus = container.querySelectorAll('.btn-sus');
  var rei = container.querySelectorAll('.btn-rei');
  for(var i=0;i<vw.length;i++)  { (function(uid){ vw[i].addEventListener('click',  function(){ viewUserDetail(uid); }); })(vw[i].getAttribute('data-uid')); }
  for(var i=0;i<sus.length;i++) { (function(uid){ sus[i].addEventListener('click', function(){ adminSuspend(uid); });   })(sus[i].getAttribute('data-uid')); }
  for(var i=0;i<rei.length;i++) { (function(uid){ rei[i].addEventListener('click', function(){ adminReinstate(uid); }); })(rei[i].getAttribute('data-uid')); }
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
  var apps=u.role==='artisan'?ProxiDB.getAppsByArtisan(uid).length:0;
  var jobs=u.role==='client'?ProxiDB.getJobsByEmp(uid).length:0;
  var ini=(u.firstName.charAt(0)+u.lastName.charAt(0)).toUpperCase();
  var avHtml = u.profileImage ? '<img src="'+u.profileImage+'" alt="">' : ini;

  var body = g('userDetailBody');
  if(body) body.innerHTML =
    '<div class="ud-hdr">'
    +'<div class="ud-av'+(u.role==='client'?' ca':'')+'">' + avHtml + '</div>'
    +'<div><div class="ud-name">'+esc(u.firstName)+' '+esc(u.lastName)+'</div>'
    +'<span class="role-badge '+u.role+'">'+cap(u.role)+'</span> <span class="sta-'+u.status+'">'+cap(u.status)+'</span></div></div>'
    +'<div class="detail-card">'
    +drow('Username','@'+u.username)+drow('Email',u.email)+drow('Phone',u.phone)+drow('City',u.city)
    +(u.role==='artisan'?drow('Trade',u.category)+drow('Qualification',qualLabel(u.qualification))+drow('CV',u.cvName||'None'):'')
    +(u.role==='client'?drow('Business',u.business||'N/A'):'')
    +drow('Joined',new Date(u.createdAt).toLocaleDateString('en-GB'))
    +(u.role==='artisan'?drow('Applications',apps):'')
    +(u.role==='client'?drow('Jobs Posted',jobs):'')
    +'</div>';

  var actions = g('userDetailActions');
  if (actions) {
    actions.innerHTML =
      '<button type="button" class="btn-outline" id="udClose">Close</button>'
      +(u.status==='active'
        ?'<button type="button" class="btn-sus" id="udSus">Suspend</button>'
        :'<button type="button" class="btn-rei" id="udRei">Reinstate</button>')
      +'<button type="button" class="btn-danger-sm" id="udDel">Delete</button>';
    on('udClose', function(){ closeUserDetail(); });
    on('udSus',   function(){ adminSuspend(uid);   closeUserDetail(); });
    on('udRei',   function(){ adminReinstate(uid); closeUserDetail(); });
    on('udDel',   function(){ adminDeleteUser(uid); });
  }
  setDisplay('userDetailModal','flex');
}

function closeUserDetail() { setDisplay('userDetailModal','none'); }

function adminDeleteUser(uid) {
  if (!confirm('Permanently delete this account? This cannot be undone.')) return;
  var u=ProxiDB.getUserById(uid);
  ProxiDB.deleteUser(uid);
  closeUserDetail(); renderAdminDashboard();
  if(u) renderAdminUsers(u.role);
  showToast('Account permanently deleted.');
}

function renderAdminReports() {
  var f=val('repFilter')||'pending';
  var all=ProxiDB.getAllReports(), shown=[];
  for(var i=0;i<all.length;i++) if(f==='all'||all[i].status===f) shown.push(all[i]);
  var el=g('reportsList'); if(!el) return;
  if(!shown.length){ el.innerHTML='<div class="empty-state"><p>No reports found.</p></div>'; return; }
  var html='';
  for(var i=0;i<shown.length;i++){
    var r=shown[i];
    html+='<div class="rep-card'+(r.status==='resolved'?' resolved':'')+'"><div class="rep-hdr"><div class="rep-title">'+esc(r.reason)+'</div><span class="rep-sta '+r.status+'">'+cap(r.status)+'</span></div>'
      +'<div class="rep-body">From: <strong>'+esc(r.reporterName)+'</strong> &rarr; Against: <strong>'+esc(r.reportedName)+'</strong><br>'+esc(r.details)+'<br><small>'+new Date(r.createdAt).toLocaleDateString('en-GB')+'</small></div>'
      +(r.status==='pending'?'<button type="button" class="btn-res" data-rid="'+esc(r.reportId)+'">&#10003; Mark Resolved</button>':'')
      +'</div>';
  }
  el.innerHTML=html;
  var btns=el.querySelectorAll('.btn-res');
  for(var k=0;k<btns.length;k++){
    (function(rid){ btns[k].addEventListener('click',function(){ ProxiDB.resolveReport(rid); renderAdminReports(); renderAdminDashboard(); showToast('Report resolved.'); }); })(btns[k].getAttribute('data-rid'));
  }
}

function renderAdminJobs() { renderJobGrid(ProxiDB.getAllJobs(),'adminJobGrid'); }

/* ============================================================
   UTILITIES
   ============================================================ */
function qualLabel(q) {
  var m={none:'None',ssce:'SSCE/WAEC/NECO',nabteb:'NABTEB',ond:'OND',hnd:'HND',bsc:'BSc/B.Tech',msc:'MSc/M.Tech',other:'Other Equivalent'};
  return m[q]||q||'Not specified';
}
function drow(lbl,val) { return '<div class="drow"><span class="dlbl">'+lbl+'</span><span class="dval">'+esc(String(val||''))+'</span></div>'; }
function cap(s) { return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; }
function g(id)  { return document.getElementById(id); }
function val(id){ var e=g(id); return e ? (e.value||'').trim() : ''; }
function setText(id,t) { var e=g(id); if(e) e.innerHTML=t; }
function setDisplay(id,d){ var e=g(id); if(e) e.style.display=d; }
function showErr(id,msg) { var e=g(id); if(e) e.innerHTML=msg; }
function clearErr(id)    { var e=g(id); if(e) e.textContent=''; }
function numFmt(n) { return Number(n).toLocaleString(); }
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg) {
  var t=g('toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 3500);
}
