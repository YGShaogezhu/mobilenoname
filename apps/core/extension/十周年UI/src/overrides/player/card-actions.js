/**
 * @fileoverview Player卡牌操作覆写模块
 * @description 处理玩家使用、打出、失去卡牌等操作的覆写
 * @module overrides/player/card-actions
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { getBasePlayerMethods, playShowCardAudio } from "./base.js";
import { applyCardSkin } from "../card/skin-applier.js";
import { isLayeredMode } from "../card/layered-card.js";

/**
 * 使用卡牌覆写
 * @description 在原有逻辑基础上添加出牌音效和目标高亮效果
 * @returns {Object} 事件对象
 * @this {Object} 玩家对象
 */
export function playerUseCard() {
	const base = getBasePlayerMethods();
	const event = base.useCard.apply(this, arguments);

	// 播放出牌音效
	playShowCardAudio();

	// 添加目标高亮处理器
	event.pushHandler("decadeUI_TargetHighlight", (event, option) => {
		if (option.state === "begin" && event.step === 1 && !event.hideTargets) {
			event.targets?.forEach(target => target.classList.add("target"));
		}
	});

	const originalFinish = event.finish;
	event.finish = function () {
		originalFinish?.apply(this, arguments);
		this.targets?.forEach(target => target.classList.remove("target"));
	};

	return event;
}

/**
 * 打出卡牌覆写
 * @description 仅添加出牌音效
 * @returns {*} 原方法返回值
 * @this {Object} 玩家对象
 */
export function playerRespond() {
	playShowCardAudio();
	const base = getBasePlayerMethods();
	return base.respond.apply(this, arguments);
}

/**
 * 失去卡牌覆写
 * @description 为使用/打出卡牌事件设置动画标记
 * @returns {Object} 事件对象
 * @this {Object} 玩家对象
 */
export function playerLose() {
	const base = getBasePlayerMethods();
	const next = base.lose.apply(this, arguments);

	// 获取关联事件
	const event = _status.event?.name === "loseAsync" ? _status.event.getParent() : _status.event;

	// 为使用/打出卡牌设置动画标记
	if (event?.name === "useCard" || event?.name === "respond") {
		next.animate = true;
		next.blameEvent = event;
	}

	return next;
}

/**
 * 使用卡牌动画前覆写
 * @description 有实体牌时交由 lose 抛出；纯虚拟牌在此补出牌区展示
 * @param {Object} event - 事件对象
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerUseCardAnimateBefore(event) {
	const base = getBasePlayerMethods();
	base.useCardAnimateBefore?.apply(this, arguments);
	handleUseRespondThrow(this, event);
}

/**
 * 响应动画前覆写
 * @description 有实体牌时交由 lose 抛出；纯虚拟牌在此补出牌区展示
 * @param {Object} event - 事件对象
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerRespondAnimateBefore(event) {
	const base = getBasePlayerMethods();
	base.respondAnimateBefore?.apply(this, arguments);
	handleUseRespondThrow(this, event);
}

/**
 * useCard/respond 抛牌策略
 * @param {Object} player
 * @param {Object} event
 */
function handleUseRespondThrow(player, event) {
	if (!event || event.animate === false) return;

	if (hasActualLostCards(event)) {
		event.throw = false;
		return;
	}

	// 无实体牌（如文鸯椎锋）：本体仅在 card_animation_info 开启时抛虚拟牌，这里始终补上
	if (needsVirtualThrow(event)) {
		event.throw = false;
		throwVirtualUseCard(player, event);
	}
}

/**
 * 是否需要在临时出牌区展示虚拟牌
 * @param {Object} event
 * @returns {boolean}
 */
function needsVirtualThrow(event) {
	if (!event?.card) return false;
	if (event.throw === false) return false;
	const cards = event.cards;
	return !cards || cards.length === 0;
}

/**
 * 创建并抛出虚拟牌到临时出牌区
 * @param {Object} player
 * @param {Object} event
 */
function throwVirtualUseCard(player, event) {
	const card = event.card;
	const suit = get.suit(card) || "none";
	const number = typeof card.number === "number" ? card.number : "虚拟";
	const thrown = ui.create.card().init([suit, number, card.name, card.nature]);

	if (suit === "none") {
		thrown.node.suitnum.style.display = "none";
	}

	thrown.dataset.virtual = "1";
	thrown.classList.add("temp-virtual-card");

	if (isLayeredMode()) {
		applyCardSkin(thrown, thrown);
	} else {
		const ext = window.decadeUI?.extensionName || "十周年UI";
		thrown.style.backgroundImage = `url("${lib.assetURL}extension/${ext}/image/ui/cardtexture/card1.png")`;
		thrown.style.backgroundSize = "100% 100%";
		thrown.classList.remove("decade-card");
		fillVirtualMark(thrown);
	}

	player.$throw(thrown);
}

/**
 * 非分层模式下补虚拟标记
 * @param {HTMLElement} card
 */
function fillVirtualMark(card) {
	if (!card?.$virtual || card.$virtual.firstChild) return;
	const ext = window.decadeUI?.extensionName || "十周年UI";
	const img = document.createElement("img");
	img.draggable = false;
	img.src = `${lib.assetURL}extension/${ext}/image/ui/card-base/xuni.png`;
	card.$virtual.appendChild(img);
}

/**
 * 装备变化处理覆写
 * @description 同步更新装备栏UI显示
 * @returns {void}
 * @this {Object} 玩家对象
 */
export function playerHandleEquipChange() {
	const base = getBasePlayerMethods();
	base.$handleEquipChange.apply(this, arguments);

	const player = this;

	if (player !== game.me || !ui.equipSolts) return;

	const extraEquipCount = Array.from(player.node.equips.childNodes).filter(card => ![1, 2, 3, 4, 5].includes(get.equipNum(card))).length;

	const currentExtraSlots = Array.from(ui.equipSolts.back.children).filter(el => el.dataset.type === "5").length;

	let delta = extraEquipCount - currentExtraSlots;

	if (delta > 0) {
		while (delta > 0) {
			delta--;
			const ediv = window.decadeUI.element.create(null, ui.equipSolts.back);
			ediv.dataset.type = 5;
		}
	} else if (delta < 0) {
		for (let i = 0; i > extraEquipCount; i--) {
			const element = Array.from(ui.equipSolts.back.children).find(el => el.dataset.type === "5");
			if (element?.dataset.type === "5") {
				element.remove();
			}
		}
	}
}

/**
 * 检查事件是否有实际失去的卡牌
 * @param {Object} event - 事件对象
 * @returns {boolean} 是否有实际失去的卡牌
 * @private
 */
function hasActualLostCards(event) {
	if (!event.lose_map) return false;

	return Object.keys(event.lose_map).some(item => {
		return item !== "noowner" && event.lose_map[item].length > 0;
	});
}
