/**
 * @fileoverview 卡牌皮肤应用器
 * @description 将皮肤应用到卡牌DOM元素
 * @module overrides/card/skin-applier
 */
import { lib, get, game } from "noname";
import { cardSkinMeta, resolveCardPrettifyKey } from "../../config/utils.js";
import {
	getCardResources,
	getSkinCache,
	isSkinPreloaded,
	getFallbackKey,
	getFallbackSkinUrl,
	buildSkinUrl,
	generateSkinFilename,
	getCachedSkin,
	createSkinAsset,
	loadSkinImage,
	loadFallbackSkin,
} from "./skin-loader.js";
import { applyLayeredCard, clearLayeredCard } from "./layered-card.js";

/**
 * 获取当前皮肤配置
 * @returns {{skinKey: string|null, isOff: boolean}} 皮肤配置
 */
function getSkinConfig() {
	const raw = lib.config.extension_十周年UI_cardPrettify;
	const skinKey = resolveCardPrettifyKey(raw);
	if (skinKey !== raw) {
		game.saveConfig("extension_十周年UI_cardPrettify", skinKey);
	}
	const isOff = !skinKey || skinKey === "off";
	return { skinKey, isOff };
}

/**
 * 清除卡牌皮肤样式
 * @param {HTMLElement} cardElement - 卡牌元素
 */
function clearSkinStyle(cardElement) {
	cardElement.classList.remove("decade-card");
	cardElement.style.removeProperty("background");
	if (cardElement.classList.contains("layered-card")) {
		clearLayeredCard(cardElement);
	}
}

/**
 * 应用皮肤背景到卡牌
 * @param {HTMLElement} cardElement - 卡牌元素
 * @param {string} url - 皮肤URL
 */
function applySkinBackground(cardElement, url) {
	cardElement.style.background = `url("${url}")`;
	cardElement.classList.add("decade-card");
}

/**
 * 恢复原始背景
 * @param {HTMLElement} cardElement - 卡牌元素
 */
function restoreOriginalBackground(cardElement) {
	const rawBg = cardElement._decadeRawBg || "";
	cardElement.style.background = rawBg;
	cardElement.classList.remove("decade-card");
}

/**
 * 保存原始背景（仅首次）
 * @param {HTMLElement} cardElement - 卡牌元素
 */
function saveOriginalBackground(cardElement) {
	if (!cardElement._decadeRawBg) {
		cardElement._decadeRawBg = cardElement.style.backgroundImage || cardElement.style.background || "";
	}
}

/**
 * 处理预读完成的皮肤应用
 * @param {HTMLElement} cardElement - 卡牌元素
 * @param {string} skinKey - 皮肤键名
 * @param {string} filename - 文件名
 */
function applyPreloadedSkin(cardElement, skinKey, filename) {
	const cache = getSkinCache(skinKey);
	const asset = cache[filename];
	const fallbackKey = getFallbackKey(skinKey);

	if (asset === undefined) {
		// 主皮肤不存在，尝试回退
		const fallbackUrl = getFallbackSkinUrl(fallbackKey, filename);
		if (fallbackUrl) {
			applySkinBackground(cardElement, fallbackUrl);
		} else {
			cardElement.classList.remove("decade-card");
		}
	} else if (asset?.url) {
		applySkinBackground(cardElement, asset.url);
	} else {
		cardElement.classList.remove("decade-card");
	}
}

/**
 * 处理动态加载的皮肤应用
 * @param {HTMLElement} cardElement - 卡牌元素
 * @param {string} skinKey - 皮肤键名
 * @param {string} filename - 文件名
 */
function applyDynamicSkin(cardElement, skinKey, filename) {
	const cache = getSkinCache(skinKey);
	let asset = cache[filename];
	const fallbackKey = getFallbackKey(skinKey);

	// 已缓存且加载成功
	if (asset?.loaded === true && asset.url) {
		applySkinBackground(cardElement, asset.url);
		return;
	}

	// 已缓存但加载失败
	if (asset?.loaded === false) {
		cardElement.classList.remove("decade-card");
		return;
	}

	// 需要新加载
	if (!asset) {
		asset = createSkinAsset(filename);
		cache[filename] = asset;
	}

	// 正在加载中或需要开始加载
	if (asset.loaded === undefined) {
		const url = buildSkinUrl(skinKey, filename);
		const rawBg = cardElement._decadeRawBg || "";

		loadSkinImage({
			url,
			asset,
			onSuccess: () => {
				// 图片加载成功，背景已在下方设置
			},
			onError: () => {
				if (fallbackKey) {
					loadFallbackSkin({
						asset,
						fallbackKey,
						filename,
						onSuccess: fallbackUrl => {
							cardElement.style.background = `url("${fallbackUrl}")`;
						},
						onFail: () => {
							cardElement.style.background = rawBg;
							cardElement.classList.remove("decade-card");
						},
					});
				} else {
					asset.loaded = false;
					cardElement.style.background = rawBg;
					cardElement.classList.remove("decade-card");
				}
			},
		});

		// 先设置URL，等待加载结果
		cardElement.style.background = `url("${url}")`;
	}
}

/**
 * 应用卡牌皮肤（主入口）
 * @param {HTMLElement} cardElement - 卡牌DOM元素
 * @param {Array|Object} card - 卡牌信息
 */
export function applyCardSkin(cardElement, card) {
	// 手杀转化 vcard 窄条用 cardTitle，不走整图/分层美化
	if (cardElement?.dataset?.vcard === "true" || cardElement?.classList?.contains("vcard")) return;

	const cardName = Array.isArray(card) ? card[2] : card.name;
	const cardNature = Array.isArray(card) ? card[3] : card.nature;

	const { skinKey, isOff } = getSkinConfig();

	if (isOff) {
		clearSkinStyle(cardElement);
		return;
	}

	const skin = cardSkinMeta[skinKey];
	if (!skin) return;

	// 手杀分层拼卡：与整图美化互斥
	if (skin.mode === "layered") {
		cardElement.classList.remove("decade-card");
		cardElement.style.removeProperty("background");
		applyLayeredCard(cardElement, skin.base || "1");
		return;
	}

	// 离开分层模式时清掉零件层
	if (cardElement.classList.contains("layered-card")) {
		clearLayeredCard(cardElement);
	}

	// 保存原始背景
	saveOriginalBackground(cardElement);

	cardElement.classList.add("decade-card");

	// 隐藏卡牌不处理皮肤
	if (cardElement.classList.contains("infohidden")) return;

	const filename = generateSkinFilename(cardName, cardNature);
	const isPreloaded = isSkinPreloaded(skinKey);

	if (isPreloaded) {
		applyPreloadedSkin(cardElement, skinKey, filename);
	} else {
		applyDynamicSkin(cardElement, skinKey, filename);
	}
}

/**
 * 处理皮肤回退（用于cardCopy）
 * @param {HTMLElement} card - 卡牌元素
 * @param {Object} asset - 资源对象
 * @param {string|null} fallbackKey - 回退皮肤键名
 * @param {string} filename - 文件名
 */
export function handleSkinFallback(card, asset, fallbackKey, filename) {
	const rawBg = card._decadeRawBg || "";

	if (!fallbackKey) {
		card.style.background = rawBg;
		card.classList.remove("decade-card");
		return;
	}

	const fallbackUrl = getFallbackSkinUrl(fallbackKey, filename);
	if (fallbackUrl) {
		card.style.background = `url("${fallbackUrl}")`;
	} else {
		card.style.background = rawBg;
		card.classList.remove("decade-card");
	}
}

/**
 * 刷新卡牌皮肤（轻量级）
 * @param {HTMLElement} card - 卡牌元素
 */
export function refreshCardSkin(card) {
	if (card) {
		applyCardSkin(card, card);
	}
}
