import ListItem from '@tiptap/extension-list-item'

/**
 * CustomListItem - listItem に value 属性を追加
 *
 * value: number - 表示する番号（renumberAllOrderedLists で自動設定）
 */
export const CustomListItem = ListItem.extend({
  name: 'listItem',
  addAttributes() {
    return {
      ...this.parent?.(),
      value: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute('value')
          return value ? parseInt(value, 10) : null
        },
        renderHTML: attributes => {
          if (attributes.value === null || attributes.value === undefined) {
            return {}
          }
          return {
            value: attributes.value,
            style: `--li-value: ${attributes.value}`
          }
        },
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),

      // Enter: 空アイテムなら段落を挿入してリストを分割（ナンバリングは継続）
      Enter: ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        // リスト内にいるか確認
        let listItemDepth = -1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'listItem') {
            listItemDepth = d
            break
          }
        }

        if (listItemDepth > 0) {
          const listItem = $from.node(listItemDepth)
          const isEmpty = listItem.textContent === ''

          if (isEmpty) {
            // 空のリストアイテム: リストから抜けて段落に変換
            // liftListItem でリストが分割される
            const result = editor.commands.liftListItem('listItem')

            if (result) {
              // 分割後、後ろのリストの startFrom を 2 に設定して
              // 「続きのリスト」として認識させる（実際の値は renumberAllOrderedLists が計算）
              requestAnimationFrame(() => {
                const { state: newState, view: newView } = editor
                const { doc, selection: newSelection } = newState
                const cursorPos = newSelection.from
                const tr = newState.tr
                let needsUpdate = false

                // カーソル位置より後ろにある最初の orderedList を探す
                let found = false
                doc.descendants((node, pos) => {
                  if (found) return false
                  if (node.type.name === 'orderedList' && pos > cursorPos) {
                    found = true
                    // startFrom を 2 に設定（1以外なら「続きのリスト」として認識される）
                    if (node.attrs.startFrom === 1) {
                      tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        startFrom: 2 // 仮の値、renumberAllOrderedLists が正しい値に更新する
                      })
                      needsUpdate = true
                    }
                    return false
                  }
                })

                if (needsUpdate && tr.docChanged) {
                  newView.dispatch(tr)
                }
              })
            }

            return result
          }
        }

        // 通常: splitListItem でアイテムを分割
        return editor.commands.splitListItem('listItem')
      },

      // Backspace: リストアイテムの先頭でマージ
      Backspace: ({ editor }) => {
        const isOL = editor.isActive('orderedList')
        const isUL = editor.isActive('bulletList')

        if (!isOL && !isUL) {
          return false
        }

        const { state, view } = editor
        const { selection } = state
        const { $from } = selection

        if (!selection.empty) {
          return false
        }

        // Find the current listItem node
        let listItemDepth = -1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'listItem') {
            listItemDepth = d
            break
          }
        }

        if (listItemDepth === -1) {
          return false
        }

        // Check if cursor is at the very start of the listItem's content
        const listItemStart = $from.start(listItemDepth)
        if ($from.pos !== listItemStart + 1) {
          return false
        }

        // Find the parent list
        let listDepth = -1
        for (let d = listItemDepth - 1; d > 0; d--) {
          const nodeName = $from.node(d).type.name
          if (nodeName === 'orderedList' || nodeName === 'bulletList') {
            listDepth = d
            break
          }
        }

        if (listDepth === -1) {
          return false
        }

        const list = $from.node(listDepth)
        const listPos = $from.before(listDepth)

        // Find index of current listItem within the list
        let currentIndex = -1
        list.forEach((node, offset, index) => {
          const itemStart = listPos + 1 + offset
          const itemEnd = itemStart + node.nodeSize
          if ($from.pos >= itemStart && $from.pos <= itemEnd) {
            currentIndex = index
          }
        })

        // 最初のアイテムで空なら段落に変換
        if (currentIndex === 0) {
          const currentItem = list.child(0)
          const isEmpty = currentItem.textContent === ''

          if (isEmpty) {
            return editor.commands.liftListItem('listItem')
          }
          return false
        }

        // 2番目以降のアイテム: 前のアイテムとマージ
        const prevItem = list.child(currentIndex - 1)
        const currentItem = list.child(currentIndex)

        let prevItemPos = listPos + 1
        for (let i = 0; i < currentIndex - 1; i++) {
          prevItemPos += list.child(i).nodeSize
        }
        const currentItemPos = prevItemPos + prevItem.nodeSize
        const currentText = currentItem.textContent

        const prevParagraph = prevItem.firstChild
        if (!prevParagraph) {
          return false
        }

        const insertPos = prevItemPos + 1 + prevParagraph.nodeSize - 1
        const { tr } = state

        if (currentText) {
          tr.insertText(currentText, insertPos)
        }

        const deleteFrom = currentItemPos + currentText.length
        const deleteTo = deleteFrom + currentItem.nodeSize
        tr.delete(deleteFrom, deleteTo)

        view.dispatch(tr)
        // リナンバリングは onUpdate で自動的に行われる
        return true
      },
    }
  },
})
