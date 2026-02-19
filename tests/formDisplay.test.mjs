import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Import form display parser functions
import {
  getFormDisplayFilename,
  parseFormDisplay,
  parseFieldGroups,
  parseFormFields,
  parseHiddenFields,
  findFieldParentGroup,
  buildFormDisplayTree,
  formatTreeForDisplay,
  getGroupChoices,
  getFieldChoices,
  validateGroupName,
  generateGroupName
} from '../src/parsers/formDisplayParser';

// Import form display generator functions
import {
  FIELD_GROUP_FORMATS,
  getDefaultFormatSettings,
  recalculateWeights,
  generateThirdPartySettings,
  generateContentSection,
  generateHiddenSection,
  generateDependencies,
  generateFormDisplay,
  addChildToGroup,
  removeChildFromGroup,
  createNewGroup
} from '../src/generators/formDisplayGenerator';

// Import form display command functions
import {
  reorderGroupChildren,
  moveFieldToGroup,
  moveGroupToParent,
  createFieldGroup,
  deleteFieldGroup,
  updateFieldGroup,
  toggleFieldVisibility,
  getAvailableGroups,
  getVisibleFields,
  getHiddenFields,
  getNextWeight,
  updateFieldSettings,
  clearFieldGroups
} from '../src/commands/formDisplay';

// Import field widgets functions
import {
  FIELD_WIDGETS,
  getDefaultWidget,
  getWidgetsForFieldType,
  getWidgetByType
} from '../src/constants/fieldWidgets';

// Import base fields functions
import {
  isBaseField,
  getBaseFieldConfig,
  getBaseFieldNames
} from '../src/constants/baseFields';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Form Display Parser - Pure Functions', () => {
  describe('getFormDisplayFilename', () => {
    test('returns correct filename for node', () => {
      const result = getFormDisplayFilename('node', 'article');
      expect(result).toBe('core.entity_form_display.node.article.default.yml');
    });

    test('returns correct filename for paragraph', () => {
      const result = getFormDisplayFilename('paragraph', 'card');
      expect(result).toBe('core.entity_form_display.paragraph.card.default.yml');
    });
  });

  describe('parseFormDisplay', () => {
    test('parses valid form display config', () => {
      const config = {
        targetEntityType: 'node',
        bundle: 'article',
        mode: 'default',
        content: {
          title: { type: 'string_textfield', weight: 0 }
        },
        hidden: { created: true },
        third_party_settings: {
          field_group: {
            group_main: {
              label: 'Main',
              children: ['title'],
              format_type: 'tabs'
            }
          }
        }
      };

      const result = parseFormDisplay(config);
      expect(result.entityType).toBe('node');
      expect(result.bundle).toBe('article');
      expect(result.mode).toBe('default');
      expect(result.fields).toHaveLength(1);
      expect(result.groups).toHaveLength(1);
      expect(result.hidden).toContain('created');
    });

    test('returns null for invalid config', () => {
      expect(parseFormDisplay(null)).toBeNull();
      expect(parseFormDisplay({})).toBeNull();
      expect(parseFormDisplay({ targetEntityType: 'node' })).toBeNull();
    });
  });

  describe('parseFieldGroups', () => {
    test('extracts field groups from third_party_settings', () => {
      const thirdPartySettings = {
        field_group: {
          group_main: {
            label: 'Main',
            children: ['title', 'body'],
            format_type: 'tabs',
            weight: 0
          }
        }
      };

      const result = parseFieldGroups(thirdPartySettings);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('group_main');
      expect(result[0].label).toBe('Main');
      expect(result[0].children).toEqual(['title', 'body']);
      expect(result[0].formatType).toBe('tabs');
    });

    test('returns empty array for null', () => {
      expect(parseFieldGroups(null)).toEqual([]);
      expect(parseFieldGroups({})).toEqual([]);
    });
  });

  describe('parseFormFields', () => {
    test('extracts fields from content section', () => {
      const content = {
        title: { type: 'string_textfield', weight: 0, region: 'content' },
        body: { type: 'text_textarea', weight: 1, region: 'content' }
      };

      const result = parseFormFields(content);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('title');
      expect(result[0].type).toBe('string_textfield');
    });

    test('returns empty array for null', () => {
      expect(parseFormFields(null)).toEqual([]);
    });
  });

  describe('parseHiddenFields', () => {
    test('extracts hidden field names', () => {
      const hidden = { created: true, status: true };
      const result = parseHiddenFields(hidden);
      expect(result).toContain('created');
      expect(result).toContain('status');
    });

    test('returns empty array for null', () => {
      expect(parseHiddenFields(null)).toEqual([]);
    });
  });

  describe('findFieldParentGroup', () => {
    test('finds parent group of field', () => {
      const groups = [
        { name: 'group_main', children: ['title', 'body'] },
        { name: 'group_meta', children: ['tags'] }
      ];

      expect(findFieldParentGroup('title', groups)).toBe('group_main');
      expect(findFieldParentGroup('tags', groups)).toBe('group_meta');
    });

    test('returns empty string for ungrouped field', () => {
      const groups = [{ name: 'group_main', children: ['title'] }];
      expect(findFieldParentGroup('body', groups)).toBe('');
    });
  });

  describe('generateGroupName', () => {
    test('generates machine name from label', () => {
      expect(generateGroupName('Main Content')).toBe('group_main_content');
      expect(generateGroupName('Settings')).toBe('group_settings');
    });

    test('handles special characters', () => {
      expect(generateGroupName('Tab #1')).toBe('group_tab_1');
    });

    test('returns empty string for invalid input', () => {
      expect(generateGroupName(null)).toBe('');
      expect(generateGroupName('')).toBe('');
    });
  });

  describe('validateGroupName', () => {
    test('accepts valid unique name', () => {
      const groups = [{ name: 'group_existing' }];
      expect(validateGroupName('new_group', groups)).toBe(true);
    });

    test('rejects empty name', () => {
      expect(validateGroupName('', [])).toBe('Group name is required');
    });

    test('rejects duplicate name', () => {
      const groups = [{ name: 'group_existing' }];
      const result = validateGroupName('existing', groups);
      expect(result).toContain('already exists');
    });
  });

  describe('buildFormDisplayTree', () => {
    test('builds hierarchical tree', () => {
      const groups = [
        { name: 'group_tabs', children: ['group_content'], parentName: '', formatType: 'tabs', label: 'Tabs', weight: 0 },
        { name: 'group_content', children: ['title'], parentName: 'group_tabs', formatType: 'tab', label: 'Content', weight: 0 }
      ];
      const fields = [
        { name: 'title', type: 'string_textfield', weight: 0 }
      ];
      const hidden = [];

      const result = buildFormDisplayTree(groups, fields, hidden);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].name).toBe('group_tabs');
    });
  });

  describe('formatTreeForDisplay', () => {
    test('formats tree as string', () => {
      const tree = {
        nodes: [
          { type: 'field', name: 'title', label: 'title', widgetType: 'string_textfield', weight: 0 }
        ],
        hidden: ['created']
      };

      const result = formatTreeForDisplay(tree, 'node', 'article');
      expect(result).toContain('title');
      expect(result).toContain('Hidden: created');
    });
  });

  describe('getGroupChoices', () => {
    test('returns choices including root level', () => {
      const groups = [{ name: 'group_main', label: 'Main', formatType: 'tabs' }];
      const choices = getGroupChoices(groups);
      expect(choices).toHaveLength(2);
      expect(choices[0].value).toBe('');
      expect(choices[1].value).toBe('group_main');
    });
  });

  describe('getFieldChoices', () => {
    test('returns visible fields', () => {
      const fields = [
        { name: 'title', type: 'string_textfield' },
        { name: 'body', type: 'text_textarea' }
      ];
      const hidden = ['body'];

      const choices = getFieldChoices(fields, hidden);
      expect(choices).toHaveLength(1);
      expect(choices[0].value).toBe('title');
    });
  });
});

describe('Form Display Generator - Pure Functions', () => {
  describe('FIELD_GROUP_FORMATS', () => {
    test('contains expected formats', () => {
      const values = FIELD_GROUP_FORMATS.map(f => f.value);
      expect(values).toContain('tabs');
      expect(values).toContain('tab');
      expect(values).toContain('details');
      expect(values).toContain('fieldset');
    });
  });

  describe('getDefaultFormatSettings', () => {
    test('returns settings for tabs', () => {
      const settings = getDefaultFormatSettings('tabs');
      expect(settings.direction).toBe('horizontal');
    });

    test('returns settings for details', () => {
      const settings = getDefaultFormatSettings('details');
      expect(settings).toHaveProperty('open');
    });
  });

  describe('recalculateWeights', () => {
    test('assigns weights based on order', () => {
      const items = [
        { name: 'a', weight: 5 },
        { name: 'b', weight: 3 },
        { name: 'c', weight: 1 }
      ];
      const result = recalculateWeights(['c', 'b', 'a'], items);
      expect(result[0].name).toBe('c');
      expect(result[0].weight).toBe(0);
      expect(result[1].name).toBe('b');
      expect(result[1].weight).toBe(1);
      expect(result[2].name).toBe('a');
      expect(result[2].weight).toBe(2);
    });
  });

  describe('generateThirdPartySettings', () => {
    test('generates field_group section', () => {
      const groups = [{
        name: 'group_main',
        label: 'Main',
        children: ['title'],
        formatType: 'tabs',
        weight: 0
      }];

      const result = generateThirdPartySettings(groups);
      expect(result.field_group).toBeDefined();
      expect(result.field_group.group_main).toBeDefined();
      expect(result.field_group.group_main.label).toBe('Main');
    });

    test('returns empty for no groups', () => {
      expect(generateThirdPartySettings([])).toEqual({});
    });
  });

  describe('generateContentSection', () => {
    test('generates content section', () => {
      const fields = [{
        name: 'title',
        type: 'string_textfield',
        weight: 0,
        region: 'content'
      }];

      const result = generateContentSection(fields);
      expect(result.title).toBeDefined();
      expect(result.title.type).toBe('string_textfield');
    });
  });

  describe('generateHiddenSection', () => {
    test('generates hidden section', () => {
      const result = generateHiddenSection(['created', 'status']);
      expect(result.created).toBe(true);
      expect(result.status).toBe(true);
    });
  });

  describe('generateDependencies', () => {
    test('includes field and bundle dependencies', () => {
      const fields = [{ name: 'field_body' }];
      const result = generateDependencies([], fields, 'node', 'article');

      expect(result.config).toContain('field.field.node.article.field_body');
      expect(result.config).toContain('node.type.article');
    });

    test('includes field_group module when groups exist', () => {
      const groups = [{ name: 'group_main' }];
      const fields = [];
      const result = generateDependencies(groups, fields, 'node', 'article');

      expect(result.module).toContain('field_group');
    });
  });

  describe('generateFormDisplay', () => {
    test('generates complete YAML', () => {
      const formDisplay = {
        entityType: 'node',
        bundle: 'article',
        mode: 'default',
        groups: [],
        fields: [{ name: 'title', type: 'string_textfield', weight: 0 }],
        hidden: ['created']
      };

      const result = generateFormDisplay(formDisplay);
      expect(result).toContain('id: node.article.default');
      expect(result).toContain('targetEntityType: node');
      expect(result).toContain('bundle: article');
    });
  });

  describe('createNewGroup', () => {
    test('creates group with defaults', () => {
      const result = createNewGroup({
        name: 'group_test',
        label: 'Test',
        formatType: 'tabs'
      });

      expect(result.name).toBe('group_test');
      expect(result.label).toBe('Test');
      expect(result.formatType).toBe('tabs');
      expect(result.children).toEqual([]);
    });
  });

  describe('addChildToGroup', () => {
    test('adds child to group', () => {
      const group = { name: 'group_main', children: ['title'] };
      const result = addChildToGroup(group, 'body');
      expect(result.children).toContain('body');
    });
  });

  describe('removeChildFromGroup', () => {
    test('removes child from group', () => {
      const group = { name: 'group_main', children: ['title', 'body'] };
      const result = removeChildFromGroup(group, 'body');
      expect(result.children).not.toContain('body');
    });
  });
});

describe('Form Display Commands', () => {
  const mockFormDisplay = {
    entityType: 'node',
    bundle: 'article',
    mode: 'default',
    groups: [
      { name: 'group_main', children: ['title', 'body'], parentName: '', formatType: 'tabs', label: 'Main', weight: 0 }
    ],
    fields: [
      { name: 'title', type: 'string_textfield', weight: 0 },
      { name: 'body', type: 'text_textarea', weight: 1 },
      { name: 'tags', type: 'entity_reference_autocomplete', weight: 2 }
    ],
    hidden: ['created']
  };

  describe('reorderGroupChildren', () => {
    test('updates children array and field weights within a group', () => {
      const result = reorderGroupChildren(mockFormDisplay, 'group_main', ['body', 'title']);
      const group = result.groups.find(g => g.name === 'group_main');
      // Children array should be updated to new order
      expect(group.children).toEqual(['body', 'title']);
      // Field weights should also be updated
      const bodyField = result.fields.find(f => f.name === 'body');
      const titleField = result.fields.find(f => f.name === 'title');
      expect(bodyField.weight).toBe(0);
      expect(titleField.weight).toBe(1);
    });

    test('updates weights at root level', () => {
      const result = reorderGroupChildren(mockFormDisplay, '', ['tags', 'title', 'body']);
      const tagsField = result.fields.find(f => f.name === 'tags');
      const titleField = result.fields.find(f => f.name === 'title');
      const bodyField = result.fields.find(f => f.name === 'body');
      expect(tagsField.weight).toBe(0);
      expect(titleField.weight).toBe(1);
      expect(bodyField.weight).toBe(2);
    });

    test('updates weights for nested groups', () => {
      const formDisplayWithNestedGroups = {
        ...mockFormDisplay,
        groups: [
          { name: 'group_parent', children: ['group_a', 'group_b'], parentName: '', formatType: 'tabs', label: 'Parent', weight: 0 },
          { name: 'group_a', children: [], parentName: 'group_parent', formatType: 'tab', label: 'Tab A', weight: 0 },
          { name: 'group_b', children: [], parentName: 'group_parent', formatType: 'tab', label: 'Tab B', weight: 1 }
        ]
      };
      const result = reorderGroupChildren(formDisplayWithNestedGroups, 'group_parent', ['group_b', 'group_a']);
      const groupA = result.groups.find(g => g.name === 'group_a');
      const groupB = result.groups.find(g => g.name === 'group_b');
      // group_b should now have lower weight since it's first
      expect(groupB.weight).toBe(0);
      expect(groupA.weight).toBe(1);
    });

    test('updates weights for mixed fields and groups within a group', () => {
      const formDisplayMixed = {
        entityType: 'node',
        bundle: 'article',
        mode: 'default',
        groups: [
          { name: 'group_parent', children: ['title', 'group_nested', 'body'], parentName: '', formatType: 'tabs', label: 'Parent', weight: 0 },
          { name: 'group_nested', children: [], parentName: 'group_parent', formatType: 'details', label: 'Nested', weight: 5 }
        ],
        fields: [
          { name: 'title', type: 'string_textfield', weight: 0 },
          { name: 'body', type: 'text_textarea', weight: 10 }
        ],
        hidden: []
      };
      // Reorder: body first, then nested group, then title
      const result = reorderGroupChildren(formDisplayMixed, 'group_parent', ['body', 'group_nested', 'title']);

      const parentGroup = result.groups.find(g => g.name === 'group_parent');
      const nestedGroup = result.groups.find(g => g.name === 'group_nested');
      const bodyField = result.fields.find(f => f.name === 'body');
      const titleField = result.fields.find(f => f.name === 'title');

      // Children array should reflect new order
      expect(parentGroup.children).toEqual(['body', 'group_nested', 'title']);
      // All items should have sequential weights
      expect(bodyField.weight).toBe(0);
      expect(nestedGroup.weight).toBe(1);
      expect(titleField.weight).toBe(2);
    });
  });

  describe('moveFieldToGroup', () => {
    test('moves field to different group', () => {
      const formDisplay = {
        ...mockFormDisplay,
        groups: [
          { name: 'group_main', children: ['title'], parentName: '', formatType: 'tabs', label: 'Main', weight: 0 },
          { name: 'group_meta', children: [], parentName: '', formatType: 'details', label: 'Meta', weight: 1 }
        ]
      };

      const result = moveFieldToGroup(formDisplay, 'title', 'group_meta');
      const mainGroup = result.groups.find(g => g.name === 'group_main');
      const metaGroup = result.groups.find(g => g.name === 'group_meta');

      expect(mainGroup.children).not.toContain('title');
      expect(metaGroup.children).toContain('title');
    });

    test('moves field to root (removes from group)', () => {
      const result = moveFieldToGroup(mockFormDisplay, 'title', '');
      const group = result.groups.find(g => g.name === 'group_main');
      expect(group.children).not.toContain('title');
    });
  });

  describe('moveGroupToParent', () => {
    test('moves group to different parent', () => {
      const formDisplay = {
        ...mockFormDisplay,
        groups: [
          { name: 'group_tabs', children: ['group_a'], parentName: '', formatType: 'tabs', label: 'Tabs', weight: 0 },
          { name: 'group_a', children: [], parentName: 'group_tabs', formatType: 'tab', label: 'Tab A', weight: 0 },
          { name: 'group_other', children: [], parentName: '', formatType: 'tabs', label: 'Other', weight: 1 }
        ]
      };

      const result = moveGroupToParent(formDisplay, 'group_a', 'group_other');
      const tabsGroup = result.groups.find(g => g.name === 'group_tabs');
      const otherGroup = result.groups.find(g => g.name === 'group_other');
      const groupA = result.groups.find(g => g.name === 'group_a');

      expect(tabsGroup.children).not.toContain('group_a');
      expect(otherGroup.children).toContain('group_a');
      expect(groupA.parentName).toBe('group_other');
    });

    test('moves group to root', () => {
      const formDisplay = {
        ...mockFormDisplay,
        groups: [
          { name: 'group_tabs', children: ['group_a'], parentName: '', formatType: 'tabs', label: 'Tabs', weight: 0 },
          { name: 'group_a', children: [], parentName: 'group_tabs', formatType: 'tab', label: 'Tab A', weight: 0 }
        ]
      };

      const result = moveGroupToParent(formDisplay, 'group_a', '');
      const tabsGroup = result.groups.find(g => g.name === 'group_tabs');
      const groupA = result.groups.find(g => g.name === 'group_a');

      expect(tabsGroup.children).not.toContain('group_a');
      expect(groupA.parentName).toBe('');
    });
  });

  describe('createFieldGroup', () => {
    test('creates new group', () => {
      const result = createFieldGroup(mockFormDisplay, {
        name: 'group_new',
        label: 'New Group',
        formatType: 'details',
        parentName: ''
      });

      const newGroup = result.groups.find(g => g.name === 'group_new');
      expect(newGroup).toBeDefined();
      expect(newGroup.label).toBe('New Group');
    });
  });

  describe('deleteFieldGroup', () => {
    test('deletes group and moves children to parent', () => {
      const formDisplay = {
        ...mockFormDisplay,
        groups: [
          { name: 'group_tabs', children: ['group_main'], parentName: '', formatType: 'tabs', label: 'Tabs', weight: 0 },
          { name: 'group_main', children: ['title'], parentName: 'group_tabs', formatType: 'tab', label: 'Main', weight: 0 }
        ]
      };

      const result = deleteFieldGroup(formDisplay, 'group_main', true);
      const tabsGroup = result.groups.find(g => g.name === 'group_tabs');

      expect(result.groups.find(g => g.name === 'group_main')).toBeUndefined();
      expect(tabsGroup.children).toContain('title');
    });
  });

  describe('updateFieldGroup', () => {
    test('updates group properties', () => {
      const result = updateFieldGroup(mockFormDisplay, 'group_main', {
        label: 'Updated Label'
      });

      const group = result.groups.find(g => g.name === 'group_main');
      expect(group.label).toBe('Updated Label');
    });
  });

  describe('toggleFieldVisibility', () => {
    test('hides visible field', () => {
      const result = toggleFieldVisibility(mockFormDisplay, 'title');
      expect(result.hidden).toContain('title');
    });

    test('shows hidden field', () => {
      const result = toggleFieldVisibility(mockFormDisplay, 'created');
      expect(result.hidden).not.toContain('created');
    });
  });

  describe('getAvailableGroups', () => {
    test('returns group choices', () => {
      const choices = getAvailableGroups(mockFormDisplay);
      expect(choices.length).toBeGreaterThan(0);
      expect(choices[0].value).toBe('');
    });
  });

  describe('getVisibleFields', () => {
    test('returns visible field choices', () => {
      const choices = getVisibleFields(mockFormDisplay);
      expect(choices.length).toBe(3);
    });
  });

  describe('getHiddenFields', () => {
    test('returns hidden field choices', () => {
      const choices = getHiddenFields(mockFormDisplay);
      expect(choices).toHaveLength(1);
      expect(choices[0].value).toBe('created');
    });
  });

  describe('getNextWeight', () => {
    test('returns 0 for empty array', () => {
      expect(getNextWeight([])).toBe(0);
      expect(getNextWeight(null)).toBe(0);
    });

    test('returns max weight plus 1', () => {
      const fields = [
        { name: 'a', weight: 5 },
        { name: 'b', weight: 3 },
        { name: 'c', weight: 10 }
      ];
      expect(getNextWeight(fields)).toBe(11);
    });
  });

  describe('updateFieldSettings', () => {
    test('updates field settings', () => {
      const result = updateFieldSettings(mockFormDisplay, 'title', { size: 100 });
      const field = result.fields.find(f => f.name === 'title');
      expect(field.settings.size).toBe(100);
    });

    test('merges settings with existing', () => {
      const formDisplayWithSettings = {
        ...mockFormDisplay,
        fields: [
          { name: 'title', type: 'string_textfield', weight: 0, settings: { size: 60, placeholder: '' } }
        ]
      };
      const result = updateFieldSettings(formDisplayWithSettings, 'title', { placeholder: 'Enter title' });
      const field = result.fields.find(f => f.name === 'title');
      expect(field.settings.size).toBe(60);
      expect(field.settings.placeholder).toBe('Enter title');
    });

    test('throws for non-existent field', () => {
      expect(() => updateFieldSettings(mockFormDisplay, 'nonexistent', {})).toThrow('Field not found');
    });
  });

  describe('clearFieldGroups', () => {
    test('removes all groups', () => {
      const result = clearFieldGroups(mockFormDisplay);
      expect(result.groups).toEqual([]);
      expect(result.fields).toHaveLength(mockFormDisplay.fields.length);
    });
  });
});

describe('Field Widgets - Constants', () => {
  describe('FIELD_WIDGETS', () => {
    test('contains expected field types', () => {
      expect(FIELD_WIDGETS).toHaveProperty('string');
      expect(FIELD_WIDGETS).toHaveProperty('boolean');
      expect(FIELD_WIDGETS).toHaveProperty('entity_reference');
      expect(FIELD_WIDGETS).toHaveProperty('image');
      expect(FIELD_WIDGETS).toHaveProperty('text_with_summary');
    });

    test('each field type has at least one widget', () => {
      for (const [_fieldType, widgets] of Object.entries(FIELD_WIDGETS)) {
        expect(widgets.length).toBeGreaterThan(0);
        expect(widgets[0]).toHaveProperty('type');
        expect(widgets[0]).toHaveProperty('label');
        expect(widgets[0]).toHaveProperty('settings');
      }
    });
  });

  describe('getDefaultWidget', () => {
    test('returns first widget for known field type', () => {
      const widget = getDefaultWidget('boolean');
      expect(widget.type).toBe('boolean_checkbox');
      expect(widget.settings).toHaveProperty('display_label');
    });

    test('returns null for unknown field type', () => {
      expect(getDefaultWidget('unknown_type')).toBeNull();
    });

    test('returns a copy (not the original)', () => {
      const widget1 = getDefaultWidget('string');
      const widget2 = getDefaultWidget('string');
      widget1.settings.size = 999;
      expect(widget2.settings.size).not.toBe(999);
    });

    test('entity_reference_revisions default widget has default_paragraph_type set to _none', () => {
      const widget = getDefaultWidget('entity_reference_revisions');
      expect(widget.type).toBe('paragraphs');
      expect(widget.settings.default_paragraph_type).toBe('_none');
    });
  });

  describe('entity_reference_revisions paragraph widgets', () => {
    test('paragraphs widget has default_paragraph_type _none', () => {
      const widget = getWidgetByType('entity_reference_revisions', 'paragraphs');
      expect(widget.settings.default_paragraph_type).toBe('_none');
    });

    test('entity_reference_paragraphs (legacy) widget has default_paragraph_type _none', () => {
      const widget = getWidgetByType('entity_reference_revisions', 'entity_reference_paragraphs');
      expect(widget.settings.default_paragraph_type).toBe('_none');
    });
  });

  describe('getWidgetsForFieldType', () => {
    test('returns array of widgets for known type', () => {
      const widgets = getWidgetsForFieldType('entity_reference');
      expect(widgets.length).toBeGreaterThan(1);
      expect(widgets[0].type).toBe('entity_reference_autocomplete');
    });

    test('returns empty array for unknown type', () => {
      expect(getWidgetsForFieldType('unknown_type')).toEqual([]);
    });
  });

  describe('getWidgetByType', () => {
    test('returns specific widget by type', () => {
      const widget = getWidgetByType('entity_reference', 'options_select');
      expect(widget.type).toBe('options_select');
      expect(widget.label).toBe('Select list');
    });

    test('returns null for unknown widget type', () => {
      expect(getWidgetByType('entity_reference', 'nonexistent')).toBeNull();
    });

    test('returns null for unknown field type', () => {
      expect(getWidgetByType('unknown_type', 'some_widget')).toBeNull();
    });

    test('returns a copy (not the original)', () => {
      const widget1 = getWidgetByType('string', 'string_textfield');
      const widget2 = getWidgetByType('string', 'string_textfield');
      widget1.settings.size = 999;
      expect(widget2.settings.size).not.toBe(999);
    });
  });
});

describe('Base Fields Integration', () => {
  describe('isBaseField', () => {
    test('identifies node base fields', () => {
      expect(isBaseField('node', 'title')).toBe(true);
      expect(isBaseField('node', 'status')).toBe(true);
      expect(isBaseField('node', 'uid')).toBe(true);
      expect(isBaseField('node', 'promote')).toBe(true);
      expect(isBaseField('node', 'sticky')).toBe(true);
      expect(isBaseField('node', 'moderation_state')).toBe(true);
      expect(isBaseField('node', 'path')).toBe(true);
    });

    test('identifies custom fields as not base fields', () => {
      expect(isBaseField('node', 'field_n_summary')).toBe(false);
      expect(isBaseField('node', 'field_n_body')).toBe(false);
    });

    test('identifies taxonomy_term base fields', () => {
      expect(isBaseField('taxonomy_term', 'name')).toBe(true);
      expect(isBaseField('taxonomy_term', 'description')).toBe(true);
      expect(isBaseField('taxonomy_term', 'weight')).toBe(true);
    });

    test('identifies media base fields', () => {
      expect(isBaseField('media', 'name')).toBe(true);
      expect(isBaseField('media', 'uid')).toBe(true);
    });

    test('identifies block_content base fields', () => {
      expect(isBaseField('block_content', 'info')).toBe(true);
      expect(isBaseField('block_content', 'reusable')).toBe(true);
    });

    test('identifies paragraph base fields', () => {
      expect(isBaseField('paragraph', 'status')).toBe(true);
    });
  });

  describe('getBaseFieldConfig', () => {
    test('returns config for node title', () => {
      const config = getBaseFieldConfig('node', 'title');
      expect(config.type).toBe('string');
      expect(config.label).toBe('Title');
      expect(config.widget).toBe('string_textfield');
      expect(config.settings.size).toBe(60);
    });

    test('returns config for node status', () => {
      const config = getBaseFieldConfig('node', 'status');
      expect(config.type).toBe('boolean');
      expect(config.widget).toBe('boolean_checkbox');
      expect(config.settings.display_label).toBe(true);
    });

    test('returns config for node moderation_state', () => {
      const config = getBaseFieldConfig('node', 'moderation_state');
      expect(config.widget).toBe('moderation_state_default');
    });

    test('returns null for custom field', () => {
      const config = getBaseFieldConfig('node', 'field_n_body');
      expect(config).toBeNull();
    });
  });

  describe('getBaseFieldNames', () => {
    test('returns all node base field names', () => {
      const names = getBaseFieldNames('node');
      expect(names).toContain('title');
      expect(names).toContain('status');
      expect(names).toContain('uid');
      expect(names).toContain('promote');
      expect(names).toContain('sticky');
      expect(names).toContain('moderation_state');
      expect(names).toContain('path');
      expect(names.length).toBe(7);
    });

    test('returns all taxonomy_term base field names', () => {
      const names = getBaseFieldNames('taxonomy_term');
      expect(names).toContain('name');
      expect(names).toContain('description');
      expect(names).toContain('status');
      expect(names).toContain('weight');
      expect(names).toContain('parent');
      expect(names).toContain('path');
      expect(names.length).toBe(6);
    });

    test('returns empty array for unknown entity type', () => {
      const names = getBaseFieldNames('unknown');
      expect(names).toEqual([]);
    });
  });

  describe('Base field widget mapping', () => {
    test('node title uses string_textfield widget', () => {
      const config = getBaseFieldConfig('node', 'title');
      const widget = getWidgetByType(config.type, config.widget);
      expect(widget).not.toBeNull();
      expect(widget.type).toBe('string_textfield');
    });

    test('node status uses boolean_checkbox widget', () => {
      const config = getBaseFieldConfig('node', 'status');
      const widget = getWidgetByType(config.type, config.widget);
      expect(widget).not.toBeNull();
      expect(widget.type).toBe('boolean_checkbox');
    });

    test('node uid uses entity_reference_autocomplete widget', () => {
      const config = getBaseFieldConfig('node', 'uid');
      const widget = getWidgetByType(config.type, config.widget);
      expect(widget).not.toBeNull();
      expect(widget.type).toBe('entity_reference_autocomplete');
    });

    test('taxonomy_term description uses text_textarea widget', () => {
      const config = getBaseFieldConfig('taxonomy_term', 'description');
      const widget = getWidgetByType(config.type, config.widget);
      expect(widget).not.toBeNull();
      expect(widget.type).toBe('text_textarea');
    });
  });
});
