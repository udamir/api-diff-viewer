import { apiMerge, BaseRulesType } from "api-smart-diff"
import { LineData, _arrLine, _arrBlock, _line, _block, Diff } from "./utils"

const metaKey = Symbol("diff")

export const compare = (before: any, after: any, rules: BaseRulesType = "JsonSchema") => {
  const merged = apiMerge(before, after, { rules, metaKey, arrayMeta: true })
  return dumpDiffYaml(merged)
}

export const dumpDiffYaml = (input: any, line = 1, indent = 0, parentDiff?: Diff): LineData[] => {
  const lines: LineData[] = []
  if (input instanceof Array) {
    for (let i = 0; i < input.length; i++) {
      const value = input[i]
      const diff = metaKey in input && (input as any)[metaKey][i] || parentDiff
      if (diff?.replaced !== undefined) {
        diff.replaced = formatInline(diff.replaced)
      }
      if (typeof value !== 'object' || input instanceof Date || isEmpty(value)) {
        lines.push(_arrLine(line++, indent, formatInline(value), diff))
      } else {
        const children = dumpDiffYaml(value, line + 1, indent + 2, diff?.action !== "replace" && diff)
        const node = _arrBlock(Array.isArray(value) ? "array" : "object", line, indent, children, diff)
        lines.push(node)
        line += node.lines || 1
      }
    }
  } else {
    for (const key in input) {
      const value = input[key];
      const diff = metaKey in input && input[metaKey][key] || parentDiff
      if (diff?.replaced !== undefined) {
        diff.replaced = formatInline(diff.replaced)
      }
      if (typeof value !== 'object' || input instanceof Date || isEmpty(value)) {
        lines.push(_line(line++, indent, formatInline(key), formatInline(value), diff))
      } else {
        const children = dumpDiffYaml(value, line + 1, indent + 2, diff?.action !== "replace" && diff)
        const node = _block(Array.isArray(value) ? "array" : "object", line, indent, formatInline(key), children, diff)
        lines.push(node)
        line += node.lines || 1
      }
    }
  }
  return lines
}

const formatInline = (value: any): string => {
  if (value == null) {
    return 'null';
  }
  const type = typeof value;
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Array) {
    return "[]"
  }
  if (type === "object") {
    return "{}"
  }
  if (type === 'boolean') {
    return (value ? 'true' : 'false');
  }
  if (isDigits(value)) {
    return (type === 'string' ? "'" + value + "'" : String(parseInt(value)));
  }
  if (isNumeric(value)) {
    return (type === 'string' ? "'" + value + "'" : String(parseFloat(value)));
  }
  if (type === 'number') {
    return (value === 2e308 ? '.Inf' : (value === -2e308 ? '-.Inf' : (isNaN(value) ? '.NaN' : value)));
  }
  if (requiresDoubleQuoting(value)) {
    return escapeWithDoubleQuotes(value);
  }
  if (requiresSingleQuoting(value)) {
    return escapeWithSingleQuotes(value);
  }
  if ('' === value) {
    return '""';
  }
  if (PATTERN_DATE.test(value)) {
    return "'" + value + "'";
  }
  const ref = value.toLowerCase()
  if (ref === 'null' || ref === '~' || ref === 'true' || ref === 'false') {
    return "'" + value + "'";
  }
  // Default
  return value;
}

const isEmpty = (value: any) => {
  return !value || value === '0' || (value instanceof Array && value.length === 0) || (value instanceof Object && !Object.keys(value))
}

const isDigits = (input: any) => {
  return /^\d+$/.test(input);
}

const isNumeric = (input: any) => {
  return typeof input === 'number' || !isNaN(input) && typeof input === 'string' && input.replace(/\s+/g, '') !== '';
}

const ch = String.fromCharCode
const LIST_ESCAPEES = ['\\', '\\\\', '\\"', '"', "\x00", "\x01", "\x02", "\x03", "\x04", "\x05", "\x06", "\x07", "\x08", "\x09", "\x0a", "\x0b", "\x0c", "\x0d", "\x0e", "\x0f", "\x10", "\x11", "\x12", "\x13", "\x14", "\x15", "\x16", "\x17", "\x18", "\x19", "\x1a", "\x1b", "\x1c", "\x1d", "\x1e", "\x1f", ch(0x0085), ch(0x00A0), ch(0x2028), ch(0x2029)];
const LIST_ESCAPED = ['\\\\', '\\"', '\\"', '\\"', "\\0", "\\x01", "\\x02", "\\x03", "\\x04", "\\x05", "\\x06", "\\a", "\\b", "\\t", "\\n", "\\v", "\\f", "\\r", "\\x0e", "\\x0f", "\\x10", "\\x11", "\\x12", "\\x13", "\\x14", "\\x15", "\\x16", "\\x17", "\\x18", "\\x19", "\\x1a", "\\e", "\\x1c", "\\x1d", "\\x1e", "\\x1f", "\\N", "\\_", "\\L", "\\P"];
const MAPPING_ESCAPEES_TO_ESCAPED = (() => {
  const mapping: any = {};
  for (let i = 0, j = 0, ref = LIST_ESCAPEES.length; (0 <= ref ? j < ref : j > ref); i = 0 <= ref ? ++j : --j) {
    mapping[LIST_ESCAPEES[i]] = LIST_ESCAPED[i];
  }
  return mapping;
})()

const requiresDoubleQuoting = (value: string) => {
  return PATTERN_CHARACTERS_TO_ESCAPE.test(value);
}

const escapeWithDoubleQuotes = (value: string) => {
  const result = PATTERN_MAPPING_ESCAPEES.replace(value, (str: string) => {
    return MAPPING_ESCAPEES_TO_ESCAPED[str];
  });
  return '"' + result + '"';
}

const requiresSingleQuoting = (value: string) => {
  return PATTERN_SINGLE_QUOTING.test(value)
}

const escapeWithSingleQuotes = (value: string) => {
  return "'" + value.replace(/'/g, "''") + "'";
}

class Pattern {
  public regex: RegExp
  constructor(rawRegex: string, modifiers = '') {
    const cleanedRegex = this.cleanUpRegExp(rawRegex);
    this.regex = new RegExp(cleanedRegex, 'g' + modifiers.replace('g', ''));
  }

  private cleanUpRegExp(rawRegex: string) {
    var _char, capturingBracketNumber, cleanedRegex, i, len, name, part, subChar;
    cleanedRegex = '';
    len = rawRegex.length;
    let mapping: any = null;
    // Cleanup raw regex and compute mapping
    capturingBracketNumber = 0;
    i = 0;
    while (i < len) {
      _char = rawRegex.charAt(i);
      if (_char === '\\') {
        // Ignore next character
        cleanedRegex += rawRegex.slice(i, +(i + 1) + 1 || 9e9);
        i++;
      } else if (_char === '(') {
        // Increase bracket number, only if it is capturing
        if (i < len - 2) {
          part = rawRegex.slice(i, +(i + 2) + 1 || 9e9);
          if (part === '(?:') {
            // Non-capturing bracket
            i += 2;
            cleanedRegex += part;
          } else if (part === '(?<') {
            // Capturing bracket with possibly a name
            capturingBracketNumber++;
            i += 2;
            name = '';
            while (i + 1 < len) {
              subChar = rawRegex.charAt(i + 1);
              if (subChar === '>') {
                cleanedRegex += '(';
                i++;
                if (name.length > 0) {
                  // Associate a name with a capturing bracket number
                  if (mapping == null) {
                    mapping = {};
                  }
                  mapping[name] = capturingBracketNumber;
                }
                break;
              } else {
                name += subChar;
              }
              i++;
            }
          } else {
            cleanedRegex += _char;
            capturingBracketNumber++;
          }
        } else {
          cleanedRegex += _char;
        }
      } else {
        cleanedRegex += _char;
      }
      i++;
    }

    return cleanedRegex
  }

  test(str: string) {
    this.regex.lastIndex = 0;
    return this.regex.test(str);
  }

  replace(str: string, replacement: (str: string) => string) {
    return str.replace(this.regex, replacement);
  }
}

const PATTERN_MAPPING_ESCAPEES = new Pattern(LIST_ESCAPEES.join('|').split('\\').join('\\\\'));
const PATTERN_CHARACTERS_TO_ESCAPE = new Pattern('[\\x00-\\x1f]|\xc2\x85|\xc2\xa0|\xe2\x80\xa8|\xe2\x80\xa9');
const PATTERN_SINGLE_QUOTING = new Pattern('[\\s\'":{}[\\],&*#?]|^[-?|<>=!%@`]');
const PATTERN_DATE = new Pattern('^' + '(?<year>[0-9][0-9][0-9][0-9])' + '-(?<month>[0-9][0-9]?)' + '-(?<day>[0-9][0-9]?)' + '(?:(?:[Tt]|[ \t]+)' + '(?<hour>[0-9][0-9]?)' + ':(?<minute>[0-9][0-9])' + ':(?<second>[0-9][0-9])' + '(?:\.(?<fraction>[0-9]*))?' + '(?:[ \t]*(?<tz>Z|(?<tz_sign>[-+])(?<tz_hour>[0-9][0-9]?)' + '(?::(?<tz_minute>[0-9][0-9]))?))?)?' + '$', 'i')