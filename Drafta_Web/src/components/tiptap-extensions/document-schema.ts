import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { TitleDocument } from './title-document';
import { Title } from './title-node';
import { PreserveBody } from './preserve-body';
import { CustomListItem } from './custom-list-item';
import { CustomOrderedList } from './custom-ordered-list';

// One definition for editing and document serialization. Keep extension order stable.
export const documentExtensions = [
  TitleDocument,
  Title,
  PreserveBody,
  StarterKit.configure({
    document: false,
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    listItem: false,
    orderedList: false,
  }),
  CustomListItem,
  CustomOrderedList,
  CodeBlockLowlight.configure({ lowlight: createLowlight(all), defaultLanguage: 'plaintext' }),
  TextStyle,
  Color.configure({ types: ['textStyle'] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
];

export const documentSchema = getSchema(documentExtensions);
