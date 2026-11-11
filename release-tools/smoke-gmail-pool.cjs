'use strict';
const {app,BrowserWindow,ipcMain,webContents}=require('electron');
const {EmbeddedPopupManager}=require('../embedded-popup-manager');
const path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
let win,server;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){const end=Date.now()+15000;while(Date.now()<end){try{if(await fn())return}catch{}await wait(100)}throw Error('Timeout: '+label)}
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body><h1>'+req.url+'</h1></body></html>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const manager=new EmbeddedPopupManager({ipcMain,preload:path.join(__dirname,'smoke-empty-preload.cjs'),openExternal:()=>{}});
 win=new BrowserWindow({show:true,width:1200,height:800,webPreferences:{preload:path.join(__dirname,'smoke-workbench-preload.cjs'),webviewTag:true,contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.on('will-attach-webview',(_e,p)=>{p.preload=path.join(__dirname,'smoke-empty-preload.cjs')});
 win.webContents.on('did-attach-webview',(_e,wc)=>manager.install(wc,win));
 await win.loadFile(path.join(__dirname,'../src/workbench.html'));const run=s=>win.webContents.executeJavaScript(s,true);
 await until(()=>run('!restoring'),'workbench ready');
 await run(`for(let i=0;i<150;i++)openTab({siteId:'gmail',siteInstanceId:'fixture-'+i,url:${JSON.stringify(url)}+'/mail/'+i,partition:'persist:gmail-pool-fixture-'+i},{restoring:true});void 0`);
 await wait(500);assert.equal(webContents.getAllWebContents().filter(w=>w.getType()==='webview').length,0,'restoration created background guests');
 assert.equal(await run('workspaceSnapshot().tabs.length'),150);
 async function select(id){await run(`activate('tab-${id}');void 0`);await until(()=>run(`tabs.get('tab-${id}').loadReady`),'page '+id+' ready');}
 async function page(id){const root=await run(`tabs.get('tab-${id}').view.getWebContentsId()`);return webContents.fromId(root);}
 await select(1);const first=await page(1),firstId=first.id,session=first.session;
 await session.cookies.set({url,name:'retained',value:'cookie-a',httpOnly:true});await first.executeJavaScript(`localStorage.setItem('fixture-account','account-a')`);
 // Keep the real popup URL when its root and child are later reclaimed.
 await first.executeJavaScript(`window.open(${JSON.stringify(url+'/actual-mailbox')},'_blank');void 0`,true);
 const state=manager.hosts.get(win.webContents.id);
 await until(()=>manager.top(state,first.id)?.contents.getURL().endsWith('/actual-mailbox'),'embedded mailbox opened');
 await select(2);await select(3);await select(4);
 await until(()=>run("!tabs.get('tab-1').resident"),'old account sleeps');
 await until(()=>first.isDestroyed(),'sleep destroys root guest');
 assert.equal(state.records.size,0,'sleep leaked the embedded popup');
 assert.equal(await run('tabs.size'),150);assert.equal(await run("tabs.get('tab-1').url.endsWith('/actual-mailbox')"),true);
 assert.equal(await run('[...tabs.values()].filter(t=>t.resident).length'),3);
 await select(1);const resumed=await page(1);assert.notEqual(resumed.id,firstId);assert.equal(resumed.session,session);
 assert.equal((await resumed.session.cookies.get({url}))[0].value,'cookie-a');assert.equal(await resumed.executeJavaScript('localStorage.getItem("fixture-account")'),'account-a');
 assert.ok(resumed.getURL().endsWith('/actual-mailbox'));
 await until(()=>run('[...tabs.values()].filter(t=>t.resident).length===3'),'pool trims after resume');
 const isolated=await page(3);assert.equal((await isolated.session.cookies.get({url})).length,0,'accounts shared cookies');
 await resumed.executeJavaScript(`const draft=document.createElement('div');draft.contentEditable='true';draft.textContent='unsent fixture';draft.id='draft';document.body.append(draft);void 0`);
 await select(5);await select(6);await select(7);await run('trimGmailPages()');
 await until(()=>run('!gmailTrimRunning && gmailTrimTimer===null && [...tabs.values()].filter(t=>t.resident).length===3'),'draft-protected reclamation settled');
 assert.equal((await run("window.orangeApp.getPageSleepState(tabs.get('tab-1').view.getWebContentsId())")).ok,false,'compose must block reclamation');
 assert.equal(resumed.isDestroyed(),false,'draft page was discarded');assert.equal(await resumed.executeJavaScript('document.querySelector("#draft").textContent'),'unsent fixture');
 await resumed.executeJavaScript('document.querySelector("#draft").remove();void 0');
 assert.equal((await run("window.orangeApp.getPageSleepState(tabs.get('tab-1').view.getWebContentsId())")).ok,true,'closed compose must allow reclamation');
 await select(8);await run('trimGmailPages()');
 await until(()=>resumed.isDestroyed(),'page sleeps after compose closes');
 assert.equal(await run('workspaceSnapshot().tabs.length'),150);
 console.log('PASS: '+process.platform+' 150 saved Gmail fixtures restore with zero background guests; only selected pages load; pool trims to three; real popup and root are destroyed; cookies/localStorage/account isolation/mailbox URL survive resume; unsent compose is protected. Synthetic fixture, not 150 real Gmail accounts.');
 win.destroy();await new Promise(r=>server.close(r));app.exit(0);
}).catch(e=>{console.error(e);win?.destroy();server?.close();app.exit(1)});
