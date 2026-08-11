/**
 * @fileoverview 卡牌工具函数，提供卡牌临时花色点数显示、特效播放等功能
 */
import { lib, ui, get, _status } from "noname";
import {
	updateLayeredMarks,
	applyLayeredCard,
	getLayeredBase,
	isLayeredMode,
	isEquipConvertSkill,
	applyLayeredTempSuitNum,
	clearLayeredTempSuitNum,
} from "../overrides/card/layered-card.js";

/** 有独立正中标签图的基本牌 */
const VIEWAS_IMAGE_CARDS = new Set(["sha", "shan", "tao", "jiu"]);
/** 已调度的转化出牌组，避免多牌重复合并 */
const pendingViewAsGroups = new Set();

/**
 * card-base 资源根路径
 * @returns {string}
 */
function getCardBaseRoot() {
	const ext = window.decadeUI?.extensionName || "十周年UI";
	return `${lib.assetURL}extension/${ext}/image/ui/card-base`;
}

/**
 * 解析杀的属性后缀（用于 sha_fire / sha_thunder 等）
 * @param {string|Array|null} nature
 * @returns {string}
 */
function getShaNatureSuffix(nature) {
	if (!nature) return "";
	const natures = get.natureList(nature).sort(lib.sort.nature);
	if (natures.includes("fire")) return "_fire";
	if (natures.includes("thunder")) return "_thunder";
	if (natures.includes("ice")) return "_ice";
	if (natures.includes("stab")) return "_stab";
	if (natures.includes("kami")) return "_kami";
	if (natures.includes("poison")) return "_poison";
	return "";
}

/**
 * 选中转化时：在牌面正中显示视为牌名标签（不改牌面、不加转标）
 * @param {HTMLElement} card
 * @param {string} name - 视为牌名
 * @param {string|Array|null} [nature] - 属性
 */
export function setViewAsLabel(card, name, nature) {
	if (!card || !name) return;

	clearViewAsLabel(card);

	const root = getCardBaseRoot();
	const label = ui.create.div(".viewas-label", card);
	card._viewAsLabel = label;

	if (VIEWAS_IMAGE_CARDS.has(name)) {
		let file = name;
		if (name === "sha") file = `sha${getShaNatureSuffix(nature)}`;
		const img = document.createElement("img");
		img.draggable = false;
		img.alt = get.translation(name) || name;
		img.src = `${root}/${file}.png`;
		img.onerror = () => {
			if (img.src.endsWith(".png")) {
				img.src = `${root}/${file}.jpg`;
				return;
			}
			label.classList.add("is-text");
			label.replaceChildren();
			appendTextLabel(label, root, buildViewAsTitle(name, nature));
		};
		label.appendChild(img);
		return;
	}

	label.classList.add("is-text");
	appendTextLabel(label, root, get.translation(name) || name);
}

/**
 * @param {HTMLElement} label
 * @param {string} root
 * @param {string} title
 */
function appendTextLabel(label, root, title) {
	const bg = document.createElement("img");
	bg.className = "viewas-label-bg";
	bg.draggable = false;
	bg.src = `${root}/shousha.png`;
	const text = document.createElement("div");
	text.className = "viewas-label-text";
	text.textContent = title || "";
	label.append(bg, text);
}

/**
 * @param {string} name
 * @param {string|Array|null} nature
 * @returns {string}
 */
function buildViewAsTitle(name, nature) {
	let title = get.translation(name) || name;
	if (nature && name === "sha") title = (get.translation(nature) || "") + title;
	return title;
}

/**
 * 清除正中转化标签
 * @param {HTMLElement} card
 */
export function clearViewAsLabel(card) {
	if (!card) return;
	if (card._viewAsLabel) {
		card._viewAsLabel.remove();
		delete card._viewAsLabel;
	}
	card.querySelectorAll?.(".viewas-label")?.forEach(el => el.remove());
}

/**
 * clone 后补齐节点引用
 * @param {HTMLElement} card
 */
function ensureCardNodeRefs(card) {
	if (!card) return;
	card.node ??= {};
	const q = sel => card.querySelector(sel);
	card.node.image ??= q(".image");
	card.node.info ??= q(".info");
	card.node.name ??= q(".name");
	card.node.name2 ??= q(".name2");
	card.node.background ??= q(".background");
	card.node.intro ??= q(".intro");
	card.node.range ??= q(".range");
	card.node.gaintag ??= q(".gaintag");
	card.$name ??= q(".top-name");
	card.$vertname ??= card.node.name;
	card.$equip ??= card.node.name2;
	card.$range ??= card.node.range;
	card.$gaintag ??= card.node.gaintag;
	card.$cardType ??= q(".card-type");
	card.$distance ??= q(".distance");
	card.$virtual ??= q(".virtual-mark");
	card.$zhuan ??= q(".zhuanhua-mark");
	card.$color ??= q(".color");
	card.$guo ??= q(".guo-mark");
	card.$hezong ??= q(".hezong-mark");
	if (!card.$suitnum) {
		const suitnum = q(".suit-num");
		if (suitnum) {
			card.$suitnum = suitnum;
			card.node.suitnum = suitnum;
			suitnum.$num ??= suitnum.querySelector(".num") || suitnum.querySelector("span:first-child");
			suitnum.$suit ??= suitnum.querySelector(".suit") || suitnum.querySelector("span:last-child");
		}
	}
}

/**
 * 清除临时花色点数（分层换图 / tempsuitnum 贴图）
 * @param {HTMLElement} card
 */
export function clearCardTempSuitNum(card) {
	if (!card) return;
	clearLayeredTempSuitNum(card);
	if (card._tempSuitNum) {
		card._tempSuitNum.delete?.();
		delete card._tempSuitNum;
	}
	delete card.dataset.tempsn;
	delete card.dataset.tempnum;
}

/**
 * 卡牌临时花色点数显示
 * @description 分层美化（白卡/金卡/黑金）直接换花色点数图；整图模式叠 tempsuitnum 贴图
 * @param {HTMLElement} card - 卡牌元素
 * @param {string} suit - 花色
 * @param {number} number - 点数
 * @param {object} [elementUtil] - 元素工具对象
 * @returns {void}
 */
export function cardTempSuitNum(card, suit, number, elementUtil) {
	// 手杀白卡 / 金卡底 / 黑金底：不叠 viewsuitnum，直接改 suit-num 零件
	if (card?.classList?.contains("layered-card") || isLayeredMode()) {
		if (applyLayeredTempSuitNum(card, suit, number)) return;
	}

	const create =
		elementUtil?.create ||
		((cls, parent, tag) => {
			const el = document.createElement(tag || "div");
			if (cls) el.className = cls;
			if (parent) parent.appendChild(el);
			return el;
		});

	let remain = false;
	if (card._tempSuitNum) remain = true;

	let snnode = card._tempSuitNum || ui.create.div(".tempsuitnum", card);
	card._tempSuitNum = snnode;

	if (!remain) {
		snnode.$num = create("num", snnode, "span");
		snnode.$num.style.fontFamily = '"STHeiti","SimHei","Microsoft JhengHei","Microsoft YaHei","WenQuanYi Micro Hei",Helvetica,Arial,sans-serif';
		snnode.$br = create(null, snnode, "br");
		snnode.$suit = create("suit", snnode, "span");
		snnode.$suit.style.fontFamily = '"STHeiti","SimHei","Microsoft JhengHei","Microsoft YaHei","WenQuanYi Micro Hei",Helvetica,Arial,sans-serif';
	}

	snnode.$num.innerHTML = number ? get.strNumber(number) : "▣";
	snnode.$suit.innerHTML = suit ? get.translation(suit) || "◈" : "◈";
	card.dataset.tempsn = suit;
}

/**
 * 将 thrown 第一张变形为转化牌（颜色标 + 转标）；沿用当前卡面样式
 * @param {HTMLElement} card
 * @param {object} event
 * @param {{ isMulti?: boolean }} [opts]
 */
export function morphThrownToViewAs(card, event, opts = {}) {
	if (!card || !event?.card || card._viewAsMorphed) return;
	card._viewAsMorphed = true;

	clearViewAsLabel(card);
	if (card._tempName) {
		card._tempName.delete?.();
		delete card._tempName;
	}
	card.querySelectorAll?.(".temp-name")?.forEach(el => el.remove());
	ensureCardNodeRefs(card);

	const cardname = event.card.name;
	const cardnature = get.nature(event.card);
	const info = lib.card[cardname];
	const isMulti = !!opts.isMulti;
	const isEquipConvert = isEquipConvertSkill(event.skill);

	if (card.nature) {
		get.natureList(card.nature).forEach(n => {
			if (n) card.classList.remove(n);
		});
	}
	if (card.dataset.cardSubtype) card.classList.remove(card.dataset.cardSubtype);

	card.name = cardname;
	if (cardnature) {
		card.nature = cardnature;
		get.natureList(cardnature).forEach(n => {
			if (n) card.classList.add(n);
		});
	} else {
		delete card.nature;
	}

	card.dataset.cardName = cardname;
	if (info) {
		card.dataset.cardType = info.type || "";
		card.dataset.cardSubtype = info.subtype || "";
		card.dataset.cardMultitarget = info.multitarget ? "1" : "0";
		if (info.subtype) card.classList.add(info.subtype);
	} else {
		card.dataset.cardType = "";
		card.dataset.cardSubtype = "";
	}

	if (card.node?.range) card.node.range.innerHTML = "";
	if (card.node?.name2) card.node.name2.innerHTML = "";
	if (card.$distance) {
		while (card.$distance.firstChild) card.$distance.removeChild(card.$distance.firstChild);
	}

	if (isMulti) card.dataset.viewasMulti = "1";
	card.dataset.viewasPrimary = "1";
	card.dataset.zhuanhua = "1";
	// 多张转化才隐藏花色点数；单牌转化保留原花色点数
	if (isEquipConvert && isMulti) card.dataset.zhangba = "1";

	// 清掉可能已叠的临时花色，保证显示材料牌自身花色点数
	if (card._tempSuitNum) {
		card._tempSuitNum.delete?.();
		delete card._tempSuitNum;
	}
	delete card.dataset.tempsn;
	delete card.dataset.tempnum;
	clearLayeredTempSuitNum(card);

	// 转化出牌沿用当前分层皮肤，不再换成白卡
	const face = getLayeredBase() || card.dataset.cardFace || "1";
	applyLayeredCard(card, face);
	updateLayeredMarks(card, {
		skill: event.skill,
		cards: event.card?.cards,
		showColor: isMulti,
		keepFace: true,
	});

	if (window.decadeUI?.layoutDiscard) {
		decadeUI.queueNextFrameTick?.(decadeUI.layoutDiscard, decadeUI);
	}
}

/**
 * 是否为转化出牌（实体牌名/属性与结算牌不同）
 * @param {object} event
 * @param {HTMLElement} [card]
 * @returns {boolean}
 */
function isViewAsThrowEvent(card, event) {
	if (!card || !event || lib.config.cardtempname === "off") return false;
	if (!["useCard", "respond"].includes(event.name) || !event.card) return false;
	if (card.dataset.virtual === "1") return false;
	const cardname = event.card.name;
	const cardnature = get.nature(event.card);
	return card.name !== cardname || !get.is.sameNature(cardnature, card.nature, true);
}

/**
 * 收集本次转化对应的 thrown 克隆（按材料顺序）
 * @param {object} event
 * @param {HTMLElement} [hintCard]
 * @returns {HTMLElement[]}
 */
function collectThrownClones(event, hintCard) {
	const materials = event.card?.cards;
	const list = [];
	if (Array.isArray(materials) && materials.length) {
		for (const m of materials) {
			if (m?.clone?.isConnected) list.push(m.clone);
		}
	}
	if (!list.length && hintCard?.isConnected) list.push(hintCard);
	// 回退：从 ui.thrown 里找同组未处理的转化牌
	if (!list.length && Array.isArray(ui.thrown)) {
		for (const t of ui.thrown) {
			if (!t?._viewAsMorphed && t.dataset?.virtual !== "1" && isViewAsThrowEvent(t, event)) {
				list.push(t);
			}
		}
	}
	return list;
}

/** 出牌飞入大致时长（与 waitCardArrive 超时一致） */
const VIEWAS_THROW_MS = 420;
/** 落地前提前多久开播转化动画 */
const VIEWAS_ANIM_LEAD_MS = 200;
/** 转化动画播放速度（越小白闪越久） */
const VIEWAS_ANIM_SPEED = 0.50;
/** 开播后至少保留多久白闪再变形 */
const VIEWAS_WHITE_MS = 420;
/** 相对牌面的缩放（资源自带外扩光晕，需明显小于 1 以免白框溢出牌边） */
const VIEWAS_ANIM_SCALE = 0.90;

/**
 * 等待卡牌飞入临时区
 * @param {HTMLElement} card
 * @returns {Promise<void>}
 */
function waitCardArrive(card) {
	return new Promise(resolve => {
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			card.removeEventListener("transitionend", onEnd);
			resolve();
		};
		const onEnd = e => {
			if (!e.propertyName || e.propertyName === "transform") finish();
		};
		card.addEventListener("transitionend", onEnd);
		setTimeout(finish, VIEWAS_THROW_MS);
	});
}

/**
 * 转化出牌：飞行中折叠 → 快落地播动画 → 白闪后再变形为结果
 * @param {object} event
 * @param {HTMLElement} [hintCard]
 */
export async function scheduleThrownViewAsMorph(event, hintCard) {
	if (!event?.card || lib.config.cardtempname === "off") return;

	const groupKey = String(event.card.cardid ?? event.id ?? `${event.name}_${event.player?.playerid ?? ""}`);
	if (pendingViewAsGroups.has(groupKey)) return;
	pendingViewAsGroups.add(groupKey);

	try {
		await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

		const materials = Array.isArray(event.card.cards) ? event.card.cards : [];
		const isMulti = materials.length > 1;
		let thrown = collectThrownClones(event, hintCard);
		if (!thrown.length) return;

		thrown.forEach(c => {
			c.dataset.viewasFold = isMulti ? "1" : "0";
			c._viewAsGroupId = groupKey;
			delete c.dataset.viewasPrimary;
			clearViewAsLabel(c);
			if (c._tempName) {
				c._tempName.delete?.();
				delete c._tempName;
			}
			c.querySelectorAll?.(".temp-name")?.forEach(el => el.remove());
		});

		const primary = thrown[0];
		primary.dataset.viewasPrimary = "1";

		// 飞行中就往折叠位收拢
		if (window.decadeUI?.layoutDiscard) {
			decadeUI.layoutDiscard();
		}

		const arrivePromise = Promise.all(thrown.map(c => waitCardArrive(c)));

		const anim = window.decadeUI?.animation;
		const canvas = anim?.canvas;
		const prevCanvasZ = canvas?.style?.zIndex;
		let canvasRaised = false;
		const restoreCanvas = () => {
			if (!canvasRaised || !canvas) return;
			canvasRaised = false;
			canvas.style.zIndex = prevCanvasZ ?? "";
		};

		// 快落地时开播
		await new Promise(r => setTimeout(r, Math.max(0, VIEWAS_THROW_MS - VIEWAS_ANIM_LEAD_MS)));
		if (!primary.isConnected) return;

		const whitePromise = new Promise(r => setTimeout(r, VIEWAS_WHITE_MS));
		if (anim?.playSpine) {
			try {
				if (canvas) {
					canvas.style.zIndex = "21";
					canvasRaised = true;
				}
				anim.playSpine(
					{
						name: "kapaizhuanhuan",
						loop: false,
						speed: VIEWAS_ANIM_SPEED,
						oncomplete: restoreCanvas,
					},
					{ parent: primary, scale: 0.9, follow: true }
					// {
					// 	parent: primary,
					// 	follow: true,
					// 	// 按牌面宽高适配，再略缩小以免白框超出四周
					// 	width: [0, 1],
					// 	height: [0, 1],
					// 	scale: VIEWAS_ANIM_SCALE,
					// }
				);
				setTimeout(restoreCanvas, Math.ceil(1000 / VIEWAS_ANIM_SPEED));
			} catch (e) {
				restoreCanvas();
				console.warn("kapaizhuanhuan play failed", e);
			}
		}

		// 落地 + 白闪够久后再出结果
		await Promise.all([arrivePromise, whitePromise]);
		if (!primary.isConnected) return;
		morphThrownToViewAs(primary, event, { isMulti });
	} finally {
		setTimeout(() => pendingViewAsGroups.delete(groupKey), 1800);
	}
}

/**
 * @deprecated 保留导出兼容；合并改回落地后执行
 */
export function isViewAsConversionThrow(event, thrownCards) {
	if (!event || !thrownCards?.length) return false;
	return thrownCards.some(c => isViewAsThrowEvent(c, event));
}

/**
 * @deprecated 保留导出兼容
 */
export function prepareThrownViewAsMerge() {
	return null;
}

/**
 * 尝试添加玩家卡牌使用标签
 * @param {HTMLElement} card - 卡牌元素
 * @param {HTMLElement} player - 玩家元素
 * @param {object} event - 事件对象
 * @param {object} decadeUI - DecadeUI实例
 * @returns {void}
 */
export function tryAddPlayerCardUseTag(card, player, event, decadeUI) {
	if (!card || !player || !event) return;

	const create =
		decadeUI.element?.create ||
		((cls, parent) => {
			const el = document.createElement("div");
			if (cls) el.className = cls;
			if (parent) parent.appendChild(el);
			return el;
		});

	let tagNode = card.querySelector(".used-info");
	if (!tagNode) tagNode = card.appendChild(create("used-info"));
	card.$usedtag = tagNode;

	if (event.blameEvent) event = event.blameEvent;

	let tagText;

	if (event.name === "judge") {
		tagText = handleJudgeTag(card, event, decadeUI);
	} else {
		tagText = handleDefaultTag(card, player, event, decadeUI);
	}

	tagNode.innerHTML = tagText;
}

/**
 * 处理判定标签
 * @param {HTMLElement} card - 卡牌元素
 * @param {object} event - 事件对象
 * @param {object} decadeUI - DecadeUI实例
 * @returns {string} 初始标签文本
 */
function handleJudgeTag(card, event, decadeUI) {
	const initialText = event.judgestr + "的判定牌";

	// 亮出时：红颜等已将花色视为红桃，直接换图（不等到结算）
	const revealSuit = get.suit(event.player?.judging?.[0] || card, event.player);
	const revealNum = get.number(event.player?.judging?.[0] || card, event.player);
	if (revealSuit && (card.suit !== revealSuit || card.number !== revealNum)) {
		cardTempSuitNum(card, revealSuit, revealNum, decadeUI.element);
	}

	event.addMessageHook?.("judgeResult", function () {
		const evt = this;
		// 判定展示牌：优先 event.node（$throw 的 copy），再退回 card.clone
		const resultCard = evt.result?.node || evt.node || evt.result?.card?.clone || card;
		if (!resultCard) return;

		let tagNode = resultCard.querySelector(".used-info");
		if (!tagNode) {
			tagNode = document.createElement("div");
			tagNode.className = "used-info";
			resultCard.appendChild(tagNode);
		}

		// 与牌面物理花色/点数比：覆盖红颜被动改判与 xinhongyan 主动改花色
		const resultSuit = evt.result.suit;
		const resultNumber = evt.result.number;
		if (
			resultSuit != null &&
			(resultCard.suit !== resultSuit || resultCard.number !== resultNumber || resultCard.dataset.tempsn !== resultSuit)
		) {
			cardTempSuitNum(resultCard, resultSuit, resultNumber, decadeUI.element);
		}

		let judgeValue;
		const getEffect = evt.judge2;

		if (getEffect) {
			judgeValue = getEffect(evt.result);
		} else {
			judgeValue = decadeUI.get?.judgeEffect?.(evt.judgestr, evt.result.judge) ?? evt.result.judge;
		}

		if (typeof judgeValue === "boolean") {
			judgeValue = judgeValue ? 1 : -1;
		} else {
			judgeValue = evt.result.judge;
		}

		const tagText = judgeValue >= 0 ? "判定生效" : "判定失效";
		if (evt.apcard?._ap) evt.apcard._ap.stopSpineAll();
		evt.apcard = undefined;
		tagNode.innerHTML = (get.translation(evt.judgestr) || "") + tagText;
	});

	event.apcard = card;
	return initialText;
}

/**
 * 处理默认标签
 * @param {HTMLElement} card - 卡牌元素
 * @param {HTMLElement} player - 玩家元素
 * @param {object} event - 事件对象
 * @param {object} decadeUI - DecadeUI实例
 * @returns {string} 标签文本
 */
function handleDefaultTag(card, player, event, decadeUI) {
	const evt = _status.event;
	_status.event = event;
	let text = get.cardsetion?.(player) || "";
	_status.event = evt;

	if (["useCard", "respond"].includes(event.name)) {
		// 转化：飞行中折叠，快落地播动画，白闪后再出结果
		const isConvert = isViewAsThrowEvent(card, event) && !card._viewAsMorphed;
		if (isConvert) {
			clearViewAsLabel(card);
			if (card._tempName) {
				card._tempName.delete?.();
				delete card._tempName;
			}
			card.querySelectorAll?.(".temp-name")?.forEach(el => el.remove());
			scheduleThrownViewAsMorph(event, card);
		}

		// 单牌转化：保留材料牌自身花色点数，不用结算牌覆盖
		const cardnumber = get.number(event.card);
		const cardsuit = get.suit(event.card);
		if (
			!isConvert &&
			card.dataset.views !== "1" &&
			event.card.cards?.length === 1 &&
			(card.number !== cardnumber || card.suit !== cardsuit)
		) {
			cardTempSuitNum(card, cardsuit, cardnumber, decadeUI.element);
		}
	}

	return text;
}
