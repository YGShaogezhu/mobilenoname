/**
 * @fileoverview Control覆写模块 - lib.element.control的覆写方法
 */
import { lib, game, ui, get, ai, _status } from "noname";

/** @type {Object|null} 保存原始方法的引用 */
let originals = null;

const UIBUTTON_PATH = "extension/十周年UI/ui/assets/lbtn/uibutton";

/**
 * 保存原始方法
 * @returns {Object} 原始方法对象
 */
export function saveOriginals() {
	if (originals) return originals;
	originals = {
		add: lib.element.control.add,
		open: lib.element.control.open,
		close: lib.element.control.close,
		replace: lib.element.control.replace,
	};
	return originals;
}

/**
 * 获取原始方法
 * @param {string} name - 方法名
 * @returns {Function|undefined} 原始方法
 */
export function getOriginal(name) {
	return originals?.[name];
}

/**
 * 为特殊控件节点设置外观（背水 / AI代选→一键选牌 / 不无懈→WX）
 * @param {HTMLElement} node
 * @param {*} item
 */
function styleSpecialControlNode(node, item) {
	const text = typeof item === "string" ? item : get.translation(item);
	const translated = get.translation(item);

	node.classList.remove("beishui-btn", "primary2", "yjxp-btn", "wx-btn");

	if (item === "AI代选" || text === "AI代选" || translated === "AI代选") {
		node.innerHTML = `<img draggable="false" src="${lib.assetURL}${UIBUTTON_PATH}/yjxp.png">`;
		node.classList.add("primary2", "yjxp-btn");
		return true;
	}

	// 「不无懈五谷」等 stayleft 按钮：与一键选牌同款背景，图标 WX.png
	if ((typeof text === "string" && text.startsWith("不无懈")) || (typeof translated === "string" && translated.startsWith("不无懈"))) {
		node.innerHTML = `<img draggable="false" src="${lib.assetURL}${UIBUTTON_PATH}/WX.png">`;
		node.classList.add("primary2", "wx-btn");
		return true;
	}

	if ((typeof text === "string" && text.includes("背水")) || (typeof translated === "string" && translated.includes("背水"))) {
		const label = (translated || text || "").replace(/[！!]+$/g, "");
		node.innerHTML = label;
		node.classList.add("beishui-btn");
		return true;
	}

	return false;
}

/**
 * control.add覆写
 * @param {*} item - 要添加的项目
 */
export function controlAdd(item) {
	const node = document.createElement("div");
	node.link = item;
	if (!styleSpecialControlNode(node, item)) {
		node.innerHTML = get.translation(item);
	}
	node.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control);
	this.appendChild(node);
	this.updateLayout?.();
}

/**
 * control.open覆写
 * @returns {HTMLElement} 控制元素
 */
export function controlOpen() {
	ui.control.insertBefore(this, _status.createControl || ui.confirm);
	ui.controls.unshift(this);
	return this;
}

/**
 * control.close覆写
 */
export function controlClose() {
	this.remove();
	ui.controls.remove(this);
	if (ui.confirm === this) ui.confirm = null;
	if (ui.skills === this) ui.skills = null;
	if (ui.skills2 === this) ui.skills2 = null;
	if (ui.skills3 === this) ui.skills3 = null;
}

/**
 * control.replace覆写
 * @param {...*} args - 替换参数
 * @returns {HTMLElement} 控制元素
 */
export function controlReplace(...args) {
	const items = Array.isArray(args[0]) ? args[0] : args;
	let index = 0;
	const nodes = [...this.childNodes].filter(node => !isSpecialConfirmChild(node));
	this.custom = undefined;

	for (let i = 0; i < items.length; i++) {
		if (typeof items[i] === "function") {
			this.custom = items[i];
		} else {
			if (index < nodes.length) {
				nodes[index].link = items[i];
				if (!styleSpecialControlNode(nodes[index], items[i])) {
					nodes[index].innerHTML = get.translation(items[i]);
				}
			} else {
				this.add(items[i]);
			}
			index++;
		}
	}

	while (index < nodes.length) {
		nodes[index].remove();
		index++;
	}

	this.updateLayout?.();
	ui.updatec?.();
	return this;
}

/**
 * 确认条内非选项子节点（加减条 / 重铸），不参与 .control 选项样式
 * @param {Node} node
 * @returns {boolean}
 */
function isSpecialConfirmChild(node) {
	if (!(node instanceof HTMLElement)) {
		return false;
	}
	return (
		node.classList.contains("choose-number-bars") ||
		node.classList.contains("choose-number-bar") ||
		node.classList.contains("recasting-btn")
	);
}

/**
 * control.updateLayout新增方法
 */
export function controlUpdateLayout() {
	const nodes = this.childNodes;
	if (nodes.length >= 2) {
		this.classList.add("combo-control");
		for (const node of nodes) {
			if (isSpecialConfirmChild(node)) {
				node.classList.remove("control");
				continue;
			}
			node.classList.add("control");
		}
	} else {
		this.classList.remove("combo-control");
		if (nodes.length === 1) {
			nodes[0].classList.remove("control");
		}
	}
}

/**
 * 应用control覆写
 */
export function applyControlOverrides() {
	saveOriginals();

	lib.element.control.add = controlAdd;
	lib.element.control.open = controlOpen;
	lib.element.control.close = controlClose;
	lib.element.control.replace = controlReplace;
	lib.element.control.updateLayout = controlUpdateLayout;
}
