export default {
  asyncapi: "2.4.0",
  info: {
    title: "Gemini Market Data Websocket API",
    version: "1.0.0",
    contact: {
      name: "Gemini",
      url: "https://www.gemini.com/"
    },
    description: "Market data is a public API that streams all the market data on a given symbol.\n\nYou can quickly play with the API using [websocat](https://github.com/vi/websocat#installation) like this:\n```bash\nwebsocat wss://api.gemini.com/v1/marketdata/btcusd?heartbeat=true -S\n```\n",
  },
  externalDocs: {
    url: "https://docs.sandbox.gemini.com/websocket-api/#market-data"
  },
  servers: {
    public: {
      url: "wss://api.gemini.com/",
      protocol: "wss"
    }
  },
  channels: {
    "/v1/marketdata/{symbol}": {
      parameters: {
        symbol: {
          description: "Symbols are formatted as CCY1CCY2 where prices are in CCY2 and quantities are in CCY1.\n",
          schema: {
            type: "string",
            enum: [
              "btcusd",
              "ethbtc",
              "ethusd",
              "zecusd",
              "zecbtc",
              "zeceth",
              "zecbch",
              "zecltc",
              "bchusd",
              "bcheth",
              "ltcusd",
              "ltcbtc",
              "ltcbch",
              "batusd",
              "daiusd",
              "linkusd",
              "oxtusd",
              "batbtc",
              "oxtbtc",
              "bateth",
              "linketh",
              "oxteth",
              "ampusd",
              "paxgusd",
              "mkrusd",
              "zrxusd",
              "kncusd",
              "manausd",
              "storjusd",
              "balusd",
              "uniusd",
              "renusd",
              "umausd",
              "yfiusd",
              "aaveusd",
              "filusd",
              "btceur",
              "btcgbp",
              "etheur",
              "ethgbp",
              "btcsgd",
              "ethsgd",
              "sklusd",
              "grtusd",
              "bntusd",
              "1inchusd",
              "enjusd",
              "lrcusd",
              "sandusd",
              "cubeusd",
              "lptusd",
              "sushiusd"
            ]
          }
        }
      },
      bindings: {
        ws: {
          bindingVersion: "0.1.0",
          query: {
            type: "object",
            description: "The semantics of entry type filtering is:\n\nIf any entry type is specified as true or false, all of them must be explicitly flagged true to show up in the response\nIf no entry types filtering parameters are included in the url, then all entry types will appear in the response\n\nNOTE: top_of_book has no meaning and initial book events are empty when only trades is specified\n",
            properties: {
              heartbeat: {
                type: "boolean",
                default: false,
                description: "Optionally add this parameter and set to true to receive a heartbeat every 5 seconds"
              },
              bids: {
                type: "boolean",
                default: true,
                description: "Include bids in change events"
              },
              offers: {
                type: "boolean",
                default: true,
                description: "Include asks in change events"
              },
              trades: {
                type: "boolean",
                default: true,
                description: "Include trade events"
              }
            }
          }
        }
      },
      subscribe: {
        summary: "Receive market updates on a given symbol",
        message: {
          $ref: "#/components/messages/marketData"
        }
      }
    }
  },
  components: {
    messages: {
      marketData: {
        summary: "Message with marked data information.",
        description: "The initial response message will show the existing state of the order book.\n",
        payload: {
          $ref: "#/components/schemas/market"
        },
        examples: [
          {
            name: "updateMessage",
            summary: "Example of an update message that contains a change in price information.",
            payload: {
              type: "update",
              eventId: 36902233362,
              timestamp: 1619769673,
              timestampms: 1619769673527,
              socket_sequence: 661,
              events: [
                {
                  type: "change",
                  side: "bid",
                  price: "54350.40",
                  remaining: "0.002",
                  delta: "0.002",
                  reason: "place"
                }
              ]
            }
          }
        ]
      }
    },
    schemas: {
      market: {
        type: "object",
        oneOf: [
          {
            $ref: "#/components/schemas/heartbeat"
          },
          {
            $ref: "#/components/schemas/update"
          }
        ]
      },
      heartbeat: {
        allOf: [
          {
            properties: {
              type: {
                type: "string",
                const: "heartbeat"
              }
            },
            required: [
              "type"
            ]
          },
          {
            $ref: "#/components/schemas/default"
          }
        ]
      },
      update: {
        allOf: [
          {
            properties: {
              type: {
                type: "string",
                const: "update"
              },
              eventId: {
                type: "integer",
                description: "A monotonically increasing sequence number indicating when this change occurred. These numbers are persistent and consistent between market data connections."
              },
              events: {
                $ref: "#/components/schemas/events"
              },
              timestamp: {
                type: "string",
                format: "date-time",
                description: "The timestamp in seconds for this group of events (included for compatibility reasons). We recommend using the timestampms field instead."
              },
              timestampms: {
                type: "string",
                format: "time",
                description: "The timestamp in milliseconds for this group of events."
              }
            },
            required: [
              "type",
              "eventId",
              "events",
              "timestamp"
            ]
          },
          {
            $ref: "#/components/schemas/default"
          }
        ]
      },
      default: {
        type: "object",
        description: "This object is always part of the payload. In case of type=heartbeat, these are the only fields.",
        required: [
          "type",
          "socket_sequence"
        ],
        properties: {
          socket_sequence: {
            type: "integer",
            description: "zero-indexed monotonic increasing sequence number attached to each message sent - if there is a gap in this sequence, you have missed a message. If you choose to enable heartbeats, then heartbeat and update messages will share a single increasing sequence. See [Sequence Numbers](https://docs.sandbox.gemini.com/websocket-api/#sequence-numbers) for more information."
          }
        }
      },
      events: {
        type: "array",
        description: "Either a change to the order book, or the indication that a trade has occurred.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: {
              type: "string",
              enum: [
                "trade",
                "auction",
                "block_trade"
              ]
            },
            price: {
              type: "number",
              multipleOf: 1,
              description: "The price of this order book entry."
            },
            side: {
              type: "string",
              enum: [
                "bid",
                "side"
              ]
            },
            reason: {
              type: "string",
              enum: [
                "place",
                "trade",
                "initial"
              ],
              description: "Indicates why the change has occurred. initial is for the initial response message, which will show the entire existing state of the order book."
            },
            remaining: {
              type: "number",
              multipleOf: 1,
              description: "The quantity remaining at that price level after this change occurred. May be zero if all orders at this price level have been filled or canceled."
            }
          }
        }
      }
    }
  }
}
