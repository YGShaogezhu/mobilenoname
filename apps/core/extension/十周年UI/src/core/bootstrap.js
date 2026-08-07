/**
 * @fileoverview 扩展启动模块，负责初始化检查和兼容性验证
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { INCOMPATIBLE_MODES, RECOMMENDED_LAYOUT } from "./constants.js";

/**
 * 初始化扩展，检查兼容性
 * @returns {boolean} 是否初始化成功
 */
export const bootstrapExtension = () => {
	const mode = typeof get.mode === "function" ? get.mode() : get.mode;
	if (INCOMPATIBLE_MODES.has(mode)) return false;

	if (game.hasExtension?.("皮肤切换")) game.menuZoom = 1;

	// 单独装备栏功能已移除：强制关闭，避免旧配置影响装备入手/技能栏等
	lib.config.extension_十周年UI_aloneEquip = false;
	_status.nopopequip = false;
	if (game.saveConfig) {
		game.saveConfig("extension_十周年UI_aloneEquip", false);
	}

	if (lib.config.layout !== RECOMMENDED_LAYOUT) {
		if (confirm("十周年UI提醒您，请使用<新版>布局以获得良好体验。\n点击确定自动切换，点击取消保持当前布局。")) {
			game.saveConfig("layout", RECOMMENDED_LAYOUT);
			lib.config.layout = RECOMMENDED_LAYOUT;
			lib.arenaReady?.push(() => lib.init.layout(RECOMMENDED_LAYOUT, true));
		}
	}

	console.time(decadeUIName);
	return true;
};
