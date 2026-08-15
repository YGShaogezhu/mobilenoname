/**
 * @fileoverview 手杀分层拼卡
 * @description 用 cardtexture 零件按层拼装卡牌，与整图 decade-card 美化互斥
 * @module overrides/card/layered-card
 */
import { lib, get, _status } from "noname";
import { cardSkinMeta } from "../../config/utils.js";

const RED_SUITS = ["heart", "diamond"];
const BLACK_SUITS = ["spade", "club"];

/** 牌名图别名（游戏名 → 素材后缀） */
const NAME_ALIAS = {
	diaohu: "diaohulishan",
};

/** 插画图别名（游戏名 → 素材后缀） */
const TEXTURE_ALIAS = {
	diaohulishan: "diaohu",
	jingxienu: "jingxienuo",
};

/** 国战标记卡：游戏牌名 / 技能名 → 素材 id */
const BIAOJI_ASSET_ID = {
	xianqu: "xianqu",
	xianqu_mark: "xianqu",
	yinyangyu: "yinyangyu",
	yinyang_mark: "yinyangyu",
	yexinjia: "yexinjia",
	yexinjia_mark: "yexinjia",
	zhulianbihe: "zhulianbihe",
	zhulianbihe_mark: "zhulianbihe",
};

/**
 * 扩展资源根路径
 * @returns {string}
 */
function getExtensionRoot() {
	const ext = window.decadeUI?.extensionName || "十周年UI";
	return `${lib.assetURL}extension/${ext}/image/ui`;
}

/**
 * 素材根路径
 * @returns {string}
 */
function getAssetRoot() {
	return `${getExtensionRoot()}/cardtexture`;
}

/**
 * 标记素材根路径
 * @returns {string}
 */
function getMarkRoot() {
	return `${getExtensionRoot()}/card-base`;
}

/**
 * 当前是否为分层模式
 * @returns {boolean}
 */
export function isLayeredMode() {
	const key = lib.config.extension_十周年UI_cardPrettify;
	return cardSkinMeta[key]?.mode === "layered";
}

/**
 * 读取当前分层底框编号
 * @returns {string|null} "1"|"2"|"3"|"4"
 */
export function getLayeredBase() {
	const key = lib.config.extension_十周年UI_cardPrettify;
	const skin = cardSkinMeta[key];
	return skin?.mode === "layered" ? String(skin.base || "1") : null;
}

/**
 * 创建图片，失败时移除
 * @param {string} src
 * @param {Function} [onError]
 * @returns {HTMLImageElement}
 */
function createImage(src, onError) {
	const img = document.createElement("img");
	img.draggable = false;
	img.src = src;
	img.onerror = () => {
		img.remove();
		onError?.();
	};
	return img;
}

/**
 * 杀的属性 → 基本牌名字图 id
 * @param {string|Array|null} nature
 * @returns {string}
 */
function getShaNameByNature(nature) {
	if (!nature) return "sha";
	const natures = get.natureList(nature).sort(lib.sort.nature);
	if (natures.includes("fire")) return "huosha";
	if (natures.includes("thunder")) return "leisha";
	if (natures.includes("stab")) return "cisha";
	return "sha";
}

/**
 * 规范化卡牌类型
 * @param {HTMLElement} cardElement
 * @returns {string}
 */
function getRealType(cardElement) {
	const type = cardElement.dataset.cardType || "";
	if (type === "delay") return "trick";
	// 标记卡 stub 用 special，拼装时按锦囊牌名条布局
	if (type === "special" || resolveBiaojiId(cardElement)) return "trick";
	return type;
}

/**
 * 鏖战模式下实体桃（不用 get.name，mod 会改成杀/闪）
 * @param {HTMLElement} cardElement
 * @returns {boolean}
 */
function isAozhanTao(cardElement) {
	return Boolean(_status._aozhan && cardElement?.name === "tao");
}

/**
 * 国战标记卡素材 id
 * @param {HTMLElement} cardElement
 * @returns {string|null}
 */
export function resolveBiaojiId(cardElement) {
	const name = cardElement?.name;
	return (name && BIAOJI_ASSET_ID[name]) || null;
}

/**
 * 解析牌名素材 id
 * @param {HTMLElement} cardElement
 * @param {string} realType
 * @returns {string}
 */
function resolveNameId(cardElement, realType) {
	let name = cardElement.name;
	if (realType === "basic" && name === "sha") {
		name = getShaNameByNature(cardElement.nature);
	}
	return NAME_ALIAS[name] || name;
}

/**
 * 解析插画素材 id
 * @param {HTMLElement} cardElement
 * @returns {string}
 */
function resolveTextureId(cardElement) {
	const name = cardElement.name;
	if (name === "sha") {
		const shaId = getShaNameByNature(cardElement.nature);
		// 仅刺杀有独立插画；火/雷杀复用普通杀图
		if (shaId === "cisha") return "cisha";
	}
	return TEXTURE_ALIAS[name] || name;
}

/**
 * 清空节点内容
 * @param {HTMLElement|null|undefined} node
 */
function emptyNode(node) {
	if (!node) return;
	while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * clone / 判定抛出牌补齐分层所需节点引用
 * @param {HTMLElement} card
 */
function ensureLayeredNodeRefs(card) {
	if (!card) return;
	card.node ??= {};
	const q = sel => card.querySelector?.(sel);

	card.node.image ??= q(".image");
	card.node.name ??= q(".name");
	card.node.name2 ??= q(".name2");
	card.$name ??= q(".top-name");
	card.$cardType ??= q(".card-type");
	card.$distance ??= q(".distance");
	card.$virtual ??= q(".virtual-mark");
	card.$zhuan ??= q(".zhuanhua-mark");
	card.$color ??= q(".color");
	card.$guo ??= q(".guo-mark");
	card.$hezong ??= q(".hezong-mark");
	ensureCardFrame(card);

	if (!card.$suitnum) {
		const suitnum = q(".suit-num");
		if (suitnum) {
			card.$suitnum = suitnum;
			card.node.suitnum = suitnum;
		}
	}
	if (card.$suitnum) {
		card.$suitnum.$num ??= card.$suitnum.querySelector(".num") || card.$suitnum.querySelector("span:first-child");
		card.$suitnum.$suit ??= card.$suitnum.querySelector(".suit") || card.$suitnum.querySelector("span:last-child");
	}
}

/**
 * 底框图（不用 ::after：全局 .card::after { display: none } 会把金/黑金底图关掉）
 * @param {HTMLElement} card
 * @returns {HTMLElement|null}
 */
function ensureCardFrame(card) {
	if (!card) return null;
	if (card.$frame?.parentNode === card) return card.$frame;
	let frame = null;
	for (const child of card.children) {
		if (child.classList?.contains("lc-frame")) {
			frame = child;
			break;
		}
	}
	if (!frame) {
		frame = document.createElement("div");
		frame.className = "lc-frame";
	}
	if (frame.parentNode !== card) card.insertBefore(frame, card.firstChild);
	card.$frame = frame;
	return frame;
}

/**
 * 填充花色点数图
 * @param {HTMLElement} cardElement
 * @param {{ suit?: string, number?: number|string }} [override] 临时花色/点数（红颜等）
 */
function fillSuitNum(cardElement, override = {}) {
	ensureLayeredNodeRefs(cardElement);
	const $num = cardElement.$suitnum?.$num;
	const $suit = cardElement.$suitnum?.$suit;
	if (!$num || !$suit) return;

	emptyNode($num);
	emptyNode($suit);

	const suit = override.suit ?? cardElement.suit;
	if (!suit || suit === "none") return;

	let num = override.number !== undefined ? override.number : cardElement.number;
	if (num === 0 || num === "0") {
		num = "x";
	} else {
		num = parseInt(num, 10);
		if (Number.isNaN(num)) return;
	}

	const root = getAssetRoot();
	const numColor = RED_SUITS.includes(suit) ? "r" : "b";
	$num.appendChild(createImage(`${root}/num_${numColor}_${num}.png`));
	$suit.appendChild(createImage(`${root}/pokercolor_${suit}.png`));
}

/**
 * 分层卡：临时花色点数直接换图（不叠 tempsuitnum 贴图）
 * @param {HTMLElement} cardElement
 * @param {string} suit
 * @param {number|string} number
 * @returns {boolean}
 */
export function applyLayeredTempSuitNum(cardElement, suit, number) {
	if (!cardElement) return false;
	ensureLayeredNodeRefs(cardElement);
	if (!cardElement.classList.contains("layered-card")) {
		if (!isLayeredMode()) return false;
		applyLayeredCard(cardElement, getLayeredBase() || "1");
		if (!cardElement.classList.contains("layered-card")) return false;
	}

	// 去掉可能已存在的贴图叠层
	if (cardElement._tempSuitNum) {
		cardElement._tempSuitNum.delete?.();
		delete cardElement._tempSuitNum;
	}

	fillSuitNum(cardElement, { suit, number });
	if (!cardElement.$suitnum?.$num || !cardElement.$suitnum?.$suit) return false;
	cardElement.dataset.tempsn = suit || "";
	if (number != null && number !== "") cardElement.dataset.tempnum = String(number);
	else delete cardElement.dataset.tempnum;
	cardElement._layeredTempSN = true;
	return true;
}

/**
 * 分层卡：恢复真实花色点数图
 * @param {HTMLElement} cardElement
 */
export function clearLayeredTempSuitNum(cardElement) {
	if (!cardElement?._layeredTempSN) return;
	delete cardElement._layeredTempSN;
	delete cardElement.dataset.tempsn;
	delete cardElement.dataset.tempnum;
	if (cardElement.classList.contains("layered-card")) {
		fillSuitNum(cardElement);
	}
}

/**
 * 填充牌名
 * @param {HTMLElement} cardElement
 * @param {string} realType
 */
function fillNameImage(cardElement, realType) {
	const $name = cardElement.$name;
	if (!$name) return;

	emptyNode($name);
	$name.classList.remove("base", "trick", "equip", "wide-name", "special");
	$name.removeAttribute("data-name-id");

	const root = getAssetRoot();
	const biaojiId = resolveBiaojiId(cardElement);
	const aozhanTao = isAozhanTao(cardElement);

	const wrapper = document.createElement("div");
	wrapper.className = "name-bg";

	if (biaojiId) {
		$name.classList.add("trick");
		$name.dataset.nameId = biaojiId;
		const bgImg = createImage(`${root}/card_name_bg.png`);
		bgImg.className = "bg";
		wrapper.appendChild(bgImg);
		const nameImg = createImage(`${root}/gz_txt_${biaojiId}.png`, () => {
			wrapper.replaceChildren();
			const span = document.createElement("span");
			span.className = "name-text";
			span.textContent = get.translation(cardElement.name) || "";
			wrapper.appendChild(span);
		});
		nameImg.className = "name-text";
		wrapper.appendChild(nameImg);
		$name.appendChild(wrapper);
		return;
	}

	$name.classList.add(realType === "basic" ? "base" : realType);

	const nameId = aozhanTao ? "aozhantao" : resolveNameId(cardElement, realType);
	$name.dataset.nameId = nameId;
	// 火/雷/刺杀大字为 120×82，杀闪桃酒为 72×64，需单独校正居中
	if (realType === "basic" && ["huosha", "leisha", "cisha"].includes(nameId)) {
		$name.classList.add("wide-name");
	}

	if (realType !== "basic") {
		const bgImg = createImage(`${root}/card_name_bg.png`);
		bgImg.className = "bg";
		wrapper.appendChild(bgImg);
	}

	const nameUrl = aozhanTao
		? `${root}/gz_txt_aozhantao.png`
		: realType === "basic"
			? `${root}/card_normal_${nameId}.png`
			: `${root}/card_name_${nameId}.png`;
	const nameImg = createImage(nameUrl, () => {
		wrapper.replaceChildren();
		const span = document.createElement("span");
		span.className = "name-text";
		span.textContent = get.translation(cardElement.name) || "";
		wrapper.appendChild(span);
	});
	nameImg.className = "name-text";
	wrapper.appendChild(nameImg);
	$name.appendChild(wrapper);
}

/**
 * 填充类型标签
 * @param {HTMLElement} cardElement
 * @param {string} realType
 */
function fillCardType(cardElement, realType) {
	const node = cardElement.$cardType;
	if (!node) return;
	emptyNode(node);
	// 标记卡 / 基本牌不显示类型条
	if (resolveBiaojiId(cardElement) || realType === "basic" || !realType) return;

	const root = getAssetRoot();
	const typeUrl = realType === "trick" ? `${root}/card_type_name_2.png` : `${root}/card_type_name_3.png`;
	node.appendChild(createImage(typeUrl));
}

/**
 * 填充插画
 * @param {HTMLElement} cardElement
 */
function fillCardTexture(cardElement) {
	const image = cardElement.node?.image;
	if (!image) return;
	emptyNode(image);

	const root = getAssetRoot();
	const biaojiId = resolveBiaojiId(cardElement);
	if (biaojiId) {
		image.appendChild(createImage(`${root}/gz_ic_card_${biaojiId}.png`));
		return;
	}
	if (isAozhanTao(cardElement)) {
		image.appendChild(createImage(`${root}/gz_ic_card_aozhantao.png`));
		return;
	}
	const textureId = resolveTextureId(cardElement);
	image.appendChild(createImage(`${root}/card_texture_${textureId}.png`));
}

/**
 * 填充装备距离 / 马
 * @param {HTMLElement} cardElement
 */
function fillEquipmentDistance(cardElement) {
	const node = cardElement.$distance;
	if (!node) return;
	emptyNode(node);

	const subtype = cardElement.dataset.cardSubtype;
	const root = getAssetRoot();
	const cardInfo = lib.card[cardElement.name];

	if (subtype === "equip1") {
		node.appendChild(createImage(`${root}/wuqi_distance.png`));
		let dist = 1;
		if (cardInfo?.distance?.attackFrom != null) {
			dist = -cardInfo.distance.attackFrom + 1;
		}
		dist = Math.max(0, Math.min(9, dist));
		node.appendChild(createImage(`${root}/card_distance_${dist}.png`));
		return;
	}

	if (subtype === "equip3" || subtype === "equip4") {
		const isDef = subtype === "equip3";
		node.appendChild(createImage(`${root}/${isDef ? "card_horse_def" : "card_horse_att"}.png`));
		let dist = 1;
		if (cardInfo?.distance) {
			const value = isDef ? cardInfo.distance.globalTo : cardInfo.distance.globalFrom;
			dist = Math.abs(value) || 1;
		}
		dist = Math.max(0, Math.min(9, dist));
		node.appendChild(createImage(`${root}/card_distance_${dist}.png`));
	}
}

/**
 * 恢复文字花色点数（离开分层模式时）
 * @param {HTMLElement} cardElement
 */
function restoreTextSuitNum(cardElement) {
	const $num = cardElement.$suitnum?.$num;
	const $suit = cardElement.$suitnum?.$suit;
	if (!$num || !$suit) return;

	emptyNode($num);
	emptyNode($suit);

	const suit = cardElement.suit;
	let cardnum = cardElement.number;
	if (parseInt(cardnum) == cardnum) cardnum = parseInt(cardnum);
	const numText = get.strNumber(cardnum, true) || cardnum || "";
	$num.innerHTML = typeof numText === "string" ? numText : cardElement.number || "";
	$suit.innerHTML = suit && suit !== "none" ? get.translation(suit) || "" : "";
}

/**
 * 是否为虚拟牌
 * @param {HTMLElement} cardElement
 * @returns {boolean}
 */
function isVirtualCard(cardElement) {
	return cardElement.dataset.virtual === "1" || cardElement.classList.contains("temp-virtual-card");
}

/**
 * 是否为转化牌
 * @param {HTMLElement} cardElement
 * @returns {boolean}
 */
function isZhuanhuaCard(cardElement) {
	return cardElement.dataset.zhuanhua === "1";
}

/**
 * 是否丈八 / 玄剑类装备转化技能（转化杀，非虚拟杀）
 * @param {string} skill
 * @returns {boolean}
 */
export function isEquipConvertSkill(skill) {
	if (typeof skill !== "string") return false;
	return (
		skill === "zhangba_skill" ||
		skill.includes("zhangba") ||
		skill === "xuanjian_skill" ||
		skill.includes("xuanjian_skill")
	);
}

/**
 * 是否奇策相关技能
 * @param {string} skill
 * @returns {boolean}
 */
function isQiceSkill(skill) {
	return typeof skill === "string" && skill.includes("qice");
}

/**
 * 根据参与转化的卡牌计算颜色标记
 * @param {Array} cards
 * @returns {string|null} 0=无色 1=红色 2=黑色
 */
function computeConvertedColor(cards) {
	if (!Array.isArray(cards) || cards.length === 0) return null;

	let red = 0;
	let black = 0;
	for (const c of cards) {
		const suit = typeof c === "string" ? c : c.suit || get.suit(c);
		if (!suit) continue;
		if (RED_SUITS.includes(suit)) red++;
		else if (BLACK_SUITS.includes(suit)) black++;
	}

	if (red && !black) return "1";
	if (black && !red) return "2";
	return "0";
}

/**
 * 是否为合纵牌（含临时合纵 gaintag）
 * @param {HTMLElement} cardElement
 * @returns {boolean}
 */
function hasLianhengTag(cardElement) {
	if (!cardElement) return false;
	if (typeof cardElement.hasTag === "function" && cardElement.hasTag("lianheng")) return true;
	if (typeof cardElement.hasGaintag === "function" && cardElement.hasGaintag("_lianheng")) return true;
	return Boolean(get.cardtag(cardElement, "lianheng"));
}

/**
 * 是否为国无懈标记牌
 * @param {HTMLElement} cardElement
 * @returns {boolean}
 */
function hasGuoTag(cardElement) {
	if (!cardElement) return false;
	if (typeof cardElement.hasTag === "function" && cardElement.hasTag("guo")) return true;
	return Boolean(get.cardtag(cardElement, "guo"));
}

/**
 * 确保国战标记节点存在
 * @param {HTMLElement} cardElement
 * @param {string} prop
 * @param {string} className
 * @returns {HTMLElement|null}
 */
function ensureGuozhanMarkNode(cardElement, prop, className) {
	let node = cardElement[prop] || cardElement.querySelector?.(`.${className}`);
	if (!node) {
		node = document.createElement("div");
		node.className = className;
		cardElement.appendChild(node);
	}
	cardElement[prop] = node;
	return node;
}

/**
 * 填充国战合纵 / 国无懈标记
 * @param {HTMLElement} cardElement
 */
export function refreshGuozhanMarks(cardElement) {
	if (!cardElement) return;
	if (!cardElement.classList.contains("layered-card") && !isLayeredMode()) return;

	ensureLayeredNodeRefs(cardElement);
	const $guo = ensureGuozhanMarkNode(cardElement, "$guo", "guo-mark");
	const $hezong = ensureGuozhanMarkNode(cardElement, "$hezong", "hezong-mark");

	// 国标记须挂在卡牌根上（左列独立定位），避免留在类型条内
	if ($guo.parentNode !== cardElement) {
		cardElement.appendChild($guo);
	}
	if ($hezong.parentNode !== cardElement) {
		cardElement.appendChild($hezong);
	}

	emptyNode($guo);
	emptyNode($hezong);

	if (!cardElement.classList.contains("layered-card")) return;

	const root = getAssetRoot();
	if (hasGuoTag(cardElement)) {
		$guo.appendChild(createImage(`${root}/card_mark_guo.png`));
	}
	if (hasLianhengTag(cardElement)) {
		$hezong.appendChild(createImage(`${root}/card_tag_he.png`));
	}
}

/**
 * 按 dataset 填充虚拟 / 转化标记
 * @param {HTMLElement} cardElement
 */
export function refreshLayeredMarks(cardElement) {
	if (!cardElement) return;

	const ensure = (prop, className) => {
		let node = cardElement[prop] || cardElement.querySelector(`.${className}`);
		if (!node && (isZhuanhuaCard(cardElement) || isVirtualCard(cardElement))) {
			node = document.createElement("div");
			node.className = className;
			cardElement.appendChild(node);
		}
		if (node) cardElement[prop] = node;
		return node || null;
	};

	const $virtual = ensure("$virtual", "virtual-mark");
	const $zhuan = ensure("$zhuan", "zhuanhua-mark");
	const $color = ensure("$color", "color");

	if (!cardElement.classList.contains("layered-card") && !isZhuanhuaCard(cardElement) && !isVirtualCard(cardElement)) {
		return;
	}

	emptyNode($virtual);
	emptyNode($zhuan);
	emptyNode($color);

	const markRoot = getMarkRoot();
	const assetRoot = getAssetRoot();

	if (isVirtualCard(cardElement)) {
		if ($virtual) {
			$virtual.appendChild(createImage(`${markRoot}/xuni.png`));
		}
		return;
	}

	if (!isZhuanhuaCard(cardElement)) return;

	if ($zhuan) {
		$zhuan.appendChild(createImage(`${markRoot}/zhuan.png`));
	}

	const color = cardElement.dataset.color;
	if (color != null && $color) {
		$color.appendChild(createImage(`${assetRoot}/card_color${color}.png`));
	}
}

/**
 * 更新转化牌标记（出牌变形后调用；手牌选中不要调用）
 * @param {HTMLElement} cardElement
 * @param {Object} [options]
 * @param {string} [options.skill]
 * @param {Array} [options.cards]
 * @param {boolean} [options.showColor] 是否显示红/黑/无色标（多牌转化）
 */
export function updateLayeredMarks(cardElement, options = {}) {
	if (!cardElement) return;

	const { skill, cards, showColor, keepFace = true } = options;
	cardElement.dataset.zhuanhua = "1";

	const multi = Array.isArray(cards) && cards.length > 1;
	// 多张装备转化才隐藏花色点数；单牌转化保留原花色点数
	if (isEquipConvertSkill(skill) && multi) cardElement.dataset.zhangba = "1";
	if (isQiceSkill(skill)) cardElement.dataset.qice = "1";

	if (multi) cardElement.dataset.viewasMulti = "1";

	const needColor = showColor === true || isQiceSkill(skill) || (showColor !== false && multi);
	if (needColor && Array.isArray(cards) && cards.length > 0) {
		const color = computeConvertedColor(cards);
		if (color != null) cardElement.dataset.color = color;
	}

	// 转化牌默认沿用当前卡面；仅显式 keepFace:false 时才强制白卡
	const face = keepFace === false ? "1" : getLayeredBase() || cardElement.dataset.cardFace || "1";

	if (isLayeredMode() || cardElement.classList.contains("layered-card") || cardElement.dataset.zhuanhua === "1") {
		if (!cardElement.classList.contains("layered-card") || cardElement.dataset.cardFace !== face) {
			applyLayeredCard(cardElement, face);
			return;
		}
		refreshLayeredMarks(cardElement);
		refreshGuozhanMarks(cardElement);
	}
}

/**
 * 清除转化牌标记（取消选择时调用）
 * @param {HTMLElement} cardElement
 */
export function clearLayeredMarks(cardElement) {
	if (!cardElement) return;
	const hadZhuanhua = cardElement.dataset.zhuanhua === "1";
	delete cardElement.dataset.zhuanhua;
	delete cardElement.dataset.zhangba;
	delete cardElement.dataset.qice;
	delete cardElement.dataset.color;
	delete cardElement.dataset.viewasMulti;
	delete cardElement.dataset.viewasPrimary;
	emptyNode(cardElement.$zhuan || cardElement.querySelector?.(".zhuanhua-mark"));
	emptyNode(cardElement.$color || cardElement.querySelector?.(".color"));

	// 取消转化标记后刷新零件（虚拟牌仍保持白卡底）
	if (hadZhuanhua && cardElement.classList.contains("layered-card") && isLayeredMode() && !isVirtualCard(cardElement)) {
		refreshLayeredMarks(cardElement);
		refreshGuozhanMarks(cardElement);
	}
}

/**
 * 清除分层样式与内容（切回整图 / off 时调用）
 * @param {HTMLElement} cardElement
 * @param {Object} [options]
 * @param {boolean} [options.restoreText=true] 是否恢复文字花色点数
 */
export function clearLayeredCard(cardElement, options = {}) {
	if (!cardElement?.classList?.contains("layered-card")) return;

	const restoreText = options.restoreText !== false;
	cardElement.classList.remove("layered-card");
	cardElement.removeAttribute("data-card-face");
	delete cardElement.dataset.biaoji;
	cardElement.style.removeProperty("background");
	cardElement.style.removeProperty("background-image");
	cardElement.style.removeProperty("background-size");
	cardElement.$frame?.remove();
	delete cardElement.$frame;

	emptyNode(cardElement.$cardType);
	emptyNode(cardElement.$distance);
	emptyNode(cardElement.$virtual);
	emptyNode(cardElement.$zhuan);
	emptyNode(cardElement.$color);
	emptyNode(cardElement.$guo || cardElement.querySelector?.(".guo-mark"));
	emptyNode(cardElement.$hezong || cardElement.querySelector?.(".hezong-mark"));

	if (cardElement.$name) {
		emptyNode(cardElement.$name);
		cardElement.$name.classList.remove("base", "trick", "equip", "wide-name");
		cardElement.$name.removeAttribute("data-name-id");
	}
	if (cardElement.node?.image) {
		emptyNode(cardElement.node.image);
	}

	if (restoreText) {
		restoreTextSuitNum(cardElement);
	} else {
		if (cardElement.$suitnum?.$num) emptyNode(cardElement.$suitnum.$num);
		if (cardElement.$suitnum?.$suit) emptyNode(cardElement.$suitnum.$suit);
	}
}

/**
 * 应用分层拼卡
 * @param {HTMLElement} cardElement
 * @param {string} [base="1"] 底框编号
 */
export function applyLayeredCard(cardElement, base = "1") {
	if (!cardElement || cardElement.classList.contains("infohidden")) return;

	const realType = getRealType(cardElement);
	if (!realType) return;

	ensureLayeredNodeRefs(cardElement);

	const biaojiId = resolveBiaojiId(cardElement);
	if (biaojiId) {
		cardElement.dataset.biaoji = "1";
	} else {
		delete cardElement.dataset.biaoji;
	}

	// 虚拟预览牌固定白底；转化出牌沿用当前/传入底框；标记卡用专用底
	const face = biaojiId ? "biaoji" : isVirtualCard(cardElement) ? "1" : String(base || getLayeredBase() || "1");
	cardElement.classList.add("layered-card");
	cardElement.classList.remove("decade-card");
	cardElement.dataset.cardFace = face;
	cardElement.style.removeProperty("background");
	cardElement.style.removeProperty("background-image");

	if (biaojiId) {
		emptyNode(cardElement.$suitnum?.$num);
		emptyNode(cardElement.$suitnum?.$suit);
		fillNameImage(cardElement, realType);
		fillCardType(cardElement, realType);
		fillCardTexture(cardElement);
		if (cardElement.$distance) emptyNode(cardElement.$distance);
	} else {
		fillSuitNum(cardElement);
		fillNameImage(cardElement, realType);
		fillCardType(cardElement, realType);
		fillCardTexture(cardElement);

		if (realType === "equip") {
			fillEquipmentDistance(cardElement);
		} else if (cardElement.$distance) {
			emptyNode(cardElement.$distance);
		}

		// 重绘后保留红颜等临时花色点数
		if (cardElement._layeredTempSN && cardElement.dataset.tempsn) {
			const tempNum = cardElement.dataset.tempnum;
			fillSuitNum(cardElement, {
				suit: cardElement.dataset.tempsn,
				number: tempNum != null && tempNum !== "" ? tempNum : cardElement.number,
			});
		}
	}

	refreshLayeredMarks(cardElement);
	refreshGuozhanMarks(cardElement);
}

/**
 * 进入鏖战后刷新场上 / 手牌区已有桃的分层素材
 */
export function refreshAozhanTaoCards() {
	if (!isLayeredMode() || !_status._aozhan) return;
	const face = getLayeredBase() || "1";
	document.querySelectorAll('.card[data-card-name="tao"]').forEach(card => {
		if (card.classList.contains("infohidden")) return;
		if (!card.name) card.name = "tao";
		applyLayeredCard(card, face);
	});
}

/**
 * 监听 _status._aozhan 置位，刷新已有桃牌
 */
export function setupAozhanTaoRefresh() {
	if (_status._decadeuiAozhanWatch) return;
	_status._decadeuiAozhanWatch = true;

	let current = _status._aozhan;
	Object.defineProperty(_status, "_aozhan", {
		configurable: true,
		enumerable: true,
		get() {
			return current;
		},
		set(value) {
			const prev = current;
			current = value;
			if (value && !prev) {
				queueMicrotask(() => refreshAozhanTaoCards());
			}
		},
	});
	if (current) refreshAozhanTaoCards();
}
