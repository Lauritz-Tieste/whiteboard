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

function getItemText(container: HTMLElement): string | null {
	const lockInput = container.querySelector('[data-testid="toolbar-lock"]')
	if (lockInput) {
		return lockInput.getAttribute('aria-label')
	}
	const button = container.querySelector('.dropdown-menu-button')
	return button?.getAttribute('title') ?? button?.getAttribute('aria-label') ?? null
}

function ensureItemLabel(container: HTMLElement) {
	if (container.querySelector('.dropdown-menu-item__text')) {
		return
	}
	const text = getItemText(container)
	if (!text) {
		return
	}
	const span = document.createElement('span')
	span.className = 'dropdown-menu-item__text'
	span.textContent = text
	container.appendChild(span)
}

function moveButtonsIntoDropdown(dropdown: HTMLElement) {
	const container = dropdown.querySelector<HTMLElement>('.dropdown-menu-container') ?? dropdown
	const laserItem = container.querySelector('[data-testid="toolbar-laser"]')
	let insertPoint: ChildNode | null = laserItem?.nextSibling ?? null

	const moveInto = (button: HTMLElement) => {
		if (insertPoint) {
			container.insertBefore(button, insertPoint)
		} else {
			container.appendChild(button)
		}
		insertPoint = button.nextSibling
	}

	const buttons = Array.from(document.querySelectorAll<HTMLElement>(EXTRA_TOOLS_BUTTON_SELECTOR))
	buttons.forEach(button => {
		moveInto(button)
		movedButtons.push(button)
		ensureItemLabel(button)
	})

	const lock = getLockButton()
	if (lock) {
		if (!movedLockButton) {
			movedLockRestore = { parent: lock.parentNode as HTMLElement, nextSibling: lock.nextSibling }
			movedLockButton = lock
		}
		moveInto(movedLockButton)
		ensureItemLabel(movedLockButton)
	}
}

function positionDropdownForDockedRight(dropdown: HTMLElement) {
	if (!document.querySelector('.whiteboard-toolbar-right')) {
		return
	}
	const trigger = document.querySelector('.App-toolbar__extra-tools-trigger')
	if (!trigger) {
		return
	}
	// The toolbar section has a transform and clips its content, so move the
	// menu under the .excalidraw root (keeps CSS variables, no clipping) and
	// anchor it to the trigger to make it usable.
	const excalidraw = document.querySelector('.excalidraw')
	if (!excalidraw) {
		return
	}
	if (dropdown.parentNode !== excalidraw) {
		excalidraw.appendChild(dropdown)
	}
	const rect = trigger.getBoundingClientRect()
	dropdown.style.position = 'fixed'
	dropdown.style.top = 'auto'
	dropdown.style.left = 'auto'
	dropdown.style.bottom = `${Math.round(window.innerHeight - rect.bottom)}px`
	dropdown.style.right = `${Math.round(window.innerWidth - rect.right)}px`
	dropdown.style.marginTop = '0'
	dropdown.style.zIndex = '1000'
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
			positionDropdownForDockedRight(dropdown)
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
