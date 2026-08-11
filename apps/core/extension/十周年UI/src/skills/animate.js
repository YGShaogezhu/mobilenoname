/**
 * @fileoverview 动画技能模块
 * @description 包含游戏开始动画、边框等级、击杀特效等动画相关技能
 * @module skills/animate
 */

import { lib, game, ui, get, _status } from "noname";

/**
 * @type {Object.<string, Object>}
 * @description 动画技能集合
 */
export const animateSkill = {
	/**
	 * 游戏开始动画
	 * @description 按「开战动画」配置播放手杀开战特效
	 */
	mx_start: {
		trigger: { global: "gameDrawAfter" },
		direct: true,
		silent: true,
		popup: false,
		priority: Infinity + 114514 + 1919810,
		firstDo: true,
		filter(event, player) {
			return game.me === player;
		},
		async content(event, trigger, player) {
			game.removeGlobalSkill("mx_start");

			const config = lib.config.extension_十周年UI_kaizhan;
			if (!config || config === "off") return;

			let [style, anim] = String(config).split("|");
			if (anim === "-1") {
				if (style === "shousha") anim = ["play1", "play2", "play3"].randomGet();
			}

			const defines = {
				shousha_play: { name: "effect_youxikaishi_shousha", action: "play", scale: 0.75, speed: 1.2 },
				shousha_play1: { name: "shoushakaizhan", action: "play1", scale: 0.75, speed: 1.2 },
				shousha_play2: { name: "shoushakaizhan", action: "play2", scale: 0.75, speed: 1.2 },
				shousha_play3: { name: "shoushakaizhan", action: "play3", scale: 0.75, speed: 1.2 },
			};
			const def = defines[`${style}_${anim}`];
			if (!def || !window.decadeUI?.animation) return;

			game.playAudio("../extension", decadeUI.extensionName, "audio/gameStart.mp3");
			decadeUI.animation.playSpine(
				{ name: def.name, action: def.action, speed: def.speed },
				{ scale: def.scale }
			);
			game.delay(1);
		},
	},

	/**
	 * 边框等级随机化
	 * @description 在手杀风格下随机分配玩家边框等级
	 */
	mx_borderLevel: {
		trigger: { global: "gameStart" },
		silent: true,
		forced: true,
		filter(event, player) {
			return lib.config.extension_十周年UI_newDecadeStyle === "off" && lib.config.extension_十周年UI_borderLevel === "random";
		},
		async content(event, trigger, player) {
			game.removeGlobalSkill("mx_borderLevel");
			const levels = ["two", "three", "four", "five"];
			game.players.forEach(p => {
				// 主玩家永远five，其他玩家随机
				p.dataset.longLevel = p === game.me ? "five" : levels[Math.floor(Math.random() * levels.length)];
			});
		},
	},

	/**
	 * 用牌开始时设置延迟标记
	 * @description 防止用牌动画被过早清理
	 */
	decadeUI_usecardBegin: {
		trigger: { global: "useCardBegin" },
		forced: true,
		popup: false,
		priority: -100,
		silent: true,
		filter(event) {
			return !ui.clear.delay && event.card.name !== "wuxie";
		},
		async content() {
			ui.clear.delay = "usecard";
		},
	},

	/**
	 * 击杀特效
	 * @description 在击杀时播放特效动画
	 */
	decadeUI_dieKillEffect: {
		trigger: { source: ["dieBegin"] },
		forced: true,
		popup: false,
		priority: -100,
		lastDo: true,
		silent: true,
		filter() {
			return lib.config.extension_十周年UI_killEffect;
		},
		async content(event, trigger) {
			if (!trigger.source || !trigger.player) return;
			game.broadcastAll(
				(source, player) => {
					if (window.decadeUI) decadeUI.effect.kill(source, player);
				},
				trigger.source,
				trigger.player
			);
		},
	},

	/**
	 * 免伤特效
	 * @description 伤害被闪避或取消时播放免伤动画
	 */
	decadeUI_missDamage: {
		trigger: { player: ["damageZero", "damageCancelled"] },
		forced: true,
		charlotte: true,
		silent: true,
		popup: false,
		filter() {
			return lib.config.extension_十周年UI_shoushatexiao;
		},
		async content(event, trigger, player) {
			game.broadcastAll(player => {
				if (window.decadeUI) {
					decadeUI.animation.playSpine({ name: "Ss_PaiJu_wushang", speed: 0.8 }, { scale: 0.8, parent: player });
				}
			}, player);
		},
	},

	/**
	 * 救我特效（濒死出现）
	 */
	decadeUI_jiuwo: {
		trigger: { player: "dyingBegin" },
		firstDo: true,
		silent: true,
		charlotte: true,
		forceDie: true,
		forced: true,
		popup: false,
		filter() {
			return lib.config.extension_十周年UI_shoushatexiao;
		},
		async content(event, trigger, player) {
			game.broadcastAll(player => {
				if (!window.decadeUI) return;
				if (!_status.ss_jiuwo) {
					_status.ss_jiuwo = decadeUI.animation.playSpine(
						{ name: "SS_jiuwo", speed: 0.5 },
						{ x: [0, 0.48], y: [0, 0.4], scale: 0.8, parent: player }
					);
				} else {
					setTimeout(() => {
						if (!player.storage.ss_jiuwo) {
							player.storage.ss_jiuwo = decadeUI.animation.playSpine(
								{ name: "SS_jiuwo", speed: 0.5, loop: true },
								{ x: [0, 0.48], y: [0, 0.4], scale: 0.8, parent: player }
							);
						}
					}, 100);
				}
			}, player);
		},
	},

	/**
	 * 救我特效清除
	 */
	decadeUI_deleteJiuwo: {
		trigger: {
			player: ["recoverEnd", "changeHp", "dyingAfter", "dieBefore", "dieBegin", "dieAfter", "die"],
			global: ["phaseAfter"],
		},
		forceDie: true,
		charlotte: true,
		forced: true,
		silent: true,
		popup: false,
		filter(event, player) {
			if (!lib.config.extension_十周年UI_shoushatexiao) return false;
			if (event.name === "recover" || event.name === "changeHp") return event.player.hp > 0;
			return true;
		},
		async content(event, trigger, player) {
			game.broadcastAll(player => {
				setTimeout(() => {
					if (window.decadeUI && player.storage.ss_jiuwo) {
						decadeUI.animation.stopSpine(player.storage.ss_jiuwo);
						delete player.storage.ss_jiuwo;
					}
				}, 200);
			}, player);
		},
	},

	/**
	 * 技能发动特效
	 * @description 转换技 / 主动技 / 普通技能播放对应手杀特效
	 */
	decadeUI_logSkillJineng: {
		trigger: { player: ["logSkillBegin", "useSkillBegin"] },
		filter(event, player) {
			if (!lib.config.extension_十周年UI_shoushatexiao) return false;
			let skill;
			if (event.name === "logSkill") {
				if (!event.parent) return false;
				skill = event.parent.skill;
			} else {
				skill = event.skill;
			}
			if (!skill || skill === get.translation(skill) || lib.skill.global.includes(skill)) return false;
			const info = get.info(skill);
			return info && !info.charlotte && !info.equipSkill;
		},
		priority: 523,
		charlotte: true,
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			const skill = trigger.name === "logSkill" ? trigger.parent?.skill : trigger.skill;
			const info = get.info(skill || trigger.skill);
			game.broadcastAll(
				(info, player) => {
					if (!window.decadeUI || !info) return;
					const anim = decadeUI.animation;
					if (info.zhuanhuanji || info.zhuanhuanji2) {
						anim.playSpine("zhuanhuanji", { scale: 0.8, parent: player });
					} else if (lib.config.extension_十周年UI_newDecadeStyle === "off") {
						if (info.enable && !info.skillAnimation) {
							anim.playSpine(
								{ name: "jinengXX", speed: 1.3, opacity: 0.8 },
								{ scale: 1.12, x: [0, 0.34], y: [0, 0.51], parent: player }
							);
						} else {
							anim.playSpine({ name: "baikuang", speed: 1.2 }, { x: [0, 0.51], y: [0, 0.49], scale: 0.6, parent: player });
							anim.playSpine({ name: "jineng", speed: 0.9 }, { scale: 0.8, x: [-49, 0], y: [-31, 0], parent: player });
						}
					}
				},
				info,
				player
			);
		},
	},

	/**
	 * 妙手回春特效
	 * @description 累计三次濒死时被其他人救回时播放特效
	 */
	decadeUI_miaoshouhuichun: {
		trigger: { player: "ssmiaoshouhuichun" },
		priority: 523,
		charlotte: true,
		forced: true,
		popup: false,
		silent: true,
		filter() {
			return lib.config.extension_十周年UI_shoushatexiao;
		},
		async content() {
			game.delay(2, 2);
			game.broadcastAll(() => {
				if (!window.decadeUI) return;
				const isMobile = lib.config.extension_十周年UI_newDecadeStyle === "off";
				if (isMobile) {
					decadeUI.animation.playSpine({ name: "ss_miaoshouhuichun", scale: 0.7, speed: 0.8 });
					game.playAudio("../extension", decadeUI.extensionName, "audio/ss_miaoshouhuichun.mp3");
				}
			});
		},
	},

	/**
	 * 医术高超特效
	 * @description 一回合内恢复3体力时播放特效
	 */
	decadeUI_yishugaochao: {
		trigger: { player: "ssyishugaochao" },
		priority: 523,
		charlotte: true,
		forced: true,
		popup: false,
		silent: true,
		filter() {
			return lib.config.extension_十周年UI_shoushatexiao;
		},
		async content() {
			game.delay(2, 2);
			game.broadcastAll(() => {
				if (!window.decadeUI) return;
				const isMobile = lib.config.extension_十周年UI_newDecadeStyle === "off";
				if (isMobile) {
					decadeUI.animation.playSpine({ name: "ss_yishugaochao", scale: 0.7, speed: 0.8 });
					game.playAudio("../extension", decadeUI.extensionName, "audio/ss_yishugaochao.mp3");
				}
			});
		},
	},

	/**
	 * 医术高超 / 妙手回春计数（恢复结束）
	 */
	decadeUI_yishugaochaoStorage: {
		trigger: { player: "recoverEnd" },
		filter(event) {
			return lib.config.extension_十周年UI_shoushatexiao && event.source != undefined;
		},
		direct: true,
		charlotte: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			if (trigger.source != player) {
				if (trigger.source.storage.ss_miaoshouhuichun == undefined) {
					trigger.source.storage.ss_miaoshouhuichun = 0;
				}
				if (trigger.source.storage.ss_miaoshouhuichun >= 3) {
					delete trigger.source.storage.ss_miaoshouhuichun;
					_status.event.trigger("ssmiaoshouhuichun");
				}
			}
			if (player.storage.ss_yishugaochao == undefined) {
				player.storage.ss_yishugaochao = trigger.num;
			} else {
				player.storage.ss_yishugaochao += trigger.num;
			}
			if (player.storage.ss_yishugaochao >= 3) {
				delete player.storage.ss_yishugaochao;
				_status.event.trigger("ssyishugaochao");
			}
		},
	},

	/**
	 * 妙手回春计数（濒死被救）
	 */
	decadeUI_miaoshouhuichunStorage: {
		trigger: { player: "recoverBegin" },
		filter(event, player) {
			if (!lib.config.extension_十周年UI_shoushatexiao) return false;
			if (event.num <= -event.player.hp) return false;
			return event.source != undefined && player != event.source && player.isDying();
		},
		direct: true,
		charlotte: true,
		popup: false,
		silent: true,
		lastDo: true,
		async content(event, trigger) {
			if (trigger.source.storage.ss_miaoshouhuichun == undefined) {
				trigger.source.storage.ss_miaoshouhuichun = 1;
			} else {
				trigger.source.storage.ss_miaoshouhuichun += 1;
			}
		},
	},

	/**
	 * 回合结束清除医术高超计数
	 */
	decadeUI_deleteYishugaochao: {
		trigger: { global: "phaseAfter" },
		direct: true,
		charlotte: true,
		popup: false,
		silent: true,
		filter() {
			return lib.config.extension_十周年UI_shoushatexiao;
		},
		async content(event, trigger, player) {
			delete player.storage.ss_yishugaochao;
		},
	},
};
