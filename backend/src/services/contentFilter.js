const logger = require('../utils/logger');

class ContentFilter {
  constructor() {
    // Forbidden words and phrases that violate Torah values
    this.forbiddenKeywords = [
      // Profanity and inappropriate language
      'damn', 'hell', 'crap', 'stupid', 'idiot', 'moron',
      // Inappropriate religious references
      'jesus', 'christ', 'lord', 'god almighty', 'oh my god', 'omg',
      // Adult content indicators
      'sexy', 'porn', 'adult', 'explicit', 'nsfw',
      // Violence and inappropriate content
      'kill', 'murder', 'violence', 'weapon', 'drug',
      // Gambling and inappropriate activities
      'casino', 'gamble', 'bet', 'lottery'
    ];

    // Gray area topics that need redirection
    this.grayAreaTopics = [
      'celebrity', 'hollywood', 'movie star', 'actor', 'actress',
      'sports figure', 'athlete', 'musician', 'singer',
      'social media', 'instagram', 'tiktok', 'facebook',
      'dating', 'relationship', 'romance', 'love',
      'politics', 'election', 'government', 'democrat', 'republican'
    ];

    // Approved divine names in Hebrew
    this.approvedDivineNames = ['אלוקים', 'השם', 'הקדוש ברוך הוא'];
    
    // Inappropriate divine references
    this.inappropriateDivineReferences = [
      'god', 'lord', 'jesus', 'christ', 'allah', 'buddha',
      'the almighty', 'heavenly father', 'creator'
    ];

    // Academic subjects that are always allowed
    this.academicSubjects = [
      'mathematics', 'math', 'algebra', 'geometry', 'calculus',
      'science', 'physics', 'chemistry', 'biology',
      'english', 'literature', 'writing', 'grammar',
      'coding', 'programming', 'computer science', 'javascript',
      'html', 'css', 'python', 'java'
    ];
  }

  async validateInput(message) {
    const normalizedMessage = message.toLowerCase().trim();

    // Check for forbidden keywords
    const forbiddenMatch = this.forbiddenKeywords.find(keyword => 
      normalizedMessage.includes(keyword.toLowerCase())
    );

    if (forbiddenMatch) {
      logger.warn('Input blocked - forbidden keyword', { 
        keyword: forbiddenMatch,
        messagePreview: message.substring(0, 50)
      });
      
      return {
        isValid: false,
        reason: 'Your message contains content that is not appropriate for this learning environment. Please rephrase your question in a respectful manner.',
        category: 'forbidden_content'
      };
    }

    // Check for inappropriate divine references
    const inappropriateDivine = this.inappropriateDivineReferences.find(term =>
      normalizedMessage.includes(term.toLowerCase())
    );

    if (inappropriateDivine) {
      logger.warn('Input blocked - inappropriate divine reference', {
        term: inappropriateDivine,
        messagePreview: message.substring(0, 50)
      });

      return {
        isValid: false,
        reason: 'Please use appropriate terminology when referring to divine matters. In this environment, we use "אלוקים" when referring to God.',
        category: 'inappropriate_divine_reference'
      };
    }

    // Check for excessively long messages
    if (message.length > 4000) {
      return {
        isValid: false,
        reason: 'Your message is too long. Please break it into smaller, more focused questions.',
        category: 'message_too_long'
      };
    }

    // Check for spam patterns
    if (this.isSpamPattern(message)) {
      return {
        isValid: false,
        reason: 'Please avoid repetitive or spam-like content.',
        category: 'spam_pattern'
      };
    }

    return {
      isValid: true,
      category: 'approved'
    };
  }

  async validateOutput(content, persona) {
    const normalizedContent = content.toLowerCase();

    // Check for forbidden keywords in output
    const forbiddenMatch = this.forbiddenKeywords.find(keyword => 
      normalizedContent.includes(keyword.toLowerCase())
    );

    if (forbiddenMatch) {
      logger.warn('Output blocked - forbidden keyword', { 
        keyword: forbiddenMatch,
        persona: persona.name
      });
      
      return {
        isValid: false,
        reason: 'Generated response contains inappropriate content',
        category: 'forbidden_content'
      };
    }

    // Check for proper use of divine names
    const improperDivineReference = this.inappropriateDivineReferences.find(term =>
      normalizedContent.includes(term.toLowerCase())
    );

    if (improperDivineReference) {
      // Try to fix common divine name issues
      let correctedContent = content;
      this.inappropriateDivineReferences.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        correctedContent = correctedContent.replace(regex, 'אלוקים');
      });

      logger.info('Output corrected - divine name replaced', {
        original: improperDivineReference,
        persona: persona.name
      });

      return {
        isValid: true,
        content: correctedContent,
        category: 'corrected_divine_name'
      };
    }

    // Check response length (should be concise)
    if (content.length > 3000) {
      logger.warn('Output warning - response too long', {
        length: content.length,
        persona: persona.name
      });
    }

    // Validate persona-specific requirements
    if (persona.mode === 'religious') {
      if (!this.validateReligiousResponse(content)) {
        return {
          isValid: false,
          reason: 'Religious response does not meet content standards',
          category: 'religious_validation_failed'
        };
      }
    }

    return {
      isValid: true,
      content: content,
      category: 'approved'
    };
  }

  isGrayAreaTopic(message) {
    const normalizedMessage = message.toLowerCase();
    
    return this.grayAreaTopics.some(topic => 
      normalizedMessage.includes(topic.toLowerCase())
    );
  }

  isAcademicTopic(message) {
    const normalizedMessage = message.toLowerCase();
    
    return this.academicSubjects.some(subject => 
      normalizedMessage.includes(subject.toLowerCase())
    );
  }

  isSpamPattern(message) {
    // Check for repeated characters
    const repeatedChars = /(.)\1{10,}/;
    if (repeatedChars.test(message)) return true;

    // Check for repeated words
    const words = message.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 20 && uniqueWords.size / words.length < 0.3) return true;

    // Check for excessive punctuation
    const punctuationRatio = (message.match(/[!?.,;:]/g) || []).length / message.length;
    if (punctuationRatio > 0.3) return true;

    return false;
  }

  validateReligiousResponse(content) {
    // Ensure religious responses maintain appropriate tone and content
    const lowerContent = content.toLowerCase();
    
    // Should not contain casual or inappropriate language
    const inappropriateForReligious = [
      'cool', 'awesome', 'dude', 'guys', 'whatever',
      'basically', 'like', 'you know', 'kinda', 'sorta'
    ];

    const hasInappropriate = inappropriateForReligious.some(term => 
      lowerContent.includes(term)
    );

    if (hasInappropriate) {
      logger.warn('Religious response contains inappropriate casual language');
      return false;
    }

    return true;
  }

  getFilterStatistics() {
    return {
      forbiddenKeywordsCount: this.forbiddenKeywords.length,
      grayAreaTopicsCount: this.grayAreaTopics.length,
      academicSubjectsCount: this.academicSubjects.length,
      approvedDivineNames: this.approvedDivineNames
    };
  }
}

module.exports = ContentFilter;