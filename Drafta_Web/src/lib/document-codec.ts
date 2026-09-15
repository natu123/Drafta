import type { JSONContent } from '@tiptap/core';
import { DOMParser, DOMSerializer } from '@tiptap/pm/model';
import { documentSchema } from '@/components/tiptap-extensions/document-schema';

export const DOCUMENT_SCHEMA_VERSION = 1 as const;

export type SerializedEditorDocument = {
  format: 'drafta-document';
  schemaVersion: typeof DOCUMENT_SCHEMA_VERSION;
  document: JSONContent;
};

/**
 * Internal conversion for app-produced editor content, not a file-import sanitizer.
 * An explicit DOM document keeps browser access out of module initialization.
 */
export function editorHtmlToDocument(html: string, dom: Document): SerializedEditorDocument {
  const template = dom.createElement('template');
  template.innerHTML = html;
  // DOM serialization canonicalizes CSS (for example hex colors become rgb()).
  // Apply that normalization before parsing so repeated round-trips are stable.
  template.content.querySelectorAll<HTMLElement>('[style]').forEach(element => {
    element.setAttribute('style', element.style.cssText);
  });
  const node = DOMParser.fromSchema(documentSchema).parse(template.content);
  node.check();
  return { format: 'drafta-document', schemaVersion: DOCUMENT_SCHEMA_VERSION, document: node.toJSON() };
}

/** Validates structural schema compatibility, not trustworthiness of URLs or attrs. */
export function editorDocumentToHtml(value: SerializedEditorDocument, dom: Document): string {
  if (value.format !== 'drafta-document' || value.schemaVersion !== DOCUMENT_SCHEMA_VERSION) {
    throw new Error('Unsupported Drafta document format or schema version');
  }
  const node = documentSchema.nodeFromJSON(value.document);
  if (node.type !== documentSchema.topNodeType) throw new Error('Expected a complete Drafta document');
  node.check();
  const template = dom.createElement('template');
  template.content.appendChild(DOMSerializer.fromSchema(documentSchema).serializeFragment(node.content, { document: dom }));
  return template.innerHTML;
}
