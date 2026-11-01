// Compatibility exports for the retired canvas UI. Hebrew changes presentation,
// not the identity, routing rules, or school-selected religious authorities.
import {TUTOR_PROFILES,classifyTutor,tutorInstructions,hasHebrewText,useHebrewPresentation} from '../../shared/tutor-profile.mjs';
export const HEBREW_RABBINIC_PERSONAS=TUTOR_PROFILES;
export const classifyHebrewQuery=classifyTutor;
export const getHebrewRabbiInstructions=(level,classification)=>tutorInstructions(level,classification,'he');
export const isHebrewText=hasHebrewText;
export const shouldUseHebrewRabbi=useHebrewPresentation;
export default {HEBREW_RABBINIC_PERSONAS,classifyHebrewQuery,getHebrewRabbiInstructions,isHebrewText,shouldUseHebrewRabbi};
