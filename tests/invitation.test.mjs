import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('public/invitation.js','utf8');
function pending({saved=false,cookie='',query='',hash='',blocked=false}={}){
 const classes=[];vm.runInNewContext(source,{URLSearchParams,location:{search:query,hash},localStorage:{getItem(){if(blocked)throw Error('blocked');return saved?'yes':null;}},document:{cookie,documentElement:{classList:{add:x=>classes.push(x)}},readyState:'loading',addEventListener(){}}});return classes.includes('invitation-pending');
}
test('envelope appears first time, then stays dismissed on refresh or language change',()=>{assert.equal(pending(),true);assert.equal(pending({saved:true}),false);assert.equal(pending({cookie:'wedding-invitation-opened=yes',blocked:true}),false);});
test('only the review parameter replays the envelope; section links bypass it',()=>{assert.equal(pending({saved:true,query:'?invitation=preview'}),true);assert.equal(pending({hash:'#rsvp'}),false);});
