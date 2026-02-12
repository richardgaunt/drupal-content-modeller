

Drupal allows the reuse of fields within content types so a:
- field storage config is created
- N + 1 field instances for bundles can be created of that entity type

Within the "create a field":
After I select a bundle or bundles, then I should select field type.

After selecting field type it should present me with the following options:

- Reuse field
- Create new field

Reuse field is only shown if there are fields that can be reused, this is determined by field type and entity type.

After clicking on Reuse field, I am then shown options to select if i want to reuse a field:

- Body (field_c_n_body)
- Summary (field_n_summary)
- Create new field

If Create new field is selected on either the first menu or the reuse menu I am then presented with the current workflow.

If I select a reuse field then I am presented with the following:
- Label
- Description
- Whether the field is required

Then a field instance config file is generated and the field storage is not changed.