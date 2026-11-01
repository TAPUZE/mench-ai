import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Test-only provider. This file is not distributed with the school service.
// It exercises the real gateway/HTTP/policy/client/UI path without a live key
// and cannot establish actual school approval or live model suitability.
const directory=process.env.MENCH_UI_DIRECTORY,resources=process.env.MENCH_UI_RESOURCES;
if(!directory||!resources)process.exit(1);
const {createSchoolServer}=await import(pathToFileURL(path.join(resources,'school','gateway.mjs')).href);
const proposal={format:'mench.changes.v1',summary:'Fixture reviewed project changes',changes:[{path:'index.html',content:'<h1>Reviewed fixture heading</h1>'},{path:'src/lesson.js',content:'export const lesson = 1;\n'}]};
const runtime=await createSchoolServer({filename:path.join(directory,'school-fixture','school.sqlite'),bootstrapToken:'isolated-ui-setup-token',apiKey:'test-fixture-provider-only',generate:async input=>{
    if(input.prepared.route.requiresSources){const source=JSON.parse(input.prepared.blocks.find(block=>block.kind==='approved_source_passages').text)[0];return {content:'A fixture loop repeats instructions. [[source:'+source.citationId+']]'};}
    return {content:'Fixture provider response; no live model was called.\n```mench-changes\n'+JSON.stringify(proposal)+'\n```'};
}});
runtime.server.listen(0,'127.0.0.1',()=>console.log('MENCH_UI_SCHOOL_URL:http://127.0.0.1:'+runtime.server.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>runtime.close().then(()=>process.exit(0)));
