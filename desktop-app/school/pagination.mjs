import {digest,fail,text} from './validation.mjs';

// Keyset pages are stable when newer records arrive. The cursor is tied to
// the actor, resource and filters; authorization is still applied by each SQL query.
export function pageQuery(db,{from,columns,where='1',params=[],selectParams=[],scope,input={},map=value=>value}){
    const limit=input.limit??25;if(!Number.isInteger(limit)||limit<1||limit>50)fail('Choose a page size between 1 and 50.');
    const fingerprint=digest(scope).slice(0,24);let before=Number.MAX_SAFE_INTEGER;
    if(input.cursor!=null){
        if(typeof input.cursor!=='string'||input.cursor.length>160||!/^[A-Za-z0-9_-]+$/.test(input.cursor))fail('Invalid page cursor.');
        const parts=Buffer.from(input.cursor,'base64url').toString('utf8').split(':');
        if(parts.length!==3||parts[0]!=='v1'||parts[2]!==fingerprint||!/^\d+$/.test(parts[1]))fail('This page cursor does not match the current search.');
        before=Number(parts[1]);if(!Number.isSafeInteger(before)||before<1)fail('Invalid page cursor.');
    }
    const rows=db.prepare(`SELECT ${columns},t.rowid AS _cursor FROM ${from} WHERE (${where}) AND t.rowid < ? ORDER BY t.rowid DESC LIMIT ?`).all(...selectParams,...params,before,limit+1);
    const items=[];let size=0,last;
    for(const {_cursor,...row} of rows.slice(0,limit)){
        const item=map(row),bytes=Buffer.byteLength(JSON.stringify(item))+1;
        if(bytes>400000)fail('A school history record exceeds the response limit. Ask the service administrator to inspect it.',413,'RECORD_TOO_LARGE');
        if(size+bytes>400000)break;items.push(item);size+=bytes;last=_cursor;
    }
    return {items,nextCursor:rows.length>items.length?Buffer.from(`v1:${last}:${fingerprint}`).toString('base64url'):null,total:db.prepare(`SELECT COUNT(*) AS count FROM ${from} WHERE ${where}`).get(...params).count};
}
export const pageSearch=input=>text(input.search??'','search',120,0).toLowerCase();
