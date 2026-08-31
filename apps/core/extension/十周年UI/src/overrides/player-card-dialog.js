/**
 * @fileoverview 顺手 / 拆桥 / 纯观看 / 选项列表等选目标牌对话框美化
 * @description 注入金色标题、分区（左侧区域名+底图）、框内正面牌强制标准白卡并固定尺寸；choiceList 长选项同框
 */
import { lib, get, ui, game, _status } from "noname";
import { applyLayeredCard, clearLayeredCard } from "./card/layered-card.js";
import { syncProgressBarToPcdDialog } from "../ui/progress-bar.js";

const CN_NAME_REG = /[\u4e00-\u9fff]+/;

/** 点选即确认：五谷丰登 / 过河拆桥 / 顺手牵羊（单选 1 张） */
const PCD_AUTO_CONFIRM_EVENTS = new Set(["gainPlayerCard", "discardPlayerCard", "choosePlayerCard"]);

/** 与 dialog.css --dui-pcd-frame-h-* / --dui-pcd-img-h 一致（仅内容区，不含底部 footer） */
const PCD_FRAME_H_2ROW = 443;
const PCD_FRAME_H_SUIT = 547;
const PCD_FRAME_H_1ROW = 281;
const PCD_FRAME_H_COLLAPSED = 125;

/** 底部栈：确认按钮 / 进度条占位（有则加高，无则 0） */
const PCD_FOOTER_CONFIRM_H = 54;
const PCD_FOOTER_PROGRESS_H = 20;
const PCD_FOOTER_STACK_GAP = 6;
const PROGRESS_BAR_ID = "jindutiaopl";

/**
 * 取选牌框内容区基准高度（不含 footer）
 * @param {string} [layout]
 * @returns {number}
 */
function getPcdBaseFrameHeight(layout) {
	if (layout === "suit-select") return PCD_FRAME_H_SUIT;
	if (
		layout === "hej" ||
		layout === "move-bins" ||
		layout === "two-pile" ||
		layout === "guanxing" ||
		layout === "two-ej-row" ||
		layout === "two-row"
	) {
		return PCD_FRAME_H_2ROW;
	}
	if (layout === "hand" || layout === "ej") return PCD_FRAME_H_1ROW;
	return 0;
}

/**
 * 底部 footer 容器（确认 → 进度，自上而下堆叠）
 * @param {HTMLElement} dialog
 * @returns {HTMLElement}
 */
function ensurePcdFooter(dialog) {
	let footer = dialog.querySelector(":scope > .dui-pcd-footer");
	if (!footer) {
		footer = ui.create.div(".dui-pcd-footer", dialog);
	}
	return footer;
}

/**
 * 同步 footer 高度变量，并钉死「顶不动、只往下长」
 * @param {HTMLElement} [dialog]
 */
export function syncPcdFooterLayout(dialog = findActivePcdDialog()) {
	if (!dialog?.classList?.contains("dui-player-card-dialog")) return;

	const footer = ensurePcdFooter(dialog);
	const confirmBar = dialog.querySelector(".dui-pcd-confirm-bar");
	if (confirmBar && confirmBar.parentElement !== footer) {
		footer.appendChild(confirmBar);
	}

	const progressBar = document.getElementById(PROGRESS_BAR_ID);
	if (progressBar?.classList.contains("dui-pcd-progress-bar")) {
		if (progressBar.parentElement !== footer) {
			footer.appendChild(progressBar);
		}
	} else if (progressBar?.parentElement === footer) {
		progressBar.remove();
	}

	if (progressBar?.parentElement === footer) {
		import("../ui/progress-bar.js").then(m => m.fitProgressFillToTrack?.(progressBar)).catch(() => {});
		requestAnimationFrame(() => {
			import("../ui/progress-bar.js").then(m => m.fitProgressFillToTrack?.(progressBar)).catch(() => {});
		});
	}

	const btnOk = confirmBar?.querySelector(".dui-pcd-btn-ok");
	const btnCancel = confirmBar?.querySelector(".dui-pcd-btn-cancel");
	const confirmVisible =
		confirmBar &&
		confirmBar.style.display !== "none" &&
		((btnOk && !btnOk.classList.contains("hidden")) || (btnCancel && !btnCancel.classList.contains("hidden")));
	const confirmH = confirmVisible ? PCD_FOOTER_CONFIRM_H : 0;

	let progressH = 0;
	if (progressBar?.parentElement === footer && progressBar.isConnected) {
		const measured = progressBar.offsetHeight;
		progressH = measured > 0 ? measured + 4 : PCD_FOOTER_PROGRESS_H;
	}

	const stackCount = (confirmH > 0 ? 1 : 0) + (progressH > 0 ? 1 : 0);
	const gapH = stackCount > 1 ? PCD_FOOTER_STACK_GAP : 0;
	const footerH = confirmH + progressH + gapH;

	dialog.style.setProperty("--dui-pcd-footer-confirm", confirmH ? `${confirmH}px` : "0px");
	dialog.style.setProperty("--dui-pcd-footer-progress", progressH ? `${progressH}px` : "0px");
	dialog.style.setProperty("--dui-pcd-footer-h", `${footerH}px`);
	dialog.classList.toggle("dui-pcd-has-footer", footerH > 0);
	footer.style.display = footerH > 0 ? "flex" : "none";

	if (!dialog.classList.contains("dui-pcd-collapsed")) {
		applyPcdFrameHeight(dialog);
	}
}

/**
 * 按内容基准高 + footer 计算总高；top 只按基准高居中，增高不顶内容上移
 * @param {HTMLElement} dialog
 */
function applyPcdFrameHeight(dialog) {
	if (!dialog?.classList?.contains("dui-player-card-dialog")) return;
	const layout = dialog.dataset.layout;
	const baseH = getPcdBaseFrameHeight(layout);
	if (!baseH) return;

	const footerRaw = dialog.style.getPropertyValue("--dui-pcd-footer-h").trim();
	const footerH = parseFloat(footerRaw) || 0;
	const totalH = baseH + footerH;
	const baseHalf = baseH / 2;

	dialog.style.setProperty("height", `${totalH}px`, "important");
	dialog.style.setProperty("max-height", "none", "important");
	dialog.style.setProperty("min-height", "0px", "important");
	dialog.style.setProperty("top", `calc(40% - ${baseHalf}px)`, "important");
}

/**
 * 取当前可见的选牌框
 * @returns {HTMLElement|null}
 */
function findActivePcdDialog() {
	const top = ui.dialog;
	if (
		top?.classList?.contains("dui-player-card-dialog") &&
		!top.classList.contains("hidden") &&
		top.isConnected
	) {
		return top;
	}
	for (const d of ui.dialogs || []) {
		if (
			d?.classList?.contains("dui-player-card-dialog") &&
			!d.classList.contains("hidden") &&
			d.isConnected
		) {
			return d;
		}
	}
	return null;
}

/**
 * 是否为五谷丰登的 chooseButton 选牌
 * @param {GameEvent} event
 * @returns {boolean}
 */
function isWuguChooseButton(event) {
	if (event?.name !== "chooseButton") return false;
	let dialog = event.dialog;
	if (typeof dialog === "number") dialog = get.idDialog(dialog);
	const caption = dialog?.querySelector?.(".caption")?.textContent || "";
	if (caption.includes("五谷丰登")) return true;
	const parent = event.getParent?.();
	if (parent?.card?.name === "wugu") return true;
	const card = get.card?.();
	if (card?.name === "wugu") return true;
	return false;
}

/**
 * 顺拆 / 五谷等：单选 1 张牌时是否点牌即确认
 * @param {GameEvent} event
 * @returns {boolean}
 */
function shouldPcdAutoConfirm(event) {
	if (!event) return false;
	if (event.name === "chooseButton") {
		if (!isWuguChooseButton(event)) return false;
	} else if (!PCD_AUTO_CONFIRM_EVENTS.has(event.name)) {
		return false;
	}
	const select = get.select(event.selectButton);
	return select[0] === select[1] && select[0] === 1;
}

/**
 * 标记点牌即确认，并禁止引擎弹出确定/取消条
 * @param {GameEvent} event
 * @returns {boolean}
 */
function markPcdAutoConfirm(event) {
	if (!shouldPcdAutoConfirm(event)) return false;
	event._duiPcdAutoConfirm = true;
	event.noconfirm = true;
	return true;
}

/**
 * 点选即确认事件：清掉误创建的 confirm / 框内按钮
 */
function clearPcdAutoConfirmUi() {
	ui.arena?.classList?.remove("dui-pcd-confirm-ui");
	const dialog = findActivePcdDialog();
	if (dialog) removePcdConfirmBar(dialog);
	if (ui.confirm) ui.confirm.close();
}

/**
 * 选完牌后自动确认（无需再点确定）
 * @param {boolean} ok
 */
function tryPcdAutoConfirm(ok) {
	if (!ok) return;
	const event = _status.event;
	if (!event?.isMine?.() || !event._duiPcdAutoConfirm) return;
	if (typeof event.filterOk === "function" && !event.filterOk()) return;
	setTimeout(() => {
		if (_status.event !== event || !event._duiPcdAutoConfirm) return;
		if (ui.confirm) ui.confirm.close();
		ui.click.ok();
	}, 0);
}

/**
 * 读取 confirm 条应显示的按钮（o/c）
 * @param {HTMLElement} confirm
 * @returns {{ str: string, ok: HTMLElement|null, cancel: HTMLElement|null }}
 */
function resolveConfirmButtons(confirm) {
	const ok = confirm?.node?.ok || confirm?.querySelector?.(".primary") || null;
	const cancel = confirm?.node?.cancel || confirm?.querySelector?.(".primary2") || null;
	let str = typeof confirm?.str === "string" ? confirm.str : "";
	if (!str) {
		if (ok) str += "o";
		if (cancel) str += "c";
	}
	return { str, ok, cancel };
}

/**
 * 选牌框内确定/取消（塌模：贴在框底，随折叠一起收起）
 * @param {HTMLElement} dialog
 * @returns {HTMLElement}
 */
function ensurePcdConfirmBar(dialog) {
	const footer = ensurePcdFooter(dialog);
	let bar =
		dialog.querySelector(":scope > .dui-pcd-confirm-bar") ||
		footer.querySelector(":scope > .dui-pcd-confirm-bar");
	if (bar) {
		const legacyOk = bar.querySelector(".ok");
		const legacyCancel = bar.querySelector(".cancel");
		if (legacyOk) {
			legacyOk.classList.remove("ok");
			legacyOk.classList.add("dui-pcd-btn-ok");
		}
		if (legacyCancel) {
			legacyCancel.classList.remove("cancel");
			legacyCancel.classList.add("dui-pcd-btn-cancel");
		}
		return bar;
	}

	bar = ui.create.div(".dui-pcd-confirm-bar", footer);
	const ok = ui.create.div(".dui-pcd-confirm-btn.dui-pcd-btn-ok", bar);
	const cancel = ui.create.div(".dui-pcd-confirm-btn.dui-pcd-btn-cancel", bar);
	ok.dataset.link = "ok";
	cancel.dataset.link = "cancel";

	const onActivate = function (evt) {
		evt.stopPropagation();
		evt.preventDefault();
		if (this.classList.contains("disabled")) return;
		const link = this.dataset.link;
		const confirm = ui.confirm;
		const { ok: okNode, cancel: cancelNode } = resolveConfirmButtons(confirm);
		const target = link === "ok" ? okNode : cancelNode;
		if (!target || target.classList.contains("disabled")) return;
		if (confirm?.custom) {
			confirm.custom(link, target);
			return;
		}
		if (link === "ok") ui.click.ok(target);
		else ui.click.cancel(target);
	};
	const evtName = lib.config.touchscreen ? "touchend" : "click";
	ok.addEventListener(evtName, onActivate);
	cancel.addEventListener(evtName, onActivate);
	ok.addEventListener("mousedown", evt => evt.stopPropagation());
	cancel.addEventListener("mousedown", evt => evt.stopPropagation());
	return bar;
}

/**
 * 同步框内按钮与底部 lbtn-confirm 的显隐 / 禁用态
 * @param {HTMLElement} dialog
 * @param {HTMLElement} confirm
 */
function updatePcdConfirmBar(dialog, confirm) {
	const bar = ensurePcdConfirmBar(dialog);
	const btnOk = bar.querySelector(".dui-pcd-btn-ok");
	const btnCancel = bar.querySelector(".dui-pcd-btn-cancel");
	const { str, ok, cancel } = resolveConfirmButtons(confirm);
	// str 可能仍是 "c"，但 game.check 会直接去掉 ok 的 disabled
	const showOk = str.includes("o") || (ok && !ok.classList.contains("disabled"));
	const showCancel = str.includes("c") || !!cancel;

	if (btnOk) {
		btnOk.style.removeProperty("display");
		btnOk.classList.toggle("hidden", !showOk);
		btnOk.classList.toggle("disabled", ok?.classList.contains("disabled") ?? true);
	}
	if (btnCancel) {
		btnCancel.style.removeProperty("display");
		btnCancel.classList.toggle("hidden", !showCancel);
		btnCancel.classList.toggle("disabled", cancel?.classList.contains("disabled") ?? true);
	}
	bar.style.display = showOk || showCancel ? "grid" : "none";
	dialog.classList.toggle("dui-pcd-has-confirm", showOk || showCancel);
	syncPcdFooterLayout(dialog);
}

/**
 * 移除框内确定/取消
 * @param {HTMLElement} [dialog]
 */
function removePcdConfirmBar(dialog) {
	dialog?.querySelector(".dui-pcd-confirm-bar")?.remove();
	dialog?.classList.remove("dui-pcd-has-confirm");
	syncPcdFooterLayout(dialog);
}

/**
 * 选牌框打开且需点确定/取消时：隐藏底部 lbtn-confirm，改用框内塌模按钮
 */
export function syncPlayerCardDialogConfirmUi() {
	const arena = ui.arena;
	if (!arena?.classList) return;
	if (arena.classList.contains("choose-character")) {
		arena.classList.remove("dui-pcd-confirm-ui");
		for (const d of ui.dialogs || []) {
			removePcdConfirmBar(d);
		}
		return;
	}

	const dialog = findActivePcdDialog();
	if (_status.event?._duiPcdAutoConfirm) {
		clearPcdAutoConfirmUi();
		return;
	}

	const confirm = ui.confirm;
	const hasConfirm =
		confirm &&
		confirm.classList?.contains("lbtn-confirm") &&
		!confirm.classList.contains("closing") &&
		confirm.isConnected;
	const active = !!(dialog && hasConfirm);

	arena.classList.toggle("dui-pcd-confirm-ui", active);
	if (active) {
		if (!confirm._duiPcdUpdatePatched && typeof confirm.update === "function") {
			const originalUpdate = confirm.update;
			confirm.update = function (...args) {
				const result = originalUpdate.apply(this, args);
				syncPlayerCardDialogConfirmUi();
				return result;
			};
			confirm._duiPcdUpdatePatched = true;
		}
		updatePcdConfirmBar(dialog, confirm);
	} else if (dialog) {
		removePcdConfirmBar(dialog);
	}
	if (dialog) syncPcdFooterLayout(dialog);
}

/**
 * 选牌框定位钉死（展开 / 折叠高度不同；折叠必须收成原图 125）
 * @param {HTMLElement} dialog
 */
export function lockPlayerCardDialogPlacement(dialog) {
	if (
		!dialog?.classList?.contains("dui-player-card-dialog") &&
		!dialog?.classList?.contains("decade-shousha-vcard")
	) {
		return;
	}
	const layout = dialog.dataset.layout;
	dialog.style.setProperty("left", "0px", "important");
	dialog.style.setProperty("right", "0px", "important");
	dialog.style.setProperty("width", "100%", "important");
	dialog.style.setProperty("bottom", "auto", "important");
	dialog.style.setProperty("margin", "0px", "important");
	dialog.style.setProperty("transform", "none", "important");

	if (dialog.classList.contains("dui-pcd-collapsed")) {
		const half = PCD_FRAME_H_COLLAPSED / 2;
		dialog.style.setProperty("height", `${PCD_FRAME_H_COLLAPSED}px`, "important");
		dialog.style.setProperty("min-height", `${PCD_FRAME_H_COLLAPSED}px`, "important");
		dialog.style.setProperty("max-height", `${PCD_FRAME_H_COLLAPSED}px`, "important");
		dialog.style.setProperty("top", `calc(50% - ${half}px)`, "important");
		syncPlayerCardDialogConfirmUi();
		return;
	}

	const twoRow =
		layout === "hej" ||
		layout === "move-bins" ||
		layout === "two-pile" ||
		layout === "suit-select" ||
		layout === "guanxing" ||
		layout === "two-ej-row" ||
		layout === "two-row";
	const oneRow = layout === "hand" || layout === "ej";
	if (!twoRow && !oneRow) {
		// 其它 layout（含 shousha-vcard）展开时清掉折叠写入的 125px，交还 CSS
		dialog.style.removeProperty("height");
		dialog.style.removeProperty("min-height");
		dialog.style.removeProperty("max-height");
		dialog.style.removeProperty("top");
		syncPlayerCardDialogConfirmUi();
		return;
	}

	syncPcdFooterLayout(dialog);
}

/** 本体区域标题 → 竖排短名（需匹配「手牌区」等完整区名，避免命中 prompt「一张手牌」） */
const AREA_LABELS = [
	{ match: /^手牌区$/, short: "手牌", key: "h" },
	{ match: /^装备区$/, short: "装备", key: "e" },
	{ match: /^判定区$/, short: "判定", key: "j" },
];

/** 阶段事件：有中文翻译，但不应当作选牌框技能标题（清正 cost / 诫节 useSkill 等会落到这些） */
const PHASE_TITLE_NAMES = new Set([
	"phase",
	"phaseZhunbei",
	"phaseJudge",
	"phaseDraw",
	"phaseUse",
	"phaseDiscard",
	"phaseJieshu",
]);

/** 引擎壳事件：无技能语义，继续向上找 */
const GENERIC_EVENT_NAMES = new Set([
	"useSkill",
	"trigger",
	"arrangeTrigger",
	"chooseToUse",
	"chooseToRespond",
	"chooseButton",
	"chooseButtonTarget",
	"chooseControl",
	"chooseTarget",
	"chooseToMove",
	"chooseToMove_new",
	"chooseCard",
	"chooseCardTarget",
	"chooseBool",
]);

/**
 * 去掉 cost / backup 后缀，便于翻译技能名
 * @param {string} id
 * @returns {string}
 */
function cleanSkillId(id) {
	if (typeof id !== "string" || !id) return "";
	return id.replace(/_cost$/, "").replace(/_backup$/, "");
}

/**
 * 将技能 id 译为中文标题（含子技能 sourceSkill）
 * @param {string} skillId
 * @param {Player} [player]
 * @returns {string}
 */
function translateSkillTitle(skillId, player) {
	const cleaned = cleanSkillId(skillId);
	if (!cleaned || GENERIC_EVENT_NAMES.has(cleaned) || PHASE_TITLE_NAMES.has(cleaned)) return "";
	const source = typeof get.sourceSkillFor === "function" ? get.sourceSkillFor(cleaned) : cleaned;
	const candidates = [
		typeof get.skillTranslation === "function" ? get.skillTranslation(source, player) : null,
		get.translation(source),
		source !== cleaned ? get.translation(cleaned) : null,
	];
	for (const name of candidates) {
		if (typeof name === "string" && CN_NAME_REG.test(name) && name !== cleaned && name !== source) {
			return name;
		}
	}
	return "";
}

/**
 * 从事件链向上解析中文标题（优先 skill，避开阶段名）
 * @param {GameEvent} event
 * @param {string} fallback
 * @returns {string}
 */
function resolveParentTitle(event, fallback) {
	if (!event || typeof event.getParent !== "function") return fallback;
	for (let num = 0; num <= 10; num++) {
		const parent = num === 0 ? event : event.getParent(num);
		if (!parent) break;

		// useSkill / xxx_cost / createTrigger：技能在 .skill
		if (typeof parent.skill === "string" && parent.skill) {
			const fromSkill = translateSkillTitle(parent.skill, parent.player || event.player);
			if (fromSkill) return fromSkill;
		}

		const rawName = parent.name;
		if (typeof rawName !== "string" || !rawName) continue;
		if (PHASE_TITLE_NAMES.has(rawName) || GENERIC_EVENT_NAMES.has(rawName)) continue;

		// 触发技 content 事件名即技能 id；或名称为 xxx_cost
		const fromName = translateSkillTitle(rawName, parent.player || event.player);
		if (fromName) return fromName;

		const translated = get.translation(rawName);
		if (typeof translated === "string" && CN_NAME_REG.test(translated) && translated !== rawName) {
			return translated;
		}
	}
	return fallback;
}

/**
 * 隐藏原 prompt caption，避免与金色标题叠字
 * @param {HTMLElement} dialog
 */
function hidePromptCaptions(dialog) {
	const content = dialog?.content;
	if (!content) return;
	const layout = dialog.dataset.layout;

	// 攻心 / 移牌 / 分花色：只藏技能名 caption，保留「手牌 / 弃置 / 牌堆顶」竖签文案
	if (layout === "move-bins" || layout === "two-pile" || layout === "suit-select") {
		for (const node of content.querySelectorAll(".caption")) {
			if (node.classList.contains("dui-gold-title") || node.closest(".dui-gold-title-wrap")) continue;
			const text = (node.textContent || "").replace(/\s+/g, "");
			if (/弃置|牌堆|手牌/.test(text)) continue;
			if (text && text.length <= 8) {
				node.classList.add("dui-prompt-caption");
				// 整行藏掉，避免只藏 caption 后留下空 item-container 横条
				node.closest(".row-container")?.classList.add("dui-pcd-prompt-row");
			}
		}
		return;
	}

	// 选项列表：只藏纯提示 caption，保留含 .popup.text 的选项行
	if (layout === "choice-list") {
		for (const node of content.querySelectorAll(".caption")) {
			if (node.classList.contains("dui-gold-title") || node.closest(".dui-gold-title-wrap")) continue;
			if (node.querySelector(".popup.text")) continue;
			node.classList.add("dui-prompt-caption");
		}
		return;
	}

	for (const node of content.querySelectorAll(".caption")) {
		if (node.classList.contains("dui-gold-title") || node.closest(".dui-gold-title-wrap")) continue;
		node.classList.add("dui-prompt-caption");
	}
}

/**
 * 注入金色标题栏
 * @param {HTMLElement} dialog
 * @param {string} titleText
 */
function injectGoldTitle(dialog, titleText) {
	if (!dialog || !titleText) return;
	dialog.querySelector(".dui-gold-title-wrap")?.remove();

	const wrap = ui.create.div(".dui-gold-title-wrap", dialog);
	const title = ui.create.div(".dui-gold-title", wrap);
	title.textContent = titleText;
	bindCollapseArrow(dialog, wrap);
}

/**
 * 标题右侧箭头：折叠 / 展开下方选牌框
 * @param {HTMLElement} dialog
 * @param {HTMLElement} wrap
 */
function bindCollapseArrow(dialog, wrap) {
	if (!dialog || !wrap) return;
	wrap.querySelector(".dui-pcd-arrow")?.remove();
	const arrow = ui.create.div(".dui-pcd-arrow", wrap);
	const toggle = evt => {
		evt.stopPropagation();
		evt.preventDefault();
		if (evt.type !== "click") return;
		if (dialog.classList.contains("decade-shousha-vcard")) {
			animateShoushaVcardCollapse(dialog);
			return;
		}
		dialog.classList.toggle("dui-pcd-collapsed");
		lockPlayerCardDialogPlacement(dialog);
		requestAnimationFrame(() => {
			syncPlayerCardDialogConfirmUi();
			requestAnimationFrame(syncPlayerCardDialogConfirmUi);
		});
	};
	arrow.addEventListener("click", toggle);
	arrow.addEventListener("mousedown", evt => evt.stopPropagation());
	arrow.addEventListener("touchstart", evt => evt.stopPropagation(), { passive: true });
}

/** 手杀转化框折叠动画时长（对齐党锢 0.2s linear） */
const SHOUSHA_COLLAPSE_MS = 200;

/**
 * 手杀转化框折叠/展开：高度过渡 + 内容淡出（对齐手杀美化党锢）
 * @param {HTMLElement} dialog
 */
function animateShoushaVcardCollapse(dialog) {
	if (!dialog?.classList?.contains("decade-shousha-vcard") || dialog._duiShoushaCollapsing) return;

	const collapsedH = PCD_FRAME_H_COLLAPSED;
	const isCollapsed = dialog.classList.contains("dui-pcd-collapsed");
	const content = dialog.querySelector(":scope > .content-container");
	const footer = dialog.querySelector(":scope > .dui-shousha-footer");
	dialog._duiShoushaCollapsing = true;

	const clearCollapseInline = () => {
		for (const prop of ["height", "min-height", "max-height", "top", "transition", "overflow"]) {
			dialog.style.removeProperty(prop);
		}
		if (content) {
			content.style.removeProperty("max-height");
			content.style.removeProperty("opacity");
			content.style.removeProperty("transition");
		}
		if (footer) {
			footer.style.removeProperty("max-height");
			footer.style.removeProperty("opacity");
			footer.style.removeProperty("transition");
			footer.style.removeProperty("padding");
		}
	};

	const finish = () => {
		dialog._duiShoushaCollapsing = false;
		dialog.classList.remove("dui-pcd-collapse-anim");
		if (dialog.classList.contains("dui-pcd-collapsed")) {
			dialog.style.setProperty("height", `${collapsedH}px`, "important");
			dialog.style.setProperty("min-height", `${collapsedH}px`, "important");
			dialog.style.setProperty("max-height", `${collapsedH}px`, "important");
			dialog.style.setProperty("top", `calc(50% - ${collapsedH / 2}px)`, "important");
			dialog.style.removeProperty("transition");
			dialog.style.removeProperty("overflow");
		} else {
			clearCollapseInline();
		}
		lockPlayerCardDialogPlacement(dialog);
		syncPlayerCardDialogConfirmUi();
	};

	const runTransition = (fromH, toH, collapsing) => {
		dialog.classList.add("dui-pcd-collapse-anim");
		dialog.style.setProperty("transition", "none");
		dialog.style.setProperty("overflow", "hidden");
		dialog.style.setProperty("height", `${fromH}px`, "important");
		dialog.style.setProperty("min-height", `${fromH}px`, "important");
		dialog.style.setProperty("max-height", `${fromH}px`, "important");
		dialog.style.setProperty("top", `calc(50% - ${fromH / 2}px)`, "important");

		if (content) {
			content.style.transition = "none";
			content.style.maxHeight = collapsing ? `${Math.max(content.scrollHeight, 1)}px` : "0px";
			content.style.opacity = collapsing ? "1" : "0";
		}
		if (footer) {
			footer.style.transition = "none";
			footer.style.maxHeight = collapsing ? `${Math.max(footer.scrollHeight, 1)}px` : "0px";
			footer.style.opacity = collapsing ? "1" : "0";
		}

		void dialog.offsetHeight;

		const ease = `all ${SHOUSHA_COLLAPSE_MS / 1000}s linear`;
		dialog.style.setProperty("transition", ease);
		if (content) content.style.transition = ease;
		if (footer) footer.style.transition = ease;

		requestAnimationFrame(() => {
			dialog.style.setProperty("height", `${toH}px`, "important");
			dialog.style.setProperty("min-height", `${toH}px`, "important");
			dialog.style.setProperty("max-height", `${toH}px`, "important");
			dialog.style.setProperty("top", `calc(50% - ${toH / 2}px)`, "important");
			if (content) {
				content.style.maxHeight = collapsing ? "0px" : `${Math.max(content.scrollHeight, 1)}px`;
				content.style.opacity = collapsing ? "0" : "1";
			}
			if (footer) {
				footer.style.maxHeight = collapsing ? "0px" : `${Math.max(footer.scrollHeight, 1)}px`;
				footer.style.opacity = collapsing ? "0" : "1";
				if (collapsing) footer.style.padding = "0px";
			}
		});

		let done = false;
		const onEnd = ev => {
			if (ev?.target !== dialog && ev?.propertyName && ev.propertyName !== "height") return;
			if (done) return;
			done = true;
			dialog.removeEventListener("transitionend", onEnd);
			finish();
		};
		dialog.addEventListener("transitionend", onEnd);
		setTimeout(onEnd, SHOUSHA_COLLAPSE_MS + 80);
	};

	if (!isCollapsed) {
		const fromH = Math.max(dialog.offsetHeight, collapsedH);
		dialog.classList.add("dui-pcd-collapsed");
		runTransition(fromH, collapsedH, true);
		return;
	}

	// 展开：先测目标高度，再从标题条高度过渡上去（不瞬切）
	dialog.style.setProperty("transition", "none");
	dialog.classList.remove("dui-pcd-collapsed");
	clearCollapseInline();
	void dialog.offsetHeight;
	const toH = Math.max(dialog.offsetHeight, collapsedH + 1);
	runTransition(collapsedH, toH, false);
}

/**
 * 解析区域标题节点文案
 * @param {HTMLElement} node
 * @returns {{ short: string, key: string }|null}
 */
function parseAreaLabel(node) {
	const text = (node?.textContent || "").replace(/\s+/g, "");
	if (!text) return null;
	for (const item of AREA_LABELS) {
		if (item.match.test(text)) return { short: item.short, key: item.key };
	}
	return null;
}

const EQUIP_LABELS = ["武器牌", "防具牌", "+1马", "-1马", "宝物牌"];

/**
 * 宝物栏仅国战默认展示
 * @returns {boolean}
 */
function isGuozhanMode() {
	try {
		return get.mode() === "guozhan";
	} catch (e) {
		return false;
	}
}

/**
 * 装备空槽数量：国战 5（含宝物），其余 4
 * @returns {number}
 */
function getEquipSlotCount() {
	return isGuozhanMode() ? 5 : 4;
}

/**
 * 取卡牌所在区域 h / e / j
 * 优先用本体 caption 分区；对话框按钮的 parentNode 不是玩家牌区，get.position(button) 会失败
 * @param {HTMLElement} button
 * @param {"h"|"e"|"j"|null} [hint]
 * @returns {"h"|"e"|"j"}
 */
function getButtonZone(button, hint) {
	if (hint === "e" || hint === "j" || hint === "h") return hint;
	const card = button?.link || button;
	try {
		const pos = get.position(card);
		if (pos === "e" || pos === "j" || pos === "h") return pos;
	} catch (e) {}
	try {
		const owner = get.owner(card);
		if (owner) {
			if (owner.getCards("j").includes(card)) return "j";
			if (owner.getCards("e").includes(card)) return "e";
		}
	} catch (e) {}
	if (button?.classList?.contains("blank") || button?.classList?.contains("infohidden")) return "h";
	return "h";
}

/**
 * 装备栏位 1-5
 * @param {HTMLElement} button
 * @returns {string}
 */
function getEquipSlotIndex(button) {
	const card = button?.link || button;
	try {
		const subtypes = typeof get.subtypes === "function" ? get.subtypes(card) : [get.subtype(card)];
		for (const sub of subtypes || []) {
			const n = /equip([1-5])/.exec(String(sub || ""))?.[1];
			if (n) return n;
		}
	} catch (e) {}
	return "5";
}

/**
 * 读取 caption / 区域标题文案
 * @param {HTMLElement} node
 * @returns {string}
 */
function getNodeCaptionText(node) {
	if (!node?.textContent) return "";
	const text = node.textContent.replace(/\s+/g, "");
	if (node.classList?.contains("caption")) return text;
	if (node.classList?.contains("text") && node.classList.contains("center")) return text;
	return "";
}

/**
 * chooseButton：按 caption + .buttons 分段收集
 * @param {HTMLElement} dialog
 * @returns {{ label: string, zone: "h"|"e"|"j", buttons: HTMLElement[] }[]}
 */
function collectCaptionGroups(dialog) {
	const groups = [];
	const content = dialog?.content;
	if (!content) return groups;

	let pendingLabel = "";
	for (const node of Array.from(content.childNodes)) {
		if (node.nodeType !== 1) continue;

		const areaLabel = parseAreaLabel(node);
		const captionText = getNodeCaptionText(node);
		if (node.classList?.contains("caption") || areaLabel || (captionText && !node.classList?.contains("buttons"))) {
			if (node.classList?.contains("buttons")) continue;
			pendingLabel = areaLabel ? node.textContent.replace(/\s+/g, "") : captionText || pendingLabel;
			continue;
		}

		if (node.classList?.contains("buttons")) {
			const cards = Array.from(node.querySelectorAll(":scope > .card, :scope > .button.card, :scope > .button"));
			if (!cards.length) continue;
			const label = pendingLabel;
			let zone = "h";
			if (/装备/.test(label)) zone = "e";
			else if (/判定/.test(label)) zone = "j";
			else if (areaLabel) zone = areaLabel.key;
			groups.push({ label, zone, buttons: cards });
			pendingLabel = "";
		}
	}
	return groups;
}

/**
 * 双栏手牌竖签短名
 * @param {string} text
 * @returns {string}
 */
function shortenHandRowLabel(text) {
	const raw = String(text || "").replace(/\s+/g, "");
	if (!raw) return "手牌";
	if (raw === "你的手牌" || raw === "手牌区") return "手牌";
	const m = /^(.+?)的手牌$/.exec(raw);
	if (m) return m[1].slice(-4) || "手牌";
	if (raw.includes("手牌")) return raw.replace(/的手牌|手牌区/g, "").slice(-4) || "手牌";
	return raw.slice(0, 4);
}

/**
 * 按本体「手牌区 / 装备区 / 判定区」caption 收集按钮
 * @param {HTMLElement} dialog
 * @returns {{ h: HTMLElement[], e: HTMLElement[], j: HTMLElement[] }}
 */
function collectButtonsByCaption(dialog) {
	const grouped = { h: [], e: [], j: [] };
	const content = dialog?.content;
	if (!content) return grouped;
	let zone = "h";
	for (const node of Array.from(content.childNodes)) {
		if (node.nodeType !== 1) continue;
		const label = parseAreaLabel(node);
		if (label) {
			zone = label.key;
			continue;
		}
		if (node.classList?.contains("text") && node.classList.contains("center")) {
			const text = (node.textContent || "").replace(/\s+/g, "");
			if (text === "装备区") zone = "e";
			else if (text === "判定区") zone = "j";
			else if (text === "手牌区") zone = "h";
			continue;
		}
		if (!node.classList?.contains("buttons")) continue;
		grouped[zone].push(...Array.from(node.querySelectorAll(":scope > .card, :scope > .button")));
	}
	return grouped;
}

/**
 * 保证标题+区域节点存在
 * @param {HTMLElement} dialog
 * @param {string} key
 * @param {string} titleText
 */
function ensureZone(dialog, key, titleText) {
	let title = dialog.querySelector(`:scope > .${key}Title`);
	let area = dialog.querySelector(`:scope > .${key}Area`);
	if (!title) {
		title = ui.create.div(`.${key}Title`, dialog);
	}
	if (titleText != null && titleText !== "") title.textContent = titleText;
	if (!area) {
		area = ui.create.div(`.${key}Area`, dialog);
	}
	return { title, area };
}

/**
 * 手牌区滚轮横向滚动（对齐武将美化）
 * @param {HTMLElement} hArea
 */
function bindHandAreaWheel(hArea) {
	if (!hArea || hArea._duiPcdWheel) return;
	hArea._duiPcdWheel = true;
	hArea.addEventListener("wheel", evt => {
		evt.preventDefault();
		hArea.scrollLeft += evt.deltaY || evt.detail || 0;
	});
}

/**
 * 纯观看竖签：按 event.str / caption 区分手牌与牌堆
 * @param {GameEvent} [event]
 * @param {HTMLElement} [dialog]
 * @returns {string}
 */
function resolveViewAreaLabel(event, dialog) {
	const str = String(event?.str || "");
	const caption = (dialog?.content?.querySelector?.(".caption")?.textContent || "").replace(/\s+/g, "");
	const text = str || caption;
	if (text.includes("牌堆底")) return "牌堆底";
	if (text.includes("牌堆")) return "牌堆顶";
	if (text.includes("手牌")) return "手牌";
	return "手牌";
}

/**
 * 观看窗只铺一行，不造装备 / 判定空槽
 * @param {HTMLElement} dialog
 * @param {string} titleText
 */
function layoutHandRow(dialog, titleText) {
	const content = dialog?.content;
	if (!content || content.dataset.duiPcdLaidOut === "1") return;

	const h = ensureZone(dialog, "h", titleText);
	h.title.textContent = titleText;

	let handButtons = h.area.querySelector(":scope > .buttons");
	if (!handButtons) handButtons = ui.create.div(".buttons", h.area);

	const placed = new Set();
	const grouped = collectButtonsByCaption(dialog);
	grouped.h.concat(grouped.e, grouped.j).forEach(card => {
		handButtons.appendChild(card);
		placed.add(card);
	});

	const leftover = Array.from(dialog.buttons || []).filter(btn => btn && !placed.has(btn));
	for (const card of leftover) {
		handButtons.appendChild(card);
		placed.add(card);
	}

	if (!handButtons.childElementCount) {
		content.querySelectorAll(".card, .button.card").forEach(card => {
			if (placed.has(card)) return;
			handButtons.appendChild(card);
			placed.add(card);
		});
	}

	bindHandAreaWheel(h.area);
	dialog.dataset.pst = "h";
	dialog.dataset.layout = "hand";
	content.dataset.duiPcdLaidOut = "1";
	fitCardsToSlots(dialog);
}

/**
 * 按牌归属补全魄袭双行分组（caption 分段失败时回退）
 * @param {HTMLElement} dialog
 * @param {{ label: string, zone: string, buttons: HTMLElement[] }[]} groups
 * @param {GameEvent} [event]
 * @returns {{ label: string, zone: string, buttons: HTMLElement[] }[]}
 */
function resolveTwoRowHandGroups(dialog, groups, event) {
	const target = event?.target;
	const allButtons = Array.from(dialog?.buttons || []).filter(Boolean);
	if (!allButtons.length) return groups;

	const byOwner = [[], []];
	for (const btn of allButtons) {
		const owner = get.owner(btn.link);
		if (target && owner === target) byOwner[1].push(btn);
		else byOwner[0].push(btn);
	}

	if (groups.length >= 2) {
		if (!groups[0].buttons.length && byOwner[0].length) groups[0].buttons = byOwner[0];
		if (!groups[1].buttons.length && byOwner[1].length) groups[1].buttons = byOwner[1];
		return groups;
	}

	const cap0 = groups[0]?.label || "你的手牌";
	const cap1 = target ? `${get.translation(target.name)}的手牌` : "手牌";
	return [
		{ label: cap0, zone: "h", buttons: byOwner[0] },
		{ label: cap1, zone: "h", buttons: byOwner[1] },
	];
}

/**
 * 魄袭类：两行手牌（复用 h / e 两行槽位）
 * @param {HTMLElement} dialog
 * @param {{ label: string, buttons: HTMLElement[] }[]} groups
 * @param {GameEvent} [event]
 */
function layoutTwoRowHand(dialog, groups, event) {
	const content = dialog?.content;
	if (!content || content.dataset.duiPcdLaidOut === "1") return;

	groups = resolveTwoRowHandGroups(dialog, groups, event);
	if (!Array.isArray(groups) || groups.length < 2) return;

	const h = ensureZone(dialog, "h", shortenHandRowLabel(groups[0].label));
	const e = ensureZone(dialog, "e", shortenHandRowLabel(groups[1].label));

	let handButtons1 = h.area.querySelector(":scope > .buttons");
	if (!handButtons1) handButtons1 = ui.create.div(".buttons", h.area);
	let handButtons2 = e.area.querySelector(":scope > .buttons");
	if (!handButtons2) handButtons2 = ui.create.div(".buttons", e.area);

	handButtons1.innerHTML = "";
	handButtons2.innerHTML = "";

	groups[0].buttons.forEach(card => handButtons1.appendChild(card));
	groups[1].buttons.forEach(card => handButtons2.appendChild(card));

	bindHandAreaWheel(h.area);
	bindHandAreaWheel(e.area);
	dialog.dataset.pst = "two-row";
	dialog.dataset.layout = "two-row";
	content.dataset.duiPcdLaidOut = "1";
	fitCardsToSlots(dialog);
}

/**
 * 在 dialog.buttons 里找 link 对应按钮
 * @param {HTMLElement} dialog
 * @param {Card|object} card
 * @returns {HTMLElement|null}
 */
function findDialogButton(dialog, card) {
	if (!card) return null;
	return (
		(dialog.buttons || []).find(btn => {
			if (!btn?.link) return false;
			if (btn.link === card) return true;
			if (btn.link?.cards?.length && card?.cards?.length && btn.link.cards[0] === card.cards[0]) return true;
			if (btn.link?.name && card?.name && btn.link.name === card.name && btn.link === card) return true;
			return false;
		}) || null
	);
}

/**
 * 往装备槽放牌（可选中按钮或只读展示）
 * @param {HTMLElement} equipPart
 * @param {HTMLElement|null} buttonEl
 * @param {Card|object} card
 * @param {number} equipSlotCount
 */
function placeEquipInEjRow(equipPart, buttonEl, card, equipSlotCount) {
	const n = getEquipSlotIndex(buttonEl || card);
	let slot = equipPart.querySelector(`[data-equip-slot="${n}"]`);
	if (!slot && n === "5") {
		slot = createEjSlot(equipPart, "e", EQUIP_LABELS[4] || "宝物牌", "equipSlot", "5");
	}
	if (!slot) slot = equipPart.querySelector(`[data-equip-slot="${equipSlotCount}"]`);
	if (!slot) return;
	let box = slot.querySelector(":scope > .buttons");
	if (!box) box = ui.create.div(".buttons", slot);
	if (box.childElementCount) return;
	if (buttonEl) box.appendChild(buttonEl);
	else if (card) {
		const preset = ui.create.buttons([card], get.itemtype(card) === "cards" ? "card" : "vcard", box);
		preset?.forEach(el => el.classList.add("dui-pcd-readonly"));
	}
	if (box.childElementCount) {
		slot.classList.add("dui-pcd-filled");
		slot.querySelector(".eAreaCard-label, .jAreaCard-label")?.remove();
	}
}

/**
 * 往判定槽放牌
 * @param {HTMLElement} judgePart
 * @param {HTMLElement|null} buttonEl
 * @param {Card|object} card
 * @param {number} slotIndex
 */
function placeJudgeInEjRow(judgePart, buttonEl, card, slotIndex) {
	const slot = judgePart.querySelector(`[data-judge-slot="${Math.min(slotIndex, 2)}"]`);
	if (!slot) return;
	let box = slot.querySelector(":scope > .buttons");
	if (!box) box = ui.create.div(".buttons", slot);
	if (box.childElementCount) return;
	if (buttonEl) box.appendChild(buttonEl);
	else if (card) {
		const preset = ui.create.buttons([card], get.itemtype(card) === "cards" ? "card" : "vcard", box);
		preset?.forEach(el => el.classList.add("dui-pcd-readonly"));
	}
	if (box.childElementCount) {
		slot.classList.add("dui-pcd-filled");
		slot.querySelector(".eAreaCard-label, .jAreaCard-label")?.remove();
	}
}

/**
 * 创建带标签的空槽（标签与牌分层，避免 cardbg 挡牌）
 * @param {HTMLElement} parent
 * @param {"e"|"j"} type
 * @param {string} labelHtml
 * @param {string} slotKey
 * @param {string} slotVal
 * @returns {HTMLElement}
 */
function createEjSlot(parent, type, labelHtml, slotKey, slotVal) {
	const slot = ui.create.div(type === "e" ? ".eAreaCard" : ".jAreaCard", parent);
	slot.dataset[slotKey] = slotVal;
	const label = ui.create.div(type === "e" ? ".eAreaCard-label" : ".jAreaCard-label", slot);
	if (labelHtml.includes("<")) label.innerHTML = labelHtml;
	else label.textContent = labelHtml;
	ui.create.div(".buttons", slot);
	return slot;
}

/**
 * 构建单行 e+j（空槽显示槽位名，有牌时隐藏文字）
 * @param {HTMLElement} rowArea
 * @param {Player} player
 * @param {number} equipSlotCount
 * @param {HTMLElement} dialog
 * @param {boolean} interactive 是否允许选中 dialog.buttons
 */
function buildEjRowArea(rowArea, player, equipSlotCount, dialog, interactive) {
	rowArea.innerHTML = "";
	rowArea.classList.add("dui-pcd-ej-row");

	const equipPart = ui.create.div(".dui-pcd-ej-equip", rowArea);
	const judgePart = ui.create.div(".dui-pcd-ej-judge", rowArea);

	for (let x = 1; x <= equipSlotCount; x++) {
		createEjSlot(equipPart, "e", EQUIP_LABELS[x - 1], "equipSlot", String(x));
	}
	for (let x = 0; x < 3; x++) {
		createEjSlot(judgePart, "j", "单张牌<br>延时锦囊", "judgeSlot", String(x));
	}

	const placed = new Set();

	if (interactive) {
		const grouped = collectButtonsByCaption(dialog);
		grouped.e.forEach(btn => {
			placed.add(btn);
			placeEquipInEjRow(equipPart, btn, null, equipSlotCount);
		});
		grouped.j.forEach((btn, idx) => {
			placed.add(btn);
			placeJudgeInEjRow(judgePart, btn, null, idx);
		});
		for (const btn of dialog.buttons || []) {
			if (placed.has(btn)) continue;
			const zone = getButtonZone(btn);
			if (zone === "e") placeEquipInEjRow(equipPart, btn, null, equipSlotCount);
			else if (zone === "j") {
				const idx = judgePart.querySelectorAll(".jAreaCard.dui-pcd-filled").length;
				placeJudgeInEjRow(judgePart, btn, null, idx);
			}
		}
		player.getCards("e").forEach(card => {
			if (findDialogButton(dialog, card)) return;
			placeEquipInEjRow(equipPart, null, card, equipSlotCount);
		});
		player.getCards("j").forEach((card, idx) => {
			if (findDialogButton(dialog, card)) return;
			placeJudgeInEjRow(judgePart, null, card, idx);
		});
	} else {
		player.getCards("e").forEach(card => placeEquipInEjRow(equipPart, null, card, equipSlotCount));
		player.getCards("j").forEach((card, idx) => placeJudgeInEjRow(judgePart, null, card, idx));
	}
}

/**
 * 让节 moveCard：双行角色名 + 各行 e/j 分区
 * @param {HTMLElement} dialog
 * @param {GameEvent} event
 */
function layoutTwoRowEjMoveCard(dialog, event) {
	const content = dialog?.content;
	if (!content || content.dataset.duiPcdLaidOut === "1") return;

	const source = event?.targets0;
	const dest = event?.targets1;
	if (!source || !dest) {
		layoutEjRows(dialog);
		return;
	}

	const equipSlotCount = getEquipSlotCount();
	dialog.dataset.equipSlots = String(equipSlotCount);

	const sourceName = get.translation(source) || get.translation(source.name) || "源角色";
	const destName = get.translation(dest) || get.translation(dest.name) || "目标";
	const h = ensureZone(dialog, "h", sourceName);
	const e = ensureZone(dialog, "e", destName);

	buildEjRowArea(h.area, source, equipSlotCount, dialog, true);
	buildEjRowArea(e.area, dest, equipSlotCount, dialog, false);

	bindHandAreaWheel(h.area);
	bindHandAreaWheel(e.area);

	dialog.querySelector(".jTitle")?.remove();
	dialog.querySelector(".jArea")?.remove();

	dialog.dataset.pst = "two-ej-row";
	dialog.dataset.layout = "two-ej-row";
	content.dataset.duiPcdLaidOut = "1";
	applyStandardWhiteCards(dialog);
	fitCardsToSlots(dialog);
}

/**
 * 攻心竖签短名（「手杀董承的手牌」→「手杀董承」）
 * @param {string} text
 * @returns {string}
 */
function shortenMoveBinLabel(text) {
	const raw = String(text || "").replace(/\s+/g, "");
	if (!raw) return "";
	if (raw.includes("弃置")) return "弃置";
	if (raw.includes("牌堆顶") || raw.includes("置于牌堆")) return "牌堆顶";
	if (raw.includes("牌堆底")) return "牌堆底";
	const handName = /^(.+?)的手牌/.exec(raw);
	if (handName) return handName[1] || "手牌";
	if (raw.includes("手牌")) return raw.replace(/的手牌.*$/, "").replace(/手牌区?/, "") || "手牌";
	return raw.length > 4 ? raw.slice(0, 4) : raw;
}

/**
 * 是否为仅提示文案的空槽（无牌）
 * @param {HTMLElement} box
 * @returns {boolean}
 */
function isPromptOnlyItemBox(box) {
	if (!box) return false;
	if (box.querySelector(".card, .button.card")) return false;
	const caption = box.querySelector(".caption");
	const text = (caption?.textContent || box.textContent || "").replace(/\s+/g, "");
	if (!text || text.length > 8) return false;
	return !/弃置|牌堆|手牌/.test(text);
}

/**
 * 强制藏掉技能名 prompt 行（如「攻心」），不依赖 caption 结构
 * @param {HTMLElement} dialog
 */
function purgeMoveBinsPromptRows(dialog) {
	const content = dialog?.content;
	if (!content) return;
	const title = (dialog.querySelector?.(".dui-gold-title")?.textContent || "").replace(/\s+/g, "");

	for (const row of Array.from(content.querySelectorAll(".row-container"))) {
		if (row.querySelector(".card, .button.card")) continue;
		const text = (row.textContent || "").replace(/\s+/g, "");
		if (!text) continue;
		// 保留弃置 / 牌堆顶行（无牌时也要显示空槽）
		if (/弃置|牌堆|手牌/.test(text)) continue;
		const isTitleRow = title && (text === title || text.includes(title));
		const isShortPrompt = text.length <= 8;
		if (!isTitleRow && !isShortPrompt) continue;
		row.classList.add("dui-pcd-prompt-row");
		row.style.setProperty("display", "none", "important");
		row.style.setProperty("height", "0", "important");
		row.style.setProperty("min-height", "0", "important");
		row.style.setProperty("margin", "0", "important");
		row.style.setProperty("padding", "0", "important");
		row.style.setProperty("overflow", "hidden", "important");
		row.style.setProperty("flex", "0 0 0", "important");
	}
}

/**
 * 确保卡牌有 .card-mask
 * @param {HTMLElement} card
 */
function ensureCardMask(card) {
	if (!card?.querySelector) return;
	if (card.querySelector(".card-mask")) return;
	ui.create.div(".card-mask", card);
}

/**
 * 按 event.filterMove 给不可移的牌加灰遮罩（攻心非红桃等）
 * @param {HTMLElement} dialog
 * @param {GameEvent} [event]
 */
function applyMoveBinsSelectableMask(dialog, event) {
	const ev = event || _status.event;
	const filterMove = ev?.filterMove;
	const cards = Array.from(dialog?.querySelectorAll?.(".dui-pcd-bin-area .card, .dui-pcd-bin-slot .card") || []);
	if (!cards.length) return;

	const movedState = Array.isArray(ev?.moved) ? ev.moved : [[], [], []];

	for (const card of cards) {
		ensureCardMask(card);
		const parent = card.closest(".dui-pcd-bin-area, .dui-pcd-bin-slot");
		const inOpSlot = parent?.classList?.contains("dui-pcd-bin-slot");
		// 已在弃置/牌堆顶的牌不遮罩
		if (inOpSlot) {
			card.classList.remove("dui-pcd-masked");
			continue;
		}
		let allowed = true;
		if (typeof filterMove === "function") {
			try {
				allowed = !!(filterMove(card, 1, movedState) || filterMove(card, 2, movedState));
			} catch (e) {
				allowed = true;
			}
		}
		if (allowed) card.classList.remove("dui-pcd-masked");
		else card.classList.add("dui-pcd-masked");
	}
}

/**
 * 攻心 move-bins：竖签 + area 底图，保留 addNewRow 点选移动
 * @param {HTMLElement} dialog
 */
function layoutMoveBins(dialog) {
	const content = dialog?.content;
	if (!content) return;
	if (content.dataset.duiPcdLaidOut === "1") {
		purgeMoveBinsPromptRows(dialog);
		bindMoveBinsDrag(dialog);
		applyMoveBinsSelectableMask(dialog);
		return;
	}

	let rows = Array.from(content.querySelectorAll(".row-container"));
	if (!rows.length) {
		requestAnimationFrame(() => {
			if (content.dataset.duiPcdLaidOut === "1") return;
			layoutMoveBins(dialog);
		});
		return;
	}

	purgeMoveBinsPromptRows(dialog);

	for (const row of rows) {
		if (row.classList.contains("dui-pcd-prompt-row")) continue;

		const children = Array.from(row.children).filter(el => el.classList?.contains("item-container"));
		if (children.length === 1 && isPromptOnlyItemBox(children[0])) {
			row.classList.add("dui-pcd-prompt-row");
			row.style.setProperty("display", "none", "important");
			continue;
		}

		row.classList.add("dui-pcd-bin-row");
		row.style.removeProperty("grid-template-columns");

		const rowText = (row.textContent || "").replace(/\s+/g, "");
		const isOpsRow = /弃置|牌堆/.test(rowText) && children.length >= 4;
		if (isOpsRow) row.classList.add("dui-pcd-ops-row");

		for (const box of children) {
			const caption =
				Array.from(box.children).find(el => el.classList?.contains("caption")) || box.querySelector(".caption");
			const hasCards = !!box.querySelector(".card, .button.card");
			if (caption && !hasCards) {
				box.classList.add("dui-pcd-bin-label");
				box.classList.remove("dui-pcd-bin-area", "dui-pcd-bin-slot");
				caption.classList.add("dui-pcd-bin-caption");
				caption.classList.remove("dui-prompt-caption");
				const short = shortenMoveBinLabel(caption.textContent);
				if (short) caption.textContent = short;
				continue;
			}
			box.classList.add("dui-pcd-bin-area");
			const labelText = (caption?.textContent || "").replace(/\s+/g, "");
			// 弃置 / 牌堆顶：单牌槽；或操作行里的空 popup
			const prev = box.previousElementSibling;
			const prevLabel = (prev?.textContent || "").replace(/\s+/g, "");
			if (isOpsRow || /弃置|牌堆/.test(prevLabel) || /弃置|牌堆/.test(labelText)) {
				box.classList.add("dui-pcd-bin-slot");
			}
		}
	}

	content.dataset.duiPcdLaidOut = "1";
	observeMoveBinsWhiteCards(dialog);
	bindMoveBinsDrag(dialog);
	applyMoveBinsSelectableMask(dialog);
	requestAnimationFrame(() => {
		purgeMoveBinsPromptRows(dialog);
		applyMoveBinsSelectableMask(dialog);
	});
}

/**
 * 攻心 moved 刷新（对齐 chooseToMove_new.updateButtons）
 * @param {GameEvent} event
 */
function refreshMoveBinsMoved(event) {
	if (!event?.dialog?.itemContainers || !Array.isArray(event.list)) return;
	const zoneCount = event.list.slice().reduce((sum, currentList) => {
		let rows = currentList;
		if (!Array.isArray(rows?.[0])) rows = [rows];
		return sum + rows.length;
	}, 0);
	event.moved = Array.from({ length: zoneCount }).map((_, i) => {
		const num = 2 * (i + 1);
		const box = event.dialog.itemContainers[num];
		return Array.from(box?.children || [])
			.filter(el => el.classList?.contains("card") || el.classList?.contains("button"))
			.map(el => el.link);
	});
	if (typeof event.filterOk === "function" && event.filterOk(event.moved)) {
		ui.create.confirm("o");
	} else if (!event.forced) {
		ui.create.confirm("c");
	} else {
		ui.confirm?.close();
	}
	syncPlayerCardDialogConfirmUi();
}

/**
 * 攻心牌区：观星同款拖拽（保留点选；拖过阈值后走 $elementGoto / $swapElement）
 * @param {HTMLElement} dialog
 */
function bindMoveBinsDrag(dialog) {
	if (!dialog || dialog._duiPcdBinDrag) return;
	dialog._duiPcdBinDrag = true;

	const DRAG_THRESHOLD = 10;
	const animationDuration = lib.config.animation_choose_to_move ? 300 : 0;
	let state = null;

	const getPoint = e => {
		if (window.TouchEvent && e instanceof TouchEvent) {
			const t = e.touches[0] || e.changedTouches[0];
			if (!t) return null;
			return { x: t.clientX / game.documentZoom, y: t.clientY / game.documentZoom, rawX: t.clientX, rawY: t.clientY };
		}
		if (e instanceof MouseEvent && e.which !== 1 && e.type !== "mouseup" && e.type !== "mousemove") return null;
		return { x: e.clientX / game.documentZoom, y: e.clientY / game.documentZoom, rawX: e.clientX, rawY: e.clientY };
	};

	const clearGhost = card => {
		const copy = card?.copy;
		if (copy?.parentNode) copy.parentNode.removeChild(copy);
	};

	const endDrag = () => {
		if (!state) return;
		const { card, dragging } = state;
		document.removeEventListener("mousemove", onMove, true);
		document.removeEventListener("mouseup", onUp, true);
		document.removeEventListener("touchmove", onMove, true);
		document.removeEventListener("touchend", onUp, true);
		document.removeEventListener("touchcancel", onUp, true);
		card?.classList.remove("dui-pcd-dragging");
		clearGhost(card);
		state = null;
		if (dragging) {
			// 吞掉拖拽结束触发的 click，避免再走点选
			const swallow = evt => {
				evt.stopPropagation();
				evt.preventDefault();
				dialog.removeEventListener("click", swallow, true);
			};
			dialog.addEventListener("click", swallow, true);
			setTimeout(() => dialog.removeEventListener("click", swallow, true), 0);
		}
	};

	const findDropTarget = (clientX, clientY, sourceCard) => {
		const el = document.elementFromPoint(clientX, clientY);
		if (!el || !dialog.contains(el)) return null;
		const hitCard = el.closest?.(".card, .button.card");
		if (hitCard && dialog.contains(hitCard) && hitCard !== sourceCard) {
			const box = hitCard.closest(".dui-pcd-bin-area, .dui-pcd-bin-slot, .item-container");
			if (box) return { type: "card", card: hitCard, box };
		}
		const box = el.closest?.(".dui-pcd-bin-area, .dui-pcd-bin-slot, .item-container.popup");
		if (box && dialog.contains(box)) return { type: "box", box };
		return null;
	};

	const zoneIndexOf = box => {
		const event = _status.event;
		const list = event?.dialog?.itemContainers;
		if (!list) return -1;
		const idx = Array.from(list).indexOf(box);
		if (idx < 0) return -1;
		return idx / 2 - 1;
	};

	const tryDrop = (sourceCard, drop, event) => {
		if (!drop || event.dialog?.isBusy) return false;
		const filterMove = event.filterMove;
		const moved = event.moved || [[], [], []];
		if (drop.type === "card") {
			if (typeof filterMove === "function" && !filterMove(sourceCard, drop.card, moved)) return false;
			event.dialog.isBusy = true;
			game.$swapElement(drop.card, sourceCard, animationDuration).then(() => {
				event.dialog.isBusy = false;
				refreshMoveBinsMoved(event);
				applyMoveBinsSelectableMask(dialog, event);
			});
			return true;
		}
		if (drop.box.contains(sourceCard)) return false;
		const index = zoneIndexOf(drop.box);
		if (index < 0) return false;
		if (typeof filterMove === "function" && !filterMove(sourceCard, index, moved)) return false;
		event.dialog.isBusy = true;
		game.$elementGoto(sourceCard, drop.box, undefined, animationDuration).then(() => {
			event.dialog.isBusy = false;
			refreshMoveBinsMoved(event);
			applyMoveBinsSelectableMask(dialog, event);
		});
		return true;
	};

	const onMove = e => {
		if (!state) return;
		const pt = getPoint(e);
		if (!pt) return;
		const dx = pt.x - state.startX;
		const dy = pt.y - state.startY;
		if (!state.dragging) {
			if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
			state.dragging = true;
			const card = state.card;
			card.classList.add("dui-pcd-dragging");
			if (dialog.selectedCard) {
				dialog.selectedCard.classList.remove("selected");
				dialog.selectedCard = null;
			}
			if (!card.copy) {
				card.copy = card.cloneNode(true);
				card.copy.style.opacity = "0.75";
				card.copy.style.pointerEvents = "none";
			}
			const copy = card.copy;
			copy.style.position = "absolute";
			copy.style.transition = "none";
			copy.style.zIndex = "1000";
			copy.style.margin = "0";
			copy.style.boxShadow = "0px 0px 7px 2px rgba(233, 30, 77, 0.95)";
			if (!ui.window.contains(copy)) ui.window.appendChild(copy);
			e.preventDefault();
		}
		const copy = state.card.copy;
		if (!copy) return;
		copy.style.left = `${pt.x + state.offsetX}px`;
		copy.style.top = `${pt.y + state.offsetY}px`;
		e.preventDefault();
	};

	const onUp = e => {
		if (!state) return;
		const { card, dragging } = state;
		const pt = getPoint(e);
		const event = _status.event;
		const wasDragging = dragging;
		endDrag();
		if (!wasDragging || !pt || !event?.dialog) return;
		const drop = findDropTarget(pt.rawX, pt.rawY, card);
		tryDrop(card, drop, event);
	};

	const onDown = e => {
		const event = _status.event;
		if (!event?.dialog || event.dialog !== dialog || dialog.isBusy) return;
		if (e instanceof MouseEvent && e.which !== 1) return;
		if (window.TouchEvent && e instanceof TouchEvent && e.touches.length !== 1) return;
		const card = e.target?.closest?.(".card, .button.card");
		if (!card || !dialog.contains(card)) return;
		if (card.classList.contains("dui-pcd-masked")) return;
		const box = card.closest(".dui-pcd-bin-area, .dui-pcd-bin-slot, .item-container");
		if (!box) return;
		const pt = getPoint(e);
		if (!pt) return;
		const rect = card.getBoundingClientRect();
		state = {
			card,
			startX: pt.x,
			startY: pt.y,
			offsetX: rect.x / game.documentZoom - pt.x,
			offsetY: rect.y / game.documentZoom - pt.y,
			dragging: false,
		};
		document.addEventListener("mousemove", onMove, true);
		document.addEventListener("mouseup", onUp, true);
		document.addEventListener("touchmove", onMove, { capture: true, passive: false });
		document.addEventListener("touchend", onUp, true);
		document.addEventListener("touchcancel", onUp, true);
	};

	dialog.addEventListener("mousedown", onDown, true);
	dialog.addEventListener("touchstart", onDown, { capture: true, passive: true });
}

/**
 * 攻心点选挪牌后补套白卡 + 刷新可选遮罩
 * @param {HTMLElement} dialog
 */
function observeMoveBinsWhiteCards(dialog) {
	if (!dialog || dialog._duiPcdBinObs) return;
	dialog._duiPcdBinObs = true;
	const apply = () => {
		try {
			applyStandardWhiteCards(dialog);
			fitCardsToSlots(dialog);
			applyMoveBinsSelectableMask(dialog);
		} catch (e) {}
	};
	apply();
	const root = dialog.content || dialog;
	const obs = new MutationObserver(() => {
		clearTimeout(dialog._duiPcdBinTimer);
		dialog._duiPcdBinTimer = setTimeout(apply, 30);
	});
	obs.observe(root, { childList: true, subtree: true });
	dialog._duiPcdBinObserver = obs;
}

/**
 * 观星堆标签短名
 * @param {string} text
 * @returns {string}
 */
function shortenPileLabel(text) {
	const raw = String(text || "").replace(/\s+/g, "");
	if (raw.includes("牌堆底")) return "牌堆底";
	if (raw.includes("牌堆顶")) return "牌堆顶";
	if (raw.includes("弃置")) return "弃置";
	return raw.slice(0, 4) || "牌堆";
}

/**
 * 收集 chooseToMove 观星各堆（label + .guanxing 容器）
 * @param {HTMLElement} dialog
 * @param {GameEvent} [event]
 * @returns {{ label: string, strip: HTMLElement }[]}
 */
function collectGuanxingPiles(dialog, event) {
	const piles = [];
	const content = dialog?.content;
	if (!content) return piles;

	let pendingLabel = "";
	for (const node of Array.from(content.childNodes)) {
		if (node.nodeType !== 1) continue;
		if (node.classList?.contains("select-all")) continue;
		if (node.classList?.contains("choosetomove") && node.classList.contains("text")) {
			const text = (node.textContent || "").replace(/\s+/g, "");
			if (text && !/点击|拖动|交换|移动卡牌/.test(text)) pendingLabel = text;
			node.classList.add("dui-prompt-caption");
			continue;
		}
		if (node.classList?.contains("guanxing") && node.classList.contains("buttons")) {
			piles.push({ label: pendingLabel || (piles.length === 0 ? "牌堆顶" : "牌堆底"), strip: node });
			pendingLabel = "";
		}
	}

	if (piles.length >= 2) return piles;

	const strips = Array.from(content.querySelectorAll(".buttons.popup.guanxing"));
	const list = event?.list;
	if (strips.length >= 2 && Array.isArray(list)) {
		return strips.map((strip, i) => ({
			label: String(list[i]?.[0] || (i === 0 ? "牌堆顶" : "牌堆底")),
			strip,
		}));
	}
	return piles;
}

/**
 * 观星：双行竖签 + cardbg 槽位底 + 上层 guanxing 拖拽条
 * @param {HTMLElement} dialog
 * @param {GameEvent} [event]
 */
function layoutGuanxingPiles(dialog, event) {
	const content = dialog?.content;
	if (!content || content.dataset.duiPcdLaidOut === "1") return;

	const piles = collectGuanxingPiles(dialog, event);
	if (piles.length < 2) return;

	const h = ensureZone(dialog, "h", shortenPileLabel(piles[0].label));
	const e = ensureZone(dialog, "e", shortenPileLabel(piles[1].label));

	h.area.innerHTML = "";
	e.area.innerHTML = "";

	const totalSlots = piles.reduce((sum, pile) => {
		return sum + Array.from(pile.strip?.children || []).filter(el => el.classList?.contains("card")).length;
	}, 0);

	for (const [idx, pile] of piles.entries()) {
		const area = idx === 0 ? h.area : e.area;
		const slots = ui.create.div(".dui-pcd-gx-slots", area);
		const count = Math.max(totalSlots, 1);
		for (let i = 0; i < count; i++) {
			ui.create.div(".dui-pcd-gx-slot", slots);
		}
		pile.strip.classList.add("dui-pcd-guanxing-strip");
		area.appendChild(pile.strip);
	}

	dialog.dataset.gxSlots = String(Math.max(totalSlots, 1));
	dialog.style.setProperty("--dui-pcd-gx-slots", String(Math.max(totalSlots, 1)));
	bindHandAreaWheel(h.area);
	bindHandAreaWheel(e.area);
	dialog.dataset.pst = "guanxing";
	dialog.dataset.layout = "guanxing";
	content.dataset.duiPcdLaidOut = "1";
	fitCardsToSlots(dialog);
}

/**
 * 让节等：仅装备 + 判定，不显示手牌行
 * @param {HTMLElement} dialog
 */
function layoutEjRows(dialog) {
	const content = dialog?.content;
	if (!content || content.dataset.duiPcdLaidOut === "1") return;

	const e = ensureZone(dialog, "e", "装备牌");
	const j = ensureZone(dialog, "j", "延时锦囊牌");

	const equipSlotCount = getEquipSlotCount();
	dialog.dataset.equipSlots = String(equipSlotCount);
	for (let x = equipSlotCount + 1; x <= 5; x++) {
		e.area.querySelector(`[data-equip-slot="${x}"]`)?.remove();
	}
	for (let x = 1; x <= equipSlotCount; x++) {
		if (!e.area.querySelector(`[data-equip-slot="${x}"]`)) {
			const slot = ui.create.div(".eAreaCard", e.area);
			slot.dataset.equipSlot = String(x);
			slot.textContent = EQUIP_LABELS[x - 1];
		}
	}
	for (let x = 0; x < 3; x++) {
		if (!j.area.querySelector(`[data-judge-slot="${x}"]`)) {
			const slot = ui.create.div(".jAreaCard", j.area);
			slot.dataset.judgeSlot = String(x);
			slot.innerHTML = "单张牌<br>延时锦囊";
		}
	}

	const grouped = collectButtonsByCaption(dialog);
	const placed = new Set();
	const judgeCards = [];

	const placeEquip = card => {
		const n = getEquipSlotIndex(card);
		let slot = e.area.querySelector(`[data-equip-slot="${n}"]`);
		if (!slot && n === "5") {
			slot = ui.create.div(".eAreaCard", e.area);
			slot.dataset.equipSlot = "5";
			slot.textContent = EQUIP_LABELS[4];
		}
		if (!slot) slot = e.area.querySelector(`[data-equip-slot="${equipSlotCount}"]`);
		if (!slot) return;
		let box = slot.querySelector(":scope > .buttons");
		if (!box) box = ui.create.div(".buttons", slot);
		box.appendChild(card);
		placed.add(card);
	};

	grouped.e.forEach(placeEquip);
	grouped.j.forEach(card => {
		judgeCards.push(card);
		placed.add(card);
	});

	const leftover = Array.from(dialog.buttons || []).filter(btn => btn && !placed.has(btn));
	for (const card of leftover) {
		const zone = getButtonZone(card);
		if (zone === "e") placeEquip(card);
		else if (zone === "j") judgeCards.push(card);
	}

	judgeCards.forEach((card, idx) => {
		const slot = j.area.querySelector(`[data-judge-slot="${Math.min(idx, 2)}"]`);
		if (!slot) return;
		let box = slot.querySelector(":scope > .buttons");
		if (!box) box = ui.create.div(".buttons", slot);
		box.appendChild(card);
	});

	dialog.dataset.pst = "ej";
	dialog.dataset.layout = "ej";
	content.dataset.duiPcdLaidOut = "1";
	fitCardsToSlots(dialog);
}

/**
 * 始终生成手牌 / 装备 / 延时锦囊三区（无牌也保留空槽）
 * @param {HTMLElement} dialog
 * @param {"hej"|"hand"} [layout]
 * @param {GameEvent} [event]
 */
function layoutAreaRows(dialog, layout = "hej", event) {
	const content = dialog?.content;
	if (!content || content.dataset.duiPcdLaidOut === "1") return;

	if (layout === "hand") {
		layoutHandRow(dialog, resolveViewAreaLabel(event, dialog));
		return;
	}

	const h = ensureZone(dialog, "h", "手牌");
	const e = ensureZone(dialog, "e", "装备牌");
	const j = ensureZone(dialog, "j", "延时锦囊牌");

	let handButtons = h.area.querySelector(":scope > .buttons");
	if (!handButtons) handButtons = ui.create.div(".buttons", h.area);

	const equipSlotCount = getEquipSlotCount();
	dialog.dataset.equipSlots = String(equipSlotCount);
	for (let x = equipSlotCount + 1; x <= 5; x++) {
		e.area.querySelector(`[data-equip-slot="${x}"]`)?.remove();
	}
	for (let x = 1; x <= equipSlotCount; x++) {
		if (!e.area.querySelector(`[data-equip-slot="${x}"]`)) {
			const slot = ui.create.div(".eAreaCard", e.area);
			slot.dataset.equipSlot = String(x);
			slot.textContent = EQUIP_LABELS[x - 1];
		}
	}
	for (let x = 0; x < 3; x++) {
		if (!j.area.querySelector(`[data-judge-slot="${x}"]`)) {
			const slot = ui.create.div(".jAreaCard", j.area);
			slot.dataset.judgeSlot = String(x);
			slot.innerHTML = "单张牌<br>延时锦囊";
		}
	}

	const grouped = collectButtonsByCaption(dialog);
	const placed = new Set();
	const judgeCards = [];

	const placeEquip = card => {
		const n = getEquipSlotIndex(card);
		let slot = e.area.querySelector(`[data-equip-slot="${n}"]`);
		if (!slot && n === "5") {
			slot = ui.create.div(".eAreaCard", e.area);
			slot.dataset.equipSlot = "5";
			slot.textContent = EQUIP_LABELS[4];
		}
		if (!slot) slot = e.area.querySelector(`[data-equip-slot="${equipSlotCount}"]`);
		if (!slot) return;
		let box = slot.querySelector(":scope > .buttons");
		if (!box) box = ui.create.div(".buttons", slot);
		box.appendChild(card);
		placed.add(card);
	};

	grouped.e.forEach(placeEquip);
	grouped.j.forEach(card => {
		judgeCards.push(card);
		placed.add(card);
	});
	grouped.h.forEach(card => {
		handButtons.appendChild(card);
		placed.add(card);
	});

	const leftover = Array.from(dialog.buttons || []).filter(btn => btn && !placed.has(btn));
	for (const card of leftover) {
		const zone = getButtonZone(card);
		if (zone === "e") placeEquip(card);
		else if (zone === "j") judgeCards.push(card);
		else handButtons.appendChild(card);
	}

	judgeCards.forEach((card, idx) => {
		const slot = j.area.querySelector(`[data-judge-slot="${Math.min(idx, 2)}"]`);
		if (!slot) return;
		let box = slot.querySelector(":scope > .buttons");
		if (!box) box = ui.create.div(".buttons", slot);
		box.appendChild(card);
	});

	bindHandAreaWheel(h.area);
	dialog.dataset.pst = "hej";
	dialog.dataset.layout = "hej";
	content.dataset.duiPcdLaidOut = "1";
	fitCardsToSlots(dialog);
}

/**
 * 清掉本体写死的 108×150，让牌跟槽位走 CSS 等比
 * @param {HTMLElement} dialog
 */
function fitCardsToSlots(dialog) {
	if (!dialog) return;
	dialog.querySelectorAll(
		".hArea .card, .eArea > .buttons .card, .dui-pcd-ej-row .card, .dui-pcd-ej-row .button, .dui-pcd-guanxing-strip .card, .eAreaCard .card, .jAreaCard .card, .dui-pcd-bin-area .card, .item-container .card"
	).forEach(card => {
		card.style.removeProperty("width");
		card.style.removeProperty("height");
		card.style.removeProperty("zoom");
	});
}

/**
 * 固定顺拆框尺寸，避免 uiUpdate 按内容压成小条
 * @param {HTMLElement} dialog
 */
function applyDialogFrameSize(dialog) {
	if (!dialog) return;
	dialog.classList.add("noupdate");
	dialog.classList.remove("fullheight", "fullwidth", "scroll1", "scroll2");
	dialog.style.width = "";
	dialog.style.height = "";
	dialog.style.left = "";
	dialog.style.right = "";
	dialog.style.top = "";
	dialog.style.bottom = "";
	dialog.style.transform = "";
	// ui.update 可能回写尺寸类，下一帧再清一次
	requestAnimationFrame(() => {
		dialog.classList.add("noupdate");
		dialog.classList.remove("fullheight", "fullwidth", "scroll1", "scroll2");
	});
}

/**
 * 框内 .buttons 加 smallzoom，避免被 layout zooms.card 缩小
 * @param {HTMLElement} dialog
 */
function markButtonsFixedSize(dialog) {
	if (!dialog) return;
	dialog.querySelectorAll(".buttons").forEach(el => {
		el.classList.add("smallzoom");
	});
}

/**
 * 是否为背面/隐藏牌（不套白卡正面）
 * @param {HTMLElement} card
 * @returns {boolean}
 */
function isHiddenOrBlankCard(card) {
	if (!card?.classList) return true;
	if (card.classList.contains("infohidden")) return true;
	if (card.classList.contains("blank")) return true;
	const name = card.name || card.link?.name || card.link?.cardid;
	if (!name) return true;
	return false;
}

/**
 * 框内正面牌强制标准白卡（分层 card1）
 * @param {HTMLElement} dialog
 */
function applyStandardWhiteCards(dialog) {
	if (!dialog) return;
	const fromButtons = Array.from(dialog.buttons || []);
	const fromDom = Array.from(
		dialog.querySelectorAll?.(".card, .button.card, .item.card, .item-container .card") || []
	);
	const seen = new Set();
	for (const card of fromButtons.concat(fromDom)) {
		if (!card || seen.has(card)) continue;
		seen.add(card);
		if (!card.classList?.contains("card")) continue;
		if (isHiddenOrBlankCard(card)) continue;

		try {
			card.classList.remove("decade-card");
			card.style.removeProperty("background");
			if (card.classList.contains("layered-card")) {
				clearLayeredCard(card);
			}
			applyLayeredCard(card, "1");
		} catch (e) {}
	}
}

/**
 * 拿/弃目标牌：只有手牌区时走单行，含装备或判定仍走三区
 * @param {GameEvent} event
 * @returns {"hej"|"hand"}
 */
function resolvePlayerCardLayout(event) {
	const pos = String(event?.position ?? "");
	if (!/[ej]/.test(pos)) return "hand";
	return "hej";
}

/**
 * 攻心类 dialog DOM：addNewRow + 弃置 / 牌堆顶
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isHandBinsDialog(dialog) {
	if (!dialog?.classList?.contains("addNewRow")) return false;
	const text = String(dialog.textContent || "").replace(/\s+/g, "");
	const hasDiscard = text.includes("弃置");
	const hasPile = /(牌堆顶|置于牌堆)/.test(text);
	const hasCards = !!dialog.querySelector?.(
		".item-container .card, .item-container .button.card, .row-container .card"
	);
	if (hasDiscard && hasPile && hasCards) return true;

	// 文案检测失败时：按「手牌行 + 双空操作槽」结构兜底
	const rows = Array.from(dialog.content?.querySelectorAll?.(".row-container") || []);
	if (rows.length < 2) return false;
	let handRow = false;
	let binRow = false;
	for (const row of rows) {
		const rowText = (row.textContent || "").replace(/\s+/g, "");
		if (/手牌/.test(rowText) && row.querySelector(".card, .button.card")) handRow = true;
		const boxes = Array.from(row.children).filter(el => el.classList?.contains("item-container"));
		const emptyPops = boxes.filter(el => el.classList.contains("popup") && !el.querySelector(".card, .button.card"));
		if (emptyPops.length >= 2) binRow = true;
	}
	return handRow && binRow;
}

/**
 * 攻心类：一手牌 + 两个空操作槽（弃置 / 牌堆顶）
 * @param {GameEvent} event
 * @param {HTMLElement} [dialog]
 * @returns {boolean}
 */
function isHandBinsMoveEvent(event, dialog) {
	if (event?.name === "chooseToMove_new") {
		const list = event.list;
		if (Array.isArray(list) && list.length === 2) {
			const source = list[0];
			const bins = list[1];
			const sourceCards = source?.[1];
			const hasSourceCards = Array.isArray(sourceCards)
				? sourceCards.length > 0
				: !!(sourceCards && sourceCards.length);
			if (Array.isArray(source) && hasSourceCards && Array.isArray(bins) && bins.length >= 2) {
				const looksLikeBins = bins.every(bin => {
					if (!Array.isArray(bin) || typeof bin[0] !== "string") return false;
					if (bin.length <= 1) return true;
					return bin.length === 2 && (bin[1] == null || Array.isArray(bin[1]));
				});
				if (looksLikeBins) return true;
			}
		}
	}
	return isHandBinsDialog(dialog);
}

/**
 * 观星等 chooseToMove：牌堆顶 / 底等多区拖拽
 * @param {GameEvent} event
 * @returns {boolean}
 */
function isTwoPileMoveEvent(event) {
	if (event?.name !== "chooseToMove") return false;
	const list = event.list;
	if (!Array.isArray(list) || list.length < 2) return false;
	let pileCount = 0;
	for (const item of list) {
		let rows = item;
		if (!Array.isArray(rows)) continue;
		if (typeof rows[0] === "string" && !Array.isArray(rows[0])) {
			pileCount++;
			continue;
		}
		if (Array.isArray(rows[0])) {
			for (const row of rows) {
				if (Array.isArray(row) && typeof row[0] === "string") pileCount++;
			}
		}
	}
	return pileCount >= 2;
}

/**
 * 观星 chooseToMove（.guanxing 拖拽区）
 * @param {GameEvent} event
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isGuanxingMoveEvent(event, dialog) {
	if (event?.name !== "chooseToMove") return false;
	return !!dialog?.querySelector?.(".buttons.popup.guanxing");
}

/**
 * 非攻心形的 chooseToMove_new（保留 addNewRow 交互）
 * @param {GameEvent} event
 * @param {HTMLElement} [dialog]
 * @returns {boolean}
 */
function isInteractiveMoveNewEvent(event, dialog) {
	return event?.name === "chooseToMove_new" && !isHandBinsMoveEvent(event, dialog);
}

/**
 * 非攻心形 addNewRow 移牌窗（事件名可能已不是 chooseToMove_new）
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isInteractiveMoveNewDialog(dialog) {
	if (!dialog?.classList?.contains("addNewRow")) return false;
	if (isHandBinsDialog(dialog)) return false;
	if (isSuitSelectDialog(dialog)) return false;
	return !!dialog.querySelector?.(".item-container .card, .item-container .button, .row-container .card");
}

/** 花色 → 手杀清正同款图标下标与中文名（dialog_pokercolor0~3） */
const SUIT_SELECT_META = {
	heart: { name: "红桃", icon: 0 },
	diamond: { name: "方块", icon: 1 },
	spade: { name: "黑桃", icon: 2 },
	club: { name: "梅花", icon: 3 },
};

/**
 * 十周年 dialog 素材路径
 * @param {string} file
 * @returns {string}
 */
function dialogUiAsset(file) {
	return `${lib.assetURL}extension/十周年UI/image/ui/dialog/${file}`;
}

/**
 * 收集分花色选牌的 item-container（link 为花色）
 * @param {HTMLElement} dialog
 * @returns {HTMLElement[]}
 */
function collectSuitContainers(dialog) {
	if (!dialog?.querySelectorAll) return [];
	return Array.from(dialog.querySelectorAll(".item-container")).filter(box => {
		const link = box.link;
		return typeof link === "string" && Object.prototype.hasOwnProperty.call(SUIT_SELECT_META, link);
	});
}

/**
 * 清正 / 诫节等：addNewRow 按花色分堆选牌
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isSuitSelectDialog(dialog) {
	if (!dialog?.classList?.contains("addNewRow")) return false;
	if (isHandBinsDialog(dialog)) return false;
	return collectSuitContainers(dialog).length >= 2;
}

/**
 * 按容器宽度收紧花色槽内牌叠距，避免超出 dui-pcd-suit-cards
 * @param {HTMLElement} wrap
 * @param {HTMLElement[]} cards
 */
function fitSuitCardOverlap(wrap, cards) {
	const n = cards.length;
	if (!wrap || n <= 1) {
		wrap?.style?.removeProperty?.("--dui-pcd-suit-ml");
		return;
	}
	const CARD_W = 108;
	const DEFAULT_ML = -30;
	const MIN_VISIBLE = 22;
	const apply = () => {
		const L = wrap.clientWidth || wrap.getBoundingClientRect().width || 0;
		if (!L) {
			wrap.style.setProperty("--dui-pcd-suit-ml", `${DEFAULT_ML}px`);
			return;
		}
		let ml = DEFAULT_ML;
		const natural = n * CARD_W + (n - 1) * ml;
		if (natural > L) {
			ml = (L - n * CARD_W) / (n - 1);
		}
		const minMl = -(CARD_W - MIN_VISIBLE);
		if (ml < minMl) ml = minMl;
		wrap.style.setProperty("--dui-pcd-suit-ml", `${ml}px`);
	};
	apply();
	requestAnimationFrame(apply);
}

/**
 * 美化分花色选牌槽（对齐手杀曹髦清正：dlg_select_bg + pokercolor）
 * @param {HTMLElement} dialog
 */
function layoutSuitSelect(dialog) {
	const boxes = collectSuitContainers(dialog);
	if (!boxes.length) return;

	for (const box of boxes) {
		const suit = box.link;
		const meta = SUIT_SELECT_META[suit];
		if (!meta) continue;

		box.classList.add("dui-pcd-suit-slot");
		box.dataset.suit = suit;
		box.style.border = "none";
		box.style.minHeight = "";
		box.style.height = "";
		box.style.width = "";
		// 不要写 background-image:none，否则会盖住 CSS 底图（空花色尤其明显）
		box.style.removeProperty("background");
		box.style.removeProperty("background-image");
		box.style.removeProperty("background-color");
		box.style.removeProperty("background-size");
		box.style.removeProperty("--ml");

		const observer = box.Observer;
		if (observer?.disconnect) observer.disconnect();

		let wrap = box.querySelector(".dui-pcd-suit-cards");
		if (!wrap) {
			wrap = ui.create.div(".dui-pcd-suit-cards", box);
		}

		const cards = Array.from(box.querySelectorAll(".card, .button.card, .item.card")).filter(
			card => card.closest(".item-container") === box
		);
		const count = cards.length;
		box.classList.toggle("dui-pcd-suit-empty", count === 0);

		for (const card of cards) {
			if (card.parentNode !== wrap) wrap.appendChild(card);
			card.classList.add("dui-pcd-suit-card");
			card.style.removeProperty("width");
			card.style.removeProperty("height");
			card.style.removeProperty("zoom");
			card.style.removeProperty("margin-left");
			card.style.removeProperty("margin-right");
			card.style.removeProperty("top");
			card.style.removeProperty("left");
		}
		fitSuitCardOverlap(wrap, cards);

		let seal = box.querySelector(".dui-pcd-suit-seal");
		if (!seal) {
			seal = Array.from(box.children).find(
				el =>
					el !== wrap &&
					el.nodeType === 1 &&
					!el.classList.contains("card") &&
					!el.classList.contains("item") &&
					!el.classList.contains("dui-pcd-suit-cards") &&
					!el.classList.contains("dui-pcd-suit-seal")
			);
			if (seal) {
				seal.classList.add("dui-pcd-suit-seal");
			} else {
				seal = ui.create.div(".dui-pcd-suit-seal", box);
			}
		}
		while (seal.firstChild) seal.removeChild(seal.firstChild);
		seal.removeAttribute("style");
		seal.classList.add("dui-pcd-suit-seal");
		seal.style.setProperty("display", "flex", "important");
		seal.style.setProperty("visibility", "visible", "important");
		seal.style.setProperty("opacity", "1", "important");
		const icon = document.createElement("img");
		icon.className = "dui-pcd-suit-icon";
		icon.draggable = false;
		icon.alt = meta.name;
		icon.src = dialogUiAsset(`dialog_pokercolor${meta.icon}.png`);
		const text = document.createElement("span");
		text.className = "dui-pcd-suit-text";
		text.textContent = count ? `${meta.name}牌${count}张` : `没有${meta.name}牌`;
		seal.appendChild(icon);
		seal.appendChild(text);
		// 保证封条在最上层（空花色也要显示 dlg_select_bg）
		if (seal.parentNode === box) box.appendChild(seal);

		if (observer?.observe) {
			observer.observe(box, { childList: true });
		}
	}

	for (const row of dialog.querySelectorAll(".row-container")) {
		if (row.querySelector(".dui-pcd-suit-slot")) {
			row.classList.add("dui-pcd-suit-row");
		}
	}
}

/**
 * chooseButton 是否全部为实体牌
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isAllCardChooseButton(dialog) {
	const buttons = dialog?.buttons;
	if (!Array.isArray(buttons) || !buttons.length) return false;
	return buttons.every(btn => {
		// 手杀 vcard 窄条不是真实手牌，不能套选手牌框
		if (btn?.dataset?.vcard === "true" || btn?.classList?.contains("vcard")) return false;
		if (!btn?.link) return btn?.classList?.contains("card");
		const type = get.itemtype(btn.link);
		return type === "card" || btn.classList?.contains("card");
	});
}

/**
 * 是否应交给「手杀选牌弹出」入手（权计/排异等纯卡牌弹窗）
 * @param {GameEvent} event
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function shouldDeferToChoosePopup(event, dialog) {
	if (!lib.config["extension_十周年UI_choosePopup"]) return false;
	if (event?.name !== "chooseButton" && event?.name !== "chooseButtonTarget") return false;
	if (!isAllCardChooseButton(dialog)) return false;
	if (dialog.buttons.length > 25) return false;
	if (isTwoRowHandChooseButton(event, dialog)) return false;
	if (isEjOnlyChooseButton(event, dialog)) return false;
	if (isMoveCardTwoPlayerEj(event, dialog)) return false;
	for (const node of dialog.content?.querySelectorAll?.(".caption, .text.center") || []) {
		if (/装备|判定/.test((node.textContent || "").replace(/\s+/g, ""))) return false;
	}
	return true;
}

/**
 * 魄袭：两组手牌 caption + 卡片
 * @param {GameEvent} event
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isTwoRowHandChooseButton(event, dialog) {
	if (event?.name !== "chooseButton") return false;
	if (!isAllCardChooseButton(dialog)) return false;

	const handCaptions = Array.from(dialog.content?.querySelectorAll?.(".caption") || []).filter(node =>
		/手牌/.test((node.textContent || "").replace(/\s+/g, ""))
	);
	if (handCaptions.length >= 2) return true;

	const groups = collectCaptionGroups(dialog).filter(g => g.zone === "h" || /手牌/.test(g.label));
	if (groups.length >= 2) return true;

	const target = event?.target;
	if (target) {
		const owners = new Set(
			(dialog.buttons || [])
				.map(btn => get.owner(btn.link))
				.filter(Boolean)
		);
		if (owners.size >= 2) return true;
	}
	return false;
}

/**
 * 让节 moveCard：双目标 e/j 双行
 * @param {GameEvent} event
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isMoveCardTwoPlayerEj(event, dialog) {
	if (event?.name !== "chooseButton") return false;
	if (!event.targets0 || !event.targets1) return false;
	for (const node of dialog.content?.querySelectorAll?.(".caption, .text.center") || []) {
		const text = (node.textContent || "").replace(/\s+/g, "");
		if (/手牌/.test(text)) return false;
	}
	// 至少有装备区 / 判定区标题，或按钮全是 e/j
	let hasEjCaption = false;
	for (const node of dialog.content?.querySelectorAll?.(".caption, .text.center") || []) {
		const text = (node.textContent || "").replace(/\s+/g, "");
		if (/装备|判定/.test(text)) {
			hasEjCaption = true;
			break;
		}
	}
	if (hasEjCaption) return true;
	const buttons = dialog.buttons || [];
	if (!buttons.length) return false;
	return buttons.every(btn => {
		const zone = getButtonZone(btn);
		return zone === "e" || zone === "j";
	});
}

/**
 * 其他技能：单行装备 / 判定
 * @param {GameEvent} event
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isEjOnlyChooseButton(event, dialog) {
	if (event?.name !== "chooseButton") return false;
	if (isMoveCardTwoPlayerEj(event, dialog)) return false;
	const grouped = collectButtonsByCaption(dialog);
	if (grouped.h.length) return false;
	if (!grouped.e.length && !grouped.j.length) return false;
	for (const node of dialog.content?.querySelectorAll?.(".caption, .text.center") || []) {
		if (/手牌/.test((node.textContent || "").replace(/\s+/g, ""))) return false;
	}
	return true;
}

/**
 * chooseButton / chooseCardButton 单行选手牌
 * @param {GameEvent} event
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function isHandOnlyChooseButton(event, dialog) {
	if (event?.name !== "chooseButton") return false;
	if (isTwoRowHandChooseButton(event, dialog) || isEjOnlyChooseButton(event, dialog)) return false;
	if (!isAllCardChooseButton(dialog)) return false;
	const groups = collectCaptionGroups(dialog);
	if (groups.some(g => g.zone === "e" || g.zone === "j")) return false;
	return groups.length <= 1;
}

/**
 * 跳过不应套框的 dialog
 * @param {HTMLElement} dialog
 * @returns {boolean}
 */
function shouldSkipSkillCardDialog(dialog) {
	if (dialog.classList.contains("prompt") || dialog.classList.contains("popped")) return true;
	// 转化卡牌手杀样式：保留 vcard 分列，不要套选手牌框
	if (dialog._shoushaButton) return true;
	if (
		dialog.classList.contains("decade-shousha-vcard") ||
		dialog.classList.contains("decade-shousha-no-nature") ||
		dialog.classList.contains("decade-shousha-vertical") ||
		dialog.classList.contains("decade-shousha-multi")
	) {
		return true;
	}
	if (dialog.querySelector?.(".dialog-basic, .dialog-trick, .dialog-delay, .card[data-vcard='true']")) {
		return true;
	}
	try {
		if (ui.arena?.classList.contains("choose-character")) return true;
	} catch (e) {}
	return false;
}

/**
 * 美化选目标牌 / 纯观看 dialog
 * @param {GameEvent} event
 * @param {string} fallbackTitle
 * @param {{ dialog?: HTMLElement, layout?: string, groups?: { label: string, buttons: HTMLElement[] }[] }} [options]
 */
export function enhancePlayerCardDialog(event, fallbackTitle, options = {}) {
	const dialog = options.dialog || event?.dialog;
	if (!dialog || typeof dialog !== "object" || !dialog.classList) return;
	if (event?.directresult) return;
	if (shouldSkipSkillCardDialog(dialog)) return;

	let layout = options.layout || dialog.dataset.layout || "hej";
	// 误判为 two-pile 时，按 DOM 形状纠正为攻心 move-bins / 分花色 suit-select
	if (layout === "two-pile" && isHandBinsDialog(dialog)) {
		layout = "move-bins";
	}
	if ((layout === "two-pile" || layout === "hand") && isSuitSelectDialog(dialog)) {
		layout = "suit-select";
	}
	const staticLayouts = new Set(["two-pile"]);

	dialog.classList.add("dui-player-card-dialog");
	dialog.dataset.duiPlayerCardDialog = "1";
	dialog.dataset.layout = layout;
	if (layout === "hej" || layout === "ej" || layout === "two-ej-row") {
		dialog.dataset.equipSlots = String(getEquipSlotCount());
	}

	const title = resolveParentTitle(event, fallbackTitle);
	injectGoldTitle(dialog, title);
	hidePromptCaptions(dialog);

	if (layout === "two-row") {
		layoutTwoRowHand(dialog, options.groups || collectCaptionGroups(dialog), event);
	} else if (layout === "two-ej-row") {
		layoutTwoRowEjMoveCard(dialog, event);
	} else if (layout === "guanxing") {
		layoutGuanxingPiles(dialog, event);
	} else if (layout === "move-bins") {
		layoutMoveBins(dialog);
	} else if (layout === "suit-select") {
		layoutSuitSelect(dialog);
	} else if (layout === "ej") {
		layoutEjRows(dialog);
	} else if (!staticLayouts.has(layout)) {
		layoutAreaRows(dialog, layout, event);
	}

	if (layout === "move-bins" || layout === "two-pile" || layout === "suit-select") {
		purgeMoveBinsPromptRows(dialog);
	}

	if (shouldPcdAutoConfirm(event)) {
		markPcdAutoConfirm(event);
		clearPcdAutoConfirmUi();
	}

	markButtonsFixedSize(dialog);
	applyStandardWhiteCards(dialog);
	fitCardsToSlots(dialog);
	applyDialogFrameSize(dialog);
	syncPlayerCardDialogConfirmUi();
	try {
		syncProgressBarToPcdDialog();
	} catch (e) {}
	syncPcdFooterLayout(dialog);
}

/**
 * 是否为带 choiceList / dialogcontrol 的 chooseControl
 * @param {GameEvent} event
 * @returns {boolean}
 */
function isChoiceListControlEvent(event) {
	if (event?.name !== "chooseControl") return false;
	if (Array.isArray(event.choiceList) && event.choiceList.length > 0) return true;
	return Boolean(event.dialogcontrol);
}

/**
 * 将选项行接到 dialogcontrol，并隐藏底部重复的「选项一/二」
 * @param {HTMLElement} dialog
 * @param {GameEvent} event
 */
function wireChoiceListOptions(dialog, event) {
	const content = dialog?.content;
	if (!content) return;

	const optionControls = (event.controls || []).filter(c => c !== "cancel2" && c !== "cancel");
	const pops = Array.from(content.querySelectorAll(".popup.text"));
	const alreadyDialogControl = Boolean(event.dialogcontrol);
	let wired = 0;
	pops.forEach((pop, i) => {
		const control = pop.link || optionControls[i];
		if (!control) return;
		pop.classList.add("dui-choice-option", "pointerdiv");
		pop.style.width = "";
		pop.style.display = "";
		pop.link = control;
		// dialogcontrol 路径引擎已绑定；choiceList 需自行接到选项行
		if (!alreadyDialogControl && !pop._duiChoiceWired) {
			pop._duiChoiceWired = true;
			pop.listen(ui.click.dialogcontrol);
		}
		wired++;
	});

	// 没有可点选项行时保留底部「选项一/二」，避免卡死
	if (!wired && !alreadyDialogControl) return;

	const bars = [];
	if (event.controlbar) bars.push(event.controlbar);
	if (Array.isArray(event.controlbars)) bars.push(...event.controlbars);
	for (const bar of bars) {
		if (!bar?.classList) continue;
		bar.classList.add("dui-choice-controlbar");
		let visible = 0;
		for (const node of Array.from(bar.childNodes || [])) {
			const link = node.link;
			if (link === "cancel2" || link === "cancel") {
				visible++;
				continue;
			}
			node.classList.add("dui-choice-option-btn");
			if (typeof node.style?.setProperty === "function") {
				node.style.setProperty("display", "none", "important");
			} else if (node.style) {
				node.style.display = "none";
			}
		}
		// 分离条：整条都是选项时直接藏
		if (!visible && bar.childNodes?.length) {
			bar.classList.add("dui-choice-controlbar-empty");
			if (typeof bar.style?.setProperty === "function") {
				bar.style.setProperty("display", "none", "important");
			} else if (bar.style) {
				bar.style.display = "none";
			}
		}
	}
}

/** 暂关：会藏底部「选项一/二」且选项行点击链路未稳，易卡死；后续重做时改回 true */
const ENABLE_CHOICE_LIST_DIALOG = false;

/**
 * 美化 chooseControl + choiceList / dialogcontrol 长选项窗
 * @param {GameEvent} event
 * @param {{ dialog?: HTMLElement }} [options]
 */
export function enhanceChoiceListDialog(event, options = {}) {
	if (!ENABLE_CHOICE_LIST_DIALOG) return;
	const dialog = options.dialog || event?.dialog;
	if (!dialog || typeof dialog !== "object" || !dialog.classList) return;
	if (!isChoiceListControlEvent(event)) return;
	if (shouldSkipSkillCardDialog(dialog)) return;

	const already = dialog.dataset.duiPlayerCardDialog === "1" && dialog.dataset.layout === "choice-list";
	if (!already) {
		dialog.classList.add("dui-player-card-dialog");
		dialog.dataset.duiPlayerCardDialog = "1";
		dialog.dataset.layout = "choice-list";

		const title = resolveParentTitle(event, event.prompt || "选择一项");
		injectGoldTitle(dialog, title);
		hidePromptCaptions(dialog);
		applyDialogFrameSize(dialog);
	}

	wireChoiceListOptions(dialog, event);
}

/**
 * 按事件形状在 dialog.open 时注入手杀选牌框
 * @param {HTMLElement} dialog
 */
export function tryEnhanceSkillCardDialog(dialog) {
	if (!dialog?.classList) return;
	if (dialog.dataset.duiPlayerCardDialog === "1") return;
	if (shouldSkipSkillCardDialog(dialog)) return;

	const event = _status.event;
	// choiceList 暂关美化，走引擎默认底部「选项一/二」，避免藏按钮后卡死
	if (isChoiceListControlEvent(event)) {
		if (!ENABLE_CHOICE_LIST_DIALOG) return;
		// choiceList 在 open 之后才 add 选项；此处仅作兜底，主路径在 createContentChooseControl
		requestAnimationFrame(() => {
			try {
				enhanceChoiceListDialog(event, { dialog });
			} catch (e) {}
		});
		return;
	}
	if (isGuanxingMoveEvent(event, dialog)) {
		enhancePlayerCardDialog(event, resolveParentTitle(event, "观星"), { dialog, layout: "guanxing" });
		return;
	}
	// 攻心 DOM 已成形时优先套框（不依赖 event.name，避免 await 后 _status.event 漂移）
	if (isHandBinsDialog(dialog)) {
		enhancePlayerCardDialog(event, resolveParentTitle(event, "攻心"), { dialog, layout: "move-bins" });
		return;
	}
	// chooseToMove_new 会先空壳 open，此时不能美化，否则布局空、位置错，二次 open 再跳
	if (event?.name === "chooseToMove_new" && !dialog.classList.contains("addNewRow")) {
		return;
	}
	if (isHandBinsMoveEvent(event, dialog)) {
		enhancePlayerCardDialog(event, resolveParentTitle(event, "攻心"), { dialog, layout: "move-bins" });
		return;
	}
	// 清正 / 诫节：分花色选牌（优先于通用 two-pile）
	if (isSuitSelectDialog(dialog)) {
		enhancePlayerCardDialog(event, resolveParentTitle(event, "选牌"), { dialog, layout: "suit-select" });
		return;
	}
	if (isTwoPileMoveEvent(event) || isInteractiveMoveNewEvent(event, dialog) || isInteractiveMoveNewDialog(dialog)) {
		enhancePlayerCardDialog(event, resolveParentTitle(event, "移牌"), { dialog, layout: "two-pile" });
		return;
	}

	const hasCards =
		(Array.isArray(dialog.buttons) && dialog.buttons.length > 0) ||
		dialog.querySelector?.(
			".card, .button.card, .item-container .item, .item-container .card, .buttons.popup.guanxing .card"
		);
	if (!hasCards) return;

	if (event?.name === "viewCards") {
		enhancePlayerCardDialog(event, "观看", { dialog, layout: "hand" });
		return;
	}
	if (event?.name === "chooseButton") {
		// 「手杀选牌弹出」开启时：纯卡牌 chooseButton（排异/权计等）改由入手逻辑处理，不套选牌框
		if (shouldDeferToChoosePopup(event, dialog)) return;
		if (isMoveCardTwoPlayerEj(event, dialog)) {
			enhancePlayerCardDialog(event, resolveParentTitle(event, "移牌"), { dialog, layout: "two-ej-row" });
			return;
		}
		if (isTwoRowHandChooseButton(event, dialog)) {
			enhancePlayerCardDialog(event, resolveParentTitle(event, "选牌"), {
				dialog,
				layout: "two-row",
				groups: collectCaptionGroups(dialog),
			});
			return;
		}
		if (isEjOnlyChooseButton(event, dialog)) {
			enhancePlayerCardDialog(event, resolveParentTitle(event, "选牌"), { dialog, layout: "ej" });
			return;
		}
		if (isHandOnlyChooseButton(event, dialog)) {
			enhancePlayerCardDialog(event, resolveParentTitle(event, "选牌"), { dialog, layout: "hand" });
		}
	}
}

/** @deprecated 使用 tryEnhanceSkillCardDialog */
export const tryEnhanceViewCardsDialog = tryEnhanceSkillCardDialog;

/**
 * 包装 content 数组首步：在原逻辑建完 dialog 后注入美化
 * @param {string} contentName
 * @param {string} fallbackTitle
 * @returns {Function|null} restore
 */
function wrapContentFirstStep(contentName, fallbackTitle) {
	const content = lib.element?.content?.[contentName];
	if (!Array.isArray(content) || typeof content[0] !== "function") return null;

	const original = content[0];
	content[0] = async function (event, trigger, player) {
		markPcdAutoConfirm(event);
		await original.call(this, event, trigger, player);
		try {
			enhancePlayerCardDialog(event, fallbackTitle, { layout: resolvePlayerCardLayout(event) });
			if (event._duiPcdAutoConfirm) clearPcdAutoConfirmUi();
		} catch (e) {}
	};
	content[0]._original = original;

	return () => {
		content[0] = original;
	};
}

/**
 * 五谷丰登：chooseButton 在 game.check 前标记点牌即确认
 * @returns {Function|null}
 */
function wrapChooseButtonWuguAutoConfirm() {
	const content = lib.element?.content?.chooseButton;
	if (!Array.isArray(content) || typeof content[0] !== "function" || content[0]._duiWuguAutoConfirm) return null;

	const original = content[0];
	content[0] = async function (event, trigger, player) {
		markPcdAutoConfirm(event);
		await original.call(this, event, trigger, player);
		if (event._duiPcdAutoConfirm) clearPcdAutoConfirmUi();
	};
	content[0]._duiWuguAutoConfirm = true;
	content[0]._original = original;

	return () => {
		content[0] = original;
	};
}

/**
 * moveCard 仅一张可移动牌时也弹出选框（让节等）
 * @returns {Function|null}
 */
/**
 * moveCard 仅一张可移动牌时也弹出选框（让节等）
 * @returns {Function|null}
 */
function wrapMoveCardAlwaysShowPick() {
	const original = lib.element?.content?.moveCard;
	if (typeof original !== "function" || original._duiMoveCardPatched) return null;

	try {
		const src = original.toString();
		const replaced = src.replace(
			/if\s*\(\s*es\.length\s*\+\s*js\.length\s*===\s*1\s*\)/,
			"if (false /* dui always show pick */)"
		);
		if (replaced === src) return null;
		const patched = (0, eval)(`(${replaced})`);
		patched._duiMoveCardPatched = true;
		patched._original = original;
		lib.element.content.moveCard = patched;
		return () => {
			lib.element.content.moveCard = original;
		};
	} catch (e) {
		return null;
	}
}

/**
 * ui.create.confirm / 底部控制条变化时同步选牌框专用确定/取消样式
 * @returns {Function|null}
 */
function installPlayerCardDialogConfirmUiSync() {
	const sync = () => {
		try {
			syncPlayerCardDialogConfirmUi();
		} catch (e) {}
	};

	const patchConfirmUpdate = () => {
		const confirm = ui.confirm;
		if (!confirm || confirm._duiPcdUpdatePatched) return;
		const original = confirm.update;
		if (typeof original !== "function") return;
		confirm.update = function (...args) {
			const result = original.apply(this, args);
			sync();
			return result;
		};
		confirm._duiPcdUpdatePatched = true;
	};

	const wrapCreateConfirm = () => {
		const original = ui.create.confirm;
		if (typeof original !== "function" || original._duiPcdConfirmSync) return;
		ui.create.confirm = function (...args) {
			if (_status.event?._duiPcdAutoConfirm) {
				ui.confirm?.close?.();
				return ui.confirm;
			}
			const result = original.apply(this, args);
			patchConfirmUpdate();
			sync();
			requestAnimationFrame(sync);
			return result;
		};
		ui.create.confirm._duiPcdConfirmSync = true;
		ui.create.confirm._duiPcdOriginal = original;
	};

	lib.arenaReady?.push(() => {
		wrapCreateConfirm();
		setTimeout(wrapCreateConfirm, 200);

		const origUpdatec = ui.updatec;
		if (typeof origUpdatec === "function" && !origUpdatec._duiPcdConfirmSync) {
			ui.updatec = function (...args) {
				const result = origUpdatec.apply(this, args);
				sync();
				return result;
			};
			ui.updatec._duiPcdConfirmSync = true;
			ui.updatec._duiPcdOriginal = origUpdatec;
		}

		const origCheck = game.check;
		if (typeof origCheck === "function" && !origCheck._duiPcdConfirmSync) {
			game.check = function (...args) {
				const result = origCheck.apply(this, args);
				if (_status.event?._duiPcdAutoConfirm) clearPcdAutoConfirmUi();
				sync();
				tryPcdAutoConfirm(result);
				return result;
			};
			game.check._duiPcdConfirmSync = true;
			game.check._duiPcdOriginal = origCheck;
		}
	});

	return () => {
		sync();
		const wrapped = ui.create.confirm;
		if (wrapped?._duiPcdConfirmSync && wrapped._duiPcdOriginal) {
			ui.create.confirm = wrapped._duiPcdOriginal;
		}
	};
}

/**
 * 手杀转化 vcard 对话框：套顺手同款 tittle_bg 外框 + 金色标题（保留分列内容）
 * @param {HTMLElement} dialog
 * @param {string} [fallbackTitle]
 */
export function enhanceShoushaVcardDialogFrame(dialog, fallbackTitle = "选牌") {
	if (!dialog?.classList?.contains("decade-shousha-vcard")) return;

	const event = _status.event;
	const skipSkillClass = new Set([
		"skill-chooseToUse",
		"skill-chooseToRespond",
		"skill-chooseButton",
		"skill-chooseButtonTarget",
		"skill-phaseUse",
		"skill-phase",
		"skill-phaseZhunbei",
		"skill-phaseJudge",
		"skill-phaseDraw",
		"skill-phaseDiscard",
		"skill-phaseJieshu",
		"skill-useSkill",
		"skill-trigger",
		"skill-arrangeTrigger",
	]);
	let titleFromClass = "";
	for (const cls of dialog.classList) {
		if (!cls.startsWith("skill-") || skipSkillClass.has(cls)) continue;
		const id = cls.slice("skill-".length);
		const fromSkill = translateSkillTitle(id, event?.player);
		if (fromSkill) {
			titleFromClass = fromSkill;
			break;
		}
	}
	const title =
		(fallbackTitle && fallbackTitle !== "选牌" ? fallbackTitle : "") ||
		titleFromClass ||
		resolveParentTitle(event, fallbackTitle);
	injectGoldTitle(dialog, title);
	hidePromptCaptions(dialog);
	applyDialogFrameSize(dialog);

	dialog.dataset.layout = "shousha-vcard";
	for (const prop of ["width", "left", "right", "top", "bottom", "min-height", "max-height", "height", "transform"]) {
		dialog.style.removeProperty(prop);
	}

	const buttons = dialog.querySelector(".buttons");
	if (buttons?.style) {
		buttons.style.removeProperty("height");
		buttons.style.removeProperty("left");
		buttons.style.removeProperty("width");
		buttons.style.display = "flex";
		buttons.style.justifyContent = "center";
		buttons.style.alignItems = "flex-start";
		buttons.style.flexWrap = "nowrap";
		buttons.style.zoom = "1";
	}

	// 框内栏进 footer；单选无确定，底部挂进度条+提示
	const confirmBar = dialog._confirm || dialog.querySelector(".dialog-confirm");
	if (confirmBar) {
		dialog.classList.add("decade-shousha-has-confirm");
	}
	try {
		import("./temp-card.js").then(m => m.syncShoushaFooterLayout?.(dialog)).catch(() => {});
	} catch (e) {}

	// 转化框打开时暂时藏外侧清除/底部确认
	if (dialog.classList.contains("decade-shousha-vcard")) {
		for (const control of Array.from(document.querySelectorAll("#dui-controls .control"))) {
			const text = (control.textContent || "").replace(/\s+/g, "");
			if (text.includes("清除选择")) {
				control.classList.add("decade-shousha-hidden-control");
				control.style?.setProperty?.("display", "none", "important");
			} else if (control.classList.contains("lbtn-confirm") || control.classList.contains("combo-control")) {
				control.classList.add("decade-shousha-temp-hide-confirm");
				control.style?.setProperty?.("display", "none", "important");
			}
		}
	}
}

/**
 * 注册顺手 / 拆桥选牌框覆写
 * @returns {Function[]}
 */
export function applyPlayerCardDialogOverrides() {
	const restoreFns = [];
	const confirmUiRestore = installPlayerCardDialogConfirmUiSync();
	if (confirmUiRestore) restoreFns.push(confirmUiRestore);
	const gainRestore = wrapContentFirstStep("gainPlayerCard", "拿牌");
	const discardRestore = wrapContentFirstStep("discardPlayerCard", "弃牌");
	const chooseRestore = wrapContentFirstStep("choosePlayerCard", "选牌");
	const wuguRestore = wrapChooseButtonWuguAutoConfirm();
	const moveCardRestore = wrapMoveCardAlwaysShowPick();
	if (gainRestore) restoreFns.push(gainRestore);
	if (discardRestore) restoreFns.push(discardRestore);
	if (chooseRestore) restoreFns.push(chooseRestore);
	if (wuguRestore) restoreFns.push(wuguRestore);
	if (moveCardRestore) restoreFns.push(moveCardRestore);
	return restoreFns;
}
