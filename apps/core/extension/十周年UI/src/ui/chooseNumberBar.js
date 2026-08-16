/**
 * @fileoverview 移动版 chooseNumbers / 数字类 chooseControl 加减条
 */
import { lib, ui, get } from "noname";

const UIBUTTON_PATH = "extension/十周年UI/ui/assets/lbtn/uibutton";

/** @type {Map<string, number>|null} */
let cnNumberMap = null;

/**
 * 中文数字 → 数值（含 ordinal / 非 ordinal）
 * @returns {Map<string, number>}
 */
function getCnNumberMap() {
	if (cnNumberMap) {
		return cnNumberMap;
	}
	cnNumberMap = new Map();
	for (let i = 0; i <= 99; i++) {
		cnNumberMap.set(get.cnNumber(i, true), i);
		const plain = get.cnNumber(i, false);
		if (!cnNumberMap.has(plain)) {
			cnNumberMap.set(plain, i);
		}
	}
	return cnNumberMap;
}

/**
 * 将 control 文案解析为数字；无法识别则返回 null
 * @param {*} control
 * @returns {number|null}
 */
export function parseControlAsNumber(control) {
	if (typeof control === "number" && Number.isFinite(control)) {
		return control;
	}
	if (typeof control !== "string") {
		return null;
	}
	if (/^\d+$/.test(control)) {
		return parseInt(control, 10);
	}
	return getCnNumberMap().get(control) ?? null;
}

/**
 * 判断 chooseControl 的选项是否为「纯数字选择」（可含 cancel2）
 * @param {any[]} controls
 * @returns {{ numbers: number[], controlByNumber: Map<number, any>, hasCancel: boolean }|null}
 */
export function tryParseNumericControls(controls) {
	if (!Array.isArray(controls) || !controls.length) {
		return null;
	}
	const hasCancel = controls.includes("cancel2");
	const options = controls.filter(c => c !== "cancel2");
	if (options.length < 1) {
		return null;
	}

	const controlByNumber = new Map();
	const numbers = [];
	for (const control of options) {
		const num = parseControlAsNumber(control);
		if (num == null) {
			return null;
		}
		if (controlByNumber.has(num)) {
			return null;
		}
		numbers.push(num);
		controlByNumber.set(num, control);
	}
	return { numbers, controlByNumber, hasCancel };
}

/**
 * 获取某组可选数值列表
 * @param {GameEvent} event
 * @param {number} index
 * @returns {number[]}
 */
export function getAllowedNumbers(event, index) {
	const item = event.list[index];
	const current = event.numbers[index];
	const allowed = [];

	if (Array.isArray(item)) {
		let numbers;
		if (["asc", "sort"].includes(item[0])) {
			numbers = item.slice(1).sort((a, b) => a - b);
		} else if (item[0] === "desc") {
			numbers = item.slice(1).sort((a, b) => b - a);
		} else {
			numbers = item;
		}
		for (const num of numbers) {
			if (event.filterSelect(num, index, event)) {
				allowed.push(num);
			}
		}
	} else {
		let actual;
		const max = item.max || 9;
		if (event.optionSum) {
			actual = event.optionSum - event.numbers.reduce((sum, num) => sum + num, 0) + current;
		}
		for (let num = item.min || 0; num <= Math.min(actual || max, max); num += item.base || 1) {
			if (event.filterSelect(num, index, event)) {
				allowed.push(num);
			}
		}
	}

	return allowed;
}

/**
 * 格式化 label 显示文案
 * @param {GameEvent} event
 * @param {number} index
 * @param {number} num
 * @returns {string}
 */
export function formatNumberLabel(event, index, num) {
	if (event.optprompt) {
		if (typeof event.optprompt === "string") {
			return event.optprompt.replace("#", num).replace("$", get.cnNumber(num, true));
		}
		if (typeof event.optprompt === "function") {
			return event.optprompt(num, index);
		}
	}
	return String(num);
}

/**
 * 创建单个加减条
 * @param {GameEvent} event
 * @param {number} index
 * @param {() => void} onChange
 * @returns {HTMLElement}
 */
export function createChooseNumberBar(event, index, onChange) {
	const assetURL = lib.assetURL || "";
	const bar = document.createElement("div");
	bar.className = "choose-number-bar";
	bar.dataset.index = String(index);

	const dec = document.createElement("div");
	dec.className = "choose-number-dec";
	dec.innerHTML = `<img draggable="false" src="${assetURL}${UIBUTTON_PATH}/game_choose_dec.png" alt="">`;

	const add = document.createElement("div");
	add.className = "choose-number-add";
	add.innerHTML = `<img draggable="false" src="${assetURL}${UIBUTTON_PATH}/game_choose_add.png" alt="">`;

	const label = document.createElement("div");
	label.className = "choose-number-label";
	const labelText = document.createElement("span");
	label.appendChild(labelText);

	bar.appendChild(dec);
	bar.appendChild(add);
	bar.appendChild(label);

	const clickType = lib.config.touchscreen ? "touchend" : "click";

	const refresh = () => {
		const allowed = getAllowedNumbers(event, index);
		let current = event.numbers[index];
		let pos = allowed.indexOf(current);
		if (pos < 0 && allowed.length) {
			current = allowed[0];
			event.numbers[index] = current;
			pos = 0;
		}

		labelText.textContent = formatNumberLabel(event, index, current);

		const canDec = pos > 0;
		const canAdd = pos >= 0 && pos < allowed.length - 1;
		dec.classList.toggle("disabled", !canDec);
		add.classList.toggle("disabled", !canAdd);
	};

	const step = delta => {
		const allowed = getAllowedNumbers(event, index);
		const current = event.numbers[index];
		let pos = allowed.indexOf(current);
		if (pos < 0) {
			pos = 0;
		}
		const nextPos = pos + delta;
		if (nextPos < 0 || nextPos >= allowed.length) {
			return;
		}
		event.numbers[index] = allowed[nextPos];
		onChange?.();
	};

	dec.addEventListener(clickType, e => {
		e.stopPropagation();
		if (dec.classList.contains("disabled")) {
			return;
		}
		step(-1);
	});

	add.addEventListener(clickType, e => {
		e.stopPropagation();
		if (add.classList.contains("disabled")) {
			return;
		}
		step(1);
	});

	bar.refresh = refresh;
	refresh();
	return bar;
}

/**
 * 创建多组加减条容器，并提供刷新 / 挂载 / 卸载
 * @param {GameEvent} event
 * @param {() => void} onChange
 * @returns {{ wrapper: HTMLElement, bars: HTMLElement[], refreshAll: () => void, attachToConfirm: () => void, remove: () => void }}
 */
export function createChooseNumberBars(event, onChange) {
	const wrapper = document.createElement("div");
	wrapper.className = "choose-number-bars";

	const bars = event.list.map((_, index) => {
		const bar = createChooseNumberBar(event, index, onChange);
		wrapper.appendChild(bar);
		return bar;
	});

	const refreshAll = () => {
		bars.forEach(bar => bar.refresh?.());
	};

	const attachToConfirm = () => {
		if (!ui.confirm || !ui.confirm.node?.ok) {
			return;
		}
		if (wrapper.parentNode !== ui.confirm) {
			ui.confirm.insertBefore(wrapper, ui.confirm.node.ok);
		}
		wrapper.classList.remove("control");
		ui.confirm.updateLayout?.();
		ui.updatec?.();
	};

	const remove = () => {
		wrapper.remove();
	};

	return { wrapper, bars, refreshAll, attachToConfirm, remove };
}
