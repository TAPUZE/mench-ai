export const AVAILABLE_MODELS = {
    'gemini-3.8-flash': {
        name: 'Gemini 3.8 Flash',
        description: 'General coding and learning assistant',
        endpoint: 'gemini-3.8-flash',
        isDefault: true
    },
    'gemini-3.5-flash-lite': {
        name: 'Gemini 3.5 Flash-Lite',
        description: 'Lightweight text assistance',
        endpoint: 'gemini-3.5-flash-lite'
    }
};

export const getDefaultModel = () => {
    return Object.keys(AVAILABLE_MODELS).find(key => AVAILABLE_MODELS[key].isDefault) || 'gemini-3.8-flash';
};
