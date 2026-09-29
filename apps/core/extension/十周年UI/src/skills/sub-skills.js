/**
 * @fileoverview 继承子技能模块
 * @description 用于扩展已有技能的子技能
 * @module skills/sub-skills
 */

import { lib, game, ui, get, _status } from "noname";
import { enhanceShoushaVcardDialogFrame } from "../overrides/player-card-dialog.js";
import { syncShoushaFooterLayout } from "../overrides/temp-card.js";

/**
 * @type {Object.<string, Object>}
 * @description 继承子技能集合
 */
export const inheritSubSkill = {
	/**
	 * 自若排序
	 * @description 自若技能的手牌排序子技能
	 */
	olziruo: {
		sort: {
			async content(event, trigger, player) {
				event.getParent(2).goto(0);

				if (_status.connectMode || !event.isMine()) {
					player.tempBanSkill("olziruo_sort", {
						player: ["useCard1", "useSkillBegin", "chooseToUseEnd"],
					});
				}

				const next = player.chooseToMove("自若：请整理手牌顺序", true);
				next.set("list", [["手牌", player.getCards("h")]]);
				next.set("processAI", list => {
					const player = get.player();
					const cards = list[0][1].slice();
					cards.sort((a, b) => get.useful(b, player) - get.useful(a, player));
					if (player.storage.olziruo) cards.reverse();
					return [cards];
				});

				const result = await next.forResult();
				if (!result?.bool) return;

				result.moved[0].reverse().forEach(card => {
					player.node.handcards1.insertBefore(card, player.node.handcards1.firstChild);
				});
				decadeUI.queueNextFrameTick(decadeUI.layoutHand, decadeUI);
			},
		},
	},

	/**
	 * 诈死距离显示控制
	 * @description 控制诈死状态下的距离显示
	 */
	jsrgzhasi: {
		undist: {
			init(player) {
				if (player._distanceDisplay) {
					player._distanceDisplay.style.display = "none";
				}
			},
			onremove(player) {
				if (player._distanceDisplay) {
					player._distanceDisplay.style.display = "";
				}
			},
		},
	},
};

/**
 * 手杀风格选势力对话框
 * @param {Object} player
 * @param {string[]} groups
 * @param {{ isShen?: boolean }} [options]
 * @returns {Promise<string|null>}
 */
async function chooseFactionWithShoushaUI(player, groups, options = {}) {
	const list = (groups || []).filter(Boolean);
	if (!list.length) return null;

	const createGroupButton = (item, _type, position, noclick) => {
		const group = typeof item === "string" ? item : String(item);
		const node = ui.create.div(".button.dui-group-select", position);
		node.setBackgroundImage(`extension/十周年UI/image/ui/group/group_${group}.png`);
		node.link = group;
		ui.create.div(".dui-group-select-border", node);
		if (noclick) node.classList.add("noclick");
		return node;
	};

	const isShen =
		options.isShen === true ||
		player.group === "shen" ||
		get.character(player.name)?.group === "shen" ||
		get.character(player.name1)?.group === "shen";
	const hintText = `${isShen ? "神武将，" : ""}请选择你要变成的势力`;

	const dialog = ui.create.dialog("选择国籍", "hidden", [list, createGroupButton]);
	dialog.classList.add("decade-shousha-vcard", "dui-group-select-dialog");
	dialog.classList.remove("scroll1", "scroll2", "fullheight", "fullwidth");
	dialog.dataset.duiGroupHint = hintText;

	const ensureGroupConfirm = () => {
		let footer = dialog.querySelector(":scope > .dui-shousha-footer");
		if (!footer) footer = ui.create.div(".dui-shousha-footer", dialog);

		let confirm = dialog._confirm;
		if (!confirm) {
			confirm = ui.create.div(".dialog-confirm", footer);
			dialog._confirm = confirm;
		} else if (confirm.parentElement !== footer) {
			footer.appendChild(confirm);
		}

		if (!confirm._duiGroupOkBound) {
			confirm.querySelector(".dialog-confirm-button-ok")?.remove();
			confirm.ok = ui.create.div(".dialog-confirm-button-ok.decade-no-cancel", confirm, e => {
				e.stopImmediatePropagation();
				const evt = _status.event;
				if (evt?.name !== "chooseButton" || evt.dialog !== dialog) return;
				if (!ui.selected.buttons.length) return;
				if (typeof evt.filterOk === "function" && !evt.filterOk()) return;
				ui.click.ok();
			});
			confirm._duiGroupOkBound = true;
		}

		if (!confirm.cancel) {
			confirm.cancel = ui.create.div(".dialog-confirm-button-cancel", confirm);
		}
		confirm.cancel.style.setProperty("display", "none", "important");

		confirm.classList.remove("decade-shousha-no-ok", "decade-shousha-confirm-hidden");
		confirm.ok?.classList.remove("decade-shousha-hidden-ok", "unclickable");
		confirm.ok?.style.removeProperty("display");
		confirm.style.removeProperty("display");
		dialog.classList.add("decade-shousha-has-confirm");
	};

	const decorateDialog = () => {
		if (!dialog.isConnected || dialog.classList.contains("removing") || dialog.classList.contains("closing")) return;
		try {
			enhanceShoushaVcardDialogFrame(dialog, "选择国籍");
		} catch (e) {}
		try {
			ensureGroupConfirm();
		} catch (e) {}
		try {
			syncShoushaFooterLayout?.(dialog);
		} catch (e) {}
		const okBtn = dialog._confirm?.ok;
		if (okBtn) {
			okBtn.classList.remove("unclickable", "decade-shousha-hidden-ok");
			okBtn.style.removeProperty("display");
			okBtn.style.removeProperty("filter");
			okBtn.style.removeProperty("-webkit-filter");
		}
		try {
			const evt = _status.event;
			if (evt?.name === "chooseButton" && evt.dialog === dialog) {
				evt.set?.("noconfirm", true);
				evt.set?.("customConfirm", () => {
					dialog._confirm?.ok?.classList.remove("unclickable");
				});
			}
		} catch (e) {}
	};

	const choose = player
		.chooseButton(dialog, true)
		.set("ai", () => Math.random())
		.set("complexSelect", false)
		.set("noconfirm", true)
		.set("custom", {
			replace: {
				button(button) {
					if (!_status.event.isMine()) return;
					if (button.classList.contains("noclick")) return;
					_status.clicked = true;
					if (button.classList.contains("selected")) return;
					for (const selected of ui.selected.buttons.slice()) {
						selected.classList.remove("selected");
					}
					ui.selected.buttons.length = 0;
					button.classList.add("selected");
					ui.selected.buttons.add(button);
					// 挡住引擎 autoConfirm：选势力必须再点确定
					const prevTouch = _status.touchnocheck;
					_status.touchnocheck = true;
					try {
						game.check();
					} finally {
						_status.touchnocheck = prevTouch;
					}
				},
			},
		});
	decorateDialog();
	requestAnimationFrame(decorateDialog);
	setTimeout(decorateDialog, 0);
	setTimeout(decorateDialog, 50);
	setTimeout(decorateDialog, 120);

	const result = await choose.forResult();
	if (!result?.bool || !result.links?.length) return null;

	const selectedGroup = result.links[0];
	if (typeof player.changeGroup === "function") {
		await player.changeGroup(selectedGroup);
	} else {
		player.group = selectedGroup;
		player.node.name.dataset.nature = get.groupnature(selectedGroup);
	}
	return selectedGroup;
}

/**
 * @type {Object.<string, Object>}
 * @description 势力优化相关技能
 */
export const factionOptimizeSkill = {
	/**
	 * 官方势力：非魏蜀吴群晋等角色（如神将）重新选择势力
	 */
	_slyh: {
		trigger: { global: "gameStart", player: "enterGame" },
		forced: true,
		popup: false,
		silent: true,
		priority: Infinity,
		filter(_, player) {
			return get.mode() !== "guozhan" && player.group && !lib.group.includes(player.group);
		},
		async content() {
			const player = _status.event.player;
			await chooseFactionWithShoushaUI(player, lib.group.slice(0, 4));
		},
	},

	/**
	 * 覆盖本体双势力选择（文鸯、界严颜等），改用手杀选国籍框。
	 * 技能上的 initGroup 表示登场势力已定（如谋孙尚香），即使有 doubleGroup 也不弹窗。
	 */
	_doublegroup_choice: {
		filter(_, player) {
			if (get.mode() === "guozhan" || player._groupChosen) return false;
			const info = get.character(player.name1 || player.name);
			if (!Array.isArray(info?.doubleGroup) || !info.doubleGroup.length) return false;
			// initGroup = 登场势力已指定，开局不再选择
			if (info.skills?.some(skill => typeof get.info(skill)?.initGroup === "string")) return false;
			return true;
		},
		async content() {
			const player = _status.event.player;
			const info = get.character(player.name1 || player.name);
			const groups = info?.doubleGroup?.slice?.() || [];
			player._groupChosen = "double";
			if (groups.length < 2) return;
			await chooseFactionWithShoushaUI(player, groups);
		},
	},
};
