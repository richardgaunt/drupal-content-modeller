/**
 * Format structured help data into text for Commander's addHelpText.
 * @param {object} data - Structured help data
 * @returns {string} Formatted text
 */
export function formatHelpText(data) {
  const lines = [];

  if (data.validValues) {
    for (const group of data.validValues) {
      lines.push(`${group.label}:`);
      for (const item of group.values) {
        const padding = ' '.repeat(Math.max(2, 22 - item.name.length));
        lines.push(`  ${item.name}${padding}${item.description}`);
      }
      lines.push('');
    }
  }

  if (data.notes) {
    lines.push('Notes:');
    for (const note of data.notes) {
      lines.push(`  ${note}`);
    }
    lines.push('');
  }

  if (data.workflow) {
    lines.push('Workflow:');
    data.workflow.forEach((step, i) => {
      lines.push(`  ${i + 1}. ${step}`);
    });
    lines.push('');
  }

  if (data.examples) {
    lines.push('Examples:');
    for (const ex of data.examples) {
      lines.push(`  $ ${ex}`);
    }
    lines.push('');
  }

  return '\n' + lines.join('\n');
}
