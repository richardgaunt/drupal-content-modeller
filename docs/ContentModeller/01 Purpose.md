## Summary

Create a CLI application that can:
- analyse an existing project's configuration to find out what content model configuration exists (entity types and fields)
- create new fields and new entity types via a CLI configuration tool
## App workflow

1. Run application with `npm run start`
2. I am presented with two choices:
	1. Create project
	2. Load project
3. If I select Create project:
	1. Asked for Project Name (cli validates and checks to make sure there isnt already a proiject name)
	2. CLI creates a directory in `projects/<directory safe project name>` - it converts project name to directory name
	3. Directory to exported configuration, checks that the directory exists and there are YML files in it
4. If I load a project:
	1. I can "Sync the project configuration" which will work out the entity types and field types of the project
	2. I can "List entity types" and it will print a list of  entity types, this will give the label,  machine name, bundle and entity type of an entity
	3. I can "List fields of Entity", it will then ask me to choose an entity type and it will print a list of fields, giving a label, machine name, bundles fields belong to
	4. I can "List fields of Bundle" and it will ask me to choose "Which entity type"? Then "Which bundle"
	5. I can "Create a bundle", this will get me to choose an available entity - node, media or taxonomy_term, paragraph_type then it will get me to enter a name, then a machine name, a description. For media it will ask me further questions that are needed to create a media type. After these questions, it will generate a YML file and save to the config directory. The name of the YML file will be in the correct format.
	6. I can create a field type, it will give me ask me to choose a field type from available fields. It will then generate field type configuration based on this.

## Project directory structure

- Project Name
- Configuration Directory

This project should then be saved in `projects` directory in `project.json`.

This should be keyed 

Once these are set, the tool can:

- Read a configuration directory
- Create a list of the:
	- Entity types
	- Fields of each entity type
- Store this details in `projects/project.json`


## Research required

I have provided the configuration for CivicTheme in the `config` directory. This gives you a good selection of different field types and different entity types that can be created in Drupal.

Use this directory to work out what entity types, field types we will support initially. Only support what CivicTheme supports for now.

Examine `config` look through config files there and compile a list of entity types that are present, compile a list of field types that are present.

For each entity type, create a template with the values you need to connect templated so you can read later and work out what questions you need to ask.

For now you are not asking about form displays or displays of entity that will be controlled within Drupal you are *just* creating the content model required for the website.

Compile this research into a document `docs/content-model-research.md` so I can review and edit