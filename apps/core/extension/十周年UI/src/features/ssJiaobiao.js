/**
 * @fileoverview 手杀武将角标
 * @description 在武将右下角显示手杀风格系列角标（界/神/谋/SP 等）
 */

import { lib, get } from "noname";

const CONFIG_KEY = "extension_十周年UI_ssjiaobiao";
const IMAGE_DIR = "extension/十周年UI/image/ui/jiaobiao/";

const JIANG_LIST = ["xin_sunliang", "re_guanqiujian", "re_jikang"];
const SP_LIST = ["yangfeng"];
const KUN_LIST = [
	"lingcao",
	"sunru",
	"liuzan",
	"pangdegong",
	"th_pangdegong",
	"miheng",
	"majun",
	"th_majun",
	"zhengxuan",
	"th_zhengxuan",
	"simashi",
	"nanhualaoxian",
	"th_nanhualaoxian",
	"shichangshi",
	"k_shichangshi",
	"sunhanhua",
	"th_sunhanhua",
	"mb_zhangfen",
	"mb_cuilingyi",
	"zhuji",
	"cheliji",
	"hefei_zhangliao",
	"hefei_lidian",
	"hefei_yuejin",
];
const XUAN_LIST = ["mb_simafu", "mb_wenqin", "mb_simazhou", "mb_sp_guanqiujian", "mb_caomao", "chengji", "lizhaojiaobo", "mb_wangjing", "mb_jiachong"];
const XUAN_JIANG_LIST = ["mbjsrg_simazhao", "mbjsrg_simazhao2", "mb_simazhao"];

/**
 * 根据武将包归属判断系列标记
 * @param {string} name1
 * @returns {{ shiji: boolean, yijiang: boolean, sp: boolean, jsrg: boolean, standard: boolean, guozhan: boolean }}
 */
function resolvePackFlags(name1) {
	const flags = {
		shiji: false,
		yijiang: false,
		sp: false,
		jsrg: false,
		standard: false,
		guozhan: false,
	};

	for (const packName in lib.characterPack) {
		const pack = lib.characterPack[packName];
		if (!pack || !(name1 in pack)) continue;

		if (packName === "shiji") flags.shiji = true;
		else if (packName === "yijiang" || packName === "newjiang") flags.yijiang = true;
		else if (packName === "sp" || packName === "sp2" || packName === "mobile") flags.sp = true;
		else if (packName === "jsrg") flags.jsrg = true;
		else if (packName === "standard") flags.standard = true;
		else if (packName === "mode_guozhan") flags.guozhan = true;
	}

	return flags;
}

/**
 * 解析武将对应的角标图片名（不含扩展名）
 * @param {string} name1
 * @returns {string|null}
 */
function resolveJiaobiaoImage(name1) {
	const { shiji, yijiang, sp, jsrg, standard, guozhan } = resolvePackFlags(name1);
	const namex = get.translation(name1) || "";
	const group = lib.character?.[name1]?.[1];

	if (jsrg) return "手杀角标江";
	if (XUAN_JIANG_LIST.includes(name1)) return "手杀角标玄江";
	if (namex.includes("势")) return "手杀角标势";
	if (namex.includes("友")) return "手杀角标友";
	if (namex.includes("界")) return "手杀角标界";
	if (namex.includes("谋")) return "手杀角标谋";
	if (namex.includes("神") || group === "shen") return "手杀角标神";
	if (namex.includes("星")) return "手杀角标星";
	if (shiji) return "手杀角标计";
	if (yijiang || JIANG_LIST.includes(name1)) return "手杀角标将";
	if (KUN_LIST.includes(name1)) return "手杀角标坤";
	if (XUAN_LIST.includes(name1)) return "手杀角标玄";
	if (namex.includes("sp") || namex.includes("SP") || SP_LIST.includes(name1) || sp) return "手杀角标SP";
	if (namex.includes("标") || standard) return "手杀角标标";
	if (namex.includes("国") || namex.includes("战役篇") || guozhan || name1.startsWith("gz_")) return "手杀角标国";

	return null;
}

/**
 * 为玩家挂载手杀角标
 * @param {HTMLElement} player
 */
export function applySsJiaobiao(player) {
	if (!player?.name1 || player._ssJiaobiao) return;

	const imageName = resolveJiaobiaoImage(player.name1);
	if (!imageName) return;

	const jiaobiao = document.createElement("div");
	jiaobiao.classList.add("ss-jiaobiao");
	player.appendChild(jiaobiao);
	jiaobiao.setBackgroundImage(`${IMAGE_DIR}${imageName}.png`);
	player._ssJiaobiao = jiaobiao;
}

/**
 * 初始化手杀角标功能
 */
export function setupSsJiaobiao() {
	if (!lib.config?.[CONFIG_KEY]) return;

	lib.skill._sswujiangjiaobiao = {
		charlotte: true,
		forced: true,
		popup: false,
		firstDo: true,
		priority: 400,
		trigger: {
			global: "gameStart",
			player: "enterGame",
		},
		filter(_event, player) {
			return Boolean(player?.name1) && !player._ssJiaobiao;
		},
		async content(_event, _trigger, player) {
			applySsJiaobiao(player);
		},
	};

	if (!lib.skill.global) lib.skill.global = [];
	if (!lib.skill.global.includes("_sswujiangjiaobiao")) {
		lib.skill.global.push("_sswujiangjiaobiao");
	}
}
