export default {
  openapi: "3.0.1",
  info: {
    title: "Pet API",
    description: "A sample pet API",
    version: "1.0.0",
    "x-api-id": "pet-api-001",
  },
  paths: {
    "/pets": {
      get: {
        summary: "List all pets",
        operationId: "listPets",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", format: "int32" },
          },
          {
            name: "status",
            in: "query",
            description: "Filter by status",
            required: true,
            schema: {
              type: "string",
              enum: ["available", "pending", "sold"],
            },
          },
        ],
        responses: {
          200: {
            description: "A list of pets",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Pet" },
                },
              },
            },
          },
          400: { description: "Invalid parameters" },
        },
      },
      post: {
        summary: "Create a pet",
        operationId: "createPet",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Pet" },
            },
          },
        },
        responses: {
          201: { description: "Pet created" },
        },
      },
    },
    "/pets/{petId}": {
      get: {
        summary: "Get pet by ID",
        operationId: "getPetById",
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            schema: { type: "integer", format: "int64" },
          },
        ],
        responses: {
          200: {
            description: "A single pet",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Pet" },
              },
            },
          },
          404: { description: "Pet not found" },
        },
      },
      delete: {
        summary: "Delete a pet",
        operationId: "deletePet",
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            schema: { type: "integer", format: "int64" },
          },
        ],
        responses: {
          204: { description: "Pet deleted" },
          404: { description: "Pet not found" },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "integer", format: "int64" },
          name: { type: "string", example: "doggie" },
          photoUrl: { type: "string", format: "uri" },
          status: {
            type: "string",
            description: "Pet status in the store",
            enum: ["available", "pending", "sold"],
          },
          owner: { type: "string" },
        },
      },
      Error: {
        type: "object",
        properties: {
          code: { type: "integer" },
          message: { type: "string" },
        },
      },
    },
  },
}
