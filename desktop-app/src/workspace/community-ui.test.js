import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {defaultCommunities,communityOptions} from '../../shared/community-profiles.mjs';

test('settings follow language defaults, retain explicit framework overrides and honor school restrictions',async()=>{
    const browser=new JSDOM('<div id="root"></div>',{url:'http://localhost:3000'});
    for(const name of ['window','document','HTMLElement','Element','Event'])globalThis[name]=name==='window'?browser.window:name==='document'?browser.window.document:browser.window[name];
    Object.defineProperty(globalThis,'navigator',{value:browser.window.navigator,configurable:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
    const React=await import('react'),{createRoot}=await import('react-dom/client'),server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},cacheDir:'.local/test-vite/community-ui',server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'}),root=createRoot(document.getElementById('root'));
    try{
        const {SettingsDialog}=await server.ssrLoadModule('/src/workspace/Panels.jsx'),{CommunityPolicyReview}=await server.ssrLoadModule('/src/workspace/CommunityControls.jsx');
        let saved;const settings={apiKey:'',model:'gemini-2.5-flash',language:'en',protection:'standard',communityProfile:'auto',voice:'auto'};
        const render=props=>React.act(async()=>root.render(React.createElement(SettingsDialog,{settings,onSave:value=>{saved=value;},onClose:()=>{},...props})));
        const select=async(name,value)=>React.act(async()=>{const field=document.querySelector('select[name="'+name+'"]');Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(field,value);field.dispatchEvent(new Event('change',{bubbles:true}));});
        await render();await select('assistantLanguage','he');
        assert.match(document.querySelector('[name="communityProfile"]').selectedOptions[0].textContent,/Israeli/);assert.match(document.querySelector('[name="voice"]').textContent,/Asher Weiss/);
        await select('communityProfile','english');await select('voice','feinstein');await select('assistantLanguage','en');await select('assistantLanguage','he');
        assert.equal(document.querySelector('[name="communityProfile"]').value,'english');assert.equal(document.querySelector('[name="voice"]').value,'auto');
        await select('voice','feinstein');await React.act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
        assert.equal(saved.language,'he');assert.equal(saved.communityProfile,'english');assert.equal(saved.voice,'feinstein');
        const config=defaultCommunities();config.allowedProfiles=['israeli'];config.allowOverride=false;config.profiles.israeli.allowedVoices=['pastoral'];config.profiles.israeli.guidance='Exact reviewed Israeli outlook for this fixture.';
        await render({key:'school',schoolStatus:{url:'https://school.example',communityOptions:communityOptions(config)}});
        assert.equal(document.querySelector('[name="communityProfile"]').options.length,1);assert.equal(document.querySelector('[name="voice"]').options.length,2);assert.doesNotMatch(document.querySelector('[name="voice"]').textContent,/Asher Weiss/);
        await React.act(async()=>root.render(React.createElement(CommunityPolicyReview,{value:config})));
        assert.match(document.body.textContent,/Exact reviewed Israeli outlook/);assert.match(document.body.textContent,/Yitzchak Zilberstein/);assert.doesNotMatch(document.body.textContent,/David Feinstein/);
    }finally{await React.act(async()=>root.unmount());await server.close();browser.window.close();}
});
