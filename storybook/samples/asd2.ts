/**
 * Samples for the specifications and classifications added in api-smart-diff 2.x:
 * OpenAPI 3.1 (all six diff types, including `risky` and `deprecated`, plus a path rename),
 * AsyncAPI 3.0, GraphApi 1.0, a ProtoApi document, and inputs that api-smart-diff rejects.
 */

// ── OpenAPI 3.1: every classification and a rename ──

export const openApi31Before = {
	openapi: "3.1.0",
	info: { title: "Pet store", version: "1.0.0" },
	paths: {
		"/pets": {
			get: {
				summary: "List pets",
				operationId: "listPets",
				parameters: [
					{ name: "status", in: "query", schema: { type: "string", enum: ["available", "sold"] } },
					{ name: "limit", in: "query", schema: { type: "integer", maximum: 100 } },
				],
				responses: {
					"200": {
						description: "A list of pets",
						content: {
							"application/json": {
								schema: { type: "array", items: { $ref: "#/components/schemas/Pet" } },
							},
						},
					},
				},
			},
			delete: {
				operationId: "deleteAllPets",
				responses: { "204": { description: "Deleted" } },
			},
		},
		"/pets/{id}": {
			get: {
				operationId: "getPet",
				parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
				responses: {
					"200": {
						description: "A pet",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Pet" } } },
					},
				},
			},
		},
	},
	components: {
		schemas: {
			Pet: {
				type: "object",
				required: ["id", "name"],
				properties: {
					id: { type: "string" },
					name: { type: "string" },
					status: { type: "string", enum: ["available", "sold"] },
				},
			},
			Legacy: {
				type: "object",
				properties: { code: { type: "string" } },
			},
		},
	},
};

export const openApi31After = {
	openapi: "3.1.0",
	info: { title: "Pet store", version: "1.1.0" },
	paths: {
		"/pets": {
			get: {
				summary: "List all pets",
				operationId: "listPets",
				deprecated: true,
				parameters: [
					{ name: "status", in: "query", schema: { type: "string", enum: ["available", "sold"] } },
					{ name: "limit", in: "query", schema: { type: "integer", maximum: 50 } },
					{ name: "owner", in: "query", schema: { type: "string" } },
				],
				responses: {
					"200": {
						description: "A list of pets",
						content: {
							"application/json": {
								schema: { type: "array", items: { $ref: "#/components/schemas/Pet" } },
							},
						},
					},
				},
			},
		},
		"/pets/{petId}": {
			get: {
				operationId: "getPet",
				parameters: [{ name: "petId", in: "path", required: true, schema: { type: "string" } }],
				responses: {
					"200": {
						description: "A pet",
						content: { "application/json": { schema: { $ref: "#/components/schemas/Pet" } } },
					},
				},
			},
		},
	},
	components: {
		schemas: {
			Pet: {
				type: "object",
				required: ["id", "name"],
				properties: {
					id: { type: "string" },
					name: { type: "string" },
					status: { type: "string", enum: ["available", "pending", "sold"] },
				},
			},
			Legacy: {
				type: "object",
				properties: { code: { type: "integer" } },
			},
		},
	},
};

// ── AsyncAPI 3.0 ──

export const asyncApi30Before = {
	asyncapi: "3.0.0",
	info: { title: "Orders service", version: "1.0.0" },
	channels: {
		orderCancel: {
			address: "order/cancel",
			messages: { CancelOrder: { $ref: "#/components/messages/CancelOrder" } },
		},
		orderCreated: {
			address: "order/created",
			messages: { OrderCreated: { $ref: "#/components/messages/OrderCreated" } },
		},
	},
	operations: {
		cancelOrder: { action: "receive", channel: { $ref: "#/channels/orderCancel" } },
		onOrderCreated: { action: "send", channel: { $ref: "#/channels/orderCreated" } },
	},
	components: {
		messages: {
			CancelOrder: {
				payload: { type: "object", properties: { orderId: { type: "string" } } },
			},
			OrderCreated: {
				payload: {
					type: "object",
					required: ["id", "total"],
					properties: {
						id: { type: "string" },
						total: { type: "number" },
						status: { type: "string", enum: ["new", "paid"] },
					},
				},
			},
		},
	},
};

export const asyncApi30After = {
	asyncapi: "3.0.0",
	info: { title: "Orders service", version: "1.1.0", description: "Order lifecycle events" },
	channels: {
		orderCancel: {
			address: "order/cancel",
			messages: { CancelOrder: { $ref: "#/components/messages/CancelOrder" } },
		},
		orderCreated: {
			address: "order/created",
			messages: { OrderCreated: { $ref: "#/components/messages/OrderCreated" } },
		},
	},
	operations: {
		cancelOrder: { action: "receive", channel: { $ref: "#/channels/orderCancel" } },
		onOrderCreated: { action: "send", channel: { $ref: "#/channels/orderCreated" } },
	},
	components: {
		messages: {
			CancelOrder: {
				payload: {
					type: "object",
					required: ["requestedBy"],
					properties: { orderId: { type: "string" }, requestedBy: { type: "string" } },
				},
			},
			OrderCreated: {
				payload: {
					type: "object",
					required: ["id"],
					properties: {
						id: { type: "string" },
						status: { type: "string", enum: ["new", "paid", "shipped"] },
					},
				},
			},
		},
	},
};

// ── GraphApi 1.0 (GraphQL encoded by gqlapi) ──

export const graphApi10Before = {
	graphapi: "1.0",
	queryTypeName: "Query",
	queries: {
		books: {
			args: { first: { type: "Int" } },
			type: "list",
			items: { $ref: "#/components/objects/Book", nonNull: true },
			nonNull: true,
		},
		genre: { $ref: "#/components/enums/Genre" },
	},
	components: {
		objects: {
			Book: {
				title: "Book",
				type: "object",
				methods: {
					id: { type: "ID", nonNull: true },
					title: { type: "String" },
					isbn: { type: "String" },
				},
			},
		},
		enums: {
			Genre: { title: "Genre", type: "enum", values: { FICTION: {}, SCIENCE: {}, HISTORY: {} } },
		},
	},
};

export const graphApi10After = {
	graphapi: "1.0",
	queryTypeName: "Query",
	queries: {
		books: {
			description: "Books in the catalogue",
			args: {
				first: { type: "Int" },
				genre: { type: "String", nonNull: true },
				sort: { type: "String", default: "title" },
			},
			type: "list",
			items: { $ref: "#/components/objects/Book", nonNull: true },
			nonNull: true,
		},
		genre: { deprecation: { reason: "use genres" }, $ref: "#/components/enums/Genre" },
	},
	components: {
		objects: {
			Book: {
				title: "Book",
				type: "object",
				methods: {
					id: { type: "ID", nonNull: true },
					title: { type: "String" },
					year: { type: "Int" },
				},
			},
		},
		enums: {
			Genre: { title: "Genre", type: "enum", values: { FICTION: {}, SCIENCE: {}, POETRY: {} } },
		},
	},
};

// ── Inputs api-smart-diff 2.x rejects (UnsupportedSpecError) ──

export const swagger2Before = {
	swagger: "2.0",
	info: { title: "Legacy API", version: "1.0.0" },
	paths: { "/ping": { get: { responses: { "200": { description: "pong" } } } } },
};

export const swagger2After = {
	swagger: "2.0",
	info: { title: "Legacy API", version: "1.1.0" },
	paths: { "/ping": { get: { responses: { "200": { description: "pong!" } } } } },
};

// ── ProtoApi 0.1 (gRPC / Protocol Buffers, built from .proto sources with protoapi 0.1.0) ──
// before: OrderService { GetOrder, CancelOrder }; after: CancelOrder removed, ListOrders added,
// Order.priority int32 -> int64, Order.note added, Status.STATUS_SHIPPED added

export const protoApiBefore = {
	"protoapi": "0.1",
	"files": {
		"shop/v1/shop.proto": {
			"syntax": "proto3",
			"package": "shop.v1"
		}
	},
	"services": {
		"shop.v1.OrderService": {
			"title": "OrderService",
			"file": "shop/v1/shop.proto",
			"methods": {
				"GetOrder": {
					"request": {
						"schema": {
							"$ref": "#/components/messages/shop.v1.GetOrderRequest"
						}
					},
					"response": {
						"schema": {
							"$ref": "#/components/messages/shop.v1.Order"
						}
					}
				},
				"CancelOrder": {
					"request": {
						"schema": {
							"$ref": "#/components/messages/shop.v1.CancelOrderRequest"
						}
					},
					"response": {
						"schema": {
							"$ref": "#/components/messages/shop.v1.Order"
						}
					}
				}
			}
		}
	},
	"components": {
		"messages": {
			"shop.v1.GetOrderRequest": {
				"title": "GetOrderRequest",
				"file": "shop/v1/shop.proto",
				"type": "object",
				"properties": {
					"id": {
						"number": 1,
						"type": "string"
					}
				}
			},
			"shop.v1.CancelOrderRequest": {
				"title": "CancelOrderRequest",
				"file": "shop/v1/shop.proto",
				"type": "object",
				"properties": {
					"id": {
						"number": 1,
						"type": "string"
					}
				}
			},
			"shop.v1.Order": {
				"title": "Order",
				"file": "shop/v1/shop.proto",
				"type": "object",
				"properties": {
					"id": {
						"number": 1,
						"type": "string"
					},
					"priority": {
						"number": 2,
						"type": "int32"
					},
					"status": {
						"number": 3,
						"$ref": "#/components/enums/shop.v1.Status"
					}
				}
			}
		},
		"enums": {
			"shop.v1.Status": {
				"title": "Status",
				"file": "shop/v1/shop.proto",
				"type": "string",
				"values": {
					"STATUS_UNSPECIFIED": {
						"number": 0
					},
					"STATUS_NEW": {
						"number": 1
					},
					"STATUS_PAID": {
						"number": 2
					}
				}
			}
		}
	}
};

export const protoApiAfter = {
	"protoapi": "0.1",
	"files": {
		"shop/v1/shop.proto": {
			"syntax": "proto3",
			"package": "shop.v1"
		}
	},
	"services": {
		"shop.v1.OrderService": {
			"title": "OrderService",
			"file": "shop/v1/shop.proto",
			"methods": {
				"GetOrder": {
					"request": {
						"schema": {
							"$ref": "#/components/messages/shop.v1.GetOrderRequest"
						}
					},
					"response": {
						"schema": {
							"$ref": "#/components/messages/shop.v1.Order"
						}
					}
				},
				"ListOrders": {
					"request": {
						"schema": {
							"$ref": "#/components/messages/shop.v1.ListOrdersRequest"
						}
					},
					"response": {
						"schema": {
							"$ref": "#/components/messages/shop.v1.ListOrdersResponse"
						}
					}
				}
			}
		}
	},
	"components": {
		"messages": {
			"shop.v1.GetOrderRequest": {
				"title": "GetOrderRequest",
				"file": "shop/v1/shop.proto",
				"type": "object",
				"properties": {
					"id": {
						"number": 1,
						"type": "string"
					}
				}
			},
			"shop.v1.ListOrdersRequest": {
				"title": "ListOrdersRequest",
				"file": "shop/v1/shop.proto",
				"type": "object",
				"properties": {
					"page_size": {
						"number": 1,
						"type": "int32"
					}
				}
			},
			"shop.v1.ListOrdersResponse": {
				"title": "ListOrdersResponse",
				"file": "shop/v1/shop.proto",
				"type": "object",
				"properties": {
					"orders": {
						"number": 1,
						"type": "array",
						"items": {
							"$ref": "#/components/messages/shop.v1.Order"
						}
					}
				}
			},
			"shop.v1.Order": {
				"title": "Order",
				"file": "shop/v1/shop.proto",
				"type": "object",
				"properties": {
					"id": {
						"number": 1,
						"type": "string"
					},
					"priority": {
						"number": 2,
						"type": "int64"
					},
					"status": {
						"number": 3,
						"$ref": "#/components/enums/shop.v1.Status"
					},
					"note": {
						"deprecation": {},
						"number": 4,
						"type": "string"
					}
				}
			}
		},
		"enums": {
			"shop.v1.Status": {
				"title": "Status",
				"file": "shop/v1/shop.proto",
				"type": "string",
				"values": {
					"STATUS_UNSPECIFIED": {
						"number": 0
					},
					"STATUS_NEW": {
						"number": 1
					},
					"STATUS_PAID": {
						"number": 2
					},
					"STATUS_SHIPPED": {
						"number": 3
					}
				}
			}
		}
	}
};
