// Compatibility exports for the retired canvas UI. The active workbench and
// school service share this same tutor router; named-rabbi impersonation is gone.
import {TUTOR_PROFILES,classifyTutor,tutorInstructions,useHebrewPresentation} from '../../shared/tutor-profile.mjs';
export const EDUCATIONAL_PERSONAS=TUTOR_PROFILES;
export const RABBINIC_PERSONAS=TUTOR_PROFILES;
export const classifyQuery=classifyTutor;
export const getEducationalInstructions=(level,classification)=>tutorInstructions(level,classification,'en');
export const shouldUseHebrewRabbi=useHebrewPresentation;
export default {EDUCATIONAL_PERSONAS,RABBINIC_PERSONAS,classifyQuery,getEducationalInstructions,shouldUseHebrewRabbi};
