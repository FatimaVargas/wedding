import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
const source=readFileSync('integrations/google-forms/Code.gs','utf8');
function harness(){
 const properties=new Map([['FORM_ID','form'],['SHEET_ID','sheet'],['NOTIFICATION_EMAIL','organiser@example.com']]);
 const responses=[],emails=[];let failSave=false,failMail=false;
 const props={getProperty:k=>properties.get(k)||null,setProperty:(k,v)=>properties.set(k,v),deleteProperty:k=>properties.delete(k),getProperties:()=>Object.fromEntries(properties)};
 const form={getResponses:()=>responses,getItems:()=>fields.map(title=>({getTitle:()=>title,asTextItem:()=>({createResponse:value=>({title,value})})})),createResponse(){const rows=[];const r={withItemResponse(i){rows.push(i);return r;},submit(){if(failSave)throw Error('Database down');responses.push({getItemResponses:()=>rows.map(i=>({getItem:()=>({getTitle:()=>i.title}),getResponse:()=>i.value}))});}};return r;}};
 const context=vm.createContext({console:{error(){}},Date,JSON,PropertiesService:{getScriptProperties:()=>props},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},FormApp:{openById:()=>form,ItemType:{TEXT:'TEXT'}},SpreadsheetApp:{openById:()=>({getUrl:()=> 'https://docs.google.com/spreadsheets/d/test'})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...createHash('sha256').update(s).digest()],formatDate:()=> '2026-11-21'},MailApp:{getRemainingDailyQuota:()=>1,sendEmail:mail=>{if(failMail)throw Error('Temporary mail error');emails.push(mail);}},ContentService:{MimeType:{JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})}});
 vm.runInContext(source,context);const fields=vm.runInContext('RSVP_FIELDS',context);
 return {context,responses,emails,properties,failSave:v=>failSave=v,failMail:v=>failMail=v,submit:(data,id=randomUUID())=>{context.doPost({parameter:{receipt:id,payload:JSON.stringify(data)}});return {id,status:JSON.parse(properties.get('receipt_'+id))};}};
}
const data={name:'Test Guest',email:'',party_size:2,guests:[{name:'Second Guest',menu:'fish'}],menu:'vegetarian',arrival:'2027-05-27',departure:'2027-05-30',travel_mode:'undecided',staying_alm:true,notes:'Car sharing',language:'es'};
test('anonymous Google transport stores every field and emails only the organiser',()=>{
 const h=harness();const {id,status}=h.submit(data);assert.equal(status.ok,true);assert.equal(h.responses.length,1);assert.equal(h.emails.length,1);
 assert.equal(h.emails[0].to,'organiser@example.com');assert.match(h.emails[0].body,/Guest 2 name: Second Guest/);assert.match(h.emails[0].body,/Your menu: vegetarian/);
 const ack=h.context.doGet({parameter:{receipt:id,callback:'weddingReceipt_'+'a'.repeat(32)}}).text;
 assert.match(ack,/"ok":true/);assert.doesNotMatch(ack,/Guest|example|fish|Car sharing/);
});
test('a repeated receipt or same name and email cannot create another reply',()=>{
 const h=harness();const first=h.submit(data);h.submit(data,first.id);assert.equal(h.responses.length,1);assert.equal(h.emails.length,1);
 assert.equal(h.submit({...data,name:' test   guest '}).status.ok,false);assert.equal(h.responses.length,1);
});
test('save failure is never acknowledged and the same token can retry',()=>{
 const h=harness();h.failSave(true);const first=h.submit(data);assert.equal(first.status.ok,false);assert.equal(h.emails.length,0);
 h.failSave(false);assert.equal(h.submit(data,first.id).status.ok,true);assert.equal(h.responses.length,1);
});
test('mail failure preserves the saved reply and retries the durable notification',()=>{
 const h=harness();h.failMail(true);const first=h.submit(data);assert.equal(first.status.ok,true);assert.equal(h.responses.length,1);assert.equal(h.emails.length,0);assert.ok(h.properties.has('mail_'+first.id));
 h.failMail(false);h.context.retryWeddingEmails();assert.equal(h.emails.length,1);assert.equal(h.properties.has('mail_'+first.id),false);
});
test('invalid dates, groups, honeypot and script callbacks cannot save or expose responses',()=>{
 for(const change of [{departure:'2027-05-20'},{party_size:5},{guests:[]},{website:'spam'},{travel_mode:'flight'}]){const h=harness();assert.equal(h.submit({...data,...change}).status.ok,false);assert.equal(h.responses.length,0);}
 const h=harness();assert.equal(h.context.doGet({parameter:{receipt:randomUUID(),callback:'alert(1)'}}).text,'Wedding RSVP endpoint.');
});
