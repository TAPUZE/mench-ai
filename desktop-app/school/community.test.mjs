import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {SchoolStore} from './store.mjs';
import {Gateway} from './gateway.mjs';
import {defaultCommunities,resolveCommunity,validateCommunities} from '../shared/community-profiles.mjs';
import {buildChatContext,personalRules} from '../shared/chat-context.mjs';

const password='community-fixtures-only-password';
async function fixture(t,community=defaultCommunities()){
    const store=new SchoolStore(':memory:',{bootstrapToken:'setup'});t.after(()=>store.close());
    const admin=await store.bootstrap({token:'setup',username:'admin',name:'Admin',password}),teacher=await store.register({token:store.invite(admin,{role:'teacher',name:'Reviewer'}).token,username:'teacher',password}),student=await store.register({token:store.invite(admin,{role:'student',name:'Student'}).token,username:'student',password});
    const rules={instructions:'Respect common school boundaries and use reviewed evidence.',blockedTerms:['common-restriction'],...(community?{communityProfiles:community}:{})};
    const policy=store.draftPolicy(admin,{expectedVersion:1,approverId:teacher.id,rules});store.approvePolicy(teacher,{id:policy.id,version:policy.version,confirmed:true,notes:'Reviewed exact isolated community frameworks and voices.'});
    const session=(await store.login({username:'student',password})).token;
    return {store,admin,teacher,student,session};
}
const request=(question,extra={})=>({messages:[{role:'user',content:question}],...extra});
function source(store,teacher,scope='english'){
    const draft=store.knowledge.create(teacher,{title:'Fixture source',reference:'Fixture worksheet / 1',author:'Fixture teacher',edition:'Fixture edition',language:'English',body:'A loop repeats instructions until its condition changes.'});
    return store.knowledge.approve(teacher,{id:draft.id,contentHash:draft.contentHash,approvalScope:scope,confirmed:true,notes:'Reviewed exact fixture text for the selected community.'});
}
test('language defaults, explicit overrides and voice blending preserve the two blueprint families',()=>{
    const config=defaultCommunities();
    assert.equal(resolveCommunity(config,{language:'en'}).id,'english');assert.equal(resolveCommunity(config,{language:'he'}).id,'israeli');
    assert.equal(resolveCommunity(config,{language:'he',community:'english'}).id,'english');assert.equal(resolveCommunity(config,{language:'en',community:'israeli'}).id,'israeli');
    assert.deepEqual(resolveCommunity(config,{language:'en',question:'Tell an inspiring story'}).voiceIds,['krohn','pam']);
    assert.deepEqual(resolveCommunity(config,{language:'he',question:'Talk about unity in our community'}).voiceIds,['unifier','pastoral']);
    assert.deepEqual(resolveCommunity(config,{language:'he',question:'Teach emunah and simcha'}).voiceIds,['spiritual','pastoral']);
    assert.deepEqual(resolveCommunity(config,{language:'he',intent:'source_lookup'}).voiceIds,['analyst','pastoral']);
    assert.throws(()=>resolveCommunity(config,{language:'en',voice:'analyst'}),/not permitted/);
});
test('community context includes the distinct rules and philosophy without claiming real-rabbi identity',()=>{
    const rules=personalRules(),input={messages:[{role:'user',content:'Explain a Python loop'}],language:'he',community:'english',voice:'salomon',files:[]};
    const plan=buildChatContext(input,{policy:{rules}});
    assert.match(plan.system,/English-speaking Orthodox/);assert.match(plan.system,/Mishnah Berurah/);assert.match(plan.system,/Mussar and chinuch/);assert.match(plan.system,/Answer in Hebrew/);
    assert.match(plan.system,/Do not impersonate/);assert.ok(!plan.system.includes('Israeli composite blueprint'));assert.match(plan.system,/PERSONAL BLUEPRINT/);
    const israeli=buildChatContext({...input,community:'israeli',voice:'analyst'},{policy:{rules}});assert.match(israeli.system,/contemporary institutions/);assert.match(israeli.system,/Asher Weiss/);assert.ok(!israeli.system.includes('prioritizes the school-approved Shulchan'));
});
test('school configuration snapshots are pinned to the exact policy revision and legacy approval stays unchanged',async t=>{
    const config=defaultCommunities(),{store}=await fixture(t,config),saved=store.policy();
    config.profiles.english.guidance='Altered outside the approved policy';assert.notEqual(store.policy().rules.communityProfiles.profiles.english.guidance,config.profiles.english.guidance);
    assert.equal(saved.rules.communityProfiles.version,1);
    const bad=defaultCommunities();bad.allowedProfiles=['unknown'];assert.throws(()=>validateCommunities(bad),/permitted/);
    const legacy=await fixture(t,null),plan=buildChatContext({messages:[{role:'user',content:'Explain loops'}],language:'he'},{policy:legacy.store.policy(),mode:'school'});
    assert.equal(plan.community,null);assert.equal(legacy.store.status().communityOptions,null);assert.throws(()=>resolveCommunity(undefined,{community:'israeli'}),/approve community profiles/);
});
test('common restrictions always apply while community-specific rules differ and a permitted override is explicit',async t=>{
    const config=defaultCommunities();config.profiles.israeli.blockedTerms=['israeli-only-restriction'];const {store,session}=await fixture(t,config);let calls=0;
    const gateway=new Gateway({store,generate:async()=>{calls++;return {content:'A bounded learning answer.'};}});
    assert.equal((await gateway.dispatch('ai.ask',request('Explain israeli-only-restriction',{language:'en'}),session)).blocked,undefined);
    assert.equal((await gateway.dispatch('ai.ask',request('Explain israeli-only-restriction',{language:'he'}),session)).blocked,true);
    const override=await gateway.dispatch('ai.ask',request('Explain israeli-only-restriction',{language:'he',community:'english'}),session);assert.equal(override.context.community.id,'english');assert.equal(calls,2);
    assert.equal((await gateway.dispatch('ai.ask',request('Explain common-restriction',{language:'he',community:'english'}),session)).blocked,true);assert.equal(calls,2);
});
test('a fixed school community and its permitted voices cannot be bypassed by language or client requests',async t=>{
    const config=defaultCommunities();config.defaultProfile='english';config.allowOverride=false;config.allowedProfiles=['english'];config.profiles.english.allowedVoices=['pam'];
    const {store,session}=await fixture(t,config),gateway=new Gateway({store,generate:async()=>({content:'Learning answer.'})});
    const result=await gateway.dispatch('ai.ask',request('Explain a loop',{language:'he'}),session);assert.equal(result.context.community.id,'english');assert.deepEqual(result.context.community.voices.map(voice=>voice.id),['pam']);
    await assert.rejects(gateway.dispatch('ai.ask',request('Explain a loop',{community:'israeli'}),session),{code:'PROFILE_NOT_ALLOWED'});
    await assert.rejects(gateway.dispatch('ai.ask',request('Explain a loop',{voice:'feinstein'}),session),{code:'PROFILE_NOT_ALLOWED'});
});
test('approved source retrieval and browsing are scoped to the selected community, including cross-language overrides',async t=>{
    const {store,teacher,session,student}=await fixture(t),approved=source(store,teacher,'english');let calls=0;
    const gateway=new Gateway({store,generate:async input=>{calls++;const passages=JSON.parse(input.prepared.blocks.find(block=>block.kind==='approved_source_passages').text);return {content:'A loop repeats. [[source:'+passages[0].citationId+']]'};}});
    const english=await gateway.dispatch('ai.ask',request('Find sources for loop',{language:'en'}),session);assert.equal(english.citations[0].sourceId,approved.id);
    const israeli=await gateway.dispatch('ai.ask',request('Find sources for loop',{language:'he'}),session);assert.match(israeli.content,/לא נמצאו/);assert.equal(calls,1);
    const override=await gateway.dispatch('ai.ask',request('Find sources for loop',{language:'he',community:'english'}),session);assert.equal(override.context.community.id,'english');assert.equal(calls,2);
    assert.equal((await gateway.dispatch('source.list',{language:'he'},session)).total,0);await assert.rejects(gateway.dispatch('source.get',{id:approved.id,language:'he'},session),{code:'FORBIDDEN'});
    assert.equal(store.knowledge.list(student,{},'english').total,1);
});
test('changing a source approval scope during generation prevents release to the previous community',async t=>{
    const {store,teacher,session}=await fixture(t),approved=source(store,teacher,'english');
    const gateway=new Gateway({store,generate:async()=>{store.knowledge.approve(teacher,{id:approved.id,contentHash:approved.contentHash,approvalScope:'israeli',confirmed:true,notes:'Reviewed for Israeli scope only.'});return {content:'Old-scope answer.'};}});
    await assert.rejects(gateway.dispatch('ai.ask',request('Explain loops',{language:'en'}),session),{code:'SOURCE_CHANGED'});
});
test('schema three migration preserves exact source hashes and keeps legacy school approvals in the legacy framework',async t=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mench-community-migrate-')),file=path.join(directory,'school.sqlite');let store;
    t.after(async()=>{store?.close();await fs.rm(directory,{recursive:true,force:true,maxRetries:8,retryDelay:100});});
    store=await SchoolStore.open(file,{bootstrapToken:'setup'});const admin=await store.bootstrap({token:'setup',username:'admin',name:'Admin',password});
    const draft=store.knowledge.create(admin,{title:'Legacy source',reference:'Fixture / 1',author:'Fixture',edition:'Fixture',language:'English',body:'A loop repeats.'});store.close();
    const old=new DatabaseSync(file);old.exec('ALTER TABLE knowledge_sources DROP COLUMN approval_scope; PRAGMA user_version=3;');old.close();
    store=await SchoolStore.open(file);assert.equal(store.db.prepare('PRAGMA user_version').get().user_version,4);assert.equal(store.knowledge.get(admin,{id:draft.id}).contentHash,draft.contentHash);assert.equal(store.knowledge.get(admin,{id:draft.id}).approvalScope,'legacy');assert.equal(store.policy().rules.communityProfiles,undefined);
});
