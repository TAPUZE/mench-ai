import {randomUUID,createHash} from 'node:crypto';
import {fail,text,now} from './validation.mjs';
import {pageQuery,pageSearch} from './pagination.mjs';
import {normalizeSearch,retrievalTerms} from '../shared/chat-context.mjs';

export const sourceHash=value=>createHash('sha256').update(value).digest('hex');
export function sourceFields(input){
    const result={};
    for(const [key,max,required] of [['title',180,true],['reference',240,true],['author',180,true],['edition',180,true],['language',40,true],['keywords',500,false],['originUrl',1000,false],['body',30000,true]]){
        result[key]=required?text(input[key],key,max):input[key]?text(input[key],key,max):'';
    }
    if(Object.values(result).some(value=>!value.isWellFormed()))fail('Source text contains an incomplete Unicode character.');
    if(result.originUrl){let url;try{url=new URL(result.originUrl);}catch{fail('Choose a valid HTTPS source URL.');}if(url.protocol!=='https:'||url.username||url.password)fail('Choose a valid HTTPS source URL.');}
    return result;
}
function chunks(body){
    const result=[];let start=0;
    while(start<body.length){let end=Math.min(start+1600,body.length);if(end<body.length){const boundary=body.lastIndexOf('\n',end);if(boundary>start+500)end=boundary;if(/[\uD800-\uDBFF]/u.test(body[end-1])&&/[\uDC00-\uDFFF]/u.test(body[end]))end--;}
        result.push({start,end,excerpt:body.slice(start,end)});start=end;
    }
    return result;
}
export function initializeKnowledge(db){
    db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_sources(id TEXT PRIMARY KEY,title TEXT NOT NULL,reference TEXT NOT NULL,author TEXT NOT NULL,edition TEXT NOT NULL,language TEXT NOT NULL,keywords TEXT NOT NULL,origin_url TEXT NOT NULL,body TEXT NOT NULL,content_hash TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('draft','approved','retired')),replaces_id TEXT REFERENCES knowledge_sources(id),created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,approved_by TEXT REFERENCES users(id),approved_at TEXT,approval_policy_id TEXT REFERENCES policies(id));
        CREATE TABLE IF NOT EXISTS knowledge_chunks(id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES knowledge_sources(id),position INTEGER NOT NULL,start_offset INTEGER NOT NULL,end_offset INTEGER NOT NULL,body TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS knowledge_status ON knowledge_sources(status,approval_policy_id);
        CREATE INDEX IF NOT EXISTS knowledge_chunk_source ON knowledge_chunks(source_id);
        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(chunk_id UNINDEXED,title,reference,keywords,body,tokenize='unicode61');
    `);
    if(!db.prepare('PRAGMA table_info(knowledge_sources)').all().some(column=>column.name==='approval_scope'))db.exec("ALTER TABLE knowledge_sources ADD COLUMN approval_scope TEXT NOT NULL DEFAULT 'legacy'");
}
export class KnowledgeLibrary {
    constructor(store){this.store=store;this.db=store.db;}
    policy(){return this.store.policy();}
    list(actor,input={},family=null){
        const search=pageSearch(input),staff=actor.role!=='student',policy=this.policy();
        const status=input.status||'all';if(!['all','draft','approved','retired'].includes(status))fail('Invalid source status.');
        const where=[staff?'1':"t.status='approved' AND t.approval_policy_id=?"],params=staff?[]:[policy.id];
        if(!staff&&family){where.push("t.approval_scope IN (?,'both')");params.push(family);}
        if(status!=='all'){where.push('t.status=?');params.push(status);}
        if(search){where.push("(t.title LIKE ? ESCAPE '\\' OR t.reference LIKE ? ESCAPE '\\' OR t.author LIKE ? ESCAPE '\\')");const term='%'+search.replace(/[\\%_]/g,'\\$&')+'%';params.push(term,term,term);}
        return pageQuery(this.db,{from:'knowledge_sources t',columns:'t.id,t.title,t.reference,t.author,t.edition,t.language,t.status,t.content_hash AS contentHash,t.approved_at AS approvedAt,t.approval_policy_id AS approvalPolicyId,t.approval_scope AS approvalScope,t.created_at AS createdAt',where:where.join(' AND '),params,scope:JSON.stringify(['sources',actor.id,policy.id,search,status,family]),input,map:row=>({...row,policyMatch:row.approvalPolicyId===policy.id,eligible:row.status==='approved'&&row.approvalPolicyId===policy.id&&(!family||[family,'both'].includes(row.approvalScope))})});
    }
    get(actor,input,family=null){
        const row=this.db.prepare('SELECT * FROM knowledge_sources WHERE id=?').get(input.id);
        if(!row)fail('Source not found.',404,'NOT_FOUND');
        if(actor.role==='student'&&(row.status!=='approved'||row.approval_policy_id!==this.policy().id||family&&![family,'both'].includes(row.approval_scope)))fail('This source is not approved for the current school policy.',403,'FORBIDDEN');
        return {id:row.id,title:row.title,reference:row.reference,author:row.author,edition:row.edition,language:row.language,keywords:row.keywords,originUrl:row.origin_url,body:row.body,contentHash:row.content_hash,status:row.status,replacesId:row.replaces_id,approvalPolicyId:row.approval_policy_id,approvalScope:row.approval_scope,approvedAt:row.approved_at};
    }
    create(actor,input){
        this.store.require(actor,['admin','teacher']);const value=sourceFields(input),id=randomUUID();
        if(input.replacesId&&!this.db.prepare('SELECT id FROM knowledge_sources WHERE id=?').get(input.replacesId))fail('The source to revise no longer exists.');
        const hash=sourceHash(JSON.stringify(value));this.db.exec('BEGIN IMMEDIATE');
        try{
            this.db.prepare('INSERT INTO knowledge_sources(id,title,reference,author,edition,language,keywords,origin_url,body,content_hash,status,replaces_id,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,value.title,value.reference,value.author,value.edition,value.language,value.keywords,value.originUrl,value.body,hash,'draft',input.replacesId||null,actor.id,now());
            for(const [position,chunk] of chunks(value.body).entries()){
                const chunkId=id+':'+position;this.db.prepare('INSERT INTO knowledge_chunks(id,source_id,position,start_offset,end_offset,body) VALUES(?,?,?,?,?,?)').run(chunkId,id,position,chunk.start,chunk.end,chunk.excerpt);
                this.db.prepare('INSERT INTO knowledge_fts(chunk_id,title,reference,keywords,body) VALUES(?,?,?,?,?)').run(chunkId,normalizeSearch(value.title),normalizeSearch(value.reference),normalizeSearch(value.keywords),normalizeSearch(chunk.excerpt));
            }
            this.store.audit(actor,'source.draft',id,{contentHash:hash,replacesId:input.replacesId||null});this.db.exec('COMMIT');
        }catch(error){this.db.exec('ROLLBACK');throw error;}return this.get(actor,{id});
    }
    approve(actor,input){
        this.store.require(actor,['admin','teacher']);const policy=this.policy(),source=this.get(actor,input);
        if(policy.status!=='approved'||policy.approverId!==actor.id)fail('Only the designated reviewer of the approved school policy can approve sources.',403,'FORBIDDEN');
        if(input.confirmed!==true||input.contentHash!==source.contentHash)fail('Open and review the exact source revision before approving it.',409,'SOURCE_CHANGED');
        if(source.status==='retired')fail('Create a revised draft instead of approving a retired source.');
        const approvalScope=policy.rules.communityProfiles?input.approvalScope:'legacy';
        if(!['legacy','english','israeli','both'].includes(approvalScope)||policy.rules.communityProfiles&&approvalScope==='legacy')fail('Choose which community frameworks this source is approved for.');
        const notes=text(input.notes,'source review notes',2000,5);this.db.exec('BEGIN IMMEDIATE');
        try{
            this.db.prepare("UPDATE knowledge_sources SET status='approved',approved_by=?,approved_at=?,approval_policy_id=?,approval_scope=? WHERE id=?").run(actor.id,now(),policy.id,approvalScope,source.id);
            if(source.replacesId)this.db.prepare("UPDATE knowledge_sources SET status='retired' WHERE id=?").run(source.replacesId);
            this.store.audit(actor,'source.approved',source.id,{contentHash:source.contentHash,policyVersion:policy.version,approvalScope,notes});this.db.exec('COMMIT');
        }catch(error){this.db.exec('ROLLBACK');throw error;}return this.get(actor,{id:source.id});
    }
    retire(actor,input){
        this.store.require(actor,['admin','teacher']);const policy=this.policy();if(actor.role!=='admin'&&policy.approverId!==actor.id)fail('Only an administrator or the designated reviewer can retire a source.',403,'FORBIDDEN');
        const source=this.get(actor,input);this.db.prepare("UPDATE knowledge_sources SET status='retired' WHERE id=?").run(source.id);this.store.audit(actor,'source.retired',source.id);return {retired:true};
    }
    search(actor,input={},family=null){
        const query=text(input.query,'source query',500),policy=this.policy();
        if(policy.status!=='approved')return [];
        const tokens=retrievalTerms(query);
        if(!tokens.length)return [];
        const match=tokens.map(token=>'"'+token.replaceAll('"','""')+'"').join(' OR ');
        const scope=family?" AND s.approval_scope IN (?,'both')":'';
        const rows=this.db.prepare(`SELECT c.id,c.start_offset,c.end_offset,c.body,s.id AS source_id,s.title,s.reference,s.author,s.edition,s.language,s.origin_url,s.content_hash,s.approval_scope,bm25(knowledge_fts,0,3,4,2,1) AS rank FROM knowledge_fts JOIN knowledge_chunks c ON c.id=knowledge_fts.chunk_id JOIN knowledge_sources s ON s.id=c.source_id WHERE knowledge_fts MATCH ? AND s.status='approved' AND s.approval_policy_id=?${scope} ORDER BY rank,c.id LIMIT 6`).all(match,policy.id,...(family?[family]:[]));
        this.store.audit(actor,'source.search',policy.id,{queryHash:sourceHash(query),sourceIds:[...new Set(rows.map(row=>row.source_id))]});
        return rows.map(row=>({citationId:row.id,sourceId:row.source_id,reference:row.reference,title:row.title,author:row.author,edition:row.edition,language:row.language,originUrl:row.origin_url,contentHash:row.content_hash,start:row.start_offset,end:row.end_offset,excerpt:row.body,policyVersion:policy.version,approvalScope:row.approval_scope}));
    }
    stillApproved(sources,policyId,family=null){
        return sources.every(source=>!!this.db.prepare("SELECT id FROM knowledge_sources WHERE id=? AND status='approved' AND approval_policy_id=? AND content_hash=?"+(family?" AND approval_scope IN (?,'both')":'')).get(source.sourceId,policyId,source.contentHash,...(family?[family]:[])));
    }
}
