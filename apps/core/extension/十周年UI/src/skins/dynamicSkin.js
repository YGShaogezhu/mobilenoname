"use strict";

/**
 * @fileoverview 动态皮肤配置模块
 */
import { lib, game, ui, get, ai, _status } from "noname";

/**
 * @type {Object.<string, Object>}
 * @description 动态皮肤配置表，按武将名和皮肤名组织
 */
export const dynamicSkinConfig = {

	sunhanhua: {//孙寒华
		蛇年限定: {
			name: '袖里乾坤/袖里乾坤·组4/孙寒华/蛇年限定/XingXiang',
			shan: 'TeShu',
			x: [0, 1.30],
			y: [0, 0.50],
			scale: 0.4,
			angle: 0,
			//speed: 1,
			beijing: {
				name: '袖里乾坤/袖里乾坤·组4/孙寒华/蛇年限定/BeiJing',
				x: [0, 0.4],
				y: [0, 0.5],
				scale: 0.3,
			},
		},
		莲华熠熠: {
			name: '袖里乾坤/袖里乾坤·组4/孙寒华/莲华熠熠/XingXiang',
			x: [0, 0.10],
			y: [0, 0.25],
			scale: 0.4,
			angle: -15,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '袖里乾坤/袖里乾坤·组4/孙寒华/莲华熠熠/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5]
			},
		},
		威灵尽显: {
			name: '袖里乾坤/袖里乾坤·组4/孙寒华/威灵尽显/XingXiang',
			x: [0, 0.45],
			y: [0, 0.45],
			scale: 0.4,
			angle: -15,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '袖里乾坤/袖里乾坤·组4/孙寒华/威灵尽显/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5]
			},
		},
		蛇年狂欢: {
			name: '袖里乾坤/袖里乾坤·组4/孙寒华/蛇年狂欢/XingXiang',
			x: [0, -1.50],
			y: [0, -0.05],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			action: 'BeiJing',
			beijing: {
				name: '袖里乾坤/袖里乾坤·组4/孙寒华/蛇年狂欢/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},
		心宇同一: {
			name: '袖里乾坤/袖里乾坤·组4/孙寒华/心宇同一/XingXiang',
			x: [0, 0.65],
			y: [0, 0.2],
			angle: -24,
			scale: 0.4,
			//speed: 1,
			//action: 'DaiJi',
			skin: "skin_1",
			gongji: {
				skin: "skin_1",
			},
			beijing: {
				name: '袖里乾坤/袖里乾坤·组4/孙寒华/心宇同一/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},
		心宇同一2: {
			name: '袖里乾坤/袖里乾坤·组4/孙寒华/心宇同一2/XingXiang_1',
			x: [0, 0.65],
			y: [0, 0.35],
			scale: 0.4,
			//speed: 1,
			//action: 'DaiJi',
			skin: "skin_1",
			gongji: {
				skin: "skin_1",
			},
			beijing: {
				name: '袖里乾坤/袖里乾坤·组4/孙寒华/心宇同一2/BeiJing_1',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},
	},

};

/**
 * 设置动态皮肤模块
 * @returns {void}
 */
export function setupDynamicSkin() {
	if (!window.decadeUI) return;

	decadeUI.dynamicSkin = { ...dynamicSkinConfig };

	// 动皮共享
	const dynamicSkinExtend = {
		
	};
	decadeUI.get.extend(decadeUI.dynamicSkin, dynamicSkinExtend);
}
