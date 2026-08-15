/**
 * @fileoverview 国战标记卡 stub 与标记显示接线
 * @module overrides/card/guozhan-biaoji
 */
import { lib, ui } from "noname";
import { setupAozhanTaoRefresh } from "./layered-card.js";

/** 技能名 → 标记卡牌名 */
export const BIAOJI_MARK_CARD = {
	xianqu_mark: "xianqu",
	yinyang_mark: "yinyangyu",
	yexinjia_mark: "yexinjia",
	zhulianbihe_mark: "zhulianbihe",
};

const BIAOJI_CARDS = {
	xianqu: { type: "special", fullskin: true },
	yinyangyu: { type: "special", fullskin: true },
	yexinjia: { type: "special", fullskin: true },
	zhulianbihe: { type: "special", fullskin: true },
};

const BIAOJI_TRANSLATE = {
	xianqu: "先驱",
	yinyangyu: "阴阳鱼",
	yexinjia: "野心家",
	zhulianbihe: "珠联璧合",
};

/**
 * 注册国战标记卡 lib.card / translate，并监听鏖战刷新
 */
export function setupGuozhanBiaojiCards() {
	for (const [name, info] of Object.entries(BIAOJI_CARDS)) {
		if (!lib.card[name]) lib.card[name] = { ...info };
		else Object.assign(lib.card[name], info);
	}
	for (const [name, text] of Object.entries(BIAOJI_TRANSLATE)) {
		if (!lib.translate[name]) lib.translate[name] = text;
	}
	setupAozhanTaoRefresh();
}

/**
 * 若为国战标记技能，创建对应标记卡 DOM（供 marks 使用）
 * @param {string} skillName
 * @returns {HTMLElement|null}
 */
export function createBiaojiMarkCard(skillName) {
	const cardName = BIAOJI_MARK_CARD[skillName];
	if (!cardName || !lib.card[cardName]) return null;
	try {
		const card = ui.create.card(ui.special, "noclick");
		card.init([null, null, cardName]);
		return card;
	} catch {
		return null;
	}
}
