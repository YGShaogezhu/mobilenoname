/**
 * Dialog覆写模块
 */
import { lib, ui, _status } from "noname";
import { wrapBefore } from "../utils/safeOverride.js";
import { tryEnhanceSkillCardDialog, lockPlayerCardDialogPlacement, syncPlayerCardDialogConfirmUi } from "./player-card-dialog.js";

export function applyDialogOverrides() {
	const restoreFns = [];

	if (lib.element?.dialog) {
		restoreFns.push(
			wrapBefore(lib.element.dialog, "close", function () {
				if (this.intersection) {
					this.intersection.disconnect();
					this.intersection = undefined;
				}
				requestAnimationFrame(() => syncPlayerCardDialogConfirmUi());
			})
		);
	}

	return restoreFns;
}

/**
 * 选牌框开场：只淡入，不动 transform
 * @param {HTMLElement} dialog
 */
function applyDialogOpenAnimation(dialog) {
	if (!dialog?.classList || dialog.classList.contains("prompt")) return;
	if (dialog.classList.contains("dui-player-card-dialog")) {
		dialog.style.animation = "open-dialog-dui-pcd 0.35s ease";
	} else {
		dialog.style.animation = "open-dialog 0.5s";
	}
}

/**
 * chooseToMove_new：引擎先 ui.create.dialog() 自动 open，再 addNewRow，最后才正式 open。
 * 第一次打开时还没有牌区，绝不能显示/美化，否则会先出现在默认底部再跳位。
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isPrematureChooseToMoveOpen(dialog) {
	if (dialog.classList?.contains("addNewRow")) return false;
	if (dialog.querySelector?.(".row-container, .buttons.popup.guanxing")) return false;
	const event = _status?.event;
	return event?.name === "chooseToMove_new" || event?.name === "chooseToMove";
}

/**
 * 打开后尽量套上手杀选牌框（攻心等二次 open / 异步建行时兜底）
 * @param {HTMLElement} dialog
 */
function ensurePlayerCardDialogEnhanced(dialog) {
	const attempt = () => {
		if (!dialog?.classList || !dialog.isConnected) return;
		try {
			tryEnhanceSkillCardDialog(dialog);
		} catch (e) {}
		if (dialog.classList.contains("dui-player-card-dialog")) {
			lockPlayerCardDialogPlacement(dialog);
		}
	};
	attempt();
	if (dialog.dataset.duiPlayerCardDialog === "1") return;
	if (!dialog.classList.contains("addNewRow") && !dialog.querySelector?.(".buttons.popup.guanxing")) return;
	requestAnimationFrame(() => {
		attempt();
		if (dialog.dataset.duiPlayerCardDialog === "1") return;
		requestAnimationFrame(attempt);
	});
}

/**
 * 新选牌框打开时，彻底藏起其它选牌框，避免半透明 tittle_bg 叠层出现 1px 切割线
 * @param {HTMLElement} dialog
 */
function hideOtherPlayerCardDialogs(dialog) {
	for (const other of ui.dialogs || []) {
		if (!other || other === dialog) continue;
		if (!other.classList?.contains("dui-player-card-dialog")) continue;
		other.hide?.();
	}
}

/**
 * 隐藏至布局稳定后再显示，避免默认 top/fullheight 闪一帧
 * @param {HTMLElement} dialog
 */
function revealDialogWhenReady(dialog) {
	const reveal = () => {
		if (!dialog?.classList) return;
		if (dialog.classList.contains("dui-pcd-defer-reveal")) return;
		ensurePlayerCardDialogEnhanced(dialog);
		lockPlayerCardDialogPlacement(dialog);
		dialog.classList.remove("dui-pcd-opening");
		applyDialogOpenAnimation(dialog);
		syncPlayerCardDialogConfirmUi();
	};
	requestAnimationFrame(() => requestAnimationFrame(reveal));
}

/**
 * 挂到 arena（或仅刷新），保持 opening，不淡入
 * @param {HTMLElement} dialog
 * @param {{ alreadyMounted?: boolean }} [opts]
 */
function mountDialogHidden(dialog, opts = {}) {
	dialog.classList.add("dui-pcd-opening", "dui-pcd-defer-reveal");
	if (!opts.alreadyMounted) {
		ui.dialog = dialog;
		ui.arena.appendChild(dialog);
		ui.dialogs.unshift(dialog);
	} else {
		dialog.show?.();
		dialog.refocus?.();
		ui.dialogs.remove(dialog);
		ui.dialogs.unshift(dialog);
	}
	ui.update();
}

/**
 * 选将阶段不走选牌框 opening 流程（dui-pcd-opening 会禁用 pointer-events）
 * @returns {boolean}
 */
function isChooseCharacterPhase() {
	return ui.arena?.classList?.contains("choose-character");
}

/**
 * 判定框专用 open：不走选牌框 dui-pcd-opening 淡入，避免连续判定闪烁
 * @param {HTMLElement} dialog
 */
function openJudgeBoxDialog(dialog) {
	if (!dialog || dialog.noopen) return dialog;
	const alreadyMounted = ui.dialogs.includes(dialog);
	if (!alreadyMounted) {
		ui.arena.appendChild(dialog);
		ui.dialogs.unshift(dialog);
	}
	dialog.classList.remove("hidden", "dui-pcd-opening", "dui-pcd-defer-reveal", "dui-pcd-collapsed");
	dialog.classList.add("dui-judge-stable");
	dialog.show();
	if (dialog.style) {
		dialog.style.opacity = "1";
		dialog.style.visibility = "visible";
	}
	return dialog;
}

/**
 * dialog.open 完全替换
 */
export function dialogOpen() {
	if (this.noopen) return;

	if (this.id === "judgeBox" || this.classList?.contains("dui-judge-box")) {
		return openJudgeBoxDialog(this);
	}

	const skipPcdOpen = isChooseCharacterPhase();

	for (let i = 0; i < ui.dialogs.length; i++) {
		if (ui.dialogs[i] === this) {
			if (skipPcdOpen) {
				this.classList.remove("dui-pcd-opening", "dui-pcd-defer-reveal", "hidden");
				this.show();
				this.refocus();
				ui.dialogs.remove(this);
				ui.dialogs.unshift(this);
				ui.update();
				return this;
			}
			// 正式二次 open：取消推迟，美化后淡入
			this.classList.remove("dui-pcd-defer-reveal", "hidden");
			this.classList.add("dui-pcd-opening");
			ensurePlayerCardDialogEnhanced(this);
			lockPlayerCardDialogPlacement(this);
			this.show();
			this.refocus();
			ui.dialogs.remove(this);
			ui.dialogs.unshift(this);
			hideOtherPlayerCardDialogs(this);
			ui.update();
			lockPlayerCardDialogPlacement(this);
			revealDialogWhenReady(this);
			return this;
		}
		if (!this.peaceDialog) {
			if (ui.dialogs[i].static) {
				ui.dialogs[i].unfocus();
			} else {
				ui.dialogs[i].hide();
			}
		}
	}

	// chooseToMove_new 的空壳首次 open：只挂 DOM，保持隐藏，等 addNewRow 后再 open
	if (isPrematureChooseToMoveOpen(this)) {
		mountDialogHidden(this);
		return this;
	}

	if (skipPcdOpen) {
		this.classList.remove("dui-pcd-opening", "dui-pcd-defer-reveal", "hidden");
		ui.dialog = this;
		ui.arena.appendChild(this);
		ui.dialogs.unshift(this);
		ui.update();
		return this;
	}

	// 先隐藏 → 美化 → 钉位置 → 再挂到 arena
	this.classList.remove("dui-pcd-defer-reveal", "hidden");
	this.classList.add("dui-pcd-opening");
	ensurePlayerCardDialogEnhanced(this);
	lockPlayerCardDialogPlacement(this);

	ui.dialog = this;
	ui.arena.appendChild(this);
	ui.dialogs.unshift(this);
	hideOtherPlayerCardDialogs(this);
	ui.update();
	lockPlayerCardDialogPlacement(this);
	revealDialogWhenReady(this);

	return this;
}
