/*
  ProxiCraft v2 – Firebase Edition
  Database: Google Firebase Firestore (cloud NoSQL database)
  Auth:     Firebase Authentication (email/password)

  Firestore collections:
    users        – user profiles (artisan / client / admin)
    usernames    – username uniqueness index
    jobs         – job listings
    applications – artisan job applications
    reports      – user misconduct reports

  Firebase Auth enforces email uniqueness globally.
  All data persists on Google's servers across every device and browser.
*/

/* ============================================================
   FIREBASE GLOBALS  –  initialised in DOMContentLoaded
   ============================================================ */
var db   = null;   /* Firestore instance  */
var auth = null;   /* Firebase Auth instance */

/* Firestore collection helpers */
function colUsers()     { return db.collection('users');        }
function colUsernames() { return db.collection('usernames');    }
function colJobs()      { return db.collection('jobs');         }
function colApps()      { return db.collection('applications'); }
function colReports()   { return db.collection('reports');      }

/* ============================================================
   APP STATE
   ============================================================ */
var currentUser   = null;   /* Full user profile object from Firestore */
var currentRole   = '';     /* 'artisan' | 'client' | 'admin' */
var regPhoto      = null;   /* base64 photo chosen during registration */
var newPhoto      = null;   /* base64 photo chosen during profile update */
var adminExists   = false;  /* whether any admin account exists in Firestore */

/* ============================================================
   LOADING OVERLAY
   ============================================================ */
function showLoading(msg) {
  var ov = ge('loadingOverlay');
  if (ov) {
    var lt = ov.querySelector('.loading-text');
    if (lt) lt.textContent = msg || 'Please wait...';
    ov.classList.add('show');
  }
}
function hideLoading() {
  var ov = ge('loadingOverlay'); if (ov) ov.classList.remove('show');
}

/* ============================================================
   SCREEN NAVIGATION
   ============================================================ */
var ALL_SCREENS = ['splashScreen','welcomeScreen','registerScreen','loginScreen','forgotScreen','mainApp','adminApp'];

function showScreen(name) {
  var map = {
    splash:'splashScreen', welcome:'welcomeScreen', register:'registerScreen',
    login:'loginScreen', forgot:'forgotScreen', main:'mainApp', admin:'adminApp'
  };
  for (var i = 0; i < ALL_SCREENS.length; i++) {
    var el = ge(ALL_SCREENS[i]); if (el) el.classList.remove('active');
  }
  var target = ge(map[name] || name);
  if (target) target.classList.add('active');
}

/* ============================================================
   INIT  –  Firebase initialisation + event binding
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {

  /* ---- Initialise Firebase ---- */
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db   = firebase.firestore();
    auth = firebase.auth();
    /* Enable offline persistence (data cached locally when offline) */
    db.enablePersistence().catch(function () { /* multi-tab: ignore */ });
  } catch (e) {
    alert('Firebase is not configured. Please edit firebase-config.js with your project credentials.\n\nSee README.txt for the setup guide.');
    return;
  }

  /* ---- Seed sample jobs if database is empty ---- */
  seedSampleJobs();

  /* ---- Check if admin account exists ---- */
  checkAdminExists();

  /* ---- Welcome screen ---- */
  bind('btnArtisan',    function () { selectRole('artisan'); });
  bind('btnClient',     function () { selectRole('client'); });
  bind('btnGoLogin',    function () { showScreen('login'); });
  bind('btnGoAdmin',    function () { showScreen('login'); });

  /* ---- Register ---- */
  bind('btnRegBack',    function () { showScreen('welcome'); });
  bind('btnChoosePhoto',function () { ge('rPhoto').click(); });
  bind('rPhoto',        function () { onRegPhoto(this); }, 'change');
  bind('rCV',           function () { onRegCV(this); }, 'change');
  bind('btnOpenTerms',  function () { showModal('termsModal'); });
  bind('eyeRPass',      function () { togglePW('rPass', this); });
  bind('eyeRConfirm',   function () { togglePW('rConfirm', this); });
  bind('btnRegister',   handleRegister);
  bind('btnRegToLogin', function () { showScreen('login'); });

  /* ---- Login ---- */
  bind('btnLoginBack',     function () { showScreen('welcome'); });
  bind('eyeLPass',         function () { togglePW('lPass', this); });
  bind('btnLogin',         handleLogin);
  bind('btnCreateAdmin',   handleCreateAdmin);
  bind('btnGoForgot',      function () { resetForgot(); showScreen('forgot'); });
  bind('btnLoginToWelcome',function () { showScreen('welcome'); });

  /* ---- Forgot password ---- */
  bind('btnForgotBack',  function () { showScreen('login'); });
  bind('btnSendReset',   handleForgotPassword);
  bind('btnResetToLogin',function () { showScreen('login'); });

  /* ---- Main nav ---- */
  bind('bnHome',    function () { switchTab('home'); });
  bind('bnSearch',  function () { switchTab('search'); });
  bind('bnWork',    function () { switchTab('work'); });
  bind('bnProfile', function () { switchTab('profile'); });

  /* ---- Search ---- */
  bind('srchInput', doSearch, 'input');
  bind('catFilter', doSearch, 'change');
  bind('locFilter', doSearch, 'change');

  /* ---- Work tab ---- */
  bind('ptPost',    function () { switchPostTab('post'); });
  bind('ptMy',      function () { switchPostTab('my'); });
  bind('btnPostJob',handlePostJob);

  /* ---- Profile ---- */
  bind('btnChangePhoto', openImgModal);
  bind('profCV',         function () { onProfileCV(this); }, 'change');
  bind('btnLogout',      handleLogout);
  bind('btnDeleteAcct',  openDeleteModal);

  /* ---- Admin nav ---- */
  bind('anDash',     function () { switchAdminTab('dash'); });
  bind('anArtisans', function () { switchAdminTab('artisans'); });
  bind('anClients',  function () { switchAdminTab('clients'); });
  bind('anReports',  function () { switchAdminTab('reports'); });
  bind('anJobs',     function () { switchAdminTab('jobs'); });
  bind('btnAdminLogout', handleLogout);
  bind('artSrch', function () { loadAdminUsers('artisan'); }, 'input');
  bind('cliSrch', function () { loadAdminUsers('client'); },  'input');
  bind('repFilter',function () { loadAdminReports(); }, 'change');

  /* ---- Modals ---- */
  bind('btnCloseTerms', function () { hideModal('termsModal'); });
  bind('btnCloseJob',   function () { hideModal('jobModal'); });
  bind('btnCancelRep',  function () { hideModal('reportModal'); });
  bind('btnSubmitRep',  submitReport);
  bind('eyeDelPass',    function () { togglePW('delPass', this); });
  bind('btnCancelDel',  function () { hideModal('deleteModal'); });
  bind('btnConfirmDel', confirmDeleteAccount);
  bind('btnPickImg',    function () { ge('imgInput').click(); });
  bind('imgInput',      function () { onNewPhotoSelected(this); }, 'change');
  bind('btnCancelImg',  function () { hideModal('imgModal'); newPhoto = null; });
  bind('btnSavePhoto',  savePhoto);

  /* ---- Firebase Auth state listener ---- */
  auth.onAuthStateChanged(function (user) {
    hideLoading();
    if (user) {
      showLoading('Loading your profile...');
      colUsers().doc(user.uid).get()
        .then(function (doc) {
          hideLoading();
          if (!doc.exists) { auth.signOut(); showScreen('welcome'); return; }
          var data = doc.data();
          data.userId = user.uid;
          if (data.status === 'suspended') {
            auth.signOut();
            showScreen('login');
            showErr('logErr', 'Your account has been suspended by the administrator.');
            return;
          }
          currentUser = data;
          currentRole = data.role;
          if (data.role === 'admin') { showScreen('admin'); loadAdmin(); }
          else                       { showScreen('main'); loadMainApp(); }
        })
        .catch(function (err) {
          hideLoading();
          console.error('Profile load error:', err);
          auth.signOut();
          showScreen('welcome');
        });
    } else {
      showScreen('welcome');
    }
  });

  /* Splash lasts 2 seconds, then auth state listener takes over */
  setTimeout(function () {
    if (!auth.currentUser) showScreen('welcome');
  }, 2000);
});

/* ============================================================
   ADMIN CHECK  –  detect if admin account exists
   ============================================================ */
function checkAdminExists() {
  colUsers().where('role', '==', 'admin').limit(1).get()
    .then(function (snap) {
      adminExists = !snap.empty;
      if (!adminExists) {
        /* Show admin setup UI */
        var banner = ge('adminSetupBanner'); if (banner) banner.style.display = 'block';
        var row    = ge('adminSetupRow');    if (row)    row.style.display    = 'block';
        var btn    = ge('adminSetupBtn');    if (btn)    btn.style.display    = 'block';
        /* Update login title */
        var lt = ge('loginTitle'); if (lt) lt.textContent = 'Sign In / First-Time Setup';
      }
    })
    .catch(function () { /* Firestore not reachable yet, try again later */ });
}

/* ============================================================
   SEED SAMPLE JOBS (runs once if jobs collection is empty)
   ============================================================ */
function seedSampleJobs() {
  colJobs().limit(1).get().then(function (snap) {
    if (!snap.empty) return; /* Already seeded */
    var samples = [
      { title:'Electrician for Office Rewiring',      category:'Electrical',    location:'Lagos',         budget:25000, duration:'2 days', urgent:true,  employer:'ProxiCraft Demo', description:'Certified electrician needed to rewire our office on Victoria Island. Involves replacing sockets, fitting new light fittings, and circuit testing.' },
      { title:'Experienced Plumber for Pipe Repairs', category:'Plumbing',      location:'Abuja',         budget:15000, duration:'1 day',  urgent:false, employer:'ProxiCraft Demo', description:'Plumber required to fix a burst pipe and replace two bathroom taps in a residential property at Maitama.' },
      { title:'Carpenter for Custom Furniture Build', category:'Carpentry',     location:'Port Harcourt', budget:45000, duration:'5 days', urgent:false, employer:'ProxiCraft Demo', description:'Skilled carpenter needed to build custom bookshelves, kitchen cabinet, and wardrobe. Designs provided.' },
      { title:'Painter for 3-Bedroom Apartment',      category:'Painting',      location:'Lagos',         budget:30000, duration:'3 days', urgent:true,  employer:'ProxiCraft Demo', description:'Full interior painting of a 3-bedroom flat in Surulere. Supply own brushes and rollers; paint provided by client.' },
      { title:'Auto Mechanic for Engine Service',     category:'Automobile',    location:'Ibadan',        budget:20000, duration:'1 day',  urgent:false, employer:'ProxiCraft Demo', description:'Experienced mechanic for full engine service, oil change, and brake pad replacement on a Toyota Corolla 2018.' },
      { title:'Deep Clean for Office Block',          category:'Cleaning',      location:'Abuja',         budget:8000,  duration:'1 day',  urgent:false, employer:'ProxiCraft Demo', description:'Professional cleaner for a thorough deep-clean of a 3-floor office building in Garki.' },
      { title:'Mason for Foundation Laying',          category:'Masonry',       location:'Enugu',         budget:60000, duration:'1 week', urgent:true,  employer:'ProxiCraft Demo', description:'Experienced block-layer for foundation and ground-floor work on a new residential project in GRA Enugu.' },
      { title:'Welder for Security Gate Fabrication', category:'Welding',       location:'Lagos',         budget:35000, duration:'2 days', urgent:false, employer:'ProxiCraft Demo', description:'Skilled welder to fabricate and install a heavy-duty steel security gate at a residential property in Ikeja.' }
    ];
    var now = firebase.firestore.FieldValue.serverTimestamp();
    var batch = db.batch();
    for (var i = 0; i < samples.length; i++) {
      var ref = colJobs().doc();
      batch.set(ref, {
        title: samples[i].title, category: samples[i].category,
        location: samples[i].location, budget: samples[i].budget,
        duration: samples[i].duration, description: samples[i].description,
        urgent: samples[i].urgent, employer: samples[i].employer,
        employerId: 'seed', date: new Date().toLocaleDateString('en-GB'),
        status: 'open', createdAt: now
      });
    }
    batch.commit().catch(function (e) { console.warn('Seed failed:', e); });
  }).catch(function () {});
}

/* ============================================================
   ROLE SELECTION / REGISTRATION SCREEN SETUP
   ============================================================ */
function selectRole(role) {
  currentRole = role;
  regPhoto = null;

  setText('regTitle', role === 'artisan' ? 'Create Artisan Account' : 'Create Client Account');
  ge('artisanFields').style.display = role === 'artisan' ? 'block' : 'none';
  ge('clientFields').style.display  = role === 'client'  ? 'block' : 'none';

  /* Reset avatar */
  ge('regAvPrev').innerHTML = '<span class="av-init">&#128247;</span>';

  /* Clear fields */
  var ids = ['rFirst','rLast','rUsername','rEmail','rPhone','rRate','rBusiness','rPass','rConfirm'];
  for (var i = 0; i < ids.length; i++) { var e = ge(ids[i]); if (e) e.value = ''; }
  ge('rCity').value = ''; ge('rQual').value = ''; ge('rCategory').value = '';
  ge('rTerms').checked = false;
  try { ge('rCV').value = ''; } catch (ex) {}
  setText('cvLabel', 'No file selected');
  clearErr('regErr');

  showScreen('register');
  var body = ge('registerScreen').querySelector('.screen-body');
  if (body) body.scrollTop = 0;
}

/* ============================================================
   PASSWORD TOGGLE
   ============================================================ */
function togglePW(id, btn) {
  var inp = ge(id); if (!inp) return;
  inp.type = (inp.type === 'password') ? 'text' : 'password';
  btn.innerHTML = (inp.type === 'text') ? '&#128584;' : '&#128065;';
}

/* ============================================================
   PHOTO AND CV PREVIEW (registration)
   ============================================================ */
function onRegPhoto(input) {
  if (!input.files || !input.files[0]) return;
  var f = input.files[0];
  if (f.type.indexOf('image/') !== 0) { toast('Please select a JPG or PNG image.'); return; }
  resizeImage(f, 150, function (b64) {
    regPhoto = b64;
    ge('regAvPrev').innerHTML = '<img src="' + b64 + '" alt="photo">';
  });
}

function onRegCV(input) {
  setText('cvLabel', 'No file selected');
  if (!input.files || !input.files[0]) return;
  var f = input.files[0];
  if (f.type !== 'application/pdf') { toast('CV must be a PDF file.'); try { input.value = ''; } catch (ex) {} return; }
  if (f.size > 409600) { toast('CV must be under 400KB.'); try { input.value = ''; } catch (ex) {} return; }
  setText('cvLabel', f.name + ' (' + Math.round(f.size / 1024) + ' KB)');
}

/* ============================================================
   REGISTER  –  Firebase Auth + Firestore
   ============================================================ */
function handleRegister() {
  clearErr('regErr');

  var first  = trim('rFirst'), last   = trim('rLast');
  var uname  = trim('rUsername').toLowerCase().replace(/\s+/g, '');
  var email  = trim('rEmail').toLowerCase();
  var phone  = trim('rPhone'), city   = selVal('rCity');
  var pass   = trim('rPass'), conf    = trim('rConfirm');
  var terms  = ge('rTerms').checked;

  if (!first || !last)                   return showErr('regErr', 'Please enter your first and last name.');
  if (!uname || uname.length < 3)        return showErr('regErr', 'Username must be at least 3 characters (no spaces).');
  if (!email || email.indexOf('@') < 1)  return showErr('regErr', 'Please enter a valid email address.');
  if (!phone)                            return showErr('regErr', 'Please enter your phone number.');
  if (!city)                             return showErr('regErr', 'Please select your city.');
  if (!pass || pass.length < 8)          return showErr('regErr', 'Password must be at least 8 characters.');
  if (pass !== conf)                     return showErr('regErr', 'Passwords do not match.');
  if (!terms)                            return showErr('regErr', 'You must accept the Terms and Conditions to register.');

  var qual = '', cat = '', rate = '', biz = '';
  if (currentRole === 'artisan') {
    qual = selVal('rQual'); cat = selVal('rCategory'); rate = trim('rRate');
    if (!qual || qual === 'none') return showErr('regErr', 'Artisans must hold a minimum SSCE/WAEC qualification. Applicants below this standard are not eligible.');
    if (!cat)                    return showErr('regErr', 'Please select your trade / skill category.');
  } else {
    biz = trim('rBusiness');
  }

  showLoading('Creating your account...');

  /* Step 1: Check username uniqueness in Firestore */
  colUsernames().doc(uname).get()
    .then(function (doc) {
      if (doc.exists) {
        hideLoading();
        showErr('regErr', 'This username is already taken. Please choose a different username.');
        return Promise.reject({ handled: true });
      }
      /* Step 2: Create Firebase Auth account (enforces email uniqueness automatically) */
      return auth.createUserWithEmailAndPassword(email, pass);
    })
    .then(function (cred) {
      var uid = cred.user.uid;

      /* Step 3: Read CV if any */
      var cvInput = ge('rCV');
      var cvFile  = (cvInput && cvInput.files && cvInput.files[0]) ? cvInput.files[0] : null;

      function doWrite(cvData, cvName) {
        /* Step 4: Write user profile + username index as a Firestore batch */
        var batch = db.batch();
        var userData = {
          firstName: first, lastName: last, username: uname, email: email,
          phone: phone, city: city, role: currentRole,
          qualification: qual, category: cat, rate: rate, business: biz,
          profileImage: regPhoto || null,
          cv: cvData || null, cvName: cvName || null,
          status: 'active', createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        batch.set(colUsers().doc(uid), userData);
        batch.set(colUsernames().doc(uname), { uid: uid, email: email });
        return batch.commit().then(function () { return uid; });
      }

      if (cvFile) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload  = function (e) { doWrite(e.target.result, cvFile.name).then(resolve).catch(reject); };
          reader.onerror = function ()  { doWrite(null, null).then(resolve).catch(reject); };
          reader.readAsDataURL(cvFile);
        });
      }
      return doWrite(null, null);
    })
    .then(function () {
      hideLoading();
      /* Auth state listener will navigate automatically */
      toast('Welcome to ProxiCraft, ' + first + '!');
    })
    .catch(function (err) {
      hideLoading();
      if (err && err.handled) return;
      if (err.code === 'auth/email-already-in-use') {
        showErr('regErr', 'This email address is already registered. One email can only belong to one account, regardless of role (artisan or client).');
      } else if (err.code === 'auth/weak-password') {
        showErr('regErr', 'Password is too weak. Please choose a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        showErr('regErr', 'Please enter a valid email address.');
      } else {
        showErr('regErr', 'Registration failed: ' + (err.message || 'Please try again.'));
      }
    });
}

/* ============================================================
   ADMIN FIRST-TIME SETUP
   ============================================================ */
function handleCreateAdmin() {
  clearErr('logErr');
  var email    = trim('lEmail').toLowerCase();
  var pass     = trim('lPass');
  var code     = trim('adminCode');
  var uname    = 'admin';

  if (!email || email.indexOf('@') < 1) return showErr('logErr', 'Please enter a valid email address.');
  if (!pass || pass.length < 8)         return showErr('logErr', 'Password must be at least 8 characters.');
  if (code !== ADMIN_SETUP_CODE)        return showErr('logErr', 'Incorrect admin setup code.');
  if (adminExists)                      return showErr('logErr', 'An admin account already exists. Please sign in.');

  showLoading('Creating admin account...');

  /* Check username 'admin' is not taken */
  colUsernames().doc(uname).get()
    .then(function (doc) {
      if (doc.exists) uname = 'admin_' + Date.now().toString(36);
      return auth.createUserWithEmailAndPassword(email, pass);
    })
    .then(function (cred) {
      var uid = cred.user.uid;
      var batch = db.batch();
      batch.set(colUsers().doc(uid), {
        firstName: 'ProxiCraft', lastName: 'Admin', username: uname,
        email: email, phone: '—', city: 'Lagos', role: 'admin',
        status: 'active', createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      batch.set(colUsernames().doc(uname), { uid: uid, email: email });
      return batch.commit();
    })
    .then(function () {
      hideLoading();
      adminExists = true;
      toast('Admin account created! You are now signed in.');
    })
    .catch(function (err) {
      hideLoading();
      if (err.code === 'auth/email-already-in-use') {
        showErr('logErr', 'This email is already registered. Sign in instead.');
      } else {
        showErr('logErr', 'Setup failed: ' + (err.message || 'Please try again.'));
      }
    });
}

/* ============================================================
   LOGIN
   ============================================================ */
function handleLogin() {
  clearErr('logErr');
  var email = trim('lEmail').toLowerCase();
  var pass  = trim('lPass');

  if (!email || email.indexOf('@') < 1) return showErr('logErr', 'Please enter your email address.');
  if (!pass)                            return showErr('logErr', 'Please enter your password.');

  showLoading('Signing in...');

  auth.signInWithEmailAndPassword(email, pass)
    .then(function () {
      hideLoading();
      /* Auth state listener handles navigation */
    })
    .catch(function (err) {
      hideLoading();
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showErr('logErr', 'Incorrect email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        showErr('logErr', 'Too many failed attempts. Please wait a few minutes and try again.');
      } else {
        showErr('logErr', 'Sign in failed: ' + (err.message || 'Please try again.'));
      }
    });
}

function handleLogout() {
  showLoading('Signing out...');
  auth.signOut().then(function () {
    hideLoading();
    currentUser = null; currentRole = '';
    showScreen('welcome');
    toast('You have been signed out.');
    /* Clear login form */
    var le = ge('lEmail'); if (le) le.value = '';
    var lp = ge('lPass');  if (lp) lp.value = '';
    clearErr('logErr');
  });
}

/* ============================================================
   FORGOT PASSWORD  –  Firebase sends the reset email
   ============================================================ */
function resetForgot() {
  var fe = ge('fEmail'); if (fe) fe.value = '';
  var fs = ge('fSuccess'); if (fs) fs.style.display = 'none';
  clearErr('fErr');
}

function handleForgotPassword() {
  clearErr('fErr');
  var fs = ge('fSuccess'); if (fs) fs.style.display = 'none';
  var email = trim('fEmail').toLowerCase();
  if (!email || email.indexOf('@') < 1) return showErr('fErr', 'Please enter your email address.');

  showLoading('Sending reset email...');
  auth.sendPasswordResetEmail(email)
    .then(function () {
      hideLoading();
      var fs2 = ge('fSuccess');
      if (fs2) fs2.style.display = 'block';
    })
    .catch(function (err) {
      hideLoading();
      if (err.code === 'auth/user-not-found') {
        showErr('fErr', 'No account found with this email address.');
      } else {
        showErr('fErr', 'Could not send reset email. Please try again.');
      }
    });
}

/* ============================================================
   MAIN APP SETUP
   ============================================================ */
function loadMainApp() {
  var h = new Date().getHours();
  var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  setText('greetMsg', greet + '!');
  setText('greetName', currentUser.firstName + ' ' + currentUser.lastName);

  var badge = ge('hdrBadge');
  if (badge) { badge.textContent = currentRole === 'artisan' ? 'Artisan' : 'Client'; badge.className = 'role-badge ' + currentRole; }

  if (currentRole === 'artisan') {
    var n = ge('catNotice');
    if (n) { n.style.display = 'block'; n.textContent = 'Showing ' + currentUser.category + ' jobs only. You can only apply for jobs in your registered trade.'; }
    ge('appsPanel').style.display = 'block'; ge('postPanel').style.display = 'none';
    setText('workIco', '&#128203;'); setText('workLbl', 'Applied');
    var cf = ge('catFilter'); if (cf) { cf.value = currentUser.category; cf.disabled = true; }
  } else {
    var n2 = ge('catNotice'); if (n2) n2.style.display = 'none';
    ge('appsPanel').style.display = 'none'; ge('postPanel').style.display = 'block';
    setText('workIco', '&#43;'); setText('workLbl', 'Post');
    var cf2 = ge('catFilter'); if (cf2) cf2.disabled = false;
  }

  switchTab('home');
}

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
function switchTab(tab) {
  var tabs = ['home','search','work','profile'];
  for (var i = 0; i < tabs.length; i++) {
    var pg = ge(tabs[i] + 'Page'); if (pg) pg.classList.remove('active');
    var bn = ge('bn' + cap(tabs[i])); if (bn) bn.classList.remove('active');
  }
  var pg2 = ge(tab + 'Page'); if (pg2) pg2.classList.add('active');
  var bn2 = ge('bn' + cap(tab)); if (bn2) bn2.classList.add('active');

  if (tab === 'home')    loadHomeJobs();
  if (tab === 'search')  doSearch();
  if (tab === 'work')    currentRole === 'artisan' ? loadMyApps() : loadMyJobs();
  if (tab === 'profile') loadProfile();
}

function switchPostTab(t) {
  ge('ptPost').className = 'pill' + (t === 'post' ? ' active' : '');
  ge('ptMy').className   = 'pill' + (t === 'my'   ? ' active' : '');
  ge('postFormDiv').style.display = t === 'post' ? 'block' : 'none';
  ge('myJobsDiv').style.display   = t === 'my'   ? 'block' : 'none';
  if (t === 'my') loadMyJobs();
}

/* ============================================================
   LOAD HOME JOBS  (Firestore query)
   ============================================================ */
function loadHomeJobs() {
  setText('homeCount', '...');
  var query = (currentRole === 'artisan')
    ? colJobs().where('category', '==', currentUser.category).where('status', '==', 'open').orderBy('createdAt', 'desc')
    : colJobs().orderBy('createdAt', 'desc');

  query.get().then(function (snap) {
    var jobs = [];
    snap.forEach(function (doc) { var d = doc.data(); d.jobId = doc.id; jobs.push(d); });
    setText('homeCount', jobs.length + ' job' + (jobs.length !== 1 ? 's' : ''));
    renderGrid(jobs, 'homeGrid');
  }).catch(function (err) {
    setText('homeCount', '0 jobs');
    renderGrid([], 'homeGrid');
    console.warn('loadHomeJobs error:', err);
  });
}

/* ============================================================
   SEARCH  (client-side filter on a fresh Firestore read)
   ============================================================ */
function doSearch() {
  var q   = trim('srchInput').toLowerCase();
  var cat = selVal('catFilter');
  var loc = selVal('locFilter');

  if (currentUser && currentRole === 'artisan') {
    cat = currentUser.category;
    var cf = ge('catFilter'); if (cf) { cf.value = cat; cf.disabled = true; }
  }

  var baseQuery = colJobs().orderBy('createdAt', 'desc');
  baseQuery.get().then(function (snap) {
    var results = [];
    snap.forEach(function (doc) {
      var j = doc.data(); j.jobId = doc.id;
      var matchQ   = !q   || j.title.toLowerCase().indexOf(q) > -1 || (j.description || '').toLowerCase().indexOf(q) > -1;
      var matchCat = !cat || j.category === cat;
      var matchLoc = !loc || j.location === loc;
      if (matchQ && matchCat && matchLoc) results.push(j);
    });
    setText('srchInfo', results.length + ' job' + (results.length !== 1 ? 's' : '') + ' found');
    renderGrid(results, 'srchGrid');
  }).catch(function () { setText('srchInfo', 'Search unavailable. Please check your connection.'); });
}

/* ============================================================
   RENDER JOB GRID
   ============================================================ */
function renderGrid(jobs, cid) {
  var el = ge(cid); if (!el) return;
  if (!jobs || !jobs.length) {
    el.innerHTML = '<div class="empty-state"><p>No jobs found.</p><p>Try adjusting the filters.</p></div>';
    return;
  }
  var html = '';
  for (var i = 0; i < jobs.length; i++) {
    var j = jobs[i];
    html += '<div class="job-card" data-jid="' + esc(j.jobId) + '">'
      + (j.urgent ? '<span class="urgent-tag">Urgent</span>' : '')
      + '<div class="job-title">' + esc(j.title) + '</div>'
      + '<span class="cat-badge">' + esc(j.category) + '</span>'
      + '<div class="job-meta"><span>&#128205; ' + esc(j.location) + '</span><span>&#8987; ' + esc(j.duration) + '</span></div>'
      + '<div class="job-footer"><span class="job-budget">&#8358;' + fmtNum(j.budget) + '</span><span class="view-link">View &#8594;</span></div>'
      + '</div>';
  }
  el.innerHTML = html;
  var cards = el.querySelectorAll('.job-card');
  for (var k = 0; k < cards.length; k++) {
    (function (card) {
      card.addEventListener('click', function () { viewJob(card.getAttribute('data-jid')); });
    })(cards[k]);
  }
}

/* ============================================================
   JOB DETAIL MODAL
   ============================================================ */
function viewJob(jid) {
  showLoading('Loading job details...');
  colJobs().doc(jid).get().then(function (doc) {
    hideLoading();
    if (!doc.exists) { toast('Job not found.'); return; }
    var job = doc.data(); job.jobId = doc.id;

    var catMatch  = currentRole === 'artisan' && job.category === currentUser.category;
    var isOwn     = job.employerId === currentUser.userId;
    var budget    = typeof job.budget === 'number' ? job.budget : 0;

    var html = '<div class="detail-title">' + esc(job.title) + '</div>'
      + '<div class="detail-meta"><span class="cat-badge">' + esc(job.category) + '</span>'
      + (job.urgent ? '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:#FEE2E2;color:#DC2626">Urgent</span>' : '')
      + '</div>'
      + '<div class="d-row"><span class="dil">&#128205; Location</span><span>' + esc(job.location) + '</span></div>'
      + '<div class="d-row"><span class="dil">&#8358; Budget</span><span style="color:#16A34A;font-weight:800">&#8358;' + fmtNum(budget) + '</span></div>'
      + '<div class="d-row"><span class="dil">&#8987; Duration</span><span>' + esc(job.duration) + '</span></div>'
      + '<div class="d-row"><span class="dil">&#127970; Employer</span><span>' + esc(job.employer || '—') + '</span></div>'
      + '<div class="d-row"><span class="dil">&#128197; Posted</span><span>' + esc(job.date || '—') + '</span></div>'
      + '<div class="det-desc"><h4>Description</h4><p>' + esc(job.description) + '</p></div>';

    if (currentRole === 'artisan') {
      if (!catMatch) {
        html += '<div class="restrict-note">&#128683; This job is for a <strong>' + esc(job.category) + '</strong> artisan. Your registered trade is <strong>' + esc(currentUser.category) + '</strong>.</div>';
      } else {
        /* Check if already applied */
        colApps().where('artisanId', '==', currentUser.userId).where('jobId', '==', jid).limit(1).get()
          .then(function (aSnap) {
            var ab = ge('mdApplyBtn');
            if (!aSnap.empty) {
              if (ab) ab.outerHTML = '<div class="applied-tag-lg">&#10003; Application already submitted.</div>';
            }
          });
        html += '<button type="button" class="apply-btn" id="mdApplyBtn">Apply for This Job</button>';
      }
      html += '<button type="button" class="report-job-btn" id="mdReportBtn">&#9888; Report This Employer</button>';
    } else if (isOwn) {
      html += '<div class="applied-tag-lg">&#128204; You posted this job.</div>';
    }

    ge('jobModalBody').innerHTML = html;
    showModal('jobModal');

    var ab = ge('mdApplyBtn');
    if (ab) ab.addEventListener('click', function () { applyForJob(jid, job.category); });
    var rb = ge('mdReportBtn');
    if (rb) rb.addEventListener('click', function () { openReportModal(job.employerId, 'Employer: ' + (job.employer || jid)); });
  }).catch(function (err) {
    hideLoading();
    toast('Could not load job details. Please check your connection.');
    console.warn(err);
  });
}

/* ============================================================
   APPLY FOR JOB
   ============================================================ */
function applyForJob(jid, jobCategory) {
  if (jobCategory && jobCategory !== currentUser.category) {
    toast('You can only apply for ' + currentUser.category + ' jobs.'); return;
  }
  showLoading('Submitting application...');
  /* Check duplicate */
  colApps().where('artisanId', '==', currentUser.userId).where('jobId', '==', jid).limit(1).get()
    .then(function (snap) {
      if (!snap.empty) { hideLoading(); toast('You have already applied for this job.'); return; }
      return colApps().add({
        artisanId: currentUser.userId,
        artisanName: currentUser.firstName + ' ' + currentUser.lastName,
        jobId: jid, status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(function (docRef) {
      if (!docRef) return; /* duplicate handled above */
      hideLoading();
      hideModal('jobModal');
      toast('Application submitted successfully!');
    })
    .catch(function (err) {
      hideLoading();
      toast('Could not submit application. Please try again.');
      console.warn(err);
    });
}

/* ============================================================
   POST JOB  (client)
   ============================================================ */
function handlePostJob() {
  clearErr('postErr');
  var title = trim('pTitle'), cat = selVal('pCat'), loc = selVal('pLoc');
  var bud   = trim('pBudget'), dur = trim('pDuration'), desc = trim('pDesc');
  var urg   = ge('pUrgent') && ge('pUrgent').checked;

  if (!title)                          return showErr('postErr', 'Please enter a job title.');
  if (!cat)                            return showErr('postErr', 'Please select a trade category.');
  if (!loc)                            return showErr('postErr', 'Please select a location.');
  if (!bud || Number(bud) < 500)       return showErr('postErr', 'Please enter a valid budget (minimum &#8358;500).');
  if (!dur)                            return showErr('postErr', 'Please enter the duration (e.g. 2 days).');
  if (!desc)                           return showErr('postErr', 'Please enter a job description.');

  showLoading('Posting your job...');
  colJobs().add({
    title: title, category: cat, location: loc, budget: Number(bud),
    duration: dur, description: desc, urgent: urg,
    employer: currentUser.business || (currentUser.firstName + ' ' + currentUser.lastName),
    employerId: currentUser.userId, date: new Date().toLocaleDateString('en-GB'),
    status: 'open', createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function () {
    hideLoading();
    /* Clear form */
    var ids = ['pTitle','pBudget','pDuration','pDesc'];
    for (var i = 0; i < ids.length; i++) { var e = ge(ids[i]); if (e) e.value = ''; }
    ge('pCat').value = ''; ge('pLoc').value = '';
    if (ge('pUrgent')) ge('pUrgent').checked = false;
    clearErr('postErr');
    toast('Job posted successfully! It is now live on the platform.');
    switchTab('home');
  }).catch(function (err) {
    hideLoading();
    showErr('postErr', 'Could not post job. Please try again.');
    console.warn(err);
  });
}

/* ============================================================
   MY APPLICATIONS  (artisan)
   ============================================================ */
function loadMyApps() {
  setText('appsCount', '...');
  var list = ge('appsList'); if (list) list.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  colApps().where('artisanId', '==', currentUser.userId).orderBy('createdAt', 'desc').get()
    .then(function (snap) {
      setText('appsCount', snap.size);
      if (snap.empty) {
        list.innerHTML = '<div class="empty-state"><p>No applications yet.</p><p>Browse ' + currentUser.category + ' jobs and tap Apply.</p></div>';
        return;
      }
      var html = '';
      var promises = [];
      var appsData = [];
      snap.forEach(function (doc) { appsData.push(doc.data()); });

      /* Fetch each referenced job */
      var fetched = 0;
      for (var i = 0; i < appsData.length; i++) {
        (function (app) {
          promises.push(
            colJobs().doc(app.jobId).get().then(function (jdoc) {
              if (!jdoc.exists) return;
              var j = jdoc.data(); j.jobId = jdoc.id;
              html += '<div class="app-card" data-jid="' + esc(j.jobId) + '">'
                + '<div class="app-top"><span class="cat-badge">' + esc(j.category) + '</span><span class="app-tag">Applied &#10003;</span></div>'
                + '<h4>' + esc(j.title) + '</h4>'
                + '<div class="job-meta"><span>&#128205; ' + esc(j.location) + '</span><span style="color:#16A34A;font-weight:700">&#8358;' + fmtNum(j.budget) + '</span></div>'
                + '</div>';
            })
          );
        })(appsData[i]);
      }

      Promise.all(promises).then(function () {
        if (!list) return;
        list.innerHTML = html || '<div class="empty-state"><p>No jobs found for your applications.</p></div>';
        var cards = list.querySelectorAll('.app-card');
        for (var k = 0; k < cards.length; k++) {
          (function (card) { card.addEventListener('click', function () { viewJob(card.getAttribute('data-jid')); }); })(cards[k]);
        }
      });
    })
    .catch(function () {
      if (list) list.innerHTML = '<div class="empty-state"><p>Could not load applications. Please check your connection.</p></div>';
    });
}

/* ============================================================
   MY POSTED JOBS  (client)
   ============================================================ */
function loadMyJobs() {
  var list = ge('myJobsList');
  if (list) list.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  colJobs().where('employerId', '==', currentUser.userId).orderBy('createdAt', 'desc').get()
    .then(function (snap) {
      if (snap.empty) {
        list.innerHTML = '<div class="empty-state"><p>No jobs posted yet.</p><p>Use the Post a Job tab to create your first listing.</p></div>';
        return;
      }
      var html = '';
      var promises = [];
      snap.forEach(function (doc) {
        var j = doc.data(); j.jobId = doc.id;
        promises.push(
          colApps().where('jobId', '==', j.jobId).get().then(function (aSnap) {
            html += '<div class="job-card">'
              + '<div class="job-title">' + esc(j.title) + '</div>'
              + '<span class="cat-badge">' + esc(j.category) + '</span>'
              + '<div class="job-meta"><span>&#128205; ' + esc(j.location) + '</span><span>&#128101; ' + aSnap.size + ' applicant' + (aSnap.size !== 1 ? 's' : '') + '</span></div>'
              + '<div class="job-footer"><span class="job-budget">&#8358;' + fmtNum(j.budget) + '</span><span class="view-link">' + esc(j.date || '') + '</span></div>'
              + '</div>';
          })
        );
      });
      Promise.all(promises).then(function () { if (list) list.innerHTML = html; });
    })
    .catch(function () {
      if (list) list.innerHTML = '<div class="empty-state"><p>Could not load jobs.</p></div>';
    });
}

/* ============================================================
   PROFILE
   ============================================================ */
function loadProfile() {
  /* Fetch fresh data from Firestore */
  colUsers().doc(currentUser.userId).get().then(function (doc) {
    if (!doc.exists) return;
    var u = doc.data(); u.userId = doc.id;
    currentUser = u;

    var initials = (u.firstName.charAt(0) + u.lastName.charAt(0)).toUpperCase();
    var av = ge('profAv');
    if (av) {
      av.className = 'prof-av' + (currentRole === 'client' ? ' client-av' : '');
      av.innerHTML = u.profileImage ? '<img src="' + u.profileImage + '" alt="photo">' : initials;
    }
    setText('profName', u.firstName + ' ' + u.lastName);
    var badge = ge('profBadge');
    if (badge) { badge.textContent = currentRole === 'artisan' ? 'Artisan' : 'Client'; badge.className = 'role-badge ' + currentRole; }
    setText('pUser',  '@' + u.username);
    setText('pEmail', u.email);
    setText('pPhone', u.phone);
    setText('pCity',  u.city);
    var created = u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString('en-GB') : new Date(u.createdAt).toLocaleDateString('en-GB')) : '—';
    setText('pSince', created);

    if (currentRole === 'artisan') {
      showEls(['aRow1','aRow2','aRow3']); hideEls(['cRow1']);
      setText('pCat2',  u.category);
      setText('pQual',  qualLabel(u.qualification));
      setText('pCvStat',u.cvName ? u.cvName + ' (uploaded)' : 'No CV uploaded');
      ge('cvSection').style.display = 'block';
      setText('profCVLabel', u.cvName || 'No CV uploaded');
      /* Application count */
      colApps().where('artisanId', '==', currentUser.userId).get().then(function (s) {
        setText('sv1', s.size); setText('sl1', 'Applications');
      });
      setText('sv2', u.rate ? '&#8358;' + fmtNum(Number(u.rate)) : 'N/A');
      setText('sl2', 'Daily Rate');
    } else {
      hideEls(['aRow1','aRow2','aRow3']); showEls(['cRow1']);
      ge('cvSection').style.display = 'none';
      setText('pBiz', u.business || 'Not specified');
      colJobs().where('employerId', '==', currentUser.userId).get().then(function (s) {
        setText('sv1', s.size); setText('sl1', 'Jobs Posted');
      });
      setText('sv2', '0'); setText('sl2', 'Hired');
    }
  });
}

/* CV upload */
function onProfileCV(input) {
  if (!input.files || !input.files[0]) return;
  var f = input.files[0];
  if (f.type !== 'application/pdf') { toast('CV must be a PDF file.'); try { input.value = ''; } catch (ex) {} return; }
  if (f.size > 409600) { toast('CV must be under 400KB.'); try { input.value = ''; } catch (ex) {} return; }
  showLoading('Uploading CV...');
  var reader = new FileReader();
  reader.onload = function (e) {
    colUsers().doc(currentUser.userId).update({ cv: e.target.result, cvName: f.name })
      .then(function () {
        hideLoading();
        currentUser.cv = e.target.result; currentUser.cvName = f.name;
        setText('profCVLabel', f.name + ' (uploaded)');
        setText('pCvStat', f.name + ' (uploaded)');
        toast('CV uploaded successfully!');
      })
      .catch(function () { hideLoading(); toast('Could not save CV. Please try again.'); });
  };
  reader.readAsDataURL(f);
}

/* ============================================================
   PROFILE IMAGE UPDATE
   ============================================================ */
function openImgModal() {
  newPhoto = currentUser.profileImage || null;
  var prev = ge('imgPreview');
  if (prev) prev.innerHTML = newPhoto ? '<img src="' + newPhoto + '" alt="photo">' : '&#128100;';
  clearErr('imgErr');
  try { ge('imgInput').value = ''; } catch (ex) {}
  showModal('imgModal');
}

function onNewPhotoSelected(input) {
  if (!input.files || !input.files[0]) return;
  var f = input.files[0];
  if (f.type.indexOf('image/') !== 0) { showErr('imgErr', 'Please select a JPG or PNG image.'); return; }
  resizeImage(f, 150, function (b64) {
    newPhoto = b64;
    ge('imgPreview').innerHTML = '<img src="' + b64 + '" alt="preview">';
  });
}

function savePhoto() {
  if (!newPhoto) { showErr('imgErr', 'Please choose a photo first.'); return; }
  showLoading('Saving photo...');
  colUsers().doc(currentUser.userId).update({ profileImage: newPhoto })
    .then(function () {
      hideLoading();
      currentUser.profileImage = newPhoto;
      hideModal('imgModal');
      loadProfile();
      toast('Profile photo updated!');
    })
    .catch(function () { hideLoading(); toast('Could not save photo. Please try again.'); });
}

/* ============================================================
   IMAGE RESIZE HELPER
   ============================================================ */
function resizeImage(file, px, cb) {
  var rd = new FileReader();
  rd.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas');
      cv.width = px; cv.height = px;
      var ctx = cv.getContext('2d');
      var s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, px, px);
      cb(cv.toDataURL('image/jpeg', 0.75));
    };
    img.src = e.target.result;
  };
  rd.readAsDataURL(file);
}

/* ============================================================
   REPORT SYSTEM
   ============================================================ */
function openReportModal(uid, label) {
  var ri = ge('reportedId'); if (ri) ri.value = uid;
  setText('reportTargetLbl', 'Reporting: ' + label);
  ge('repReason').value = ''; ge('repDetails').value = '';
  clearErr('repErr');
  showModal('reportModal');
}

function submitReport() {
  clearErr('repErr');
  var reason  = selVal('repReason'), details = trim('repDetails');
  var rid     = ge('reportedId') ? ge('reportedId').value : '';
  if (!reason)  return showErr('repErr', 'Please select a reason for this report.');
  if (!details) return showErr('repErr', 'Please provide details about the issue.');

  showLoading('Submitting report...');
  /* Get reported user's name */
  colUsers().doc(rid).get().then(function (doc) {
    var repName = doc.exists ? (doc.data().firstName + ' ' + doc.data().lastName) : 'Unknown';
    return colReports().add({
      reporterId: currentUser.userId,
      reporterName: currentUser.firstName + ' ' + currentUser.lastName,
      reportedId: rid, reportedName: repName,
      reason: reason, details: details,
      status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).then(function () {
    hideLoading();
    hideModal('reportModal');
    toast('Report submitted. The admin team will review within 48 hours.');
  }).catch(function () {
    hideLoading();
    toast('Could not submit report. Please try again.');
  });
}

/* ============================================================
   ACCOUNT DELETION
   ============================================================ */
function openDeleteModal() {
  var dp = ge('delPass'); if (dp) dp.value = '';
  var dc = ge('delChk');  if (dc) dc.checked = false;
  clearErr('delErr');
  showModal('deleteModal');
}

function confirmDeleteAccount() {
  clearErr('delErr');
  var pass = trim('delPass'), chk = ge('delChk') && ge('delChk').checked;
  if (!pass) return showErr('delErr', 'Please enter your password to confirm.');
  if (!chk)  return showErr('delErr', 'Please tick the confirmation checkbox.');

  var user = auth.currentUser;
  if (!user) return showErr('delErr', 'Authentication error. Please sign in again.');

  showLoading('Deleting account...');

  /* Re-authenticate then delete */
  var credential = firebase.auth.EmailAuthProvider.credential(user.email, pass);
  user.reauthenticateWithCredential(credential)
    .then(function () {
      var uid = user.uid;
      /* Delete Firestore documents */
      var batch = db.batch();
      batch.delete(colUsers().doc(uid));
      batch.delete(colUsernames().doc(currentUser.username));
      return batch.commit();
    })
    .then(function () {
      /* Delete applications */
      return colApps().where('artisanId', '==', currentUser.userId).get();
    })
    .then(function (snap) {
      var batch = db.batch();
      snap.forEach(function (doc) { batch.delete(doc.ref); });
      return batch.commit();
    })
    .then(function () {
      /* Delete jobs */
      return colJobs().where('employerId', '==', currentUser.userId).get();
    })
    .then(function (snap) {
      var batch = db.batch();
      snap.forEach(function (doc) { batch.delete(doc.ref); });
      return batch.commit();
    })
    .then(function () {
      /* Delete Firebase Auth account */
      return auth.currentUser.delete();
    })
    .then(function () {
      hideLoading();
      currentUser = null; currentRole = '';
      hideModal('deleteModal');
      showScreen('welcome');
      toast('Your account has been permanently deleted.');
    })
    .catch(function (err) {
      hideLoading();
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showErr('delErr', 'Incorrect password. Account was not deleted.');
      } else {
        showErr('delErr', 'Deletion failed: ' + (err.message || 'Please try again.'));
      }
    });
}

/* ============================================================
   ADMIN PANEL
   ============================================================ */
function loadAdmin() { switchAdminTab('dash'); }

function switchAdminTab(tab) {
  var tabs = ['dash','artisans','clients','reports','jobs'];
  for (var i = 0; i < tabs.length; i++) {
    var pg = ge('ad' + cap(tabs[i])); if (pg) pg.classList.remove('active');
    var bn = ge('an' + cap(tabs[i])); if (bn) bn.classList.remove('active');
  }
  var tp = ge('ad' + cap(tab)); if (tp) tp.classList.add('active');
  var tb = ge('an' + cap(tab)); if (tb) tb.classList.add('active');

  if (tab === 'dash')     loadAdminDashboard();
  if (tab === 'artisans') loadAdminUsers('artisan');
  if (tab === 'clients')  loadAdminUsers('client');
  if (tab === 'reports')  loadAdminReports();
  if (tab === 'jobs')     loadAdminJobs();
}

function loadAdminDashboard() {
  setText('dc1','—'); setText('dc2','—'); setText('dc3','—'); setText('dc4','—');

  Promise.all([
    colUsers().where('role','==','artisan').get(),
    colUsers().where('role','==','client').get(),
    colJobs().get(),
    colReports().where('status','==','pending').get()
  ]).then(function (results) {
    setText('dc1', results[0].size);
    setText('dc2', results[1].size);
    setText('dc3', results[2].size);
    setText('dc4', results[3].size);
  });

  /* Recent 5 users */
  colUsers().where('role','in',['artisan','client']).orderBy('createdAt','desc').limit(5).get()
    .then(function (snap) {
      var dr = ge('dashRecent');
      if (!dr) return;
      if (snap.empty) { dr.innerHTML = '<div class="empty-state"><p>No registered users yet.</p></div>'; return; }
      var users = [];
      snap.forEach(function (doc) { var d = doc.data(); d.userId = doc.id; users.push(d); });
      dr.innerHTML = buildUserCards(users, false);
    });
}

function loadAdminUsers(role) {
  var cid   = role === 'artisan' ? 'artisanList' : 'clientList';
  var sid   = role === 'artisan' ? 'artSrch'     : 'cliSrch';
  var srch  = trim(sid).toLowerCase();
  var el    = ge(cid);
  if (el) el.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  colUsers().where('role','==',role).orderBy('createdAt','desc').get()
    .then(function (snap) {
      if (!el) return;
      if (snap.empty) { el.innerHTML = '<div class="empty-state"><p>No ' + role + 's registered yet.</p></div>'; return; }
      var users = [];
      snap.forEach(function (doc) { var d = doc.data(); d.userId = doc.id; users.push(d); });
      if (srch) {
        users = users.filter(function (u) {
          return (u.firstName + ' ' + u.lastName).toLowerCase().indexOf(srch) > -1 ||
                 u.email.indexOf(srch) > -1 || (u.username || '').indexOf(srch) > -1;
        });
      }
      el.innerHTML = buildUserCards(users, true);
      wireAdminButtons(el);
    })
    .catch(function () {
      if (el) el.innerHTML = '<div class="empty-state"><p>Could not load users.</p></div>';
    });
}

function buildUserCards(users, withActions) {
  var html = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var ini = ((u.firstName || '?').charAt(0) + (u.lastName || '?').charAt(0)).toUpperCase();
    var avHtml = u.profileImage ? '<img src="' + u.profileImage + '" alt="">' : ini;
    html += '<div class="a-user-card' + (u.status === 'suspended' ? ' suspended' : '') + '">'
      + '<div class="auc-av' + (u.role === 'client' ? ' ca' : '') + '">' + avHtml + '</div>'
      + '<div class="auc-info"><div class="auc-name">' + esc(u.firstName) + ' ' + esc(u.lastName) + '</div>'
      + '<div class="auc-sub">@' + esc(u.username || '—') + ' &bull; ' + esc(u.city || '—')
        + (u.role === 'artisan' ? ' &bull; ' + esc(u.category || '—') : '')
        + ' &bull; <span class="sta-' + u.status + '">' + cap(u.status) + '</span></div></div>'
      + (withActions
        ? '<div class="auc-btns">'
            + '<button type="button" class="btn-vw"  data-uid="' + esc(u.userId) + '">View</button>'
            + (u.status === 'active'
              ? '<button type="button" class="btn-sus" data-uid="' + esc(u.userId) + '">Suspend</button>'
              : '<button type="button" class="btn-rei" data-uid="' + esc(u.userId) + '">Reinstate</button>')
            + '</div>'
        : '')
      + '</div>';
  }
  return html;
}

function wireAdminButtons(el) {
  var vw  = el.querySelectorAll('.btn-vw');
  var sus = el.querySelectorAll('.btn-sus');
  var rei = el.querySelectorAll('.btn-rei');
  for (var i = 0; i < vw.length;  i++) { (function(b){ b.addEventListener('click', function(){ viewUserDetail(b.getAttribute('data-uid')); }); })(vw[i]); }
  for (var i = 0; i < sus.length; i++) { (function(b){ b.addEventListener('click', function(){ adminSetStatus(b.getAttribute('data-uid'),'suspended'); }); })(sus[i]); }
  for (var i = 0; i < rei.length; i++) { (function(b){ b.addEventListener('click', function(){ adminSetStatus(b.getAttribute('data-uid'),'active'); }); })(rei[i]); }
}

function adminSetStatus(uid, status) {
  showLoading(status === 'suspended' ? 'Suspending account...' : 'Reinstating account...');
  colUsers().doc(uid).update({ status: status })
    .then(function () {
      hideLoading();
      loadAdminDashboard();
      colUsers().doc(uid).get().then(function (doc) {
        if (doc.exists) loadAdminUsers(doc.data().role);
      });
      toast('Account ' + status + '.');
    })
    .catch(function () { hideLoading(); toast('Could not update account.'); });
}

function viewUserDetail(uid) {
  showLoading('Loading user...');
  colUsers().doc(uid).get().then(function (doc) {
    hideLoading();
    if (!doc.exists) { toast('User not found.'); return; }
    var u = doc.data(); u.userId = doc.id;
    var ini = ((u.firstName || '?').charAt(0) + (u.lastName || '?').charAt(0)).toUpperCase();
    var avHtml = u.profileImage ? '<img src="' + u.profileImage + '" alt="">' : ini;
    var created = u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString('en-GB') : '—') : '—';

    ge('userDetailBody').innerHTML =
      '<div class="ud-hdr"><div class="ud-av' + (u.role === 'client' ? ' ca' : '') + '">' + avHtml + '</div>'
      + '<div><div class="ud-name">' + esc(u.firstName) + ' ' + esc(u.lastName) + '</div>'
      + '<span class="role-badge ' + u.role + '">' + cap(u.role) + '</span> '
      + '<span class="sta-' + u.status + '">' + cap(u.status) + '</span></div></div>'
      + '<div class="detail-card">'
      + drow('Username','@' + (u.username||'—')) + drow('Email',u.email) + drow('Phone',u.phone||'—') + drow('City',u.city||'—')
      + (u.role==='artisan' ? drow('Trade',u.category||'—') + drow('Qualification',qualLabel(u.qualification)) + drow('CV',u.cvName||'None') : '')
      + (u.role==='client'  ? drow('Business',u.business||'N/A') : '')
      + drow('Joined', created) + '</div>';

    ge('userDetailActions').innerHTML =
      '<button type="button" class="btn-outline" id="udClose">Close</button>'
      + (u.status === 'active'
        ? '<button type="button" class="btn-sus" id="udSus">Suspend</button>'
        : '<button type="button" class="btn-rei" id="udRei">Reinstate</button>')
      + '<button type="button" class="btn-danger-sm" id="udDel">Delete</button>';

    bind('udClose', function () { hideModal('userDetailModal'); });
    bind('udSus',   function () { adminSetStatus(uid,'suspended'); hideModal('userDetailModal'); });
    bind('udRei',   function () { adminSetStatus(uid,'active');    hideModal('userDetailModal'); });
    bind('udDel',   function () {
      if (!confirm('Permanently delete this account? This cannot be undone.')) return;
      showLoading('Deleting account...');
      colUsers().doc(uid).get().then(function(d){
        var uname = d.exists ? d.data().username : null;
        var role  = d.exists ? d.data().role : 'artisan';
        var batch = db.batch();
        batch.delete(colUsers().doc(uid));
        if (uname) batch.delete(colUsernames().doc(uname));
        return batch.commit().then(function(){ return role; });
      }).then(function(role){
        hideLoading(); hideModal('userDetailModal');
        loadAdminDashboard(); loadAdminUsers(role);
        toast('Account deleted.');
      }).catch(function(){ hideLoading(); toast('Could not delete account.'); });
    });
    showModal('userDetailModal');
  }).catch(function () { hideLoading(); toast('Could not load user.'); });
}

function loadAdminReports() {
  var filter = selVal('repFilter') || 'pending';
  var el = ge('reportsList');
  if (el) el.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  var query = filter === 'all' ? colReports().orderBy('createdAt','desc') :
              colReports().where('status','==',filter).orderBy('createdAt','desc');

  query.get().then(function (snap) {
    if (!el) return;
    if (snap.empty) { el.innerHTML = '<div class="empty-state"><p>No reports found.</p></div>'; return; }
    var html = '';
    snap.forEach(function (doc) {
      var r = doc.data(); r.reportId = doc.id;
      var created = r.createdAt ? (r.createdAt.toDate ? r.createdAt.toDate().toLocaleDateString('en-GB') : '—') : '—';
      html += '<div class="rep-card' + (r.status === 'resolved' ? ' resolved' : '') + '">'
        + '<div class="rep-hdr"><div class="rep-title">' + esc(r.reason) + '</div><span class="rep-sta ' + r.status + '">' + cap(r.status) + '</span></div>'
        + '<div class="rep-body">From: <strong>' + esc(r.reporterName) + '</strong> &rarr; Against: <strong>' + esc(r.reportedName) + '</strong><br>' + esc(r.details) + '<br><small>' + created + '</small></div>'
        + (r.status === 'pending' ? '<button type="button" class="btn-res" data-rid="' + esc(r.reportId) + '">&#10003; Resolve</button>' : '')
        + '</div>';
    });
    el.innerHTML = html;
    var btns = el.querySelectorAll('.btn-res');
    for (var k = 0; k < btns.length; k++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          showLoading('Resolving report...');
          colReports().doc(btn.getAttribute('data-rid')).update({ status: 'resolved' })
            .then(function () { hideLoading(); loadAdminReports(); loadAdminDashboard(); toast('Report resolved.'); })
            .catch(function () { hideLoading(); toast('Could not update report.'); });
        });
      })(btns[k]);
    }
  }).catch(function () { if (el) el.innerHTML = '<div class="empty-state"><p>Could not load reports.</p></div>'; });
}

function loadAdminJobs() {
  colJobs().orderBy('createdAt','desc').get().then(function (snap) {
    var jobs = [];
    snap.forEach(function (doc) { var d = doc.data(); d.jobId = doc.id; jobs.push(d); });
    renderGrid(jobs, 'adminJobGrid');
  }).catch(function () { renderGrid([], 'adminJobGrid'); });
}

/* ============================================================
   UTILITIES
   ============================================================ */
function qualLabel(q) {
  var m = { none:'None',ssce:'SSCE/WAEC/NECO',nabteb:'NABTEB',ond:'OND',hnd:'HND',bsc:'BSc/B.Tech',msc:'MSc/M.Tech',other:'Other Equivalent' };
  return m[q] || q || 'Not specified';
}
function drow(lbl, val) { return '<div class="drow"><span class="dlbl">' + lbl + '</span><span class="dval">' + esc(String(val || '')) + '</span></div>'; }
function showEls(ids) { for (var i = 0; i < ids.length; i++) { var e = ge(ids[i]); if (e) e.style.display = 'flex'; } }
function hideEls(ids) { for (var i = 0; i < ids.length; i++) { var e = ge(ids[i]); if (e) e.style.display = 'none'; } }
function showModal(id) { var e = ge(id); if (e) e.style.display = 'flex'; }
function hideModal(id) { var e = ge(id); if (e) e.style.display = 'none'; }
function cap(s)       { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function ge(id)       { return document.getElementById(id); }
function trim(id)     { var e = ge(id); return e ? (e.value || '').trim() : ''; }
function selVal(id)   { var e = ge(id); return e ? (e.value || '') : ''; }
function setText(id, html) { var e = ge(id); if (e) e.innerHTML = html; }
function showErr(id, msg)  { var e = ge(id); if (e) e.innerHTML = msg; }
function clearErr(id)      { var e = ge(id); if (e) e.textContent = ''; }
function fmtNum(n)    { return Number(n).toLocaleString(); }
function esc(s)       { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(msg) {
  var t = ge('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3500);
}
function bind(id, fn, evt) {
  var el = ge(id); if (el && fn) el.addEventListener(evt || 'click', fn);
}
