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
	scs_zhaozhong: {//赵忠
		朝华同袍:{
			name: '赵忠/朝华同袍/XingXiang',
			x: [0,0.25],
			y: [0,0.5],
			scale: 0.4,
			angle: 0,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '赵忠/朝华同袍/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},  
	},
	scs_bilan: {//毕岚
		朝华同袍:{
			name: '毕岚/朝华同袍/XingXiang',
			x: [0,1.3],
			y: [0,0.3],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '毕岚/朝华同袍/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},  
	},
	scs_gaowang: {//高望
		朝华同袍:{
			name: '高望/朝华同袍/XingXiang',
			x: [0, 0.4],
			y: [0, 0.4],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			gongji: {
				action: "GongJi_2",
				// action: ["GongJi_1", "GongJi_2"],
			},
			beijing: {
				name: '高望/朝华同袍/BeiJing',
				x: [0, 0.4],
				y: [0, 0.5],
				scale: 0.3,
			},
		},
	},
	scs_duangui: {//段珪
		朝华同袍:{
			name: '段珪/朝华同袍/XingXiang',
			x: [0,0.2],
			y: [0,0.25],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '段珪/朝华同袍/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},  
	}, 
	scs_sunzhang: {//孙璋
		朝华同袍:{
			name: '孙璋/朝华同袍/XingXiang',
			x: [0,0.1],
			y: [0,0.1],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '孙璋/朝华同袍/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},  
	},
	scs_hankui: {//韩悝
		朝华同袍:{
			name: '韩悝/朝华同袍/XingXiang',
			x: [0,0.5],
			y: [0,0.1],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '韩悝/朝华同袍/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},  
	},
	scs_xiayun: {//夏恽
		朝华同袍:{
			name: '夏恽/朝华同袍/XingXiang',
			x: [0,0.6],
			y: [0,0.15],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '夏恽/朝华同袍/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},  
	},
	scs_zhangrang: {//张让
		朝华同袍:{
			name: '张让/朝华同袍/XingXiang',
			x: [0,0.6],
			y: [0,0.15],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '张让/朝华同袍/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},  
	},
	scs_lisong: {//栗嵩
		朝华同袍:{
			name: '栗嵩/朝华同袍/XingXiang',
			x: [0,0.5],
			y: [0,0.1],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '栗嵩/朝华同袍/BeiJing',
				scale: 0.3,
				x: [0, 0.4],
				y: [0, 0.5],
			},
		},  
	},
	scs_guosheng: {//郭胜
		朝华同袍:{
			name: '郭胜/朝华同袍/XingXiang',
			x: [0,0.5],
			y: [0,0.2],
			scale: 0.5,
			angle: 0,
			//speed: 1,
			//action: 'DaiJi',
			beijing: {
				name: '郭胜/朝华同袍/BeiJing',
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
