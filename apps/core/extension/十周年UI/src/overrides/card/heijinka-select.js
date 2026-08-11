/**
 * @fileoverview 手杀黑金卡选中特效（SS_heijinka）
 * @description 仅在 player2（newDecadeStyle=off）下，用 Spine 替换黑金卡金色选中边框
 */
import { lib } from "noname";

const SPINE_NAME = "cardFace/SS_heijinka";
/** 相对素材 orig 180×240，黑金约 137×182 */
const SELECT_SCALE = 0.8;

/** @type {string|null|undefined} */
let cachedAction;

/**
 * 是否为手杀样式（player2）
 * @returns {boolean}
 */
function isPlayer2Style() {
	return (decadeUI?.config?.newDecadeStyle ?? lib.config?.extension_十周年UI_newDecadeStyle) === "off";
}

/**
 * 是否为黑金分层卡
 * @param {HTMLElement} card
 * @returns {boolean}
 */
export function isHeijinkaCard(card) {
	return Boolean(card?.classList?.contains("layered-card") && card.dataset?.cardFace === "3");
}

/**
 * 解析带边框的动作名（优先 2 / player2）
 * @param {import("../../animation/AnimationPlayer.js").AnimationPlayer} anim
 * @returns {string|undefined}
 */
function resolveBorderAction(anim) {
	if (cachedAction !== undefined) return cachedAction || undefined;

	if (!anim?.hasSpine?.(SPINE_NAME)) return undefined;

	const actions = anim.getSpineActions?.(SPINE_NAME);
	if (!actions?.length) return undefined;

	const preferred =
		actions.find(a => /player2/i.test(a.name)) ||
		actions.find(a => /(?:^|[^0-9])2(?:[^0-9]|$)/.test(a.name)) ||
		(actions.length > 1 ? actions[1] : actions[0]);

	cachedAction = preferred?.name || null;
	return cachedAction || undefined;
}

/**
 * 为卡牌分配稳定的 Spine 节点 id（兼容异步加载）
 * @param {HTMLElement} card
 * @returns {number|string}
 */
function ensureSelectId(card) {
	if (card._heijinkaSelectId == null) {
		card._heijinkaSelectId = `heijinka_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
	}
	return card._heijinkaSelectId;
}

/**
 * 停止黑金选中特效
 * @param {HTMLElement} card
 */
export function stopHeijinkaSelect(card) {
	if (!card) return;
	const id = card._heijinkaSelectId ?? card._heijinkaSelect;
	delete card._heijinkaSelect;
	if (id == null) return;
	try {
		decadeUI?.animation?.stopSpine?.(id);
	} catch (_) {
		/* ignore */
	}
}

/**
 * 在资源就绪且仍应显示时真正播放
 * @param {HTMLElement} card
 * @param {string|number} id
 */
function startSelectSpine(card, id) {
	if (card._heijinkaSelect !== id) return;
	if (!card.isConnected || !card.classList.contains("selected")) return;
	if (!isPlayer2Style() || !isHeijinkaCard(card)) return;

	const anim = decadeUI?.animation;
	if (!anim?.playSpine || !anim.hasSpine?.(SPINE_NAME)) return;

	const action = resolveBorderAction(anim);
	const sprite = { name: SPINE_NAME, loop: true, id };
	if (action) sprite.action = action;

	anim.playSpine(sprite, {
		parent: card,
		follow: true,
		scale: SELECT_SCALE,
	});
}

/**
 * 播放黑金选中特效
 * @param {HTMLElement} card
 */
export function playHeijinkaSelect(card) {
	if (!card || card._heijinkaSelect) return;

	const anim = decadeUI?.animation;
	if (!anim?.playSpine) return;

	const id = ensureSelectId(card);
	card._heijinkaSelect = id;

	if (anim.hasSpine?.(SPINE_NAME)) {
		startSelectSpine(card, id);
		return;
	}

	if (typeof anim.loadSpine !== "function") return;

	anim.loadSpine(
		SPINE_NAME,
		"skel",
		() => {
			anim.prepSpine?.(SPINE_NAME);
			startSelectSpine(card, id);
		},
		() => {
			if (card._heijinkaSelect === id) delete card._heijinkaSelect;
		}
	);
}

/**
 * 按当前 selected 状态同步特效
 * @param {HTMLElement} card
 */
export function syncHeijinkaSelect(card) {
	if (!card?.classList) return;

	const shouldPlay = card.classList.contains("selected") && isPlayer2Style() && isHeijinkaCard(card);

	if (shouldPlay) playHeijinkaSelect(card);
	else stopHeijinkaSelect(card);
}

/**
 * 监听卡牌 selected 变化，接入黑金选中特效
 * @returns {MutationObserver|null}
 */
export function initHeijinkaSelectObserver() {
	if (typeof MutationObserver === "undefined") return null;
	if (document._heijinkaSelectObserver) return document._heijinkaSelectObserver;

	const observer = new MutationObserver(mutations => {
		for (const mutation of mutations) {
			if (mutation.attributeName !== "class") continue;
			const target = mutation.target;
			if (!(target instanceof HTMLElement)) continue;
			if (!target.classList.contains("card") && !target.classList.contains("equip-card-selectable")) continue;
			syncHeijinkaSelect(target);
		}
	});

	observer.observe(document.body, {
		attributes: true,
		attributeFilter: ["class"],
		subtree: true,
	});

	document._heijinkaSelectObserver = observer;
	return observer;
}
