/* Paste into a standalone Apps Script project owned by the wedding organiser.
   Run setupWeddingRsvp once, then deploy as a web app: Execute as Me / Anyone.
   Guest submissions never need a Google or ChatGPT account. */
const RSVP_FIELDS = ['Receipt ID','Language','Name(s)','Email for updates','Attendance','Guests in response','Arrival','Departure','Travel','Staying at Alm','Your menu','Guest 2 name','Guest 2 menu','Guest 3 name','Guest 3 menu','Guest 4 name','Guest 4 menu','Notes'];

function setupWeddingRsvp() {
 const props=PropertiesService.getScriptProperties();
 const recipient=props.getProperty('NOTIFICATION_EMAIL')||Session.getEffectiveUser().getEmail();
 if(!recipient)throw Error('Set NOTIFICATION_EMAIL in Project Settings → Script properties first.');
 props.setProperty('NOTIFICATION_EMAIL',recipient);
 let form;
 if(props.getProperty('FORM_ID'))form=FormApp.openById(props.getProperty('FORM_ID'));
 else {
  form=FormApp.create('Fátima & Thomas — Guest plans');
  form.setDescription('Private wedding plans collected through our wedding website.');
  form.setCollectEmail(false).setLimitOneResponsePerUser(false).setAllowResponseEdits(false);
  RSVP_FIELDS.forEach(title=>form.addTextItem().setTitle(title));
  const sheet=SpreadsheetApp.create('Wedding guest plans');
  form.setDestination(FormApp.DestinationType.SPREADSHEET,sheet.getId());
  props.setProperties({FORM_ID:form.getId(),SHEET_ID:sheet.getId()});
 }
 if(form.supportsAdvancedResponderPermissions())form.setPublished(true);
 form.setAcceptingResponses(true).setPublishingSummary(false);
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='retryWeddingEmails')){
  ScriptApp.newTrigger('retryWeddingEmails').timeBased().everyHours(1).create();
 }
 console.log('Form: '+form.getEditUrl());
 console.log('Spreadsheet: '+SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl());
 console.log('Notifications: '+recipient);
}

function validReceipt_(id){return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'');}
function digest_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');}
function validateWedding_(d){
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Please check the form and try again.');
 const str=(v,max)=>{if(v==null)return '';if(typeof v!=='string'||v.trim().length>max)throw Error('Please check the form and try again.');return v.trim();};
 const name=str(d.name,120),email=str(d.email,254).toLowerCase();
 if(!name)throw Error('Please enter your name.');
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Please enter a valid email address.');
 if(str(d.website,200))throw Error('Unable to submit this form.');
 const party=Number(d.party_size);
 if(!Number.isInteger(party)||party<1||party>4)throw Error('Please choose between 1 and 4 guests.');
 const menu=v=>{if(!['undecided','meat','fish','vegetarian'].includes(v))throw Error('Please check each guest’s name and menu preference.');return v;};
 const date=v=>{const s=str(v,10);if(s&&(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s))throw Error('Please check your travel dates.');return s;};
 const arrival=date(d.arrival),departure=date(d.departure);
 if(arrival&&departure&&departure<arrival)throw Error('Departure cannot be before arrival.');
 if(!Array.isArray(d.guests)||d.guests.length!==party-1)throw Error('Please add the name and menu preference for each additional guest.');
 const guests=d.guests.map(g=>{const n=str(g&&g.name,120);if(!n)throw Error('Please add the name and menu preference for each additional guest.');return {name:n,menu:menu(g.menu)};});
 const travel=str(d.travel_mode,30),attendance=d.attendance||'';
 if(!['','train','car','undecided'].includes(travel)||!['','yes','no','maybe'].includes(attendance))throw Error('Please check the form and try again.');
 if(![true,false,'on','',undefined].includes(d.staying_alm))throw Error('Please check your accommodation choice.');
 return {name,email,party,arrival,departure,guests,travel,attendance,menu:menu(d.menu),alm:d.staying_alm===true||d.staying_alm==='on',notes:str(d.notes,1000),language:['en','de','es'].includes(d.language)?d.language:'en'};
}

function doPost(e){
 const id=e&&e.parameter&&e.parameter.receipt;
 if(!validReceipt_(id))return ContentService.createTextOutput('Invalid receipt.');
 const props=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock();
 if(!lock.tryLock(25000))return ContentService.createTextOutput('Busy; retry the same response.');
 try{
  const prior=props.getProperty('receipt_'+id);
  if(prior&&JSON.parse(prior).ok)return ContentService.createTextOutput('Saved.');
  const payload=e.parameter.payload||'';
  if(payload.length>16000)throw Error('Your response is too long.');
  const d=validateWedding_(JSON.parse(payload));
  const form=FormApp.openById(props.getProperty('FORM_ID'));
  const dedupe='guest_'+digest_(d.name.toLowerCase().replace(/\s+/g,' ')+'\n'+d.email);
  const old=props.getProperty(dedupe);
  if(old&&old!==id)throw Error('A response with these details is already on file. Please contact us if anything needs changing.');
  // Bound anonymous abuse and mail use. This cap is comfortably above this wedding's size.
  const day=Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd'),daily=JSON.parse(props.getProperty('daily')||'{}');
  if(daily.day===day&&daily.count>=60)throw Error('Too many submissions. Please try again later.');
  // Recover an accepted Form write if execution stopped before its receipt was recorded.
  const existing=form.getResponses().some(r=>r.getItemResponses().some(i=>i.getItem().getTitle()==='Receipt ID'&&i.getResponse()===id));
  const values=[id,d.language,d.name,d.email,d.attendance,String(d.party),d.arrival,d.departure,d.travel,d.alm?'Yes':'No',d.menu];
  for(let i=0;i<3;i++)values.push(d.guests[i]?.name||'',d.guests[i]?.menu||'');
  values.push(d.notes);
  const items=form.getItems(FormApp.ItemType.TEXT);
  const byTitle=Object.fromEntries(items.map(i=>[i.getTitle(),i.asTextItem()]));
  if(RSVP_FIELDS.some(title=>!byTitle[title]))throw Error('Saving is temporarily unavailable. Please try again later.');
  if(!existing){
   let response=form.createResponse();
   RSVP_FIELDS.forEach((title,i)=>{if(values[i])response=response.withItemResponse(byTitle[title].createResponse(values[i]));});
   response.submit();
   props.setProperty('daily',JSON.stringify({day,count:daily.day===day?daily.count+1:1}));
  }
  props.setProperty(dedupe,id);
  // Durable outbox: saving succeeds even if email is temporarily unavailable.
  const body=RSVP_FIELDS.map((title,i)=>title+': '+(values[i]||'—')).join('\n')+'\n\nAll replies: '+SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl();
  if(!props.getProperty('mailed_'+id))props.setProperty('mail_'+id,JSON.stringify({subject:'Wedding plans received — '+d.name,body}));
  props.setProperty('receipt_'+id,JSON.stringify({ok:true}));
  try{sendWeddingEmail_(id);}catch(error){console.error('Notification queued for retry: '+error.message);}
  return ContentService.createTextOutput('Saved.');
 }catch(error){
  const safe=['Please check the form and try again.','Please enter your name.','Please enter a valid email address.','Unable to submit this form.','Please choose between 1 and 4 guests.','Please check each guest’s name and menu preference.','Please check your travel dates.','Departure cannot be before arrival.','Please add the name and menu preference for each additional guest.','Please check your accommodation choice.','Your response is too long.','Too many submissions. Please try again later.','A response with these details is already on file. Please contact us if anything needs changing.'];
  props.setProperty('receipt_'+id,JSON.stringify({ok:false,error:safe.includes(error.message)?error.message:'Saving is temporarily unavailable. Please try again later.'}));
  console.error('RSVP error: '+error.message);
  return ContentService.createTextOutput('Not saved.');
 }finally{lock.releaseLock();}
}

function doGet(e){
 const q=e&&e.parameter||{},callback=q.callback;
 if(!validReceipt_(q.receipt)||!/^weddingReceipt_[a-f0-9]{32}$/.test(callback||''))return ContentService.createTextOutput('Wedding RSVP endpoint.');
 const raw=PropertiesService.getScriptProperties().getProperty('receipt_'+q.receipt);
 const result=raw?JSON.parse(raw):{pending:true};
 // Never include names, email addresses, menu choices or other answers in JSONP.
 return ContentService.createTextOutput(callback+'('+JSON.stringify(result)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function sendWeddingEmail_(id){
 const props=PropertiesService.getScriptProperties(),raw=props.getProperty('mail_'+id);
 if(!raw)return;
 if(props.getProperty('mailed_'+id)){props.deleteProperty('mail_'+id);return;}
 const message=JSON.parse(raw),recipient=props.getProperty('NOTIFICATION_EMAIL');
 if(!recipient||MailApp.getRemainingDailyQuota()<1)throw Error('Mail quota unavailable');
 MailApp.sendEmail({to:recipient,subject:message.subject,body:message.body,name:'Wedding guest plans'});
 props.setProperty('mailed_'+id,'yes');props.deleteProperty('mail_'+id);
}
function retryWeddingEmails(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(5000))return;
 try{Object.keys(PropertiesService.getScriptProperties().getProperties()).filter(k=>k.startsWith('mail_')).forEach(k=>{try{sendWeddingEmail_(k.slice(5));}catch(error){console.error(error.message);}});}finally{lock.releaseLock();}
}
