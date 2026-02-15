
## Update project configuration

1. Root directory of project drupal installation
2. CMD to call drush whether it be `ahoy drush` or `drush` - default to `ahoy drush`
3. Save these in configuration file


## Add a menu item to project menu to import configuration and export

As a good practice, we should always import and then export so we capture UUID creation and other 3rd party settings.

Create a "Sync configuration with Drupal" menu item which runs the following:

So we need a cmd to run `drush cim -y && drush cim -y` using whatever drush prefix we need to run it with.

## Add an option to all commands to run drush

There should be a flag on all commands to be able to run this --sync that will do the import and export.