import {routeQuestion,buildChatContext,personalRules} from './chat-context.mjs';

export const TUTOR_PROFILES=Object.fromEntries(Object.entries({coding:'Coding tutor',math:'Math tutor',science:'Science tutor',language:'Language tutor',history:'History tutor',torah:'Torah study guide',source_lookup:'Source research guide',halachic:'Human rabbinic referral',support:'Supportive learning companion',general:'Learning tutor'}).map(([id,name])=>[id,{name,role:'AI learning assistant',specialty:id}]));
export function classifyTutor(question){
    const route=routeQuestion(question);return {...route,primary:route.intent,secondary:null,type:route.intent,system:'tutor',question};
}
export function tutorInstructions(level,classification,language){
    return buildChatContext({messages:[{role:'user',content:classification.question||'Help me learn.'}],language,files:[]},{policy:{rules:personalRules(typeof level==='string'?level:level?.id)}}).system;
}
export const hasHebrewText=value=>/[\u0590-\u05ff]/u.test(value);
export const useHebrewPresentation=(language,input)=>language==='he'||hasHebrewText(input);
