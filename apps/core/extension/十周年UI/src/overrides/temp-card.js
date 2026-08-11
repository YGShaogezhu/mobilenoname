/**
 * @fileoverview 临时虚拟卡牌模块
 * @description 转化/视为类界面：对话框按钮入手牌区；viewAs 生成虚拟预览牌
 * @module overrides/temp-card
 */
import { lib, game, ui, get, _status } from "noname";
import { wrapAround } from "../utils/safeOverride.js";
import { applyCardSkin } from "./card/skin-applier.js";
import { isLayeredMode, isEquipConvertSkill } from "./card/layered-card.js";

/**
 * 扩展名
 * @returns {string}
 */
function getExtensionName() {
	return window.decadeUI?.extensionName || "十周年UI";
}

/**
 * 配置开关（默认开启）
 * @returns {boolean}
 */
function getConfig() {
	return lib.config[`extension_${getExtensionName()}_replace_dialog_shousha`] !== false;
}

/**
 * 给卡牌套上当前美化（分层或整图）
 * @param {HTMLElement} card
 */
function skinTempCard(card) {
	if (!card) return;
	try {
		applyCardSkin(card, card);
	} catch (e) {}
}

/**
 * 虚拟预览牌：分层走拼装；否则白卡底
 * @param {HTMLElement} card
 */
function styleVirtualPreviewCard(card) {
	card.classList.add("temp-virtual-card");
	card.dataset.virtual = "1";
	card.classList.remove("decade-card");

	if (isLayeredMode()) {
		skinTempCard(card);
		return;
	}

	const ext = getExtensionName();
	card.style.backgroundImage = `url("${lib.assetURL}extension/${ext}/image/ui/cardtexture/card1.png")`;
	card.style.backgroundSize = "100% 100%";
}

/**
 * 注册 chooseButtonBegin 标记钩子
 */
function registerChooseButtonBeginHook() {
	const skillName = `__replaceDialogShousha_chooseButtonBegin_${getExtensionName()}`;
	if (lib.skill[skillName]) return;

	if (!lib.__chooseTempCardSkill) lib.__chooseTempCardSkill = ["aocai", "xiansi2"];
	if (!lib.__chooseTempCardBannedSkill) lib.__chooseTempCardBannedSkill = ["sbqicai_gain"];
	if (!lib.__chooseAddTempCardSkill) {
		lib.__chooseAddTempCardSkill = ["sbguanxing_use", "sb_guanxing_use", "yzk_guanxing_use"];
	}

	lib.skill[skillName] = {
		trigger: { player: "chooseButtonBegin" },
		silent: true,
		firstDo: true,
		priority: 100,
		content() {
			const trigger = this.trigger;
			if (!trigger || typeof trigger.getParent !== "function") return;
			const parent = trigger.getParent();
			const result = parent?.result;
			const test = reg =>
				(parent && reg.test(parent.name)) || (parent && reg.test(parent.skill)) || (result?.skill && reg.test(result.skill));

			if (lib.__chooseTempCardSkill.length) {
				const reg = new RegExp("^(" + lib.__chooseTempCardSkill.join("|") + ")$");
				if (test(reg)) trigger._chooseTempCard = true;
			}
			if (lib.__chooseTempCardBannedSkill.length) {
				const reg = new RegExp("^(" + lib.__chooseTempCardBannedSkill.join("|") + ")$");
				if (test(reg)) trigger._notchooseTempCard = true;
			}
			if (lib.__chooseAddTempCardSkill.length) {
				const reg = new RegExp("^(" + lib.__chooseAddTempCardSkill.join("|") + ")$");
				if (test(reg)) trigger._chooseAddTempCard = true;
			}
		},
	};
	game.addGlobalSkill?.(skillName);
}

/**
 * 对话框按钮 → 手牌区临时卡牌
 * @param {Object} evt
 */
function applyChooseToUseTempCard(evt) {
	if (!getConfig()) return;
	if (evt._notchooseTempCard) return;
	if (!evt._chooseTempCard && !evt.dialog?._shoushaButton) return;

	const parent = evt.getParent?.();
	if (!parent && !evt._chooseTempCard) return;

	const id = typeof evt.dialog === "number" ? evt.dialog : evt.dialog?.dialogId;
	let dialog = id ? get.idDialog(id) : evt.dialog;
	if (Array.isArray(evt.createDialog) && !dialog) {
		dialog = ui.create.dialog.apply(this, [...evt.createDialog, "hidden"]);
	}
	if (!dialog) dialog = ui.dialog;
	if (!dialog?.buttons) return;

	const skill = evt.skill || parent?.skill || parent?.result?.skill || (lib.skill[parent?.name] && parent.name);

	ui.dialogs.add(dialog);
	if (id != null) dialog.videoId = id;
	dialog.classList.add("forcehide", "temp-card-hidden-dialog");

	const player = evt.player || parent?.player;
	if (!player) return;

	const filter = evt.filterCard;
	const select = evt.selectCard;
	const filterTarget = evt.filterTarget;
	const selectTarget = evt.selectTarget;
	const add = () => {
		ui.selected.buttons.length = 0;
		ui.selected.buttons.addArray(ui.selected.cards.map(card => card.button || card));
	};

	evt.set("dialog", dialog.dialogId || id);
	evt.set("closeDialog", true);
	evt.set("_hiddenCards", player.getCards("hs"));

	if (!evt._chooseAddTempCard) {
		game.broadcastAll(p => {
			p.getCards("hs").forEach(card => card.classList.add("forcehide"));
		}, player);
	}

	const cards = dialog.buttons
		.sort((a, b) => {
			const getNum = c => (c.link?.gaintag && c.link.gaintag.length) || 0;
			return getNum(a) - getNum(b);
		})
		.map(button => {
			if (!button.cloneNode || !button.classList?.contains("card")) return;
			const card = ui.create.card().init(button.link);
			card.classList.add("temp-card");
			card.link = button.link;
			card.button = button;
			card.dataset.tempCard = true;
			if (button.link?.gaintag) card.addGaintag(button.link.gaintag);
			skinTempCard(card);
			return card;
		})
		.filter(Boolean);

	evt.set("_selectableCards", cards);
	cards.forEach(card => {
		game.broadcast(
			(c, link) => {
				if (!c) return;
				c.classList.add("temp-card");
				c.link = link;
				c.dataset.tempCard = true;
			},
			card,
			card.link
		);
	});

	player.directgains(
		cards,
		null,
		cards.some(card => card.gaintag?.length) ? null : evt.skill || skill
	);

	if (!evt._chooseAddTempCard) {
		game.broadcastAll(
			(cardList, p) => {
				const hand = get.is.singleHandcard() ? p.node.handcards1 : p.node.handcards2;
				cardList
					.slice()
					.reverse()
					.forEach(card => {
						hand.insertBefore(card, hand.firstChild);
					});
				hand.parentNode.scrollLeft = 0;
				p.update();
				if (p == game.me) ui.updatehl();
			},
			cards,
			player
		);
	}

	if (!evt.custom) {
		evt.set("custom", { add: { card: add }, replace: {} });
	} else if (!evt.custom.add) {
		evt.set("custom", Object.assign(evt.custom, { add: { card: add } }));
	} else {
		evt.set("custom", Object.assign(evt.custom, { add: Object.assign(evt.custom.add, { card: add }) }));
	}

	const originalFilter = filter;
	evt.set("filterCard", function (card) {
		if (!card.classList.contains("temp-card")) return false;
		return originalFilter ? originalFilter.apply(this, arguments) : true;
	});
	evt.set("selectCard", select || (() => {}));
	evt.set("position", "s");
	evt.set("filterButton");
	evt.set("selectButton");
	evt.set("selectTarget", selectTarget || (() => {}));
	evt.set("filterTarget", filterTarget);
	evt.set("__ofilter", filter);
	evt.set("__oselect", select);
	evt.set("__filterTarget", filterTarget);
	evt.set("__selectTarget", selectTarget);
	evt.set("complexCard", true);
	evt.set("complexSelect", true);
	evt.set("switchToAuto", function () {
		this.result = "ai";
	});

	if (evt.getDefaultHandlerType) {
		const type = evt.getDefaultHandlerType();
		evt.set(type, (evt[type] || []).add(() => {}));
	}
}

/**
 * game.check 生成 viewAs 虚拟预览；game.uncheck 移除
 * @returns {Function[]}
 */
function applyCheckUncheckVirtualCard() {
	if (!getConfig()) return [];
	const restoreFns = [];

	restoreFns.push(
		wrapAround(game, "check", function (original, ...args) {
			const result = original.apply(this, args);
			try {
				const evt = args[0] || _status.event;
				if (!evt?.isMine?.()) return result;

				// 丈八 / 玄剑等：转化杀，不生成虚拟杀入手
				const skill = evt.skill || _status.event?.skill;
				if (isEquipConvertSkill(skill)) return result;

				const select = get.select(evt.selectCard);

				let card;
				if (_status.event.skill && typeof get.info(_status.event.skill).viewAs == "function") {
					card = ui.selected.cards.length ? get.card(true) : false;
				} else {
					card = get.card(true);
				}

				if (!card || (!card.isCard && select[0] != -1) || ui._temp_vituralCard?.[evt.player.playerid]) {
					return result;
				}

				const cards = evt.player.getCards(evt.position).filter(c => !c.classList.contains("unselectable"));
				card = ui.create.card(null, "noclick").init(get.autoViewAs(card, select[0] == -1 && cards));

				if (!ui._temp_vituralCard) ui._temp_vituralCard = {};
				ui._temp_vituralCard[evt.player.playerid] = card;

				styleVirtualPreviewCard(card);

				const cleanupOriginal = evt.onuncheck;
				if (select[0] == -1) {
					cards.forEach(c => {
						c.updateTransform(false, 550);
						c.classList.remove("selected");
						c.classList.add("unselectable");
					});
					evt.onuncheck = function () {
						cards.forEach(c => c.classList.remove("unselectable"));
						return cleanupOriginal ? cleanupOriginal.apply(this, arguments) : undefined;
					};
				}

				card._transform = " ";
				evt.player.directgains([card]);
				card.classList.add("vituralCard", "selectable", "selected");
				card.updateTransform(true, 550);

				if (evt.noconfirm && ui.confirm) {
					ui.confirm.close();
					delete ui.confirm;
				}
				if (evt.noconfirm && evt.customConfirm) evt.customConfirm(result, evt);
				if (evt.oncheck) evt.oncheck(evt);
			} catch (e) {}
			return result;
		})
	);

	restoreFns.push(
		wrapAround(game, "uncheck", function (original, ...args) {
			const result = original.apply(this, args);
			try {
				if (ui._temp_vituralCard) {
					for (const id in ui._temp_vituralCard) {
						const player = (lib.playerOL || game.playerMap)[id];
						ui._temp_vituralCard[id].remove();
						if (player) {
							player.update();
							if (player == game.me) ui.updatehl();
						}
					}
					delete ui._temp_vituralCard;
				}
				if (_status.event?.onuncheck) _status.event.onuncheck(_status.event);
			} catch (e) {}
			return result;
		})
	);

	return restoreFns;
}

/**
 * 注册 chooseToUse 等事件触发
 * @returns {Function[]}
 */
function registerTempCardEventTriggers() {
	if (!getConfig()) return [];
	const restoreFns = [];
	const extName = getExtensionName();
	const hookSkillName = `__replaceDialogShousha_trigger_${extName}`;

	// StepCompiler 会反编译 content，模块闭包不可用；挂到 lib 供运行时调用
	lib.__decadeTempCard = {
		configKey: `extension_${extName}_replace_dialog_shousha`,
		applyChooseToUseTempCard,
	};

	lib.skill[hookSkillName] = {
		trigger: {
			player: ["chooseToUseBegin", "chooseToRespondBegin", "chooseToDiscardBegin"],
		},
		silent: true,
		firstDo: true,
		priority: 90,
		content() {
			const evt = this.trigger;
			const api = lib.__decadeTempCard;
			if (!api || lib.config[api.configKey] === false) return;
			try {
				api.applyChooseToUseTempCard(evt);
			} catch (e) {}
		},
	};
	game.addGlobalSkill?.(hookSkillName);
	return restoreFns;
}

/**
 * 注入临时卡牌样式
 */
function injectTempCardStyles() {
	const styleId = "decade-temp-card-styles";
	if (document.getElementById(styleId)) return;

	const style = document.createElement("style");
	style.id = styleId;
	style.textContent = `
		.temp-card-hidden-dialog {
			display: none !important;
			visibility: hidden !important;
			opacity: 0 !important;
			pointer-events: none !important;
		}

		.handcards > .card.forcehide:not(.temp-card),
		.handcards1 > .card.forcehide:not(.temp-card),
		.handcards2 > .card.forcehide:not(.temp-card) {
			filter: grayscale(1) brightness(0.5);
			opacity: 0.35;
			pointer-events: none;
		}

		.card.temp-card,
		.card.vituralCard {
			opacity: 1 !important;
			filter: none !important;
		}

		.card.temp-card.selected,
		.card.vituralCard.selected {
			z-index: 10;
		}
	`;
	document.head.appendChild(style);
}

/**
 * 应用临时虚拟卡牌覆写
 * @returns {Function[]}
 */
export function applyTempCardOverrides() {
	const restoreFns = [];
	try {
		if (getConfig()) {
			injectTempCardStyles();
			registerChooseButtonBeginHook();
			restoreFns.push(...registerTempCardEventTriggers());
			restoreFns.push(...applyCheckUncheckVirtualCard());
		}
	} catch (e) {}
	return restoreFns;
}
