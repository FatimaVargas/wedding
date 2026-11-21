import {readFileSync,writeFileSync,cpSync,rmSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
const base=process.argv[2]||'/';
if(!/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(base))throw Error('Use / or a repository base such as /wedding/.');
const config=readFileSync('public/rsvp-config.js','utf8');
if(!/provider:\s*['"]google['"]/.test(config)||!/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/.test(config))throw Error('Configure the Google RSVP endpoint before exporting a static site.');
const out='github-pages';rmSync(out,{recursive:true,force:true});mkdirSync(out);
cpSync('public',out,{recursive:true});
for(const [lang,name] of [['en','index.html'],['de','de.html'],['es','es.html']])writeFileSync(join(out,name),readFileSync('content/'+lang+'.html','utf8'));
function rewrite(dir){for(const name of readdirSync(dir)){const p=join(dir,name);if(statSync(p).isDirectory()){rewrite(p);continue;}
 if(!/\.(html|css|js)$/.test(p))continue;
 let s=readFileSync(p,'utf8');
 s=s.replace(/(["'(])\/(assets\/|mobile\.css|invitation\.(?:css|js)|languages\.js|navigation\.js|translations\.json|rsvp(?:-config|-google)?\.js)/g,(_,q,path)=>q+base+path);
 if(name==='languages.js')s=s.replace("lang === 'en' ? '/' : '/' + lang",`lang === 'en' ? '${base}' : '${base}' + lang + '.html'`);
 if(name==='invitation.js')s=s.replace("code==='en'?'/':'/'+code",`code==='en'?'${base}':'${base}'+code+'.html'`);
 writeFileSync(p,s);
}}
rewrite(out);writeFileSync(join(out,'.nojekyll'),'');console.log('Static site ready in '+out+' for base '+base);
