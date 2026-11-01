// Test file for Shared Hebrew Tutor System
import { classifyHebrewQuery, HEBREW_RABBINIC_PERSONAS } from './src/constants/hebrewRabbis.js';

// Test classification system
console.log('Testing shared Hebrew tutor classification\n');

// Test cases
const testCases = [
    "האם מותר לי להשתמש בטלפון בשבת?",
    "איך ללמוד גמרא בצורה יעילה?",
    "איך אני יכול לשפר את המדות שלי?",
    "מה זה חסידות ואיך זה רלוונטי לחיי היומיום?",
    "איך לחנך את הילדים בדרך הנכונה?",
    "מה המסורת של יהודי ספרד?",
    "מה הפילוסופיה היהודית אומרת על המטרה של החיים?"
];

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: "${testCase}"`);
    const classification = classifyHebrewQuery(testCase);
    console.log(`  - Primary tutor: ${classification.primary}`);
    console.log(`  - Secondary influence: ${classification.secondary || 'None'}`);
    console.log(`  - Type: ${classification.type}`);
    console.log(`  - System: ${classification.system}`);
    
    const persona = HEBREW_RABBINIC_PERSONAS[classification.primary];
    console.log(`  - Selected: ${persona.name} (${persona.role})`);
    console.log(`  - Specialty: ${persona.specialty}`);
    console.log('');
});

console.log('Hebrew Rabbi System Test Completed Successfully!');
