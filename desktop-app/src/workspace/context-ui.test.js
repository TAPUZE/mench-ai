import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';

test('chat displays actual cited passages and context receipts and saves project notes only after a click',async()=>{
    const browser=new JSDOM('<div id="root"></div>',{url:'http://localhost:3000'});
    for(const name of ['window','document','HTMLElement','Element','Event'])globalThis[name]=name==='window'?browser.window:name==='document'?browser.window.document:browser.window[name];
    Object.defineProperty(globalThis,'navigator',{value:browser.window.navigator,configurable:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
    browser.window.HTMLElement.prototype.scrollIntoView=()=>{};
    const React=await import('react'),{createRoot}=await import('react-dom/client'),server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},cacheDir:'.local/test-vite/context-ui',server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'}),root=createRoot(document.getElementById('root'));
    try{
        const {AssistantPanel}=await server.ssrLoadModule('/src/workspace/Panels.jsx');let saved=null;
        const source={citationId:'fixture:0',sourceId:'fixture',title:'Loop worksheet',reference:'Lesson 1 / 1',author:'Fixture teacher',edition:'Reviewed edition',language:'English',contentHash:'fixture-hash',excerpt:'A loop repeats instructions. <script>This remains text.</script>'};
        await React.act(async()=>root.render(React.createElement(AssistantPanel,{messages:[{id:'answer',role:'model',content:'A loop repeats. [[source:fixture:0]]',citations:[source],context:{intent:'source_lookup',style:'clear',estimatedTokens:321,tokenBudget:24000,earlierExcerpts:2,sourceCount:1,lookup:'approved-library'}}],apiReady:true,protection:'standard',language:'en',onSend:()=>{},onBriefChange:value=>{saved=value;}})));
        assert.ok(document.querySelector('.mw-citations'));assert.equal(document.querySelector('.mw-citations blockquote').textContent,source.excerpt);assert.equal(document.querySelector('script'),null);
        assert.match(document.querySelector('.mw-context-receipt').textContent,/321 of 24000/);assert.match(document.querySelector('.mw-context-receipt').textContent,/1 approved passage/);assert.ok(document.querySelector('.mw-message').textContent.includes('[1]'));
        const field=document.querySelector('textarea[aria-label="Project brief"]');
        await React.act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(field,'Use Python and explain each step.');field.dispatchEvent(new Event('input',{bubbles:true}));});
        assert.equal(saved,null);await React.act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Save project brief').click());assert.equal(saved,'Use Python and explain each step.');
    }finally{await React.act(async()=>root.unmount());await server.close();browser.window.close();}
});
