---
updatedAt: 2026-07-21T18:17:23.000Z
agentTools:
  projectIndex: https://docs.foursquare.com/fsq-developers-places/llms.txt
---

# Get Place Tips

Retrieve tips for a FSQ Place using the fsq_place_id.

# OpenAPI definition

```json
{
  "openapi": "3.0.1",
  "info": {
    "title": "Places API",
    "description": "Places APIs",
    "version": "20250617"
  },
  "servers": [
    {
      "url": "https://places-api.foursquare.com"
    }
  ],
  "security": [
    {
      "ServiceKeyBearerTokenAuth": []
    }
  ],
  "paths": {
    "/places/{fsq_place_id}/tips": {
      "get": {
        "tags": [
          "Search & Data Endpoints"
        ],
        "summary": "Get Place Tips",
        "description": "Retrieve tips for a FSQ Place using the fsq_place_id.",
        "operationId": "place-tips",
        "parameters": [
          {
            "name": "fsq_place_id",
            "in": "path",
            "description": "A unique string identifier for a FSQ Place (formerly known as Venue ID). E.g., Foursquare HQ's fsq_place_id = 5a187743ccad6b307315e6fe",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "description": "The specified number of tips per page. Returns 10 tips by default, up to a maximum number of 50.",
            "required": false,
            "schema": {
              "maximum": 50,
              "minimum": 1,
              "type": "integer",
              "format": "int32"
            }
          },
          {
            "name": "fields",
            "in": "query",
            "description": "Indicate which fields to return in the response, separated by commas. Supported fields are:<ul><li> fsq_tip_id - The ID of the tip to be returned.</li><li> created_at - The timestamp indicating when the tip was created; UNIX timestamp in seconds since Epoch.</li><li> text - The text of the returned tip.</li><li> lang - The language of the returned tip.</li><li> url - The URL associated with the returned tip.</li><li> agree_count - The count of users who have agreed with the returned tip.</li><li> disagree_count - The count of users who have disagreed with the returned tip.</li><li> photo - The ID of the photo asociated with the returned tip.</li></ul>Default fields if this param is omitted are \"fsq_tip_id\", \"created_at\", and \"text\".",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "sort",
            "in": "query",
            "description": "Specifies the order in which results are listed. Possible values are:<ul><li>popular (default) - sorts results based on their popularity among Foursquare users</li><li>newest - sorts results from most recently added to least recently added</li></ul>",
            "required": false,
            "schema": {
              "type": "string",
              "enum": [
                "POPULAR",
                "NEWEST"
              ]
            }
          },
          {
            "name": "X-Places-Api-Version",
            "in": "header",
            "description": "The version of the API to use.",
            "required": true,
            "schema": {
              "type": "string",
              "default": "2025-06-17",
              "enum": [
                "2025-06-17"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "fsq_tip_id": {
                        "type": "string"
                      },
                      "created_at": {
                        "type": "string",
                        "format": "date-time"
                      },
                      "text": {
                        "type": "string"
                      },
                      "url": {
                        "type": "string"
                      },
                      "photo": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "created_at": {
                            "type": "string",
                            "format": "date-time"
                          },
                          "prefix": {
                            "type": "string"
                          },
                          "suffix": {
                            "type": "string"
                          },
                          "width": {
                            "type": "integer",
                            "format": "int32"
                          },
                          "height": {
                            "type": "integer",
                            "format": "int32"
                          },
                          "classifications": {
                            "type": "array",
                            "properties": {
                              "traversable_again": {
                                "type": "boolean"
                              }
                            },
                            "items": {
                              "type": "string"
                            }
                          },
                          "tip": {
                            "type": "object",
                            "properties": {
                              "id": {
                                "type": "string"
                              },
                              "created_at": {
                                "type": "string",
                                "format": "date-time"
                              },
                              "text": {
                                "type": "string"
                              },
                              "url": {
                                "type": "string"
                              },
                              "photo": {},
                              "lang": {
                                "type": "string"
                              },
                              "agree_count": {
                                "type": "integer",
                                "format": "int32"
                              },
                              "disagree_count": {
                                "type": "integer",
                                "format": "int32"
                              }
                            }
                          }
                        },
                        "description": "Category icon. Build a complete image URL by concatenating `prefix`, a pixel size, and `suffix`, as in `{prefix}88{suffix}`. Available sizes are 32, 44, 64, 88, 120, and 512."
                      },
                      "lang": {
                        "type": "string"
                      },
                      "agree_count": {
                        "type": "integer",
                        "format": "int32"
                      },
                      "disagree_count": {
                        "type": "integer",
                        "format": "int32"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "invalid place specified"
          }
        },
        "security": [
          {
            "ServiceKeyBearerTokenAuth": []
          }
        ]
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ServiceKeyBearerTokenAuth": {
        "type": "http",
        "description": "Bearer Token to authorize requests.",
        "scheme": "bearer"
      }
    }
  }
}
```