/**
 * @fileoverview 卡牌工具函数，提供卡牌临时花色点数显示、特效播放等功能
 */
import { lib, ui, get } from "noname";
import {
	updateLayeredMarks,
	applyLayeredCard,
	getLayeredBase,
	isLayeredMode,
	isEquipConvertSkill,
	applyLayeredTempSuitNum,
	clearLayeredTempSuitNum,
} from "../overrides/card/layered-card.js";
import { getSpineScaleSize } from "../animation/utils.js";

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
 * 是否为「牌名/属性与结算牌不同」的实体牌
 * @param {HTMLElement} card
 * @param {object} event
 * @returns {boolean}
 */
function isNameMismatchedThrow(card, event) {
	if (!card || !event?.card) return false;
	const cardname = event.card.name;
	const cardnature = get.nature(event.card);
	return card.name !== cardname || !get.is.sameNature(cardnature, card.nature, true);
}

/**
 * 事件是否带 viewAs 技能（丈八/玄剑/龙魂等；材料牌名可与结果相同）
 * @param {object} event
 * @returns {boolean}
 */
function isSkillViewAsEvent(event) {
	const skill = event?.skill;
	if (!skill || typeof skill !== "string") return false;
	const info = get.info(skill);
	return Boolean(info?.viewAs);
}

/**
 * 是否应调度转化出牌（白闪 + 变形）
 * @description 除牌名不同外，带 viewAs 的技能出牌也算（避免两张杀当杀时完全不播）
 * @param {HTMLElement} card
 * @param {object} event
 * @returns {boolean}
 */
function isViewAsThrowEvent(card, event) {
	if (!card || !event || lib.config.cardtempname === "off") return false;
	if (!["useCard", "respond"].includes(event.name) || !event.card) return false;
	if (card.dataset.virtual === "1") return false;
	if (card._viewAsMorphed) return false;
	if (isSkillViewAsEvent(event)) return true;
	return isNameMismatchedThrow(card, event);
}

/**
 * 是否为多牌转化出牌（刚离手需先叠好再飞，故推迟第一次 layoutDiscard）
 * @param {object} event
 * @returns {boolean}
 */
export function isMultiViewAsThrowEvent(event) {
	if (!event?.card || lib.config.cardtempname === "off") return false;
	if (!["useCard", "respond"].includes(event.name)) return false;
	const materials = event.card.cards;
	if (!Array.isArray(materials) || materials.length < 2) return false;
	if (isSkillViewAsEvent(event)) return true;
	const cardname = event.card.name;
	const cardnature = get.nature(event.card);
	return materials.some(m => m && (m.name !== cardname || !get.is.sameNature(cardnature, m.nature, true)));
}

/**
 * 收集本次转化对应的 thrown 克隆（严格按材料顺序；主牌=materials[0]）
 * @param {object} event
 * @param {HTMLElement} [hintCard]
 * @returns {HTMLElement[]}
 */
function collectThrownClones(event, hintCard) {
	const materials = event.card?.cards;
	const list = [];
	if (Array.isArray(materials) && materials.length) {
		for (const m of materials) {
			const clone = m?.clone;
			if (clone?.isConnected) list.push(clone);
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

/**
 * 解析主牌：优先材料第一张的 clone
 * @param {object} event
 * @param {HTMLElement[]} thrown
 * @returns {HTMLElement|null}
 */
function resolveViewAsPrimary(event, thrown) {
	const first = event?.card?.cards?.[0]?.clone;
	if (first?.isConnected) return first;
	return thrown?.[0] || null;
}

/** 飞入过渡兜底时长（.card 约 0.46s；优先用 getAnimations().finished） */
const VIEWAS_FLY_MS = 480;
/** 停稳后再多留一点，避免刚好卡在过渡末帧 */
const VIEWAS_FLY_BUFFER_MS = 40;
/** 离手叠牌短过渡（只用固定延时，不用 listenTransition） */
const VIEWAS_MERGE_MS = 120;
/** 转化动画播放速度 */
const VIEWAS_ANIM_SPEED = 0.7;
/** 落地开播后再过多久换牌面 */
const VIEWAS_WHITE_MS = 350;
/** kapaizhuanhuan 素材 orig（atlas） */
const VIEWAS_SPINE_ORIG = { w: 75, h: 100 };
/** 卡槽 DOM 尺寸（与 .card / 分层卡一致） */
const VIEWAS_CARD_BOX = { w: 108, h: 150 };
/** 金 / 黑金外框可视尺寸（.lc-frame 118×160） */
const VIEWAS_CARD_FACE = { w: 118, h: 160 };
/**
 * 相对「当前牌可视矩形」的覆盖比。
 * orig 只是贴图，动画还会外扩光晕，故明显小于 1。
 * 白卡按 108×150 盒子；金/黑金按 118×160 外框（不要按盒子 0.68，光晕会大过牌）。
 */
const VIEWAS_COVER_WHITE = { w: 0.54, h: 0.58 };
const VIEWAS_COVER_FRAMED = { w: 0.52, h: 0.52 };
/** 锚点：相对牌盒中心；金/黑金底框略上移，y 稍大于 0.5 */
const VIEWAS_ANCHOR_WHITE = { x: 0.5, y: 0.5 };
const VIEWAS_ANCHOR_FRAMED = { x: 0.5, y: 0.52 };
/** Spine scaleX/Y 上下限，防止异常尺寸弄挂共用画布 */
const VIEWAS_SCALE_MIN = 0.25;
const VIEWAS_SCALE_MAX = 3.5;
const VIEWAS_CANVAS_FRONT_CLASS = "viewas-anim-front";
/** 播白闪时把 thrown 压到画布默认 z-index 7 之下 */
const VIEWAS_CARD_UNDER_CANVAS_Z = "3";

/**
 * 是否为带外扩边框的分层卡（金 / 黑金）
 * @param {HTMLElement} card
 * @returns {boolean}
 */
function isFramedLayeredCard(card) {
	const face = card?.dataset?.cardFace;
	return Boolean(card?.classList?.contains("layered-card") && (face === "2" || face === "3" || face === "4"));
}

/**
 * 按本项目当前牌的可视大小套白闪（PC / 手机、手牌/临时区缩放都会变）
 * 白卡罩主体；金/黑金只罩中间，边框外不铺满
 * @param {HTMLElement} card
 * @returns {{ scaleX: number, scaleY: number, x: number[], y: number[] }}
 */
function scaleViewAsSpineToCard(card) {
	const framed = isFramedLayeredCard(card);
	const cover = framed ? VIEWAS_COVER_FRAMED : VIEWAS_COVER_WHITE;
	const anchor = framed ? VIEWAS_ANCHOR_FRAMED : VIEWAS_ANCHOR_WHITE;
	// 用布局尺寸算 scale，避免手机 documentZoom 让白闪相对牌偏小；PC zoom≈1 与原先一致
	const r = getSpineScaleSize(card) || card?.getBoundingClientRect?.();
	if (!r?.width || !r?.height) {
		return { scaleX: 1, scaleY: 1, x: [0, anchor.x], y: [0, anchor.y] };
	}
	const visW = framed ? r.width * (VIEWAS_CARD_FACE.w / VIEWAS_CARD_BOX.w) : r.width;
	const visH = framed ? r.height * (VIEWAS_CARD_FACE.h / VIEWAS_CARD_BOX.h) : r.height;
	const clamp = v => Math.min(VIEWAS_SCALE_MAX, Math.max(VIEWAS_SCALE_MIN, v));
	return {
		scaleX: clamp((visW * cover.w) / VIEWAS_SPINE_ORIG.w),
		scaleY: clamp((visH * cover.h) / VIEWAS_SPINE_ORIG.h),
		x: [0, anchor.x],
		y: [0, anchor.y],
	};
}

/**
 * 清掉 thrown 上手牌选中残留的超高 z-index，并按折叠规则重设
 * @param {HTMLElement[]} thrown
 */
function normalizeThrownViewAsZIndex(thrown) {
	const list = Array.isArray(thrown) ? thrown : [];
	for (const c of list) {
		if (!c?.style) continue;
		if (c.dataset.viewasFold === "1") {
			c.style.zIndex = c.dataset.viewasPrimary === "1" ? "15" : "10";
		} else {
			c.style.zIndex = "";
		}
	}
	if (Array.isArray(ui.thrown)) {
		for (const t of ui.thrown) {
			if (!t?.style || list.includes(t)) continue;
			const z = parseInt(t.style.zIndex, 10);
			if (!Number.isFinite(z) || z < 1000) continue;
			t.style.zIndex = t.dataset.viewasFold === "1" ? (t.dataset.viewasPrimary === "1" ? "15" : "10") : "";
		}
	}
}

/**
 * 把转化动画画布抬到 thrown 牌之上，并暂时压低牌的 z-index。
 * thrown 折叠主牌是 15，默认画布只有 7，同层比较时牌会盖住白闪。
 * @param {HTMLElement|null|undefined} canvas
 * @param {HTMLElement[]} thrown
 * @returns {() => void}
 */
function raiseViewAsAnimCanvas(canvas, thrown) {
	const cards = (Array.isArray(thrown) ? thrown : []).filter(c => c?.style);
	const prevCardZ = cards.map(c => [c, c.style.zIndex]);
	for (const c of cards) {
		c.style.zIndex = VIEWAS_CARD_UNDER_CANVAS_Z;
	}
	if (canvas) {
		canvas.classList.add(VIEWAS_CANVAS_FRONT_CLASS);
		canvas.style.setProperty("z-index", "500", "important");
	}
	let restored = false;
	return () => {
		if (restored) return;
		restored = true;
		if (canvas) {
			canvas.classList.remove(VIEWAS_CANVAS_FRONT_CLASS);
			canvas.style.removeProperty("z-index");
		}
		for (const [c, z] of prevCardZ) {
			if (c?.style) c.style.zIndex = z;
		}
		normalizeThrownViewAsZIndex(thrown);
	};
}

function waitAnimationFrames(count = 2) {
	let p = Promise.resolve();
	for (let i = 0; i < count; i++) {
		p = p.then(() => new Promise(r => requestAnimationFrame(r)));
	}
	return p;
}

/**
 * 正在跑的 transform 过渡（含 transition: all）
 * @param {HTMLElement} card
 * @returns {Animation[]}
 */
function getCardFlyAnimations(card) {
	if (typeof card.getAnimations !== "function") return [];
	return card.getAnimations().filter(a => {
		if (a.playState === "finished" || a.playState === "idle") return false;
		const prop = a.transitionProperty || "";
		return !prop || prop === "all" || String(prop).includes("transform");
	});
}

/**
 * 等飞入过渡真正结束（跟 CSS / 开发者工具慢放同一条时间轴）
 * 无 running animation 时才退回固定时长
 * @param {HTMLElement} card
 * @returns {Promise<void>}
 */
async function waitCardArrive(card) {
	await waitAnimationFrames(2);
	if (!card?.isConnected) return;

	const running = getCardFlyAnimations(card);
	if (running.length) {
		await Promise.all(running.map(a => a.finished.catch(() => {})));
		await waitAnimationFrames(1);
		return;
	}

	await new Promise(r => setTimeout(r, VIEWAS_FLY_MS + VIEWAS_FLY_BUFFER_MS));
}

/**
 * 手牌坐标处的折叠露边间距（与弃牌区 foldGap 同一公式，用当前手牌可视宽）
 * @returns {number}
 */
function getViewAsHandFoldGap() {
	const hand = decadeUI?.boundsCaches?.hand;
	hand?.check?.();
	const cw = hand?.cardWidth || 108;
	const cs = hand?.cardScale || 1;
	return Math.max(22, Math.round(cw * cs * 0.16));
}

/**
 * 多牌转化：在克隆当前手牌坐标收成一叠（主牌在右、压最上）
 * @param {HTMLElement[]} thrown
 * @param {HTMLElement} primary
 */
function stackViewAsAtHand(thrown, primary) {
	const list = thrown.filter(c => c?.isConnected);
	if (list.length < 2 || !primary?.isConnected) return;

	const others = list.filter(c => c !== primary);
	const stack = [...others, primary];
	const foldGap = getViewAsHandFoldGap();
	const baseX = Number.isFinite(primary.tx) ? primary.tx : 0;
	const baseY = Number.isFinite(primary.ty) ? primary.ty : 0;
	const startX = baseX - others.length * foldGap;
	const hand = decadeUI?.boundsCaches?.hand;
	const scale = hand?.cardScale || 1;

	stack.forEach((c, i) => {
		const x = Math.round(startX + i * foldGap);
		c.tx = x;
		c.ty = baseY;
		c.scaled = true;
		c.style.transform = `translate(${x}px,${baseY}px) scale(${scale})`;
	});
}

function layoutThrownNow() {
	if (window.decadeUI?.layoutDiscard) decadeUI.layoutDiscard();
}

/**
 * 转化出牌：多牌离手先叠 → 整叠飞入临时区 → 落地播白闪再变形
 * @param {object} event
 * @param {HTMLElement} [hintCard]
 */
export async function scheduleThrownViewAsMorph(event, hintCard) {
	if (!event?.card || lib.config.cardtempname === "off") return;

	const groupKey = String(event.card.cardid ?? event.id ?? `${event.name}_${event.player?.playerid ?? ""}`);
	if (pendingViewAsGroups.has(groupKey)) return;
	pendingViewAsGroups.add(groupKey);

	const flyThenFlash = async (thrown, primary, isMulti) => {
		if (!primary?.isConnected) {
			layoutThrownNow();
			return;
		}
		normalizeThrownViewAsZIndex(thrown);
		// 多牌：先写好临时区目标并 reflow，再等停稳；单牌入场时已在飞
		if (isMulti) {
			layoutThrownNow();
			void primary.offsetWidth;
		}
		await waitCardArrive(primary);
		if (!primary.isConnected) return;

		const anim = window.decadeUI?.animation;
		const canvas = anim?.canvas;
		let restoreCanvas = () => {};

		normalizeThrownViewAsZIndex(thrown);
		if (anim?.playSpine) {
			try {
				restoreCanvas = raiseViewAsAnimCanvas(canvas, thrown);
				anim.playSpine(
					{
						name: "kapaizhuanhuan",
						loop: false,
						speed: VIEWAS_ANIM_SPEED,
						oncomplete: restoreCanvas,
					},
					{
						parent: primary,
						follow: true,
						...scaleViewAsSpineToCard(primary),
					}
				);
				setTimeout(restoreCanvas, Math.ceil(1000 / VIEWAS_ANIM_SPEED));
			} catch (e) {
				restoreCanvas();
				console.warn("kapaizhuanhuan play failed", e);
			}
		}

		await new Promise(r => setTimeout(r, VIEWAS_WHITE_MS));
		if (!primary.isConnected) return;
		morphThrownToViewAs(primary, event, { isMulti });
	};

	try {
		await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

		const materials = Array.isArray(event.card.cards) ? event.card.cards : [];
		const isMulti = materials.length > 1;
		let thrown = collectThrownClones(event, hintCard);
		if (isMulti && thrown.length < materials.length) {
			await new Promise(r => requestAnimationFrame(r));
			thrown = collectThrownClones(event, hintCard);
		}
		if (!thrown.length) {
			layoutThrownNow();
			return;
		}

		const primary = resolveViewAsPrimary(event, thrown);
		if (!primary) {
			layoutThrownNow();
			return;
		}
		if (!thrown.includes(primary)) thrown.unshift(primary);

		thrown.forEach(c => {
			c.style.zIndex = "";
			clearViewAsLabel(c);
			if (c._tempName) {
				c._tempName.delete?.();
				delete c._tempName;
			}
			c.querySelectorAll?.(".temp-name")?.forEach(el => el.remove());
			if (!c?.isConnected) return;
			c.dataset.viewasFold = isMulti ? "1" : "0";
			c._viewAsGroupId = groupKey;
			delete c.dataset.viewasPrimary;
		});
		primary.dataset.viewasPrimary = "1";
		normalizeThrownViewAsZIndex(thrown);

		const canStackAtHand = isMulti && thrown.length >= 2 && thrown.length >= materials.length;
		if (canStackAtHand) {
			void primary.offsetWidth;
			stackViewAsAtHand(thrown, primary);
			await new Promise(r => setTimeout(r, VIEWAS_MERGE_MS));
			if (!primary.isConnected) {
				layoutThrownNow();
				return;
			}
		}

		await flyThenFlash(thrown, primary, isMulti);
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

/** 琉璃/手杀风格：黄色动作词 */
function usedInfoAction(text) {
	return `<br><font color="#FFFF00;">${text}</font>`;
}

/**
 * 尝试添加玩家卡牌使用标签（文案对齐琉璃版）
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

	let tagText = "";
	let omitPlayerName = false;
	const eventName = String(event.name || "").toLowerCase();

	switch (eventName) {
		case "usecard": {
			const targets = event.targets || [];
			if (targets.length === 1) {
				const target = targets[0];
				tagText = usedInfoAction("对") + get.translation(target === player ? player : target);
			} else {
				tagText = usedInfoAction("使用");
			}
			handleUseCardRespondSideEffects(card, event, decadeUI);
			break;
		}
		case "respond":
			tagText = usedInfoAction("打出");
			handleUseCardRespondSideEffects(card, event, decadeUI);
			break;
		case "useskill":
			tagText = "";
			break;
		case "die":
			tagText = usedInfoAction("弃牌");
			card.classList.add("invalided");
			decadeUI.layout?.delayClear?.();
			break;
		case "lose": {
			const discardEvt = event.parent?.name === "discard" ? event.parent : null;
			const skillEvent = discardEvt?.parent?.parent;
			if (skillEvent) {
				const skillKey = skillEvent.name !== "useSkill" ? skillEvent.name : skillEvent.skill;
				const skillName = lib.translate[skillKey];
				// 弃牌阶段等系统事件只显示「弃牌」，技能弃置才带技能名
				const isPhaseLike = typeof skillKey === "string" && (skillKey === "phaseDiscard" || skillKey.startsWith("phase"));
				if (skillName === "过河拆桥") {
					tagText = usedInfoAction("被拆");
				} else if (skillName && lib.skill[skillKey] && !isPhaseLike) {
					tagText = usedInfoAction(skillName) + usedInfoAction("弃牌").replace(/^<br>/, "");
				} else {
					tagText = usedInfoAction("弃牌");
				}
				break;
			}
			tagText = usedInfoAction("弃牌");
			break;
		}
		case "discard":
			tagText = usedInfoAction("弃牌");
			break;
		case "phasejudge":
			tagText = usedInfoAction("即将生效");
			break;
		case "judge":
			omitPlayerName = true;
			tagText = handleJudgeTag(card, event, decadeUI);
			break;
		case "showcards":
			tagText = usedInfoAction(`${get.translation(event.getParent())}展示`);
			break;
		case "loseasync":
			if (event.parent) {
				if (player === event.parent.target) {
					tagText = usedInfoAction("被拆");
				} else {
					const parentName = get.translation(event.parent.name);
					tagText = usedInfoAction(parentName ? `${parentName}弃牌` : "弃牌");
				}
			}
			break;
		default: {
			const translated = get.translation(event.name);
			if (translated && translated !== event.name) {
				tagText = usedInfoAction(translated);
			}
			break;
		}
	}

	if (omitPlayerName) {
		tagNode.innerHTML = tagText;
	} else {
		tagNode.innerHTML = `<span>${get.translation(player)}${tagText}</span>`;
	}
}

/**
 * useCard / respond 的转化与花色点数副作用（保留本项目转化动画）
 * @param {HTMLElement} card
 * @param {object} event
 * @param {object} decadeUI
 */
function handleUseCardRespondSideEffects(card, event, decadeUI) {
	if (!event.card) return;

	const isConvert = isViewAsThrowEvent(card, event);
	if (isConvert) {
		clearViewAsLabel(card);
		if (card._tempName) {
			card._tempName.delete?.();
			delete card._tempName;
		}
		card.querySelectorAll?.(".temp-name")?.forEach(el => el.remove());
		scheduleThrownViewAsMorph(event, card);
	}

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

/**
 * 处理判定标签（亮出 / 结算文案对齐琉璃）
 * @param {HTMLElement} card - 卡牌元素
 * @param {object} event - 事件对象
 * @param {object} decadeUI - DecadeUI实例
 * @returns {string} 初始标签文本
 */
function handleJudgeTag(card, event, decadeUI) {
	const initialText = `${event.judgestr || ""}的${usedInfoAction("判定牌")}`;

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

		const resultAction =
			judgeValue >= 0
				? `<br><font color="#33FF00;">判定生效</font>`
				: `<br><font color="#FF0000;">判定失效</font>`;
		if (evt.apcard?._ap) evt.apcard._ap.stopSpineAll();
		evt.apcard = undefined;
		tagNode.innerHTML = (get.translation(evt.judgestr) || "") + resultAction;
	});

	event.apcard = card;
	return initialText;
}
