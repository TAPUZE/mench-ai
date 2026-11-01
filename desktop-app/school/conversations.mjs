import {storedMessages} from '../shared/chat-history.mjs';
import {fail,text,now} from './validation.mjs';

export function initializeConversations(db){
    db.exec("CREATE TABLE IF NOT EXISTS chat_histories(user_id TEXT NOT NULL REFERENCES users(id),project_id TEXT NOT NULL,messages TEXT NOT NULL,brief TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,project_id))");
    if(!db.prepare('PRAGMA table_info(chat_histories)').all().some(column=>column.name==='brief'))db.exec("ALTER TABLE chat_histories ADD COLUMN brief TEXT NOT NULL DEFAULT ''");
}
function owner(actor,input){
    if(input.ownerId!==actor.id)fail('The conversation account changed. Sign in again.',403,'FORBIDDEN');
    return text(input.projectId,'conversation project',120);
}
export function getConversation(store,actor,input){
    const project=owner(actor,input),row=store.db.prepare('SELECT messages,brief,revision FROM chat_histories WHERE user_id=? AND project_id=?').get(actor.id,project);
    return row?{messages:JSON.parse(row.messages),brief:row.brief,revision:row.revision}:{messages:[],brief:'',revision:0};
}
export function saveConversation(store,actor,input){
    const project=owner(actor,input);
    if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)fail('Invalid conversation revision.');
    const brief=input.brief===undefined?'':text(input.brief,'project brief',4000,0),messages=JSON.stringify(storedMessages(input.messages)),row=store.db.prepare('SELECT messages,brief,revision FROM chat_histories WHERE user_id=? AND project_id=?').get(actor.id,project);
    if(row?.messages===messages&&row.brief===brief)return {revision:row.revision};
    if((row?.revision||0)!==input.expectedRevision)fail('This conversation changed on another client. Reopen the project to load its latest history.',409,'CHAT_CONFLICT');
    const revision=input.expectedRevision+1;
    store.db.prepare('INSERT INTO chat_histories(user_id,project_id,messages,brief,revision,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,project_id) DO UPDATE SET messages=excluded.messages,brief=excluded.brief,revision=excluded.revision,updated_at=excluded.updated_at').run(actor.id,project,messages,brief,revision,now());
    return {revision};
}
