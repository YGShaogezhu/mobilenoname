"use strict";

/**
 * @fileoverview 技能/卡牌动画配置，以及手杀样式卡牌特效注册
 * @description 卡牌特效 content 会被 StepCompiler 编译，不可依赖外层闭包
 */

import { lib, game } from "noname";

/**
 * 技能动画配置
 * @type {Object.<string, {name: string, scale?: number, action?: string, speed?: number}>}
 */
export const skillDefines = {
	// 重制版装备
	rw_bagua_skill: { name: "XTBGZ_xiao", scale: 1 },
	rw_renwang_skill: { name: "RWJGD_xiao", scale: 1 },
	rw_baiyin_skill: { name: "ZYSZK_xiao", scale: 1 },
	rw_zhuge_skill: { name: "XRJXN_xiao", scale: 1 },
	rw_tengjia1: { name: "TYBLJ", action: "TYBLJ_dang", scale: 1 },
	rw_tengjia2: { name: "TYBLJ", action: "TYBLJ_huo", scale: 1 },
	rw_tengjia3: { name: "TYBLJ", action: "TYBLJ_dang", scale: 1 },

	// 神话装备
	taipingyaoshu: { name: "taipingyaoshu", scale: 0.75 },
	taipingyaoshu_lose: { name: "effect_taipingyaoshu_xiexia", scale: 0.55 },
	yitianjian: { name: "Ss_ZB_YiTianJian", scale: 0.5 },
	yinfengyi: { name: "Ss_ZB_YinFengYi", scale: 0.5 },
	zhanxiang: { name: "Ss_ZB_ZhanXiang", scale: 0.5 },
	minguangkai_cancel: { name: "Ss_mgk_fire", scale: 0.5 },
	minguangkai_link: { name: "Ss_mgk_tslh", scale: 0.5 },
	wuliu: { name: "Ss_Gz_WuLiuJian", scale: 0.5 },
	sanjian_skill: { name: "Ss_Gz_SanJianLiangRenDao", scale: 0.4 },
	feilongduofeng: { name: "feilongduofeng", scale: 0.5 },
	ty_feilongduofeng_skill: { name: "feilongduofeng", scale: 0.5 },
	duanjian: { name: "Ss_ZB_ZheJi", scale: 0.5 },
	serafuku: { name: "Ss_ZB_NvZhuang", scale: 0.5 },
	qixingbaodao: { name: "Ss_ZB_QiXingDao", scale: 0.5 },

	// 标准装备：手杀 SSequip（技能触发时播放对应 action）
	bagua_skill: { name: "equip/SSequip", action: "bagua", scale: 1, speed: 0.8 },
	baiyin_skill: { name: "equip/SSequip", action: "baiyin", scale: 1, speed: 0.8 },
	bazhen_bagua: { name: "equip/SSequip", action: "bagua", scale: 1, speed: 0.8 },
	cixiong_skill: { name: "equip/SSequip", action: "cixong", scale: 1, speed: 0.8 },
	fangtian_skill: { name: "equip/SSequip", action: "fangtian", scale: 1, speed: 0.8 },
	guanshi_skill: { name: "equip/SSequip", action: "guanshi", scale: 1, speed: 0.8 },
	guding_skill: { name: "equip/SSequip", action: "guding", scale: 1, speed: 0.8 },
	hanbing_skill: { name: "equip/SSequip", action: "hanbing", scale: 1, speed: 0.8 },
	linglong_bagua: { name: "equip/SSequip", action: "bagua", scale: 1, speed: 0.8 },
	qibaodao: { name: "equip/SSequip", action: "qibao", scale: 1, speed: 0.8 },
	qilin_skill: { name: "equip/SSequip", action: "qilin", scale: 1, speed: 0.8 },
	qinggang_skill: { name: "equip/SSequip", action: "qinggang", scale: 1, speed: 0.8 },
	qinglong_skill: { name: "equip/SSequip", action: "qinglong", scale: 1, speed: 0.8 },
	renwang_skill: { name: "equip/SSequip", action: "renwang", scale: 1, speed: 0.8 },
	zhangba_skill: { name: "equip/SSequip", action: "zhangba", scale: 1, speed: 0.8 },
	// 朱雀/诸葛骨骼标签写反，需对调
	zhuge_skill: { name: "equip/SSequip", action: "zhuque", scale: 1, speed: 0.8 },
	zhuque_skill: { name: "equip/SSequip", action: "zhuge", scale: 1, speed: 0.8 },

	// 藤甲等仍走独立特效（不在 SSequip 覆盖范围内）
	tengjia1: { name: "effect_tengjiafangyu", scale: 0.6 },
	tengjia2: { name: "effect_tengjiaranshao", scale: 0.6 },
	tengjia3: { name: "effect_tengjiafangyu", scale: 0.6 },
	jinhe_lose: { name: "effect_jinhe", scale: 0.4 },
	wufengjian_skill: { name: "effect_wufengjian", scale: 0.4 },
	yajiaoqiang_skill: { name: "effect_yajiaoqiang", scale: 0.5 },
	yinfengjia_skill: { name: "effect_yinfengjia", scale: 0.5 },
	zheji: { name: "Ss_ZB_ZheJi", scale: 0.5 },

	// 延时锦囊（骨骼帧约 512px，移动端座位约 120×180，0.7 过大）
	lebu: { name: "effect_lebusishu", scale: 0.35 },
	bingliang: { name: "effect_bingliangcunduan", scale: 0.35 },
	shandian: { name: "effect_shandian", scale: 0.35 },
};

/**
 * 卡牌动画配置（群体锦囊已改由 useCardBegin 手杀特效播放）
 * @type {Object.<string, {name: string, scale?: number, x?: number, y?: number}>}
 */
export const cardDefines = {};

/**
 * 出牌指示动画配置
 * @type {Object.<string, {name: string, scale: number}>}
 */
export const chupaiAnimations = {
	shoushaX: { name: "aar_chupaizhishiX", scale: 0.55 },
};

/**
 * 注册手杀样式卡牌使用/结算特效
 */
export function initCardEffects() {
	if (lib.config.extension_十周年UI_kapaitexiao === false) return;

	lib.skill._decadeUI_usecard = {
		trigger: {
			player: ["useCardBegin", "respondBegin"],
		},
		charlotte: true,
		forced: true,
		firstDo: true,
		filter(event) {
			return event.card && event.card.name;
		},
		content() {
			var t = trigger.card.name;
			game.broadcastAll(
				function (game, player, t) {
					if (!window.decadeUI) return;
					var anim = window.decadeUI.animation;
					var audio = function (file) {
						game.playAudio("../extension/十周年UI/audio/" + file);
					};
					switch (t) {
						case "sha":
							anim.playSpine({ name: "card/sha", speed: 0.8 }, { scale: 1.5, parent: player });
							break;
						case "shan":
							anim.playSpine({ name: "card/shan", speed: 0.8 }, { scale: 1.5, parent: player });
							break;
						case "jiu":
							anim.playSpine({ name: "card/jiu", speed: 0.8 }, { scale: 0.85, x: [0, 0.55], y: [0, 0.45], parent: player });
							break;
						case "tao":
							anim.playSpine({ name: "card/tao", speed: 0.8 }, { scale: 0.85, y: [0, 0.45], parent: player });
							break;
						case "nanman":
							anim.playSpine({ name: "card/nanmanruqin" }, { scale: 0.7 });
							audio("nanmanruqin.mp3");
							break;
						case "wanjian":
							anim.playSpine({ name: "card/wanjianqifa" }, { scale: 0.95 });
							audio("wanjianqifa.mp3");
							break;
						case "taoyuan":
							anim.playSpine({ name: "card/taoyuanjieyi" }, { scale: 0.95 });
							audio("taoyuanjieyi.mp3");
							break;
						case "wugu":
							for (var i = 0; i < game.players.length; i++) {
								anim.playSpine({ name: "card/wugufengdeng", speed: 0.7 }, { scale: 0.7, parent: game.players[i] });
							}
							break;
						case "wuzhong":
							anim.playSpine({ name: "card/effect_wuzhongshengyou", speed: 1.3 }, { scale: 0.45, parent: player });
							break;
						case "wuxie":
							anim.playSpine({ name: "card/wuxiekeji" }, { scale: 0.7, parent: player });
							audio("wuxiekeji.mp3");
							break;
						case "juedou":
							anim.playSpine({ name: "card/juedou", speed: 1.5 }, { scale: 0.8 });
							audio("juedou.mp3");
							break;
						case "huogong":
							anim.playSpine({ name: "card/huogong", speed: 5 }, { scale: 0.75, angle: 180 });
							audio("huogong.mp3");
							break;
						case "gz_wenheluanwu":
							anim.playSpine({ name: "card/effect_wenheluanwu" }, { scale: 1 });
							audio("effect_wenheluanwu.mp3");
							break;
						case "gz_guguoanbang":
							anim.playSpine({ name: "card/effect_guguoanbang" }, { scale: 1 });
							audio("effect_guguoanbang.mp3");
							break;
						case "gz_kefuzhongyuan":
							anim.playSpine({ name: "card/effect_kefuzhongyuan" }, { scale: 1 });
							audio("effect_kefuzhongyuan.mp3");
							break;
						case "gz_haolingtianxia":
							anim.playSpine({ name: "card/effect_haolingtianxia" }, { scale: 1 });
							audio("effect_haolingtianxia.mp3");
							break;
					}
				},
				game,
				player,
				t
			);
		},
	};

	lib.skill._decadeUI_usecardtoBegin = {
		trigger: {
			player: "useCardToBegin",
		},
		forced: true,
		lastDo: true,
		priority: -1,
		charlotte: true,
		filter(event) {
			return event._triggered && event._triggered < 5;
		},
		content() {
			if (trigger.card && get.name(trigger.card, player) == "guohe" && trigger.target && trigger.target != player) {
				var t = trigger.target;
				game.broadcastAll(function (t) {
					if (!window.decadeUI) return;
					window.decadeUI.animation.playSpine(
						{ name: "guohechaiqiao", action: "zizouqi_guohechaiqiao_futou" },
						{ scale: 0.8, parent: t }
					);
					window.decadeUI.animation.playSpine(
						{ name: "guohechaiqiao", action: "zizouqi_guohechaiqiao_qiao" },
						{ scale: 0.8, parent: t }
					);
					game.playAudio("../extension/十周年UI/audio/guohechaiqiao.mp3");
				}, t);
			}
			if (trigger.card && trigger.card.name == "shunshou" && trigger.target) {
				var target = trigger.target;
				game.broadcastAll(
					function (player, target) {
						if (!window.decadeUI || !player || !target) return;
						var anim = window.decadeUI.animation;
						var APPEAR_MS = 250;
						var MOVE_MS = 800;

						// 1. 目标身上羊出现
						anim.playSpine({ name: "shunshouqianyang", action: "yangchuxian", speed: 1.5 }, { scale: 0.65, parent: target });

						var bodySize = decadeUI.get.bodySize();
						var bodyHeight = bodySize.height;
						var r1 = target.getBoundingClientRect();
						// 自己使用时终点：水平取屏幕正中，竖直取手牌区上沿；他人仍落到武将中心
						var handZone = player === game.me && (ui.handcards1Container || ui.handcards1 || ui.me);
						var r2 = (handZone || player).getBoundingClientRect();
						var x1 = r1.left + r1.width / 2;
						var y1 = bodyHeight - (r1.top + r1.height / 2);
						var x2 = handZone ? bodySize.width / 2 : r2.left + r2.width / 2;
						var y2 = handZone ? bodyHeight - r2.top + 20 : bodyHeight - (r2.top + r2.height / 2);
						var dx = x2 - x1;
						var dy = y2 - y1;
						var dist = Math.sqrt(dx * dx + dy * dy);
						var dpr = anim.dpr || 1;
						var sx = x1 * dpr;
						var sy = y1 * dpr;
						var ex = x2 * dpr;
						var ey = y2 * dpr;
						var rope = null;

						// 2. 绳子循环播放，直到羊到达后再消失
						// 绳子默认沿 Y 轴：长度随距离拉伸，粗细固定，避免远距离（如左侧）变粗
						if (dist > 1) {
							var angle = (Math.atan2(dy, dx) * 180) / Math.PI - 90;
							var lengthScale = Math.max(0.2, dist / 600);
							var thicknessScale = 0.7;
							rope = anim.playSpine(
								{ name: "shunshouqianyang", action: "xian", speed: 1, loop: true },
								{
									x: ((x1 + x2) / 2) * dpr,
									y: ((y1 + y2) / 2) * dpr,
									angle: angle,
									scaleX: thicknessScale,
									scaleY: lengthScale,
								}
							);
						}

						game.playAudio("../extension/十周年UI/audio/shunshouqianyang.mp3");

						// 3. 羊从目标飞到手牌区上方（或使用者），到达后收绳并播放落地
						setTimeout(function () {
							if (!window.decadeUI) return;
							var flying = anim.playSpine(
								{ name: "shunshouqianyang", action: "yang", speed: 1.2, loop: true },
								{ x: sx, y: sy, scale: 0.65 }
							);
							if (flying && flying.moveTo) flying.moveTo(ex, ey, MOVE_MS);

							setTimeout(function () {
								if (!window.decadeUI) return;
								if (rope) anim.stopSpine(rope);
								if (flying) anim.stopSpine(flying);
								anim.playSpine(
									{ name: "shunshouqianyang", action: "yang", speed: 1.5 },
									handZone ? { x: ex, y: ey, scale: 0.65 } : { scale: 0.65, parent: player }
								);
							}, MOVE_MS);
						}, APPEAR_MS);
					},
					player,
					target
				);
			}
		},
	};
}
