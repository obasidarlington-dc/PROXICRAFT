/*  ProxiCraft v2  –  Firebase Edition (Full Feature)
    Real-time Firestore listeners, artisan directory, star ratings,
    applicant contact details, job location in applications.          */

/* ── Firebase globals ── */
var db = null, auth = null;
function colUsers()     { return db.collection('users');        }
function colUsernames() { return db.collection('usernames');    }
function colJobs()      { return db.collection('jobs');         }
function colApps()      { return db.collection('applications'); }
function colReports()   { return db.collection('reports');      }
function colRatings()   { return db.collection('ratings');      }

/* ── App state ── */
var currentUser = null, currentRole = '', adminExists = false;
var regPhoto = null, newPhoto = null;
var selectedRating = 0;

/* ── Real-time listener registry (prevents memory leaks) ── */
var _lsn = {};
function listenTo(key, unsub) { if (_lsn[key]) _lsn[key](); _lsn[key] = unsub; }
function stopListener(key)    { if (_lsn[key]) { _lsn[key](); delete _lsn[key]; } }
function stopAll()            { Object.keys(_lsn).forEach(function(k){ _lsn[k](); }); _lsn = {}; }

/* ── Loading overlay ── */
function showLoading(m){ var o=ge('loadingOverlay'); if(o){ var t=o.querySelector('.loading-text'); if(t)t.textContent=m||'Please wait...'; o.classList.add('show'); } }
function hideLoading() { var o=ge('loadingOverlay'); if(o) o.classList.remove('show'); }

/* ── Screen navigation ── */
var SCREENS=['splashScreen','welcomeScreen','registerScreen','loginScreen','forgotScreen','mainApp','adminApp'];
function showScreen(name){
  var map={splash:'splashScreen',welcome:'welcomeScreen',register:'registerScreen',
           login:'loginScreen',forgot:'forgotScreen',main:'mainApp',admin:'adminApp'};
  SCREENS.forEach(function(s){ var e=ge(s); if(e) e.classList.remove('active'); });
  var t=ge(map[name]||name); if(t) t.classList.add('active');
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', function(){
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db   = firebase.firestore();
    auth = firebase.auth();
    db.enablePersistence().catch(function(){});
  } catch(e) {
    alert('Firebase not configured. Edit firebase-config.js.\nSee README.txt.');
    return;
  }

  seedSampleJobs();
  checkAdminExists();

  /* Welcome */
  bind('btnArtisan',   function(){ selectRole('artisan'); });
  bind('btnClient',    function(){ selectRole('client'); });
  bind('btnGoLogin',   function(){ showScreen('login'); });
  bind('btnGoAdmin',   function(){ showScreen('login'); });

  /* Register */
  bind('btnRegBack',   function(){ showScreen('welcome'); });
  bind('btnChoosePhoto',function(){ ge('rPhoto').click(); });
  bind('rPhoto',       function(){ onRegPhoto(this); },'change');
  bind('rCV',          function(){ onRegCV(this); },'change');
  bind('btnOpenTerms', function(){ showModal('termsModal'); });
  bind('eyeRPass',     function(){ togglePW('rPass',this); });
  bind('eyeRConfirm',  function(){ togglePW('rConfirm',this); });
  bind('btnRegister',  handleRegister);
  bind('btnRegToLogin',function(){ showScreen('login'); });

  /* Login */
  bind('btnLoginBack',     function(){ showScreen('welcome'); });
  bind('eyeLPass',         function(){ togglePW('lPass',this); });
  bind('btnLogin',         handleLogin);
  bind('btnCreateAdmin',   handleCreateAdmin);
  bind('btnGoForgot',      function(){ resetForgot(); showScreen('forgot'); });
  bind('btnLoginToWelcome',function(){ showScreen('welcome'); });

  /* Forgot */
  bind('btnForgotBack',  function(){ showScreen('login'); });
  bind('btnSendReset',   handleForgotPassword);
  bind('btnResetToLogin',function(){ showScreen('login'); });

  /* Main nav */
  bind('bnHome',    function(){ switchTab('home'); });
  bind('bnSearch',  function(){ switchTab('search'); });
  bind('bnWork',    function(){ switchTab('work'); });
  bind('bnProfile', function(){ switchTab('profile'); });

  /* Search */
  bind('srchInput',doSearch,'input');
  bind('catFilter',doSearch,'change');
  bind('locFilter',doSearch,'change');

  /* Work tabs */
  bind('ptPost',function(){ switchPostTab('post'); });
  bind('ptMy',  function(){ switchPostTab('my'); });
  bind('ptArt', function(){ switchPostTab('artisans'); });
  bind('btnPostJob',handlePostJob);

  /* Artisan directory filters */
  bind('artCatFilter', function(){ loadArtisanDirectory(); },'change');
  bind('artCityFilter',function(){ loadArtisanDirectory(); },'change');

  /* Profile */
  bind('btnChangePhoto',openImgModal);
  bind('profCV',function(){ onProfileCV(this); },'change');
  bind('btnLogout',    handleLogout);
  bind('btnDeleteAcct',openDeleteModal);

  /* Admin nav */
  bind('anDash',     function(){ switchAdminTab('dash'); });
  bind('anArtisans', function(){ switchAdminTab('artisans'); });
  bind('anClients',  function(){ switchAdminTab('clients'); });
  bind('anReports',  function(){ switchAdminTab('reports'); });
  bind('anJobs',     function(){ switchAdminTab('jobs'); });
  bind('btnAdminLogout',handleLogout);
  bind('artSrch',function(){ loadAdminUsers('artisan'); },'input');
  bind('cliSrch',function(){ loadAdminUsers('client'); },'input');
  bind('repFilter',function(){ loadAdminReports(); },'change');

  /* Modals */
  bind('btnCloseTerms',   function(){ hideModal('termsModal'); });
  bind('btnCloseJob',     function(){ hideModal('jobModal'); });
  bind('btnCloseArtProfile',function(){ hideModal('artisanProfileModal'); });
  bind('btnCancelRating', function(){ hideModal('ratingModal'); selectedRating=0; });
  bind('btnSubmitRating', submitRating);
  bind('btnCancelRep',    function(){ hideModal('reportModal'); });
  bind('btnSubmitRep',    submitReport);
  bind('eyeDelPass',      function(){ togglePW('delPass',this); });
  bind('btnCancelDel',    function(){ hideModal('deleteModal'); });
  bind('btnConfirmDel',   confirmDeleteAccount);
  bind('btnPickImg',      function(){ ge('imgInput').click(); });
  bind('imgInput',        function(){ onNewPhotoSelected(this); },'change');
  bind('btnCancelImg',    function(){ hideModal('imgModal'); newPhoto=null; });
  bind('btnSavePhoto',    savePhoto);

  /* Star buttons */
  var stars = document.querySelectorAll('.star[data-v]');
  for(var i=0;i<stars.length;i++){
    (function(s){ s.addEventListener('click',function(){ setRating(parseInt(s.getAttribute('data-v'))); }); })(stars[i]);
  }

  /* Firebase Auth state */
  auth.onAuthStateChanged(function(user){
    hideLoading();
    if(user){
      showLoading('Loading your profile...');
      colUsers().doc(user.uid).get()
        .then(function(doc){
          hideLoading();
          if(!doc.exists){ auth.signOut(); showScreen('welcome'); return; }
          var d=doc.data(); d.userId=user.uid;
          if(d.status==='suspended'){ auth.signOut(); showScreen('login'); showErr('logErr','Your account has been suspended.'); return; }
          currentUser=d; currentRole=d.role;
          if(d.role==='admin'){ showScreen('admin'); loadAdmin(); }
          else               { showScreen('main');  loadMainApp(); }
        })
        .catch(function(){ hideLoading(); auth.signOut(); showScreen('welcome'); });
    } else {
      showScreen('welcome');
    }
  });
  setTimeout(function(){ if(!auth.currentUser) showScreen('welcome'); },2000);
});

/* ================================================================
   ADMIN CHECK & SEED
   ================================================================ */
function checkAdminExists(){
  colUsers().where('role','==','admin').limit(1).get().then(function(s){
    adminExists=!s.empty;
    if(!adminExists){
      var b=ge('adminSetupBanner'); if(b) b.style.display='block';
      var r=ge('adminSetupRow');    if(r) r.style.display='block';
      var btn=ge('adminSetupBtn'); if(btn) btn.style.display='block';
    }
  }).catch(function(){});
}

function seedSampleJobs(){
  colJobs().limit(1).get().then(function(s){
    if(!s.empty) return;
    var ts=firebase.firestore.FieldValue.serverTimestamp();
    var batch=db.batch();
    var samples=[
      {title:'Electrician for Office Rewiring',      category:'Electrical',    location:'Lagos',         budget:25000,duration:'2 days',urgent:true, employer:'ProxiCraft Demo',description:'Rewire office on Victoria Island. Involves replacing sockets, light fittings, and circuit testing.'},
      {title:'Plumber for Pipe Repairs',             category:'Plumbing',      location:'Abuja',         budget:15000,duration:'1 day', urgent:false,employer:'ProxiCraft Demo',description:'Fix burst pipe and replace two bathroom taps at Maitama. Materials provided.'},
      {title:'Carpenter for Custom Furniture',       category:'Carpentry',     location:'Port Harcourt', budget:45000,duration:'5 days',urgent:false,employer:'ProxiCraft Demo',description:'Build bookshelves, kitchen cabinet, and wardrobe for a new 3-bedroom home.'},
      {title:'Painter for 3-Bedroom Apartment',      category:'Painting',      location:'Lagos',         budget:30000,duration:'3 days',urgent:true, employer:'ProxiCraft Demo',description:'Full interior painting of flat in Surulere. Supply own brushes. Paint provided.'},
      {title:'Auto Mechanic for Engine Service',     category:'Automobile',    location:'Ibadan',        budget:20000,duration:'1 day', urgent:false,employer:'ProxiCraft Demo',description:'Full engine service, oil change, and brake pads on Toyota Corolla 2018.'},
      {title:'Deep Clean for Office Block',          category:'Cleaning',      location:'Abuja',         budget:8000, duration:'1 day', urgent:false,employer:'ProxiCraft Demo',description:'Thorough deep-clean of a 3-floor office in Garki. Bring own materials.'},
      {title:'Mason for Foundation Laying',          category:'Masonry',       location:'Enugu',         budget:60000,duration:'1 week',urgent:true, employer:'ProxiCraft Demo',description:'Foundation and ground-floor block-laying at new residential site in GRA.'},
      {title:'Welder for Security Gate',             category:'Welding',       location:'Lagos',         budget:35000,duration:'2 days',urgent:false,employer:'ProxiCraft Demo',description:'Fabricate and install heavy-duty steel security gate in Ikeja.'}
    ];
    samples.forEach(function(s){
      var ref=colJobs().doc();
      batch.set(ref,Object.assign({},s,{employerId:'seed',date:new Date().toLocaleDateString('en-GB'),status:'open',createdAt:ts}));
    });
    batch.commit().catch(function(){});
  }).catch(function(){});
}

/* ================================================================
   ROLE SELECTION
   ================================================================ */
function selectRole(role){
  currentRole=role;
  regPhoto=null;
  setText('regTitle',role==='artisan'?'Create Artisan Account':'Create Client Account');
  ge('artisanFields').style.display=role==='artisan'?'block':'none';
  ge('clientFields').style.display =role==='client' ?'block':'none';
  ge('regAvPrev').innerHTML='<span class="av-init">&#128247;</span>';
  ['rFirst','rLast','rUsername','rEmail','rPhone','rRate','rBusiness','rPass','rConfirm'].forEach(function(id){ var e=ge(id); if(e) e.value=''; });
  ge('rCity').value=''; ge('rQual').value=''; ge('rCategory').value='';
  ge('rTerms').checked=false;
  try{ ge('rCV').value=''; }catch(ex){}
  setText('cvLabel','No file selected');
  clearErr('regErr');
  showScreen('register');
  var b=ge('registerScreen').querySelector('.screen-body'); if(b) b.scrollTop=0;
}

function togglePW(id,btn){ var i=ge(id); if(!i) return; i.type=(i.type==='password'?'text':'password'); btn.innerHTML=(i.type==='text'?'&#128584;':'&#128065;'); }
function onRegPhoto(inp){ if(!inp.files||!inp.files[0]) return; var f=inp.files[0]; if(f.type.indexOf('image/')!==0){toast('Select JPG or PNG');return;} resizeImg(f,150,function(b){regPhoto=b; ge('regAvPrev').innerHTML='<img src="'+b+'" alt="">';}); }
function onRegCV(inp){ setText('cvLabel','No file selected'); if(!inp.files||!inp.files[0]) return; var f=inp.files[0]; if(f.type!=='application/pdf'){toast('CV must be PDF'); try{inp.value='';}catch(e){} return;} if(f.size>409600){toast('CV must be under 400KB'); try{inp.value='';}catch(e){} return;} setText('cvLabel',f.name+' ('+Math.round(f.size/1024)+' KB)'); }

/* ================================================================
   REGISTER
   ================================================================ */
function handleRegister(){
  clearErr('regErr');
  var first=trim('rFirst'),last=trim('rLast'),uname=trim('rUsername').toLowerCase().replace(/\s+/g,''),
      email=trim('rEmail').toLowerCase(),phone=trim('rPhone'),city=selVal('rCity'),
      pass=trim('rPass'),conf=trim('rConfirm'),terms=ge('rTerms').checked;

  if(!first||!last)              return showErr('regErr','Please enter your first and last name.');
  if(!uname||uname.length<3)    return showErr('regErr','Username must be at least 3 characters.');
  if(!email||email.indexOf('@')<1) return showErr('regErr','Please enter a valid email address.');
  if(!phone)                     return showErr('regErr','Please enter your phone number.');
  if(!city)                      return showErr('regErr','Please select your city.');
  if(!pass||pass.length<8)       return showErr('regErr','Password must be at least 8 characters.');
  if(pass!==conf)                return showErr('regErr','Passwords do not match.');
  if(!terms)                     return showErr('regErr','You must accept the Terms and Conditions.');

  var qual='',cat='',rate='',biz='';
  if(currentRole==='artisan'){
    qual=selVal('rQual'); cat=selVal('rCategory'); rate=trim('rRate');
    if(!qual||qual==='none') return showErr('regErr','Artisans must hold a minimum SSCE/WAEC qualification.');
    if(!cat)                 return showErr('regErr','Please select your trade / skill category.');
  } else { biz=trim('rBusiness'); }

  showLoading('Creating your account...');
  colUsernames().doc(uname).get()
    .then(function(doc){
      if(doc.exists){ hideLoading(); showErr('regErr','This username is already taken.'); return Promise.reject({handled:true}); }
      return auth.createUserWithEmailAndPassword(email,pass);
    })
    .then(function(cred){
      var uid=cred.user.uid;
      var cvInp=ge('rCV'), cvFile=(cvInp&&cvInp.files&&cvInp.files[0])?cvInp.files[0]:null;
      function doWrite(cvData,cvName){
        var batch=db.batch();
        batch.set(colUsers().doc(uid),{
          firstName:first,lastName:last,username:uname,email:email,phone:phone,city:city,
          role:currentRole,qualification:qual,category:cat,rate:rate,business:biz,
          profileImage:regPhoto||null,cv:cvData||null,cvName:cvName||null,
          status:'active',averageRating:0,ratingCount:0,
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
        batch.set(colUsernames().doc(uname),{uid:uid,email:email});
        return batch.commit();
      }
      if(cvFile){
        return new Promise(function(res,rej){
          var rd=new FileReader();
          rd.onload=function(e){ doWrite(e.target.result,cvFile.name).then(res).catch(rej); };
          rd.onerror=function(){ doWrite(null,null).then(res).catch(rej); };
          rd.readAsDataURL(cvFile);
        });
      }
      return doWrite(null,null);
    })
    .then(function(){ hideLoading(); toast('Welcome to ProxiCraft, '+first+'!'); })
    .catch(function(err){
      hideLoading();
      if(err&&err.handled) return;
      if(err.code==='auth/email-already-in-use') showErr('regErr','This email is already registered. One email can only belong to one account regardless of role.');
      else if(err.code==='auth/weak-password')   showErr('regErr','Password is too weak. Please choose a stronger one.');
      else showErr('regErr','Registration failed: '+(err.message||'Please try again.'));
    });
}

/* ================================================================
   ADMIN SETUP
   ================================================================ */
function handleCreateAdmin(){
  clearErr('logErr');
  var email=trim('lEmail').toLowerCase(),pass=trim('lPass'),code=trim('adminCode');
  if(!email||email.indexOf('@')<1) return showErr('logErr','Enter a valid email.');
  if(!pass||pass.length<8)         return showErr('logErr','Password must be at least 8 characters.');
  if(code!==ADMIN_SETUP_CODE)      return showErr('logErr','Incorrect admin setup code.');
  if(adminExists)                  return showErr('logErr','Admin already exists. Please sign in instead.');
  showLoading('Creating admin account...');
  var uname='admin';
  colUsernames().doc(uname).get()
    .then(function(doc){ if(doc.exists) uname='admin_'+Date.now().toString(36); return auth.createUserWithEmailAndPassword(email,pass); })
    .then(function(cred){
      var uid=cred.user.uid, batch=db.batch();
      batch.set(colUsers().doc(uid),{firstName:'ProxiCraft',lastName:'Admin',username:uname,email:email,phone:'—',city:'Lagos',role:'admin',status:'active',createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      batch.set(colUsernames().doc(uname),{uid:uid,email:email});
      return batch.commit();
    })
    .then(function(){ hideLoading(); adminExists=true; toast('Admin account created!'); })
    .catch(function(err){ hideLoading(); showErr('logErr','Setup failed: '+(err.message||'Try again.')); });
}

/* ================================================================
   LOGIN / LOGOUT
   ================================================================ */
function handleLogin(){
  clearErr('logErr');
  var email=trim('lEmail').toLowerCase(),pass=trim('lPass');
  if(!email||email.indexOf('@')<1) return showErr('logErr','Enter your email address.');
  if(!pass)                        return showErr('logErr','Enter your password.');
  showLoading('Signing in...');
  auth.signInWithEmailAndPassword(email,pass)
    .then(function(){ hideLoading(); })
    .catch(function(err){
      hideLoading();
      if(err.code==='auth/user-not-found'||err.code==='auth/wrong-password'||err.code==='auth/invalid-credential') showErr('logErr','Incorrect email or password.');
      else if(err.code==='auth/too-many-requests') showErr('logErr','Too many attempts. Wait a few minutes and try again.');
      else showErr('logErr','Sign in failed. Please try again.');
    });
}

function handleLogout(){
  stopAll();
  showLoading('Signing out...');
  auth.signOut().then(function(){
    hideLoading(); currentUser=null; currentRole='';
    var le=ge('lEmail'); if(le) le.value='';
    var lp=ge('lPass');  if(lp) lp.value='';
    clearErr('logErr');
    showScreen('welcome');
    toast('You have been signed out.');
  });
}

function resetForgot(){ var e=ge('fEmail'); if(e) e.value=''; var s=ge('fSuccess'); if(s) s.style.display='none'; clearErr('fErr'); }
function handleForgotPassword(){
  clearErr('fErr');
  var s=ge('fSuccess'); if(s) s.style.display='none';
  var email=trim('fEmail').toLowerCase();
  if(!email||email.indexOf('@')<1) return showErr('fErr','Enter your email address.');
  showLoading('Sending reset email...');
  auth.sendPasswordResetEmail(email)
    .then(function(){ hideLoading(); var s2=ge('fSuccess'); if(s2) s2.style.display='block'; })
    .catch(function(err){ hideLoading(); if(err.code==='auth/user-not-found') showErr('fErr','No account found with this email.'); else showErr('fErr','Could not send reset email. Try again.'); });
}

/* ================================================================
   MAIN APP SETUP
   ================================================================ */
function loadMainApp(){
  var h=new Date().getHours();
  setText('greetMsg',(h<12?'Good morning':h<17?'Good afternoon':'Good evening')+'!');
  setText('greetName',currentUser.firstName+' '+currentUser.lastName);
  var badge=ge('hdrBadge'); if(badge){ badge.textContent=currentRole==='artisan'?'Artisan':'Client'; badge.className='role-badge '+currentRole; }
  if(currentRole==='artisan'){
    var n=ge('catNotice'); if(n){ n.style.display='block'; n.textContent='Showing '+currentUser.category+' jobs only.'; }
    ge('appsPanel').style.display='block'; ge('postPanel').style.display='none';
    setText('workIco','&#128203;'); setText('workLbl','Applied');
    var cf=ge('catFilter'); if(cf){ cf.value=currentUser.category; cf.disabled=true; }
  } else {
    var n2=ge('catNotice'); if(n2) n2.style.display='none';
    ge('appsPanel').style.display='none'; ge('postPanel').style.display='block';
    setText('workIco','&#43;'); setText('workLbl','Post');
    var cf2=ge('catFilter'); if(cf2) cf2.disabled=false;
  }
  switchTab('home');
}

/* ================================================================
   TAB NAVIGATION
   ================================================================ */
function switchTab(tab){
  ['home','search','work','profile'].forEach(function(t){
    var pg=ge(t+'Page'); if(pg) pg.classList.remove('active');
    var bn=ge('bn'+cap(t)); if(bn) bn.classList.remove('active');
  });
  var pg=ge(tab+'Page'); if(pg) pg.classList.add('active');
  var bn=ge('bn'+cap(tab)); if(bn) bn.classList.add('active');

  if(tab==='home')    subscribeHomeJobs();
  if(tab==='search')  doSearch();
  if(tab==='work')    currentRole==='artisan'?subscribeMyApps():switchPostTab('post');
  if(tab==='profile') loadProfile();
}

function switchPostTab(t){
  ge('ptPost').className='pill'+(t==='post'?' active':'');
  ge('ptMy').className  ='pill'+(t==='my'  ?' active':'');
  ge('ptArt').className ='pill'+(t==='artisans'?' active':'');
  ge('postFormDiv').style.display=t==='post'    ?'block':'none';
  ge('myJobsDiv').style.display  =t==='my'      ?'block':'none';
  ge('artDirDiv').style.display  =t==='artisans'?'block':'none';
  if(t==='my')      subscribeMyJobs();
  if(t==='artisans')loadArtisanDirectory();
}

/* ================================================================
   HOME JOBS  –  real-time onSnapshot
   ================================================================ */
function subscribeHomeJobs(){
  setText('homeCount','...');
  /* Stop old listener */
  stopListener('home');

  var query;
  if(currentRole==='artisan'){
    /* Artisan: only their trade, sorted client-side to avoid composite index */
    query=colJobs().where('category','==',currentUser.category);
  } else {
    query=colJobs();
  }

  var unsub=query.onSnapshot(function(snap){
    var jobs=[];
    snap.forEach(function(doc){ var d=doc.data(); d.jobId=doc.id; if(d.status==='open'||!d.status) jobs.push(d); });
    jobs.sort(function(a,b){
      var ta=a.createdAt&&a.createdAt.toDate?a.createdAt.toDate().getTime():0;
      var tb=b.createdAt&&b.createdAt.toDate?b.createdAt.toDate().getTime():0;
      return tb-ta;
    });
    setText('homeCount',jobs.length+' job'+(jobs.length!==1?'s':''));
    renderGrid(jobs,'homeGrid');
  },function(err){ console.warn('Home jobs error:',err); renderGrid([],'homeGrid'); });

  listenTo('home',unsub);
}

/* ================================================================
   SEARCH  –  single read, client-side filter
   ================================================================ */
function doSearch(){
  var q=trim('srchInput').toLowerCase(),cat=selVal('catFilter'),loc=selVal('locFilter');
  if(currentUser&&currentRole==='artisan'){
    cat=currentUser.category;
    var cf=ge('catFilter'); if(cf){ cf.value=cat; cf.disabled=true; }
  }
  colJobs().get().then(function(snap){
    var res=[];
    snap.forEach(function(doc){
      var j=doc.data(); j.jobId=doc.id;
      var mQ=!q||(j.title||'').toLowerCase().indexOf(q)>-1||(j.description||'').toLowerCase().indexOf(q)>-1;
      var mC=!cat||j.category===cat;
      var mL=!loc||j.location===loc;
      if(mQ&&mC&&mL) res.push(j);
    });
    res.sort(function(a,b){ var ta=a.createdAt&&a.createdAt.toDate?a.createdAt.toDate().getTime():0; var tb=b.createdAt&&b.createdAt.toDate?b.createdAt.toDate().getTime():0; return tb-ta; });
    setText('srchInfo',res.length+' job'+(res.length!==1?'s':'')+' found');
    renderGrid(res,'srchGrid');
  }).catch(function(){ setText('srchInfo','Search unavailable. Check your connection.'); });
}

/* ================================================================
   RENDER JOB GRID
   ================================================================ */
function renderGrid(jobs,cid){
  var el=ge(cid); if(!el) return;
  if(!jobs||!jobs.length){ el.innerHTML='<div class="empty-state"><p>No jobs found.</p></div>'; return; }
  var html='';
  jobs.forEach(function(j){
    html+='<div class="job-card" data-jid="'+esc(j.jobId)+'">'
      +(j.urgent?'<span class="urgent-tag">Urgent</span>':'')
      +'<div class="job-title">'+esc(j.title)+'</div>'
      +'<span class="cat-badge">'+esc(j.category)+'</span>'
      +'<div class="job-meta"><span>&#128205; '+esc(j.location)+'</span><span>&#8987; '+esc(j.duration)+'</span></div>'
      +'<div class="job-footer"><span class="job-budget">&#8358;'+fmtNum(j.budget)+'</span><span class="view-link">View &#8594;</span></div>'
      +'</div>';
  });
  el.innerHTML=html;
  el.querySelectorAll('.job-card').forEach(function(c){ c.addEventListener('click',function(){ viewJob(c.getAttribute('data-jid')); }); });
}

/* ================================================================
   JOB DETAIL MODAL  –  with applicants for job owner
   ================================================================ */
function viewJob(jid){
  showLoading('Loading job...');
  colJobs().doc(jid).get().then(function(doc){
    hideLoading();
    if(!doc.exists){ toast('Job not found.'); return; }
    var job=doc.data(); job.jobId=doc.id;
    var isOwn=job.employerId===currentUser.userId;
    var catMatch=currentRole==='artisan'&&job.category===currentUser.category;

    var html='<div class="detail-title">'+esc(job.title)+'</div>'
      +'<div class="detail-meta"><span class="cat-badge">'+esc(job.category)+'</span>'
      +(job.urgent?'<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:#FEE2E2;color:#DC2626">Urgent</span>':'')
      +'</div>'
      +'<div class="d-row"><span class="dil">&#128205; Location</span><span><strong>'+esc(job.location)+'</strong></span></div>'
      +'<div class="d-row"><span class="dil">&#8358; Budget</span><span style="color:#16A34A;font-weight:800">&#8358;'+fmtNum(job.budget)+'</span></div>'
      +'<div class="d-row"><span class="dil">&#8987; Duration</span><span>'+esc(job.duration)+'</span></div>'
      +'<div class="d-row"><span class="dil">&#127970; Employer</span><span>'+esc(job.employer||'—')+'</span></div>'
      +'<div class="det-desc"><h4>Description</h4><p>'+esc(job.description)+'</p></div>';

    if(currentRole==='artisan'){
      if(!catMatch) html+='<div class="restrict-note">&#128683; This job requires <strong>'+esc(job.category)+'</strong>. Your trade is <strong>'+esc(currentUser.category)+'</strong>.</div>';
      else          html+='<button type="button" class="apply-btn" id="mdApplyBtn">Apply for This Job</button>';
      html+='<button type="button" class="report-job-btn" id="mdReportBtn">&#9888; Report Employer</button>';
    } else if(isOwn){
      html+='<div class="applied-tag-lg" id="appCountLine">&#128101; Loading applicants...</div>';
    }

    ge('jobModalBody').innerHTML=html;
    showModal('jobModal');

    /* Check duplicate / load applicants */
    if(currentRole==='artisan'&&catMatch){
      colApps().where('artisanId','==',currentUser.userId).where('jobId','==',jid).limit(1).get()
        .then(function(s){
          var ab=ge('mdApplyBtn');
          if(!s.empty&&ab) ab.outerHTML='<div class="applied-tag-lg">&#10003; Already applied for this job.</div>';
        });
    }

    if(isOwn){
      colApps().where('jobId','==',jid).get().then(function(s){
        var cl=ge('appCountLine');
        if(!cl) return;
        if(s.empty){ cl.textContent='No applications yet.'; return; }
        var html2='<div class="applicants-section"><div class="applicants-title">&#128101; Applicants ('+s.size+')</div>';
        s.forEach(function(d){
          var a=d.data();
          html2+='<div class="applicant-card">'
            +'<div class="applicant-name">'+esc(a.artisanName||'Unknown')+'</div>'
            +'<div class="applicant-detail">'
            +'<strong>Phone:</strong> '+esc(a.artisanPhone||'N/A')+'<br>'
            +'<strong>City/Address:</strong> '+esc(a.artisanCity||'N/A')+'<br>'
            +'<strong>Trade:</strong> '+esc(a.artisanCategory||'N/A')+'<br>'
            +'<strong>Username:</strong> @'+esc(a.artisanUsername||'N/A')
            +(a.artisanRating?'<br><strong>Rating:</strong> '+starsHtml(a.artisanRating||0):'')
            +'</div>'
            +'<button type="button" class="btn-rate-sm" data-uid="'+esc(a.artisanId)+'" data-name="'+esc(a.artisanName||'Artisan')+'">&#11088; Rate this Artisan</button>'
            +'</div>';
        });
        html2+='</div>';
        cl.outerHTML=html2;

        /* Wire rate buttons */
        ge('jobModalBody').querySelectorAll('.btn-rate-sm').forEach(function(btn){
          btn.addEventListener('click',function(){ openRatingModal(btn.getAttribute('data-uid'),btn.getAttribute('data-name')); });
        });
      });
    }

    var ab=ge('mdApplyBtn'); if(ab) ab.addEventListener('click',function(){ applyForJob(jid,job.category,job.location,job.title); });
    var rb=ge('mdReportBtn'); if(rb) rb.addEventListener('click',function(){ openReportModal(job.employerId,'Employer: '+(job.employer||jid)); });
  }).catch(function(){ hideLoading(); toast('Could not load job.'); });
}

/* ================================================================
   APPLY FOR JOB  –  stores artisan contact details + job location
   ================================================================ */
function applyForJob(jid,jobCategory,jobLocation,jobTitle){
  if(jobCategory&&jobCategory!==currentUser.category){ toast('You can only apply for '+currentUser.category+' jobs.'); return; }
  showLoading('Checking application...');
  colApps().where('artisanId','==',currentUser.userId).where('jobId','==',jid).limit(1).get()
    .then(function(s){
      if(!s.empty){ hideLoading(); toast('Already applied for this job.'); return; }
      return colApps().add({
        artisanId:      currentUser.userId,
        artisanName:    currentUser.firstName+' '+currentUser.lastName,
        artisanPhone:   currentUser.phone||'N/A',
        artisanCity:    currentUser.city||'N/A',
        artisanCategory:currentUser.category||'N/A',
        artisanUsername:currentUser.username||'N/A',
        artisanRating:  currentUser.averageRating||0,
        jobId:     jid,
        jobTitle:  jobTitle||'',
        jobLocation:jobLocation||'',
        status:'pending',
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(function(ref){
      if(!ref) return;
      hideLoading();
      hideModal('jobModal');
      toast('Application submitted!');
    })
    .catch(function(){ hideLoading(); toast('Could not submit application. Try again.'); });
}

/* ================================================================
   MY APPLICATIONS  –  real-time, shows JOB LOCATION prominently
   ================================================================ */
function subscribeMyApps(){
  setText('appsCount','...');
  var list=ge('appsList'); if(list) list.innerHTML='<div class="empty-state"><p>Loading...</p></div>';
  stopListener('apps');

  /* No orderBy on compound query – sort client-side */
  var unsub=colApps().where('artisanId','==',currentUser.userId)
    .onSnapshot(function(snap){
      setText('appsCount',snap.size);
      if(!list) return;
      if(snap.empty){ list.innerHTML='<div class="empty-state"><p>No applications yet.</p><p>Browse '+currentUser.category+' jobs and tap Apply.</p></div>'; return; }

      /* Fetch all referenced jobs */
      var fetches=[];
      snap.forEach(function(d){ fetches.push({app:d.data(),id:d.id}); });
      fetches.sort(function(a,b){
        var ta=a.app.createdAt&&a.app.createdAt.toDate?a.app.createdAt.toDate().getTime():0;
        var tb=b.app.createdAt&&b.app.createdAt.toDate?b.app.createdAt.toDate().getTime():0;
        return tb-ta;
      });

      var html='';
      var promises=fetches.map(function(item){
        return colJobs().doc(item.app.jobId).get().then(function(jdoc){
          if(!jdoc.exists) return;
          var j=jdoc.data(); j.jobId=jdoc.id;
          /* Use stored jobLocation if job doc location not available */
          var loc=j.location||item.app.jobLocation||'N/A';
          html+='<div class="app-card" data-jid="'+esc(j.jobId)+'">'
            +'<div class="app-top"><span class="cat-badge">'+esc(j.category)+'</span><span class="app-tag">Applied &#10003;</span></div>'
            +'<h4>'+esc(j.title)+'</h4>'
            +'<div class="job-location-badge">&#128205; <strong>Location: '+esc(loc)+'</strong></div>'
            +'<div class="job-meta"><span>&#8358;'+fmtNum(j.budget)+'</span><span>&#8987; '+esc(j.duration)+'</span></div>'
            +'</div>';
        });
      });

      Promise.all(promises).then(function(){
        if(!list) return;
        list.innerHTML=html||'<div class="empty-state"><p>Jobs not found.</p></div>';
        list.querySelectorAll('.app-card').forEach(function(c){ c.addEventListener('click',function(){ viewJob(c.getAttribute('data-jid')); }); });
      });
    },function(err){ console.warn('Apps error:',err); if(list) list.innerHTML='<div class="empty-state"><p>Could not load applications.</p></div>'; });

  listenTo('apps',unsub);
}

/* ================================================================
   MY POSTED JOBS  –  real-time, shows applicant count
   ================================================================ */
function subscribeMyJobs(){
  var list=ge('myJobsList'); if(list) list.innerHTML='<div class="empty-state"><p>Loading...</p></div>';
  stopListener('myjobs');

  /* No orderBy on compound query – sort client-side */
  var unsub=colJobs().where('employerId','==',currentUser.userId)
    .onSnapshot(function(snap){
      if(!list) return;
      if(snap.empty){ list.innerHTML='<div class="empty-state"><p>No jobs posted yet.</p><p>Use Post a Job to create your first listing.</p></div>'; return; }

      var jobs=[];
      snap.forEach(function(doc){ var d=doc.data(); d.jobId=doc.id; jobs.push(d); });
      jobs.sort(function(a,b){
        var ta=a.createdAt&&a.createdAt.toDate?a.createdAt.toDate().getTime():0;
        var tb=b.createdAt&&b.createdAt.toDate?b.createdAt.toDate().getTime():0;
        return tb-ta;
      });

      var html='', promises=jobs.map(function(j){
        return colApps().where('jobId','==',j.jobId).get().then(function(s){
          html+='<div class="job-card" data-jid="'+esc(j.jobId)+'">'
            +(j.urgent?'<span class="urgent-tag">Urgent</span>':'')
            +'<div class="job-title">'+esc(j.title)+'</div>'
            +'<span class="cat-badge">'+esc(j.category)+'</span>'
            +'<div class="job-meta"><span>&#128205; '+esc(j.location)+'</span><span>&#128101; '+s.size+' applicant'+(s.size!==1?'s':'')+'</span></div>'
            +'<div class="job-footer"><span class="job-budget">&#8358;'+fmtNum(j.budget)+'</span><span class="view-link">View applicants &#8594;</span></div>'
            +'</div>';
        });
      });
      Promise.all(promises).then(function(){
        if(!list) return;
        list.innerHTML=html||'<div class="empty-state"><p>No jobs found.</p></div>';
        list.querySelectorAll('.job-card').forEach(function(c){ c.addEventListener('click',function(){ viewJob(c.getAttribute('data-jid')); }); });
      });
    },function(err){ console.warn('MyJobs error:',err); if(list) list.innerHTML='<div class="empty-state"><p>Could not load jobs.</p></div>'; });

  listenTo('myjobs',unsub);
}

/* ================================================================
   POST JOB
   ================================================================ */
function handlePostJob(){
  clearErr('postErr');
  var title=trim('pTitle'),cat=selVal('pCat'),loc=selVal('pLoc');
  var bud=trim('pBudget'),dur=trim('pDuration'),desc=trim('pDesc');
  var urg=ge('pUrgent')&&ge('pUrgent').checked;

  if(!title)               return showErr('postErr','Please enter a job title.');
  if(!cat)                 return showErr('postErr','Please select a trade category.');
  if(!loc)                 return showErr('postErr','Please select a location.');
  if(!bud||Number(bud)<500)return showErr('postErr','Budget must be at least &#8358;500.');
  if(!dur)                 return showErr('postErr','Please enter the duration.');
  if(!desc)                return showErr('postErr','Please describe the work required.');

  showLoading('Posting job...');
  colJobs().add({
    title:title,category:cat,location:loc,budget:Number(bud),duration:dur,
    description:desc,urgent:urg,
    employer:currentUser.business||(currentUser.firstName+' '+currentUser.lastName),
    employerId:currentUser.userId,
    date:new Date().toLocaleDateString('en-GB'),
    status:'open',
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(function(){
    hideLoading();
    ['pTitle','pBudget','pDuration','pDesc'].forEach(function(id){ var e=ge(id); if(e) e.value=''; });
    ge('pCat').value=''; ge('pLoc').value='';
    if(ge('pUrgent')) ge('pUrgent').checked=false;
    clearErr('postErr');
    toast('Job posted! Artisans can see it immediately.');
    switchTab('home');
  })
  .catch(function(){ hideLoading(); showErr('postErr','Could not post job. Try again.'); });
}

/* ================================================================
   ARTISAN DIRECTORY  –  for clients
   ================================================================ */
function loadArtisanDirectory(){
  var list=ge('artisanDirList'); if(!list) return;
  var cat=selVal('artCatFilter'), city=selVal('artCityFilter');
  list.innerHTML='<div class="empty-state"><p>Loading artisans...</p></div>';

  colUsers().where('role','==','artisan').where('status','==','active').get()
    .then(function(snap){
      if(snap.empty){ list.innerHTML='<div class="empty-state"><p>No artisans registered yet.</p></div>'; return; }
      var artisans=[];
      snap.forEach(function(doc){ var d=doc.data(); d.userId=doc.id; artisans.push(d); });
      if(cat)  artisans=artisans.filter(function(a){ return a.category===cat; });
      if(city) artisans=artisans.filter(function(a){ return a.city===city; });
      if(!artisans.length){ list.innerHTML='<div class="empty-state"><p>No artisans found for this filter.</p></div>'; return; }

      var html='';
      artisans.forEach(function(a){
        var ini=(a.firstName.charAt(0)+a.lastName.charAt(0)).toUpperCase();
        var avHtml=a.profileImage?'<img src="'+a.profileImage+'" alt="">':ini;
        var rating=a.averageRating||0;
        html+='<div class="artisan-card" data-uid="'+esc(a.userId)+'">'
          +'<div class="artisan-card-top">'
          +'<div class="art-av">'+avHtml+'</div>'
          +'<div class="art-info">'
          +'<div class="art-name">'+esc(a.firstName)+' '+esc(a.lastName)+'</div>'
          +'<div class="art-meta">&#128295; '+esc(a.category)+' &bull; &#128205; '+esc(a.city)+'</div>'
          +'</div>'
          +'</div>'
          +'<div class="art-stats">'
          +(rating>0?'<span>'+starsHtml(rating)+' <span class="avg-rating">('+rating.toFixed(1)+')</span></span>':'<span style="color:var(--sub);font-size:12px">No rating yet</span>')
          +(a.rate?'<span>&#8358;'+fmtNum(Number(a.rate))+'/day</span>':'')
          +'</div>'
          +'</div>';
      });
      list.innerHTML=html;
      list.querySelectorAll('.artisan-card').forEach(function(c){
        c.addEventListener('click',function(){ viewArtisanProfile(c.getAttribute('data-uid')); });
      });
    })
    .catch(function(){ list.innerHTML='<div class="empty-state"><p>Could not load artisans. Check connection.</p></div>'; });
}

/* ================================================================
   ARTISAN PROFILE MODAL  –  details + job history + reviews
   ================================================================ */
function viewArtisanProfile(uid){
  showLoading('Loading artisan profile...');
  Promise.all([
    colUsers().doc(uid).get(),
    colApps().where('artisanId','==',uid).get(),
    colRatings().where('artisanId','==',uid).get()
  ]).then(function(results){
    hideLoading();
    var uDoc=results[0], apSnap=results[1], ratSnap=results[2];
    if(!uDoc.exists){ toast('Artisan not found.'); return; }
    var a=uDoc.data(); a.userId=uid;
    var ini=(a.firstName.charAt(0)+a.lastName.charAt(0)).toUpperCase();
    var avHtml=a.profileImage?'<img src="'+a.profileImage+'" alt="">':ini;
    var avgRating=a.averageRating||0;

    var html='<div class="art-profile-header">'
      +'<div class="art-profile-av">'+avHtml+'</div>'
      +'<div>'
      +'<div class="art-profile-name">'+esc(a.firstName)+' '+esc(a.lastName)+'</div>'
      +'<span class="cat-badge">'+esc(a.category)+'</span>'
      +(avgRating>0?'<div style="margin-top:6px">'+starsHtml(avgRating)+'<span class="avg-rating"> '+avgRating.toFixed(1)+' ('+ratSnap.size+' review'+(ratSnap.size!==1?'s':'')+')</span></div>':'<div style="font-size:13px;color:var(--sub);margin-top:4px">No ratings yet</div>')
      +'</div>'
      +'</div>'
      +'<div class="detail-card">'
      +'<div class="drow"><span class="dlbl">Phone</span><span class="dval">'+esc(a.phone||'N/A')+'</span></div>'
      +'<div class="drow"><span class="dlbl">City</span><span class="dval">'+esc(a.city||'N/A')+'</span></div>'
      +'<div class="drow"><span class="dlbl">Qualification</span><span class="dval">'+esc(qualLabel(a.qualification))+'</span></div>'
      +(a.rate?'<div class="drow"><span class="dlbl">Daily Rate</span><span class="dval">&#8358;'+fmtNum(Number(a.rate))+'</span></div>':'')
      +'</div>';

    /* Job history */
    if(apSnap.size>0){
      html+='<div class="s-hdr" style="margin-top:12px"><span class="s-ttl">Job History</span><span class="cnt-badge">'+apSnap.size+'</span></div>';
      var appFetches=[];
      apSnap.forEach(function(d){ appFetches.push(d.data()); });
      html+='<div id="artHistoryList"><div class="empty-state"><p>Loading history...</p></div></div>';
    } else {
      html+='<div class="no-ratings" style="margin-top:12px">No job applications on record yet.</div>';
    }

    /* Reviews */
    html+='<div class="s-hdr" style="margin-top:12px"><span class="s-ttl">Reviews</span><span class="cnt-badge">'+ratSnap.size+'</span></div>';
    if(ratSnap.empty){
      html+='<div class="no-ratings">No reviews yet.</div>';
    } else {
      var rList=[];
      ratSnap.forEach(function(d){ var r=d.data(); r.ratingId=d.id; rList.push(r); });
      rList.sort(function(a,b){
        var ta=a.createdAt&&a.createdAt.toDate?a.createdAt.toDate().getTime():0;
        var tb=b.createdAt&&b.createdAt.toDate?b.createdAt.toDate().getTime():0;
        return tb-ta;
      });
      rList.forEach(function(r){
        var dt=r.createdAt&&r.createdAt.toDate?r.createdAt.toDate().toLocaleDateString('en-GB'):'';
        html+='<div class="review-card">'+starsHtml(r.rating)+(r.review?'<p style="margin:6px 0 0;font-size:14px">'+esc(r.review)+'</p>':'')+'<div class="review-meta">'+esc(r.clientName||'Client')+' &bull; '+dt+'</div></div>';
      });
    }

    html+='<div class="modal-btns" style="margin-top:14px">'
      +'<button type="button" class="btn-primary" id="btnRateFromProfile" data-uid="'+esc(uid)+'" data-name="'+esc(a.firstName+' '+a.lastName)+'">&#11088; Rate this Artisan</button>'
      +'<button type="button" class="btn-outline" id="btnReportArt" data-uid="'+esc(uid)+'" data-name="'+esc(a.firstName+' '+a.lastName)+'">&#9888; Report</button>'
      +'</div>';

    ge('artisanProfileBody').innerHTML=html;
    showModal('artisanProfileModal');

    /* Load job history asynchronously */
    if(apSnap.size>0){
      var histHtml='', histPromises=[];
      apSnap.forEach(function(d){
        var appData=d.data();
        histPromises.push(colJobs().doc(appData.jobId).get().then(function(jd){
          var title=jd.exists?jd.data().title:(appData.jobTitle||'Job');
          var loc  =jd.exists?jd.data().location:(appData.jobLocation||'N/A');
          histHtml+='<div class="review-card" style="margin-bottom:6px">'
            +'<strong>'+esc(title)+'</strong>'
            +'<div style="font-size:13px;color:var(--sub)">&#128205; '+esc(loc)+'</div>'
            +'</div>';
        }).catch(function(){}));
      });
      Promise.all(histPromises).then(function(){
        var hl=ge('artHistoryList');
        if(hl) hl.innerHTML=histHtml||'<div class="empty-state"><p>No history.</p></div>';
      });
    }

    bind('btnRateFromProfile',function(){
      var btn=ge('btnRateFromProfile');
      if(btn) openRatingModal(btn.getAttribute('data-uid'),btn.getAttribute('data-name'));
    });
    bind('btnReportArt',function(){
      var btn=ge('btnReportArt');
      if(btn){ hideModal('artisanProfileModal'); openReportModal(btn.getAttribute('data-uid'),'Artisan: '+btn.getAttribute('data-name')); }
    });
  }).catch(function(){ hideLoading(); toast('Could not load artisan profile.'); });
}

/* ================================================================
   RATINGS
   ================================================================ */
function setRating(v){
  selectedRating=v;
  var stars=document.querySelectorAll('.star[data-v]');
  stars.forEach(function(s){ s.className='star'+(parseInt(s.getAttribute('data-v'))<=v?' lit':''); });
  var lbl=ge('ratingScoreLabel');
  if(lbl){ var labels=['','Poor','Below Average','Average','Good','Excellent']; lbl.textContent=labels[v]||''; }
}

function openRatingModal(artisanId,artisanName){
  selectedRating=0;
  setRating(0);
  ge('ratingArtisanId').value=artisanId;
  setText('ratingTargetName','Rating: '+artisanName);
  ge('ratingReview').value='';
  clearErr('ratingErr');
  hideModal('jobModal'); hideModal('artisanProfileModal');
  showModal('ratingModal');
}

function submitRating(){
  clearErr('ratingErr');
  if(!selectedRating) return showErr('ratingErr','Please select a star rating (1-5).');
  var artisanId=ge('ratingArtisanId').value;
  var review=ge('ratingReview').value.trim();
  if(!artisanId) return showErr('ratingErr','Artisan not identified.');

  showLoading('Submitting rating...');
  /* Check if client already rated this artisan */
  colRatings().where('clientId','==',currentUser.userId).where('artisanId','==',artisanId).limit(1).get()
    .then(function(s){
      if(!s.empty){ hideLoading(); showErr('ratingErr','You have already rated this artisan.'); return Promise.reject({handled:true}); }
      return colRatings().add({
        clientId:    currentUser.userId,
        clientName:  currentUser.firstName+' '+currentUser.lastName,
        artisanId:   artisanId,
        rating:      selectedRating,
        review:      review,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(function(){
      /* Update artisan's averageRating and ratingCount on their user doc */
      return colRatings().where('artisanId','==',artisanId).get();
    })
    .then(function(allRatings){
      var total=0;
      allRatings.forEach(function(d){ total+=d.data().rating||0; });
      var avg=allRatings.size>0?(total/allRatings.size):0;
      return colUsers().doc(artisanId).update({ averageRating: Math.round(avg*10)/10, ratingCount: allRatings.size });
    })
    .then(function(){
      hideLoading();
      hideModal('ratingModal');
      selectedRating=0;
      toast('Rating submitted! Thank you for your review.');
    })
    .catch(function(err){
      hideLoading();
      if(err&&err.handled) return;
      toast('Could not submit rating. Try again.');
    });
}

/* ================================================================
   PROFILE
   ================================================================ */
function loadProfile(){
  colUsers().doc(currentUser.userId).get().then(function(doc){
    if(!doc.exists) return;
    var u=doc.data(); u.userId=doc.id; currentUser=u;
    var ini=(u.firstName.charAt(0)+u.lastName.charAt(0)).toUpperCase();
    var av=ge('profAv');
    if(av){ av.className='prof-av'+(currentRole==='client'?' client-av':''); av.innerHTML=u.profileImage?'<img src="'+u.profileImage+'" alt="">':ini; }
    setText('profName',u.firstName+' '+u.lastName);
    var badge=ge('profBadge'); if(badge){ badge.textContent=currentRole==='artisan'?'Artisan':'Client'; badge.className='role-badge '+currentRole; }

    /* Rating display on artisan profile */
    var rd=ge('profRatingDisplay');
    if(rd&&currentRole==='artisan'){ rd.innerHTML=(u.averageRating&&u.averageRating>0)?starsHtml(u.averageRating)+' <span class="avg-rating">'+u.averageRating.toFixed(1)+' ('+u.ratingCount+' reviews)</span>':''; }

    setText('pUser', '@'+u.username);
    setText('pEmail',u.email); setText('pPhone',u.phone); setText('pCity',u.city);
    var cd=u.createdAt&&u.createdAt.toDate?u.createdAt.toDate().toLocaleDateString('en-GB'):'—';
    setText('pSince',cd);

    if(currentRole==='artisan'){
      showEls(['aRow1','aRow2','aRow3']); hideEls(['cRow1']);
      setText('pCat2',u.category); setText('pQual',qualLabel(u.qualification));
      setText('pCvStat',u.cvName?(u.cvName+' (uploaded)'):'No CV uploaded');
      ge('cvSection').style.display='block';
      setText('profCVLabel',u.cvName||'No CV uploaded');
      colApps().where('artisanId','==',currentUser.userId).get().then(function(s){ setText('sv1',s.size); setText('sl1','Applications'); });
      setText('sv2',u.rate?'&#8358;'+fmtNum(Number(u.rate)):'N/A'); setText('sl2','Daily Rate');
      /* Load own reviews */
      loadMyReviews();
    } else {
      hideEls(['aRow1','aRow2','aRow3']); showEls(['cRow1']);
      ge('cvSection').style.display='none';
      var mr=ge('myReviewsSection'); if(mr) mr.style.display='none';
      setText('pBiz',u.business||'Not specified');
      colJobs().where('employerId','==',currentUser.userId).get().then(function(s){ setText('sv1',s.size); setText('sl1','Jobs Posted'); });
      setText('sv2','0'); setText('sl2','Hired');
    }
  });
}

function loadMyReviews(){
  var sec=ge('myReviewsSection'); if(!sec) return;
  colRatings().where('artisanId','==',currentUser.userId).get().then(function(snap){
    if(snap.empty){ sec.style.display='none'; return; }
    sec.style.display='block';
    setText('myReviewCount',snap.size);
    var list=ge('myReviewsList'); if(!list) return;
    var reviews=[];
    snap.forEach(function(d){ var r=d.data(); r.ratingId=d.id; reviews.push(r); });
    reviews.sort(function(a,b){
      var ta=a.createdAt&&a.createdAt.toDate?a.createdAt.toDate().getTime():0;
      var tb=b.createdAt&&b.createdAt.toDate?b.createdAt.toDate().getTime():0;
      return tb-ta;
    });
    var html='';
    reviews.forEach(function(r){
      var dt=r.createdAt&&r.createdAt.toDate?r.createdAt.toDate().toLocaleDateString('en-GB'):'';
      html+='<div class="review-card">'+starsHtml(r.rating)+(r.review?'<p style="margin:6px 0 0;font-size:14px">'+esc(r.review)+'</p>':'')+'<div class="review-meta">From '+esc(r.clientName||'Client')+' &bull; '+dt+'</div></div>';
    });
    list.innerHTML=html;
  });
}

function onProfileCV(inp){
  if(!inp.files||!inp.files[0]) return;
  var f=inp.files[0];
  if(f.type!=='application/pdf'){toast('CV must be PDF'); try{inp.value='';}catch(e){} return;}
  if(f.size>409600){toast('CV must be under 400KB'); try{inp.value='';}catch(e){} return;}
  showLoading('Uploading CV...');
  var rd=new FileReader();
  rd.onload=function(e){ colUsers().doc(currentUser.userId).update({cv:e.target.result,cvName:f.name}).then(function(){ hideLoading(); currentUser.cv=e.target.result; currentUser.cvName=f.name; setText('profCVLabel',f.name+' (uploaded)'); setText('pCvStat',f.name+' (uploaded)'); toast('CV uploaded!'); }).catch(function(){ hideLoading(); toast('Could not save CV.'); }); };
  rd.readAsDataURL(f);
}

/* ================================================================
   PHOTO UPDATE
   ================================================================ */
function openImgModal(){ newPhoto=currentUser.profileImage||null; var p=ge('imgPreview'); if(p) p.innerHTML=newPhoto?'<img src="'+newPhoto+'" alt="">':'&#128100;'; clearErr('imgErr'); try{ge('imgInput').value='';}catch(e){} showModal('imgModal'); }
function onNewPhotoSelected(inp){ if(!inp.files||!inp.files[0]) return; var f=inp.files[0]; if(f.type.indexOf('image/')!==0){showErr('imgErr','Select JPG or PNG.'); return;} resizeImg(f,150,function(b){ newPhoto=b; ge('imgPreview').innerHTML='<img src="'+b+'" alt="">'; }); }
function savePhoto(){ if(!newPhoto){showErr('imgErr','Choose a photo first.'); return;} showLoading('Saving photo...'); colUsers().doc(currentUser.userId).update({profileImage:newPhoto}).then(function(){ hideLoading(); currentUser.profileImage=newPhoto; hideModal('imgModal'); loadProfile(); toast('Photo updated!'); }).catch(function(){ hideLoading(); toast('Could not save photo.'); }); }

function resizeImg(f,px,cb){ var rd=new FileReader(); rd.onload=function(e){ var img=new Image(); img.onload=function(){ var cv=document.createElement('canvas'); cv.width=px; cv.height=px; var s=Math.min(img.width,img.height); cv.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,px,px); cb(cv.toDataURL('image/jpeg',0.75)); }; img.src=e.target.result; }; rd.readAsDataURL(f); }

/* ================================================================
   REPORT
   ================================================================ */
function openReportModal(uid,label){ var ri=ge('reportedId'); if(ri) ri.value=uid; setText('reportTargetLbl','Reporting: '+label); ge('repReason').value=''; ge('repDetails').value=''; clearErr('repErr'); showModal('reportModal'); }
function submitReport(){
  clearErr('repErr');
  var reason=selVal('repReason'),details=ge('repDetails').value.trim(),rid=ge('reportedId')?ge('reportedId').value:'';
  if(!reason) return showErr('repErr','Select a reason.');
  if(!details)return showErr('repErr','Provide details.');
  showLoading('Submitting report...');
  colUsers().doc(rid).get().then(function(d){
    var repName=d.exists?(d.data().firstName+' '+d.data().lastName):'Unknown';
    return colReports().add({reporterId:currentUser.userId,reporterName:currentUser.firstName+' '+currentUser.lastName,reportedId:rid,reportedName:repName,reason:reason,details:details,status:'pending',createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  }).then(function(){ hideLoading(); hideModal('reportModal'); toast('Report submitted. Admin will review it.'); }).catch(function(){ hideLoading(); toast('Could not submit report.'); });
}

/* ================================================================
   ACCOUNT DELETION
   ================================================================ */
function openDeleteModal(){ var dp=ge('delPass'); if(dp) dp.value=''; var dc=ge('delChk'); if(dc) dc.checked=false; clearErr('delErr'); showModal('deleteModal'); }
function confirmDeleteAccount(){
  clearErr('delErr');
  var pass=trim('delPass'),chk=ge('delChk')&&ge('delChk').checked;
  if(!pass) return showErr('delErr','Enter your password.');
  if(!chk)  return showErr('delErr','Tick the confirmation checkbox.');
  var user=auth.currentUser; if(!user) return showErr('delErr','Authentication error. Sign in again.');
  showLoading('Deleting account...');
  var cred=firebase.auth.EmailAuthProvider.credential(user.email,pass);
  user.reauthenticateWithCredential(cred)
    .then(function(){ var uid=user.uid; var batch=db.batch(); batch.delete(colUsers().doc(uid)); if(currentUser.username) batch.delete(colUsernames().doc(currentUser.username)); return batch.commit(); })
    .then(function(){ return colApps().where('artisanId','==',currentUser.userId).get(); })
    .then(function(s){ var b=db.batch(); s.forEach(function(d){ b.delete(d.ref); }); return b.commit(); })
    .then(function(){ return colJobs().where('employerId','==',currentUser.userId).get(); })
    .then(function(s){ var b=db.batch(); s.forEach(function(d){ b.delete(d.ref); }); return b.commit(); })
    .then(function(){ return auth.currentUser.delete(); })
    .then(function(){ hideLoading(); currentUser=null; currentRole=''; hideModal('deleteModal'); showScreen('welcome'); toast('Account permanently deleted.'); })
    .catch(function(err){ hideLoading(); if(err.code==='auth/wrong-password'||err.code==='auth/invalid-credential') showErr('delErr','Incorrect password. Not deleted.'); else showErr('delErr','Deletion failed: '+(err.message||'Try again.')); });
}

/* ================================================================
   ADMIN PANEL
   ================================================================ */
function loadAdmin(){ switchAdminTab('dash'); }
function switchAdminTab(tab){
  ['dash','artisans','clients','reports','jobs'].forEach(function(t){
    var pg=ge('ad'+cap(t)); if(pg) pg.classList.remove('active');
    var bn=ge('an'+cap(t)); if(bn) bn.classList.remove('active');
  });
  var tp=ge('ad'+cap(tab)); if(tp) tp.classList.add('active');
  var tb=ge('an'+cap(tab)); if(tb) tb.classList.add('active');
  if(tab==='dash')     loadAdminDashboard();
  if(tab==='artisans') loadAdminUsers('artisan');
  if(tab==='clients')  loadAdminUsers('client');
  if(tab==='reports')  loadAdminReports();
  if(tab==='jobs')     loadAdminJobs();
}

function loadAdminDashboard(){
  setText('dc1','—'); setText('dc2','—'); setText('dc3','—'); setText('dc4','—');
  Promise.all([
    colUsers().where('role','==','artisan').get(),
    colUsers().where('role','==','client').get(),
    colJobs().get(),
    colReports().where('status','==','pending').get()
  ]).then(function(r){ setText('dc1',r[0].size); setText('dc2',r[1].size); setText('dc3',r[2].size); setText('dc4',r[3].size); });
  colUsers().orderBy('createdAt','desc').limit(5).get().then(function(s){
    var dr=ge('dashRecent'); if(!dr) return;
    if(s.empty){ dr.innerHTML='<div class="empty-state"><p>No users yet.</p></div>'; return; }
    var users=[]; s.forEach(function(doc){ if(doc.data().role!=='admin'){ var d=doc.data(); d.userId=doc.id; users.push(d); } });
    dr.innerHTML=users.length?buildUserCards(users,false):'<div class="empty-state"><p>No users yet.</p></div>';
  }).catch(function(){});
}

function loadAdminUsers(role){
  var cid=role==='artisan'?'artisanList':'clientList';
  var sid=role==='artisan'?'artSrch':'cliSrch';
  var srch=trim(sid).toLowerCase(), el=ge(cid);
  if(el) el.innerHTML='<div class="empty-state"><p>Loading...</p></div>';
  colUsers().where('role','==',role).get().then(function(snap){
    if(!el) return;
    if(snap.empty){ el.innerHTML='<div class="empty-state"><p>No '+role+'s registered yet.</p></div>'; return; }
    var users=[]; snap.forEach(function(doc){ var d=doc.data(); d.userId=doc.id; users.push(d); });
    users.sort(function(a,b){ var ta=a.createdAt&&a.createdAt.toDate?a.createdAt.toDate().getTime():0; var tb=b.createdAt&&b.createdAt.toDate?b.createdAt.toDate().getTime():0; return tb-ta; });
    if(srch) users=users.filter(function(u){ return (u.firstName+' '+u.lastName).toLowerCase().indexOf(srch)>-1||u.email.indexOf(srch)>-1||(u.username||'').indexOf(srch)>-1; });
    el.innerHTML=buildUserCards(users,true);
    wireAdminButtons(el);
  }).catch(function(){ if(el) el.innerHTML='<div class="empty-state"><p>Could not load users.</p></div>'; });
}

function buildUserCards(users,withActions){
  var html='';
  users.forEach(function(u){
    var ini=((u.firstName||'?').charAt(0)+(u.lastName||'?').charAt(0)).toUpperCase();
    var avHtml=u.profileImage?'<img src="'+u.profileImage+'" alt="">':ini;
    html+='<div class="a-user-card'+(u.status==='suspended'?' suspended':'')+'">'
      +'<div class="auc-av'+(u.role==='client'?' ca':'')+'">'+avHtml+'</div>'
      +'<div class="auc-info"><div class="auc-name">'+esc(u.firstName)+' '+esc(u.lastName)+'</div>'
      +'<div class="auc-sub">@'+esc(u.username||'—')+' &bull; '+esc(u.city||'—')+(u.role==='artisan'?' &bull; '+esc(u.category||'—'):'')+' &bull; <span class="sta-'+u.status+'">'+cap(u.status)+'</span></div></div>'
      +(withActions?'<div class="auc-btns"><button type="button" class="btn-vw" data-uid="'+esc(u.userId)+'">View</button>'+(u.status==='active'?'<button type="button" class="btn-sus" data-uid="'+esc(u.userId)+'">Suspend</button>':'<button type="button" class="btn-rei" data-uid="'+esc(u.userId)+'">Reinstate</button>')+'</div>':'')
      +'</div>';
  });
  return html;
}

function wireAdminButtons(el){
  el.querySelectorAll('.btn-vw').forEach(function(b){ b.addEventListener('click',function(){ viewUserDetail(b.getAttribute('data-uid')); }); });
  el.querySelectorAll('.btn-sus').forEach(function(b){ b.addEventListener('click',function(){ adminSetStatus(b.getAttribute('data-uid'),'suspended'); }); });
  el.querySelectorAll('.btn-rei').forEach(function(b){ b.addEventListener('click',function(){ adminSetStatus(b.getAttribute('data-uid'),'active'); }); });
}

function adminSetStatus(uid,status){
  showLoading(status==='suspended'?'Suspending...':'Reinstating...');
  colUsers().doc(uid).update({status:status}).then(function(){ hideLoading(); loadAdminDashboard(); colUsers().doc(uid).get().then(function(d){ if(d.exists) loadAdminUsers(d.data().role); }); toast('Account '+status+'.'); }).catch(function(){ hideLoading(); toast('Could not update account.'); });
}

function viewUserDetail(uid){
  showLoading('Loading user...');
  colUsers().doc(uid).get().then(function(doc){
    hideLoading(); if(!doc.exists){ toast('User not found.'); return; }
    var u=doc.data(); u.userId=doc.id;
    var ini=((u.firstName||'?').charAt(0)+(u.lastName||'?').charAt(0)).toUpperCase();
    var avHtml=u.profileImage?'<img src="'+u.profileImage+'" alt="">':ini;
    var cd=u.createdAt&&u.createdAt.toDate?u.createdAt.toDate().toLocaleDateString('en-GB'):'—';
    ge('userDetailBody').innerHTML=
      '<div class="ud-hdr"><div class="ud-av'+(u.role==='client'?' ca':'')+'">'+avHtml+'</div><div><div class="ud-name">'+esc(u.firstName)+' '+esc(u.lastName)+'</div><span class="role-badge '+u.role+'">'+cap(u.role)+'</span> <span class="sta-'+u.status+'">'+cap(u.status)+'</span></div></div>'
      +'<div class="detail-card">'+drow('Username','@'+(u.username||'—'))+drow('Email',u.email)+drow('Phone',u.phone||'—')+drow('City',u.city||'—')+(u.role==='artisan'?drow('Trade',u.category||'—')+drow('Qualification',qualLabel(u.qualification))+drow('CV',u.cvName||'None'):'')+drow('Joined',cd)+'</div>';
    ge('userDetailActions').innerHTML=
      '<button type="button" class="btn-outline" id="udClose">Close</button>'
      +(u.status==='active'?'<button type="button" class="btn-sus" id="udSus">Suspend</button>':'<button type="button" class="btn-rei" id="udRei">Reinstate</button>')
      +'<button type="button" class="btn-danger-sm" id="udDel">Delete</button>';
    bind('udClose',function(){ hideModal('userDetailModal'); });
    bind('udSus',  function(){ adminSetStatus(uid,'suspended');  hideModal('userDetailModal'); });
    bind('udRei',  function(){ adminSetStatus(uid,'active');     hideModal('userDetailModal'); });
    bind('udDel',  function(){
      if(!confirm('Permanently delete this account?')) return;
      showLoading('Deleting...');
      colUsers().doc(uid).get().then(function(d){
        var uname=d.exists?d.data().username:null, role=d.exists?d.data().role:'artisan';
        var batch=db.batch(); batch.delete(colUsers().doc(uid)); if(uname) batch.delete(colUsernames().doc(uname));
        return batch.commit().then(function(){ return role; });
      }).then(function(role){ hideLoading(); hideModal('userDetailModal'); loadAdminDashboard(); loadAdminUsers(role); toast('Account deleted.'); }).catch(function(){ hideLoading(); toast('Could not delete.'); });
    });
    showModal('userDetailModal');
  }).catch(function(){ hideLoading(); toast('Could not load user.'); });
}

function loadAdminReports(){
  var filter=selVal('repFilter')||'pending', el=ge('reportsList');
  if(el) el.innerHTML='<div class="empty-state"><p>Loading...</p></div>';
  var query=filter==='all'?colReports():colReports().where('status','==',filter);
  query.get().then(function(snap){
    if(!el) return;
    if(snap.empty){ el.innerHTML='<div class="empty-state"><p>No reports found.</p></div>'; return; }
    var html='';
    snap.forEach(function(doc){
      var r=doc.data(); r.reportId=doc.id;
      var dt=r.createdAt&&r.createdAt.toDate?r.createdAt.toDate().toLocaleDateString('en-GB'):'';
      html+='<div class="rep-card'+(r.status==='resolved'?' resolved':'')+'"><div class="rep-hdr"><div class="rep-title">'+esc(r.reason)+'</div><span class="rep-sta '+r.status+'">'+cap(r.status)+'</span></div>'
        +'<div class="rep-body">From: <strong>'+esc(r.reporterName)+'</strong> &rarr; Against: <strong>'+esc(r.reportedName)+'</strong><br>'+esc(r.details)+'<br><small>'+dt+'</small></div>'
        +(r.status==='pending'?'<button type="button" class="btn-res" data-rid="'+esc(r.reportId)+'">&#10003; Resolve</button>':'')
        +'</div>';
    });
    el.innerHTML=html;
    el.querySelectorAll('.btn-res').forEach(function(btn){
      btn.addEventListener('click',function(){
        showLoading('Resolving...');
        colReports().doc(btn.getAttribute('data-rid')).update({status:'resolved'}).then(function(){ hideLoading(); loadAdminReports(); loadAdminDashboard(); toast('Report resolved.'); }).catch(function(){ hideLoading(); toast('Could not update.'); });
      });
    });
  }).catch(function(){ if(el) el.innerHTML='<div class="empty-state"><p>Could not load reports.</p></div>'; });
}

function loadAdminJobs(){
  colJobs().get().then(function(snap){
    var jobs=[]; snap.forEach(function(doc){ var d=doc.data(); d.jobId=doc.id; jobs.push(d); });
    renderGrid(jobs,'adminJobGrid');
  }).catch(function(){ renderGrid([],'adminJobGrid'); });
}

/* ================================================================
   UTILITIES
   ================================================================ */
function starsHtml(rating){
  var r=Math.round(rating||0), html='<span class="rating-display">';
  for(var i=1;i<=5;i++) html+='<span class="'+(i<=r?'lit':'')+'">'+(i<=r?'&#9733;':'&#9734;')+'</span>';
  return html+'</span>';
}

function qualLabel(q){ var m={none:'None',ssce:'SSCE/WAEC/NECO',nabteb:'NABTEB',ond:'OND',hnd:'HND',bsc:'BSc/B.Tech',msc:'MSc/M.Tech',other:'Other'}; return m[q]||q||'Not specified'; }
function drow(l,v){ return '<div class="drow"><span class="dlbl">'+l+'</span><span class="dval">'+esc(String(v||''))+'</span></div>'; }
function showEls(ids){ ids.forEach(function(id){ var e=ge(id); if(e) e.style.display='flex'; }); }
function hideEls(ids){ ids.forEach(function(id){ var e=ge(id); if(e) e.style.display='none'; }); }
function showModal(id){ var e=ge(id); if(e) e.style.display='flex'; }
function hideModal(id){ var e=ge(id); if(e) e.style.display='none'; }
function cap(s){ return s?(s.charAt(0).toUpperCase()+s.slice(1)):''; }
function ge(id){ return document.getElementById(id); }
function trim(id){ var e=ge(id); return e?(e.value||'').trim():''; }
function selVal(id){ var e=ge(id); return e?(e.value||''):''; }
function setText(id,html){ var e=ge(id); if(e) e.innerHTML=html; }
function showErr(id,msg) { var e=ge(id); if(e) e.innerHTML=msg; }
function clearErr(id)    { var e=ge(id); if(e) e.textContent=''; }
function fmtNum(n){ return Number(n).toLocaleString(); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(msg){ var t=ge('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); },3500); }
function bind(id,fn,evt){ var el=ge(id); if(el&&fn) el.addEventListener(evt||'click',fn); }
