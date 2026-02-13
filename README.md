# Drupal Content Modeller

A CLI tool for managing Drupal content models. Analyze existing Drupal configuration, create entity bundles and fields, and generate documentation for your content architecture.

## Features

- **Analyze Configuration**: Sync and parse existing Drupal YAML configuration files
- **Create Bundles**: Generate configuration for content types, media types, paragraphs, vocabularies, and block types
- **Create Fields**: Add fields to bundles with full support for all common field types
- **Generate Reports**: Export content model documentation as Markdown
- **Admin Links**: Quick access to Drupal admin paths for any bundle
- **Dual Interface**: Interactive menu system or CLI one-liners for scripting

## Installation

```bash
npm install
npm link  # Makes 'dcm' command available globally
```

## Quick Start

### Interactive Mode

Run without arguments to launch the interactive menu:

```bash
dcm
```

### CLI Mode

Use commands directly for scripting and automation:

```bash
# Create a project
dcm project create -n "My Site" -c /path/to/drupal/config -u https://mysite.com

# Sync configuration
dcm project sync -p my-site

# List bundles
dcm bundle list -p my-site

# Create a content type
dcm bundle create -p my-site -e node -l "Blog Post" -d "Blog articles"

# Create a field
dcm field create -p my-site -e node -b blog_post -t string -l "Subtitle"

# Generate a report
dcm report project -p my-site -o content-model.md
```

## Supported Entity Types

| Entity Type | Description |
|-------------|-------------|
| `node` | Content types |
| `media` | Media types |
| `paragraph` | Paragraph types |
| `taxonomy_term` | Taxonomy vocabularies |
| `block_content` | Block types |

## Supported Field Types

| Field Type | Description |
|------------|-------------|
| `string` | Plain text (single line) |
| `string_long` | Plain text (multi-line) |
| `text_long` | Formatted text |
| `boolean` | True/false |
| `integer` | Whole number |
| `list_string` | Select list (text keys) |
| `list_integer` | Select list (integer keys) |
| `datetime` | Date/time |
| `daterange` | Date range |
| `link` | URL/link |
| `image` | Image file |
| `file` | File upload |
| `entity_reference` | Reference to entity |
| `entity_reference_revisions` | Paragraph reference |
| `webform` | Webform reference |

## Documentation

- **[COMMANDS.md](COMMANDS.md)** - Complete CLI command reference with all options and examples

## Development

```bash
# Run tests
npm run test:all

# Run linter
npm run lint

# Start interactive mode
npm run start
```

## Project Structure

```
src/
  cli/           # Interactive prompts, menus, CLI commands
  commands/      # Business logic for operations
  parsers/       # YAML parsing (pure functions)
  generators/    # YAML generation (pure functions)
  utils/         # Validation, formatting utilities
  io/            # File system operations
projects/        # User project storage (gitignored)
```

## License

MIT
