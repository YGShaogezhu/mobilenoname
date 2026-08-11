/**
 * @fileoverview 手杀装备栏美化
 * @description 手杀样式下为角色自带装备栏绘制图标、花色点数与简称（源自子琪版）
 */

import { lib, game, ui, get, _status } from "noname";

const CONFIG_KEY = "extension_十周年UI_ssequipments";

/** 装备简称映射 */
const SS_EQUIP_NAMES = {
	金箍棒: "金箍棒∞",
	吴六剑: "吴六剑2",
	机关弩: "机关弩1",
	雌雄双股剑: "雌雄剑2",
	方天画戟: "方天戟4",
	贯石斧: "贯石斧3",
	寒冰剑: "寒冰剑2",
	麒麟弓: "麒麟弓5",
	青釭剑: "青釭剑2",
	青龙偃月刀: "青龙刀3",
	丈八蛇矛: "丈八矛3",
	古锭刀: "古锭刀2",
	朱雀羽扇: "朱雀扇4",
	七宝刀: "七宝刀2",
	银月枪: "银月枪3",
	衠钢槊: "衠钢槊3",
	飞龙夺凤: "飞龙刀2",
	三尖两刃刀: "三尖刀3",
	诸葛连弩: "诸葛弩1",
	倚天剑: "倚天剑2",
	七星宝刀: "七星刀2",
	折戟: "折戟0",
	无锋剑: "无锋剑1",
	涯角枪: "涯角枪3",
	五行鹤翎扇: "五行扇4",
	断剑: "断剑0",
	霹雳车: "霹雳车9",
	霹雳投石车: "投石车",
	水波剑: "水波剑2",
	红缎枪: "红缎枪3",
	天雷刃: "天雷刃4",
	混毒弯匕: "混毒匕1",
	元戎精械弩: "精械弩3",
	乌铁锁链: "铁锁链3",
	太极拂尘: "太极拂5",
	灵宝仙壶: "灵宝壶3",
	冲应神符: "冲应符",
	先天八卦阵: "先天八卦",
	照月狮子盔: "狮子盔",
	白银狮子: "白银狮",
	仁王金刚盾: "金刚盾",
	桐油百韧甲: "百韧甲",
	定澜夜明珠: "夜明珠",
	镔铁双戟: "镔铁戟3",
	玲珑狮蛮带: "狮蛮带",
	束发紫金冠: "束发金冠",
	红棉百花袍: "百花袍",
	虚妄之冕: "虚妄之冕",
	无双方天戟: "无双戟4",
	修罗炼狱戟: "炼狱戟4",
	鬼龙斩月刀: "斩月刀3",
	赤焰镇魂琴: "镇魂琴4",
	赤血青锋: "赤血锋2",
	鸾凤和鸣剑: "鸾凤剑3",
	金乌落日弓: "落日弓9",
	刑天破军斧: "破军斧4",
	"大攻车·攻": "进击车9",
	"大攻车·守": "御守车9",
	如意金箍棒: "金箍棒3",
	思召剑: "思召剑2",
	铁蒺藜骨朵: "铁蒺藜2",
	玄剑: "玄剑3",
	镇魂琴: "镇魂琴4",
	虎翼: "虎翼3",
	姬神弓: "姬神弓5",
	宣花斧: "宣花斧3",
	百辟双匕: "百辟匕1",
	木牛流马: "木牛",
	"真·诸葛连弩": "真诸葛弩99",
	"魂·诸葛连弩": "魂诸葛弩1",
	"魂·八卦阵": "魂八卦阵",
};

let layoutCssInjected = false;
let stylesheetLoaded = false;

/**
 * 是否启用手杀装备栏美化
 * @returns {boolean}
 */
export function isSsEquipmentsEnabled() {
	return Boolean(lib.config?.[CONFIG_KEY]) && !lib.config?.extension_十周年UI_aloneEquip && lib.config?.extension_十周年UI_newDecadeStyle === "off";
}

/**
 * 注入装备槽绝对定位布局（仅一次）
 */
export function applySsEquipCss() {
	if (layoutCssInjected || document.getElementById("ss-equip-layout-css")) {
		layoutCssInjected = true;
		return;
	}
	layoutCssInjected = true;

	const style = document.createElement("style");
	style.id = "ss-equip-layout-css";
	if (window.decadeUI) {
		style.textContent = `
			.player>.equips>div,
			.player>.equips>.card {position: absolute;}
			.player>.equips>.card {top: -16px;}
			.player>.equips>div.equip1 {top: 29px;}
			.player>.equips>div.equip2 {top: 45px;}
			.player>.equips>div.equip3,
			.player>.equips>div.equip6 {top: 61px;}
			.player>.equips>div.equip4 {top: 61px;left: 48px;bottom: 0;}
			.player>.equips>div.equip5 {top: 13px;}
		`;
	} else {
		style.textContent = `
			.player>.equips>div,
			.player>.equips>.card {position: absolute;}
			.player>.equips>.card {top: -16px;}
			.player>.equips>div.equip1 {top: -9px;}
			.player>.equips>div.equip2 {top: -1px;}
			.player>.equips>div.equip3,
			.player>.equips>div.equip6 {top: 7px;}
			.player>.equips>div.equip4 {top: 15px;bottom: 0;}
			.player>.equips>div.equip5 {top: -17px;}
		`;
	}
	document.head.appendChild(style);
}

/**
 * 加载手杀装备栏样式表
 */
function loadSsEquipStylesheet() {
	if (stylesheetLoaded || document.getElementById("ss-equip-stylesheet")) return;
	stylesheetLoaded = true;
	const link = document.createElement("link");
	link.id = "ss-equip-stylesheet";
	link.rel = "stylesheet";
	link.href = `${lib.assetURL}extension/十周年UI/src/styles/ssEquip.css`;
	document.head.appendChild(link);
}

const DISTANCE_TEXT_SHADOW = "-1.3px 0px 2.2px #000, 0px -1.3px 2.2px #000, 1.3px 0px 2.2px #000 ,0px 1.3px 2.2px #000";

/** 花色 -> equip_txt 素材名 */
const SUIT_TXT_MAP = {
	spade: "heitao",
	heart: "hongxin",
	club: "caohua",
	diamond: "fangpian",
};

/**
 * ass 素材目录
 * @returns {string}
 */
function getAssPath() {
	return (window.decadeUIPath || `${lib.assetURL}extension/十周年UI/`) + "image/ui/ass/";
}

/**
 * 解析牌面点数为 1-13（对应 equip_txt_*_N）
 * @param {Object} card
 * @returns {number} 0 表示无效
 */
function resolveEquipTxtNumber(card) {
	let num = Number(card?.number);
	if (!Number.isFinite(num) || num <= 0) {
		const str = get.strNumber?.(card?.number);
		const map = { A: 1, J: 11, Q: 12, K: 13 };
		num = map[str] || parseInt(str, 10);
	}
	if (!Number.isFinite(num) || num <= 0) return 0;
	return Math.min(13, Math.max(1, Math.round(num)));
}

/**
 * 花色+点数素材路径：equip_txt_{suit}_{n}.png
 * @param {Object} card
 * @returns {string|null}
 */
function getEquipTxtSrc(card) {
	const suitKey = SUIT_TXT_MAP[card?.suit];
	const num = resolveEquipTxtNumber(card);
	if (!suitKey || !num) return null;
	return `${getAssPath()}equip_txt_${suitKey}_${num}.png`;
}

/**
 * 创建/更新花色点数图片（替代文字花色点数）
 * @param {HTMLElement} name2
 * @param {Object} card
 * @param {boolean} isMount
 * @returns {HTMLImageElement|null}
 */
function ensureEquipTxtImage(name2, card, isMount) {
	if (!name2) return null;
	const src = getEquipTxtSrc(card);
	let img = name2.querySelector("img.ss-equip-txt");
	if (!src) {
		img?.remove();
		return null;
	}
	if (!img) {
		img = document.createElement("img");
		img.className = "ss-equip-txt";
		name2.appendChild(img);
	}
	img.style.position = "absolute";
	img.style.height = "100%";
	img.style.marginLeft = isMount ? "32px" : "24px";
	img.style.marginTop = "-4px";
	img.style.transform = "scale(1.2,1.2)";
	img.style.pointerEvents = "none";
	img.setAttribute("src", src);
	img.onerror = function () {
		// 兼容用户口头命名 hongtao：若 hongxin 失败可再试（仅红桃）
		if (card?.suit === "heart" && !this.dataset.triedHongtao) {
			this.dataset.triedHongtao = "1";
			this.src = `${getAssPath()}equip_txt_hongtao_${resolveEquipTxtNumber(card)}.png`;
			return;
		}
		this.style.display = "none";
		this.onerror = null;
	};
	img.style.display = "";
	return img;
}

/**
 * 读取一张牌的距离配置
 * @param {string|Object} card
 * @returns {{ globalTo: number, globalFrom: number }}
 */
function getCardDistanceInfo(card) {
	const info = (typeof card === "string" ? lib.card?.[card] : get.info(card)) || {};
	const dist = info.distance || {};
	return {
		globalTo: Number(dist.globalTo) || 0,
		globalFrom: Number(dist.globalFrom) || 0,
	};
}

/**
 * 计算角色距离修正：技能基础 + 坐骑装备累加
 * @param {Object} player
 * @returns {{ plus: number, minus: number }} plus=防御(+globalTo)，minus=进攻显示值(|globalFrom|)
 */
function calcSsDistanceTotals(player) {
	if (!player) return { plus: 0, minus: 0 };

	const others = (game.players || []).filter(p => p !== player && !p.isDead?.());
	const other = others[0] || player;

	let skillTo = 0;
	let skillFrom = 0;
	try {
		skillTo = game.checkMod(other, player, 0, "globalTo", player) || 0;
		skillFrom = game.checkMod(player, other, 0, "globalFrom", player) || 0;
	} catch (_e) {
		skillTo = 0;
		skillFrom = 0;
	}

	let equipTo = 0;
	let equipFrom = 0;
	const seen = new Set();
	const addEquip = card => {
		const key = card?.cardid || card?.name || card;
		if (key != null && seen.has(key) && typeof key !== "object") return;
		if (key != null && typeof key !== "object") seen.add(key);
		const dist = getCardDistanceInfo(card);
		equipTo += dist.globalTo;
		equipFrom += dist.globalFrom;
	};

	const zoneEquips = typeof player.getVCards === "function" ? player.getVCards("e") : player.getCards?.("e") || [];
	for (const card of zoneEquips) addEquip(card);

	// DOM 兜底：刚装上时 VCard 可能尚未同步
	for (const node of Array.from(player.node?.equips?.childNodes || [])) {
		if (!node?.name || node.classList?.contains("emptyequip") || node.classList?.contains("feichu") || node.classList?.contains("ss-distance-marker")) {
			continue;
		}
		addEquip(node);
	}

	const plus = Math.max(0, Math.round(skillTo + equipTo));
	const minus = Math.max(0, Math.round(-(skillFrom + equipFrom)));
	return { plus, minus };
}

/**
 * 创建距离累加文字节点（马头 ma.png 之后）
 * @param {"+"|"-"} sign
 * @param {number} value
 * @returns {HTMLSpanElement}
 */
function createSsDistanceSpan(sign, value) {
	const span = document.createElement("span");
	span.className = "ss-equip-distance";
	span.dataset.sign = sign;
	span.textContent = value > 0 ? `${sign}${value}` : "";
	span.style.color = "#e9e8e3";
	span.style.fontSize = "14px";
	span.style.fontFamily = "shousha";
	span.style.fontWeight = "bold";
	span.style.position = "absolute";
	// 紧挨马头素材右侧
	span.style.marginLeft = "16px";
	span.style.marginTop = "0.5px";
	span.style.textShadow = DISTANCE_TEXT_SHADOW;
	span.style.pointerEvents = "none";
	span.style.display = value > 0 ? "" : "none";
	return span;
}

/**
 * 判断装备节点是否为防御坐骑(+)/进攻坐骑(-)
 * @param {HTMLElement} card
 * @returns {{ isPlus: boolean, isMinus: boolean }}
 */
function resolveMountSides(card) {
	if (!card || card.classList?.contains("ss-distance-marker") || card.classList?.contains("feichu") || card.classList?.contains("emptyequip")) {
		return { isPlus: false, isMinus: false };
	}
	const subtypes = typeof get.subtypes === "function" ? get.subtypes(card) || [] : [];
	const subtype = typeof get.subtype === "function" ? get.subtype(card) : subtypes[0];
	const dist = getCardDistanceInfo(card);
	const isPlus =
		subtype === "equip3" ||
		subtypes.includes("equip3") ||
		card.classList?.contains("equip3") ||
		Boolean(dist.globalTo > 0);
	const isMinus =
		subtype === "equip4" ||
		subtypes.includes("equip4") ||
		card.classList?.contains("equip4") ||
		Boolean(dist.globalFrom < 0);
	return { isPlus, isMinus };
}

/**
 * 确保坐骑使用纯马头素材 ma.png（不含自带 +/- 数字）
 * @param {HTMLElement} card
 */
function ensureMountIcon(card) {
	const name2 = card?.node?.name2;
	if (!name2) return;

	const assPath = getAssPath();
	let img = name2.querySelector("img.ss-mount-icon");
	if (!img) {
		img = name2.querySelector("img:not(.ss-equip-txt)");
		if (img) img.classList.add("ss-mount-icon");
	}
	if (!img) {
		img = document.createElement("img");
		img.className = "ss-mount-icon";
		name2.insertBefore(img, name2.firstChild);
	}
	img.style.position = "absolute";
	img.style.marginLeft = "0px";
	img.style.marginTop = "-1px";
	img.style.width = "18px";
	img.style.height = "110%";
	img.style.objectFit = "contain";
	img.style.pointerEvents = "none";
	img.setAttribute("src", `${assPath}ma.png`);
	img.onerror = function () {
		this.src = `${assPath}weizhi.png`;
		this.onerror = null;
	};
}

/**
 * 刷新坐骑显示：ma.png + 累加距离文字 + equip_txt 花色点数图
 * @param {HTMLElement} card
 * @param {"+"|"-"} sign
 * @param {number} value
 */
function setCardDistanceLabel(card, sign, value) {
	const name2 = card?.node?.name2;
	if (!name2) return;

	ensureMountIcon(card);
	ensureEquipTxtImage(name2, card, true);

	// 隐藏旧的文字花色/点数（已被 equip_txt 替代）
	for (const el of Array.from(name2.querySelectorAll("span:not(.ss-equip-distance)"))) {
		const t = (el.textContent || "").trim();
		if (!t) continue;
		// 花色符号或点数
		if (/^[♠♥♣♦♤♡♧♢◎AJKQ0-9]+$/i.test(t) || t.length <= 2) {
			el.style.display = "none";
		}
	}

	let span = name2.querySelector(".ss-equip-distance");
	if (!span) {
		span = createSsDistanceSpan(sign, value);
		const txtImg = name2.querySelector("img.ss-equip-txt");
		if (txtImg) name2.insertBefore(span, txtImg);
		else name2.appendChild(span);
	}
	span.dataset.sign = sign;
	span.textContent = value > 0 ? `${sign}${value}` : "";
	span.style.marginLeft = "16px";
	span.style.fontSize = "14px";
	span.style.display = value > 0 ? "" : "none";
}

/**
 * 获取玩家身上的距离层（挂在 player 上，绝不进入 node.equips，避免干扰装马）
 * @param {HTMLElement} player
 * @returns {HTMLElement|null}
 */
function getSsDistanceLayer(player) {
	if (!player) return null;
	let layer = player.querySelector(":scope > .ss-distance-layer");
	if (!layer) {
		layer = document.createElement("div");
		layer.className = "ss-distance-layer";
		player.appendChild(layer);
	}
	return layer;
}

/**
 * 清理误插入装备区的旧占位（兼容热更新前的错误挂载）
 * @param {Object} player
 */
function cleanupLegacyDistanceMarkers(player) {
	const equips = player?.node?.equips;
	if (!equips) return;
	for (const node of Array.from(equips.querySelectorAll(".ss-distance-marker"))) {
		node.remove();
	}
}

/**
 * 确保/移除无马时的技能距离占位
 * @param {Object} player
 * @param {"plus"|"minus"} side
 * @param {number} value
 * @param {boolean} hasRealMount
 */
function ensureDistanceMarker(player, side, value, hasRealMount) {
	const layer = getSsDistanceLayer(player);
	if (!layer) return;

	const cls = `ss-distance-${side}`;
	let marker = layer.querySelector(`.ss-distance-marker.${cls}`);

	if (hasRealMount || value <= 0) {
		marker?.remove();
		return;
	}

	const sign = side === "plus" ? "+" : "-";
	const subtype = side === "plus" ? "equip3" : "equip4";
	const hasJiaobiao = Boolean(player._ssJiaobiao || player._skmh_jiaobiao);

	if (!marker) {
		marker = document.createElement("div");
		marker.className = `ss-distance-marker ${cls}`;
		marker.dataset.ssDistance = side;
		const name2 = document.createElement("div");
		name2.className = "name2";
		marker.appendChild(name2);
		layer.appendChild(marker);
	}

	const pos =
		subtype === "equip4"
			? hasJiaobiao
				? { top: "61px", left: "43px", bottom: "0px" }
				: { top: "61px", left: "48px", bottom: "0px" }
			: { top: "61px", left: "0px" };
	for (const key in pos) marker.style[key] = pos[key];

	const name2 = marker.querySelector(".name2");
	name2.innerHTML = "";
	// 无实体马时：只显示距离数字，位置与有马时一致（原数值位，不占马头位）
	name2.appendChild(createSsDistanceSpan(sign, value));
}

/**
 * 刷新角色装备栏上的距离显示（技能基础 + 坐骑累加，纯文字无马图）
 * @param {Object} player
 */
export function refreshSsEquipDistance(player) {
	if (!player?.node?.equips || !isSsEquipmentsEnabled()) return;

	cleanupLegacyDistanceMarkers(player);

	const { plus, minus } = calcSsDistanceTotals(player);
	const cards = Array.from(player.node.equips.childNodes);
	let hasPlusMount = false;
	let hasMinusMount = false;

	for (const card of cards) {
		if (card.classList?.contains("ss-distance-marker") || card.classList?.contains("emptyequip") || card.classList?.contains("feichu")) {
			continue;
		}
		const { isPlus, isMinus } = resolveMountSides(card);
		if (isPlus) {
			hasPlusMount = true;
			setCardDistanceLabel(card, "+", plus);
		}
		if (isMinus) {
			hasMinusMount = true;
			setCardDistanceLabel(card, "-", minus);
		}
	}

	ensureDistanceMarker(player, "plus", plus, hasPlusMount);
	ensureDistanceMarker(player, "minus", minus, hasMinusMount);
}

/**
 * 刷新场上所有角色距离显示
 */
function refreshAllSsEquipDistance() {
	for (const player of game.players || []) {
		refreshSsEquipDistance(player);
	}
	for (const player of game.dead || []) {
		refreshSsEquipDistance(player);
	}
}

/**
 * 注册距离显示刷新钩子
 */
function setupDistanceRefreshHooks() {
	window.refreshSsEquipDistance = refreshSsEquipDistance;
	window.calcSsDistanceTotals = calcSsDistanceTotals;

	lib.skill._ssEquipDistanceRefresh = {
		charlotte: true,
		forced: true,
		popup: false,
		silent: true,
		priority: -Infinity,
		trigger: {
			global: ["gameStart", "dieAfter", "reviveAfter"],
			player: ["enterGame", "equipAfter", "loseAfter", "changeSkillsAfter"],
		},
		filter() {
			return isSsEquipmentsEnabled();
		},
		async content(_event, _trigger, player) {
			if (["dieAfter", "reviveAfter", "gameStart"].includes(_trigger?.name)) {
				refreshAllSsEquipDistance();
			} else {
				refreshSsEquipDistance(player);
			}
		},
	};

	if (!lib.skill.global) lib.skill.global = [];
	if (!lib.skill.global.includes("_ssEquipDistanceRefresh")) {
		lib.skill.global.push("_ssEquipDistanceRefresh");
	}
}

/**
 * 覆写 $addVirtualEquip
 */
function overrideAddVirtualEquip() {
	lib.element.player.$addVirtualEquip = function (card, cards) {
		const player = this;
		const isViewAsCard = cards.length !== 1 || cards[0].name !== card.name;
		let cardx;
		if (get.itemtype(card) === "card" && card.isViewAsCard) cardx = card;
		else {
			cardx = isViewAsCard
				? game.createCard(card.name, cards.length === 1 ? get.suit(cards[0]) : "none", cards.length === 1 ? get.number(cards[0]) : 0)
				: cards[0];
		}
		let cardShownName = get.translation(card.name);
		const subtype = get.subtypes(card)[0];
		const cardname = card.name;

		let characterCard = lib.card[cardname];
		if (characterCard?.image && characterCard.image.indexOf("character") !== -1) characterCard = true;
		else characterCard = false;

		const SSEquip = SS_EQUIP_NAMES;
		window.zqEquipCss?.();

		game.broadcastAll(
			function (card, cards, cardx, player, isViewAsCard, cardShownName, subtype, cardname, characterCard, SSEquip) {
				const assPath = (window.decadeUIPath || `${lib.assetURL}extension/十周年UI/`) + "image/ui/ass/";
				const textShadow = "-1.3px 0px 2.2px #000, 0px -1.3px 2.2px #000, 1.3px 0px 2.2px #000 ,0px 1.3px 2.2px #000";

				if (subtype == "equip1" && !SSEquip[cardShownName]) {
					let disnum = 1;
					if (lib.card[card.name]?.distance) {
						var dist = lib.card[card.name].distance;
						if (dist && dist.attackFrom) {
							disnum = -dist.attackFrom + 1;
						}
					}
					if (disnum == "Infinity") disnum = "∞";
					cardShownName += disnum.toString();
				}

				if (SSEquip[cardShownName]) cardShownName = SSEquip[cardShownName];
				cardx.fix();
				if (!cardx.isViewAsCard) {
					const cardSymbol = Symbol("card");
					cardx.cardSymbol = cardSymbol;
					cardx[cardSymbol] = card;
				}
				if (card.subtypes) {
					cardx.subtypes = card.subtypes;
				}
				cardx.style.transform = "";
				cardx.classList.remove("drawinghidden");
				delete cardx._transform;
				if (isViewAsCard && !cardx.isViewAsCard) {
					cardx.isViewAsCard = true;
					cardx.destroyLog = false;
					for (let i of cards) {
						i.goto(ui.special);
						i.destiny = player.node.equips;
					}
					if (cardx.destroyed) {
						cardx._destroyed_Virtua = cardx.destroyed;
					}
					cardx.destroyed = function (card, id, player, event) {
						if (card._destroyed_Virtua) {
							if (typeof card._destroyed_Virtua == "function") {
								let bool = card._destroyed_Virtua(card, id, player, event);
								if (bool === true) {
									return true;
								}
							} else if (lib.skill[card._destroyed_Virtua]) {
								if (player) {
									if (player.hasSkill(card._destroyed_Virtua)) {
										delete card._destroyed_Virtua;
										return false;
									}
								}
								return true;
							} else if (typeof card._destroyed_Virtua == "string") {
								return card._destroyed_Virtua == id;
							} else if (card._destroyed_Virtua === true) {
								return true;
							}
						}
						if (id != "equip") {
							return true;
						}
					};
				}

				const suitfont = get.translation(cardx.suit),
					number = get.strNumber(cardx.number);
				const isMount = subtype == "equip3" || subtype == "equip4";
				const suitTxtMap = { spade: "heitao", heart: "hongxin", club: "caohua", diamond: "fangpian" };
				const suitTxtKey = suitTxtMap[cardx.suit];
				let suitTxtNum = Number(cardx.number);
				if (!Number.isFinite(suitTxtNum) || suitTxtNum <= 0) {
					const nmap = { A: 1, J: 11, Q: 12, K: 13 };
					suitTxtNum = nmap[number] || parseInt(number, 10) || 0;
				}
				const hasEquipTxt = Boolean(suitTxtKey && suitTxtNum >= 1 && suitTxtNum <= 13);

				// 文字花色/点数：无 equip_txt 素材时回退
				let suitnum = document.createElement("span");
				suitnum.innerHTML = `${suitfont}`;
				if (suitfont == get.translation("none")) {
					if (number == "0") suitnum.innerHTML = "";
					else suitnum.innerHTML = "◎";
				}
				suitnum.style.color = cardx.suit == "diamond" || cardx.suit == "heart" ? "#ef1806" : "#8DBEDE";
				suitnum.style.fontSize = "9px";
				suitnum.style.fontFamily = "shousha";
				suitnum.style.position = "absolute";
				suitnum.style.marginLeft = isMount ? "32px" : "22px";
				suitnum.style.textShadow = textShadow;
				if (hasEquipTxt) suitnum.style.display = "none";

				let numsuit = document.createElement("span");
				numsuit.innerHTML = `${number}`;
				if (number == "0") numsuit.innerHTML = "";
				numsuit.style.color = cardx.suit == "diamond" || cardx.suit == "heart" ? "#ef1806" : "#8DBEDE";
				numsuit.style.fontSize = "16px";
				numsuit.style.fontFamily = "shousha";
				numsuit.style.position = "absolute";
				numsuit.style.marginLeft = isMount ? "45px" : "31px";
				numsuit.style.marginTop = "0.5px";
				numsuit.style.textShadow = textShadow;
				if (hasEquipTxt) numsuit.style.display = "none";

				let equipname = document.createElement("span");
				if (SSEquip[cardShownName]) cardShownName = SSEquip[cardShownName];
				equipname.style.color = "#e9e8e3";
				equipname.style.fontSize = "16px";
				equipname.style.fontFamily = "shousha";
				equipname.style.position = "absolute";
				equipname.style.marginLeft = "42px";
				if (suitfont == get.translation("none") || number == "0") equipname.style.marginLeft = "32px";
				if (suitfont == get.translation("none") && number == "0") equipname.style.marginLeft = "21px";
				equipname.style.marginTop = "0.5px";
				equipname.style.textShadow = textShadow;
				// 坐骑：名称位改为距离数字；其它装备显示简称
				if (window.decadeUI && isMount) {
					equipname.className = "ss-equip-distance";
					equipname.dataset.sign = subtype == "equip3" ? "+" : "-";
					equipname.style.marginLeft = "16px";
					equipname.style.fontSize = "14px";
					equipname.innerHTML = "";
				} else {
					equipname.innerHTML = cardShownName;
				}

				cardx.node.name2.innerHTML = "";
				let newele = document.createElement("img");
				if (isMount) {
					// 纯马头素材，+/- 由文字生成
					newele.className = "ss-mount-icon";
					newele.setAttribute("src", assPath + "ma.png");
					newele.style.marginLeft = "0px";
					newele.style.marginTop = "-1px";
					newele.style.width = "18px";
					newele.style.height = "110%";
					newele.style.objectFit = "contain";
				} else {
					newele.setAttribute("src", assPath + `${characterCard ? "character" : cardname}` + ".png");
					newele.style.opacity = "1";
					newele.style.height = "100%";
					newele.style.marginLeft = "7px";
					newele.style.marginTop = "-1px";
					newele.style.transform = "scale(0.85,0.9)";
				}
				newele.onerror = function () {
					this.src = assPath + "weizhi.png";
					this.onerror = null;
				};
				newele.style.position = "absolute";
				cardx.node.name2.appendChild(newele);

				if (hasEquipTxt) {
					const txtImg = document.createElement("img");
					txtImg.className = "ss-equip-txt";
					txtImg.setAttribute("src", assPath + `equip_txt_${suitTxtKey}_${suitTxtNum}.png`);
					txtImg.style.position = "absolute";
					txtImg.style.height = "100%";
					txtImg.style.marginLeft = isMount ? "32px" : "24px";
					txtImg.style.marginTop = "-4px";
					txtImg.style.transform = "scale(1.2,1.2)";
					txtImg.style.pointerEvents = "none";
					txtImg.onerror = function () {
						if (cardx.suit === "heart" && !this.dataset.triedHongtao) {
							this.dataset.triedHongtao = "1";
							this.src = assPath + `equip_txt_hongtao_${suitTxtNum}.png`;
							return;
						}
						this.style.display = "none";
						suitnum.style.display = "";
						numsuit.style.display = "";
						this.onerror = null;
					};
					cardx.node.name2.appendChild(txtImg);
				}

				cardx.node.name2.appendChild(suitnum);
				cardx.node.name2.appendChild(numsuit);
				cardx.node.name2.appendChild(equipname);

				if (isViewAsCard) {
					cardx.cards = cards || [];
					cardx.viewAs = card.name;
					cardx.classList.add("fakeequip");
				} else {
					delete cardx.viewAs;
					cardx.classList.remove("fakeequip");
				}
				let equipped = false,
					equipNum = get.equipNum(cardx);
				if (player.node.equips.childNodes.length) {
					for (let i = 0; i < player.node.equips.childNodes.length; i++) {
						const node = player.node.equips.childNodes[i];
						if (typeof node?.name !== "string" || node.classList?.contains("ss-distance-marker")) continue;
						if (get.equipNum(node) >= equipNum) {
							equipped = true;
							player.node.equips.insertBefore(cardx, node);
							break;
						}
					}
				}
				if (equipped === false) {
					player.node.equips.appendChild(cardx);
					if (cards?.length && _status.discarded) _status.discarded.removeArray(cards);
				}

				cardx.classList.add("ss-equip-card");
				cardx.classList.add("sk_taofen_zbxf_zqlrb");
				if (subtype == "equip3" || subtype == "equip4") {
					cardx.classList.add(subtype);
				}

				if (!window.decadeUI) return;

				let taofenlist = {
					equip1: { top: "29px" },
					equip2: { top: "45px" },
					equip3: { top: "61px" },
					equip4: { top: "61px", left: "48px", bottom: "0px" },
					equip4_jiaobiao: { top: "61px", left: "43px", bottom: "0px" },
					equip5: { top: "13px" },
					get equip6() {
						return this.equip3;
					},
				};
				const hasJiaobiao = Boolean(player._ssJiaobiao || player._skmh_jiaobiao);
				const lulu = subtype == "equip4" && hasJiaobiao ? taofenlist["equip4_jiaobiao"] : taofenlist[subtype];
				if (lulu) {
					for (const taofen in lulu) {
						cardx.style[taofen] = lulu[taofen];
					}
				}

				if (subtype == "equip1") {
					var wuqi = player.countCards("e", { subtype: "equip1" });
					if (wuqi > 1) player.node.marks.style.setProperty("bottom", "86px", "important");
					for (var i = wuqi - 1; i >= 0; i--) {
						var equipCard = player.getCards("e", { subtype: "equip1" })[i];
						if (i == wuqi - 1) equipCard.style.top = "29px";
						else equipCard.style.top = "calc(" + (i - 0.2) * 20 + "%)";
					}
				}

				// 坐骑：左侧保留 +1/-1 素材，名称位写入技能+马的累加数字
				window.refreshSsEquipDistance?.(player);
			},
			card,
			cards,
			cardx,
			player,
			isViewAsCard,
			cardShownName,
			subtype,
			cardname,
			characterCard,
			SSEquip
		);
	};
}

/**
 * 覆写 $syncDisable（废除栏美化）
 */
function overrideSyncDisable() {
	lib.element.player.$syncDisable = function (map) {
		window.zqEquipCss?.();
		const suits = { equip1: "none", equip2: "none", equip3: "none", equip4: "none", equip5: "none", equip6: "none" };
		if (!map) {
			map = this.disabledSlots || {};
		}
		game.addVideo("$syncDisable", this, get.copy(map));
		game.broadcast(
			function (player2, map3) {
				player2.disabledSlots = map3;
				player2.$syncDisable(map3);
			},
			this,
			map
		);
		const map2 = get.copy(map);
		const cards = Array.from(this.node.equips.childNodes);
		for (const card of cards) {
			if (typeof card?.name !== "string" || card.classList?.contains("ss-distance-marker")) continue;
			if (card.name.startsWith("feichu_")) {
				const index = card.name.slice(7);
				if (!map2[index]) {
					map2[index] = 0;
				}
				map2[index]--;
			}
		}
		for (const index in map2) {
			if (!index.startsWith("equip") || !(parseInt(index.slice(5)) > 0)) {
				continue;
			}
			const num = map2[index];
			if (num > 0) {
				for (let i = 0; i < num; i++) {
					const card = game.createCard("feichu_" + index, suits[index] || get.translation(index) + "栏", "");
					card.fix();
					card.classList.remove("decade-card", "layered-card");
					card.style.removeProperty("background");
					card.style.removeProperty("background-image");
					card.removeAttribute("data-card-face");
					card.style.transform = "";
					card.classList.remove("drawinghidden");
					card.classList.add("feichu");
					card.classList.add("ss-equip-card");
					delete card._transform;
					const equipNum = get.equipNum(card);
					let equipped = false;
					for (let j = 0; j < this.node.equips.childNodes.length; j++) {
						if (get.equipNum(this.node.equips.childNodes[j]) >= equipNum) {
							this.node.equips.insertBefore(card, this.node.equips.childNodes[j]);
							equipped = true;
							break;
						}
					}
					if (!equipped) {
						this.node.equips.appendChild(card);
						if (_status.discarded) {
							_status.discarded.remove(card);
						}
					}
				}
			} else if (num < 0) {
				for (let i = 0; i > num; i--) {
					const card = cards.find(card2 => card2.name == "feichu_" + index);
					if (card) {
						this.node.equips.removeChild(card);
						cards.remove(card);
					}
				}
			}
		}
	};
}

/**
 * 覆写 $handleEquipChange（视为装备 / 空栏兼容）
 */
function overrideHandleEquipChange() {
	lib.element.player.$handleEquipChange = function () {
		const player2 = this;
		const cards = Array.from(player2.node.equips.childNodes);
		const cardsResume = cards.slice(0);
		const extraEquip = [];
		player2.extraEquip?.forEach(info => {
			const extra = `${get.translation(info[0])} ${get.translation(info[1])}`;
			const subtype = get.subtype(info[1]);
			let preserve = info[2] && !info[2](player2);
			if (!preserve && !extraEquip.map(info2 => info2[1]).includes(info[1])) {
				extraEquip.add([info, extra, subtype]);
			}
		});
		cards?.forEach(card => {
			// 跳过非装备节点，避免虚拟距离占位等导致装马异常
			if (!card || card.classList?.contains("ss-distance-marker") || typeof card.name !== "string") {
				return;
			}
			let num = get.equipNum(card);
			let remove = false;
			if (card.name.indexOf("empty_equip") == 0) {
				if ((num == 4 || num == 3) && get.is.mountCombined()) {
					remove = !player2.hasEmptySlot("equip3_4") || player2.getEquips("equip3_4").length;
				} else if (!player2.hasEmptySlot(num) || player2.getEquips(num).length) {
					remove = true;
				}
				if (remove) {
					player2.node.equips.removeChild(card);
					cardsResume.remove(card);
				}
			}
			if (card.extraEquip && !remove) {
				let info = card.extraEquip,
					preserve = card.extraEquip[2] && !card.extraEquip[2](player2);
				const disable = card.classList.contains("feichu");
				if (!extraEquip.some(infox => infox[0][0] == info[0] && infox[0][1] == info[1]) || preserve) {
					if (disable) {
						card.node.name2.innerHTML = get.translation("equip" + num) + " 已废除";
						card.node.name2.style.fontSize = "0px";
						card.node.name2.style.opacity = "1";
						card.node.name2.style.marginTop = "0";
						delete card.extraEquip;
					} else {
						player2.node.equips.removeChild(card);
						cardsResume.remove(card);
					}
				}
			} else if (card.classList.contains("feichu")) {
				let extra = extraEquip.find(info => info[2].includes("equip" + num));
				if (extra) {
					card.node.name2.innerHTML = extra[1];
					if (num === 3 || num === 4) {
						card.node.name2.style.fontSize = "11.5px";
					} else {
						card.node.name2.style.fontSize = "15px";
					}
					card.node.name2.style.opacity = "0.75";
					card.node.name2.style.marginTop = "-2.5px";
					card.node.name2.style.marginLeft = "3px";
					card.node.name2.style.backgroundImage = "none";
					card.extraEquip = extra[0];
					extraEquip.remove(extra);
				}
			}
		});
		for (let i = 1; i <= 5; i++) {
			let add = false;
			if ((i == 4 || i == 3) && get.is.mountCombined()) {
				add = player2.hasEmptySlot("equip3_4") && !player2.getEquips("equip3_4").length;
			} else {
				add = player2.hasEmptySlot(i) && !player2.getEquips(i).length;
			}
			if (
				add &&
				!cardsResume.some(card => {
					let num = get.equipNum(card);
					if ((i == 4 || i == 3) && get.is.mountCombined()) {
						return num == 4 || num == 3;
					} else {
						return num == i;
					}
				})
			) {
				const card = game.createCard("empty_equip" + i, "", "");
				card.fix();
				card.style.transform = "";
				card.classList.remove("drawinghidden");
				card.classList.add("emptyequip");
				card.classList.add("hidden");
				delete card._transform;
				const equipNum = get.equipNum(card);
				let equipped = false;
				for (let j = 0; j < player2.node.equips.childNodes.length; j++) {
					if (get.equipNum(player2.node.equips.childNodes[j]) >= equipNum) {
						player2.node.equips.insertBefore(card, player2.node.equips.childNodes[j]);
						equipped = true;
						break;
					}
				}
				if (!equipped) {
					player2.node.equips.appendChild(card);
					if (_status.discarded) {
						_status.discarded.remove(card);
					}
				}
			}
		}
		extraEquip?.forEach(info => {
			if (player2.hasEmptySlot(info[2])) {
				const card = game.createCard("empty_" + info[2], "", "");
				card.fix();
				card.style.transform = "";
				card.classList.remove("drawinghidden");
				card.classList.add("emptyequip");
				card.node.name2.innerHTML = info[1];
				card.extraEquip = info[0];
				delete card._transform;
				const equipNum = get.equipNum(card);
				let equipped = false;
				for (let j = 0; j < player2.node.equips.childNodes.length; j++) {
					const node = player2.node.equips.childNodes[j];
					if (get.equipNum(node) == info[2].at(-1) && info && node.classList.contains("emptyequip") && !node.extraEquip) {
						node.node.name2.innerHTML = info[1];
						node.extraEquip = info[0];
						node.classList.remove("hidden");
						equipped = true;
						break;
					}
					if (get.equipNum(node) >= equipNum) {
						player2.node.equips.insertBefore(card, node);
						equipped = true;
						break;
					}
				}
				if (!equipped) {
					player2.node.equips.appendChild(card);
					if (_status.discarded) {
						_status.discarded.remove(card);
					}
				}
			}
		});

		refreshSsEquipDistance(player2);
	};
}

/**
 * 初始化手杀装备栏美化
 */
export function setupSsEquipments() {
	if (!isSsEquipmentsEnabled()) return;

	loadSsEquipStylesheet();
	window.zqEquipCss = applySsEquipCss;
	applySsEquipCss();
	overrideAddVirtualEquip();
	overrideSyncDisable();
	overrideHandleEquipChange();
	setupDistanceRefreshHooks();

	lib.arenaReady.push(() => {
		applySsEquipCss();
		refreshAllSsEquipDistance();
	});
}
