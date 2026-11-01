import {geminiGenerate,assistantInput} from '../school/provider.mjs';
import {buildChatContext,personalRules,sourceUnavailable,validateCitations} from '../shared/chat-context.mjs';

export async function personalGenerate(input,generate=geminiGenerate){
    const context=assistantInput(input),policy={rules:personalRules(input.protection)},prepared=buildChatContext(context,{policy});
    if(prepared.route.humanReview||prepared.route.requiresSources)return {content:sourceUnavailable(prepared.route,context.language),context:prepared.meta,citations:[]};
    const result=await generate({...context,apiKey:input.apiKey,model:/^[a-z0-9][a-z0-9.-]{1,100}$/.test(input.model)?input.model:'gemini-3.8-flash',signal:AbortSignal.any([input.signal||new AbortController().signal,AbortSignal.timeout(45000)]),policy,prepared});
    if(result.blocked)return {content:'The provider safety filter blocked this response. Ask your teacher for help with this question.',blocked:true,context:prepared.meta,citations:[]};
    return {...result,context:prepared.meta,citations:validateCitations(result.content)};
}
