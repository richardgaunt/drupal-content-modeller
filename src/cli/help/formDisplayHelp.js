import { formatHelpText } from './formatHelpText.js';

export const FORM_DISPLAY_HELP_DATA = {
  workflow: [
    'Create form display:     dcm form-display create -p <project> -e <type> -b <bundle>',
    'Reorder fields:          dcm form-display reorder -p <project> -e <type> -b <bundle> -o "field1,field2"',
    'Change widgets:          dcm form-display set-widget -p <project> -e <type> -b <bundle> -f <field> -w <widget>',
    'Create field groups:     dcm form-display group create -p <project> -e <type> -b <bundle> -l "Tab Name" -f tab',
    'Move fields to groups:   dcm form-display move -p <project> -e <type> -b <bundle> -i <field> -t <group>',
    'View the layout:         dcm form-display view -p <project> -e <type> -b <bundle>'
  ],
  validValues: [
    {
      label: 'Group Format Types',
      values: [
        { name: 'tabs', description: 'Tab container (holds tab children)' },
        { name: 'tab', description: 'Individual tab (must be inside a tabs container)' },
        { name: 'details', description: 'Collapsible details section' },
        { name: 'fieldset', description: 'Fieldset with legend' }
      ]
    }
  ],
  notes: [
    'Use "dcm form-display list-widgets -t <field_type>" to see available widget types'
  ],
  examples: [
    'dcm form-display create -p my-site -e node -b article',
    'dcm form-display group create -p my-site -e node -b article -l "Main Tabs" -f tabs',
    'dcm form-display group create -p my-site -e node -b article -l "Content" -f tab --parent group_main_tabs',
    'dcm form-display move -p my-site -e node -b article -i field_n_body -t group_content',
    'dcm form-display set-widget -p my-site -e node -b article -f field_n_category -w options_select',
    'dcm form-display view -p my-site -e node -b article'
  ]
};

export const FORM_DISPLAY_HELP = formatHelpText(FORM_DISPLAY_HELP_DATA);
