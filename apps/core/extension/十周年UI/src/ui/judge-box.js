/**
 * @fileoverview 琉璃版判定框 UI（#judgeBox）
 */

import { lib, game, ui, get } from "noname";
import { applyLayeredCard, clearLayeredCard } from "../overrides/card/layered-card.js";

/**
 * 判定框内正面牌强制标准白卡（分层 card1）
 * @param {HTMLElement} cardEl
 */
function applyJudgeWhiteCard(cardEl) {
	if (!cardEl?.classList?.contains("card")) return;
	try {
		cardEl.classList.remove("decade-card");
		cardEl.style.removeProperty("background");
		cardEl.style.removeProperty("background-image");
		if (cardEl.classList.contains("layered-card")) {
			clearLayeredCard(cardEl);
		}
		applyLayeredCard(cardEl, "1");
	} catch (e) {}
}

/**
 * 为判定框创建展示用牌节点
 * @param {HTMLElement|object} source
 * @returns {HTMLElement|null}
 */
function createJudgeDisplayCard(source) {
	if (!source) return null;
	let node;
	if (typeof source.copy === "function") {
		node = source.copy();
		node.card = source;
	} else if (source.cloneNode) {
		node = source.cloneNode(true);
		node.card = source.card || source;
	} else {
		return null;
	}
	applyJudgeWhiteCard(node);
	node.style.setProperty("transform", "translate(0px, 0px) scale(1)", "");
	node.style.clipPath = "";
	return node;
}

/** @type {HTMLElement[]} */
let judgeCardGets = [];

/** @type {object|null} 连续判定所属技能事件（慧识 / 洛神 / 庀材等） */
let judgeSessionRoot = null;

/**
 * 向上查找技能 content 事件
 * @param {GameEvent} event
 * @returns {GameEvent|null}
 */
function getJudgeSessionRoot(event) {
	if (typeof event.getParent === "function") {
		for (let i = 1; i < 20; i++) {
			const p = event.getParent(i, true);
			if (!p) break;
			if (p.name && lib.skill?.[p.name]) return p;
			if (Array.isArray(p.cards) && (p.again !== undefined || Array.isArray(p.suits))) return p;
		}
		const byName = event.getParent(
			evt => !!(evt.name && lib.skill?.[evt.name]),
			true
		);
		if (byName) return byName;
	}
	return null;
}

function isJudgeSessionContinuing(event) {
	if (event.card || !ui.judgeBox) return false;
	const sessionRoot = getJudgeSessionRoot(event);
	if (!sessionRoot || sessionRoot.finished) return false;
	if (judgeSessionRoot === sessionRoot) return true;
	if (judgeCardGets.length > 0 && judgeSessionRoot && !judgeSessionRoot.finished) {
		judgeSessionRoot = sessionRoot;
		return true;
	}
	return false;
}

/**
 * 暂存牌移出框体，避免关 DOM 时被一并销毁
 */
function preserveGainCards() {
	for (const el of judgeCardGets) {
		if (el.parentNode) el.parentNode.removeChild(el);
	}
}

/**
 * 将暂存牌挂回左侧区域
 */
function restoreGainCardsToArea() {
	const area = ensureJudgeGainArea();
	for (const el of judgeCardGets) {
		if (!area.contains(el)) area.appendChild(el);
	}
	layoutJudgeGainCards();
}

/**
 * 左侧已获得判定牌暂存区
 */
function ensureJudgeGainArea(box) {
	if (!ui.judgeGainArea || (box && !box.contains(ui.judgeGainArea))) {
		ui.judgeGainArea = ui.create.div(".judgeGainArea", box || ui.judgeBox);
	}
	return ui.judgeGainArea;
}

/**
 * 头像独立顶层，避免被暂存牌 / 延时锦囊牌盖住
 * @param {HTMLElement} [box]
 */
function ensureJudgeAvatarLayer(box = ui.judgeBox) {
	if (!box) return null;
	if (!ui.judgeAvatarLayer || !box.contains(ui.judgeAvatarLayer)) {
		ui.judgeAvatarLayer = ui.create.div(".judgeAvatarLayer", box);
	}
	box.appendChild(ui.judgeAvatarLayer);
	return ui.judgeAvatarLayer;
}

/**
 * 挂载判定框小头像（始终在最上层）
 * @param {object} player
 * @param {"card"|"skill"} type
 */
function ensureSmallCharacter(player, type) {
	const box = ui.judgeBox;
	const layer = ensureJudgeAvatarLayer(box);
	if (!layer) return null;

	let avatar = ui.smallCharacter;
	if (!avatar?.isConnected) {
		avatar = ui.create.div(".smallCharacter", layer);
		ui.smallCharacter = avatar;
		ui.smallCharacterName = ui.create.div(".smallCharacterName", avatar);
	} else if (avatar.parentNode !== layer) {
		layer.appendChild(avatar);
	}

	avatar.dataset.type = type;
	avatar.style.backgroundImage =
		type === "card" ? getSmallCharacterBg(player) : player.node.avatar?.style?.backgroundImage || "";
	if (ui.smallCharacterName) {
		ui.smallCharacterName.innerHTML = get.translation(player.name);
	}
	box.appendChild(layer);
	return avatar;
}

/**
 * 重排左侧暂存判定牌（相对 judgeGainArea 定位，勿用全屏坐标）
 */
function layoutJudgeGainCards() {
	const area = ui.judgeGainArea;
	if (!area) return;
	for (const el of judgeCardGets) {
		if (el.parentNode && !area.contains(el)) area.appendChild(el);
	}
	const cards = judgeCardGets.filter(el => area.contains(el));
	const count = cards.length;
	if (!count) return;

	const pad = 8;
	const cardW = 108;
	const areaW = area.offsetWidth || window.innerWidth * 0.38;
	const gap =
		count <= 1 ? 0 : Math.min(72, Math.max(22, (areaW - cardW - pad * 2) / (count - 1)));

	cards.forEach((el, i) => {
		applyJudgeWhiteCard(el);
		el.style.position = "absolute";
		el.style.top = "0";
		el.style.left = "0";
		el.style.zIndex = String(i);
		el.style.clipPath = "";
		el.style.opacity = "";
		el.style.visibility = "";
		el.style.setProperty("transform", `translateX(${pad + i * gap}px)`, "");
	});
}

/**
 * 技能连续判定进行中：监听父事件结束后再关框
 * @param {GameEvent} skillEvent
 */
function watchJudgeSkillParentEnd(skillEvent) {
	if (!skillEvent) return;
	if (ui._judgeBoxClosePoll) {
		clearInterval(ui._judgeBoxClosePoll);
		delete ui._judgeBoxClosePoll;
	}
	ui._judgeBoxClosePoll = setInterval(() => {
		if (!ui.judgeBox && !judgeCardGets.length) {
			clearInterval(ui._judgeBoxClosePoll);
			delete ui._judgeBoxClosePoll;
			return;
		}
		if (skillEvent.finished) {
			closeJudgeBox();
		}
	}, 200);
}

/**
 * 判定框展开 / 折叠时钉死位置与高度
 * @param {HTMLElement} dialog
 */
function lockJudgeBoxPlacement(dialog) {
	if (!dialog?.classList?.contains("judgeBox")) return;
	const collapsedH = 125;
	dialog.style.setProperty("left", "0px", "important");
	dialog.style.setProperty("right", "0px", "important");
	dialog.style.setProperty("width", "100%", "important");
	dialog.style.setProperty("bottom", "auto", "important");
	dialog.style.setProperty("margin", "0px", "important");
	dialog.style.setProperty("transform", "none", "important");

	if (dialog.classList.contains("dui-judge-collapsed")) {
		const half = collapsedH / 2;
		dialog.style.setProperty("height", `${collapsedH}px`, "important");
		dialog.style.setProperty("min-height", `${collapsedH}px`, "important");
		dialog.style.setProperty("max-height", `${collapsedH}px`, "important");
		dialog.style.setProperty("top", `calc(50% - ${half}px)`, "important");
		return;
	}

	dialog.style.removeProperty("height");
	dialog.style.removeProperty("min-height");
	dialog.style.removeProperty("max-height");
	dialog.style.removeProperty("top");
}

/**
 * 标题旁箭头：折叠 / 展开判定框（对齐顺手选牌框）
 * @param {HTMLElement} dialog
 * @param {HTMLElement} wrap
 */
function bindJudgeCollapseArrow(dialog, wrap) {
	if (!dialog || !wrap || wrap.querySelector(".dui-pcd-arrow")) return;
	const arrow = ui.create.div(".dui-pcd-arrow", wrap);
	const toggle = evt => {
		evt.stopPropagation();
		evt.preventDefault();
		if (evt.type !== "click") return;
		dialog.classList.toggle("dui-judge-collapsed");
		lockJudgeBoxPlacement(dialog);
	};
	arrow.addEventListener("click", toggle);
	arrow.addEventListener("mousedown", evt => evt.stopPropagation());
	arrow.addEventListener("touchstart", evt => evt.stopPropagation(), { passive: true });
}

/**
 * 注入金色标题（判定框：标题 + 折叠箭头）
 * @param {HTMLElement} dialog
 * @param {string} titleText
 */
function injectJudgeGoldTitle(dialog, titleText) {
	if (!dialog || !titleText) return;
	let wrap = dialog.querySelector(".dui-gold-title-wrap");
	if (!wrap) {
		wrap = ui.create.div(".dui-gold-title-wrap", dialog);
		ui.create.div(".dui-gold-title", wrap);
		bindJudgeCollapseArrow(dialog, wrap);
	}
	const title = wrap.querySelector(".dui-gold-title");
	if (title) title.textContent = titleText;
}

/**
 * 延时锦囊判定说明文案
 * @param {string} cardName
 * @param {object} player
 * @returns {string}
 */
function getDelayTrickIntroduceHtml(cardName, player) {
	const pname = get.translation(player.name);
	switch (cardName) {
		case "lebu":
			return `<span data-suit-type='red'>♦</span><span data-suit-type='black'>♠♣</span>：${pname}跳过出牌阶段<br><span data-suit-type='red'>♥</span>：乐不思蜀失效`;
		case "bingliang":
			return `<span data-suit-type='red'>♥♦</span><span data-suit-type='black'>♠</span>：${pname}跳过摸牌阶段<br><span data-suit-type='black'>♣</span>：兵粮寸断失效`;
		case "caomu":
			return `<span data-suit-type='red'>♥♦</span><span data-suit-type='black'>♠</span>：${pname}抑制摸牌效果<br><span data-suit-type='black'>♣</span>：草木皆兵失效`;
		case "shandian":
			return `<span data-suit-type='black'>♠</span>2~9闪电生效<br>其他：闪电失效`;
		case "fulei":
			return `<span data-suit-type='black'>♠</span>浮雷生效<br>其他：浮雷失效`;
		case "huoshan":
			return `<span data-suit-type='red'>♥</span>火山生效<br>其他：火山失效`;
		case "hongshui":
			return `<span data-suit-type='black'>♣</span>洪水生效<br>其他：洪水失效`;
		case "dczixi_card":
			return "无任何判定效果。";
		default:
			return "未知判定牌效果。";
	}
}

/**
 * 技能判定说明
 * @param {GameEvent} event
 * @returns {string}
 */
function getSkillIntroduceHtml(event) {
	const parent = event.getParent?.();
	const skillName = parent?.skill || parent?.name;
	if (skillName && lib.skill?.[skillName]?.info) {
		return get.translation(lib.skill[skillName].info) || "正在进行判定。";
	}
	return "正在进行判定。";
}

/**
 * 小头像背景
 * @param {object} player
 * @returns {string}
 */
function getSmallCharacterBg(player) {
	if (player.isUnseen?.(0)) {
		if (player.isUnseen?.(1)) return "linear-gradient(0deg, #000000, #000000)";
		return player.node.avatar2?.style?.backgroundImage || "";
	}
	return player.node.avatar?.style?.backgroundImage || "";
}

/**
 * 延时锦囊左侧展示
 * @param {GameEvent} event
 * @param {object} player
 */
function setupDelayCardPanel(event, player) {
	const delayCard = ui.judgeDelayCard;
	if (!delayCard) return;

	while (delayCard.firstChild) delayCard.removeChild(delayCard.firstChild);

	const card = event.card;
	const isConvert =
		card.bianhua || card.bianhua2 || (card.viewAs && card.viewAs !== card.name);

	if (isConvert && ui.create?.card) {
		const zcard = ui.create.card().init([card.suit, card.number, card.name, card.nature]);
		applyJudgeWhiteCard(zcard);
		const zcardTrue = ui.create
			.card()
			.init([
				card.suitb || card.suit,
				card.numberb || card.number,
				card.nameb || card.viewAs || card.name,
				card.natureb || card.nature,
			]);
		applyJudgeWhiteCard(zcardTrue);
		delayCard.appendChild(zcard);
		event.zcard = zcard;
		event.zcard_true = zcardTrue;
		setTimeout(() => {
			window.decadeUI?.animation?.playSpine?.(
				{ name: "kapaizhuanhuan", speed: 0.4 },
				{ scale: 0.83, parent: zcard }
			);
			setTimeout(() => {
				if (zcard.parentNode === delayCard) delayCard.removeChild(zcard);
				delayCard.appendChild(zcardTrue);
				ui.create.div(".zhuanbj", delayCard);
			}, 200);
		}, 400);
	} else {
		const delayClone = createJudgeDisplayCard(card);
		if (delayClone) {
			delayCard.appendChild(delayClone);
			event.judgeDelayCard2 = delayClone;
		}
	}

	const cardtname = card.nameb || card.viewAs || card.name;
	ui.introduce_card.innerHTML = getDelayTrickIntroduceHtml(cardtname, player);
	ui.introduce_card.dataset.type = "card";
	ensureSmallCharacter(player, "card");
}

/**
 * 技能判定左侧展示
 * @param {GameEvent} event
 * @param {object} player
 */
function setupSkillJudgePanel(event, player) {
	if (ui.judgeDelayCard) {
		while (ui.judgeDelayCard.firstChild) ui.judgeDelayCard.removeChild(ui.judgeDelayCard.firstChild);
		ui.judgeDelayCard.remove();
		delete ui.judgeDelayCard;
	}

	ensureSmallCharacter(player, "skill");

	ui.introduce_card.dataset.type = "skill";
	ui.introduce_card.innerHTML = getSkillIntroduceHtml(event);
}

/**
 * 创建或复用判定框
 * @returns {HTMLElement}
 */
function ensureJudgeDialog() {
	if (!ui.judgeBox) {
		const dialog = ui.create.dialog("hidden");
		dialog.id = "judgeBox";
		dialog.classList.add("judgeBox", "dui-judge-box", "noupdate");
		dialog.static = true;
		ui.judgeBox = dialog;
	}
	ui.judgeBox.classList.add("judgeBox", "dui-judge-box");
	if (!ui.judgeBox.parentNode) ui.arena.appendChild(ui.judgeBox);
	if (!ui.dialogs.includes(ui.judgeBox)) ui.dialogs.unshift(ui.judgeBox);
	ui.judgeBox.classList.remove("hidden", "dui-pcd-opening", "dui-pcd-defer-reveal");
	ui.judgeBox.show();
	ui.judgeBox.style.opacity = "1";
	ui.judgeBox.style.visibility = "visible";
	return ui.judgeBox;
}

/**
 * 连续判定：仅刷新右侧亮牌槽，不重建框体
 */
function refreshJudgeBoxForNext(event, player) {
	const box = ui.judgeBox;
	box.static = true;
	event.dialog = box;

	const titleEl = box.querySelector(".dui-gold-title");
	if (titleEl) titleEl.textContent = event.judgestr || "";
	else injectJudgeGoldTitle(box, event.judgestr || "");
	lockJudgeBoxPlacement(box);

	while (ui.judgeCardArea?.firstChild) {
		ui.judgeCardArea.removeChild(ui.judgeCardArea.firstChild);
	}

	ensureJudgeGainArea(box);
	layoutJudgeGainCards();
	ensureJudgeAvatarLayer(box);

	const judgingCard = player.judging[0];
	clearJudgeThrownMark();
	if (judgingCard) judgingCard.id = "judgeCard";
	event.judgeCard = createJudgeDisplayCard(judgingCard);
}

/**
 * 初始化判定框布局（琉璃 #judgeBox）
 * @param {GameEvent} event
 * @param {object} player
 */
export function setupJudgeBox(event, player) {
	const isSkillJudge = !event.card;
	const sessionRoot = isSkillJudge ? getJudgeSessionRoot(event) : null;
	const continuing = isJudgeSessionContinuing(event);

	if (!isSkillJudge) {
		closeJudgeBox();
	} else if (sessionRoot) {
		if (!judgeSessionRoot || judgeSessionRoot !== sessionRoot) {
			closeJudgeBox();
			judgeSessionRoot = sessionRoot;
		}
	} else if (!ui.judgeBox) {
		closeJudgeBox();
	}

	if (continuing) {
		ui.judgeBox.classList.add("dui-judge-stable");
		refreshJudgeBoxForNext(event, player);
		return;
	}

	const box = ensureJudgeDialog();
	box.classList.remove("dui-judge-stable");
	box.static = true;
	event.dialog = box;
	if (game.online) ui.dialogs?.push?.(box);

	injectJudgeGoldTitle(box, event.judgestr || "");
	lockJudgeBoxPlacement(box);

	if (!ui.judgeResultIntroduce || !box.contains(ui.judgeResultIntroduce)) {
		ui.judgeResultIntroduce = ui.create.div(".judgeResultIntroduce", box);
	}
	ui.judgeResultIntroduce.innerText = "判定结果";

	if (!ui.judgeCardArea || !box.contains(ui.judgeCardArea)) {
		ui.judgeCardArea = ui.create.div(".judgeCardArea", box);
		ui.judgeCardArea.id = "judgeCardArea";
	}
	while (ui.judgeCardArea.firstChild) ui.judgeCardArea.removeChild(ui.judgeCardArea.firstChild);

	if (!ui.introduce_card || !box.contains(ui.introduce_card)) {
		ui.introduce_card = ui.create.div(".introduce_card", box);
	}

	if (event.card) {
		if (!ui.judgeDelayCard || !box.contains(ui.judgeDelayCard)) {
			ui.judgeDelayCard = ui.create.div(".judgeDelayCard", box);
		}
		ui.judgeResultIntroduce.dataset.type = "card";
		ui.judgeCardArea.dataset.type = "card";
		setupDelayCardPanel(event, player);
	} else {
		ensureJudgeGainArea(box);
		ui.judgeResultIntroduce.dataset.type = "skill";
		ui.judgeCardArea.dataset.type = "skill";
		setupSkillJudgePanel(event, player);
		restoreGainCardsToArea();
	}

	if (sessionRoot && !judgeSessionRoot) {
		judgeSessionRoot = sessionRoot;
	}

	const judgingCard = player.judging[0];
	clearJudgeThrownMark();
	if (judgingCard) judgingCard.id = "judgeCard";
	event.judgeCard = createJudgeDisplayCard(judgingCard);
}

/**
 * 将亮出的判定牌放入框内
 * @param {GameEvent} event
 */
export function appendJudgeCardToBox(event) {
	if (!event.judgeCard || !ui.judgeCardArea) return;
	applyJudgeWhiteCard(event.judgeCard);
	ui.judgeCardArea.appendChild(event.judgeCard);
}

/**
 * 改判：擦除旧牌 + gaipan + 换牌
 * @param {GameEvent} event
 */
export async function playOverJudge(event) {
	const oldCard = event.judgeCard;
	const newCardData = event.result?.card;
	if (!oldCard?.card || !newCardData || oldCard.card.cardid === newCardData.cardid) return;

	event.result.overjudge = true;
	let bottom = 0;
	const erasePromise = new Promise(resolve => {
		const eraseCardAnimation = setInterval(() => {
			bottom += 10;
			const clipPathPoints = `polygon(0 0,100% 0,100% ${100 - bottom}%,0 ${100 - bottom}%)`;
			oldCard.style.clipPath = clipPathPoints;
			if (bottom >= 50) {
				clearInterval(eraseCardAnimation);
				resolve();
			}
		}, 20);
	});

	try {
		window.decadeUI?.animation?.playSpine?.({ name: "gaipan", speed: 2.4 }, { parent: oldCard, scale: 0.3 });
	} catch (e) {
		/* Spine 不可用时跳过 */
	}

	await erasePromise;
	await new Promise(r => setTimeout(r, 500));

	if (oldCard.parentNode === ui.judgeCardArea) ui.judgeCardArea.removeChild(oldCard);

	event.judgeCard2 = createJudgeDisplayCard(newCardData);
	if (!event.judgeCard2) return;
	event.judgeCard2.style.zIndex = "0";
	ui.judgeCardArea.appendChild(event.judgeCard2);
	await game.delay(2);
}

/**
 * 计算判定展示用数值（对齐琉璃）
 * @param {GameEvent} event
 * @returns {number}
 */
export function resolveJudgeDisplayValue(event) {
	let judgeValue;
	const getEffect = event.judge2;
	if (getEffect) {
		judgeValue = getEffect(event.result);
	} else {
		judgeValue = window.decadeUI?.get?.judgeEffect?.(event.judgestr, event.result.judge) ?? event.result.judge;
	}
	if (typeof judgeValue === "boolean") {
		judgeValue = judgeValue ? 1 : -1;
	} else {
		judgeValue = event.result.judge;
	}
	return judgeValue;
}

/**
 * 判定生效 / 失效 Spine
 * @param {GameEvent} event
 */
export async function playJudgeResultFx(event) {
	const judgeValue = resolveJudgeDisplayValue(event);
	const isNewStyle = lib.config.extension_十周年UI_newDecadeStyle === "on";
	const spineName = isNewStyle ? "effect_panding_SZN" : "effect_panding_SS";
	const action = judgeValue >= 0 ? "play4" : "play5";
	const speed = isNewStyle ? 2.5 : 3;

	try {
		window.decadeUI?.animation?.playSpine?.(
			{ name: spineName, action, speed },
			{ parent: ui.judgeCardArea, scale: 1.1 }
		);
	} catch (e) {
		/* Spine 不可用时跳过 */
	}
	await game.delay(1);
}

/**
 * 判定生效后将牌移到左侧暂存区（洛神 / 慧识 / 庀材等连续判定）
 * @param {HTMLElement} element
 */
export function moveJudgeCard(element) {
	if (!element) return;
	applyJudgeWhiteCard(element);
	if (!ui.judgeBox) ensureJudgeDialog();
	ensureJudgeGainArea();
	if (element.parentNode !== ui.judgeGainArea) {
		ui.judgeGainArea.appendChild(element);
	}
	if (!judgeCardGets.includes(element)) {
		judgeCardGets.push(element);
	}
	ui.judgeCardgets = judgeCardGets;
	layoutJudgeGainCards();
}

/** @deprecated 兼容琉璃 ui.judgeCardmove */
ui.judgeCardmove = moveJudgeCard;

/**
 * 清除场上 thrown 判定弱化标记，避免弃牌区牌一直半透明
 */
function clearJudgeThrownMark() {
	const marked = document.querySelectorAll(".card#judgeCard, .card.judge-highlight, .card.thrown#judgeCard, .card.thrown.judge-highlight");
	for (const el of marked) {
		if (el.id === "judgeCard") el.removeAttribute("id");
		el.classList.remove("judge-highlight");
		el.style?.removeProperty?.("opacity");
	}
}

/**
 * 清除判定框 DOM
 */
export function closeJudgeBox() {
	if (ui._judgeBoxClosePoll) {
		clearInterval(ui._judgeBoxClosePoll);
		delete ui._judgeBoxClosePoll;
	}
	clearJudgeThrownMark();
	preserveGainCards();
	if (ui.judgeBox) {
		ui.judgeBox.close?.();
		ui.judgeBox.remove?.();
	}
	delete ui.judgeBox;
	delete ui.judgeTitle;
	delete ui.judgeDelayCard;
	delete ui.judgeAvatarLayer;
	delete ui.smallCharacter;
	delete ui.smallCharacterName;
	delete ui.introduce_card;
	delete ui.judgeResultIntroduce;
	delete ui.judgeCardArea;
	delete ui.judgeGainArea;
	for (const el of judgeCardGets) {
		el.remove?.();
	}
	judgeCardGets = [];
	judgeSessionRoot = null;
	delete ui.judgeCardgets;
}

/** @deprecated 兼容琉璃 ui.judgeBoxdel */
ui.judgeBoxdel = closeJudgeBox;

/**
 * 连续判定进行中：保留左侧临时区牌，等技能父事件结束后再关框
 * @param {GameEvent} event
 * @returns {boolean} 是否已交给轮询关框
 */
function deferCloseUntilSessionEnd(event) {
	const sessionRoot = getJudgeSessionRoot(event) || judgeSessionRoot;
	if (!sessionRoot || sessionRoot.finished) return false;
	if (!judgeCardGets.length && !ui.judgeBox) return false;
	judgeSessionRoot = sessionRoot;
	watchJudgeSkillParentEnd(sessionRoot);
	return true;
}

/**
 * 琉璃 step 7-8：按回调结果决定关框或移牌到左侧暂存
 * @param {GameEvent} event
 * @param {GameEvent|null} callbackEvent
 */
export async function handleJudgeBoxCleanup(event, callbackEvent) {
	if (event.result?.bool == null) {
		if (!deferCloseUntilSessionEnd(event)) closeJudgeBox();
		return;
	}

	const judgeCard3 = event.judgeCard2 || event.judgeCard;

	// 延时锦囊：快速结束判定框（judge2 仅成败动画，无左侧临时区）
	if (event.card) {
		closeJudgeBox();
		return;
	}

	// 无 callback：单次技能判定应关框；若已有连续暂存则等父事件结束，勿清临时区
	if (!callbackEvent) {
		if (judgeCardGets.length > 0 && deferCloseUntilSessionEnd(event)) return;
		closeJudgeBox();
		return;
	}

	if (!event.judge2) {
		if (!deferCloseUntilSessionEnd(event)) closeJudgeBox();
		return;
	}

	// 连续判定结束（失败 / callback 不再继续）：保留临时区牌，等技能流程走完再关
	const shouldClose = !event.result?.bool || callbackEvent._result?.bool === false;

	if (shouldClose) {
		if (!deferCloseUntilSessionEnd(event)) closeJudgeBox();
		return;
	}

	if (event.result?.bool && judgeCard3) {
		moveJudgeCard(judgeCard3);
		const sessionRoot = getJudgeSessionRoot(event) || judgeSessionRoot;
		if (sessionRoot) judgeSessionRoot = sessionRoot;
		watchJudgeSkillParentEnd(judgeSessionRoot);
	} else if (ui.judgeBox) {
		await game.delay(1.5);
		closeJudgeBox();
	}
}
