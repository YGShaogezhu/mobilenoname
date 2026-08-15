/**
 * @fileoverview 手杀黑金卡选中特效（SS_heijinka）
 * @description 仅在 player2（newDecadeStyle=off）下，用 Spine 替换黑金卡金色选中边框
 */
import { lib } from "noname";
import { getSpineScaleSize } from "../../animation/utils.js";

/** 卡槽 DOM 尺寸（与 layout.css .card 一致） */
const CARD_BOX = { w: 108, h: 150 };
/** 黑金底框可视尺寸（素材 118×160，居中画出盒子） */
const CARD_FACE = { w: 118, h: 160 };

/**
 * 黑金卡面 → Spine 配置
 * selectFrame：骨骼里对应牌面的区域（整图 orig 含光晕，不能拿来套牌）
 * @type {Record<string, { spine: string, selectFrame: { w: number, h: number } }>}
 */
const HEIJINKA_FACES = {
	"3": {
		spine: "cardFace/heijinka1/SS_heijinka",
		selectFrame: { w: 137, h: 182 },
	},
	"4": {
		spine: "cardFace/heijinka2/SS_heijinka",
		// atlas orig 160×230，光晕较薄，牌面区占比高于 heijinka1
		selectFrame: { w: 137, h: 182 },
	},
};

/** @type {Record<string, string|null|undefined>} */
const cachedActions = Object.create(null);

/**
 * 是否为手杀样式（player2）
 * @returns {boolean}
 */
function isPlayer2Style() {
	return (decadeUI?.config?.newDecadeStyle ?? lib.config?.extension_十周年UI_newDecadeStyle) === "off";
}

/**
 * 读取黑金卡面配置
 * @param {HTMLElement} card
 * @returns {{ spine: string, selectFrame: { w: number, h: number }, face: string }|null}
 */
function getHeijinkaFaceConfig(card) {
	const face = card?.dataset?.cardFace;
	const cfg = face ? HEIJINKA_FACES[face] : null;
	return cfg ? { ...cfg, face } : null;
}

/**
 * 是否为黑金分层卡（黑金卡 / 黑金卡2）
 * @param {HTMLElement} card
 * @returns {boolean}
 */
export function isHeijinkaCard(card) {
	return Boolean(card?.classList?.contains("layered-card") && getHeijinkaFaceConfig(card));
}

/**
 * 解析带边框的动作名（优先 2 / player2）
 * @param {import("../../animation/AnimationPlayer.js").AnimationPlayer} anim
 * @param {string} spineName
 * @returns {string|undefined}
 */
function resolveBorderAction(anim, spineName) {
	if (cachedActions[spineName] !== undefined) return cachedActions[spineName] || undefined;

	if (!anim?.hasSpine?.(spineName)) return undefined;

	const actions = anim.getSpineActions?.(spineName);
	if (!actions?.length) return undefined;

	const preferred =
		actions.find(a => /player2/i.test(a.name)) ||
		actions.find(a => /(?:^|[^0-9])2(?:[^0-9]|$)/.test(a.name)) ||
		(actions.length > 1 ? actions[1] : actions[0]);

	cachedActions[spineName] = preferred?.name || null;
	return cachedActions[spineName] || undefined;
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
 * 按黑金底框（118×160）当前可视宽高计算 Spine 的非等比缩放
 * 素材发光矩形比牌扁，scaleX/scaleY 分开才能四边贴住
 * @param {HTMLElement} card
 * @param {{ w: number, h: number }} selectFrame
 * @returns {{ scaleX: number, scaleY: number }}
 */
function scaleSpineToCard(card, selectFrame) {
	// 与转化白闪相同：按布局尺寸算 scale，保 PC、修手机 zoom
	const r = getSpineScaleSize(card) || card?.getBoundingClientRect?.();
	if (!r?.width || !r?.height) return { scaleX: 0.8, scaleY: 0.8 };
	const visW = r.width * (CARD_FACE.w / CARD_BOX.w);
	const visH = r.height * (CARD_FACE.h / CARD_BOX.h);
	const clamp = v => Math.max(0.25, Math.min(v, 3.5));
	return {
		scaleX: clamp(visW / selectFrame.w),
		scaleY: clamp(visH / selectFrame.h),
	};
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
	if (!isPlayer2Style()) return;

	const cfg = getHeijinkaFaceConfig(card);
	if (!cfg) return;

	const anim = decadeUI?.animation;
	if (!anim?.playSpine || !anim.hasSpine?.(cfg.spine)) return;

	const action = resolveBorderAction(anim, cfg.spine);
	const sprite = { name: cfg.spine, loop: true, id };
	if (action) sprite.action = action;

	anim.playSpine(sprite, {
		parent: card,
		follow: true,
		...scaleSpineToCard(card, cfg.selectFrame),
	});
}

/**
 * 播放黑金选中特效
 * @param {HTMLElement} card
 */
export function playHeijinkaSelect(card) {
	if (!card || card._heijinkaSelect) return;

	const cfg = getHeijinkaFaceConfig(card);
	if (!cfg) return;

	const anim = decadeUI?.animation;
	if (!anim?.playSpine) return;

	const id = ensureSelectId(card);
	card._heijinkaSelect = id;

	if (anim.hasSpine?.(cfg.spine)) {
		startSelectSpine(card, id);
		return;
	}

	if (typeof anim.loadSpine !== "function") return;

	anim.loadSpine(
		cfg.spine,
		"skel",
		() => {
			anim.prepSpine?.(cfg.spine);
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
