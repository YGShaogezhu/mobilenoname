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
	pot_weiyan: {//势魏延
		狂志吞天: {
			name: '势魏延/狂志吞天/XingXiang',
			x: [0, 0.25],
			y: [0, 0.19],
			scale: 0.5,
			unpackPremultipliedAlpha: true,
			alpha: true,
			beijing: {
				name: '势魏延/狂志吞天/BeiJing',
				x: [0, 1.06],
				y: [0, 0.61],
				scale: 0.3,
			},
			special: {
				使命成功: {
					name: 'pot_weiyan/狂志吞天2',
				},
				使命失败: {
					name: 'pot_weiyan/狂志吞天3',
				},
				condition: {
					shimingjiSuccess: {
						transform: ["使命成功"],
					},
					shimingjiFail: {
						transform: ['使命失败'],
					},
				},
			},
		},
		狂志吞天2: {
			name: '势魏延/狂志吞天2/XingXiang',
			x: [0, 1.30],
			y: [0, 0.07],
			angle: -20,
			scale: 0.48,
			audio: {
				skill: '势魏延/audio/狂志吞天2',
				victory: '势魏延/audio/狂志吞天2',

			},
			beijing: {
				name: '势魏延/狂志吞天2/BeiJing',
				x: [0, 1.06],
				y: [0, 0.61],
				scale: 0.3,
			},
		},
		狂志吞天3: {
			name: '势魏延/狂志吞天3/XingXiang',
			x: [0, 1.84],
			y: [0, 0.18],
			scale: 0.45,
			audio: {
				skill: '势魏延/audio/狂志吞天3',
				victory: '势魏延/audio/狂志吞天3',
			},
			beijing: {
				name: '势魏延/狂志吞天3/BeiJing',
				x: [0, 1.06],
				y: [0, 0.61],
				scale: 0.3,
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
