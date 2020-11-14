/**
 * @description 无序列表/有序列表
 * @author tonghan
 */

import $, { DomElement } from '../../utils/dom-core'
import Editor from '../../editor/index'
import DropListMenu from '../menu-constructors/DropListMenu'
import { MenuActive } from '../menu-constructors/Menu'

/**
 * 列表的种类
 */
export enum ListType {
    OrderedList = 'OL',
    UnorderedList = 'UL',
}

// 序列类型
type ListTypeValue = ListType

class List extends DropListMenu implements MenuActive {
    constructor(editor: Editor) {
        const $elem = $(
            `<div class="w-e-menu">
                <i class="w-e-icon-list2"></i>
            </div>`
        )

        const dropListConf = {
            width: 130,
            title: '序列',
            type: 'list',
            list: [
                {
                    $elem: $(`
                        <p>
                            <i class="w-e-icon-list2 w-e-drop-list-item"></i>
                            ${editor.i18next.t('menus.dropListMenu.list.无序列表')}
                        <p>`),
                    value: ListType.UnorderedList,
                },

                {
                    $elem: $(
                        `<p>
                            <i class="w-e-icon-list-numbered w-e-drop-list-item"></i>
                            ${editor.i18next.t('menus.dropListMenu.list.有序列表')}
                        <p>`
                    ),
                    value: ListType.OrderedList,
                },
            ],
            clickHandler: (value: string) => {
                // 注意 this 是指向当前的 List 对象
                this.command(value as ListTypeValue)
            },
        }

        super($elem, editor, dropListConf)

        const events = editor.events
        // events.on('hook:keydown:enter', function (e: Event) {
        //     console.log(e)
        //     return false
        // })

        events.on('hook:keyup:enter', (e: Event) => {
            // 获取选区范围内的顶级 DOM 元素
            const $node = editor.selection.getSelectionRangeTopNodes()[0]
            if (!$node) return

            const nodeName = $node.getNodeName()
            if (nodeName === ListType.OrderedList || nodeName === ListType.UnorderedList) {
                const $child = $node.children() as DomElement
                const $prve = $child.get(0)
                const $curr = $child.get(1)
                const prveText = $prve.text()
                const currText = $curr.text()

                const reg = /(\s+)|(<br.*?>)|(&nbsp;+)|(&#8203;+)/gim

                if (prveText.replace(reg, '').length) {
                    const $list = $(
                        `<${nodeName} data-list-level="${$node.attr('data-list-level')}">
                            <li>${$curr.html()}</li>
                        </${nodeName}>`
                    )
                    $list.insertAfter($node)
                    this.updateRange($list)
                }

                $curr.remove()

                this.resetListAttr()
            }
        })

        events.on('hook:keydown:tab', (e: Event) => {
            // 获取选区范围内的顶级 DOM 元素
            const $node = editor.selection.getSelectionRangeTopNodes()[0]
            if (!$node) return

            const nodeName = $node.getNodeName()
            // if (nodeName === ListType.OrderedList || nodeName === ListType.UnorderedList) {
            //     debugger
            // }
        })
    }

    public command(type: ListTypeValue): void {
        const editor = this.editor
        const $textElem = editor.$textElem
        const $selectionElem = editor.selection.getSelectionContainerElem()

        // 选区范围的 DOM 元素不存在，不执行命令
        if ($selectionElem === undefined) return

        // 获取选区范围内的顶级 DOM 元素
        const $nodes = editor.selection.getSelectionRangeTopNodes()

        this.operateElements($nodes, type)

        // 恢复选区
        editor.selection.restoreSelection()
        this.tryChangeActive()
    }

    public tryChangeActive(): void {}

    // 操作元素
    private operateElements($nodes: DomElement[], type: ListTypeValue) {
        /**
         * 列表的每一项都是独立的通过 type 决定 list-style 的样式
         * 有序列表通过 start 决定起始值
         * 列表的层级通过 data-list-level 来决定 但是这样就需要用户配置 css 那么属性要加 style 也要加
         *
         * 多段落的时候 优先处理 非序列段落，只有序列段落的时候 进行取消操作
         *
         **/

        // 获取 序列标签
        const listHtml = type.toLowerCase()

        // 筛选 选区带非序列
        const $notLiHtml = $nodes.filter(($node: DomElement) => {
            const targerName = $node.getNodeName()
            if (targerName !== ListType.OrderedList && targerName !== ListType.UnorderedList) {
                return $node
            }
        })

        if ($notLiHtml.length) {
            // 处理 多段落带非序列标签
            // const $docFragment = document.createDocumentFragment()
            $notLiHtml.forEach(($node: DomElement, index: number) => {
                const $list = $(
                    `<${listHtml} data-list-level="1">
                        <li>${$node.html()}</li>
                    </${listHtml}>`
                )
                $list.insertAfter($node)
                $node.remove()
                this.updateRange($list)
            })
        } else {
            // 处理 序列标签
            $nodes.forEach(($node: DomElement, index: number) => {
                if ($node.getNodeName() === type) {
                    const $li = $node.children()
                    const $p = $(`<p>${$li?.html()}</p>`)
                    $p.insertAfter($node)
                    $node.remove()
                    this.updateRange($p)
                } else {
                    const $list = $(
                        `<${listHtml} data-list-level="${$node.attr('data-list-level')}">
                            ${$node.html()}
                        </${listHtml}>`
                    )
                    $list.insertAfter($node)
                    $node.remove()
                    this.updateRange($list)
                }
            })
        }

        // 重置 序列属性
        this.resetListAttr()
    }

    /**
     * 获取编辑区域的所有顶级段落，并对其中的序列进行处理
     */
    private resetListAttr() {
        const editor = this.editor
        const $nodes = editor.$textElem.children() as DomElement
        let i = 1
        $nodes.forEach(($node: HTMLElement) => {
            const _$node = $($node)
            const $child = _$node.children() as DomElement
            const nodeName = _$node.getNodeName()

            if (nodeName === ListType.OrderedList) {
                _$node.attr('start', i.toString())
                i += $child.length
            } else {
                i = 1
            }
        })
    }

    /**
     * 更新选区
     * @param $node
     */
    private updateRange($node: DomElement) {
        this.editor.selection.createRangeByElem($node, false, true)
        this.editor.selection.restoreSelection()
    }
}

export default List
