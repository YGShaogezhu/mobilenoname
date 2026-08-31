/**
 * @fileoverview 手杀选牌弹出（卡牌弹出 + 按钮弹出）
 * @description 移植自王者荣耀 / 手杀美化：
 * 1) 装备区、判定区、武将牌上的可选牌弹出到手牌区
 * 2) chooseButton 中的卡牌按钮弹出到手牌区
 * 合并为一个开关控制
 *
 * 注意：手牌 getCards 遍历的是 handcards DOM，弹出伪卡必须打标并在 uncheck 时可靠移除，
 * 且不可调用已不存在的 card.lose()。
 */
import { lib, game, ui, get, _status } from "noname";

const CONFIG_KEY = "extension_十周年UI_choosePopup";
const POPUP_FLAG = "_decadeChoosePopup";
const POPUP_CLASS = "decade-choose-popup";

const POSITION_TRANSLATE = {
	h_position: "手牌区",
	e_position: "已装备",
	j_position: "延时牌",
	s_position: "特殊区",
	x_position: "武将牌上",
	c_position: "中央区",
};

/**
 * 获取当前用于展示弹出牌的手牌容器
 * @param {Player} player
 * @returns {HTMLElement|null}
 */
function getHandContainer(player) {
	if (!player?.node) return null;
	return get.is.singleHandcard() ? player.node.handcards1 : player.node.handcards2;
}

/**
 * 获取手牌容器子节点
 * @param {Player} player
 * @returns {HTMLElement[]}
 */
function getHandcardNodes(player) {
	const container = getHandContainer(player);
	if (!container) return [];
	return container._childNodesWatcher?.childNodes || [...(container.childNodes || [])];
}

/**
 * 是否为选牌弹出伪卡
 * @param {HTMLElement} card
 * @returns {boolean}
 */
function isPopupCard(card) {
	return !!(card && (card[POPUP_FLAG] || card.classList?.contains(POPUP_CLASS)));
}

/**
 * 销毁弹出伪卡（仅拆 DOM，不走牌局 lose）
 * @param {HTMLElement} card
 */
function destroyPopupCard(card) {
	if (!card) return;
	try {
		ui.selected?.cards?.remove?.(card);
	} catch (e) {}
	delete card._realid;
	delete card.button;
	delete card[POPUP_FLAG];
	card.classList?.remove?.(POPUP_CLASS, "selectable", "selected", "glow");
	if (typeof card.delete === "function") {
		card.delete();
	} else if (typeof card.remove === "function") {
		card.remove();
	} else {
		card.parentNode?.removeChild?.(card);
	}
}

/**
 * 清除玩家手牌区中的全部弹出伪卡
 * @param {Player} player
 */
function clearPopupCards(player) {
	if (!player?.node) return;
	const fakes = getHandcardNodes(player).filter(isPopupCard);
	fakes.forEach(destroyPopupCard);
	if (player === game.me || _status.video) {
		ui.updatehl();
	}
}

/**
 * 创建弹出伪卡
 * @param {Card|object} link
 * @param {"card"|"button"} kind
 * @returns {HTMLElement}
 */
function createPopupCard(link, kind) {
	const card = ui.create.card(ui.special, "noclick", true);
	card[POPUP_FLAG] = kind;
	card.isFake = true;
	card.classList.add(POPUP_CLASS);
	card.init(link);
	// 阻断默认出牌/选牌点击，只走自定义逻辑
	card.removeEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.card);
	return card;
}

/**
 * 将弹出牌挂到手牌区
 * @param {Player} player
 * @param {HTMLElement} card
 */
function appendToHand(player, card) {
	const container = getHandContainer(player);
	if (!container) return;
	container.appendChild(card);
}

/**
 * 结束按钮弹出会话：恢复手牌、清伪卡、关提示框
 * @param {GameEvent} event
 */
function endButtonPopupSession(event) {
	if (!event) return;
	if (event.skillInfoDialog) {
		event.skillInfoDialog.close?.();
		event.skillInfoDialog.remove?.();
		delete event.skillInfoDialog;
	}
	const dialog = get.idDialog(event.dialog) || event.dialog;
	dialog?.classList?.remove?.("forcehide");
	if (event.dialog?.classList && event.dialog !== dialog) {
		event.dialog.classList.remove("forcehide");
	}
	(event.hiddenCards || []).forEach(card => card.classList?.remove?.("removing"));
	delete event.hiddenCards;
	clearPopupCards(event.player);
	delete event._buttonCard;
	delete event._decadePopupCards;
}

/**
 * 同步按钮弹出伪卡的选中外观
 * @param {HTMLElement} card
 * @param {boolean} selected
 */
function setPopupSelected(card, selected) {
	card.classList.toggle("selected", selected);
	card.updateTransform?.(selected, selected ? 100 : 0);
}

/**
 * 手杀卡牌弹出：装备区 / 判定区 / 武将牌等非手牌可选时，复制到手牌区
 */
function setupCardPopup() {
	lib.hooks.checkCard.add(function decadeChooseCardPopup(card, event) {
		if (!lib.config[CONFIG_KEY]) return;
		if (isPopupCard(card)) return;

		const player = get.player();
		if (!player?.node) return;

		const selected = ui.selected.cards;
		for (const cardx of selected) {
			if (cardx._realid && cardx[POPUP_FLAG] === "card") {
				setPopupSelected(cardx, true);
				if (selected.includes(cardx._realid)) {
					selected.remove(cardx._realid);
				}
				const idx = selected.indexOf(cardx);
				if (idx >= 0) selected[idx] = cardx._realid;
			}
		}

		if (!event.filterCard?.(card, player, event)) return;
		if (["h", "s"].includes(get.position(card))) return;
		if (player.hasCard(cardx => cardx._realid == card && isPopupCard(cardx), "hs")) return;

		const cardx = createPopupCard(card, "card");
		cardx._realid = card;
		cardx.addGaintag(get.position(card) + "_position");

		const onTap = function (e) {
			e?.stopPropagation?.();
			e?.preventDefault?.();
			const custom = _status.event.custom;
			if (typeof custom?.replace?.card == "function") {
				custom.replace.card(this._realid);
				return;
			}
			if (!_status.event.isMine()) return;
			if (!this.classList.contains("selectable")) return;

			// noclick：需自行切换选中；再点一次取消
			if (this.classList.contains("selected")) {
				setPopupSelected(this, false);
				ui.selected.cards.remove(this);
				ui.selected.cards.remove(this._realid);
				this._realid?.classList?.remove?.("selected");
			} else {
				setPopupSelected(this, true);
				ui.selected.cards.remove(this);
				ui.selected.cards.add(this._realid);
				this._realid?.classList?.add?.("selected");
			}

			if (typeof custom?.add?.card == "function") {
				custom.add.card();
			}
			game.check();
		};
		cardx.addEventListener(lib.config.touchscreen ? "touchend" : "click", onTap);

		cardx.classList.add("selectable", "glow");
		appendToHand(player, cardx);
		if (player == game.me || _status.video) {
			ui.updatehl();
		}
	});

	lib.hooks.uncheckCard.add(function decadeUncheckCardPopup(card, event) {
		if (!lib.config[CONFIG_KEY]) return;
		// getCards 会扫到伪卡；在此拆除，避免残留进手牌区
		if (isPopupCard(card)) {
			destroyPopupCard(card);
			if (event?.player == game.me || _status.video) {
				ui.updatehl();
			}
		}
	});
}

/**
 * 手杀按钮弹出：chooseButton 中卡牌按钮隐藏对话框并弹出到手牌区
 */
function setupButtonPopup() {
	lib.hooks.checkBegin.add(function decadeChooseButtonPopup(event) {
		if (!lib.config[CONFIG_KEY]) return;
		if (!["chooseButton", "chooseButtonTarget"].includes(event.name)) return;

		const player = event.player;
		if (!player?.node) return;

		let range = event.selectButton;
		if (!Array.isArray(range)) {
			range = [range, range];
		}

		// 已建立会话：伪卡还在则只刷新可选态；已被 uncheck 拆掉则重建
		if (event._buttonCard) {
			let fakeCards = (event._decadePopupCards || []).filter(card => card.isConnected);
			if (!fakeCards.length) {
				fakeCards = getHandcardNodes(player).filter(card => card[POPUP_FLAG] === "button" && card.isConnected);
			}
			if (fakeCards.length) {
				event._decadePopupCards = fakeCards;
				for (const card of fakeCards) {
					const isSelected = ui.selected.buttons.includes(card._realid);
					const disable = (() => {
						if (isSelected) return false;
						if (ui.selected.buttons.length >= range[1]) return true;
						return !event.filterButton(card._realid, player);
					})();
					card.classList.toggle("selectable", !disable);
					setPopupSelected(card, isSelected);
				}
				return;
			}
			// 伪卡已空，允许下方重建（保留 forcehide / hiddenCards）
			delete event._buttonCard;
			delete event._decadePopupCards;
		}

		const dialog = get.idDialog(event.dialog) || event.dialog || (Array.isArray(event.createDialog) ? 0 : ui.dialog);
		const canPopup = (() => {
			if (!dialog?.buttons?.length || dialog.buttons.length > 25) return false;
			if (_status.dieClose?.includes(dialog)) return false;
			for (const node of dialog.content?.querySelectorAll?.(".caption, .text.center") || []) {
				if (/装备|判定/.test((node.textContent || "").replace(/\s+/g, ""))) return false;
			}
			const handCaptions = Array.from(dialog.content?.querySelectorAll?.(".caption") || []).filter(node =>
				/手牌/.test((node.textContent || "").replace(/\s+/g, ""))
			);
			if (handCaptions.length >= 2) return false;
			return dialog.buttons.every(button => {
				if (button?.dataset?.vcard === "true" || button?.classList?.contains("vcard")) return false;
				const type = get.itemtype(button.link);
				return type === "card" || type === "cards" || button.classList?.contains("card");
			});
		})();

		if (!canPopup) return;

		// 先清残留伪卡，再开新会话（hiddenCards / forcehide 可能已由上次会话设置）
		clearPopupCards(player);

		event._buttonCard = true;
		const evt = event.parent;
		const skill = event.skill || evt?.skill || evt?.result?.skill || evt?.name;
		let buttons = dialog.buttons.filter(button => {
			const type = get.itemtype(button.link);
			return type === "card" || type === "cards" || button.classList?.contains("card");
		});
		if (!buttons.length) {
			delete event._buttonCard;
			return;
		}

		if (!event.hiddenCards) {
			const hs = player.getCards("hs").filter(c => !isPopupCard(c));
			event.hiddenCards = hs;
			hs.forEach(card => card.classList.add("removing"));
		}
		buttons = buttons.reverse();
		dialog.classList.add("forcehide");
		if (event.dialog?.classList) event.dialog.classList.add("forcehide");

		if (!event.skillInfoDialog) {
			const description = dialog._args?.length ? dialog._args.filter(arg => typeof arg == "string")[0] : get.prompt(skill);
			event.skillInfoDialog = ui.create.dialog(description);
		}

		const popupCards = [];
		for (const button of buttons) {
			const card = createPopupCard(button.link, "button");
			card._realid = button;
			card.button = button;
			card.link = button.link;
			if (button.link?.gaintag) card.addGaintag(button.link.gaintag);

			const onTap = function (e) {
				e?.stopPropagation?.();
				e?.preventDefault?.();
				const custom = _status.event.custom;
				if (typeof custom?.replace?.button == "function") {
					custom.replace.button(this.button);
					return;
				}
				if (!_status.event.isMine()) return;
				if (!this.classList.contains("selectable")) return;

				const evt = _status.event;
				let selectRange = evt.selectButton;
				if (!Array.isArray(selectRange)) {
					selectRange = [selectRange, selectRange];
				}

				// noclick：需自行切换选中；再点一次取消并恢复
				if (this.classList.contains("selected") || ui.selected.buttons.includes(this.button)) {
					setPopupSelected(this, false);
					ui.selected.buttons.remove(this.button);
					this.button?.classList?.remove?.("selected");
				} else {
					if (selectRange[1] <= 1) {
						ui.selected.buttons.slice().forEach(btn => {
							ui.selected.buttons.remove(btn);
							btn?.classList?.remove?.("selected");
						});
						(evt._decadePopupCards || []).forEach(c => setPopupSelected(c, false));
					} else if (ui.selected.buttons.length >= selectRange[1]) {
						return;
					}
					setPopupSelected(this, true);
					ui.selected.buttons.add(this.button);
					this.button?.classList?.add?.("selected");
				}

				if (typeof custom?.add?.button == "function") {
					custom.add.button();
				}
				game.check();
			};
			card.addEventListener(lib.config.touchscreen ? "touchend" : "click", onTap);

			appendToHand(player, card);
			popupCards.push(card);

			if (event.filterButton(button, player)) {
				card.classList.add("selectable");
			}
		}

		event._decadePopupCards = popupCards;
		if (player == game.me || _status.video) {
			ui.updatehl();
		}
	});

	// 仅在选牌事件结束时彻底清理，避免 check/uncheck 循环误拆会话
	lib.hooks.uncheckBegin.add(function decadeChooseButtonPopupUncheck(event) {
		if (!lib.config[CONFIG_KEY]) return;
		if (!event?._buttonCard) return;
		if (event.result !== undefined || event.finished || event.cancelled) {
			endButtonPopupSession(event);
		}
	});

	lib.hooks.uncheckEnd.add(function decadeChooseButtonPopupUncheckEnd(event) {
		if (!lib.config[CONFIG_KEY]) return;
		if (!event?._buttonCard) return;
		if (event.result !== undefined || event.finished || event.cancelled) {
			endButtonPopupSession(event);
		}
	});

	// 事件切走后兜底清理残留伪卡
	lib.hooks.checkBegin.add(function decadeChoosePopupOrphanCleanup(event) {
		if (!lib.config[CONFIG_KEY]) return;
		if (["chooseButton", "chooseButtonTarget"].includes(event?.name) && event._buttonCard) return;
		const player = event?.player || game.me;
		if (!player?.node) return;
		if (getHandcardNodes(player).some(isPopupCard)) {
			clearPopupCards(player);
		}
	});
}

/**
 * 手杀选牌弹出入口
 */
export function setupChoosePopup() {
	if (!lib.config[CONFIG_KEY]) return;

	Object.assign(lib.translate, POSITION_TRANSLATE);
	setupCardPopup();
	setupButtonPopup();
}
