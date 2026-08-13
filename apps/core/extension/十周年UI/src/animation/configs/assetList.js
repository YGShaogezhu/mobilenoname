"use strict";

/**
 * @fileoverview 预加载动画资源列表配置
 */

/**
 * 动画资源列表
 * @type {Array<{name: string, follow?: boolean, fileType?: string}>}
 */
export const assetList = [
	// 出牌指示动画（手杀经典）
	{ name: "aar_chupaizhishiX" },

	// 游戏开始特效
	{ name: "effect_youxikaishi_shousha" },
	{ name: "shoushakaizhan" },

	// 手杀装备特效参考无名美化
	{ name: "equip/SSequip" },

	// 其他通用特效
	{ name: "effect_shoujidonghua" },
	{ name: "effect_tengjiafangyu" },
	{ name: "effect_tengjiaranshao" },
	{ name: "effect_loseHp" },
	// 勾玉回血 / 扣血特效
	{ name: "skeleton" },
	{ name: "skeletonxHp" },

	// 数字特效
	{ name: "globaltexiao/xunishuzi/SS_PaiJu_xunishanghai" },
	{ name: "globaltexiao/shanghaishuzi/shuzi" },

	// 更多装备特效
	{ name: "effect_jinhe" },
	{ name: "Ss_ZB_QiXingDao" },
	{ name: "effect_wufengjian" },
	{ name: "effect_yajiaoqiang" },
	{ name: "effect_yinfengjia" },
	{ name: "effect_jisha1" },
	{ name: "effect_zhenwang" },

	// 延时锦囊特效
	{ name: "effect_lebusishu" },
	{ name: "effect_bingliangcunduan" },
	{ name: "effect_shandian" },

	// 手杀卡牌使用特效（子琪版）
	{ name: "card/sha" },
	{ name: "card/shan" },
	{ name: "card/jiu" },
	{ name: "card/tao" },
	{ name: "card/nanmanruqin" },
	{ name: "card/wanjianqifa" },
	{ name: "card/taoyuanjieyi" },
	{ name: "card/wugufengdeng" },
	{ name: "card/effect_wuzhongshengyou" },
	{ name: "card/wuxiekeji" },
	{ name: "card/juedou" },
	{ name: "card/huogong" },
	{ name: "card/effect_wenheluanwu" },
	{ name: "card/effect_guguoanbang" },
	{ name: "card/effect_kefuzhongyuan" },
	{ name: "card/effect_haolingtianxia" },
	{ name: "guohechaiqiao" },
	{ name: "shunshouqianyang" },

	// 手杀局内特效（免伤 / 技能 / 救我 / 恢复体力）
	{ name: "Ss_PaiJu_wushang" },
	{ name: "SS_jiuwo" },
	{ name: "zhuanhuanji" },
	{ name: "kapaizhuanhuan" },
	{ name: "cardFace/SS_heijinka" },
	{ name: "jineng" },
	{ name: "jinengXX" },
	{ name: "baikuang" },
	{ name: "ss_miaoshouhuichun" },
	{ name: "ss_yishugaochao" },

	// 特殊装备
	{ name: "RWJGD_xiao" },
	{ name: "XRJXN_xiao" },
	{ name: "XTBGZ_xiao" },
	{ name: "ZYSZK_xiao" },
	{ name: "TYBLJ" },
	{ name: "taipingyaoshu" },
	{ name: "effect_taipingyaoshu_xiexia" },
	{ name: "feilongduofeng" },
	{ name: "Ss_mgk_fire" },
	{ name: "Ss_mgk_tslh" },
	{ name: "Ss_Gz_WuLiuJian" },
	{ name: "Ss_Gz_SanJianLiangRenDao" },
	{ name: "Ss_ZB_YiTianJian" },
	{ name: "Ss_ZB_YinFengYi" },
	{ name: "Ss_ZB_ZhanXiang" },
	{ name: "Ss_ZB_ZheJi" },
	{ name: "Ss_ZB_NvZhuang" },
	{ name: "effect_xianding", fileType: "json" },
];
