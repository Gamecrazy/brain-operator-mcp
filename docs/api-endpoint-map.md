# TheBrain API Endpoint Map

Primary source: [TheBrain API documentation](https://api.bra.in/index.html).

The adapter keeps MCP tool contracts stable even if TheBrain request body details change.

| Feature | Method | Path |
|---|---:|---|
| list brains | GET | `/brains` |
| get brain | GET | `/brains/{brainId}` |
| get stats | GET | `/brains/{brainId}/statistics` |
| get modifications | GET | `/brains/{brainId}/modifications` |
| search thoughts | GET | `/search/{brainId}` |
| create thought | POST | `/thoughts/{brainId}` |
| get thought | GET | `/thoughts/{brainId}/{thoughtId}` |
| update thought | PATCH | `/thoughts/{brainId}/{thoughtId}` |
| get thought graph | GET | `/thoughts/{brainId}/{thoughtId}/graph` |
| get types | GET | `/thoughts/{brainId}/types` |
| get tags | GET | `/thoughts/{brainId}/tags` |
| create link | POST | `/links/{brainId}` |
| get link | GET | `/links/{brainId}/{linkId}` |
| update link | PATCH | `/links/{brainId}/{linkId}` |
| get note markdown | GET | `/notes/{brainId}/{thoughtId}` |
| get note html | GET | `/notes/{brainId}/{thoughtId}/html` |
| get note text | GET | `/notes/{brainId}/{thoughtId}/text` |
| update note | POST | `/notes/{brainId}/{thoughtId}/update` |
| append note | POST | `/notes/{brainId}/{thoughtId}/append` |
| add URL attachment | POST | `/attachments/{brainId}/{thoughtId}/url` |
| add file attachment | POST | `/attachments/{brainId}/{thoughtId}/file` |
| attachment metadata | GET | `/attachments/{brainId}/{attachmentId}/metadata` |
| attachment content | GET | `/attachments/{brainId}/{attachmentId}/file-content` |
| list thought attachments | GET | `/thoughts/{brainId}/{thoughtId}/attachments` |

The current implementation uses the v0.1 subset required by `docs/tool-contract.md`.
