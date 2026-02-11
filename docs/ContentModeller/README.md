# Content Modeller CLI - Ticket Index

## Overview

CLI application to analyze and create Drupal content model configuration (entity types and fields).

## Documentation

| # | Document | Status | Description |
|---|---|---|---|
| 00 | [Ticket Template](00%20Ticket%20Template.md) | ✓ | How to write tickets |
| 01 | [Purpose](01%20Purpose.md) | ✓ | Project vision and requirements |
| 02 | [Research](02%20Research.md) | ✓ | Analysis of CivicTheme config |
| 03 | [Data Structures](03%20Data%20Structures.md) | ✓ | JSON schemas for all data |

## Implementation Tickets

### Core Infrastructure (10-19)
| # | Ticket | Depends On | Description |
|---|---|---|---|
| 10 | [Project Setup](10%20Project%20Setup.md) | - | Initialize project, dependencies, structure |

### Project Management (20-29)
| # | Ticket | Depends On | Description |
|---|---|---|---|
| 20 | [Project Management](20%20Project%20Management.md) | 10 | Create, load, save, list projects |

### Config Parsing (30-39)
| # | Ticket | Depends On | Description |
|---|---|---|---|
| 30 | [Config Parser](30%20Config%20Parser.md) | 10 | Parse YAML config files |
| 31 | [Sync Configuration](31%20Sync%20Configuration.md) | 20, 30 | Sync config → project entities |

### CLI Interface (40-49)
| # | Ticket | Depends On | Description |
|---|---|---|---|
| 40 | [CLI Interface](40%20CLI%20Interface.md) | 20 | Main menu system with inquirer |

### List Features (50-59)
| # | Ticket | Depends On | Description |
|---|---|---|---|
| 50 | [List Entity Types](50%20List%20Entity%20Types.md) | 31, 40 | Display all bundles |
| 51 | [List Fields](51%20List%20Fields.md) | 31, 40 | Display fields by entity/bundle |

### Create Features (60-69)
| # | Ticket | Depends On | Description |
|---|---|---|---|
| 60 | [Create Bundle](60%20Create%20Bundle.md) | 40, 30 | Generate bundle YAML |
| 61 | [Create Field](61%20Create%20Field.md) | 60, 31 | Generate field YAML |

## Dependency Graph

```
10 Project Setup
 ├── 20 Project Management
 │    └── 40 CLI Interface
 │         ├── 50 List Entity Types ←── 31
 │         ├── 51 List Fields ←── 31
 │         └── 60 Create Bundle
 │              └── 61 Create Field ←── 31
 └── 30 Config Parser
      └── 31 Sync Configuration ←── 20
```

## Architecture for Testability

Code is structured to separate pure functions from I/O for easy unit testing:

```
src/
  cli/           # I/O: inquirer prompts, console output
  commands/      # Orchestration: calls pure functions + I/O
  parsers/       # PURE: YAML string → object
  generators/    # PURE: object → YAML string
  utils/         # PURE: validation, formatting, slug generation
  io/            # I/O: file system read/write
```

**Pure functions** receive data and return data (no side effects):
```javascript
// Testable: input → output
parseNodeType(yamlString) → { id, label, description }
generateNodeType({ label, machineName }) → yamlString
generateSlug("My Project") → "my-project"
```

**I/O functions** are isolated and mocked in tests:
```javascript
// Mocked in tests
readYamlFile(path) → object
writeYamlFile(path, data) → void
```

## Suggested Implementation Order

1. **10 Project Setup** - Get the project scaffolded
2. **20 Project Management** - Basic project CRUD
3. **30 Config Parser** - YAML parsing logic
4. **31 Sync Configuration** - Wire parsing to projects
5. **40 CLI Interface** - Menu system (can stub commands)
6. **50 List Entity Types** - First display feature
7. **51 List Fields** - Second display feature
8. **60 Create Bundle** - First generation feature
9. **61 Create Field** - Second generation feature

## How to Use These Tickets

When asking Claude to implement:

```
Implement ticket 10 from docs/ContentModeller/10 Project Setup.md
```

Or for multiple tickets:

```
Implement tickets 10 and 20 from docs/ContentModeller/
```

Claude will read the ticket, understand dependencies, and implement according to the acceptance criteria.
