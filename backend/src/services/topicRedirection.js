const ContentFilter = require('./contentFilter');
const logger = require('../utils/logger');

class TopicRedirection {
  constructor() {
    this.contentFilter = new ContentFilter();
    this.redirectionTemplates = this.createRedirectionTemplates();
  }

  createRedirectionTemplates() {
    return {
      celebrity: {
        examples: [
          {
            input: "Tell me about Michael Jordan",
            output: "While the focus here is on academic studies, the dedication required to excel in any field, such as professional sports, is certainly something we can learn from. The Sages teach us, 'chochma bagoyim taamin'—that we can recognize and appreciate wisdom wherever it is found, and the discipline of a top athlete is a powerful example of that principle."
          },
          {
            input: "What do you think about Taylor Swift?",
            output: "Rather than focusing on specific entertainers, let's consider the broader question of creativity and artistic expression. The ability to create and inspire others is a gift from אלוקים, and we can appreciate the dedication that goes into mastering any craft while ensuring our focus remains on pursuits that align with Torah values."
          }
        ],
        template: "While the focus here is on academic studies, the {quality} required to excel in any field is certainly something we can learn from. The Sages teach us, 'chochma bagoyim taamin'—that we can recognize wisdom wherever it is found."
      },
      
      entertainment: {
        examples: [
          {
            input: "What did you think of the latest Hollywood movie?",
            output: "It's interesting how modern films often explore timeless themes of struggle, morality, and purpose. For a deeper and more foundational perspective on these very same human questions, one can always turn to the narratives in the Torah, which provide the most profound insights into the human condition."
          },
          {
            input: "Can you recommend some TV shows?",
            output: "While entertainment has its place, perhaps we could explore some educational content that both entertains and enriches. There are many documentaries about science, history, and nature that reveal the wonders of אלוקים's creation, or we could discuss great works of literature that explore meaningful themes."
          }
        ],
        template: "It's interesting how modern {medium} often explores timeless themes of {themes}. For a deeper and more foundational perspective on these human questions, one can turn to the wisdom found in Torah and Jewish literature."
      },

      social_media: {
        examples: [
          {
            input: "What's your opinion on Instagram?",
            output: "Social media platforms present both opportunities and challenges. While they can connect people and share knowledge, they also require careful consideration of how we spend our time and what influences we allow into our lives. The principle of 'hishtadlus b'derech hateva' teaches us to use tools responsibly while maintaining our focus on meaningful pursuits."
          },
          {
            input: "How do I get more followers on TikTok?",
            output: "The desire to connect with others and share ideas is natural, but perhaps we could channel that energy into building meaningful relationships and sharing knowledge that truly benefits others. Consider how you might use your talents to teach, inspire, or help others in ways that create lasting value."
          }
        ],
        template: "While {platform} can be a tool for connection, it's important to consider how we spend our time and what influences we allow into our lives. Perhaps we could focus on {alternative} instead."
      },

      politics: {
        examples: [
          {
            input: "What do you think about the election?",
            output: "Political engagement is certainly a responsibility of citizens, but in this educational environment, let's focus on the academic skills that help us understand and analyze complex issues. Critical thinking, research skills, and clear communication are tools that serve us well in any civic engagement."
          },
          {
            input: "Is the president doing a good job?",
            output: "Rather than focusing on specific political figures, let's consider the broader principles of leadership and governance that we can study academically. History, civics, and ethics all provide frameworks for understanding how societies function and what makes for effective leadership."
          }
        ],
        template: "Political engagement is important, but in this educational setting, let's focus on the academic skills and principles that help us understand complex issues with wisdom and clarity."
      },

      relationships: {
        examples: [
          {
            input: "How do I ask someone out on a date?",
            output: "Building meaningful relationships is indeed important, and there are wonderful Torah perspectives on this topic. However, in this academic setting, perhaps we could focus on developing the character traits and skills that make us better people overall—communication, empathy, responsibility, and kindness—which serve us well in all relationships."
          },
          {
            input: "What should I do about my crush?",
            output: "The desire for meaningful connections is natural and important. While specific relationship advice might be better discussed with family, mentors, or community leaders who know you personally, we can certainly explore topics like effective communication, emotional intelligence, and character development that benefit all relationships."
          }
        ],
        template: "Building meaningful relationships is important, and there are wonderful perspectives on this in Jewish wisdom. However, in this academic setting, let's focus on developing {skills} that serve us well in all relationships."
      }
    };
  }

  async analyzeAndRedirect(message) {
    const normalizedMessage = message.toLowerCase();

    // Check if this is a gray area topic that needs redirection
    if (!this.contentFilter.isGrayAreaTopic(message)) {
      return {
        needsRedirection: false,
        originalMessage: message
      };
    }

    // Determine the type of redirection needed
    const redirectionType = this.determineRedirectionType(normalizedMessage);
    
    if (!redirectionType) {
      return {
        needsRedirection: false,
        originalMessage: message
      };
    }

    // Generate appropriate redirection
    const redirectedMessage = this.generateRedirection(message, redirectionType);

    logger.info('Topic redirection applied', {
      originalTopic: this.extractMainTopic(message),
      redirectionType,
      messageLength: message.length
    });

    return {
      needsRedirection: true,
      redirectionType,
      detectedTopic: this.extractMainTopic(message),
      originalMessage: message,
      redirectedMessage
    };
  }

  determineRedirectionType(normalizedMessage) {
    // Celebrity/Sports figures
    const celebrityKeywords = [
      'celebrity', 'actor', 'actress', 'singer', 'musician', 'artist',
      'athlete', 'player', 'star', 'famous person', 'michael jordan',
      'taylor swift', 'lebron james', 'tom brady'
    ];
    
    if (celebrityKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return 'celebrity';
    }

    // Entertainment
    const entertainmentKeywords = [
      'movie', 'film', 'tv show', 'series', 'netflix', 'hollywood',
      'disney', 'marvel', 'entertainment', 'watch', 'cinema'
    ];
    
    if (entertainmentKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return 'entertainment';
    }

    // Social Media
    const socialMediaKeywords = [
      'instagram', 'tiktok', 'facebook', 'twitter', 'snapchat',
      'social media', 'followers', 'likes', 'viral', 'post'
    ];
    
    if (socialMediaKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return 'social_media';
    }

    // Politics
    const politicalKeywords = [
      'politics', 'election', 'president', 'government', 'democrat',
      'republican', 'congress', 'senate', 'voting', 'campaign'
    ];
    
    if (politicalKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return 'politics';
    }

    // Relationships
    const relationshipKeywords = [
      'dating', 'relationship', 'boyfriend', 'girlfriend', 'crush',
      'romance', 'love', 'ask out', 'date'
    ];
    
    if (relationshipKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return 'relationships';
    }

    return null;
  }

  generateRedirection(originalMessage, redirectionType) {
    const template = this.redirectionTemplates[redirectionType];
    
    if (!template) {
      return this.generateGenericRedirection(originalMessage);
    }

    // Try to use few-shot learning by finding the most similar example
    const similarExample = this.findSimilarExample(originalMessage, template.examples);
    
    if (similarExample) {
      return this.adaptExampleToMessage(originalMessage, similarExample, redirectionType);
    }

    // Fall back to template-based generation
    return this.generateFromTemplate(originalMessage, template, redirectionType);
  }

  findSimilarExample(message, examples) {
    const normalizedMessage = message.toLowerCase();
    
    for (const example of examples) {
      const exampleWords = example.input.toLowerCase().split(' ');
      const messageWords = normalizedMessage.split(' ');
      
      // Simple word overlap calculation
      const overlap = exampleWords.filter(word => messageWords.includes(word)).length;
      const similarity = overlap / Math.max(exampleWords.length, messageWords.length);
      
      if (similarity > 0.3) {
        return example;
      }
    }
    
    return null;
  }

  adaptExampleToMessage(originalMessage, example, redirectionType) {
    // Use the example as a base and adapt it to the specific message
    let adaptation = example.output;
    
    // For celebrity/entertainment, try to extract the specific quality being discussed
    if (redirectionType === 'celebrity') {
      if (originalMessage.toLowerCase().includes('sport')) {
        adaptation = adaptation.replace('discipline', 'athletic excellence');
      } else if (originalMessage.toLowerCase().includes('music')) {
        adaptation = adaptation.replace('discipline', 'artistic dedication');
      }
    }
    
    return adaptation;
  }

  generateFromTemplate(originalMessage, template, redirectionType) {
    let response = template.template;
    
    // Simple template variable substitution
    switch (redirectionType) {
      case 'celebrity':
        response = response.replace('{quality}', 'dedication and excellence');
        break;
      case 'entertainment':
        response = response.replace('{medium}', 'entertainment media');
        response = response.replace('{themes}', 'morality, purpose, and human nature');
        break;
      case 'social_media':
        const platform = this.extractPlatform(originalMessage) || 'social media';
        response = response.replace('{platform}', platform);
        response = response.replace('{alternative}', 'meaningful learning and personal growth');
        break;
      case 'relationships':
        response = response.replace('{skills}', 'communication, empathy, and character traits');
        break;
    }
    
    return response;
  }

  generateGenericRedirection(originalMessage) {
    return `While that's an interesting topic, in this educational environment, let's focus on academic subjects and learning that align with our values. Is there a specific academic question I can help you with today?`;
  }

  extractMainTopic(message) {
    const words = message.toLowerCase().split(' ');
    
    // Simple topic extraction - look for key nouns
    const topicWords = words.filter(word => 
      word.length > 3 && 
      !['what', 'how', 'when', 'where', 'why', 'about', 'think'].includes(word)
    );
    
    return topicWords.slice(0, 2).join(' ') || 'general topic';
  }

  extractPlatform(message) {
    const platforms = ['instagram', 'tiktok', 'facebook', 'twitter', 'snapchat', 'youtube'];
    const lowerMessage = message.toLowerCase();
    
    return platforms.find(platform => lowerMessage.includes(platform));
  }

  getRedirectionStatistics() {
    return {
      availableRedirectionTypes: Object.keys(this.redirectionTemplates),
      totalExamples: Object.values(this.redirectionTemplates)
        .reduce((sum, template) => sum + template.examples.length, 0)
    };
  }

  // Method to add new redirection examples (for future enhancement)
  addRedirectionExample(type, input, output) {
    if (this.redirectionTemplates[type]) {
      this.redirectionTemplates[type].examples.push({ input, output });
      logger.info('New redirection example added', { type, input: input.substring(0, 50) });
      return true;
    }
    return false;
  }
}

module.exports = TopicRedirection;