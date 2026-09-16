/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeOrderedListHtml,
  normalizeOrderedListTags,
  parseColorMarkdown,
  plainMarkdownToRich,
  removeFormatting,
  richToPlainMarkdown,
  stripColorMarkdown,
} from './utils';

describe('fenced code preservation', () => {
  const body = '/* Welcome to Drafta! */\n    .thought {\n      state: brilliant;\n    }';
  const codeText = (markdown: string) => {
    const root = document.createElement('div');
    root.innerHTML = plainMarkdownToRich(markdown);
    expect(root.querySelectorAll('pre')).toHaveLength(1);
    return root.querySelector('pre code')!.textContent;
  };
  it('keeps a shorter inner fence as literal code', () => {
    const inner = '```html\n' + body + '\n```';
    expect(codeText('````css\n' + inner + '\n````')).toBe(inner);
  });
  it.each(['```', '~~~'])('keeps unfinished %s content through EOF', fence => {
    expect(codeText(fence + 'html\n' + body)).toBe(body);
  });
  it.each(['```', '````'])('accepts a matching or longer closing fence %s', close => {
    expect(codeText('```html\n' + body + '\n' + close)).toBe(body);
  });
  it('does not close on a different marker or trailing text', () => {
    const inner = body + '\n~~~\n```html\nstill code';
    expect(codeText('```\n' + inner + '\n```')).toBe(inner);
  });
  it('escapes HTML and preserves code across a Rich/Plain round trip', () => {
    const inner = '```html\n<div title="x">& value</div>\n```';
    const html = plainMarkdownToRich('````\n' + inner + '\n````');
    expect(html).not.toContain('<div');
    expect(codeText(richToPlainMarkdown(html))).toBe(inner);
  });
});

describe('empty Markdown tables', () => {
  it.each([' ', '\u00a0', '\u3000'])('preserves blank rows containing %j', space => {
    const row = `| ${space} | ${space} |`;
    const markdown = [row, '| --- | --- |', row, row].join('\n');
    const html = plainMarkdownToRich(markdown);
    const root = document.createElement('div');root.innerHTML = html;
    expect(root.querySelectorAll('tr')).toHaveLength(3);
    expect(root.querySelectorAll('th')).toHaveLength(2);
    expect(root.querySelectorAll('td')).toHaveLength(4);
    expect(root.querySelectorAll('th > p, td > p')).toHaveLength(6);
    expect(plainMarkdownToRich(richToPlainMarkdown(html))).toBe(html);
  });

  it('does not emit an empty table for a lone delimiter', () => {
    expect(plainMarkdownToRich('| --- | --- |')).not.toContain('<table>');
  });

  it('keeps ordinary hyphens and blank cells as data', () => {
    const root = document.createElement('div');
    root.innerHTML = plainMarkdownToRich('| Key | Value |\n| --- | --- |\n| - | |\n| | - |');
    expect(root.querySelectorAll('tr')).toHaveLength(3);
    expect(Array.from(root.querySelectorAll('td')).map(cell => cell.textContent)).toEqual(['-', '', '', '-']);
  });
});

describe('Drafta-MD color syntax', () => {
  it('extracts and strips a complete color tag', () => {
    const source = '{color:#64A364}Green title{/color}';

    expect(parseColorMarkdown(source)).toEqual({
      color: '#64A364',
      text: 'Green title',
    });
    expect(stripColorMarkdown(source)).toBe('Green title');
  });

  it('leaves untagged text unchanged', () => {
    expect(parseColorMarkdown('Plain title')).toEqual({
      color: null,
      text: 'Plain title',
    });
    expect(stripColorMarkdown('Plain title')).toBe('Plain title');
  });
});

describe('Drafta-MD ordered lists', () => {
  it('normalizes custom tags and indents continuation lines', () => {
    expect(
      normalizeOrderedListTags('{ol:3}Main line\ncontinued{/ol}\n{ol:4}Next[/ol}')
    ).toBe('3. Main line\n    continued\n4. Next');
  });

  it('normalizes list item values without moving backwards', () => {
    const normalized = normalizeOrderedListHtml(
      '<ol start="3"><li><p>Three</p></li><li value="8"><p>Eight</p></li><li value="2"><p>Nine</p></li></ol>'
    );
    const container = document.createElement('div');
    container.innerHTML = normalized;
    const items = Array.from(container.querySelectorAll('li'));

    expect(items.map((item) => item.getAttribute('value'))).toEqual(['3', '8', '9']);
    expect(items.map((item) => item.style.getPropertyValue('--li-value'))).toEqual([
      '3',
      '8',
      '9',
    ]);
  });

  it('keeps an indented continuation inside its ordered list item', () => {
    const rich = plainMarkdownToRich('3. Third\n    detail\n4. Fourth');
    const container = document.createElement('div');
    container.innerHTML = rich;
    const list = container.querySelector('ol');
    const items = Array.from(container.querySelectorAll('li'));

    expect(list?.getAttribute('start')).toBe('3');
    expect(items.map((item) => item.getAttribute('value'))).toEqual(['3', '4']);
    expect(items[0].querySelectorAll('br')).toHaveLength(1);
    expect(items[0].textContent).toBe('Thirddetail');
    expect(items[1].textContent).toBe('Fourth');
  });
});

describe('Rich and Plain conversion', () => {
  it('serializes inline formatting and RGB colors as Drafta-MD', () => {
    const rich = [
      '<p>',
      '<strong>Bold</strong> <em>Italic</em> <s>Gone</s> ',
      '<code>x</code> <span style="color: rgb(100, 163, 100)">Green</span>',
      '</p>',
    ].join('');

    expect(richToPlainMarkdown(rich)).toBe(
      '**Bold** _Italic_ ~~Gone~~ `x` {color:#64a364}Green{/color}'
    );
  });

  it('round-trips headings, task lists, blank lines, and tables', () => {
    const markdown = [
      '# Title',
      '',
      '- [x] Done',
      '- [ ] Todo',
      '',
      '| Key | Value |',
      '| --- | --- |',
      '| A | B |',
    ].join('\n');

    expect(richToPlainMarkdown(plainMarkdownToRich(markdown))).toBe(markdown);
  });

  it('uses a longer fence when code contains triple backticks', () => {
    const markdown = richToPlainMarkdown(
      '<pre><code class="language-js">const fence = ```;</code></pre>'
    );

    expect(markdown).toBe('````js\nconst fence = ```;\n````');
    expect(plainMarkdownToRich(markdown)).toBe(
      '<pre><code class="language-js">const fence = ```;</code></pre>'
    );
  });

  it('removes formatting while preserving visual block boundaries', () => {
    const plain = removeFormatting(
      '<h1>Title</h1><p>Line 1<br>Line 2</p><table><tbody><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>'
    );

    expect(plain).toBe(
      'Title\n\nLine 1\nLine 2\n\n| A | B |\n| --- | --- |\n| 1 | 2 |'
    );
  });
});
