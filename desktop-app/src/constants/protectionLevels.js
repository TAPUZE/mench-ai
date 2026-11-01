// Protection levels configuration for Mench AI
// Each level defines different content restrictions and filtering rules
// Focus on blocking inappropriate content while preserving educational access

export const PROTECTION_LEVELS = {
    DEVELOPER: {
        id: 'developer',
        name: 'Developer Mode',
        nameHe: 'מצב מפתח',
        description: 'UNRESTRICTED ACCESS - No content filtering, no blocks, no restrictions. For development only.',
        descriptionHe: 'גישה ללא הגבלות - ללא סינון תוכן, ללא חסימות, ללא הגבלות. למפתחים בלבד.',
        icon: '🚀',
        devOnly: true, // Special flag for dev-only mode
        settings: {
            blockImages: false,
            blockSports: false,
            blockEntertainment: false,
            blockProfanity: false,
            blockInappropriate: false,
            allowEducational: true,
            allowAcademic: true,
            allowDvarTorah: true,
            strictReligiousFilter: false,
            confidenceThreshold: 0.0, // No confidence threshold
            allowEverything: true, // Special flag
            bypassAllFilters: true // Special flag
        }
    },
    MAXIMUM: {
        id: 'maximum',
        name: 'Maximum Protection',
        nameHe: 'הגנה מרבית',
        description: 'Strict religious focus - blocks image generation, entertainment content, and sports content',
        descriptionHe: 'מיקוד דתי מחמיר - חוסם יצירת תמונות, תוכן בידור וספורט',
        icon: '🔒',
        settings: {
            blockImages: true,
            blockSports: true,
            blockEntertainment: true,
            blockProfanity: true,
            blockInappropriate: true,
            allowEducational: true, // Always allow educational content
            allowAcademic: true,    // Always allow academic content  
            allowDvarTorah: true,
            strictReligiousFilter: true,
            confidenceThreshold: 0.95
        }
    },
    STANDARD: {
        id: 'standard',
        name: 'Standard Protection',
        nameHe: 'הגנה רגילה',
        description: 'Balanced filtering - allows educational content, blocks inappropriate content',
        descriptionHe: 'סינון מאוזן - מתיר תוכן חינוכי, חוסם תוכן בלתי מתאים',
        icon: '🛡️',
        settings: {
            blockImages: false,
            blockSports: false,     // Allow sports from educational perspective
            blockEntertainment: false, // Allow entertainment from educational perspective
            blockProfanity: true,
            blockInappropriate: true,
            allowEducational: true,
            allowAcademic: true,
            allowDvarTorah: true,
            strictReligiousFilter: true,
            confidenceThreshold: 0.95
        }
    },
    OPEN: {
        id: 'open',
        name: 'Open Protection',
        nameHe: 'הגנה פתוחה',
        description: 'Minimal filtering - full educational access with Orthodox Jewish perspective on all topics',
        descriptionHe: 'סינון מינימלי - גישה חינוכית מלאה עם נקודת מבט יהודית אורתודוקסית לכל הנושאים',
        icon: '🔓',
        settings: {
            blockImages: false,
            blockSports: false,
            blockEntertainment: false,
            blockProfanity: true,
            blockInappropriate: true,
            allowEducational: true,
            allowAcademic: true,
            allowDvarTorah: true,
            strictReligiousFilter: true,
            confidenceThreshold: 0.95
        }
    }
};

export const getProtectionLevel = (levelId) => {
    return PROTECTION_LEVELS[levelId.toUpperCase()] || PROTECTION_LEVELS.STANDARD;
};

export const getDefaultProtectionLevel = () => {
    return PROTECTION_LEVELS.OPEN; // Default to Open for full educational access
};

// Content filtering rules based on protection level
export const getContentFilters = (protectionLevel) => {
    const level = typeof protectionLevel === 'string' 
        ? getProtectionLevel(protectionLevel) 
        : protectionLevel;
    
    return {
        // Image generation filter
        shouldBlockImageGeneration: level.settings.blockImages,
        
        // Sports content filter (only for non-educational sports)
        shouldBlockSports: level.settings.blockSports,
        
        // Entertainment content filter (only for non-educational entertainment)
        shouldBlockEntertainment: level.settings.blockEntertainment,
        
        // Always allow educational and academic content
        allowEducational: level.settings.allowEducational,
        allowAcademic: level.settings.allowAcademic,
        
        // Profanity filter
        shouldBlockProfanity: level.settings.blockProfanity,
        
        // General inappropriate content filter
        shouldBlockInappropriate: level.settings.blockInappropriate,
        
        // Allow Dvar Torah alternatives
        allowDvarTorah: level.settings.allowDvarTorah,
        
        // Strict religious filtering
        strictReligiousFilter: level.settings.strictReligiousFilter,
        
        // Confidence threshold for responses
        confidenceThreshold: level.settings.confidenceThreshold
    };
};

// Enhanced safety instructions based on protection level
export const getSafetyInstructions = (protectionLevel, _subject = 'general') => {
    const level = typeof protectionLevel === 'string' 
        ? getProtectionLevel(protectionLevel) 
        : protectionLevel;
    
    const filters = getContentFilters(level);
    
    let baseInstructions = `
EDUCATIONAL EXCELLENCE FROM ORTHODOX JEWISH PERSPECTIVE - PROTECTION LEVEL: ${level.name.toUpperCase()}

You are an Orthodox Jewish AI assistant designed to provide world-class education across ALL academic fields while maintaining Torah values. Your role is to be like an Orthodox Jewish professor at a top university.

CORE EDUCATIONAL MISSION:
1. ACADEMIC EXCELLENCE: Provide expert-level knowledge in ALL STEM fields, humanities, social sciences, arts, history, literature, languages, medicine, law, business, technology, and more
2. TORAH PERSPECTIVE: Frame all knowledge within an Orthodox Jewish worldview - seeing all wisdom as emanating from השם
3. COMPREHENSIVE ACCESS: NEVER block legitimate educational content - users must have access to all fields of study
4. RELIGIOUS INTEGRATION: Show how each field of study can serve השם and benefit humanity

EDUCATIONAL APPROACH:
- Respond as a specialist professor in the relevant field (math professor for math, scientist for science, etc.)
- Provide complete, accurate, professional-level information
- Include Orthodox Jewish perspective when naturally relevant
- Acknowledge that all knowledge comes from divine wisdom
- Show practical applications that align with Torah values
- Encourage learning as a form of serving השם

WHAT TO ALWAYS ALLOW (Educational Content):
✅ ALL STEM subjects (mathematics, physics, chemistry, biology, computer science, engineering, etc.)
✅ Medical and health sciences (anatomy, physiology, medicine, psychology, etc.)
✅ Social sciences (psychology, sociology, economics, political science, etc.)
✅ Arts and literature (analysis from appropriate perspective)
✅ History and geography (all periods and regions)
✅ Languages and linguistics (all languages)
✅ Philosophy and ethics (from Jewish perspective)
✅ Business and economics
✅ Technology and innovation
✅ Sports science and physical education (health benefits, teamwork, discipline)
✅ Cultural studies (understanding different societies for kiruv and interaction)
✅ Current events and news (analyzed from Torah perspective)
✅ PROGRAMMING AND WEB DEVELOPMENT (HTML, CSS, JavaScript, React, Node.js, databases, etc.)
✅ WEBSITE BUILDING (landing pages, portfolios, business sites, educational platforms, etc.)
✅ SOFTWARE DEVELOPMENT (applications, tools, systems, algorithms, data structures, etc.)
✅ TECHNICAL TUTORIALS (coding guides, development tutorials, technical documentation, etc.)
✅ CREATIVE PROJECTS (digital art, interactive media, educational games, etc.)
✅ PROFESSIONAL DEVELOPMENT (career guidance, project management, business tools, etc.)

RELIGIOUS CONTENT STANDARDS:
- Use appropriate Hebrew terms respectfully (ה', השם, הקב"ה)
- For Torah questions: Respond as Orthodox rabbi with proper sources
- For halachic questions: Provide guidance with "consult your local rabbi" disclaimer
- Show how secular knowledge serves Torah purposes`;

    // Add level-specific restrictions only for truly inappropriate content
    if (filters.shouldBlockImageGeneration) {
        baseInstructions += `\n\nIMAGE GENERATION: This protection level blocks image generation. Suggest text-based alternatives.`;
    }
    
    if (filters.shouldBlockSports && level.id === 'maximum') {
        baseInstructions += `\n\nSPORTS CONTENT: At this protection level, redirect sports questions to Torah values like discipline, teamwork, and health.`;
    }
    
    if (filters.shouldBlockEntertainment && level.id === 'maximum') {
        baseInstructions += `\n\nENTERTAINMENT CONTENT: At this protection level, redirect entertainment questions to Jewish culture and spiritual growth.`;
    }
    
    baseInstructions += `\n\nSTRICTLY PROHIBITED CONTENT (Never Allow):
❌ Profanity, vulgar language, or crude expressions
❌ Sexual content or inappropriate material  
❌ Violence, hatred, or harmful content
❌ Content that contradicts core Torah values
❌ Inappropriate use of sacred Hebrew names
❌ Anti-religious or anti-Semitic content

CONFIDENCE AND ACCURACY:
- Only respond when 95%+ confident in accuracy
- If uncertain: "I need more information to provide an accurate answer that meets Orthodox Jewish academic standards"
- Always maintain scholarly rigor and honesty
- Cite sources when appropriate

REMEMBER: Your goal is to make learning accessible and excellent while maintaining Torah perspective. NEVER block legitimate educational content - instead, enhance it with Jewish wisdom and perspective.`;

    return baseInstructions;
};

// Helper function to detect educational context
const isEducationalContent = (content) => {
    const contentLower = content.toLowerCase();
    
    // Educational indicators
    const educationalKeywords = [
        'explain', 'teach', 'learn', 'study', 'understand', 'how', 'why', 'what',
        'calculate', 'solve', 'analyze', 'research', 'investigate', 'explore',
        'science', 'math', 'history', 'literature', 'physics', 'chemistry', 'biology',
        'medicine', 'health', 'psychology', 'economics', 'engineering', 'technology',
        'computer', 'programming', 'language', 'grammar', 'writing', 'reading',
        'thesis', 'paper', 'essay', 'homework', 'assignment', 'project', 'experiment',
        'theory', 'concept', 'principle', 'definition', 'formula', 'equation',
        'university', 'college', 'school', 'academic', 'scholarly', 'educational',
        'tutorial', 'guide', 'instruction', 'lesson', 'course', 'curriculum',
        // Web development and technical keywords
        'website', 'web', 'html', 'css', 'javascript', 'js', 'react', 'node',
        'code', 'coding', 'develop', 'development', 'build', 'create', 'make',
        'design', 'app', 'application', 'software', 'frontend', 'backend',
        'database', 'api', 'framework', 'library', 'responsive', 'bootstrap',
        'jquery', 'angular', 'vue', 'typescript', 'python', 'java', 'php',
        'mysql', 'mongodb', 'firebase', 'github', 'git', 'deployment',
        'hosting', 'domain', 'server', 'cloud', 'aws', 'azure', 'heroku',
        'form', 'button', 'navigation', 'menu', 'layout', 'template',
        'component', 'function', 'class', 'variable', 'array', 'object',
        'algorithm', 'data structure', 'debug', 'test', 'unit test',
        'portfolio', 'landing page', 'dashboard', 'admin panel', 'cms',
        'ecommerce', 'blog', 'forum', 'chat', 'social media', 'platform'
    ];
    
    // Question patterns that indicate learning intent
    const questionPatterns = [
        /how (do|does|can|to)/,
        /why (is|are|do|does)/,
        /what (is|are|does|means)/,
        /when (is|are|do|does)/,
        /where (is|are|do|does)/,
        /explain/,
        /help me (with|understand)/,
        /teach me/,
        /show me/,
        // Web development patterns
        /build (a|an|me)/,
        /create (a|an|me)/,
        /make (a|an|me)/,
        /design (a|an|me)/,
        /generate (a|an|me)/,
        /develop (a|an|me)/,
        /code (a|an|me)/,
        /write (a|an|me)/,
        /implement (a|an|me)/,
        /add (a|an|me)/
    ];
    
    return educationalKeywords.some(keyword => contentLower.includes(keyword)) ||
           questionPatterns.some(pattern => pattern.test(contentLower));
};

// Helper function to detect truly inappropriate content
const isTrulyInappropriate = (content) => {
    const contentLower = content.toLowerCase();
    
    // Truly inappropriate content patterns
    const inappropriatePatterns = [
        // Sexual content
        /\b(sex|sexual|porn|nude|naked|erotic)\b/,
        // Violence
        /\b(kill|murder|violence|weapon|bomb|terrorist)\b/,
        // Profanity (basic detection)
        /\b(damn|hell|shit|fuck|bitch|ass)\b/,
        // Drugs and illegal activities
        /\b(drug|cocaine|marijuana|illegal|crime)\b/
    ];
    
    return inappropriatePatterns.some(pattern => pattern.test(contentLower));
};

// Improved content blocking function that prioritizes education
export const shouldBlockContent = (content, protectionLevel) => {
    // DEVELOPER MODE: Bypass all filtering
    if (protectionLevel.id === 'developer' || protectionLevel.settings?.bypassAllFilters) {
        return { blocked: false, developerMode: true };
    }
    
    const filters = getContentFilters(protectionLevel);
    const contentLower = content.toLowerCase();
    
    // NEVER block educational content regardless of protection level
    if (isEducationalContent(content)) {
        return { blocked: false };
    }
    
    // Always block truly inappropriate content (except in developer mode)
    if (isTrulyInappropriate(content)) {
        return {
            blocked: true,
            reason: 'This content contains inappropriate material',
            alternative: 'I can help you with educational topics, Torah wisdom, or other constructive subjects.'
        };
    }
    
    // Check for image generation requests (only block if setting is enabled)
    if (filters.shouldBlockImageGeneration) {
        const imageKeywords = ['generate image', 'create image', 'make image', 'draw me'];
        if (imageKeywords.some(keyword => contentLower.includes(keyword))) {
            return {
                blocked: true,
                reason: 'Image generation is disabled at this protection level',
                alternative: 'I can help you with text-based content or provide guidance on visual concepts from a Torah perspective.'
            };
        }
    }
    
    // For Maximum Protection level only - provide Orthodox perspective instead of blocking
    if (protectionLevel.id === 'maximum') {
        // Sports content gets Orthodox perspective rather than blocking
        if (filters.shouldBlockSports && !isEducationalContent(content)) {

            // Remove blocking - let it pass through to get Orthodox perspective
            // Sports questions will be handled by Orthodox Rabbi persona with Torah values
        }
        
        // Entertainment content gets Orthodox perspective rather than blocking
        if (filters.shouldBlockEntertainment && !isEducationalContent(content)) {

            // Remove blocking - let it pass through to get Orthodox perspective
            // Entertainment questions will be handled by Orthodox Rabbi persona with Jewish values
        }
    }
    
    // Default: Allow content
    return { blocked: false };
};

export default {
    PROTECTION_LEVELS,
    getProtectionLevel,
    getDefaultProtectionLevel,
    getContentFilters,
    getSafetyInstructions,
    shouldBlockContent
};
