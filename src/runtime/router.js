
import { getService, hasService } from "./service-registry.js";

function createRouterError(error, fallbackMessage) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallbackMessage;
}

export async function routeAIRequest(request = {}) {
  // 1. Validate the request object.
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    return {
      success: false,
      error: "Kërkesa duhet të jetë një objekt i vlefshëm.",
      service: null,
    };
  }

  // 2. Resolve the requested service.
  const serviceName =
    typeof request.service === "string"
      ? request.service.trim()
      : "";

  if (!serviceName) {
    return {
      success: false,
      error: "Nuk është përcaktuar shërbimi.",
      service: null,
    };
  }

  // 3. Verify that the service is registered.
  try {
    if (!hasService(serviceName)) {
      return {
        success: false,
        error: `Shërbimi "${serviceName}" nuk është regjistruar.`,
        service: serviceName,
      };
    }

    // 4. Retrieve and validate the service.
    const service = getService(serviceName);

    if (typeof service !== "function") {
      return {
        success: false,
        error: `Shërbimi "${serviceName}" nuk është funksion i vlefshëm.`,
        service: serviceName,
      };
    }

    // 5. Execute the service and await its result.
    const data = await service(request);

    return {
      success: true,
      service: serviceName,
      data,
    };
  } catch (error) {
    // 6. Return a consistent error response.
    return {
      success: false,
      service: serviceName,
      error: createRouterError(
        error,
        "Gabim gjatë ekzekutimit të shërbimit."
      ),
    };
  }
}
