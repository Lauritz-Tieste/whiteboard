/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { AppState, ExcalidrawInitialDataState } from '@nextcloud/excalidraw/types/types'

/**
 * Default tool when opening a board: the move (hand) tool instead of the
 * selection (arrow) tool.
 */
export const defaultActiveTool: AppState['activeTool'] = {
	type: 'hand',
	customType: null,
	lastActiveTool: null,
	locked: false,
}

export const initialDataState: ExcalidrawInitialDataState = {
	elements: [],
	appState: {
		currentItemFontFamily: 5,
		currentItemStrokeWidth: 2,
		currentItemRoughness: 1,
		currentItemFillStyle: 'solid',
		currentItemRoundness: 'round',
		activeTool: defaultActiveTool,
	},
	files: {},
}
