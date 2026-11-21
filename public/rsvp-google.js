/* Anonymous Google Apps Script transport. Only a random receipt ID is read back;
   answers are sent by POST and are never exposed through the receipt endpoint. */
(() => {
 const allowed=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
 function receipt(url,id){
  return new Promise((resolve,reject)=>{
   const callback='weddingReceipt_'+crypto.randomUUID().replaceAll('-','');
   const script=document.createElement('script');
   const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
   const timer=setTimeout(()=>{cleanup();reject(Error('Receipt timeout'));},10000);
   window[callback]=result=>{cleanup();resolve(result);};
   script.onerror=()=>{cleanup();reject(Error('Receipt unavailable'));};
   script.src=url+'?receipt='+encodeURIComponent(id)+'&callback='+callback;
   document.head.append(script);
  });
 }
 window.submitWeddingGoogle=async(data,url)=>{
  if(!allowed.test(url))throw Error('Google RSVP endpoint is not configured.');
  // Keep the same token for an identical retry after a lost acknowledgement.
  const fingerprint=JSON.stringify(data);let prior;
  try{prior=JSON.parse(sessionStorage.getItem('wedding-rsvp-pending'));}catch{}
  const id=prior?.fingerprint===fingerprint?prior.id:crypto.randomUUID();
  try{sessionStorage.setItem('wedding-rsvp-pending',JSON.stringify({id,fingerprint}));}catch{}
  const iframe=document.createElement('iframe');iframe.name='weddingSubmit_'+id;iframe.hidden=true;iframe.title='Submit wedding plans';
  const post=document.createElement('form');post.method='POST';post.action=url;post.target=iframe.name;post.hidden=true;
  for(const [name,value] of Object.entries({receipt:id,payload:JSON.stringify(data)})){
   const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;post.append(input);
  }
  document.body.append(iframe,post);post.submit();
  const deadline=Date.now()+90000;
  try{
   while(Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,1500));
    let result;try{result=await receipt(url,id);}catch{continue;}
    if(result?.ok===true){try{sessionStorage.removeItem('wedding-rsvp-pending');}catch{}return result;}
    if(result?.error)return {ok:false,error:result.error};
   }
   throw Error('Save confirmation timed out.');
  }finally{post.remove();iframe.remove();}
 };
})();
