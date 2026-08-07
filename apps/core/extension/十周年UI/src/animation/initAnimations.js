"use strict";

/**
 * @fileoverview 动画系统初始化模块，注册技能动画和卡牌触发器
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { skillDefines, cardDefines, chupaiAnimations, initCardEffects } from "./configs/skillAnimations.js";
import { cardTriggers } from "./configs/cardTriggers.js";

/**
 * 初始化技能动画定义和绑定
 * @param {AnimationPlayer} animation - 动画播放器实例
 */
export function initSkillAnimations(animation) {
	// 数字特效播放函数
	animation.playLoseHp = player => {
		if (!player) return;
		animation.playSpine("effect_loseHp", { scale: 0.6, speed: 0.8, parent: player });
	};

	animation.playVirtualDamageNumber = (player, num) => {
		if (!player || num < 0 || num > 9) return;
		animation.playSpine(
			{ name: "globaltexiao/xunishuzi/SS_PaiJu_xunishanghai", action: "play" + num },
			{ speed: 0.6, scale: 0.8, parent: player, y: 80 }
		);
	};

	animation.playDamageNumber = (player, num) => {
		if (!player || !num || num <= 1 || num > 9 || !lib.config.extension_十周年UI_newDecadeStyle) return;
		animation.playSpine(
			{ name: "globaltexiao/shanghaishuzi/shuzi", action: String(num) },
			{ speed: 0.6, scale: 0.4, parent: player }
		);
	};

	// 玩家初始化钩子 - 添加出牌指示观察器
	lib.element.player.inits = [].concat(lib.element.player.inits || []).concat(async player => {
		if (player.ChupaizhishiXObserver) return;

		let timer = null;
		const DELAY = 300;

		const startAnimation = element => {
			if (element.ChupaizhishiXid || timer) return;
			window.chupaiload = true;
			timer = setTimeout(() => {
				const raw = decadeUI.config.chupaizhishi;
				const config = raw === "off" ? "off" : "shoushaX";
				const animConfig = chupaiAnimations.shoushaX;
				if (config !== "off" && animConfig) {
					element.ChupaizhishiXid = animation.playSpine(
						{ name: animConfig.name, loop: true },
						{ parent: element, scale: animConfig.scale }
					);
				}
				timer = null;
			}, DELAY);
		};

		const stopAnimation = element => {
			if (element.ChupaizhishiXid) {
				animation.stopSpine(element.ChupaizhishiXid);
				delete element.ChupaizhishiXid;
			}
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
		};

		const observer = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.attributeName !== "class") continue;
				const target = mutation.target;
				if (target.classList.contains("selectable")) startAnimation(target);
				else stopAnimation(target);
			}
		});

		observer.observe(player, { attributes: true, attributeFilter: ["class"] });
		player.ChupaizhishiXObserver = observer;
	});

	// 注册卡牌动画（群体锦囊等已由 initCardEffects 在 useCardBegin 处理，此处不再重复）
	for (const [cardName, config] of Object.entries(cardDefines)) {
		lib.animate.card[cardName] = card => {
			animation.playSpine({ name: config.name, action: config.action, speed: config.speed }, { x: config.x, y: config.y, scale: config.scale });
		};
	}

	// 注册技能动画（装备技能等在 logSkill → trySkillAnimate 时播放）
	for (const [skillName, config] of Object.entries(skillDefines)) {
		lib.animate.skill[skillName] = function (name) {
			animation.playSpine(
				{ name: config.name, action: config.action, speed: config.speed },
				{
					x: config.x,
					y: config.y,
					scale: config.scale,
					parent: this,
				}
			);
		};
	}

	// 应用卡牌触发器
	for (const [cardName, triggers] of Object.entries(cardTriggers)) {
		if (!lib.card[cardName]) continue;
		Object.assign(lib.card[cardName], triggers);
	}

	// 手杀样式卡牌使用/结算特效
	initCardEffects();
}
