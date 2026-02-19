
If the ticket mentions `select` or `options`, for entity reference fields means using the `options_select` widget. Otherwise use the autocomplete widget or make an appropriate choice.

In the form display, the fields should be shown in same order as they appear in the ticket.

## Implementation Plan

### Current state

The skill at `.claude/skills/dcm/SKILL.md` does not mention widget selection or field ordering for form displays.

### Files to Modify

| File | Change |
|------|--------|
| `.claude/skills/dcm/SKILL.md` | Add guidance on widget selection and field ordering |

### Changes to SKILL.md

Add to the "Step 3: Analyse the requirements" section:

1. **Widget selection guidance** — When the ticket mentions "select", "dropdown", or "options" for entity reference fields, plan to use the `options_select` widget via `dcm form-display set-widget`. Otherwise default to autocomplete.

2. **Field ordering guidance** — When creating a form display, the fields should be ordered to match the order they appear in the ticket. After creating the form display, use `dcm form-display reorder` to set the field order.

Add to the "Important Rules" section:

- When the ticket says "select" or "options" for an entity reference field, use the `options_select` widget (`dcm form-display set-widget -f <field> -w options_select`).
- After creating a form display, reorder fields to match the order they appear in the ticket using `dcm form-display reorder`.
- Use `dcm form-display list-widgets -t <field_type>` to check available widgets when unsure.