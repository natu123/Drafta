import OrderedList from '@tiptap/extension-ordered-list'

/**
 * CustomOrderedList - orderedList に startFrom 属性を追加
 *
 * startFrom: number
 * - リストの開始番号（作成時に決定、以降は固定）
 * - 新しいリスト: startFrom=1
 * - 続きの番号: 作成時に前のリストから計算した値を設定
 */
export const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      startFrom: {
        default: 1,
        parseHTML: element => {
          const start = element.getAttribute('start')
          return start ? parseInt(start, 10) : 1
        },
        renderHTML: attributes => {
          const startFrom = attributes.startFrom ?? 1
          return {
            start: startFrom,
          }
        },
      },
    }
  },
})
