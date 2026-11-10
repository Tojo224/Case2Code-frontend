import { describe, expect, it } from 'vitest';
import { tokenizeBlocks, tokenizeInline } from './markdownTokens';

describe('tokenizeInline', () => {
  it('turns **x** into bold and `x` into code', () => {
    expect(tokenizeInline('Usá **Pair Dev** y `@ai hacelo`')).toEqual([
      { kind: 'text', value: 'Usá ' },
      { kind: 'bold', value: 'Pair Dev' },
      { kind: 'text', value: ' y ' },
      { kind: 'code', value: '@ai hacelo' },
    ]);
  });

  it('leaves stray asterisks and unmatched markers as plain text', () => {
    expect(tokenizeInline('relación 1 : * y **sin cierre')).toEqual([
      { kind: 'text', value: 'relación 1 : * y **sin cierre' },
    ]);
  });

  it('never produces HTML: markup stays literal text', () => {
    expect(tokenizeInline('<b>hola</b>')).toEqual([{ kind: 'text', value: '<b>hola</b>' }]);
  });
});

describe('tokenizeBlocks', () => {
  it('recognises headings, bullets, numbered items, blanks and paragraphs', () => {
    const blocks = tokenizeBlocks('## Título\n- uno\n* dos\n1. paso\n\nTexto');
    expect(blocks).toEqual([
      { kind: 'heading', text: 'Título' },
      { kind: 'bullet', text: 'uno' },
      { kind: 'bullet', text: 'dos' },
      { kind: 'numbered', marker: '1.', text: 'paso' },
      { kind: 'blank' },
      { kind: 'paragraph', text: 'Texto' },
    ]);
  });

  it('does not treat "**negrita** al inicio" as a bullet', () => {
    expect(tokenizeBlocks('**Holograma** listo')).toEqual([{ kind: 'paragraph', text: '**Holograma** listo' }]);
  });
});
