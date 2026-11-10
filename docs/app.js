'use strict';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
$('#year').textContent = String(new Date().getFullYear());

// Filter: only actual visible cards are counted; no simulated metrics.
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  $$('[data-filter]').forEach(el => {
    const active = el === button;
    el.classList.toggle('active', active);
    el.setAttribute('aria-pressed', String(active));
  });
  $$('.project').forEach(card => { card.hidden = filter !== 'all' && !card.dataset.tags.split(' ').includes(filter); });
}));

const tabs = $$('.lab-tab');
function showTab(id) {
  tabs.forEach(tab => {
    const active = tab.dataset.tab === id;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    $('#panel-' + tab.dataset.tab).hidden = !active;
  });
  if (id === 'terminal') $('#terminalInput').focus();
}
tabs.forEach((button, index) => {
  button.addEventListener('click', () => showTab(button.dataset.tab));
  button.addEventListener('keydown', e => {
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : (index+(e.key === 'ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next].focus(); showTab(tabs[next].dataset.tab);
  });
});

// Chat: entirely deterministic, no API calls or model claims.
const responses = [
  {match:/telegram|telebot|bot|messaging/i, text:'A pragmatic Telegram bot architecture:\n\n01  Telegram webhook → FastAPI endpoint\n02  Validate updates & route commands\n03  Services layer → tasks and external APIs\n04  Database → users, sessions, preferences\n05  Queue/retries → long-running tasks\n\nStart with a small command router, then add state and background jobs as required.'},
  {match:/agent|workflow|tool.?calling/i, text:'A simple tool-using agent loop:\n\n01  Receive user goal\n02  Plan / select a tool\n03  Execute tool with validated inputs\n04  Inspect result and decide next step\n05  Return a concise answer\n\nBuild guardrails around tool access, iteration limits, logging and confirmation for sensitive actions. Try the Agent Circuit tab.'},
  {match:/rag|retriev|vector|document/i, text:'A basic retrieval-augmented generation system:\n\n01  Ingest documents\n02  Split into meaningful chunks\n03  Create embeddings and index them\n04  Retrieve candidate chunks for a query\n05  Re-rank, cite sources and generate\n\nEvaluate retrieval relevance before tuning generation prompts.'},
  {match:/saas|full.?stack|mern|app|react|next/i, text:'For a practical full-stack SaaS MVP:\n\nFrontend: React / Next.js\nBackend: FastAPI or Node.js API\nData: PostgreSQL or MongoDB\nAuth: a managed identity provider\nInfra: hosted app + logs + automated deployment\n\nBuild one full user flow first: signup → create → read → update → delete.'},
  {match:/prompt|compress|token/i, text:'For a prompt-compression extension, focus on preserving user intent and constraints while reducing redundant tokens. Measure before/after token estimates and keep the original prompt recoverable.\n\nSee the Prompt Compressor project under Featured Work.'},
  {match:/hello|hi|hey|about|who/i, text:'Hello! This interactive console is a local demonstration of developer workflows. I’m Aniket Rai, focused on AI/ML, web engineering and building useful products. Try asking about agents, Telegram bots or full-stack apps.'}
];
function addMessage(who, message) {
  const row=document.createElement('div'); row.className='chat-item '+who;
  const icon=document.createElement('span'); icon.className='chat-icon'; icon.textContent=who==='user'?'YOU':'AR';
  const body=document.createElement('div'); const label=document.createElement('small'); label.textContent=who==='user'?'VISITOR':'ENGINEERING CONSOLE';
  const p=document.createElement('p'); p.textContent=message;
  body.append(label,p); row.append(icon,body); $('#chatLog').append(row); $('#chatLog').scrollTop=$('#chatLog').scrollHeight;
}
function chat(input) {
  const message=input.trim();if(!message)return;
  addMessage('user',message);
  const reply=responses.find(r=>r.match.test(message));
  addMessage('assistant',reply?reply.text:'This is a small local demo, not a live LLM. Try asking about Telegram bots, AI agents, RAG, prompt compression or full-stack apps to explore prepared technical examples.');
}
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();chat($('#chatInput').value);$('#chatInput').value='';});
$$('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{showTab('chat');chat(b.dataset.prompt);}));

// Actual JS execution, contained in an opaque-origin iframe. No privileges or parent access.
const snippets = {
  hello: `const name = 'Aniket';\nconsole.log('Hello from the browser sandbox, ' + name + '!');`,
  fibonacci: `function fibonacci(n) {\n  const result = [0, 1];\n  while (result.length < n) {\n    const len = result.length;\n    result.push(result[len - 1] + result[len - 2]);\n  }\n  return result.slice(0, n);\n}\nconsole.log(fibonacci(10));`,
  array: `const projects = [\n  { name: 'Telegram Bot', type: 'automation' },\n  { name: 'Prompt Compressor', type: 'AI' },\n  { name: 'Portfolio OS', type: 'web' }\n];\nconsole.log(projects.filter(p => p.type !== 'web').map(p => p.name));`,
  async: `async function run() {\n  const result = await Promise.resolve({ status: 'ok', latency: 0 });\n  console.log('Async result:', result);\n}\nrun();`
};
$('#codeEditor').value=snippets.hello;
$('#codeExample').addEventListener('change',()=>{ $('#codeEditor').value=snippets[$('#codeExample').value];$('#codeOutput').textContent='// Example loaded. Press RUN CODE.'; });
$('#resetCode').addEventListener('click',()=>{$('#codeEditor').value=snippets[$('#codeExample').value];$('#codeOutput').textContent='// Code reset.';});
let runId=0, timeoutId;
window.addEventListener('message',e=>{
  if(e.source!==$('#runnerFrame').contentWindow || !e.data || e.data.channel!=='AR_DEVLAB_RUNNER' || e.data.id!==runId)return;
  const output=$('#codeOutput');
  if(e.data.type==='line'){
    if(output.textContent==='// Running...')output.textContent='';
    output.textContent+=String(e.data.value).slice(0,1000)+'\n';
    if(output.textContent.length>12000)output.textContent=output.textContent.slice(0,12000)+'\n… output truncated';
  }
  if(e.data.type==='done'){$('#runStatus').textContent='Executed in isolated iframe.';clearTimeout(timeoutId);if(output.textContent==='// Running...') output.textContent='// Completed (no output)';}
});
function runCode(){
  const userCode=$('#codeEditor').value;
  if(userCode.length>10000){$('#codeOutput').textContent='Error: this demo limits snippets to 10,000 characters.';return;}
  runId+=1;const current=runId;
  const f=$('#runnerFrame');
  // Serialize code as data, not interpolated script source, so literal closing script tags cannot escape.
  const payload=JSON.stringify(userCode).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
  const script=`(()=>{const id=${current};const send=(type,value)=>parent.postMessage({channel:'AR_DEVLAB_RUNNER',id,type,value},'*');const format=v=>{try{return typeof v==='string'?v:JSON.stringify(v)}catch(e){return String(v)}};console.log=(...a)=>send('line',a.map(format).join(' '));console.error=(...a)=>send('line','ERROR: '+a.map(format).join(' '));window.onerror=(m)=>{send('line','ERROR: '+m);send('done','')};try{const fn=Function(${payload});const p=fn();if(p&&typeof p.then==='function'){p.then(()=>send('done','')).catch(e=>{send('line','ERROR: '+e.message);send('done','')})}else{setTimeout(()=>send('done',''),200)}}catch(e){send('line','ERROR: '+e.message);send('done','')}})();`;
  // Opaque-origin sandbox disallows cookies, storage, same-origin access and top navigation.
  const policy = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; img-src 'none'; form-action 'none'";
  f.srcdoc='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+policy+'"><script>'+script+'</'+'script>';
  $('#codeOutput').textContent='// Running...';$('#runStatus').textContent='Running in sandbox...';
  clearTimeout(timeoutId);
  timeoutId=setTimeout(()=>{if(current!==runId)return;$('#runStatus').textContent='Stopped after 3 seconds.';f.srcdoc='<!doctype html>';if($('#codeOutput').textContent==='// Running...')$('#codeOutput').textContent='// Timeout';},3000);
}
$('#runCode').addEventListener('click',runCode);
$('#codeEditor').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const t=e.target,start=t.selectionStart;t.value=t.value.slice(0,start)+'  '+t.value.slice(t.selectionEnd);t.selectionStart=t.selectionEnd=start+2;}});

// Playable agent workflow puzzle.
const nodes = [
  {id:'request',label:'User Request',desc:'Receive input'},
  {id:'plan',label:'Plan & Route',desc:'Decide next action'},
  {id:'tool',label:'Execute Tool',desc:'Call a bounded tool'},
  {id:'response',label:'Final Response',desc:'Return result'}
];
const correct=nodes.map(n=>n.id);
const scramble=['tool','response','request','plan'];
let chosen=[];
function renderCircuit(){
  const slots=$('#circuitSlots');slots.replaceChildren();
  for(let i=0;i<4;i++){
    const node=nodes.find(n=>n.id===chosen[i]);
    const slot=document.createElement('div');slot.className='slot'+(node?' filled':'');slot.textContent=String(i+1).padStart(2,'0');
    const label=document.createElement('span');label.textContent=node?node.label:'EMPTY';slot.append(label);slots.append(slot);
  }
  const choices=$('#circuitChoices');choices.replaceChildren();
  scramble.forEach(id=>{
    const node=nodes.find(n=>n.id===id);
    const button=document.createElement('button');button.type='button';button.className='choice';button.textContent=node.label;button.disabled=chosen.includes(id)||chosen.length===4;
    button.addEventListener('click',()=>{chosen.push(id);renderCircuit();const f=$('#circuitFeedback');f.textContent='Connected '+chosen.length+' / 4 modules. Test your circuit when complete.';f.className='feedback';});
    choices.append(button);
  });
}
function resetCircuit(){chosen=[];renderCircuit();const f=$('#circuitFeedback');f.className='feedback';f.textContent='Circuit idle. Connect the four nodes.';}
$('#resetCircuit').addEventListener('click',resetCircuit);
$('#checkCircuit').addEventListener('click',()=>{
 const f=$('#circuitFeedback');
 if(chosen.length!==4){f.className='feedback fail';f.textContent='Connect all four stages before testing.';return;}
 const passed=correct.every((id,i)=>chosen[i]===id);
 $$('#circuitSlots .slot').forEach((s,i)=>s.classList.add(chosen[i]===correct[i]?'good':'bad'));
 f.className='feedback '+(passed?'success':'fail');
 f.textContent=passed?'✓ CIRCUIT ONLINE. Request → Plan → Tool → Response. Mission complete!':'× Circuit mismatch. Think about what the system receives, decides, executes, and returns.';
});
$('#circuitHint').addEventListener('click',()=>{const f=$('#circuitFeedback');f.className='feedback';f.textContent='HINT: A request arrives first. The tool cannot execute until an action is planned.';});
renderCircuit();

// Typed mini terminal; outputs are plain text nodes to avoid code injection.
const commands = {
  help:'Available commands:\n  help       Show this help\n  whoami     Identify the developer\n  about      Background & focus\n  projects   Show featured work\n  stack      Show technical skills\n  contact    Contact links\n  open       Open a project: open portfolio | open prompt | open github\n  demo       Jump to the interactive playground\n  clear      Clear terminal output',
  whoami:'Aniket Rai  /  github.com/codebreaker939\nAI/ML-focused computer science student, full-stack developer and product builder.',
  about:'I build with Python and the MERN stack, explore agentic AI and Spring AI, and work on products through BYT Solutions.',
  projects:'01  Portfolio OS        [live]\n02  Telegram News Bot   [public repo]\n03  Prompt Compressor   [public repo]\n04  BYT Solutions       [in development]',
  stack:'AI: Python, FastAPI, LLM tools\nWeb: React, JavaScript, HTML, CSS\nBackend: Node.js, Express, REST\nData/Tools: MongoDB, SQL, Git, Postman\nExploring: Spring AI, agentic systems, cloud',
  contact:'Email: raianiket@outlook.com\nGitHub: github.com/codebreaker939\nLinkedIn: linkedin.com/in/aniketrai07',
  demo:'You are already inside the developer playground. Try a different module using the tab strip.'
};
const terminal=$('#terminalOutput');
function printLine(text, className=''){
 const line=document.createElement('div');line.className=className;line.textContent=text;terminal.append(line);terminal.scrollTop=terminal.scrollHeight;
}
function execute(raw){
 const command=raw.trim();if(!command)return;
 printLine('visitor@devlab:~$ '+command,'cli-prompt');
 if(command.toLowerCase()==='clear'){terminal.replaceChildren();return;}
 const [cmd,arg]=command.toLowerCase().split(/\s+/,2);
 if(cmd==='open'){
   const link={portfolio:'https://aniket-s-os.vercel.app/',prompt:'https://github.com/codebreaker939/Prompt-Compressor-',github:'https://github.com/codebreaker939'}[arg];
   if(link){printLine('Opening '+arg+' in a new tab...');window.open(link,'_blank','noopener,noreferrer');}
   else printLine('Use: open portfolio | open prompt | open github','cli-error');
 }else if(Object.hasOwn(commands,cmd)){printLine(commands[cmd]);}
 else printLine('Unknown command. Type help to list available commands.','cli-error');
}
$('#terminalForm').addEventListener('submit',e=>{e.preventDefault();execute($('#terminalInput').value);$('#terminalInput').value='';});
$$('[data-command]').forEach(b=>b.addEventListener('click',()=>{showTab('terminal');execute(b.dataset.command);}));
