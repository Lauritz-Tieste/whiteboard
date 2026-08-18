/**
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createRoot, type Root } from 'react-dom/client'
import { Icon } from '@mdi/react'
import { useExcalidrawStore } from '../stores/useExcalidrawStore'
import type { ExcalidrawImperativeAPI } from '@nextcloud/excalidraw/dist/types/excalidraw/types'

interface ToolbarButtonConfig {
	class: string
	buttonClass?: string
	icon?: string
	label?: string
	onClick?: () => void
	customContainer?: (container: HTMLElement) => void
}

export function resetActiveTool() {
	const excalidrawApi = useExcalidrawStore.getState().excalidrawAPI as ExcalidrawImperativeAPI | null
	if (excalidrawApi) {
		excalidrawApi.setActiveTool({ type: 'selection' })
	}
}

// Tools that are rendered into the main toolbar but should live inside
// Excalidraw's extra-tools ("Weitere Werkzeuge") dropdown instead.
const EXTRA_TOOLS_BUTTON_SELECTOR = '.smart-picker-container, .comment-container, .emoji-picker-container, .table-container'

let extraToolsObserver: MutationObserver | null = null
let isExtraToolsDropdownOpen = false
let movedButtons: HTMLElement[] = []
let movedLockButton: HTMLElement | null = null
let movedLockRestore: { parent: HTMLElement, nextSibling: ChildNode | null } | null = null

function getExtraToolsDropdown(): HTMLElement | null {
	return document.querySelector('.App-toolbar__extra-tools-dropdown')
}

function getLockButton(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-testid="toolbar-lock"]')?.closest('label') ?? null
}

function moveButtonsIntoDropdown(dropdown: HTMLElement) {
	const buttons = Array.from(document.querySelectorAll<HTMLElement>(EXTRA_TOOLS_BUTTON_SELECTOR))
	buttons.forEach(button => {
		dropdown.appendChild(button)
		movedButtons.push(button)
	})

	const lock = getLockButton()
	if (lock) {
		if (!movedLockButton) {
			movedLockRestore = { parent: lock.parentNode as HTMLElement, nextSibling: lock.nextSibling }
			movedLockButton = lock
		}
		dropdown.appendChild(movedLockButton)
	}
}

function restoreButtonsToToolbar() {
	const extraToolsTrigger = document.querySelector('.App-toolbar__extra-tools-trigger')
	movedButtons.forEach(button => {
		if (!button.isConnected && extraToolsTrigger?.parentNode) {
			extraToolsTrigger.parentNode.insertBefore(button, extraToolsTrigger)
		}
	})
	movedButtons = []

	if (movedLockButton && movedLockRestore && !movedLockButton.isConnected) {
		if (movedLockRestore.nextSibling && movedLockRestore.nextSibling.parentNode === movedLockRestore.parent) {
			movedLockRestore.parent.insertBefore(movedLockButton, movedLockRestore.nextSibling)
		} else {
			movedLockRestore.parent.appendChild(movedLockButton)
		}
	}
	movedLockButton = null
	movedLockRestore = null
}

function ensureExtraToolsObserver() {
	if (extraToolsObserver) {
		return
	}

	extraToolsObserver = new MutationObserver(() => {
		const dropdown = getExtraToolsDropdown()
		if (dropdown && !isExtraToolsDropdownOpen) {
			isExtraToolsDropdownOpen = true
			moveButtonsIntoDropdown(dropdown)
		} else if (!dropdown && isExtraToolsDropdownOpen) {
			isExtraToolsDropdownOpen = false
			restoreButtonsToToolbar()
		}
	})
	extraToolsObserver.observe(document.body, { childList: true, subtree: true })
}

export function renderToolbarButton(config: ToolbarButtonConfig): Root | null {
	if (document.querySelector(`.${config.class}`)) {
		return null
	}

	const extraToolsTrigger = document.querySelector('.App-toolbar__extra-tools-trigger')
	if (!extraToolsTrigger?.parentNode) {
		return null
	}

	ensureExtraToolsObserver()

	const container = document.createElement('label')
	container.classList.add('ToolIcon', 'Shape', config.class)
	extraToolsTrigger.parentNode.insertBefore(container, extraToolsTrigger)

	if (config.customContainer) {
		config.customContainer(container)
		return null
	}

	const handleClick = () => {
		resetActiveTool()
		config.onClick?.()
	}

	const root = createRoot(container)
	root.render(
		<button
			className={`dropdown-menu-button ${config.buttonClass || ''}`}
			aria-label={config.label}
			onClick={handleClick}
			title={config.label}>
			<Icon path={config.icon} size={1} />
		</button>,
	)
	return root
}
