/**
 * @fileoverview 小小玩楞配置定义
 * @description 纯配置数据，不包含业务逻辑
 * @module config/definitions/misc
 */
import { createCollapseTitle, createCollapseEnd } from "../utils.js";

/**
 * 小小玩楞折叠标题
 * @type {Object}
 */
export const stuff_title = createCollapseTitle("stuff_title", "小小玩楞");

/**
 * 更多音效配置
 * @type {Object}
 */
export const bettersound = {
	name: "更多音效",
	intro: "开启后，点击卡牌或按钮和出牌弃牌会有音效播放",
	init: false,
};

/**
 * 中二模式配置
 * @type {Object}
 */
export const skillDieAudio = {
	name: "中二模式",
	intro: "众所周知，使用技能前需要吟唱。",
	init: false,
};

/**
 * 距离显示配置
 * @type {Object}
 */
export const showDistanceDisplay = {
	name: "手杀距离显示",
	intro: "开启后，将在游戏中实时显示你与其他角色的距离",
	init: false,
};

/**
 * 手杀角标配置
 * @type {Object}
 */
export const ssjiaobiao = {
	name: "手杀角标",
	intro: "开启后，武将右下角将显示手杀风格系列角标",
	init: true,
};

/**
 * 手杀装备栏美化配置
 * @type {Object}
 */
export const ssequipments = {
	name: "手杀装备",
	intro: "开启后，手杀样式下将使用手杀装备栏美化（需关闭单独装备栏）",
	init: true,
};

/**
 * 武将背景配置
 * @type {Object}
 */
export const wujiangbeijing = {
	name: "武将背景",
	init: true,
	intro: "开启后，单双将和国战模式将用设置好的武将背景",
};

/**
 * 官方势力配置
 * @type {Object}
 */
export const shiliyouhua = {
	name: "官方势力",
	init: true,
	intro: "开启后，非魏蜀吴群晋势力的角色将会重新选择势力",
};

/**
 * 装备手牌化配置
 * @type {Object}
 */
export const enableEquipCopy = {
	name: "装备入手",
	init: true,
	intro: "开启后，选择卡牌时装备区的牌会复制到手牌区显示，方便选择，即时生效",
};

/**
 * 转化卡牌类界面手杀样式配置
 * @type {Object}
 */
export const replace_dialog_shousha = {
	name: "转化卡牌类界",
	init: true,
	intro: "开启后，转化/视为类技能采用手杀交互，重启生效",
};

/**
 * 手杀牌库显示配置
 * @type {Object}
 */
export const storageIntro = {
	name: "手杀牌库显示",
	init: false,
	intro: "开启后，标记类技能显示为移动版牌库样式（可展开/收起），重启生效",
};

/**
 * 自由选将筛选框配置
 * @type {Object}
 */
export const mx_decade_characterDialog = {
	name: "自由选将筛选框",
	init: "extension-OL-system",
	intro: "更改自由选将筛选框",
	item: {
		default: "默认本体框",
		"extension-OL-system": "扩展内置框",
		offDialog: "关闭筛选框",
	},
};

/**
 * 小小玩楞折叠结束标记
 * @type {Object}
 */
export const stuff_title_end = createCollapseEnd("stuff_title");

/**
 * 小小玩楞配置集合
 * @type {Object}
 */
export const miscConfigs = {
	stuff_title,
	bettersound,
	skillDieAudio,
	showDistanceDisplay,
	ssjiaobiao,
	ssequipments,
	wujiangbeijing,
	shiliyouhua,
	mx_decade_characterDialog,
	enableEquipCopy,
	replace_dialog_shousha,
	storageIntro,
	stuff_title_end,
};
