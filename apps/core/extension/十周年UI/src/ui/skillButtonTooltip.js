/**
 * @fileoverview 技能按钮悬浮提示模块
 * @description 提供技能按钮鼠标悬停时的详细信息展示功能
 */

import { lib, ui, get } from "noname";

/**
 * 技能按钮悬浮提示类
 */
export class SkillButtonTooltip {
	constructor() {
		/** @type {HTMLDivElement|null} */
		this.tooltip = null;
		/** @type {HTMLElement|null} */
		this.currentButton = null;
		/** @type {number|null} */
		this.hideTimeout = null;
		/** @type {number|null} */
		this.showTimeout = null;
		/** @type {number} */
		this.showDelay = 500;
		/** @type {((e: Event) => void)|null} */
		this._outsideCloser = null;
		/** @type {boolean} */
		this._clickMode = false;
	}

	/**
	 * 创建提示框元素（挂到 body，避开 #window 的 zoom 导致框被压小）
	 * @returns {HTMLDivElement}
	 * @private
	 */
	createTooltip() {
		const parent = document.body;
		if (this.tooltip) {
			if (this.tooltip.parentNode !== parent) {
				parent.appendChild(this.tooltip);
			}
			return this.tooltip;
		}

		this.tooltip = document.createElement("div");
		this.tooltip.className = "skill-button-tooltip";
		this.tooltip.style.cssText = [
			"position:fixed",
			"z-index:100000",
			"pointer-events:none",
			"opacity:0",
			"display:none",
			"left:-9999px",
			"top:-9999px",
			"width:fit-content",
			"height:auto",
			"max-width:420px",
			"min-width:220px",
			"box-sizing:border-box",
		].join(";");
		parent.appendChild(this.tooltip);
		return this.tooltip;
	}

	/**
	 * 获取技能描述
	 * @param {string} skillName
	 * @param {Player} [player]
	 * @returns {string}
	 */
	getSkillDescription(skillName, player) {
		let str = "";

		try {
			if (player && lib.dynamicTranslate && lib.dynamicTranslate[skillName]) {
				const dynamicResult = lib.dynamicTranslate[skillName](player, skillName);
				if (typeof dynamicResult === "string" && dynamicResult) {
					str = dynamicResult;
				}
			}

			if (!str) {
				str = lib.translate[skillName + "_info"] || "";
			}

			if (!str && lib.skill[skillName]) {
				const skillInfo = lib.skill[skillName];

				if (skillInfo.prompt) {
					if (typeof skillInfo.prompt === "function") {
						try {
							const promptResult = skillInfo.prompt(player, skillName);
							if (typeof promptResult === "string" && promptResult) {
								str = promptResult;
							}
						} catch (e) {
							console.warn(`执行技能 ${skillName} 的 prompt 函数时出错:`, e);
						}
					} else if (typeof skillInfo.prompt === "string") {
						str = skillInfo.prompt;
					}
				}

				if (!str && skillInfo.description) {
					str = skillInfo.description;
				} else if (!str && skillInfo.sourceSkill) {
					const parentSkill = skillInfo.sourceSkill;
					const subSkillName = skillName.replace(parentSkill + "_", "");

					if (lib.skill[parentSkill]?.subSkill?.[subSkillName]) {
						const subSkillInfo = lib.skill[parentSkill].subSkill[subSkillName];
						str = subSkillInfo.description || "";
						if (!str) {
							str = lib.translate[parentSkill + "_info"] || "";
						}
					}
					if (!str && lib.skill[parentSkill]?.prompt) {
						if (typeof lib.skill[parentSkill].prompt === "function") {
							try {
								const promptResult = lib.skill[parentSkill].prompt(player, parentSkill);
								if (typeof promptResult === "string" && promptResult) {
									str = promptResult;
								}
							} catch (e) {
								console.warn(`执行父技能 ${parentSkill} 的 prompt 函数时出错:`, e);
							}
						} else if (typeof lib.skill[parentSkill].prompt === "string") {
							str = lib.skill[parentSkill].prompt;
						}
					}
				}
			}

			if (!str && typeof get !== "undefined" && get.skillInfoTranslation) {
				str = get.skillInfoTranslation(skillName, player) || "";
			}
		} catch (e) {
			console.error(`获取技能 ${skillName} 的描述时出错:`, e);
			str = lib.translate[skillName + "_info"] || "";
		}

		return str;
	}

	/**
	 * 格式化技能描述
	 * @param {string} text
	 * @returns {string}
	 */
	formatSkillDescription(text) {
		if (!text) return "";

		const { text: protectedText, brackets } = this.protectBrackets(text);
		text = protectedText;

		text = this.addLineBreaksBeforeNumbers(text);
		text = this.addLineBreakAfterLastNumber(text);
		text = this.addLineBreaksBeforeRegularNumbers(text);
		text = this.addLineBreakAfterLastRegularNumber(text);
		text = this.addLineBreaksBeforeYinYang(text);
		text = this.addLineBreakAfterLastYinYang(text);

		text = this.restoreBrackets(text, brackets);

		return text;
	}

	/**
	 * @param {string} text
	 * @returns {{text: string, brackets: string[]}}
	 * @private
	 */
	protectBrackets(text) {
		const brackets = [];
		let protectedText = text.replace(/〖[^〗]*〗/g, match => {
			const index = brackets.length;
			brackets.push(match);
			return `__BRACKET_${index}__`;
		});
		protectedText = protectedText.replace(/（[^）]*）/g, match => {
			const index = brackets.length;
			brackets.push(match);
			return `__BRACKET_${index}__`;
		});
		return { text: protectedText, brackets };
	}

	/**
	 * @param {string} text
	 * @param {string[]} brackets
	 * @returns {string}
	 * @private
	 */
	restoreBrackets(text, brackets) {
		let maxIterations = 10;
		let iteration = 0;

		while (/__BRACKET_\d+__/.test(text) && iteration < maxIterations) {
			text = text.replace(/__BRACKET_(\d+)__/g, (match, index) => {
				return brackets[parseInt(index)] || match;
			});
			iteration++;
		}

		return text;
	}

	/** @private */
	addLineBreaksBeforeNumbers(text) {
		return text.replace(/(\S)([①②③④⑤⑥⑦⑧⑨⑩])/g, "$1<br>$2");
	}

	/** @private */
	addLineBreakAfterLastNumber(text) {
		return text.replace(/([①②③④⑤⑥⑦⑧⑨⑩])(?![\s\S]*[①②③④⑤⑥⑦⑧⑨⑩])([^。]*?。)/g, "$1$2<br>");
	}

	/** @private */
	addLineBreaksBeforeRegularNumbers(text) {
		return text.replace(/(\S)(\d+[、.])/g, "$1<br>$2");
	}

	/** @private */
	addLineBreakAfterLastRegularNumber(text) {
		return text.replace(/(\d+[、.])(?![\s\S]*\d+[、.])([^。]*?。)/g, "$1$2<br>");
	}

	/** @private */
	addLineBreaksBeforeYinYang(text) {
		return text.replace(/([^①②③④⑤⑥⑦⑧⑨⑩\s])([阳阴]：)/g, "$1<br>$2");
	}

	/** @private */
	addLineBreakAfterLastYinYang(text) {
		const yinYangMatch = text.match(/([阳阴]：)(?![\s\S]*[阳阴]：)/);
		if (!yinYangMatch) return text;

		const yinYangIndex = yinYangMatch.index + yinYangMatch[0].length;
		const afterYinYang = text.substring(yinYangIndex);

		const hasCircleNumbers = /[①②③④⑤⑥⑦⑧⑨⑩]/.test(afterYinYang);
		const hasSpecialNumbers = /[⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑]/.test(afterYinYang);
		const hasRegularNumbers = /\d+[、.]/.test(afterYinYang);

		if (hasCircleNumbers || hasSpecialNumbers || hasRegularNumbers) {
			return text;
		}

		return text.replace(/([阳阴]：)(?![\s\S]*[阳阴]：)([^。；]*?[。；])/, "$1$2<br>");
	}

	/**
	 * 收集可展示的衍生技能
	 * @param {string} skillName
	 * @returns {string[]}
	 */
	getDerivationSkills(skillName) {
		const info = lib.skill[skillName];
		if (!info?.derivation) return [];

		let list = Array.isArray(info.derivation) ? info.derivation.slice() : [info.derivation];
		return list.filter(skill => {
			if (!skill || !lib.translate[`${skill}_info`]) return false;
			if (!lib.skill[skill] && !lib.translate[skill]) return false;
			if (String(skill).includes("_faq")) return false;
			if (get.info(skill)?.nopop) return false;
			return true;
		});
	}

	/**
	 * 构建提示框 HTML（仅描述内容，不含技能名标题）
	 * @param {string} skillName
	 * @param {Player} [player]
	 * @returns {string}
	 */
	buildTooltipHtml(skillName, player) {
		const desc = this.formatSkillDescription(this.getSkillDescription(skillName, player)) || "暂无描述";

		let html = `<div class="skill-desc">${desc}</div>`;

		const derivations = this.getDerivationSkills(skillName);
		if (derivations.length) {
			html += `<div class="skill-derivation-sep">—— 衍生技能 ——</div>`;
			derivations.forEach(skill => {
				const dDesc = this.formatSkillDescription(this.getSkillDescription(skill, player)) || "暂无描述";
				html += `<div class="skill-desc">${dDesc}</div>`;
			});
		}

		return html;
	}

	/**
	 * 显示提示框
	 * @param {HTMLElement} anchor
	 * @param {string} skillName
	 * @param {Player} [player]
	 * @param {{ immediate?: boolean, clickMode?: boolean }} [options]
	 */
	show(anchor, skillName, player, options = {}) {
		if (!anchor || !skillName) return;

		clearTimeout(this.hideTimeout);
		clearTimeout(this.showTimeout);

		this.currentButton = anchor;
		this._clickMode = !!options.clickMode;

		const delay = options.immediate || options.clickMode ? 0 : this.showDelay;

		this.showTimeout = setTimeout(() => {
			if (this.currentButton !== anchor) return;

			const tooltip = this.createTooltip();
			tooltip.innerHTML = this.buildTooltipHtml(skillName, player);
			tooltip.style.pointerEvents = this._clickMode ? "auto" : "none";
			tooltip.style.opacity = "0";
			tooltip.style.display = "block";
			tooltip.style.visibility = "hidden";
			tooltip.style.left = "0px";
			tooltip.style.top = "0px";

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (this.currentButton !== anchor) return;
					this.positionTooltip(tooltip, anchor);
					tooltip.style.visibility = "visible";
					tooltip.style.opacity = "1";
					if (this._clickMode) this.bindOutsideClose(anchor, tooltip);
				});
			});
		}, delay);
	}

	/**
	 * 点击外部关闭（移动端 / 点击模式）
	 * @param {HTMLElement} anchor
	 * @param {HTMLElement} tooltip
	 * @private
	 */
	bindOutsideClose(anchor, tooltip) {
		this.unbindOutsideClose();
		this._outsideCloser = e => {
			const target = e.target;
			if (tooltip.contains(target) || anchor.contains(target)) return;
			this.hide();
		};
		setTimeout(() => {
			document.addEventListener("pointerdown", this._outsideCloser, true);
			document.addEventListener("touchstart", this._outsideCloser, true);
		}, 0);
	}

	/** @private */
	unbindOutsideClose() {
		if (!this._outsideCloser) return;
		document.removeEventListener("pointerdown", this._outsideCloser, true);
		document.removeEventListener("touchstart", this._outsideCloser, true);
		this._outsideCloser = null;
	}

	/**
	 * 先定宽换行，再按 scrollHeight 显式定高（规避部分 WebView fit-content 高度算错）
	 * @param {HTMLDivElement} tooltip
	 * @returns {{ tipW: number, tipH: number }}
	 * @private
	 */
	layoutTooltipSize(tooltip) {
		const pad = 12;
		const maxW = Math.min(420, window.innerWidth - pad * 2);
		const minW = 220;

		const set = (prop, value) => tooltip.style.setProperty(prop, value, "important");

		set("box-sizing", "border-box");
		set("white-space", "normal");
		set("word-break", "break-word");
		set("overflow", "visible");
		set("overflow-y", "visible");
		set("max-height", "none");
		set("min-height", "0");
		set("transform", "none");
		set("zoom", "1");

		// 先按最大宽度排版，保证长中文能换行
		set("width", `${maxW}px`);
		set("max-width", `${maxW}px`);
		set("min-width", `${minW}px`);
		set("height", "auto");
		void tooltip.offsetHeight;

		// 若内容较窄，再收缩宽度（按单行自然宽度估算）
		const shrinkProbe = document.createElement("div");
		shrinkProbe.style.cssText =
			"position:absolute;visibility:hidden;left:-99999px;top:0;width:auto;height:auto;white-space:nowrap;padding:0;margin:0;border:0;" +
			`font-size:${getComputedStyle(tooltip).fontSize};font-family:${getComputedStyle(tooltip).fontFamily};line-height:${getComputedStyle(tooltip).lineHeight};`;
		shrinkProbe.innerHTML = tooltip.innerHTML.replace(/<br\s*\/?>/gi, "　");
		document.body.appendChild(shrinkProbe);
		const nowrapW = Math.ceil(shrinkProbe.getBoundingClientRect().width) + 24;
		shrinkProbe.remove();

		const tipW = Math.max(minW, Math.min(maxW, nowrapW || maxW));
		set("width", `${tipW}px`);
		void tooltip.offsetHeight;

		// 显式写入高度，并加余量避免字体裁切
		const tipH = Math.max(56, Math.ceil(tooltip.scrollHeight));
		set("height", `${tipH}px`);

		return { tipW, tipH };
	}

	/**
	 * 按内容自适应并定位（fixed，挂 body，不受 #window zoom 影响）
	 * @param {HTMLDivElement} tooltip
	 * @param {HTMLElement} anchor
	 * @private
	 */
	positionTooltip(tooltip, anchor) {
		const pad = 12;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		const { tipW, tipH } = this.layoutTooltipSize(tooltip);

		const rect = anchor.getBoundingClientRect();
		let left = rect.left + rect.width / 2 - tipW / 2;
		left = Math.max(pad, Math.min(left, vw - tipW - pad));

		let top = rect.top - tipH - 10;
		if (top < pad) {
			top = rect.bottom + 10;
		}
		if (top + tipH > vh - pad) {
			top = Math.max(pad, vh - tipH - pad);
		}

		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
	}

	/**
	 * 隐藏提示框
	 */
	hide() {
		clearTimeout(this.showTimeout);
		this.unbindOutsideClose();
		this._clickMode = false;

		if (!this.tooltip) {
			this.currentButton = null;
			return;
		}

		this.tooltip.style.opacity = "0";
		this.tooltip.style.pointerEvents = "none";
		this.currentButton = null;

		this.hideTimeout = setTimeout(() => {
			if (this.tooltip && this.tooltip.style.opacity === "0") {
				this.tooltip.style.left = "-9999px";
				this.tooltip.style.display = "none";
				this.tooltip.style.visibility = "hidden";
				this.tooltip.style.width = "fit-content";
				this.tooltip.style.height = "auto";
			}
		}, 200);
	}

	/**
	 * 是否触摸设备（仅系统设备，不含 phonelayout，避免 PC 开手机布局后丢失悬停）
	 * @returns {boolean}
	 */
	isMobile() {
		return lib.device === "ios" || lib.device === "android";
	}

	/**
	 * 直接显示自定义标题/正文（供 poptip 规则名词等使用）
	 * @param {HTMLElement} anchor
	 * @param {{ title?: string, html: string }} content
	 * @param {{ immediate?: boolean, clickMode?: boolean }} [options]
	 */
	showContent(anchor, content, options = {}) {
		if (!anchor || !content?.html) return;

		clearTimeout(this.hideTimeout);
		clearTimeout(this.showTimeout);

		this.currentButton = anchor;
		this._clickMode = !!options.clickMode;

		const run = () => {
			if (this.currentButton !== anchor) return;
			const tooltip = this.createTooltip();
			tooltip.innerHTML = `<div class="skill-desc">${content.html}</div>`;
			tooltip.style.pointerEvents = this._clickMode ? "auto" : "none";
			tooltip.style.opacity = "0";
			tooltip.style.display = "block";
			tooltip.style.visibility = "hidden";
			tooltip.style.left = "0px";
			tooltip.style.top = "0px";

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (this.currentButton !== anchor) return;
					this.positionTooltip(tooltip, anchor);
					tooltip.style.visibility = "visible";
					tooltip.style.opacity = "1";
					if (this._clickMode) this.bindOutsideClose(anchor, tooltip);
				});
			});
		};

		if (options.immediate || options.clickMode) run();
		else this.showTimeout = setTimeout(run, this.showDelay);
	}

	/**
	 * 为元素绑定技能提示
	 * @param {HTMLElement} button
	 * @param {string} skillName
	 * @param {Player} [player]
	 * @param {{ trigger?: "hover"|"click"|"both", underline?: boolean, stopPropagation?: boolean }} [options]
	 * @description 对局技能按钮请用默认 hover（移动端不绑）；衍生技/千幻大页面传 trigger:"click"|"both"
	 */
	attach(button, skillName, player, options = {}) {
		if (!button || !skillName) return;
		if (button.dataset.tooltipAttached === "true") return;

		// 默认：仅 PC 悬停；移动端需显式传 trigger（避免拦截技能按钮点击）
		const trigger = options.trigger ?? (this.isMobile() ? "" : "hover");
		if (!trigger) return;

		const self = this;
		const stopPropagation = options.stopPropagation !== false;

		if ((trigger === "hover" || trigger === "both") && !this.isMobile()) {
			button.addEventListener("mouseenter", () => {
				self.show(button, skillName, player, { clickMode: false });
			});
			button.addEventListener("mouseleave", () => {
				if (!self._clickMode) self.hide();
			});
		}

		if (trigger === "click" || trigger === "both") {
			button.addEventListener("click", e => {
				if (stopPropagation) e.stopPropagation();
				if (self.currentButton === button && self.tooltip?.style.opacity === "1") {
					self.hide();
					return;
				}
				self.show(button, skillName, player, { immediate: true, clickMode: true });
			});
		}

		button.dataset.tooltipAttached = "true";
		button.dataset.tooltipSkill = skillName;
	}

	/**
	 * 为容器内带 data-skill 的节点绑定提示（千幻大页面等可调用）
	 * @param {ParentNode} root
	 * @param {Player} [player]
	 * @param {{ trigger?: "hover"|"click"|"both" }} [options]
	 */
	attachIn(root, player, options = {}) {
		if (!root) return;

		const nodes = root.querySelectorAll?.("[data-skill]") || [];
		nodes.forEach(node => {
			const skill = node.dataset?.skill || node.getAttribute?.("data-skill");
			if (!skill) return;
			delete node.dataset.tooltipAttached;
			this.attach(node, skill, player, {
				trigger: options.trigger || (this.isMobile() ? "click" : "both"),
			});
		});
	}

	/**
	 * 销毁提示框
	 */
	destroy() {
		clearTimeout(this.showTimeout);
		clearTimeout(this.hideTimeout);
		this.unbindOutsideClose();

		if (this.tooltip?.parentNode) {
			this.tooltip.parentNode.removeChild(this.tooltip);
		}
		this.tooltip = null;
		this.currentButton = null;
	}
}

/** @type {SkillButtonTooltip} */
export const skillButtonTooltip = new SkillButtonTooltip();

// 供千幻聆音等外部扩展直接调用
if (typeof window !== "undefined") {
	window.decadeSkillTooltip = skillButtonTooltip;
}
