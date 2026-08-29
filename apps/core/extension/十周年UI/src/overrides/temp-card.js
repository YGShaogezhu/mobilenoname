/**
 * @fileoverview 临时虚拟卡牌模块
 * @description 转化/视为类界面手杀样式：
 * 1) vcard 对话框用手杀窄条牌名 + 确定/取消
 * 2) chooseButton 把对话框按钮变成手牌区临时牌
 * 3) viewAs 在手牌区生成虚拟预览牌
 * 样式见 styles/dialog.css「转化卡牌类界面手杀样式」分区
 * @module overrides/temp-card
 */
import { lib, game, ui, get, _status } from "noname";
import { wrapAround } from "../utils/safeOverride.js";
import { applyCardSkin } from "./card/skin-applier.js";
import { isLayeredMode, isEquipConvertSkill } from "./card/layered-card.js";
import { enhanceShoushaVcardDialogFrame } from "./player-card-dialog.js";

/** 不走手杀 vcard 样式的技能 */
const BANNED_VCARD_SKILLS = ["dcposuo"];
/** 仅列出可选牌（不补全 inpile）的技能 */
const ONLY_USABLE_SKILLS = ["sbwusheng_wusheng"];
/** 竖排布局技能 */
const VERTICAL_SKILLS = ["sbwusheng_wusheng"];
/**
 * 多选转化技能：框内「重新选择」+ 选中计数 + 隐藏外侧「清除选择」
 * （含看破等，按能力扩展此列表即可）
 */
const MULTI_SELECT_SKILLS = ["sbkanpo", "sb_kanpo", "twkanpo"];
/** 无属性杀分列（不展开雷火等） */
const NO_NATURE_SKILLS = ["sbkanpo", "sb_kanpo", "twkanpo"];
/** 看破类：提示词按可记录次数区分 */
const KANPO_HINT_SKILLS = ["sbkanpo", "sb_kanpo", "twkanpo"];
/** 转化选牌：基本牌展示顺序（杀闪后接火杀雷杀，再桃酒） */
const SHOUSHA_BASIC_ORDER = ["sha", "shan", "tao", "jiu"];
/** 转化选牌：属性杀顺序（插在闪之后） */
const SHOUSHA_SHA_NATURE_ORDER = ["fire", "thunder"];
/** 转化选牌：锦囊展示顺序 */
const SHOUSHA_TRICK_ORDER = [
	"shunshou",
	"guohe",
	"wugu",
	"wuzhong",
	"juedou",
	"nanman",
	"wanjian",
	"shandian",
	"taoyuan",
	"wuxie",
	"jiedao",
	"lebu",
	"bingliang",
	"tiesuo",
	"huogong",
];

/**
 * 按偏好表重排名称，未列出的保持原相对顺序接在后面
 * @param {string[]} names
 * @param {string[]} preferred
 * @returns {string[]}
 */
function orderNamesByPreferred(names, preferred) {
	const set = new Set(names);
	const head = preferred.filter(name => set.has(name));
	const rest = names.filter(name => !preferred.includes(name));
	return head.concat(rest);
}
/**
 * 技能名是否命中列表（兼容 backup 后缀）
 * @param {string} name
 * @param {string[]} list
 * @returns {boolean}
 */
function hitSkillList(name, list) {
	if (!name) return false;
	const base = String(name).replace(/_backup$/, "");
	return list.includes(name) || list.includes(base) || list.some(s => s === name || s.replace(/_/g, "") === base.replace(/_/g, ""));
}

/**
 * @param {string[]} names
 * @param {string[]} list
 * @returns {boolean}
 */
function hitSkillListAny(names, list) {
	return (names || []).some(name => hitSkillList(name, list));
}

/**
 * 多选转化（重新选择 / 计数）
 * @param {string|string[]} skillOrNames
 * @returns {boolean}
 */
function isMultiSelectConvert(skillOrNames) {
	if (Array.isArray(skillOrNames)) return hitSkillListAny(skillOrNames, MULTI_SELECT_SKILLS);
	return hitSkillList(skillOrNames, MULTI_SELECT_SKILLS);
}

/**
 * 无属性分列
 * @param {string|string[]} skillOrNames
 * @returns {boolean}
 */
function isNoNatureConvert(skillOrNames) {
	if (Array.isArray(skillOrNames)) return hitSkillListAny(skillOrNames, NO_NATURE_SKILLS);
	return hitSkillList(skillOrNames, NO_NATURE_SKILLS);
}
/**
 * 扩展名
 * @returns {string}
 */
function getExtensionName() {
	return window.decadeUI?.extensionName || "十周年UI";
}

/**
 * 配置开关（默认开启）
 * @returns {boolean}
 */
function getConfig() {
	return lib.config[`extension_${getExtensionName()}_replace_dialog_shousha`] !== false;
}

/**
 * cardTitle 相对路径（image/ui/cardTitle）
 * @returns {string}
 */
function getCardTitleAssetRel() {
	return `extension/${getExtensionName()}/image/ui/cardTitle`;
}

/**
 * 手杀单选转化框：点牌名即可确认（看破等多选除外）
 * @param {HTMLElement|null|undefined} dialog
 * @param {Object} [evt]
 * @returns {boolean}
 */
function isShoushaSingleClickConvertDialog(dialog, evt) {
	const dlg =
		(dialog && typeof dialog === "object" && dialog.classList && dialog) ||
		(typeof dialog === "number" ? get.idDialog?.(dialog) : null) ||
		document.querySelector(".dialog.decade-shousha-vcard");
	if (!dlg?.classList?.contains("decade-shousha-vcard")) return false;
	if (dlg.classList.contains("decade-shousha-multi") || evt?._decade_shoushaMulti) return false;
	const select = get.select(evt?.selectButton ?? 1);
	return select[0] === 1 && select[1] === 1;
}

/**
 * 单选转化框：点选牌名后直接确定（不改官方「先技能后选手牌」流程）
 * @returns {Function[]}
 */
function applyShoushaSingleClickConvert() {
	if (!getConfig()) return [];
	const restoreFns = [];

	restoreFns.push(
		wrapAround(game, "check", function (original, ...args) {
			const evt = args[0] || _status.event;
			const result = original.apply(this, args);

			try {
				if (!evt?.isMine?.()) return result;
				if (
					result &&
					(evt.name === "chooseButton" || evt.name === "chooseButtonTarget") &&
					isShoushaSingleClickConvertDialog(evt.dialog, evt) &&
					ui.selected.buttons?.length === 1 &&
					!evt._decade_shoushaClickConfirming
				) {
					evt._decade_shoushaClickConfirming = true;
					setTimeout(() => {
						try {
							if (_status.event !== evt) return;
							if (typeof evt.filterOk === "function" && !evt.filterOk()) return;
							ui.click.ok();
						} catch (e) {}
					}, 0);
				}
			} catch (e) {}

			return result;
		})
	);

	return restoreFns;
}

/**
 * 给卡牌套上当前美化（分层或整图）
 * @param {HTMLElement} card
 */
function skinTempCard(card) {
	if (!card) return;
	try {
		applyCardSkin(card, card);
	} catch (e) {}
}

/**
 * 虚拟预览牌：分层走拼装；否则白卡底
 * @param {HTMLElement} card
 */
function styleVirtualPreviewCard(card) {
	card.classList.add("temp-virtual-card");
	card.dataset.virtual = "1";
	card.classList.remove("decade-card");

	if (isLayeredMode()) {
		skinTempCard(card);
		return;
	}

	const ext = getExtensionName();
	card.style.backgroundImage = `url("${lib.assetURL}extension/${ext}/image/ui/cardtexture/card1.png")`;
	card.style.backgroundSize = "100% 100%";
}

/**
 * 事件关联的技能名列表（用于黑名单/布局判断）
 * @param {Object} evt
 * @returns {Array}
 */
function collectEventSkillNames(evt) {
	if (!evt) return [];
	return [
		evt.skill,
		evt.name,
		evt.result?.skill,
		evt.getParent?.()?.name,
		evt.getParent?.()?.skill,
		evt.getParent?.()?.result?.skill,
	].filter(Boolean);
}

/**
 * 技能是否在黑名单（含 _backup）
 * @param {string[]} names
 * @param {string[]} banned
 * @returns {boolean}
 */
function hitBannedSkill(names, banned) {
	const flat = banned.flatMap(skill => [skill, `${skill}_backup`]);
	return names.some(name => flat.includes(name));
}

/**
 * 隐藏外侧「清除选择」控件（多选转化改用框内「重新选择」）
 */
function hideExternalShoushaClearControls() {
	const mark = el => {
		if (!el?.classList) return;
		el.classList.add("decade-shousha-hidden-control");
		try {
			el.style?.setProperty?.("display", "none", "important");
			el.style?.setProperty?.("opacity", "0", "important");
			el.style?.setProperty?.("pointer-events", "none", "important");
			el.style?.setProperty?.("width", "0", "important");
			el.style?.setProperty?.("height", "0", "important");
			el.style?.setProperty?.("margin", "0", "important");
			el.style?.setProperty?.("padding", "0", "important");
			el.style?.setProperty?.("overflow", "hidden", "important");
		} catch (e) {}
		try {
			el.hide?.();
		} catch (e) {}
	};

	for (const control of Array.from(document.querySelectorAll("#dui-controls .control, #dui-controls > .control"))) {
		const text = (control.textContent || "").replace(/\s+/g, "");
		if (text.includes("清除选择") || control.classList.contains("decade-shousha-hidden-control")) {
			mark(control);
		}
	}

	const evt = _status.event;
	const parents = [evt, evt?.getParent?.(), evt?.getParent?.(2), evt?.getParent?.(3)].filter(Boolean);
	for (const parent of parents) {
		for (const control of parent.controls || []) {
			const text = (control?.textContent || "").replace(/\s+/g, "");
			if (text.includes("清除选择") || control?.classList?.contains("decade-shousha-hidden-control")) {
				mark(control);
			}
		}
	}
}

/**
 * 多次尝试隐藏，避免控件晚于对话框创建
 */
function scheduleHideShoushaClearControls() {
	hideExternalShoushaClearControls();
	requestAnimationFrame(hideExternalShoushaClearControls);
	setTimeout(hideExternalShoushaClearControls, 0);
	setTimeout(hideExternalShoushaClearControls, 60);
}

/**
 * 清空已选转化牌名（框内「重新选择」）
 * @param {HTMLElement} dialog
 */
function clearShoushaVcardSelection(dialog) {
	const evt = _status.event;
	const buttons = dialog?.buttons || evt?.dialog?.buttons || [];
	for (const button of buttons) {
		if (!button?.classList) continue;
		button.classList.remove("selectable", "selected");
		const counterNode = button.querySelector(".caption");
		if (counterNode?.childNodes?.[0]) counterNode.childNodes[0].innerHTML = "";
	}
	ui.selected.buttons.length = 0;
	const confirm = dialog?._confirm;
	if (confirm?.reset) {
		confirm.reset.classList.add("disabled");
		confirm.reset.classList.remove("glow");
	}
	scheduleHideShoushaClearControls();
	game.check();
}

/**
 * 解析事件上的手杀确认栏（dialog 可能是节点或 videoId）
 * @param {Object} [event]
 * @returns {HTMLElement|undefined}
 */
function getShoushaConfirmBar(event) {
	const dialog = event?.dialog;
	if (dialog && typeof dialog === "object" && dialog._confirm) return dialog._confirm;
	if (ui.dialog?._confirm) return ui.dialog._confirm;
	const node = document.querySelector(".dialog.decade-shousha-vcard");
	return node?._confirm;
}

/**
 * 手杀确定/取消栏状态
 * @param {boolean} ok
 * @param {Object} event
 */
function clickShoushaConfirm(ok, event) {
	const confirm = getShoushaConfirmBar(event);
	if (!confirm) return;
	const noOk =
		confirm.classList.contains("decade-shousha-no-ok") ||
		confirm.ok?.classList?.contains("decade-shousha-hidden-ok");
	if (noOk) {
		confirm.ok?.classList?.add("decade-shousha-hidden-ok");
		confirm.ok?.style?.setProperty?.("display", "none", "important");
	} else if (event.forceAuto) {
		confirm.ok.hide?.();
	} else {
		confirm.ok.show?.();
	}
	if (!noOk && ok && (!event.filterOk || event.filterOk())) confirm.ok.classList.remove("unclickable");
	else if (confirm.ok) confirm.ok.classList.add("unclickable");
	if (!event.forced && !event.fakeforce) {
		confirm.cancel.show?.();
		confirm.ok?.classList?.remove("decade-no-cancel");
	} else {
		confirm.cancel.hide?.();
		confirm.ok?.classList?.add("decade-no-cancel");
	}
	if (confirm.reset) {
		if (ui.selected.buttons.length) {
			confirm.reset.classList.remove("disabled");
		} else {
			confirm.reset.classList.add("disabled");
			confirm.reset.classList.remove("glow");
		}
	}
	const dialog =
		(event?.dialog && typeof event.dialog === "object" && event.dialog.classList && event.dialog) ||
		ui.dialog ||
		document.querySelector(".dialog.decade-shousha-vcard");
	if (dialog?.classList?.contains("decade-shousha-multi")) {
		scheduleHideShoushaClearControls();
	}
	hideShoushaBottomConfirm();
	try {
		if (dialog?.classList?.contains("decade-shousha-vcard")) syncShoushaFooterLayout(dialog);
	} catch (e) {}
}

/**
 * 从技能名列表解析中文标题
 * @param {string[]} skillNames
 * @param {Object} [player]
 * @returns {string}
 */
function resolveShoushaTitleFromSkills(skillNames, player) {
	const skip = new Set([
		"chooseToUse",
		"chooseToRespond",
		"chooseButton",
		"chooseButtonTarget",
		"phaseUse",
		"phase",
		"phaseZhunbei",
		"phaseJudge",
		"phaseDraw",
		"phaseDiscard",
		"phaseJieshu",
		"useSkill",
		"trigger",
		"arrangeTrigger",
	]);
	for (const raw of skillNames || []) {
		const id = String(raw || "")
			.replace(/_backup$/, "")
			.replace(/_cost$/, "");
		if (!id || skip.has(id)) continue;
		const source = typeof get.sourceSkillFor === "function" ? get.sourceSkillFor(id) : id;
		const candidates = [
			typeof get.skillTranslation === "function" ? get.skillTranslation(source, player) : null,
			get.translation(source),
			source !== id ? get.translation(id) : null,
		];
		for (const name of candidates) {
			if (typeof name === "string" && /[\u4e00-\u9fff]/.test(name) && name !== id && name !== source) {
				return name;
			}
		}
	}
	return "";
}

/**
 * 给「当前转化选牌」事件挂上框内确定栏。
 * 注意：只绑 chooseButton / 直接持有对话框的事件，不要绑父级 chooseToUse，
 * 否则滔乱等选完牌名后选手牌/目标时会没有底部确定而卡死。
 * @param {Object} [evt]
 */
function bindShoushaConfirmToEvent(evt) {
	const mark = e => {
		if (!e) return;
		// 绝不能绑到父级出牌事件，否则滔乱选完牌名后选手牌/目标没有确定键
		if (e.name === "chooseToUse" || e.name === "chooseToRespond") return;
		try {
			if (typeof e.set === "function") {
				e.set("noconfirm", true);
				e.set("customConfirm", ui.click._shoushaConfirm);
			} else {
				e.noconfirm = true;
				e.customConfirm = ui.click._shoushaConfirm;
			}
			e._decade_shoushaOwnedConfirm = true;
		} catch (err) {}
	};

	const current = _status.event;
	if (current?.name === "chooseButton" || current?.name === "chooseButtonTarget") {
		mark(current);
		return;
	}

	let cur = evt || current;
	for (let i = 0; i < 10 && cur; i++) {
		if (cur.name === "chooseButton" || cur.name === "chooseButtonTarget") {
			mark(cur);
			return;
		}
		cur = cur.getParent?.();


	}
}

/**
 * 当前是否存在仍有效的转化选牌框
 * @param {HTMLElement} [ignoreDialog] 正在关闭、应忽略的对话框
 * @returns {boolean}
 */
function isShoushaConfirmDialogOpen(ignoreDialog) {
	for (const dialog of Array.from(document.querySelectorAll(".dialog.decade-shousha-vcard"))) {
		if (!dialog?.isConnected) continue;
		if (ignoreDialog && (dialog === ignoreDialog || ignoreDialog.contains?.(dialog))) continue;
		if (dialog.classList.contains("removing") || dialog.classList.contains("closing")) continue;
		if (
			dialog.querySelector(".dialog-confirm") ||
			dialog.querySelector(".dui-shousha-footer") ||
			dialog.classList.contains("decade-shousha-has-confirm")
		) {
			return true;
		}
	}
	return false;
}

const SHOUSHA_FOOTER_CONFIRM_H = 60;
const SHOUSHA_FOOTER_PROGRESS_H = 28;
const SHOUSHA_FOOTER_HINT_H = 28;
const SHOUSHA_FOOTER_GAP = 6;
const SHOUSHA_CONTENT_PAD_Y = 16;

/**
 * 转化框底部栈（取消/多选确定 → 进度条 → 提示词）
 * @param {HTMLElement} dialog
 * @returns {HTMLElement}
 */
function ensureShoushaFooter(dialog) {
	let footer = dialog.querySelector(":scope > .dui-shousha-footer");
	if (!footer) {
		footer = ui.create.div(".dui-shousha-footer", dialog);
	}
	return footer;
}

/**
 * 解析 CSS 长度（px / vh / vmin 等）为像素
 * @param {string} raw
 * @returns {number}
 */
function parseCssLengthPx(raw) {
	const s = String(raw || "").trim();
	if (!s) return 0;
	if (s.endsWith("px")) return parseFloat(s) || 0;
	if (s.endsWith("vh")) return ((parseFloat(s) || 0) / 100) * (window.innerHeight || 0);
	if (s.endsWith("vw")) return ((parseFloat(s) || 0) / 100) * (window.innerWidth || 0);
	const n = parseFloat(s);
	return Number.isFinite(n) ? n : 0;
}

/**
 * 读取转化框牌区高度上限
 * @param {HTMLElement} dialog
 * @returns {number}
 */
function getShoushaFrameBodyMax(dialog) {
	const raw = getComputedStyle(dialog).getPropertyValue("--dui-shousha-frame-body-max").trim();
	// min(38vh, 380px) 需要拆开取较小值
	const minMatch = raw.match(/^min\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i);
	if (minMatch) {
		return Math.min(parseCssLengthPx(minMatch[1]), parseCssLengthPx(minMatch[2]));
	}
	const fallback = dialog.classList.contains("decade-shousha-no-nature") ? 480 : 380;
	return parseCssLengthPx(raw) || Math.min((window.innerHeight || 0) * 0.38, fallback);
}

/**
 * 按牌区实际高度写入 --dui-shousha-frame-body（有牌就包住，过高才裁切滚动）
 * @param {HTMLElement} dialog
 */
function syncShoushaFrameBody(dialog) {
	const content = dialog.querySelector(":scope > .content-container > .content");
	const buttons = content?.querySelector(":scope > .buttons");
	if (!buttons) {
		dialog.style.setProperty("--dui-shousha-frame-body", "0px");
		return;
	}

	const basic = buttons.querySelector(".dialog-basic");
	const trick = buttons.querySelector(".dialog-trick");
	let bodyH = 0;
	if (basic || trick) {
		bodyH = Math.max(basic?.offsetHeight || 0, trick?.offsetHeight || 0, basic?.scrollHeight || 0, trick?.scrollHeight || 0);
	}
	if (!bodyH) {
		bodyH = Math.max(buttons.offsetHeight || 0, buttons.scrollHeight || 0);
	}
	bodyH += SHOUSHA_CONTENT_PAD_Y;

	const maxH = getShoushaFrameBodyMax(dialog);
	if (maxH > 0 && bodyH > maxH) bodyH = maxH;
	if (bodyH < 0) bodyH = 0;

	dialog.style.setProperty("--dui-shousha-frame-body", `${Math.ceil(bodyH)}px`);
}

/**
 * 解析看破类可选择次数（优先事件 selectButton，其次 storage / 模式默认）
 * @param {Object} [evt]
 * @param {string[]} skillNames
 * @param {Object} [player]
 * @returns {number}
 */
function resolveKanpoSelectCount(evt, skillNames, player) {
	try {
		if (evt?.selectButton != null) {
			const range = get.select(evt.selectButton);
			if (range?.[1] > 0) return range[1];
		}
	} catch (e) {}

	const p = player || evt?.player;
	const names = (skillNames || []).map(n => String(n || "").replace(/_backup$/, ""));
	for (const id of names) {
		const base = id.replace(/_/g, "");
		const storageKey =
			id === "twkanpo" || base === "twkanpo"
				? "twkanpo"
				: id === "sbkanpo" || id === "sb_kanpo" || base === "sbkanpo"
					? "sbkanpo"
					: id === "yzk_kanpo" || base === "yzkkanpo"
						? "yzk_kanpo"
						: null;
		if (!storageKey || !p?.storage) continue;
		const storage = p.storage[storageKey];
		if (Array.isArray(storage) && typeof storage[0] === "number" && storage[0] > 0) {
			return storage[0];
		}
	}

	if (names.some(n => n === "twkanpo" || n.replace(/_/g, "") === "twkanpo")) return 3;
	try {
		return get.mode() !== "identity" ? 2 : 4;
	} catch (e) {
		return 2;
	}
}

/**
 * 解析转化框底部提示词（按技能场景切换）
 * @param {HTMLElement} dialog
 * @param {Object} [evt]
 * @returns {string}
 */
function resolveShoushaHint(dialog, evt) {
	evt = evt || _status.event;
	const skillNames = collectEventSkillNames(evt);
	const player = evt?.player || _status.event?.player;
	const isKanpo = hitSkillListAny(skillNames, KANPO_HINT_SKILLS);

	if (isKanpo) {
		const n = resolveKanpoSelectCount(evt, skillNames, player);
		return `你可以选择${n}次牌名，其他角色使用同牌名时，你可令其无效`;
	}

	// 普通视为转化（滔乱等）
	return "请选择视为转化的牌";
}

/**
 * 同步转化框 footer 高度与挂载（进度条 / 提示）
 * 高度按实际存在的子项累加：有则加，无则不占位；牌区高度同步实测
 * @param {HTMLElement} [dialog]
 */
export function syncShoushaFooterLayout(dialog) {
	if (!dialog?.classList?.contains("decade-shousha-vcard")) {
		dialog = document.querySelector(".dialog.decade-shousha-vcard:not(.removing):not(.closing)");
	}
	if (!dialog?.classList?.contains("decade-shousha-vcard")) return;

	const footer = ensureShoushaFooter(dialog);
	const confirm = dialog._confirm || footer.querySelector(".dialog-confirm") || dialog.querySelector(".dialog-confirm");
	if (confirm && confirm.parentElement !== footer) {
		footer.appendChild(confirm);
	}

	const needOk =
		dialog.classList.contains("decade-shousha-multi") || dialog.classList.contains("decade-shousha-no-nature");
	if (confirm) {
		if (needOk) {
			confirm.classList.remove("decade-shousha-no-ok");
			confirm.ok?.classList.remove("decade-shousha-hidden-ok");
			if (confirm.ok) confirm.ok.style.removeProperty("display");
		} else {
			confirm.classList.add("decade-shousha-no-ok");
			if (confirm.ok) {
				confirm.ok.classList.add("decade-shousha-hidden-ok");
				confirm.ok.style.setProperty("display", "none", "important");
			}
		}
	}

	const hasCancel = Boolean(
		confirm?.cancel && confirm.cancel.style.display !== "none" && getComputedStyle(confirm.cancel).display !== "none"
	);
	const confirmVisible = Boolean(confirm && (needOk || hasCancel));
	if (confirm) {
		confirm.classList.toggle("decade-shousha-confirm-hidden", !confirmVisible);
		if (confirmVisible) {
			confirm.style.removeProperty("display");
		} else {
			confirm.style.setProperty("display", "none", "important");
		}
	}

	const progressBar = document.getElementById("jindutiaopl");
	if (progressBar) {
		progressBar.classList.add("dui-pcd-progress-bar", "dui-shousha-progress-bar");
		progressBar.style.removeProperty("position");
		progressBar.style.removeProperty("left");
		progressBar.style.removeProperty("bottom");
		progressBar.style.removeProperty("width");
		progressBar.style.removeProperty("margin");
		if (progressBar.parentElement !== footer) footer.appendChild(progressBar);
	}

	const hintText = resolveShoushaHint(dialog, _status.event)?.trim() || "";
	let hint = footer.querySelector(".dui-shousha-hint");
	if (hintText) {
		if (!hint) hint = ui.create.div(".dui-shousha-hint", footer);
		hint.textContent = hintText;
		hint.style.removeProperty("display");
	} else if (hint) {
		hint.remove();
		hint = null;
	}

	// DOM 顺序：取消/确定 → 进度条 → 提示词
	if (confirm?.parentElement === footer) footer.appendChild(confirm);
	if (progressBar?.parentElement === footer) footer.appendChild(progressBar);
	if (hint?.parentElement === footer) footer.appendChild(hint);

	if (progressBar?.parentElement === footer) {
		try {
			import("../ui/progress-bar.js").then(m => m.fitProgressFillToTrack?.(progressBar)).catch(() => {});
		} catch (e) {}
		requestAnimationFrame(() => {
			try {
				import("../ui/progress-bar.js").then(m => m.fitProgressFillToTrack?.(progressBar)).catch(() => {});
			} catch (e) {}
		});
	}

	const hasProgress = Boolean(progressBar?.parentElement === footer && progressBar.isConnected);
	const hasHint = Boolean(hint?.isConnected && hintText);
	const stackCount = (confirmVisible ? 1 : 0) + (hasProgress ? 1 : 0) + (hasHint ? 1 : 0);

	dialog.classList.toggle("decade-shousha-has-confirm", confirmVisible);
	footer.style.display = stackCount > 0 ? "flex" : "none";
	footer.style.removeProperty("height");
	footer.style.removeProperty("min-height");

	// 先按内容自适应，再实测写入变量（供牌区 bottom / 外框总高）
	let footerH = 0;
	if (stackCount > 0) {
		footerH = Math.ceil(footer.offsetHeight || 0);
		if (!footerH) {
			const confirmH = confirmVisible ? SHOUSHA_FOOTER_CONFIRM_H : 0;
			const progressH = hasProgress ? progressBar.offsetHeight || SHOUSHA_FOOTER_PROGRESS_H : 0;
			const hintH = hasHint ? hint.offsetHeight || SHOUSHA_FOOTER_HINT_H : 0;
			const gapH = Math.max(0, stackCount - 1) * SHOUSHA_FOOTER_GAP;
			footerH = confirmH + progressH + hintH + gapH + 12;
		}
	}
	dialog.style.setProperty("--dui-shousha-footer-h", `${footerH}px`);

	syncShoushaFrameBody(dialog);
}

/**
 * 转化框打开期间：暂时隐藏底部 lbtn-confirm（不销毁，关闭后可恢复）
 */
function hideShoushaBottomConfirm() {
	if (!isShoushaConfirmDialogOpen()) return;
	for (const el of Array.from(
		document.querySelectorAll("#dui-controls > .control.lbtn-confirm, #dui-controls > .control.combo-control.lbtn-confirm")
	)) {
		if (!el?.classList) continue;
		el.classList.add("decade-shousha-temp-hide-confirm");
		try {
			el.style?.setProperty?.("display", "none", "important");
			el.style?.setProperty?.("opacity", "0", "important");
			el.style?.setProperty?.("pointer-events", "none", "important");
		} catch (e) {}
	}
	try {
		if (ui.confirm?.classList) {
			ui.confirm.classList.add("decade-shousha-temp-hide-confirm");
			ui.confirm.style?.setProperty?.("display", "none", "important");
			ui.confirm.style?.setProperty?.("opacity", "0", "important");
			ui.confirm.style?.setProperty?.("pointer-events", "none", "important");
		}
	} catch (e) {}
}

/**
 * 清掉临时隐藏样式并恢复可见。
 * 注意：不能只 removeProperty("opacity")——.control 默认 opacity:0，创建时靠 inline opacity:1；
 * 删掉后会退回透明，滔乱 backup 选手牌时确定栏「在但看不见」。
 * @param {HTMLElement} [el]
 */
function clearShoushaTempHideStyles(el) {
	if (!el?.classList) return;
	el.classList.remove("decade-shousha-temp-hide-confirm", "decade-shousha-hidden-control");
	try {
		el.style?.removeProperty?.("display");
		el.style?.removeProperty?.("pointer-events");
		el.style?.removeProperty?.("opacity"); // 先去掉 hide 时的 opacity:0 !important
		// 控制条必须写回 1（.control 默认 CSS 为 0）
		if (el.classList.contains("control") || el.classList.contains("lbtn-confirm") || el === ui.confirm) {
			el.style.opacity = "1";
		}
	} catch (e) {}
	try {
		el.show?.();
	} catch (e) {}
}

/**
 * 确保底部确定栏可见（写回 opacity:1）
 * @param {HTMLElement} [el]
 */
function ensureBottomConfirmVisible(el = ui.confirm) {
	if (!el) return;
	try {
		el.classList.remove("decade-shousha-temp-hide-confirm", "decade-shousha-hidden-control", "removing", "closing");
		el.style?.removeProperty?.("display");
		el.style?.removeProperty?.("pointer-events");
		el.style?.removeProperty?.("opacity");
		el.style.opacity = "1";
		el.show?.();
	} catch (e) {}
}

/**
 * 底部确定栏是否卡在 closing/removing（复用后不会显示，要点屏幕才好）
 * @param {HTMLElement} [el]
 * @returns {boolean}
 */
function isBottomConfirmStuck(el) {
	if (!el?.classList) return false;
	return el.classList.contains("removing") || el.classList.contains("closing");
}

/**
 * 拆掉僵死的底部确定栏，让后续 ui.create.confirm / game.check 能重建
 * @returns {boolean} 是否拆过
 */
function disposeStuckBottomConfirm() {
	let disposed = false;
	const confirm = ui.confirm;
	if (confirm && (!confirm.isConnected || isBottomConfirmStuck(confirm))) {
		try {
			confirm.remove?.();
		} catch (e) {}
		try {
			ui.controls?.remove?.(confirm);
		} catch (e) {}
		try {
			delete ui.confirm;
		} catch (e) {
			ui.confirm = null;
		}
		disposed = true;
	}
	for (const el of Array.from(
		document.querySelectorAll("#dui-controls > .control.lbtn-confirm, #dui-controls > .control.combo-control.lbtn-confirm")
	)) {
		if (el === ui.confirm) {
			ensureBottomConfirmVisible(el);
			continue;
		}
		// 游离/僵死副本
		try {
			el.remove?.();
			disposed = true;
		} catch (e) {}
	}
	if (ui.confirm && !ui.confirm.isConnected) {
		try {
			delete ui.confirm;
		} catch (e) {
			ui.confirm = null;
		}
		disposed = true;
	}
	return disposed;
}

/**
 * 清掉我们挂在事件上的框内确认标记
 * @param {Object} [root]
 */
function clearShoushaOwnedConfirmFlags(root, clearUseRespond = false) {
	let cur = root || _status.event;
	for (let i = 0; i < 12 && cur; i++) {
		const owned = cur._decade_shoushaOwnedConfirm || cur.customConfirm === ui.click._shoushaConfirm;
		const strayParent =
			clearUseRespond &&
			(cur.name === "chooseToUse" || cur.name === "chooseToRespond") &&
			cur.noconfirm &&
			(!cur.customConfirm || cur.customConfirm === ui.click._shoushaConfirm);
		if (owned || strayParent) {
			try {
				if (typeof cur.set === "function") {
					cur.set("noconfirm", false);
					cur.set("customConfirm");
				}
			} catch (e) {}
			try {
				cur.noconfirm = false;
				delete cur.customConfirm;
				delete cur._decade_shoushaOwnedConfirm;
			} catch (e) {}
		}
		cur = cur.getParent?.();
	}
}

/**
 * 转化框关闭后：恢复底部确定/取消
 * @param {boolean|HTMLElement} [forceOrIgnore] true 强制恢复；或传入正在关闭的 dialog
 */
function restoreShoushaBottomConfirm(forceOrIgnore) {
	const force = forceOrIgnore === true;
	const ignoreDialog = forceOrIgnore && forceOrIgnore !== true ? forceOrIgnore : null;
	if (!force && isShoushaConfirmDialogOpen(ignoreDialog)) return;

	// 清掉已关闭/残留转化框上的确定栏，避免 CSS :has 继续藏底部确认
	for (const dialog of Array.from(document.querySelectorAll(".dialog.decade-shousha-vcard"))) {
		const closing = ignoreDialog && (dialog === ignoreDialog || ignoreDialog.contains?.(dialog));
		const gone = !dialog.isConnected || dialog.classList.contains("removing") || dialog.classList.contains("closing");
		const notActive = Array.isArray(ui.dialogs) && !ui.dialogs.includes(dialog);
		if (closing || gone || notActive || force) {
			try {
				dialog.querySelector(".dialog-confirm")?.remove();
				delete dialog._confirm;
			} catch (e) {}
		}
	}

	for (const el of Array.from(document.querySelectorAll(".decade-shousha-temp-hide-confirm"))) {
		clearShoushaTempHideStyles(el);
	}

	clearShoushaOwnedConfirmFlags(_status.event, true);
	// 关键点：拆掉卡在 removing 的 lbtn-confirm，否则 create.confirm 会复用僵尸节点
	disposeStuckBottomConfirm();

	try {
		if (_status.event?.isMine?.() && !isShoushaConfirmDialogOpen(ignoreDialog)) {
			game.check();
			try {
				ui.updatec?.();
			} catch (e) {}
			ensureBottomConfirmVisible(ui.confirm);
			// 若 check 后仍无可用确定栏（或又带上 removing），强制走一遍 create.confirm
			const evt = _status.event;
			if (
				evt &&
				!evt.noconfirm &&
				!_status.noconfirm &&
				(evt.name === "chooseToUse" ||
					evt.name === "chooseToRespond" ||
					String(evt.skill || "").includes("_backup") ||
					evt.name === "chooseButton" ||
					evt.name === "chooseButtonTarget")
			) {
				if (!ui.confirm?.isConnected || isBottomConfirmStuck(ui.confirm)) {
					disposeStuckBottomConfirm();
					try {
						const ok = game.check(evt);
						let str = "";
						if (ok) str += "o";
						if (!evt.forced && !evt.fakeforce) {
							str += "c";
						}
						if (str && typeof ui.create.confirm === "function") {
							ui.create.confirm(str);
						}
					} catch (e) {}
				}
				ensureBottomConfirmVisible(ui.confirm);
			}
		}
	} catch (e) {}
}

/**
 * 安排多次恢复，覆盖 chooseButton → backup 出牌的异步切换
 * @param {HTMLElement} [closingDialog]
 */
function scheduleRestoreShoushaBottomConfirm(closingDialog) {
	const run = () => {
		try {
			restoreShoushaBottomConfirm(closingDialog || true);
		} catch (e) {}
	};
	// 不立刻 run：此时常仍在 ui.click.ok / resume 过程中
	requestAnimationFrame(run);
	setTimeout(run, 0);
	setTimeout(run, 30);
	setTimeout(run, 80);
	setTimeout(run, 160);
	setTimeout(run, 320);
}

/**
 * 创建手杀转化框底部栏：取消/确定 → 进度条 → 提示词（单选无确定；多选保留确定/重新选择）
 * @param {HTMLElement|null} dialog
 * @param {Object} [evt]
 * @returns {HTMLElement|undefined}
 */
function createShoushaConfirm(dialog, evt) {
	if (dialog) {
		const footer = ensureShoushaFooter(dialog);
		let confirm = dialog._confirm;
		if (!confirm) {
			confirm = ui.create.div(".dialog-confirm");
			confirm.ok = ui.create.div(".dialog-confirm-button-ok.unclickable", confirm, e => {
				e.stopImmediatePropagation();
				if (confirm.ok.classList.contains("unclickable")) return;
				if (confirm.ok.classList.contains("decade-shousha-hidden-ok")) return;
				ui.click.ok();
				scheduleRestoreShoushaBottomConfirm(dialog);
			});
			confirm.cancel = ui.create.div(".dialog-confirm-button-cancel", confirm, () => {
				ui.click.cancel();
				scheduleRestoreShoushaBottomConfirm(dialog);
			});
		}
		const needReset =
			dialog.classList.contains("decade-shousha-multi") ||
			dialog.classList.contains("decade-shousha-no-nature");
		if (needReset && !confirm.reset) {
			const ext = getExtensionName();
			confirm.reset = ui.create.div(".dialog-confirm-button-reset.disabled", confirm, e => {
				e.stopImmediatePropagation();
				if (confirm.reset.classList.contains("disabled")) return;
				confirm.reset.classList.add("glow");
				clearShoushaVcardSelection(dialog);
			});
			const resetImg = document.createElement("img");
			resetImg.draggable = false;
			resetImg.alt = "重新选择";
			resetImg.src = `${lib.assetURL}extension/${ext}/ui/assets/lbtn/uibutton/chongxin.png`;
			confirm.reset.appendChild(resetImg);
			confirm.classList.add("has-reset");
			dialog.classList.add("decade-shousha-multi");
		}
		dialog._confirm = confirm;
		footer.appendChild(confirm);
		dialog.classList.add("decade-shousha-has-confirm");

		if (needReset) {
			confirm.classList.remove("decade-shousha-no-ok");
			confirm.ok?.classList.remove("decade-shousha-hidden-ok");
			if (confirm.ok) confirm.ok.style.removeProperty("display");
			scheduleHideShoushaClearControls();
		} else {
			// 单选转化：不要确定，点牌名即选
			confirm.classList.add("decade-shousha-no-ok");
			if (confirm.ok) {
				confirm.ok.classList.add("decade-shousha-hidden-ok");
				confirm.ok.style.setProperty("display", "none", "important");
			}
		}

		syncShoushaFooterLayout(dialog);
		try {
			import("../ui/progress-bar.js").then(m => {
				m.syncProgressBarToPcdDialog?.();
				syncShoushaFooterLayout(dialog);
			}).catch(() => {});
		} catch (e) {}
		requestAnimationFrame(() => syncShoushaFooterLayout(dialog));
		setTimeout(() => syncShoushaFooterLayout(dialog), 50);

		hideShoushaBottomConfirm();
	}
	bindShoushaConfirmToEvent(evt || _status.event);
	return dialog ? dialog._confirm : undefined;
}

/**
 * 覆写 vcard 按钮与对话框布局
 * @returns {Function[]}
 */
function applyShoushaDialogOverrides() {
	if (!getConfig()) return [];
	const restoreFns = [];
	const extName = getExtensionName();
	const cardTitleRel = getCardTitleAssetRel();

	ui.click._shoushaConfirm = clickShoushaConfirm;
	ui.create._shoushaConfirm = createShoushaConfirm;

	restoreFns.push(
		wrapAround(ui.create, "confirm", function (original, ...args) {
			if (isShoushaConfirmDialogOpen()) {
				hideShoushaBottomConfirm();
				return ui.confirm;
			}
			// removing 与 closing 一样视为失效，避免复用僵尸节点（滔乱框关后要点屏幕才出确定）
			try {
				if (ui.confirm && (!ui.confirm.isConnected || isBottomConfirmStuck(ui.confirm))) {
					disposeStuckBottomConfirm();
				}
			} catch (e) {}
			const result = original.apply(this, args);
			try {
				if (ui.confirm) {
					ui.confirm.classList.remove("removing", "closing");
					ensureBottomConfirmVisible(ui.confirm);
				}
			} catch (e) {}
			return result;
		})
	);

	if (lib.element?.dialog?.close) {
		restoreFns.push(
			wrapAround(lib.element.dialog, "close", function (original, ...args) {
				const wasShousha = this?.classList?.contains("decade-shousha-vcard");
				const result = original.apply(this, args);
				if (wasShousha) scheduleRestoreShoushaBottomConfirm(this);
				return result;
			})
		);
	}

	restoreFns.push(
		wrapAround(ui.click, "ok", function (original, ...args) {
			const evt = _status.event;
			const wasShoushaChooseButton =
				(evt?.name === "chooseButton" || evt?.name === "chooseButtonTarget") &&
				(evt?._decade_shoushaOwnedConfirm ||
					evt?.customConfirm === ui.click._shoushaConfirm ||
					evt?.dialog?.classList?.contains("decade-shousha-vcard") ||
					Boolean(document.querySelector(".dialog.decade-shousha-vcard .dialog-confirm")));
			const result = original.apply(this, args);
			if (wasShoushaChooseButton) scheduleRestoreShoushaBottomConfirm(true);
			return result;
		})
	);

	restoreFns.push(
		wrapAround(ui.click, "cancel", function (original, ...args) {
			const evt = _status.event;
			const wasShoushaChooseButton =
				(evt?.name === "chooseButton" || evt?.name === "chooseButtonTarget") &&
				(evt?._decade_shoushaOwnedConfirm ||
					evt?.customConfirm === ui.click._shoushaConfirm ||
					evt?.dialog?.classList?.contains("decade-shousha-vcard") ||
					Boolean(document.querySelector(".dialog.decade-shousha-vcard .dialog-confirm")));
			const result = original.apply(this, args);
			if (wasShoushaChooseButton) scheduleRestoreShoushaBottomConfirm(true);
			return result;
		})
	);

	restoreFns.push(
		wrapAround(ui.create, "button", function (original, ...args) {
			let node = original.apply(this, args);
			try {
				const evt = _status.event;
				const skillNames = collectEventSkillNames(evt);
				if (hitBannedSkill(skillNames, BANNED_VCARD_SKILLS)) return node;
				if (!/vcard|shousha/.test(String(args[1] || ""))) return node;
				const position = args[2];
				// 重建分列时 parent 可能暂未挂到 content，只要求在 buttons 容器内
				if (position && !(position.classList?.contains("buttons") || position.classList?.contains("dialog-basic") || position.classList?.contains("dialog-trick") || position.classList?.contains("dialog-delay"))) {
					return node;
				}
				if (position?.classList?.contains("noshousha")) return node;
				if (node?.dataset?.vcard === "true") return node;

				let item = args[0];
				if (typeof item === "string") {
					if (!lib.card[item]?.enable) return node;
					item = [get.type(item), "", item];
				} else if (Array.isArray(item) && item.length >= 3) {
					// vcard link
				} else if (item && typeof item === "object" && item.name) {
					item = [get.type(item.name), "", item.name, item.nature];
				}

				const parent = position || node.parentNode;
				if (parent?.removeChild && node.parentNode === parent) parent.removeChild(node);
				node = ui.create.card(parent || undefined, "noclick", args[3]);
				// 先打标，避免 init → applyCardSkin 套上分层整卡
				node.classList.add("button", "vcard");
				node.dataset.vcard = "true";
				node.dataset.layeredCard = "0";
				node.init(item);
				node.link = item;
				node.classList.remove("layered-card", "decade-card", "fullskin", "infohidden");
				ui.create.div(".vcard-selected-border", node);
				if (!args[3]) {
					node.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.button);
				}

				const natureMap = {
					fire: `huo${node.name}`,
					thunder: `lei${node.name}`,
					stab: `ci${node.name}`,
					ice: `bing${node.name}`,
					poison: `du${node.name}`,
					kami: `kami${node.name}`,
				};
				for (const i of Object.keys(lib.element.button || {})) {
					node[i] = lib.element.button[i];
				}
				for (const key in node.node || {}) {
					if (node.node[key]?.classList) node.node[key].classList.add("forcehide");
				}
				if (node.$name) node.$name.classList.add("forcehide");
				// 分层卡额外子节点一并隐藏（选中计数 caption 需保留）
				for (const child of Array.from(node.children || [])) {
					if (child.classList?.contains("vcard-selected-border")) continue;
					if (child.classList?.contains("caption")) continue;
					if (child.classList?.contains("--name")) continue;
					child.classList?.add("forcehide");
				}

				const titleKey = natureMap[node.nature] || `${node.nature || ""}${node.name}`;
				const url = `${cardTitleRel}/${titleKey}.png`;
				const absolute = lib.assetURL + url;
				const img = new Image();
				img.src = absolute;
				img.node = node;
				img.onerror = function () {
					const cardNode = this.node;
					if (!cardNode) return;
					cardNode.style.backgroundImage = "";
					ui.create.div(
						".--name",
						cardNode,
						`<span data-nature="${cardNode.nature || ""}">${get.translation(cardNode.name)}</span>` +
							(cardNode.nature
								? `<span data-nature="${cardNode.nature}" style="color: white;-webkit-text-stroke: 0;font-size: ${
										(document.body.offsetWidth / 100) * 1
									}px;">${get.translation(cardNode.nature)}</span>`
								: ""),
						{
							right: "5px",
							bottom: "-10%",
							fontSize:
								(document.body.offsetWidth / 100) *
									(get.translation(cardNode.name).length < 2 ? 3 : 1.5) +
								"px",
							fontWeight: 900,
							fontFamily: "shousha",
							webkitTextStroke: ".5px white",
							color: "black",
						}
					);
				};

				Object.assign(node.style, {
					width: `${(document.body.offsetWidth / 100) * 10}px`,
					height: `${(document.body.offsetWidth / 100) * 5}px`,
					background: "none",
					backgroundImage: `url("${absolute}")`,
					backgroundSize: "100% 100%",
					backgroundRepeat: "no-repeat",
					boxShadow: "none",
				});
				if (typeof node.setBackgroundImage === "function") {
					try {
						node.setBackgroundImage(url);
					} catch (e) {}
				}
			} catch (e) {}
			return node;
		})
	);

	if (lib.element?.dialog?.add) {
		restoreFns.push(
			wrapAround(lib.element.dialog, "add", function (original, ...args) {
				const result = original.apply(this, args);
				try {
					const evt = _status.event;
					const skillNames = collectEventSkillNames(evt);
					if (hitBannedSkill(skillNames, BANNED_VCARD_SKILLS)) return result;
					if (!args[0] || !/vcard|shousha/.test(args[0][1])) return result;
					if (!this.classList?.contains("dialog") || this.classList.contains("noshousha")) return result;

					const buttonLists = this.querySelectorAll(".buttons");
					if (!buttonLists?.length) return result;
					const buttons = buttonLists[buttonLists.length - 1];
					const cards = [...buttons.children].filter(
						card => card.classList.contains("button") && (!card.parentNode || card.parentNode === buttons)
					);
					const basic = ui.create.div(".dialog-basic", buttons);
					const trick = ui.create.div(".dialog-trick", buttons);
					const hasBasic = cards.some(card => get.type(card) === "basic");
					// 普通锦囊 + 延时锦囊合并为一栏
					const hasTrick = cards.some(card => {
						const type = get.type(card);
						return type !== "basic" && type !== "equip";
					});
					const multi = isMultiSelectConvert(skillNames);
					let nonature =
						Boolean(evt?._decade_shoushaNoNature) ||
						this.classList.contains("decade-shousha-no-nature") ||
						isNoNatureConvert(skillNames);
					let vertical =
						Boolean(evt?._decade_shoushaVertical) ||
						this.classList.contains("decade-shousha-vertical") ||
						skillNames.some(skill => VERTICAL_SKILLS.includes(skill)) ||
						multi;
					const onlyUsable =
						Boolean(evt?._decade_shoushaOnlyUsable) ||
						this.classList.contains("decade-shousha-only-usable") ||
						skillNames.some(skill => ONLY_USABLE_SKILLS.includes(skill));

					if (nonature) this.classList.add("decade-shousha-no-nature");
					if (vertical) this.classList.add("decade-shousha-vertical");
					if (onlyUsable) this.classList.add("decade-shousha-only-usable");
					if (multi) this.classList.add("decade-shousha-multi");
					if (!hasBasic) basic.remove();
					if (!hasTrick) trick.remove();
					if (
						(!hasBasic && !hasTrick) ||
						cards.every(card => !lib.card[card.name]?.content)
					) {
						return result;
					}

					this.classList.add("decade-shousha-vcard");
					this.classList.add(
						...skillNames
							.filter(name => name && (get.info(name) || isMultiSelectConvert(name) || isNoNatureConvert(name)))
							.map(name => {
								const id = String(name).replace(/_backup$/, "");
								return `skill-${id === "sb_kanpo" ? "sbkanpo" : id}`;
							})
					);
					cards.forEach(card => buttons.removeChild(card));
					this.buttons.remove(...cards);
					Object.assign(buttons.style, {
						display: "flex",
						justifyContent: "center",
						flexWrap: "nowrap",
						zoom: 1,
					});
					ui.update();

					if (!onlyUsable) {
						const inpileNames = lib.inpile.filter(name => {
							if (get.type(name) === "equip") return false;
							if (
								!/basic|trick/.test(get.type(name)) &&
								!cards.some(card => get.type(card) === get.type(name))
							) {
								return false;
							}
							return true;
						});
						const orderedNames = orderNamesByPreferred(inpileNames, [
							...SHOUSHA_BASIC_ORDER,
							...SHOUSHA_TRICK_ORDER,
						]);
						const natureOrder = orderNamesByPreferred(
							Array.from(lib.inpile_nature || []),
							SHOUSHA_SHA_NATURE_ORDER
						);

						for (const name of orderedNames) {
							const card = cards.filter(c => c.name === name && !c.nature)[0];
							const button = ui.create.button(
								card?.link ? card.link : [get.type(name), "", name],
								"vcard",
								buttons
							);
							if (card) {
								button.classList.add("selectable");
								this.buttons.push(button);
							}
							// 杀闪之后插入火杀雷杀（无属性模式不展开）
							if (name === "shan" && !nonature) {
								for (const nature of natureOrder) {
									const natureCard = cards.filter(c => c.name === "sha" && c.nature === nature)[0];
									const natureButton = ui.create.button(
										natureCard?.link ? natureCard.link : [get.type("sha"), "", "sha", nature],
										"vcard",
										buttons
									);
									if (natureCard) this.buttons.push(natureButton);
								}
							}
						}
					}

					while (cards.length) {
						const card = cards.shift();
						if (
							card &&
							!this.buttons.some(cardx => card.name === cardx.name && card.nature === cardx.nature)
						) {
							const button = ui.create.button(
								card.link ? card.link : [get.type(card.name), "", card.name, card.nature],
								"vcard",
								buttons
							);
							button.classList.add("selectable");
							this.buttons.push(button);
						}
					}

					for (const card of [...buttons.children]) {
						if (!card.classList.contains("button")) continue;
						const type = get.type(card.name);
						if (type === "basic") basic.appendChild(card);
						else if (type === "equip") card.remove();
						else trick.appendChild(card);
					}

					ui.create._shoushaConfirm(this, _status.event);
					this._shoushaButton = true;
					try {
						const title =
							resolveShoushaTitleFromSkills(skillNames, evt?.player || _status.event?.player) || "选牌";
						enhanceShoushaVcardDialogFrame(this, title);
					} catch (e) {}
					if (multi || nonature) scheduleHideShoushaClearControls();
					hideShoushaBottomConfirm();
					// 再同步一次确定栏（选牌数变化前先落到初始 unclickable）
					try {
						const confirmEvt = _status.event;
						if (typeof confirmEvt?.customConfirm === "function") {
							confirmEvt.customConfirm(false, confirmEvt);
						} else if (ui.click._shoushaConfirm) {
							ui.click._shoushaConfirm(false, confirmEvt);
						}
					} catch (e) {}
					bindShoushaConfirmToEvent(_status.event);
					requestAnimationFrame(hideShoushaBottomConfirm);
					setTimeout(hideShoushaBottomConfirm, 0);
					setTimeout(hideShoushaBottomConfirm, 60);
				} catch (e) {}
				return result;
			})
		);
	}

	return restoreFns;
}

/**
 * 注册 chooseButtonBegin：技能标记 + 手杀确认栏
 */
function registerChooseButtonBeginHook() {
	const skillName = `__replaceDialogShousha_chooseButtonBegin_${getExtensionName()}`;
	if (lib.skill[skillName]) return;

	if (!lib.__chooseTempCardSkill) lib.__chooseTempCardSkill = ["aocai", "xiansi2"];
	if (!lib.__chooseTempCardBannedSkill) lib.__chooseTempCardBannedSkill = ["sbqicai_gain"];
	if (!lib.__chooseAddTempCardSkill) {
		lib.__chooseAddTempCardSkill = ["sbguanxing_use", "sb_guanxing_use", "yzk_guanxing_use"];
	}

	lib.skill[skillName] = {
		trigger: { player: "chooseButtonBegin" },
		silent: true,
		firstDo: true,
		priority: 100,
		content() {
			const trigger = this.trigger;
			if (!trigger || typeof trigger.getParent !== "function") return;
			const parent = trigger.getParent();
			const result = parent?.result;
			const test = reg =>
				(parent && reg.test(parent.name)) ||
				(parent && reg.test(parent.skill)) ||
				(result?.skill && reg.test(result.skill));

			if (lib.__chooseTempCardSkill.length) {
				const reg = new RegExp("^(" + lib.__chooseTempCardSkill.join("|") + ")$");
				if (test(reg)) trigger._chooseTempCard = true;
			}
			if (lib.__chooseTempCardBannedSkill.length) {
				const reg = new RegExp("^(" + lib.__chooseTempCardBannedSkill.join("|") + ")$");
				if (test(reg)) trigger._notchooseTempCard = true;
			}
			if (lib.__chooseAddTempCardSkill.length) {
				const reg = new RegExp("^(" + lib.__chooseAddTempCardSkill.join("|") + ")$");
				if (test(reg)) trigger._chooseAddTempCard = true;
			}

			if (trigger.dialog?._shoushaButton || trigger.dialog?.classList?.contains("decade-shousha-vcard")) {
				trigger.set("noconfirm", true);
				trigger.set("customConfirm", ui.click._shoushaConfirm);
				bindShoushaConfirmToEvent(trigger);
				try {
					ui.create._shoushaConfirm?.(trigger.dialog, trigger);
				} catch (e) {}
				hideShoushaBottomConfirm();
			}

			if (isMultiSelectConvert(parent?.name) || isNoNatureConvert(parent?.name)) {
				const controls = parent.controls;
				trigger._decade_shoushaNoNature = true;
				trigger._decade_shoushaVertical = true;
				trigger._decade_shoushaMulti = true;
				if (controls?.[0]) {
					controls[0].classList.add("decade-shousha-hidden-control");
				}
				if (trigger.dialog) {
					trigger.dialog.classList.add(
						"decade-shousha-no-nature",
						"decade-shousha-vertical",
						"decade-shousha-multi"
					);
					try {
						ui.create._shoushaConfirm?.(trigger.dialog, trigger);
					} catch (e) {}
				}
				scheduleHideShoushaClearControls();
				hideShoushaBottomConfirm();
			}
		},
	};
	game.addGlobalSkill?.(skillName);
}

/**
 * 对话框按钮 → 手牌区临时卡牌（chooseButton）
 * @param {Object} evt
 */
function applyChooseButtonTempCard(evt) {
	if (!getConfig()) return;
	if (evt._notchooseTempCard) return;
	if (!(evt.isMine?.() || evt.player?.isOnline?.())) return;

	const ownerFilter = card => get.owner(card.link || card) === evt.player;
	let dialog =
		(typeof evt.dialog === "number" ? get.idDialog(evt.dialog) : evt.dialog) ||
		(Array.isArray(evt.createDialog) ? null : ui.dialog);

	const dialogOk =
		(dialog?.buttons?.length && dialog.buttons.every(ownerFilter)) ||
		(Array.isArray(evt.createDialog) &&
			evt.createDialog.every(list =>
				Array.isArray(list)
					? (get.itemtype(list[0]) === "cards" && list[0].every(ownerFilter)) ||
						(get.itemtype(list) === "cards" && list.every(ownerFilter))
					: true
			)) ||
		evt._chooseTempCard;

	if (!dialogOk) return;

	const parent = evt.getParent?.();
	const id = lib.status.videoId++;
	const filter = evt.filterButton || (() => true);
	const select = evt.selectButton;
	const filterTarget = parent?._backup && parent.filterTarget;
	const selectTarget = parent?._backup && parent.selectTarget;
	const skill =
		evt.skill || parent?.skill || parent?.result?.skill || (lib.skill[parent?.name] && parent.name);

	const cleanup = event => {
		if (event.__event__) event = event.__event__;
		if (event.step > 0) {
			if (event.result === "ai") {
				event.filterButton = event.__ofilter;
				event.selectButton = event.__oselect;
				event.filterTarget = event.__filterTarget;
				event.selectTarget = event.__selectTarget;
				delete event.filterCard;
				delete event.selectCard;
				delete event.position;
				delete event.complexCard;
				delete event.complexSelect;
				delete event.custom?.add?.card;
			}
			if (event._selectableCards) {
				game.broadcastAll(cards => {
					cards.forEach(card => card.remove());
				}, event._selectableCards);
			}
			if (event._hiddenCards) {
				game.broadcastAll(cards => {
					cards.forEach(card => card.classList.remove("forcehide"));
				}, event._hiddenCards);
			}
			if (ui.__tempDialog__) {
				ui.__tempDialog__.close();
				delete ui.__tempDialog__;
			}
			event.player.update();
			if (event.player === game.me) ui.updatehl();
		}
	};

	const add = () => {
		ui.selected.buttons.length = 0;
		ui.selected.buttons.addArray(ui.selected.cards.map(card => card.button || card));
	};

	game.broadcastAll(
		(dialogId, player, me, skillName, event) => {
			if (game.me !== player && game.me !== me) return;
			let dlg = event.dialog;
			if (typeof dlg === "number") dlg = get.idDialog(dlg);
			if (Array.isArray(event.createDialog) && !dlg) {
				dlg = ui.create.dialog.apply(this, [...event.createDialog, "hidden"]);
			}
			if (!dlg) dlg = ui.dialog;
			if (!dlg) return;
			ui.dialogs.add(dlg);
			dlg.videoId = dialogId;
			dlg.classList.add("forcehide", "temp-card-hidden-dialog");
			if (lib.skill[event.skill || skillName] && game.me === player) {
				ui.__tempDialog__ = ui.create.dialog(
					`###${get.skillTranslation(event.skill || skillName, player)}###${get.skillInfoTranslation(
						event.skill || skillName,
						player
					)}`
				);
				ui.dialogs.remove(ui.__tempDialog__);
			}
		},
		id,
		evt.player,
		game.me,
		skill,
		evt
	);

	dialog = get.idDialog(id);
	if (!dialog?.buttons) return;

	const player = evt.player;
	evt.set("dialog", id);
	evt.set("closeDialog", true);
	evt.set("_hiddenCards", player.getCards("hs"));

	if (!evt._chooseAddTempCard) {
		game.broadcastAll(p => {
			p.getCards("hs").forEach(card => card.classList.add("forcehide"));
		}, player);
	}

	const cards = dialog.buttons
		.sort((a, b) => {
			const getNum = c => (c.link?.gaintag && c.link.gaintag.length) || 0;
			return getNum(a) - getNum(b);
		})
		.map(button => {
			if (!button.cloneNode || !button.classList?.contains("card")) return;
			const card = ui.create.card().init(button.link);
			card.classList.add("temp-card");
			card.link = button.link;
			card.button = button;
			card.dataset.tempCard = true;
			if (button.link?.gaintag) card.addGaintag(button.link.gaintag);
			skinTempCard(card);
			return card;
		})
		.filter(Boolean);

	evt.set("_selectableCards", cards);
	cards.forEach(card => {
		game.broadcast(
			(c, link) => {
				if (!c) return;
				c.classList.add("temp-card");
				c.link = link;
				c.dataset.tempCard = true;
			},
			card,
			card.link
		);
	});

	player.directgains(
		cards,
		null,
		cards.some(card => card.gaintag?.length) ? null : evt.skill || skill
	);

	if (!evt._chooseAddTempCard) {
		game.broadcastAll(
			(cardList, p) => {
				const hand = get.is.singleHandcard() ? p.node.handcards1 : p.node.handcards2;
				cardList
					.slice()
					.reverse()
					.forEach(card => {
						hand.insertBefore(card, hand.firstChild);
					});
				hand.parentNode.scrollLeft = 0;
				p.update();
				if (p == game.me) ui.updatehl();
			},
			cards,
			player
		);
	}

	if (!evt.custom) {
		evt.set("custom", { add: { card: add }, replace: {} });
	} else if (!evt.custom.add) {
		evt.set("custom", Object.assign(evt.custom, { add: { card: add } }));
	} else {
		evt.set("custom", Object.assign(evt.custom, { add: Object.assign(evt.custom.add, { card: add }) }));
	}

	evt.set("filterCard", function (card) {
		const cur = _status.event;
		if (!cur.getDefaultHandlerType && !cur._nextStep) {
			if (cur.insert) {
				cur._nextStep = cur.insert(cleanup, { __event__: cur, player: cur.player });
			} else {
				const next = game.createEvent(`${Date.now()}_insert`, false, cur);
				next.__event__ = cur;
				next.player = cur.player;
				cur._nextStep = next;
			}
		}
		if (!card.classList.contains("temp-card")) return false;
		return cur.__ofilter ? cur.__ofilter.apply(cur, arguments) : true;
	});
	evt.set("selectCard", select);
	evt.set("position", "s");
	evt.set("filterButton");
	evt.set("selectButton");
	evt.set("selectTarget", selectTarget);
	evt.set("filterTarget", filterTarget);
	evt.set("__ofilter", filter);
	evt.set("__oselect", select);
	evt.set("__filterTarget", filterTarget);
	evt.set("__selectTarget", selectTarget);
	evt.set("complexCard", true);
	evt.set("complexSelect", true);
	evt.set("switchToAuto", function () {
		this.result = "ai";
	});

	if (evt.getDefaultHandlerType) {
		const type = evt.getDefaultHandlerType();
		evt.set(type, (evt[type] || []).add(cleanup));
	}
}

/**
 * 注册 chooseButton 临时牌转换
 */
function registerChooseButtonTempCardHook() {
	const skillName = `__replaceDialogShousha_tempCard_${getExtensionName()}`;
	if (lib.skill[skillName]) return;

	lib.__decadeTempCard = {
		configKey: `extension_${getExtensionName()}_replace_dialog_shousha`,
		applyChooseButtonTempCard,
	};

	lib.skill[skillName] = {
		trigger: { player: "chooseButtonBegin" },
		silent: true,
		lastDo: true,
		priority: -300,
		content() {
			const api = lib.__decadeTempCard;
			if (!api || lib.config[api.configKey] === false) return;
			try {
				api.applyChooseButtonTempCard(this.trigger);
			} catch (e) {}
		},
	};
	game.addGlobalSkill?.(skillName);
}

/**
 * game.check 生成 viewAs 虚拟预览；game.uncheck 移除
 * @returns {Function[]}
 */
function applyCheckUncheckVirtualCard() {
	if (!getConfig()) return [];
	const restoreFns = [];

	restoreFns.push(
		wrapAround(game, "check", function (original, ...args) {
			const evt = args[0] || _status.event;
			try {
				// 转化框已关闭时，先清掉误标的 noconfirm / 临时隐藏 / 僵死 removing，再让本体创建底部确认
				if (evt?.isMine?.() && !isShoushaConfirmDialogOpen()) {
					if (
						(evt.name === "chooseToUse" || evt.name === "chooseToRespond" || String(evt.skill || "").includes("_backup")) &&
						(evt.noconfirm || evt._decade_shoushaOwnedConfirm || evt.customConfirm === ui.click._shoushaConfirm)
					) {
						clearShoushaOwnedConfirmFlags(evt, true);
					}
					if (document.querySelector(".decade-shousha-temp-hide-confirm") || isBottomConfirmStuck(ui.confirm)) {
						for (const el of Array.from(document.querySelectorAll(".decade-shousha-temp-hide-confirm"))) {
							clearShoushaTempHideStyles(el);
						}
						disposeStuckBottomConfirm();
					}
					// 即使没有 hide class，也可能因 removeProperty 丢了 opacity:1 而透明
					if (
						ui.confirm?.isConnected &&
						!isShoushaConfirmDialogOpen() &&
						(evt.name === "chooseToUse" ||
							evt.name === "chooseToRespond" ||
							String(evt.skill || "").includes("_backup"))
					) {
						const op = typeof getComputedStyle === "function" ? getComputedStyle(ui.confirm).opacity : ui.confirm.style.opacity;
						if (op === "0" || op === "") {
							ensureBottomConfirmVisible(ui.confirm);
						}
					}
				}
			} catch (e) {}

			const result = original.apply(this, args);
			try {
				if (!evt?.isMine?.()) return result;

				// chooseButton / 转化选牌：仅在框仍打开且当前是选牌名步骤时同步框内确定栏
				if (
					(evt.name === "chooseButton" || evt.name === "chooseButtonTarget") &&
					evt.noconfirm &&
					typeof evt.customConfirm === "function"
				) {
					try {
						evt.customConfirm(result, evt);
					} catch (e) {}
				} else if (
					(evt.name === "chooseButton" || evt.name === "chooseButtonTarget") &&
					isShoushaConfirmDialogOpen()
				) {
					try {
						bindShoushaConfirmToEvent(evt);
						ui.click._shoushaConfirm?.(result, evt);
						hideShoushaBottomConfirm();
					} catch (e) {}
				} else if (!isShoushaConfirmDialogOpen()) {
					if (document.querySelector(".decade-shousha-temp-hide-confirm")) {
						try {
							restoreShoushaBottomConfirm(true);
						} catch (e) {}
					}
				}

				const skill = evt.skill || _status.event?.skill;
				if (isEquipConvertSkill(skill)) return result;

				const select = get.select(evt.selectCard);

				let card;
				if (_status.event.skill && typeof get.info(_status.event.skill).viewAs == "function") {
					card = ui.selected.cards.length ? get.card(true) : false;
				} else {
					card = get.card(true);
				}

				if (!card || (!card.isCard && select[0] != -1) || ui._temp_vituralCard?.[evt.player.playerid]) {
					return result;
				}

				const cards = evt.player.getCards(evt.position).filter(c => !c.classList.contains("unselectable"));
				card = ui.create.card(null, "noclick").init(get.autoViewAs(card, select[0] == -1 && cards));

				if (!ui._temp_vituralCard) ui._temp_vituralCard = {};
				ui._temp_vituralCard[evt.player.playerid] = card;

				styleVirtualPreviewCard(card);

				const cleanupOriginal = evt.onuncheck;
				if (select[0] == -1) {
					cards.forEach(c => {
						c.updateTransform(false, 550);
						c.classList.remove("selected");
						c.classList.add("unselectable");
					});
					evt.onuncheck = function () {
						cards.forEach(c => c.classList.remove("unselectable"));
						return cleanupOriginal ? cleanupOriginal.apply(this, arguments) : undefined;
					};
				}

				card._transform = " ";
				evt.player.directgains([card]);
				card.classList.add("vituralCard", "selectable", "selected");
				card.updateTransform(true, 550);

				if (evt.noconfirm && ui.confirm) {
					ui.confirm.close();
					delete ui.confirm;
				}
				if (evt.oncheck) evt.oncheck(evt);
			} catch (e) {}
			return result;
		})
	);

	restoreFns.push(
		wrapAround(game, "uncheck", function (original, ...args) {
			const result = original.apply(this, args);
			try {
				if (ui._temp_vituralCard) {
					for (const id in ui._temp_vituralCard) {
						const player = (lib.playerOL || game.playerMap)[id];
						ui._temp_vituralCard[id].remove();
						if (player) {
							player.update();
							if (player == game.me) ui.updatehl();
						}
					}
					delete ui._temp_vituralCard;
				}
				if (_status.event?.onuncheck) _status.event.onuncheck(_status.event);
			} catch (e) {}
			return result;
		})
	);

	return restoreFns;
}

/**
 * 应用临时虚拟卡牌覆写
 * @returns {Function[]}
 */
export function applyTempCardOverrides() {
	const restoreFns = [];
	try {
		if (getConfig()) {
			restoreFns.push(...applyShoushaDialogOverrides());
			restoreFns.push(...applyShoushaSingleClickConvert());
			registerChooseButtonBeginHook();
			registerChooseButtonTempCardHook();
			restoreFns.push(...applyCheckUncheckVirtualCard());
		}
	} catch (e) {}
	return restoreFns;
}
