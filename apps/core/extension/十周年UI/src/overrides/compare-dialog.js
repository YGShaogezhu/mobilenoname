/**
 * @fileoverview 拼点框（琉璃版布局 + 顺手样式背景）
 */
import { game, ui, get, _status } from "noname";
import { element } from "../utils/element.js";
import {
	applyLayeredCard,
	clearLayeredCard,
	applyLayeredTempSuitNum,
} from "./card/layered-card.js";

/**
 * 解析拼点事件名（用于 ui.dialogs 键）
 * @param {GameEvent} event
 * @returns {string}
 */
export function resolveCompareEventName(event) {
	const parent = event.getParent?.() ?? event.parent;
	if (!parent || parent.name == null || parent.name === "trigger") return event.name;
	return parent.name;
}

/**
 * 注入金色标题
 * @param {HTMLElement} dialog
 * @param {string} titleText
 */
function injectGoldTitle(dialog, titleText) {
	if (!dialog || !titleText) return;
	dialog.querySelector(".dui-gold-title-wrap")?.remove();
	const wrap = ui.create.div(".dui-gold-title-wrap");
	const title = ui.create.div(".dui-gold-title", wrap);
	title.textContent = titleText;
	bindCompareCollapseArrow(dialog, wrap);
	dialog.insertBefore(wrap, dialog.firstChild);
}

/**
 * 拼点框折叠后钉死高度（对齐判定框 / 顺手）
 * @param {HTMLElement} dialog
 */
function lockCompareDialogPlacement(dialog) {
	if (!dialog?.classList) return;
	const isSkillCompare = dialog.classList.contains("compare");
	const isMeanwhile = dialog.classList.contains("compareDialog");
	const isMultiple = dialog.classList.contains("compareDialogMultiple");
	if (!isSkillCompare && !isMeanwhile && !isMultiple) return;

	const collapsedH = 125;
	dialog.style.setProperty("left", "0px", "important");
	dialog.style.setProperty("right", "0px", "important");
	dialog.style.setProperty("width", "100%", "important");
	dialog.style.setProperty("margin", "0px", "important");
	dialog.style.setProperty("transform", "none", "important");

	if (dialog.classList.contains("dui-pcd-collapsed")) {
		const half = collapsedH / 2;
		dialog.style.setProperty("height", `${collapsedH}px`, "important");
		dialog.style.setProperty("min-height", `${collapsedH}px`, "important");
		dialog.style.setProperty("max-height", `${collapsedH}px`, "important");
		dialog.style.setProperty("top", `calc(50% - ${half}px)`, "important");
		dialog.style.setProperty("bottom", "auto", "important");
		return;
	}

	dialog.style.removeProperty("height");
	dialog.style.removeProperty("min-height");
	dialog.style.removeProperty("max-height");
	dialog.style.removeProperty("top");
	dialog.style.removeProperty("bottom");
}

/**
 * 拼点框标题箭头：折叠 / 展开
 * @param {HTMLElement} dialog
 * @param {HTMLElement} wrap
 */
function bindCompareCollapseArrow(dialog, wrap) {
	if (!dialog || !wrap) return;
	wrap.querySelector(".dui-pcd-arrow")?.remove();
	const arrow = ui.create.div(".dui-pcd-arrow", wrap);
	const toggle = evt => {
		evt.stopPropagation();
		evt.preventDefault();
		if (evt.type !== "click") return;
		dialog.classList.toggle("dui-pcd-collapsed");
		lockCompareDialogPlacement(dialog);
	};
	arrow.addEventListener("click", toggle);
	arrow.addEventListener("mousedown", evt => evt.stopPropagation());
	arrow.addEventListener("touchstart", evt => evt.stopPropagation(), { passive: true });
}

/**
 * 拼点标题文案
 * @param {string} eventName
 * @returns {string}
 */
function getCompareTitleText(eventName) {
	const name = get.translation(eventName);
	return typeof name === "string" && name ? name : "";
}

/**
 * 注册 finished 时关闭拼点框
 * @param {GameEvent} event
 */
function bindCompareDialogCleanup(event) {
	event.compareName = resolveCompareEventName(event);
	event.addMessageHook("finished", () => {
		const name = event.compareName;
		const dialog = ui.dialogs?.[name];
		if (dialog?.close) dialog.close();
		if (name) ui.dialogs[name] = undefined;
		removeComparePanel(event.compareName);
	});
}

/**
 * 移除拼点面板 DOM
 * @param {string} key
 */
function removeComparePanel(key) {
	if (!key) return;
	const panel = ui.dialogs?.[key];
	if (panel?.parentNode) panel.parentNode.removeChild(panel);
	if (key) ui.dialogs[key] = undefined;
}

/**
 * 标记牌槽为背面
 * @param {HTMLElement} slot
 */
function markCardSlotBack(slot) {
	if (!slot) return;
	slot.classList.add("infohidden", "infoflip");
}

/**
 * 是否为背面或空白牌节点
 * @param {HTMLElement} card
 * @returns {boolean}
 */
function isHiddenOrBlankCompareCard(card) {
	if (!card?.classList) return true;
	if (card.classList.contains("infohidden")) return true;
	if (card.classList.contains("blank")) return true;
	const name = card.name || card.link?.name || card.link?.cardid;
	if (!name) return true;
	return false;
}

/**
 * 拼点框内正面牌强制标准白卡
 * @param {HTMLElement} cardEl
 * @param {Object} [owner]
 */
function applyCompareWhiteCard(cardEl, owner) {
	if (!cardEl?.classList?.contains("card")) return;
	if (isHiddenOrBlankCompareCard(cardEl)) return;
	try {
		cardEl.classList.remove("decade-card");
		cardEl.style.removeProperty("background");
		cardEl.style.removeProperty("background-image");
		if (cardEl.classList.contains("layered-card")) {
			clearLayeredCard(cardEl);
		}
		applyLayeredCard(cardEl, "1");
	} catch (e) {}
}

/**
 * 按拼点结算点数刷新牌面显示（技能改点）
 * @param {HTMLElement} cardEl
 * @param {Object} owner
 * @param {number} number
 */
function applyCompareDisplayNumber(cardEl, owner, number) {
	if (!cardEl || number == null) return;
	applyCompareWhiteCard(cardEl, owner);
	const suit = get.suit(cardEl, owner) || cardEl.suit;
	if (!suit) return;
	try {
		applyLayeredTempSuitNum(cardEl, suit, number);
	} catch (e) {}
}

/**
 * 1v1 拼点框同步双方显示点数
 * @param {string} eventName
 * @param {number} num1
 * @param {number} num2
 * @param {Object} player
 * @param {Object|string} target
 */
function broadcastSyncCompareNumbers1v1(eventName, num1, num2, player, target) {
	game.broadcastAll((name, n1, n2, p, t) => {
		if (!window.decadeUI) return;
		const dialog = ui.dialogs?.[name];
		if (!dialog) return;
		if (dialog.playerCard && n1 != null) {
			applyCompareDisplayNumber(dialog.playerCard, p, n1);
		}
		if (dialog.targetCard && n2 != null) {
			const owner = get.itemtype(t) === "player" ? t : p;
			applyCompareDisplayNumber(dialog.targetCard, owner, n2);
		}
	}, eventName, num1, num2, player, target);
}

/**
 * 多人顺序拼点：同步发起方与当前目标槽点数
 * @param {Object} player
 * @param {Object} target
 * @param {number} num1
 * @param {number} num2
 */
function broadcastSyncMultiCompareNumbers(player, target, num1, num2) {
	game.broadcastAll((p, t, n1, n2) => {
		if (!window.decadeUI) return;
		const playerSlot = document.querySelector(".dui-compare-player-slot");
		const playerCard = playerSlot?.firstChild;
		if (playerCard && n1 != null) {
			applyCompareDisplayNumber(playerCard, p, n1);
		}
		if (t) {
			const targetSlot = document.querySelector(`#targetArea_${t.playerid}`);
			const targetCard = targetSlot?.firstChild;
			if (targetCard && n2 != null) {
				applyCompareDisplayNumber(targetCard, t, n2);
			}
		}
	}, player, target, num1, num2);
}

/**
 * 共同拼点：同步所有已亮牌槽点数
 * @param {Object} player
 * @param {Object[]} targets
 * @param {number} num1
 * @param {number[]} num2List
 */
function broadcastSyncMeanwhileCompareNumbers(player, targets, num1, num2List) {
	game.broadcastAll((p, ts, n1, n2s) => {
		if (!window.decadeUI) return;
		const playerSlot = document.querySelector(".dui-compare-player-slot");
		const playerCard = playerSlot?.firstChild;
		if (playerCard && n1 != null) {
			applyCompareDisplayNumber(playerCard, p, n1);
		}
		for (let i = 0; i < ts.length; i++) {
			const n2 = n2s?.[i];
			if (n2 == null) continue;
			const targetSlot = document.querySelector(`#targetArea_${ts[i].playerid}`);
			const targetCard = targetSlot?.firstChild;
			if (targetCard) {
				applyCompareDisplayNumber(targetCard, ts[i], n2);
			}
		}
	}, player, targets, num1, num2List);
}

/**
 * 1v1 拼点：打开框
 * @param {Object} player
 * @param {Object|string} target
 * @param {string} eventName
 */
function broadcastOpenCompareDialog(player, target, eventName) {
	game.broadcastAll((p, t, evName) => {
		if (!window.decadeUI) return;
		const dialog = decadeUI.create.compareDialog(p, t);
		injectGoldTitle(dialog, getCompareTitleText(evName));
		if (t === "cardPile" || get.itemtype(t) !== "player") {
			dialog.$targetCard.dataset.text = "牌堆";
		}
		dialog.open();
		lockCompareDialogPlacement(dialog);
		ui.dialogs[evName] = dialog;
	}, player, target, eventName);
}

/**
 * 1v1：标记双方牌背
 * @param {string} eventName
 */
function broadcastMarkCompareCardBacks(eventName) {
	game.broadcastAll(evName => {
		if (!window.decadeUI) return;
		const dialog = ui.dialogs?.[evName];
		if (!dialog) return;
		markCardSlotBack(dialog.$playerCard);
		markCardSlotBack(dialog.$targetCard);
	}, eventName);
}

/**
 * 1v1：亮牌
 * @param {string} eventName
 * @param {Object} card1
 * @param {Object} card2
 */
function broadcastRevealCompareCards(eventName, card1, card2) {
	game.broadcastAll((evName, c1, c2) => {
		if (!window.decadeUI) return;
		const dialog = ui.dialogs?.[evName];
		if (!dialog) return;
		dialog.playerCard = c1.copy();
		dialog.targetCard = c2.copy();
	}, eventName, card1, card2);
}

/**
 * 1v1：显示胜负并关闭
 * @param {GameEvent} event
 * @param {Object} player
 * @param {Object|string} target
 */
function broadcastCompareResult1v1(event, player, target) {
	const evName = event.compareName;
	const bool = event.result.bool;
	const num1 = event.num1;
	const num2 = event.num2;
	const str = event.str;

	game.broadcastAll((name, resultBool, n1, n2, resultStr, p, t) => {
		if (!window.decadeUI) {
			const dialog = ui.create.dialog(resultStr);
			dialog.classList.add("center");
			setTimeout(() => dialog.close(), 1000);
			return;
		}
		const dialog = ui.dialogs?.[name];
		if (!dialog) return;
		dialog.$playerCard.dataset.result = resultBool ? "赢" : "没赢";
		dialog.$targetCard.dataset.result = n2 > n1 ? "赢" : "没赢";
		setTimeout(() => {
			dialog.close();
			setTimeout(() => {
				if (dialog.playerCard) {
					dialog.playerCard.judge = true;
					p.$throwordered2(dialog.playerCard, true);
				}
				if (dialog.targetCard) {
					dialog.targetCard.judge = true;
					const thrower = get.itemtype(t) === "player" ? t : p;
					thrower.$throwordered2(dialog.targetCard, true);
				}
			}, 180);
			ui.dialogs[name] = undefined;
		}, 1400);
	}, evName, bool, num1, num2, str, player, target);
}

/**
 * 创建多人拼点面板
 * @param {Object} player
 * @param {Object[]} targets
 * @param {string} eventName
 */
function createCompareMultiplePanel(player, targets, eventName) {
	const root = ui.create.div(".compareDialogMultiple", ui.arena);
	injectGoldTitle(root, getCompareTitleText(eventName));

	const playerArea = ui.create.div(".cardArea", root);
	ui.create.div(".playerAreaName", playerArea).textContent = get.rawName(player.name);
	const playerSlot = ui.create.div(".playerArea", playerArea);
	playerSlot.classList.add("dui-compare-player-slot");

	for (const t of targets) {
		const area = ui.create.div(".cardArea", root);
		ui.create.div(".targetAreaName", area).textContent = get.rawName(t.name);
		const slot = ui.create.div(".targetArea", area);
		slot.id = `targetArea_${t.playerid}`;
		slot.classList.add("dui-compare-target-slot");
	}

	ui.dialogs[eventName] = root;
	return root;
}

/**
 * 创建共同拼点面板
 * @param {Object} player
 * @param {Object[]} targets
 * @param {string} eventName
 */
function createCompareMeanwhilePanel(player, targets, eventName) {
	const root = ui.create.div(".compareDialog", ui.arena);
	injectGoldTitle(root, getCompareTitleText(eventName));

	const playerDialog = ui.create.div(".playerAreaDialog", root);
	ui.create.div(".playerAreaName", playerDialog).textContent = get.rawName(player.name);
	const playerSlot = ui.create.div(".playerArea", playerDialog);
	playerSlot.classList.add("dui-compare-player-slot");

	for (const t of targets) {
		const targetDialog = ui.create.div(".targetAreaDialog", root);
		ui.create.div(".targetAreaName", targetDialog).textContent = get.rawName(t.name);
		const slot = ui.create.div(".targetArea", targetDialog);
		slot.id = `targetArea_${t.playerid}`;
		slot.classList.add("dui-compare-target-slot");
	}

	ui.dialogs[eventName] = root;
	return root;
}

/**
 * 向槽位放入牌节点
 * @param {string} selector
 * @param {Object} card
 * @param {Object} [owner]
 */
function appendCardToSlot(selector, card, owner) {
	const slot = document.querySelector(selector);
	if (!slot || !card) return;
	const node = card.copy();
	node.card = card;
	node.style.setProperty("transform", "translate(0px, 0px) scale(1)", "");
	slot.style.setProperty("transform", "translate(0px, 0px) scale(1)", "");
	applyCompareWhiteCard(node, owner);
	slot.appendChild(node);
}

/**
 * 设置槽位胜负
 * @param {HTMLElement} slot
 * @param {boolean} win
 */
function setSlotResult(slot, win) {
	if (!slot?.firstChild) return;
	slot.firstChild.dataset.result = win ? "win" : "lose";
}

/**
 * 创建 1v1 拼点对话框工厂
 * @param {Function} skillDialog
 * @returns {Function}
 */
export function createCompareDialogFactory(skillDialog) {
	return function compareDialog(player, target) {
		const dialog = skillDialog();
		dialog.classList.add("compare");
		dialog.$content.classList.add("buttons");

		const extend = {
			player: undefined,
			target: undefined,
			playerCard: undefined,
			targetCard: undefined,
			$playerCard: element.create("player-card", dialog.$content),
			$targetCard: element.create("target-card", dialog.$content),
		};
		decadeUI.get.extend(dialog, extend);

		Object.defineProperties(dialog, {
			player: {
				configurable: true,
				get() {
					return this._player;
				},
				set(value) {
					if (this._player === value) return;
					this._player = value;
					if (value) this.$playerCard.dataset.text = get.rawName(value.name);
				},
			},
			target: {
				configurable: true,
				get() {
					return this._target;
				},
				set(value) {
					if (this._target === value) return;
					this._target = value;
					if (value && get.itemtype(value) === "player") {
						this.$targetCard.dataset.text = get.rawName(value.name);
					}
				},
			},
			playerCard: {
				configurable: true,
				get() {
					return this._playerCard;
				},
				set(value) {
					if (this._playerCard === value) return;
					if (this._playerCard) this._playerCard.remove();
					this._playerCard = value;
					if (value) {
						this.$playerCard.appendChild(value);
						applyCompareWhiteCard(value, this._player);
					}
				},
			},
			targetCard: {
				configurable: true,
				get() {
					return this._targetCard;
				},
				set(value) {
					if (this._targetCard === value) return;
					if (this._targetCard) this._targetCard.remove();
					this._targetCard = value;
					if (value) {
						this.$targetCard.appendChild(value);
						const owner =
							get.itemtype(this._target) === "player" ? this._target : this._player;
						applyCompareWhiteCard(value, owner);
					}
				},
			},
		});

		if (player) dialog.player = player;
		if (target) dialog.target = target;

		return dialog;
	};
}

/**
 * 覆写 chooseToCompare
 * @returns {Array<Function>}
 */
export function contentChooseToCompare() {
	return [
		async (event, trigger, player) => {
			const target = event.target;
			if (target === "cardPile") {
				event.compareWithCardPile = true;
				event.compareType ??= "top";
			}
			if (!event.position || typeof event.position != "string") {
				event.position = "h";
			}
			if (
				(!event.fixedResult?.[player.playerid] && player.countCards(event.position) == 0) ||
				(!event.compareWithCardPile && !event.fixedResult?.[target.playerid] && target.countCards(event.position) == 0)
			) {
				event.result = { cancelled: true, bool: false };
				event.finish();
				return;
			}
			game.log(player, "对", event.compareWithCardPile ? "牌堆" : target, "发起", event.isDelay ? "延时" : "", "拼点");
			event.filterCard ??= lib.filter.all;
			bindCompareDialogCleanup(event);
			if (window.decadeUI) {
				broadcastOpenCompareDialog(player, target, event.compareName);
			}
		},
		async (event, trigger, player) => {
			const target = event.target;
			event.list = [player, target].filter(current => get.itemtype(current) == "player" && !event.fixedResult?.[current.playerid]);
			if (event.list.length) {
				const next = player
					.chooseCardOL(event.list, "请选择拼点牌", true, event.position)
					.set("small", event.small)
					.set("filterCard", event.filterCard)
					.set("type", "compare")
					.set("ai", event.ai)
					.set("source", player);
				next.aiCard = target => {
					const hs = target.getCards("h");
					const evt = _status.event;
					evt.player = target;
					hs.sort((a, b) => evt.ai(b) - evt.ai(a));
					delete evt.player;
					return { bool: true, cards: [hs[0]] };
				};
			}
		},
		async (event, trigger, player, result) => {
			const target = event.target;
			const lose_list = [];
			if (event.fixedResult?.[player.playerid]) {
				lose_list.push([player, [event.fixedResult[player.playerid]]]);
			} else {
				if (result[0].skill && lib.skill[result[0].skill]?.onCompare) {
					player.logSkill(result[0].skill);
					result[0].cards = lib.skill[result[0].skill].onCompare(player);
				}
				lose_list.push([player, result[0].cards]);
			}
			event.card1 = lose_list[0][1][0];
			if (event.list.includes(target)) {
				const index = event.list.indexOf(target);
				if (result[index].skill && lib.skill[result[index].skill]?.onCompare) {
					target.logSkill(result[index].skill);
					result[index].cards = lib.skill[result[index].skill].onCompare(target);
				}
				lose_list.push([target, result[index].cards]);
			} else if (get.itemtype(target) == "player" && event.fixedResult?.[target.playerid]) {
				lose_list.push([target, [event.fixedResult[target.playerid]]]);
			}
			let card2;
			if (event.compareWithCardPile) {
				if (event.compareType == "top") {
					card2 = game.cardsGotoOrdering(get.cards()).cards[0];
				} else if (event.compareType == "bottom") {
					card2 = game.cardsGotoOrdering(get.bottomCards()).cards[0];
				}
			} else {
				card2 = lose_list[1][1][0];
			}
			event.card2 = card2;
			event.lose_list = lose_list;
			if (window.decadeUI) {
				broadcastMarkCompareCardBacks(event.compareName);
			}
		},
		async (event, trigger, player) => {
			const target = event.target;
			if (get.itemtype(target) == "player" && (event.card2.number >= 10 || event.card2.number <= 4)) {
				if (target.countCards("h") > 2) {
					event.addToAI = true;
				}
			}
		},
		async (event, trigger, player) => {
			if (event.lose_list.length) {
				await game.loseAsync({
					lose_list: event.lose_list,
				}).setContent("chooseToCompareLose");
			}
		},
		async (event, trigger, player) => {
			const target = event.target;
			if (event.isDelay) {
				const cards = [];
				for (const current of event.lose_list) {
					current[0].$giveAuto(current[1], current[0], false);
					cards.addArray(current[1]);
				}
				game.cardsGotoSpecial(cards);
				const evt = event;
				player
					.when({
						global: ["dieAfter", "phaseEnd"],
					})
					.assign({
						forceDie: true,
					})
					.filter((e, p) => e.name == "phase" || [p, target].includes(e.player))
					.step(async (e, tr, p) => {
						if (cards?.some(card => get.position(card) == "s")) {
							evt.isDestroyed = true;
							await game.cardsGotoOrdering(cards);
							await game.cardsDiscard(cards);
						}
					});
				event.untrigger();
				event.finish();
			} else {
				event.trigger("compareCardShowBefore");
			}
		},
		async (event, trigger, player) => {
			const target = event.target;
			if (!window.decadeUI) {
				game.broadcastAll(() => ui.arena.classList.add("thrownhighlight"));
				game.addVideo("thrownhighlight1");
				player.$compare(event.card1, event.compareWithCardPile ? player : target, event.card2);
			} else {
				broadcastRevealCompareCards(event.compareName, event.card1, event.card2);
			}
			game.addVideo("compare", player, [
				get.cardInfo(event.card1),
				get.itemtype(target) === "player" ? target.dataset.position : player.dataset.position,
				get.cardInfo(event.card2),
			]);
		},
		async (event, trigger, player) => {
			const target = event.target;
			game.log(player, "的拼点牌为", event.card1);
			await player.showCards(event.card1).set("triggeronly", true);
			game.log(event.compareWithCardPile ? "牌堆" : target, "的拼点牌为", event.card2);
			if (event.compareWithCardPile) {
				await player.showCards(event.card2).set("triggeronly", true);
			} else {
				await target.showCards(event.card2).set("triggeronly", true);
			}
			const getNum = card => {
				for (const i of event.lose_list) {
					if (i[1].includes(card)) {
						return get.number(card, i[0]);
					}
				}
				return get.number(card, false);
			};
			event.num1 = getNum(event.card1);
			event.num2 = getNum(event.card2);
			event.trigger("compare");
			if (window.decadeUI) {
				broadcastSyncCompareNumbers1v1(
					event.compareName,
					event.num1,
					event.num2,
					player,
					target
				);
			}
		},
		async (event, trigger, player) => {
			await game.delay(0, lib.config.game_speed == "vvfast" ? 4000 : 1500);
		},
		async (event, trigger, player) => {
			const target = event.target;
			event.result = {
				player: event.card1,
				target: event.card2,
				num1: event.num1,
				num2: event.num2,
			};
			event.trigger("compareFixing");
			if (window.decadeUI) {
				broadcastSyncCompareNumbers1v1(
					event.compareName,
					event.num1,
					event.num2,
					player,
					target
				);
			}
		},
		async (event, trigger, player) => {
			const target = event.target;
			if (event.forceWinner === player || (event.forceWinner !== target && event.num1 > event.num2)) {
				event.result.bool = true;
				event.result.winner = player;
				event.str = `${get.translation(player)}拼点成功`;
				player.popup("胜");
				if (get.itemtype(target) == "player") {
					target.popup("负");
				}
			} else {
				event.result.bool = false;
				event.str = `${get.translation(player)}拼点失败`;
				if (event.forceWinner !== target && event.num1 == event.num2) {
					event.result.tie = true;
					player.popup("平");
					if (get.itemtype(target) == "player") {
						target.popup("平");
					}
				} else {
					if (get.itemtype(target) == "player") {
						event.result.winner = target;
					}
					player.popup("负");
					if (get.itemtype(target) == "player") {
						target.popup("胜");
					}
				}
			}
		},
		async (event, trigger, player) => {
			const target = event.target;
			broadcastCompareResult1v1(event, player, target);
			await game.delay(2);
		},
		async (event, trigger, player) => {
			const target = event.target;
			if (get.itemtype(target) == "player" && typeof target.ai.shown == "number" && target.ai.shown <= 0.85 && event.addToAI) {
				target.ai.shown += 0.1;
			}
			game.broadcastAll(() => {
				if (!window.decadeUI) ui.arena.classList.remove("thrownhighlight");
			});
			game.addVideo("thrownhighlight2");
			if (event.clear !== false) {
				game.broadcastAll(ui.clear);
			}
			if (typeof event.preserve == "function") {
				event.preserve = event.preserve(event.result);
			} else if (event.preserve == "win") {
				event.preserve = event.result.bool;
			} else if (event.preserve == "lose") {
				event.preserve = !event.result.bool;
			}
		},
	];
}

/**
 * 覆写 chooseToCompareMultiple
 * @returns {Array<Function>}
 */
export function contentChooseToCompareMultiple() {
	return [
		async (event, trigger, player) => {
			const targets = event.targets;
			if (!event.fixedResult?.[player.playerid] && player.countCards("h") == 0) {
				event.result = { cancelled: true, bool: false };
				event.finish();
				return;
			}
			for (const target of targets) {
				if ((!event.fixedResult || !event.fixedResult[target.playerid]) && target.countCards("h") == 0) {
					event.result = { cancelled: true, bool: false };
					event.finish();
					return;
				}
			}
			if (!event.multitarget) {
				targets.sort(lib.sort.seat);
			}
			game.log(player, "对", targets, "发起拼点");
			event.filterCard ??= lib.filter.all;
			bindCompareDialogCleanup(event);
			if (window.decadeUI) {
				game.broadcastAll((p, ts, evName) => {
					if (!window.decadeUI) return;
					createCompareMultiplePanel(p, ts, evName);
				}, player, targets, event.compareName);
			}
		},
		async (event, trigger, player) => {
			const targets = event.targets;
			event._result = [];
			event.list = targets.filter(current => !event.fixedResult?.[current.playerid]);
			if (event.list.length || !event.fixedResult?.[player.playerid]) {
				if (!event.fixedResult?.[player.playerid]) {
					event.list.unshift(player);
				}
				const next = player
					.chooseCardOL(event.list, "请选择拼点牌", true)
					.set("filterCard", event.filterCard)
					.set("type", "compare")
					.set("ai", event.ai)
					.set("source", player);
				next.aiCard = target => {
					const hs = target.getCards("h");
					const evt = _status.event;
					evt.player = target;
					hs.sort((a, b) => evt.ai(b) - evt.ai(a));
					delete evt.player;
					return { bool: true, cards: [hs[0]] };
				};
			}
		},
		async (event, trigger, player, result) => {
			const cards = [];
			const lose_list = [];
			if (event.fixedResult?.[player.playerid]) {
				event.list.unshift(player);
				result.unshift({ bool: true, cards: [event.fixedResult[player.playerid]] });
				lose_list.push([player, [event.fixedResult[player.playerid]]]);
			} else {
				if (result[0].skill && lib.skill[result[0].skill]?.onCompare) {
					player.logSkill(result[0].skill);
					result[0].cards = lib.skill[result[0].skill].onCompare(player);
				} else {
					lose_list.push([player, result[0].cards]);
				}
			}
			const targets = event.targets;
			for (const target of targets) {
				if (event.list.includes(target)) {
					const i = event.list.indexOf(target);
					if (result[i].skill && lib.skill[result[i].skill]?.onCompare) {
						event.list[i].logSkill(result[i].skill);
						result[i].cards = lib.skill[result[i].skill].onCompare(event.list[i]);
					} else {
						lose_list.push([target, result[i].cards]);
					}
					cards.push(result[i].cards[0]);
				} else if (event.fixedResult?.[target.playerid]) {
					cards.push(event.fixedResult[target.playerid]);
					lose_list.push([target, [event.fixedResult[target.playerid]]]);
				}
			}
			if (lose_list.length) {
				await game.loseAsync({
					lose_list: lose_list,
				}).setContent("chooseToCompareLose");
			}
			event.lose_list = lose_list;
			event.getNum = card => {
				for (const i of event.lose_list) {
					if (i[1].includes && i[1].includes(card)) {
						return get.number(card, i[0]);
					}
				}
				return get.number(card, false);
			};
			event.cardlist = cards;
			event.cards = cards;
			event.card1 = result[0].cards[0];
			event.num1 = event.getNum(event.card1);
			event.iwhile = 0;
			event.result = {
				player: event.card1,
				targets: event.cardlist.slice(0),
				num1: [],
				num2: [],
			};
		},
		async (event, trigger, player) => {
			event.trigger("compareCardShowBefore");
		},
		async (event, trigger, player) => {
			game.log(player, "的拼点牌为", event.card1);
			if (window.decadeUI) {
				game.broadcastAll((c1, p) => {
					appendCardToSlot(".dui-compare-player-slot", c1, p);
				}, event.card1, player);
			}
			await player.showCards(event.card1).set("triggeronly", true);
		},
		async (event, trigger, player) => {
			const targets = event.targets;
			if (event.iwhile < targets.length) {
				event.target = targets[event.iwhile];
				event.target.addTempClass("target");
				player.addTempClass("target");
				event.card2 = event.cardlist[event.iwhile];
				event.num2 = event.getNum(event.card2);
				game.log(event.target, "的拼点牌为", event.card2);
				player.line(event.target);
				if (!window.decadeUI) {
					player.$compare(event.card1, event.target, event.card2);
				} else {
					game.broadcastAll((t, c2) => {
						appendCardToSlot(`#targetArea_${t.playerid}`, c2, t);
					}, event.target, event.card2);
				}
				await event.target.showCards(event.card2).set("triggeronly", true);
			} else {
				event.goto(12);
			}
		},
		async (event, trigger, player) => {
			await game.delay(0, lib.config.game_speed == "vvfast" ? 4000 : 1500);
			await event.trigger("compare");
			if (window.decadeUI) {
				broadcastSyncMultiCompareNumbers(player, event.target, event.num1, event.num2);
			}
		},
		async (event, trigger, player) => {
			event.iiwhile = event.iwhile;
			delete event.iwhile;
			event.trigger("compareFixing");
			if (window.decadeUI) {
				broadcastSyncMultiCompareNumbers(player, event.target, event.num1, event.num2);
			}
		},
		async (event, trigger, player) => {
			const target = event.target;
			event.result.num1[event.iiwhile] = event.num1;
			event.result.num2[event.iiwhile] = event.num2;
			const playerWon = event.forceWinner === player || (event.forceWinner !== target && event.num1 > event.num2);
			if (playerWon) {
				event.winner = player;
				event.str = `${get.translation(player)}拼点成功`;
				player.popup("胜");
				target.popup("负");
				if (window.decadeUI) {
					game.broadcastAll((won, t) => {
						setSlotResult(document.querySelector(".dui-compare-player-slot"), won);
						setSlotResult(document.querySelector(`#targetArea_${t.playerid}`), !won);
					}, true, target);
				}
			} else {
				event.str = `${get.translation(player)}拼点失败`;
				if (event.forceWinner !== target && event.num1 == event.num2) {
					player.popup("平");
					target.popup("平");
				} else {
					event.winner = target;
					player.popup("负");
					target.popup("胜");
					if (window.decadeUI) {
						game.broadcastAll((won, t) => {
							setSlotResult(document.querySelector(".dui-compare-player-slot"), won);
							setSlotResult(document.querySelector(`#targetArea_${t.playerid}`), !won);
						}, false, target);
					}
				}
			}
		},
		async (event, trigger, player) => {
			if (!window.decadeUI) {
				game.broadcastAll(str => {
					const dialog = ui.create.dialog(str);
					dialog.classList.add("center");
					setTimeout(() => dialog.close(), 1000);
				}, event.str);
			}
			await game.delay(2);
		},
		async (event, trigger, player) => {
			if (event.callback) {
				game.broadcastAll((card1, card2) => {
					if (card1.clone) card1.clone.style.opacity = 0.5;
					if (card2.clone) card2.clone.style.opacity = 0.5;
				}, event.card1, event.card2);
				const next = game.createEvent("compareMultiple");
				next.player = player;
				next.target = event.target;
				next.card1 = event.card1;
				next.card2 = event.card2;
				next.num1 = event.num1;
				next.num2 = event.num2;
				next.winner = event.winner;
				next.setContent(event.callback);
				event.compareMultiple = true;
			}
		},
		async (event, trigger, player) => {
			game.broadcastAll(ui.clear);
			delete event.winner;
			delete event.forceWinner;
			event.iwhile = event.iiwhile + 1;
			event.goto(5);
		},
		async (event, trigger, player) => {
			if (window.decadeUI) {
				removeComparePanel(event.compareName);
			}
			event.cards.add(event.card1);
		},
	];
}

/**
 * 覆写 chooseToCompareMeanwhile
 * @returns {Array<Function>}
 */
export function contentChooseToCompareMeanwhile() {
	return [
		async (event, trigger, player) => {
			const targets = event.targets;
			if (player.countCards("h") == 0 && (!event.fixedResult || !event.fixedResult[player.playerid])) {
				event.result = { cancelled: true, bool: false };
				event.finish();
				return;
			}
			for (const target of targets) {
				if (target.countCards("h") == 0 && (!event.fixedResult || !event.fixedResult[target.playerid])) {
					event.result = { cancelled: true, bool: false };
					event.finish();
					return;
				}
			}
			if (!event.multitarget) {
				targets.sort(lib.sort.seat);
			}
			game.log(player, "对", targets, "发起了共同拼点");
			event.compareMeanwhile = true;
			event.filterCard ??= lib.filter.all;
			bindCompareDialogCleanup(event);
			if (window.decadeUI) {
				game.broadcastAll((p, ts, evName) => {
					if (!window.decadeUI) return;
					createCompareMeanwhilePanel(p, ts, evName);
				}, player, targets, event.compareName);
			}
		},
		async (event, trigger, player) => {
			const targets = event.targets;
			event._result = [];
			event.list = targets.filter(current => !event.fixedResult?.[current.playerid]);
			if (event.list.length || !event.fixedResult || !event.fixedResult[player.playerid]) {
				if (!event.fixedResult || !event.fixedResult[player.playerid]) {
					event.list.unshift(player);
				}
				const next = player
					.chooseCardOL(event.list, "请选择拼点牌", true)
					.set("filterCard", event.filterCard)
					.set("type", "compare")
					.set("ai", event.ai)
					.set("source", player);
				next.aiCard = target => {
					const hs = target.getCards("h");
					const evt = _status.event;
					evt.player = target;
					hs.sort((a, b) => evt.ai(b) - evt.ai(a));
					delete evt.player;
					return { bool: true, cards: [hs[0]] };
				};
			}
		},
		async (event, trigger, player, result) => {
			const cards = [];
			const lose_list = [];
			if (event.fixedResult?.[player.playerid]) {
				event.list.unshift(player);
				result.unshift({ bool: true, cards: [event.fixedResult[player.playerid]] });
				lose_list.push([player, [event.fixedResult[player.playerid]]]);
			} else {
				if (result[0].skill && lib.skill[result[0].skill]?.onCompare) {
					player.logSkill(result[0].skill);
					result[0].cards = lib.skill[result[0].skill].onCompare(player);
				} else {
					lose_list.push([player, result[0].cards]);
				}
			}
			const targets = event.targets;
			for (const target of targets) {
				if (event.list.includes(target)) {
					const i = event.list.indexOf(target);
					if (result[i].skill && lib.skill[result[i].skill]?.onCompare) {
						event.list[i].logSkill(result[i].skill);
						result[i].cards = lib.skill[result[i].skill].onCompare(event.list[i]);
					} else {
						lose_list.push([target, result[i].cards]);
					}
					cards.push(result[i].cards[0]);
				} else if (event.fixedResult?.[target.playerid]) {
					cards.push(event.fixedResult[target.playerid]);
					lose_list.push([target, [event.fixedResult[target.playerid]]]);
				}
			}
			if (lose_list.length) {
				await game.loseAsync({
					lose_list: lose_list,
				}).setContent("chooseToCompareLose");
			}
			event.lose_list = lose_list;
			event.getNum = card => {
				for (const i of event.lose_list) {
					if (i[1].includes && i[1].includes(card)) {
						return get.number(card, i[0]);
					}
				}
				return get.number(card, false);
			};
			event.cardlist = cards;
			event.cards = cards;
			event.card1 = result[0].cards[0];
			event.num1 = event.getNum(event.card1);
			event.iwhile = 0;
			event.winner = null;
			event.maxNum = -1;
			event.tempplayer = event.player;
			event.result = {
				winner: null,
				player: event.card1,
				targets: event.cardlist.slice(0),
				num1: [],
				num2: [],
			};
		},
		async (event, trigger, player) => {
			event.trigger("compareCardShowBefore");
		},
		async (event, trigger, player) => {
			const { targets, cards } = event;
			if (!window.decadeUI) {
				player.$compareMultiple(event.card1, targets, cards);
			} else {
				game.broadcastAll((c1, p) => {
					appendCardToSlot(".dui-compare-player-slot", c1, p);
				}, event.card1, player);
				for (let i = 0; i < targets.length; i++) {
					game.broadcastAll((t, c) => {
						appendCardToSlot(`#targetArea_${t.playerid}`, c, t);
					}, targets[i], cards[i]);
				}
			}
			game.log(player, "的拼点牌为", event.card1);
			await player.showCards(event.card1).set("triggeronly", true);
			const func = async (card, index) => {
				game.log(targets[index], "的拼点牌为", card);
				await targets[index].showCards(card).set("triggeronly", true);
			};
			await game.doAsyncInOrder(event.cardlist, func, () => 1);
			player.addTempClass("target");
			await game.delay(0, lib.config.game_speed == "vvfast" ? 4000 : 1000);
		},
		async (event, trigger, player) => {
			event.target = null;
			event.trigger("compare");
			if (window.decadeUI) {
				broadcastSyncMeanwhileCompareNumbers(
					event.tempplayer,
					event.targets,
					event.num1,
					event.result?.num2
				);
			}
		},
		async (event, trigger, player) => {
			const targets = event.targets;
			if (event.iwhile < targets.length) {
				event.target = targets[event.iwhile];
				event.target.addTempClass("target");
				event.card2 = event.cardlist[event.iwhile];
				event.num2 = event.getNum(event.card2);
				delete event.player;
				event.trigger("compare");
				if (window.decadeUI) {
					broadcastSyncMultiCompareNumbers(
						event.tempplayer,
						event.target,
						event.num1,
						event.num2
					);
				}
			} else {
				event.iwhile = 0;
				await game.delay(0, 1000);
				event.goto(9);
			}
		},
		async (event, trigger, player) => {
			event.result.num1[event.iwhile] = event.num1;
			event.result.num2[event.iwhile] = event.num2;
			const list = [
				[event.tempplayer, event.num1],
				[event.target, event.num2],
			];
			for (const i of list) {
				if (i[1] > event.maxNum) {
					event.maxNum = i[1];
					event.winner = i[0];
				} else if (event.winner && i[1] == event.maxNum && i[0] != event.winner) {
					event.winner = null;
				}
			}
		},
		async (event, trigger, player) => {
			event.iwhile++;
			event.goto(6);
		},
		async (event, trigger, player) => {
			event.player = event.tempplayer;
			event.trigger("compareFixing");
			if (window.decadeUI) {
				broadcastSyncMeanwhileCompareNumbers(
					event.tempplayer,
					event.targets,
					event.num1,
					event.result?.num2
				);
			}
		},
		async (event, trigger, player) => {
			const targets = event.targets;
			if (event.iwhile < targets.length) {
				event.target = targets[event.iwhile];
				event.card2 = event.cardlist[event.iwhile];
				event.num2 = event.result.num2[event.iwhile];
				event.trigger("compareFixing");
				if (window.decadeUI) {
					broadcastSyncMultiCompareNumbers(
						event.tempplayer,
						event.target,
						event.num1,
						event.num2
					);
				}
			} else {
				event.goto(12);
			}
		},
		async (event, trigger, player) => {
			event.iwhile++;
			event.goto(10);
		},
		async (event, trigger) => {
			const targets = event.targets;
			const player = (event.player = event.tempplayer);
			delete event.tempplayer;
			event.str = "无人拼点成功";
			const winner = event.forceWinner || event.winner;
			if (winner) {
				event.result.winner = winner;
				event.str = `${get.translation(winner)}拼点成功`;
				game.log(winner, "拼点成功");
				winner.popup("胜");
				if (window.decadeUI) {
					game.broadcastAll((w, p, ts) => {
						setSlotResult(document.querySelector(".dui-compare-player-slot"), w === p);
						for (const t of ts) {
							setSlotResult(document.querySelector(`#targetArea_${t.playerid}`), w === t);
						}
					}, winner, player, targets);
				}
			} else {
				game.log("#b无人", "拼点成功");
			}
			const list = [player].addArray(targets);
			list.remove(winner);
			for (const i of list) {
				i.popup("负");
				if (window.decadeUI) {
					game.broadcastAll(p => {
						if (p === player) {
							setSlotResult(document.querySelector(".dui-compare-player-slot"), false);
						} else {
							setSlotResult(document.querySelector(`#targetArea_${p.playerid}`), false);
						}
					}, i);
				}
			}
		},
		async (event, trigger, player) => {
			if (event.str && !window.decadeUI) {
				game.broadcastAll(str => {
					const dialog = ui.create.dialog(str);
					dialog.classList.add("center");
					setTimeout(() => dialog.close(), 1000);
				}, event.str);
			}
			await game.delay(3);
		},
		async (event, trigger, player) => {
			game.broadcastAll(ui.clear);
		},
		async (event, trigger, player) => {
			if (window.decadeUI) {
				removeComparePanel(event.compareName);
			}
			event.cards.add(event.card1);
		},
	];
}
