// Fix missing dependency in chat.js
const express = require('express');
const Joi = require('joi');
const LLMGateway = require('../services/llmGateway');
const ContentFilter = require('../services/contentFilter');
const PersonaRouter = require('../services/personaRouter');
const TopicRedirection = require('../services/topicRedirection');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schema
const chatRequestSchema = Joi.object({
  message: Joi.string().trim().min(1).max(4000).required(),
  sessionId: Joi.string().uuid().optional(),
  context: Joi.object().optional()
});

// Main chat endpoint
router.post('/', async (req, res) => {
  try {
    // Validate request
    const { error, value } = chatRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const { message, sessionId, context = {} } = value;

    logger.info('Processing chat request', {
      messageLength: message.length,
      sessionId,
      hasContext: Object.keys(context).length > 0
    });

    // Step 1: Input validation and filtering
    const inputFilter = new ContentFilter();
    const inputValidation = await inputFilter.validateInput(message);

    if (!inputValidation.isValid) {
      return res.status(400).json({
        error: 'Content not allowed',
        message: inputValidation.reason,
        type: 'input_filtered'
      });
    }

    // Step 2: Topic analysis and redirection if needed
    const topicRedirection = new TopicRedirection();
    const topicAnalysis = await topicRedirection.analyzeAndRedirect(message);

    let processedMessage = message;
    let shouldRedirect = false;

    if (topicAnalysis.needsRedirection) {
      processedMessage = topicAnalysis.redirectedMessage;
      shouldRedirect = true;
      logger.info('Topic redirected', {
        originalTopic: topicAnalysis.detectedTopic,
        redirectionType: topicAnalysis.redirectionType
      });
    }

    // Step 3: Persona routing
    const personaRouter = new PersonaRouter();
    const selectedPersona = await personaRouter.selectPersona(processedMessage, context);

    logger.info('Persona selected', {
      persona: selectedPersona.name,
      mode: selectedPersona.mode,
      confidence: selectedPersona.confidence
    });

    // Step 4: Generate response through LLM Gateway
    const llmGateway = new LLMGateway();
    const response = await llmGateway.generateResponse({
      message: processedMessage,
      persona: selectedPersona,
      context,
      sessionId
    });

    // Step 5: Output validation and filtering
    const outputValidation = await inputFilter.validateOutput(response.content, selectedPersona);

    if (!outputValidation.isValid) {
      logger.warn('Output filtered', {
        reason: outputValidation.reason,
        persona: selectedPersona.name
      });
      
      return res.status(500).json({
        error: 'Response validation failed',
        message: 'Generated response did not meet content standards. Please try rephrasing your question.',
        type: 'output_filtered'
      });
    }

    // Step 6: Return successful response
    res.json({
      response: outputValidation.content,
      metadata: {
        persona: selectedPersona.name,
        mode: selectedPersona.mode,
        wasRedirected: shouldRedirect,
        redirectionType: shouldRedirect ? topicAnalysis.redirectionType : null,
        sessionId: response.sessionId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Chat request failed', {
      error: error.message,
      stack: error.stack,
      message: req.body.message?.substring(0, 100)
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process your request. Please try again.',
      type: 'system_error'
    });
  }
});

// Get available personas
router.get('/personas', (req, res) => {
  const personaRouter = new PersonaRouter();
  const personas = personaRouter.getAvailablePersonas();
  
  res.json({
    personas: personas.map(p => ({
      name: p.name,
      mode: p.mode,
      description: p.description,
      specialties: p.specialties
    }))
  });
});

// Session management endpoints
router.post('/session', (req, res) => {
  const sessionId = require('crypto').randomUUID();
  res.json({
    sessionId,
    created: new Date().toISOString()
  });
});

router.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  // In a real implementation, this would clear session data
  logger.info('Session cleared', { sessionId });
  res.json({ success: true });
});

module.exports = router;