# Ticket Template

Use this template when creating new tickets. Copy and fill in each section.

---

```markdown
# [Ticket Number] [Title]

## Goal
One sentence describing what this ticket accomplishes.

## Dependencies
- List tickets that must be complete before this one
- Use "None" if no dependencies

## Acceptance Criteria
- [ ] Specific, testable outcome 1
- [ ] Specific, testable outcome 2
- [ ] Tests pass for new functionality

## Reference Files
- `config/example.yml` - description of what to look at
- `src/module.js` - existing code to modify

## Implementation Notes
- Key decisions or constraints
- Libraries to use
- Patterns to follow

## Tests
Test file: `tests/{module}.test.js`

### Unit Tests
- [ ] `functionName does X given Y` - what it validates

**Testing Pattern:** Test pure functions via input/output. Mock I/O (file system, prompts) when testing orchestration functions.

## Questions (Optional)
- Any unresolved questions for the implementer
```

---

## Ticket Numbering

| Range | Category |
|---|---|
| 00-09 | Documentation & Setup |
| 10-19 | Core Infrastructure |
| 20-29 | Project Management |
| 30-39 | Config Parsing |
| 40-49 | CLI Interface |
| 50-59 | List/View Features |
| 60-69 | Create Features |
| 70-79 | Future/Phase 2 |

## Writing Good Acceptance Criteria

**Good:**
- [ ] Running `npm run start` displays the main menu
- [ ] Selecting "Create project" prompts for project name
- [ ] Project name "My Project" creates directory `projects/my-project/`

**Bad:**
- [ ] Works correctly
- [ ] User can create projects
- [ ] No bugs
