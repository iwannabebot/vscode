/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/panelpart';
import nls = require('vs/nls');
import { TPromise } from 'vs/base/common/winjs.base';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { KeyMod, KeyCode } from 'vs/base/common/keyCodes';
import { Action } from 'vs/base/common/actions';
import { Registry } from 'vs/platform/registry/common/platform';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { IWorkbenchActionRegistry, Extensions as WorkbenchExtensions } from 'vs/workbench/common/actions';
import { IPanelService, IPanelIdentifier } from 'vs/workbench/services/panel/common/panelService';
import { IPartService, Parts, Position } from 'vs/workbench/services/part/common/partService';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { ActivityAction } from 'vs/workbench/browser/parts/compositebar/compositeBarActions';
import { IActivity } from 'vs/workbench/common/activity';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';

export class OpenPanelAction extends Action {

	constructor(
		private panel: IPanelIdentifier,
		@IKeybindingService private keybindingService: IKeybindingService,
		@IPanelService private panelService: IPanelService
	) {
		super(panel.id, panel.name);

		this.tooltip = nls.localize('panelActionTooltip', "{0} ({1})", panel.name, this.getKeybindingLabel(panel.commandId));
	}

	public run(event: any): TPromise<any> {
		return this.panelService.openPanel(this.panel.id, true).then(() => this.activate());
	}

	public activate(): void {
		if (!this.checked) {
			this._setChecked(true);
		}
	}

	public deactivate(): void {
		if (this.checked) {
			this._setChecked(false);
		}
	}

	private getKeybindingLabel(id: string): string {
		const keys = this.keybindingService.lookupKeybinding(id);

		return keys ? keys.getLabel() : '';
	}
}

export class ClosePanelAction extends Action {
	static ID = 'workbench.action.closePanel';
	static LABEL = nls.localize('closePanel', "Close Panel");

	constructor(
		id: string,
		name: string,
		@IPartService private partService: IPartService
	) {
		super(id, name, 'hide-panel-action');
	}

	public run(): TPromise<any> {
		return this.partService.setPanelHidden(true);
	}
}

export class TogglePanelAction extends Action {
	static ID = 'workbench.action.togglePanel';
	static LABEL = nls.localize('togglePanel', "Toggle Panel");

	constructor(
		id: string,
		name: string,
		@IPartService private partService: IPartService
	) {
		super(id, name, partService.isVisible(Parts.PANEL_PART) ? 'panel expanded' : 'panel');
	}

	public run(): TPromise<any> {
		return this.partService.setPanelHidden(this.partService.isVisible(Parts.PANEL_PART));
	}
}

class FocusPanelAction extends Action {

	public static ID = 'workbench.action.focusPanel';
	public static LABEL = nls.localize('focusPanel', "Focus into Panel");

	constructor(
		id: string,
		label: string,
		@IPanelService private panelService: IPanelService,
		@IPartService private partService: IPartService
	) {
		super(id, label);
	}

	public run(): TPromise<any> {

		// Show panel
		if (!this.partService.isVisible(Parts.PANEL_PART)) {
			return this.partService.setPanelHidden(false);
		}

		// Focus into active panel
		let panel = this.panelService.getActivePanel();
		if (panel) {
			panel.focus();
		}
		return TPromise.as(true);
	}
}

export class TogglePanelPositionAction extends Action {

	public static ID = 'workbench.action.togglePanelPosition';
	public static LABEL = nls.localize('toggledPanelPosition', "Toggle Panel Position");
	private static MOVE_TO_RIGHT_LABEL = nls.localize('moveToRight', "Move to Right");
	private static MOVE_TO_BOTTOM_LABEL = nls.localize('moveToBottom', "Move to Bottom");
	private static panelPositionConfigurationKey = 'workbench.panel.location';
	private toDispose: IDisposable[];

	constructor(
		id: string,
		label: string,
		@IPartService private partService: IPartService,
		@IConfigurationService private configurationService: IConfigurationService

	) {
		super(id, label, partService.getPanelPosition() === Position.RIGHT ? 'move-panel-to-bottom' : 'move-panel-to-right');
		this.toDispose = [];
		this.toDispose.push(partService.onEditorLayout(() => {
			const positionRight = this.partService.getPanelPosition() === Position.RIGHT;
			this.class = positionRight ? 'move-panel-to-bottom' : 'move-panel-to-right';
			this.label = positionRight ? TogglePanelPositionAction.MOVE_TO_BOTTOM_LABEL : TogglePanelPositionAction.MOVE_TO_RIGHT_LABEL;
		}));
	}

	public run(): TPromise<any> {
		const position = this.partService.getPanelPosition();
		const newPositionValue = (position === Position.BOTTOM) ? 'right' : 'bottom';

		return this.configurationService.updateValue(TogglePanelPositionAction.panelPositionConfigurationKey, newPositionValue, ConfigurationTarget.USER);
	}

	public dispose(): void {
		super.dispose();
		this.toDispose = dispose(this.toDispose);
	}
}

class ToggleMaximizedPanelAction extends TogglePanelPositionAction {
	public static ID = 'workbench.action.toggleMaximizedPanel';
}

export class PanelActivityAction extends ActivityAction {

	constructor(
		activity: IActivity,
		@IPanelService private panelService: IPanelService
	) {
		super(activity);
	}

	public run(event: any): TPromise<any> {
		return this.panelService.openPanel(this.activity.id, true).then(() => this.activate());
	}
}

const actionRegistry = Registry.as<IWorkbenchActionRegistry>(WorkbenchExtensions.WorkbenchActions);
actionRegistry.registerWorkbenchAction(new SyncActionDescriptor(TogglePanelAction, TogglePanelAction.ID, TogglePanelAction.LABEL, { primary: KeyMod.CtrlCmd | KeyCode.KEY_J }), 'View: Toggle Panel', nls.localize('view', "View"));
actionRegistry.registerWorkbenchAction(new SyncActionDescriptor(FocusPanelAction, FocusPanelAction.ID, FocusPanelAction.LABEL), 'View: Focus into Panel', nls.localize('view', "View"));
actionRegistry.registerWorkbenchAction(new SyncActionDescriptor(ClosePanelAction, ClosePanelAction.ID, ClosePanelAction.LABEL), 'View: Close Panel', nls.localize('view', "View"));
actionRegistry.registerWorkbenchAction(new SyncActionDescriptor(TogglePanelPositionAction, TogglePanelPositionAction.ID, TogglePanelPositionAction.LABEL), 'View: Toggle Panel Position', nls.localize('view', "View"));
actionRegistry.registerWorkbenchAction(new SyncActionDescriptor(ToggleMaximizedPanelAction, ToggleMaximizedPanelAction.ID, undefined), 'View: Toggle Panel Position', nls.localize('view', "View"));
