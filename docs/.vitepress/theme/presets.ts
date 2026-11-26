/**
 * Presets of the live demo: one pair of documents per specification, taken from the Storybook samples, plus a Swagger
 * 2.0 pair that api-smart-diff rejects (to show the `error` event).
 */
import asyncApi2After from "../../../storybook/samples/asyncApi.after";
import asyncApi2Before from "../../../storybook/samples/asyncApi.before";
import {
	asyncApi30After,
	asyncApi30Before,
	graphApi10After,
	graphApi10Before,
	openApi31After,
	openApi31Before,
	protoApiAfter,
	protoApiBefore,
	swagger2After,
	swagger2Before,
} from "../../../storybook/samples/asd2";
import jsonSchemaAfter from "../../../storybook/samples/jsonSchema.after";
import jsonSchemaBefore from "../../../storybook/samples/jsonSchema.before";
import openApi30After from "../../../storybook/samples/openApi.after";
import openApi30Before from "../../../storybook/samples/openApi.before";

export interface Preset {
	id: string;
	title: string;
	before: object;
	after: object;
}

export const PRESETS: Preset[] = [
	{
		id: "openapi-3.1",
		title: "OpenAPI 3.1: all six change types and a rename",
		before: openApi31Before,
		after: openApi31After,
	},
	{ id: "openapi-3.0", title: "OpenAPI 3.0: pet API", before: openApi30Before, after: openApi30After },
	{ id: "asyncapi-3.0", title: "AsyncAPI 3.0: orders service", before: asyncApi30Before, after: asyncApi30After },
	{ id: "asyncapi-2", title: "AsyncAPI 2.4: market data websocket", before: asyncApi2Before, after: asyncApi2After },
	{ id: "graphapi-1.0", title: "GraphApi 1.0 (GraphQL)", before: graphApi10Before, after: graphApi10After },
	{ id: "protoapi", title: "ProtoApi (gRPC / Protocol Buffers)", before: protoApiBefore, after: protoApiAfter },
	{ id: "jsonschema", title: "JSON Schema 2020-12", before: jsonSchemaBefore, after: jsonSchemaAfter },
	{ id: "swagger-2.0", title: "Swagger 2.0 (unsupported: error event)", before: swagger2Before, after: swagger2After },
];
