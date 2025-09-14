const axios = require('axios');
const logger = require('../utils/logger');

class LLMGateway {
  constructor() {
    this.apiKey = process.env.LLM_API_KEY;
    this.apiEndpoint = process.env.LLM_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.LLM_MODEL || 'gpt-4-turbo-preview';
    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.LLM_TEMPERATURE) || 0.7;
  }

  async generateResponse({ message, persona, context = {}, sessionId }) {
    try {
      const systemPrompt = this.buildSystemPrompt(persona);
      const userMessage = this.buildUserMessage(message, context);

      const requestBody = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      };

      logger.info('Sending request to LLM', {
        model: this.model,
        persona: persona.name,
        messageLength: userMessage.length,
        sessionId
      });

      const response = await axios.post(this.apiEndpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      const content = response.data.choices[0].message.content;
      const usage = response.data.usage;

      logger.info('LLM response received', {
        responseLength: content.length,
        tokensUsed: usage?.total_tokens,
        sessionId
      });

      return {
        content,
        sessionId,
        metadata: {
          model: this.model,
          tokensUsed: usage?.total_tokens,
          persona: persona.name
        }
      };

    } catch (error) {
      logger.error('LLM Gateway error', {
        error: error.message,
        status: error.response?.status,
        sessionId
      });

      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please check API configuration.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      } else {
        throw new Error('Failed to generate response. Please try again.');
      }
    }
  }

  buildSystemPrompt(persona) {
    const basePrompt = `You are ${persona.name}, ${persona.description}.

CRITICAL RULES:
1. ALWAYS use "אלוקים" when referring to God - never use any other name or term
2. Never use profanity, inappropriate language, or disrespectful terms
3. Maintain the highest standards of decorum befitting a ben Torah
4. Provide concise, clear explanations - avoid unnecessarily long responses
5. When discussing scientific topics, present them as theories while respecting Torah perspectives
6. If asked about topics that conflict with Torah values, redirect respectfully to more appropriate subjects

PERSONA CHARACTERISTICS:
${persona.characteristics}

COMMUNICATION STYLE:
${persona.communicationStyle}

AREAS OF EXPERTISE:
${persona.specialties.join(', ')}

Remember: You are operating in a kosher educational environment. Every word must reflect the values and decorum expected in such a setting.`;

    return basePrompt;
  }

  buildUserMessage(message, context) {
    let fullMessage = message;

    if (context.previousMessages && context.previousMessages.length > 0) {
      const recentHistory = context.previousMessages
        .slice(-3) // Last 3 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      fullMessage = `Previous context:\n${recentHistory}\n\nCurrent question: ${message}`;
    }

    if (context.subject) {
      fullMessage = `Subject: ${context.subject}\n\n${fullMessage}`;
    }

    return fullMessage;
  }

  async testConnection() {
    try {
      const response = await axios.post(this.apiEndpoint, {
        model: this.model,
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return { success: true, model: this.model };
    } catch (error) {
      logger.error('LLM connection test failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

module.exports = LLMGateway;