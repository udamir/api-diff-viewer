export default {
  $id: "https://example.com/arrays.schema.json",
  $schema: "https://json-schema.org/draft/2020-12/schema",
  description: "A representation of a person, company, organization, or place",
  type: "object",
  properties: {
    vegetables: {
      type: "array",
      description: "List of vagetables",
      items: { $ref: "#/$defs/veggie" },
    },
  },
  $defs: {
    veggie: {
      type: "object",
      required: ["veggieName"],
      properties: {
        veggieName: {
          type: "string",
          description: "The name of the vegetable.",
        },
      },
    },
  },
}
