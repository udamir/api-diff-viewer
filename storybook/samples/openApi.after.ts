export default {
  openapi: "3.0.1",
  info: {
    title: "Pet API",
    description: "A modern pet API for managing your pet store inventory. Provides endpoints for listing, searching, creating, and deleting pets along with their status tracking and breed classification. Supports pagination, filtering by status, and sorting capabilities for large datasets.",  // annotation: replace
    version: "2.0.0",                                        // annotation: replace
    "x-api-id": "pet-api-v2",                                // unclassified: replace
  },
  paths: {
    "/pets": {
      get: {
        summary: "List and search pets",                      // annotation: replace
        operationId: "listPets",
        parameters: [
          {
            name: "pageSize",                                 // rename from "limit"
            in: "query",
            required: false,
            schema: { type: "integer", format: "int32" },
          },
          {
            name: "status",
            in: "query",
            description: "Filter by pet status",              // annotation: replace
            required: false,                                  // non-breaking: relaxed
            schema: {
              type: "string",
              enum: ["available", "pending", "sold", "adopted"], // non-breaking: enum add
            },
          },
          {                                                   // non-breaking: add param
            name: "sortBy",
            in: "query",
            required: false,
            schema: { type: "string" },
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
          200: { description: "Pet created" },
        },
      },
    },
    "/pets/{petIds}": {                                       // breaking: path rename
      get: {
        summary: "Get pets by ID",                            // annotation: replace
        operationId: "getPetById",
        parameters: [
          {
            name: "petIds",                                   // breaking: param rename
            in: "path",
            required: true,
            schema: { type: "string" },                       // breaking: type change
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
      // delete endpoint removed                              // breaking: remove
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        required: ["name", "status"],                         // breaking: added required
        properties: {
          id: { type: "integer", format: "int64" },
          name: { type: "string", example: "buddy" },        // annotation: example
          imageUrl: { type: "string", format: "uri" },        // rename from photoUrl
          status: {
            type: "string",
            description: "Current pet status",                // annotation: replace
            enum: ["available", "pending", "sold", "adopted"],// non-breaking: enum add
          },
          ownerName: { type: "string" },                      // rename from owner
          breed: { type: "string" },                          // non-breaking: add prop
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
