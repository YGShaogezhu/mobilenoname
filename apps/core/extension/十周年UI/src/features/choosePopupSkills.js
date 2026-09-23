/**
 * 手杀选牌弹出 - 按钮入手技能白名单
 * @description 仅列表内技能的 chooseButton 会弹入手牌区；其它仍走原选牌窗口（PCD）
 */
import { lib, get } from "noname";

export const CONFIG_SKILLS_KEY = "extension_十周年UI_choosePopupSkills";

/** 默认：权计 / 排异及其常见衍生 */
export const DEFAULT_BUTTON_POPUP_SKILLS = [
	"quanji",
	"requanji",
	"gzquanji",
	"xinquanji",
	"zyquanji",
	"junquanji",
	"paiyi",
	"gzpaiyi",
	"xinpaiyi",
	"zypaiyi",
	"aocai",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
	"",
];

/** 不走按钮入手的卡牌名（五谷等） */
const BLOCKED_PARENT_CARDS = new Set(["wugu"]);

/**
 * 解析配置中的技能列表
 * @param {string} [raw]
 * @returns {string[]}
 */
export function parseChoosePopupSkillList(raw) {
	const text = (raw ?? lib.config[CONFIG_SKILLS_KEY] ?? DEFAULT_BUTTON_POPUP_SKILLS.join(",")).trim();
	if (!text) return [];
	return text
		.split(/[,，、;\s]+/)
		.map(s => s.trim())
		.filter(Boolean);
}

/**
 * 技能名是否命中列表（兼容 _backup 后缀）
 * @param {string} name
 * @param {string[]} list
 * @returns {boolean}
 */
export function hitChoosePopupSkill(name, list) {
	if (!name || !list?.length) return false;
	const base = String(name).replace(/_backup\d*$/, "");
	return list.some(skill => {
		const skillBase = skill.replace(/_backup\d*$/, "");
		return skill === name || skillBase === base || name.startsWith(skillBase + "_backup");
	});
}

/**
 * 收集事件链上的技能名
 * @param {import("noname").GameEvent} event
 * @returns {string[]}
 */
export function collectChoosePopupSkillNames(event) {
	if (!event) return [];
	const names = new Set();
	let evt = event;
	for (let depth = 0; depth < 8 && evt; depth++) {
		if (evt.skill) names.add(evt.skill);
		if (evt.result?.skill) names.add(evt.result.skill);
		if (evt.name && !["chooseButton", "chooseButtonTarget", "chooseCard", "chooseTarget"].includes(evt.name)) {
			names.add(evt.name);
		}
		if (evt.card?.name) names.add(evt.card.name);
		evt = evt.getParent?.();
	}
	return [...names];
}

/**
 * 是否为五谷等应保留原窗口的卡牌选牌
 * @param {import("noname").GameEvent} event
 * @returns {boolean}
 */
export function isBlockedCardChooseButton(event) {
	let evt = event;
	for (let depth = 0; depth < 8 && evt; depth++) {
		const cardName = evt.card?.name;
		if (cardName && BLOCKED_PARENT_CARDS.has(cardName)) return true;
		const dialog = typeof evt.dialog === "number" ? get.idDialog(evt.dialog) : evt.dialog;
		const caption = dialog?.querySelector?.(".caption")?.textContent || "";
		if (caption.includes("五谷丰登")) return true;
		evt = evt.getParent?.();
	}
	return false;
}

/**
 * 当前 chooseButton 是否应走按钮入手（白名单）
 * @param {import("noname").GameEvent} event
 * @returns {boolean}
 */
export function isChoosePopupButtonSkill(event) {
	if (!event) return false;
	if (isBlockedCardChooseButton(event)) return false;
	const list = parseChoosePopupSkillList();
	if (!list.length) return false;
	const names = collectChoosePopupSkillNames(event);
	return names.some(name => hitChoosePopupSkill(name, list));
}
