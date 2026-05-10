import http from "node:http";
import { randomUUID } from "node:crypto";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8081);

const articles = [
  {
    id: randomUUID(),
    title: "Gestion de APIs locales con Anypoint Platform",
    summary:
      "Ejemplo de API Node expuesta localmente para aplicar politicas desde API Manager.",
    author: "Pascas",
    published: true,
  },
];

const openApi = {
  openapi: "3.0.3",
  info: {
    title: "Local Articles API",
    description: "API local de ejemplo para ser gestionada desde Anypoint Platform.",
    version: "1.0.0",
  },
  servers: [{ url: `http://localhost:${PORT}` }],
  paths: {
    "/health": {
      get: {
        tags: ["monitoring"],
        summary: "Comprueba el estado de la API",
        responses: {
          200: {
            description: "API disponible",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Health" },
              },
            },
          },
        },
      },
    },
    "/api/v1/articles": {
      get: {
        tags: ["articles"],
        summary: "Lista articulos",
        responses: {
          200: {
            description: "Listado de articulos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Article" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["articles"],
        summary: "Crea un articulo",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ArticleCreate" },
            },
          },
        },
        responses: {
          201: {
            description: "Articulo creado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Article" },
              },
            },
          },
          422: {
            description: "Payload no valido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/v1/articles/{articleId}": {
      get: {
        tags: ["articles"],
        summary: "Obtiene un articulo por id",
        parameters: [
          {
            name: "articleId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Articulo encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Article" },
              },
            },
          },
          404: {
            description: "Articulo no encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Health: {
        type: "object",
        required: ["status", "service", "timestamp"],
        properties: {
          status: { type: "string", example: "ok" },
          service: { type: "string", example: "local-articles-api" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      Article: {
        type: "object",
        required: ["id", "title", "summary", "author", "published"],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          summary: { type: "string" },
          author: { type: "string" },
          published: { type: "boolean" },
        },
      },
      ArticleCreate: {
        type: "object",
        required: ["title", "summary", "author"],
        properties: {
          title: { type: "string", minLength: 3, maxLength: 120 },
          summary: { type: "string", minLength: 10, maxLength: 500 },
          author: { type: "string", minLength: 2, maxLength: 80 },
          published: { type: "boolean", default: false },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["status", "message", "timestamp"],
            properties: {
              status: { type: "integer" },
              message: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  },
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const correlationId = request.headers["x-correlation-id"] || randomUUID();

  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("x-correlation-id", correlationId);

  try {
    if (request.method === "GET" && url.pathname === "/") {
      return sendJson(response, 200, {
        name: "Local Articles API",
        version: "1.0.0",
        openapi: "/openapi.json",
        health: "/health",
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, {
        status: "ok",
        service: "local-articles-api",
        timestamp: new Date().toISOString(),
      });
    }

    if (request.method === "GET" && url.pathname === "/openapi.json") {
      return sendJson(response, 200, openApi);
    }

    if (request.method === "GET" && url.pathname === "/api/v1/articles") {
      return sendJson(response, 200, articles);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/articles") {
      const payload = await readJsonBody(request);
      const errors = validateArticle(payload);

      if (errors.length > 0) {
        return sendError(response, 422, errors.join(", "));
      }

      const article = {
        id: randomUUID(),
        title: payload.title.trim(),
        summary: payload.summary.trim(),
        author: payload.author.trim(),
        published: payload.published ?? false,
      };

      articles.push(article);
      return sendJson(response, 201, article);
    }

    const articleMatch = url.pathname.match(/^\/api\/v1\/articles\/([^/]+)$/);
    if (request.method === "GET" && articleMatch) {
      const article = articles.find((item) => item.id === articleMatch[1]);

      if (!article) {
        return sendError(response, 404, "Article not found");
      }

      return sendJson(response, 200, article);
    }

    return sendError(response, 404, "Endpoint not found");
  } catch (error) {
    if (error instanceof SyntaxError) {
      return sendError(response, 400, "Invalid JSON body");
    }

    console.error(error);
    return sendError(response, 500, "Unexpected server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Local Articles API listening on http://localhost:${PORT}`);
});

function sendJson(response, status, payload) {
  response.writeHead(status);
  response.end(JSON.stringify(payload));
}

function sendError(response, status, message) {
  sendJson(response, status, {
    error: {
      status,
      message,
      timestamp: new Date().toISOString(),
    },
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      resolve(body ? JSON.parse(body) : {});
    });

    request.on("error", reject);
  });
}

function validateArticle(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return ["body must be a JSON object"];
  }

  for (const field of ["title", "summary", "author"]) {
    if (typeof payload[field] !== "string" || payload[field].trim() === "") {
      errors.push(`${field} is required`);
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  if (payload.title.length < 3 || payload.title.length > 120) {
    errors.push("title must be between 3 and 120 characters");
  }

  if (payload.summary.length < 10 || payload.summary.length > 500) {
    errors.push("summary must be between 10 and 500 characters");
  }

  if (payload.author.length < 2 || payload.author.length > 80) {
    errors.push("author must be between 2 and 80 characters");
  }

  if ("published" in payload && typeof payload.published !== "boolean") {
    errors.push("published must be a boolean");
  }

  return errors;
}
