
import {
  REQUEST_STATUS,
  createAIRequest,
  createAIResponse
} from './ai-core-contracts.js';

import {
  createRequestContext,
  isValidRequestContext
} from './request-context.js';

export async function processAIRequest(input = {}) {
  let requestId = null;

  try {
    const request = createAIRequest(input);
    requestId = request.id;

    const context = createRequestContext({
      ...request,
      id: request.id
    });

    if (!isValidRequestContext(context)) {
      return createAIResponse({
        requestId,
        status: REQUEST_STATUS.ERROR,
        error: 'Konteksti i kërkesës nuk është i vlefshëm.'
      });
    }

    if (!context.query) {
      return createAIResponse({
        requestId,
        status: REQUEST_STATUS.ERROR,
        error: 'Shkruaj një pyetje për XSUS AI.'
      });
    }

    return createAIResponse({
      requestId,
      status: REQUEST_STATUS.SUCCESS,
      answer: '',
      source: 'xsus-ai-core',
      metadata: {
        language: context.language,
        moduleName: context.moduleName,
        ready: true,
        modelConnected: false
      }
    });
  } catch (error) {
    return createAIResponse({
      requestId,
      status: REQUEST_STATUS.ERROR,
      error:
        error instanceof Error
          ? error.message
          : 'Ndodhi një gabim gjatë përpunimit.'
    });
  }
}
