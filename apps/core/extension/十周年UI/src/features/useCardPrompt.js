/**
 * @fileoverview 用牌提示
 * @description 目标提示美化、技能封牌叠字、灰色目标不可选原因
 */

import { lib, game, ui, get, _status } from "noname";
import { wrapAfter } from "../utils/safeOverride.js";

const CONFIG_KEY = "extension_十周年UI_useCardPrompt";
const BAN_MODS = ["cardEnabled2", "cardEnabled", "cardRespondable", "cardSavable"];

/**
 * 技能/事件特例文案（以后新技能在此追加）
 * 返回 string 使用该文案；返回 null 交给通用分类
 * @type {Record<string, (target: Player, event: GameEvent) => string|null>}
 */
const UNSELECTABLE_PROMPTS = {
	zuoding(target, event) {
		if (Array.isArray(event.targets) && !event.targets.includes(target)) {
			return "不是牌的目标";
		}
		return null;
	},
	qizhi(target, event) {
		if (Array.isArray(event.targets) && event.targets.includes(target)) {
			return "是牌的目标";
		}
		if (!target.countCards("he")) {
			return "没有可弃的牌";
		}
		return null;
	},
};

/**
 * 功能是否开启（默认开启）
 * @returns {boolean}
 */
function isEnabled() {
	return lib.config[CONFIG_KEY] !== false;
}

/**
 * 将本体 damage/normal-font 提示节点套上十周年样式
 * @param {HTMLElement|undefined|null} node
 */
function beautifyTargetPromptNode(node) {
	if (!node?.classList) return;
	node.classList.add("target-prompt");
	delete node.dataset.nature;
}

/**
 * 解析用于展示的技能名（子技能 → 源技能翻译）
 * @param {string} skillId
 * @returns {string}
 */
function getBanSkillLabel(skillId) {
	const info = get.info(skillId);
	let id = info?.sourceSkill || skillId;
	if (id.endsWith("_ban")) id = id.slice(0, -4);
	if (id.endsWith("_effect")) id = id.slice(0, -7);

	const tryTranslate = name => {
		const tr = get.translation(name);
		return tr && tr !== name ? tr : null;
	};

	let label = tryTranslate(id);
	if (!label) {
		const stripped = id.replace(/\d+$/, "");
		if (stripped && stripped !== id) label = tryTranslate(stripped);
	}
	if (!label) {
		const base = id.replace(/_[a-zA-Z0-9]+$/, "");
		if (base && base !== id) label = tryTranslate(base);
	}
	return label || tryTranslate(skillId) || skillId;
}

/**
 * 取用于 mod 判定的实体牌（兼容手杀弹出复制牌）
 * @param {Card} card
 * @returns {Card}
 */
function getJudgeCard(card) {
	return card?.relatedCard || card?._realid || card;
}

/**
 * 单技能某个 mod 是否把该牌判为禁用
 * @param {string} skill
 * @param {string} modName
 * @param {Card} card
 * @param {Player} player
 * @param {GameEvent} event
 * @returns {boolean}
 */
function skillBansCard(skill, modName, card, player, event) {
	const mod = get.info(skill)?.mod?.[modName];
	if (typeof mod !== "function") return false;

	try {
		if (modName === "cardEnabled2") {
			if (get.itemtype(card) !== "card") return false;
			return mod.call(game, card, player, event) === false;
		}
		if (modName === "cardRespondable") {
			if (event?.name !== "chooseToRespond") return false;
			return mod.call(game, get.autoViewAs(card), player) === false;
		}
		if (modName === "cardSavable") {
			if (event?.type !== "dying") return false;
			return mod.call(game, get.autoViewAs(card), player, event?.dying) === false;
		}
		return mod.call(game, get.autoViewAs(card), player, event) === false;
	} catch {
		return false;
	}
}

/**
 * 找出导致该牌不可用的技能 id 列表
 * @param {Card} card
 * @param {Player} player
 * @param {GameEvent} event
 * @returns {string[]}
 */
function findBanSkills(card, player, event) {
	const judgeCard = getJudgeCard(card);
	if (!judgeCard || !player) return [];

	const skills = typeof player.getModableSkills === "function" ? player.getModableSkills() : [];
	const banned = [];

	for (const skill of skills) {
		const mods = get.info(skill)?.mod;
		if (!mods) continue;
		const hit = BAN_MODS.some(name => mods[name] && skillBansCard(skill, name, judgeCard, player, event));
		if (hit) banned.push(skill);
	}
	return banned;
}

/**
 * 清除牌面封禁提示
 * @param {Card} card
 */
function clearCardBanPrompt(card) {
	if (!card) return;
	if (card._banPrompt) {
		card._banPrompt.remove();
		delete card._banPrompt;
	}
}

/**
 * 更新单张牌的封禁提示
 * @param {Card} card
 * @param {GameEvent} event
 */
function updateCardBanPrompt(card, event) {
	if (!card) return;

	if (!isEnabled() || card.classList.contains("selectable") || card.classList.contains("selected")) {
		clearCardBanPrompt(card);
		return;
	}

	const player = event?.player;
	if (!player) {
		clearCardBanPrompt(card);
		return;
	}

	const banSkills = findBanSkills(card, player, event);
	if (!banSkills.length) {
		clearCardBanPrompt(card);
		return;
	}

	const labels = [...new Set(banSkills.map(getBanSkillLabel))].filter(Boolean);
	const text = `${labels.join("/")}无法使用`;

	let node = card._banPrompt;
	if (!node) {
		node = ui.create.div(".card-ban-prompt", card);
		card._banPrompt = node;
	}
	if (node.textContent !== text) node.textContent = text;
}

/**
 * 刷新当前事件下玩家手牌的封禁提示
 * @param {GameEvent} event
 */
function refreshAllCardBanPrompts(event) {
	if (!isEnabled() || !event?.filterCard || !event.player) return;
	const position = event.position || "hs";
	const cards = event.player.getCards(position);
	for (const card of cards) {
		updateCardBanPrompt(card, event);
	}
}

/**
 * 是否为已登记技能（避免对流程事件名调用 get.info 刷 warn）
 * @param {string} name
 * @returns {boolean}
 */
function isRegisteredSkill(name) {
	return typeof name === "string" && Boolean(name) && Boolean(lib.skill?.[name]);
}

/**
 * 解析当前选目标相关的技能 id
 * @param {GameEvent} event
 * @returns {string|null}
 */
function resolveSkillId(event) {
	let cur = event;
	for (let i = 0; i < 8 && cur; i++) {
		if (isRegisteredSkill(cur.skill)) return cur.skill;
		if (isRegisteredSkill(cur.name2)) return cur.name2;
		if (typeof cur.name === "string" && cur.name) {
			if (UNSELECTABLE_PROMPTS[cur.name]) return cur.name;
			if (isRegisteredSkill(cur.name) && typeof lib.skill[cur.name].unselectablePrompt === "function") {
				return cur.name;
			}
		}
		cur = typeof cur.getParent === "function" ? cur.getParent() : null;
	}
	return null;
}

/**
 * 安全调用 filter / 判定函数
 * @param {Function} fn
 * @param {...any} args
 * @returns {boolean}
 */
function safeBool(fn, ...args) {
	if (typeof fn !== "function") return false;
	try {
		return Boolean(fn(...args));
	} catch {
		return false;
	}
}

/**
 * 特例 / 技能自定义不可选文案
 * @param {Player} target
 * @param {GameEvent} event
 * @returns {string|null}
 */
function getCustomUnselectablePrompt(target, event) {
	if (typeof event.unselectablePrompt === "function") {
		try {
			const text = event.unselectablePrompt(target, event);
			if (text) return text;
		} catch {
			/* ignore */
		}
	}

	const skillId = resolveSkillId(event);
	if (!skillId) return null;

	if (typeof UNSELECTABLE_PROMPTS[skillId] === "function") {
		const text = UNSELECTABLE_PROMPTS[skillId](target, event);
		if (text) return text;
	}

	const info = isRegisteredSkill(skillId) ? lib.skill[skillId] : null;
	if (typeof info?.unselectablePrompt === "function") {
		try {
			const text = info.unselectablePrompt(target, event);
			if (text) return text;
		} catch {
			/* ignore */
		}
	}

	const source = info?.sourceSkill;
	if (source && typeof UNSELECTABLE_PROMPTS[source] === "function") {
		const text = UNSELECTABLE_PROMPTS[source](target, event);
		if (text) return text;
	}
	return null;
}

/**
 * 通用分类：距离不够 / 不可选当前目标
 * @param {Player} target
 * @param {GameEvent} event
 * @returns {string}
 */
function getGenericUnselectablePrompt(target, event) {
	const player = event.player;
	const isCardTargetSelect = ["chooseToUse", "chooseToRespond", "chooseCardTarget"].includes(event.name);
	const card = isCardTargetSelect ? get.card() || event.card : null;

	if (card && player && lib.filter?.targetEnabledx && lib.filter?.targetInRange) {
		const enabled = safeBool(lib.filter.targetEnabledx, card, player, target);
		const inRange = safeBool(lib.filter.targetInRange, card, player, target);
		if (enabled && !inRange) return "距离不够";

		const baseOk = safeBool(lib.filter.filterTarget, card, player, target);
		const eventOk = safeBool(event.filterTarget, card, player, target);
		if (baseOk && !eventOk) return "不可选当前目标";
		if (!enabled) return "不可选当前目标";
	}

	return "不可选当前目标";
}

/**
 * 计算灰色目标原因文案
 * @param {Player} target
 * @param {GameEvent} event
 * @returns {string|null}
 */
function getUnselectableReason(target, event) {
	if (!event?.filterTarget) return null;
	if (target.isOut?.() || target.isDead?.()) return null;

	const custom = getCustomUnselectablePrompt(target, event);
	if (custom) return custom;
	return getGenericUnselectablePrompt(target, event);
}

/**
 * 清除角色不可选原因叠字
 * @param {Player} target
 */
function clearTargetBanPrompt(target) {
	if (!target) return;
	if (target._targetBanPrompt) {
		target._targetBanPrompt.remove();
		delete target._targetBanPrompt;
	}
}

/**
 * 更新角色不可选原因叠字
 * @param {Player} target
 * @param {GameEvent} event
 */
function updateTargetBanPrompt(target, event) {
	if (!target) return;

	if (
		!isEnabled() ||
		!event?.filterTarget ||
		target.classList.contains("selectable") ||
		target.classList.contains("selected") ||
		(typeof event.isMine === "function" && !event.isMine())
	) {
		clearTargetBanPrompt(target);
		return;
	}

	const text = getUnselectableReason(target, event);
	if (!text) {
		clearTargetBanPrompt(target);
		return;
	}

	let node = target._targetBanPrompt;
	if (!node) {
		node = ui.create.div(".target-ban-prompt", target);
		target._targetBanPrompt = node;
	}
	if (node.textContent !== text) node.textContent = text;
}

/**
 * 注册用牌提示（目标提示 + 封牌提示 + 灰色目标原因）
 */
export function setupUseCardPrompt() {
	// —— 目标提示美化（targetprompt / targetprompt2）——
	wrapAfter(lib.element.player, "prompt", function () {
		if (!isEnabled()) return;
		beautifyTargetPromptNode(this.node?.prompt);
	});

	lib.hooks.checkTarget.add(function decadeTargetPromptStyle(target) {
		if (!isEnabled()) return;
		beautifyTargetPromptNode(target.node?.prompt2);
	});

	// —— 灰色目标不可选原因 ——
	lib.hooks.checkTarget.add(function decadeTargetBanPrompt(target, event) {
		updateTargetBanPrompt(target, event);
	});

	lib.hooks.uncheckTarget.add(function decadeClearTargetBanPrompt(target) {
		clearTargetBanPrompt(target);
	});

	// —— 技能封牌叠字 ——
	lib.hooks.checkCard.add(function decadeCardBanPrompt(card, event) {
		updateCardBanPrompt(card, event);
	});

	lib.hooks.checkEnd.add(function decadeCardBanPromptEnd(event) {
		refreshAllCardBanPrompts(event);
	});

	lib.hooks.uncheckCard.add(function decadeClearCardBanPrompt(card) {
		clearCardBanPrompt(card);
	});
}

/** 供外部追加特例：decadeUI 或其它模块可 Object.assign */
export { UNSELECTABLE_PROMPTS };

/** @deprecated 兼容旧入口名 */
export const setupTargetPrompt = setupUseCardPrompt;
