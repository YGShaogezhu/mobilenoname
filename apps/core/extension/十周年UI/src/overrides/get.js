/**
 * Get覆写模块
 */
import { game, get, lib, _status } from "noname";
import { wrapAfter } from "../utils/safeOverride.js";
import { skillButtonTooltip } from "../ui/skillButtonTooltip.js";

export function applyGetOverrides() {
	const restoreFns = [];

	restoreFns.push(
		wrapAfter(get, "skillState", function (skills, player) {
			if (game.me !== player && skills?.global) {
				skills.global = skills.global.concat();
				for (let i = skills.global.length - 1; i >= 0; i--) {
					if (skills.global[i].includes("decadeUI")) {
						skills.global.splice(i, 1);
					}
				}
			}
		})
	);

	restoreFns.push(overridePoptipIntro());
	restoreFns.push(enhancePoptipHover());

	return restoreFns;
}

/**
 * 衍生技 / 名词解释 poptip：改用手杀风格提示框
 * @returns {() => void}
 */
function overridePoptipIntro() {
	const original = get.poptipIntro;
	if (typeof original !== "function") return () => {};

	get.poptipIntro = function (info, poptip, event) {
		const type = lib.poptip?.getType?.(poptip);
		const anchor =
			(event?.target && typeof event.target.closest === "function" && event.target.closest("noname-poptip")) ||
			event?.currentTarget ||
			event?.target ||
			null;

		const isHover = event?.type === "mouseenter" || event?.type === "mouseover";

		// 技能 / 纯文本解释：用手杀风格 tip（卡牌大图对话框仍走原逻辑）
		if (typeof info === "string" && anchor) {
			game.closePoptipDialog?.();
			skillButtonTooltip.hide();

			const opts = { immediate: true, clickMode: !isHover };

			if (type === "skill") {
				skillButtonTooltip.show(anchor, poptip, game.me, opts);
				return;
			}

			const title = lib.poptip?.getName?.(poptip) || "";
			skillButtonTooltip.showContent(anchor, { title, html: info }, opts);
			return;
		}

		return original.apply(this, arguments);
	};

	return () => {
		get.poptipIntro = original;
	};
}

/**
 * PC 端 noname-poptip 增加悬停打开（本体默认识别为 click）
 * @returns {() => void}
 */
function enhancePoptipHover() {
	let restored = false;
	let originalConnected = null;
	let proto = null;

	const patch = () => {
		if (restored) return;
		const Poptip = typeof customElements !== "undefined" ? customElements.get("noname-poptip") : null;
		if (!Poptip?.prototype) return false;

		proto = Poptip.prototype;
		originalConnected = proto.connectedCallback;

		proto.connectedCallback = function (...args) {
			const result = originalConnected?.apply(this, args);
			if (this._decadePoptipHoverBound) return result;
			this._decadePoptipHoverBound = true;

			if (lib.config.touchscreen) return result;

			this.addEventListener("mouseenter", e => {
				if (lib.config.touchscreen) return;
				game.closePoptipDialog?.();
				const dialog = this.dialog;
				const id = this.getAttribute("poptip") || "";
				get.poptipIntro(dialog, id, e);
			});

			this.addEventListener("mouseleave", e => {
				if (lib.config.touchscreen) return;
				const tip = skillButtonTooltip.tooltip;
				const related = e.relatedTarget;
				if (tip && related && (tip === related || tip.contains(related))) return;
				if (_status.poptip) {
					game.closePoptipDialog?.();
				} else {
					skillButtonTooltip.hide();
				}
			});

			return result;
		};

		return true;
	};

	if (!patch()) {
		const timer = setInterval(() => {
			if (patch() || restored) clearInterval(timer);
		}, 200);
		setTimeout(() => clearInterval(timer), 10000);
	}

	return () => {
		restored = true;
		if (proto && originalConnected) {
			proto.connectedCallback = originalConnected;
		}
	};
}

export function getObjtype(obj) {
	obj = Object.prototype.toString.call(obj);
	const map = {
		"[object Array]": "array",
		"[object Object]": "object",
		"[object HTMLDivElement]": "div",
		"[object HTMLTableElement]": "table",
		"[object HTMLTableRowElement]": "tr",
		"[object HTMLTableCellElement]": "td",
		"[object HTMLBodyElement]": "td",
	};
	return map[obj];
}
