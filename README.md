# Local Articles API

API Node.js local para demostrar la gestion de una API desde Anypoint Platform.

## Arranque local

```bash
./run.sh
```

Tambien puedes usar npm:

```bash
npm start
```

La API quedara disponible en:

- `http://localhost:8081/`
- `http://localhost:8081/health`
- `http://localhost:8081/api/v1/articles`
- `http://localhost:8081/openapi.json`

Si necesitas que el proceso escuche en todas las interfaces, por ejemplo para una prueba con un gateway en contenedor, puedes arrancarlo asi:

```bash
HOST=0.0.0.0 PORT=8081 npm start
```

## Pruebas rapidas

```bash
curl http://localhost:8081/health
curl http://localhost:8081/api/v1/articles
```

Crear un articulo:

```bash
curl -X POST http://localhost:8081/api/v1/articles \
  -H "content-type: application/json" \
  -H "x-correlation-id: demo-anypoint-local" \
  -d '{
    "title": "API Manager con una API Python local",
    "summary": "Articulo de ejemplo para mostrar como gobernar una API desplegada fuera de Mule.",
    "author": "Pascas",
    "published": true
  }'
```

## Uso desde Anypoint Platform

Para el articulo, el flujo recomendado es:

1. Levantar esta API en local en el puerto `8081`.
2. Publicar o importar la especificacion OpenAPI desde `http://localhost:8081/openapi.json`.
3. Crear la instancia gestionada en API Manager.
4. Proteger el acceso mediante un proxy o Flex Gateway.
5. Definir como upstream esta API local, por ejemplo `http://host.docker.internal:8081` si el gateway corre en Docker.
6. Aplicar una politica sencilla, como Client ID Enforcement o Rate Limiting.
7. Probar que las llamadas pasan por el gateway y que Anypoint registra el trafico.

Esta API incluye `x-correlation-id` en la respuesta para que sea mas facil seguir una peticion durante la demo.

## Notas

La API usa solo modulos nativos de Node.js para que se pueda ejecutar sin instalar dependencias. Esto es util en una demo local donde lo importante es enseñar la gestion desde Anypoint Platform, no el framework web.
