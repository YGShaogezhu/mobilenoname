/**
 * @fileoverview 移动版 chooseNumbers 加减条
 */
import { lib, ui, get } from "noname";

const UIBUTTON_PATH = "extension/十周年UI/ui/assets/lbtn/uibutton";

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
 * @returns {{ wrapper: HTMLElement, refreshAll: () => void, attachToConfirm: () => void, remove: () => void }}
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
