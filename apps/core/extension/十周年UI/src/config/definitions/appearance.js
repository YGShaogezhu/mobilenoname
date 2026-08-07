/**
 * @fileoverview 整体外观配置定义
 * @description 纯配置数据，不包含业务逻辑
 * @module config/definitions/appearance
 */
import { createCollapseTitle, createCollapseEnd } from "../utils.js";
import { onExtensionToggleClick, onExtensionToggleUpdate, onNewDecadeStyleClick, onNewDecadeStyleUpdate, onOutcropSkinClick, onOutcropSkinUpdate, onBorderLevelUpdate, onMeanPrettifyClick, onDynamicSkinClick, onDynamicSkinOutcropUpdate } from "../handlers/appearance-handlers.js";

/**
 * 扩展开关配置
 * @type {Object}
 */
export const extensionToggle = {
	clear: true,
	onclick: onExtensionToggleClick,
	update: onExtensionToggleUpdate,
};

/**
 * 新版配置菜单配置
 * @type {Object}
 */
export const newConfigWindow = {
	name: "打开新版菜单",
	intro: "在独立窗口中打开现代化的配置界面",
	clear: true,
	onclick() {
		if (window.decadeUI?.showConfigWindow) {
			window.decadeUI.showConfigWindow();
		}
	},
};

/**
 * 调试助手配置
 * @type {Object}
 */
export const eruda = {
	name: "调试助手",
	init: false,
};

/**
 * 整体外观折叠标题
 * @type {Object}
 */
export const outward_title = createCollapseTitle("outward_title", "整体外观");

/**
 * 切换样式配置
 * @type {Object}
 */
export const newDecadeStyle = {
	name: "切换样式",
	intro: "切换武将边框样式和界面布局，选择不同设置后游戏会自动重启，电脑端支持alt+123456快捷切换",
	init: "on",
	item: {
		on: "十周年",
		off: "移动版",
		othersOff: "一将成名",
		onlineUI: "online",
		babysha: "欢乐三国杀",
		codename: "名将杀",
	},
	onclick: onNewDecadeStyleClick,
	update: onNewDecadeStyleUpdate,
};

/**
 * 露头样式配置
 * @type {Object}
 */
export const outcropSkin = {
	name: "露头样式",
	init: "off",
	item: { shizhounian: "十周年露头", shousha: "手杀露头", off: "关闭" },
	update: onOutcropSkinUpdate,
	onclick: onOutcropSkinClick,
};

/**
 * 等阶边框配置
 * @type {Object}
 */
export const borderLevel = {
	name: "等阶边框",
	init: "five",
	item: { one: "一阶", two: "二阶", three: "三阶", four: "四阶", five: "五阶", random: "随机" },
	update: onBorderLevelUpdate,
};

/**
 * 菜单美化配置
 * @type {Object}
 */
export const meanPrettify = {
	name: "菜单美化",
	intro: "开启全屏的菜单样式",
	init: false,
	onclick: onMeanPrettifyClick,
};

/**
 * 动态皮肤配置
 * @type {Object}
 */
export const dynamicSkin = {
	name: "动态皮肤",
	intro: "开启后显示动态皮肤，阵亡后也保留",
	init: false,
	onclick: onDynamicSkinClick,
};

/**
 * 动皮露头配置
 * @type {Object}
 */
export const dynamicSkinOutcrop = {
	name: "动皮露头",
	init: false,
	update: onDynamicSkinOutcropUpdate,
};

/**
 * 击杀特效配置
 * @type {Object}
 */
export const killEffect = {
	name: "击杀特效",
	intro: "开启后，击杀敌方角色时会显示击杀特效",
	init: true,
};

/**
 * 开战动画配置
 * @type {Object}
 */
export const kaizhan = {
	name: "开战动画",
	intro: "游戏开始时播放的开战特效，关闭可减少卡顿",
	init: "shousha|play",
	item: {
		off: "关闭",
		"shousha|play": "手杀|游戏开始",
		"shousha|-1": "手杀|随机",
		"shousha|play1": "手杀|双刀动画",
		"shousha|play2": "手杀|双剑动画",
		"shousha|play3": "手杀|双斧动画",
	},
};

/**
 * 整体外观折叠结束标记
 * @type {Object}
 */
export const outward_title_end = createCollapseEnd("outward_title");

/**
 * 整体外观配置集合
 * @type {Object}
 */
export const appearanceConfigs = {
	extensionToggle,
	newConfigWindow,
	eruda,
	outward_title,
	newDecadeStyle,
	outcropSkin,
	borderLevel,
	meanPrettify,
	dynamicSkin,
	dynamicSkinOutcrop,
	killEffect,
	kaizhan,
	outward_title_end,
};
