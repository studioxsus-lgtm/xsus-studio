
import { getService, hasService } from './service-registry.js';

export async function routeAIRequest(request = {}) {
  const serviceName =
    typeof request.service === 'string'
      ? request.service.trim()
      : '';

  if (!serviceName) {
    return {
      success: false,
      error: 'Nuk është përcaktuar shërbimi.',
      service: null
    };
  }

  if (!hasService(serviceName)) {
    return {
      success: false,
      error: `Shërbimi "${serviceName}" nuk është regjistruar.`,
      service: serviceName
    };
  }

  const service = getService(serviceName);

  try {
    const result = await service(request);

    return {
      success: true,
      service: serviceName,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      service: serviceName,
      error:
        error instanceof Error
          ? error.message
          : 'Gabim gjatë ekzekutimit të shërbimit.'
    };
  }
}
