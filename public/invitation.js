/* Set enabled to false to retire the invitation without changing the website. */
(() => {
 const enabled=true, key='wedding-invitation-opened';
 const params=new URLSearchParams(location.search);
 // Direct section links and return visits go straight to the wedding details.
 let seen=document.cookie.split('; ').includes(key+'=yes');try{seen=seen||localStorage.getItem(key)==='yes';}catch{}
 if(!enabled || location.hash || (seen && params.get('invitation')!=='preview'))return;
 const root=document.documentElement;
 root.classList.add('invitation-pending');
 const copy={
  en:{title:'You are invited',open:'Click to open',touch:'Tap the seal to open',skip:'Go straight to website',language:'Language'},
  de:{title:'Du bist eingeladen',open:'Zum Öffnen klicken',touch:'Zum Öffnen auf das Siegel tippen',skip:'Direkt zur Website',language:'Sprache'},
  es:{title:'Estás invitado(a)',open:'Haz clic para abrir',touch:'Toca el sello para abrir',skip:'Ir directamente al sitio',language:'Idioma'}
 };
 function start(){
  const lang=copy[root.lang]?root.lang:'en',t=copy[lang];
  const main=document.querySelector('main'),nav=document.querySelector('body > nav'),footer=document.querySelector('body > footer');
  if(!main){root.classList.remove('invitation-pending');return;}
  const page=[nav,main,footer].filter(Boolean);page.forEach(el=>el.inert=true);
  const cover=document.createElement('section');cover.className='invitation-cover';cover.setAttribute('role','dialog');cover.setAttribute('aria-modal','true');cover.setAttribute('aria-labelledby','invitation-title');
  cover.innerHTML='<div class="invitation-languages" role="group"></div><h1 id="invitation-title" class="invitation-title"></h1><div class="invitation-envelope"><img class="invitation-art" src="/assets/invitation-envelope.webp" alt="" width="1683" height="935"><div class="invitation-interior" aria-hidden="true"></div><img class="invitation-flap" src="/assets/invitation-paper.webp" alt="" width="1683" height="935"><button type="button" class="invitation-seal"><span class="invitation-tooltip" aria-hidden="true"></span></button></div><p class="invitation-touch"></p><button type="button" class="invitation-skip"></button>';
  const languages=cover.querySelector('.invitation-languages');languages.setAttribute('aria-label',t.language);
  for(const [code,label] of [['en','EN'],['de','DE'],['es','ES']]){
   const a=document.createElement('a');a.textContent=label;a.lang=code;a.hreflang=code;
   const url=new URL(location.href);url.pathname=code==='en'?'/':'/'+code;url.searchParams.set('lang',code);a.href=url.href;
   if(code===lang)a.setAttribute('aria-current','true');languages.append(a);
  }
  cover.querySelector('h1').textContent=t.title;
  const seal=cover.querySelector('.invitation-seal'),skip=cover.querySelector('.invitation-skip');
  seal.setAttribute('aria-label',t.open);cover.querySelector('.invitation-tooltip').textContent=t.open;cover.querySelector('.invitation-touch').textContent=t.touch;skip.textContent=t.skip;
  document.body.append(cover);
  let opening=false,done=false,animations=[],fallback,front,hinge;
  const remember=()=>{try{localStorage.setItem(key,'yes');}catch{}try{document.cookie=key+'=yes; Max-Age=31536000; Path=/; SameSite=Lax; Secure';}catch{}};
  function finish(){
   if(done)return;done=true;clearTimeout(fallback);animations.forEach(a=>a.cancel());
   root.classList.remove('invitation-pending','invitation-opening');main.removeAttribute('style');page.forEach(el=>el.inert=false);cover.remove();front?.remove();hinge?.remove();
   document.dispatchEvent(new Event('invitation-opened'));
   const heading=main.querySelector('h1');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
  }
  function open(animate){
   if(opening)return;opening=true;remember();
   if(!animate || matchMedia('(prefers-reduced-motion: reduce)').matches || typeof main.animate!=='function'){finish();return;}
   seal.disabled=true;skip.disabled=true;
   const r=cover.querySelector('.invitation-envelope').getBoundingClientRect(),w=innerWidth,h=innerHeight;
   // Match the final document position, including the navigation's normal height.
   const restingTop=main.getBoundingClientRect().top;
   const cw=Math.min(r.width*.84,w*.85),ch=r.height*.77,x=(w-cw)/2,y=r.top+r.height*.10;
   const card=(top)=>`translate(${x}px, ${top}px) scale(${cw/w}, ${ch/h})`;
   root.classList.add('invitation-opening');
   main.style.cssText='position:fixed;inset:0;width:100vw;height:100dvh;overflow:hidden;transform-origin:0 0;z-index:10003;pointer-events:none;background:var(--cream);';
   try{
    // A separate front pocket stays in front of the card while it emerges.
    front=document.createElement('div');front.className='invitation-front';front.setAttribute('aria-hidden','true');
    Object.assign(front.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});document.body.append(front);
    // Use the actual, opaque website from the first opening frame.
    hinge=cover.querySelector('.invitation-flap').cloneNode(true);hinge.className='invitation-hinge';
    Object.assign(hinge.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});document.body.append(hinge);
    animations.push(hinge.animate([
     {transform:'perspective(1000px) rotateX(0deg)',filter:'brightness(1)'},
     {transform:'perspective(1000px) rotateX(-85deg)',filter:'brightness(.92)',offset:.5},
     {transform:'perspective(1000px) rotateX(-170deg)',filter:'brightness(.97)'}
    ],{delay:180,duration:1250,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'}));
    // Once the flap passes its upright position, it sits behind the page.
    // Keep the front pocket above the page so the covered portion stays hidden.
    animations.push(hinge.animate([{zIndex:10005},{zIndex:10002}],{delay:805,duration:1,fill:'forwards'}));
    const lifted=Math.max(20,y-ch-24);
    const a=main.animate([
     {transform:card(y),offset:0},
     {transform:card(y),offset:.3034,easing:'cubic-bezier(.4,0,.2,1)'},
     {transform:card(lifted),offset:.5904},
     {transform:card(lifted),offset:.64,easing:'cubic-bezier(.22,1,.36,1)'},
     {transform:`translate(0,${restingTop}px) scale(1)`,offset:1}
    ],{duration:5000,easing:'linear',fill:'both'});
    // Fade the navigation into place before returning the page to normal flow.
    if(nav)animations.push(nav.animate([{opacity:0,visibility:'visible',zIndex:10006},{opacity:1,visibility:'visible',zIndex:10006}],{delay:4500,duration:500,easing:'ease-out',fill:'both'}));
    // The solid pocket hides the covered page until it clears the envelope.
    const lower=[{transform:'translateY(0)'},{transform:'translateY(110vh)'}];
    animations.push(a,front.animate(lower,{delay:3100,duration:900,fill:'both'}),hinge.animate([{opacity:1},{opacity:0}],{delay:3100,duration:300,fill:'both'}),cover.querySelector('.invitation-envelope').animate(lower,{delay:3100,duration:900,fill:'both'}));
    cover.classList.add('is-opening');a.finished.then(finish,finish);fallback=setTimeout(finish,5700);
   }catch{finish();}
  }
  seal.addEventListener('click',()=>open(true));skip.addEventListener('click',()=>open(false));
  cover.querySelector('img').addEventListener('error',()=>open(false));
  // Keep keyboard navigation inside the invitation until it opens.
  cover.addEventListener('keydown',e=>{
   if(e.key==='Escape'){open(false);return;}
   if(e.key!=='Tab')return;const controls=[...cover.querySelectorAll('a,button:not(:disabled)')];const first=controls[0],last=controls.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  seal.focus({preventScroll:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
