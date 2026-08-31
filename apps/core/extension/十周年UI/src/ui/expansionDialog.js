/**
 * @fileoverview 手杀牌库弹层（权计 / 观潮）
 * @description 移植自王者荣耀 / 手杀美化的 DialogExpansion
 */
import { lib, ui, _status } from "noname";
import { applyLayeredCard, clearLayeredCard } from "../overrides/card/layered-card.js";

const ASSET_BASE = () => `${lib.assetURL}extension/十周年UI/`;

/**
 * 是否移动端（用于 dui-mobile 卡牌缩放类）
 * @returns {boolean}
 */
function isPhone() {
	return /mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|OperaMini/i.test(navigator.userAgent);
}

/**
 * 牌库内正面牌强制标准白卡（分层 card1）
 * @param {HTMLElement} cardEl
 */
function applyPaikuWhiteCard(cardEl) {
	if (!cardEl?.classList?.contains("card")) return;
	if (cardEl.classList.contains("infohidden") || cardEl.classList.contains("blank")) return;
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
 * 关闭牌库弹层并清理标志
 * @param {HTMLElement} dialog
 * @param {HTMLElement} background
 */
function closePaiku(dialog, background) {
	dialog?.remove();
	dialog?.classList?.remove("hidden");
	background?.remove();
	_status._decadePaikuOpen = false;
}

/**
 * 移动版牌库弹层
 */
export class DialogExpansion {
	/**
	 * @param {string} name 侧边竖签文案
	 * @param {Card[]|any[]} [content] 卡牌或牌名列表
	 */
	constructor(name, content) {
		this.name = name;
		this.content = content;
		this.init();
	}

	init() {
		_status._decadePaikuOpen = true;
		const background = ui.create.div(".hokdibeijing", document.body);
		const host = ui.arena || document.body;
		const dialog = ui.create.div(".dialog#mobiledialog", host);
		const contentContainer = ui.create.div(".content", dialog);
		const skillName = ui.create.div(".sgs-quanjiname", contentContainer);
		skillName.innerText = this.name;
		const skillTitle = ui.create.div(".game_skill_title", dialog);
		this.background = background;
		this.dialog = dialog;
		this.skillTitle = skillTitle;
		this.contentContainer = contentContainer;
	}

	guanchao() {
		const dialog = this.dialog;
		const background = this.background;
		const area = ui.create.div(".sgs-guanchaoarea", this.contentContainer);
		const caption = ui.create.div(".guanchaocaption", area);
		this.caption = caption;
		this.paiku();
		background.addEventListener(lib.config.touchscreen ? "touchstart" : "mousedown", function () {
			closePaiku(dialog, this);
		});
	}

	/**
	 * @param {string} info
	 */
	add(info) {
		if (this.caption) this.caption.innerHTML = info;
	}

	quanji() {
		const area = ui.create.div(".sgs-quanjiarea", this.contentContainer);
		area.classList.add("duiquanji");
		const dialog = this.dialog;
		const background = this.background;
		const cards = this.content || [];
		this.area = area;
		this.paiku();

		const layoutCards = () => {
			const gap = 8;
			const pad = 6;
			const cardH = 150; // 白卡标准盒高
			const cardW = 108; // 白卡标准盒宽
			const areaOW = parseFloat(getComputedStyle(area).width) || area.clientWidth || area.offsetWidth || 800;
			const n = cards.length;
			const totalWidth = (cardW + gap) * n - gap + pad * 2;

			for (let i = 0; i < n; i++) {
				const smCard = ui.create.card(area, "noclick").init(cards[i]);
				if (isPhone()) smCard.classList.add("dui-mobile");
				applyPaikuWhiteCard(smCard);
				smCard.style.height = cardH + "px";
				smCard.style.width = cardW + "px";
				smCard.style.margin = "0";
				let left = pad + (cardW + gap) * i;
				if (totalWidth > areaOW && n > 1) {
					left = pad + ((areaOW - pad * 2 - cardW) / (n - 1)) * i;
				}
				smCard.style.left = left + "px";
			}
		};

		if (typeof requestAnimationFrame === "function") {
			requestAnimationFrame(() => requestAnimationFrame(layoutCards));
		} else {
			setTimeout(layoutCards, 0);
		}

		background.addEventListener(lib.config.touchscreen ? "touchstart" : "mousedown", function () {
			closePaiku(dialog, this);
		});
	}

	paiku() {
		const base = ASSET_BASE();
		this.skillTitle.innerHTML = `<img src="${base}image/ui/skill/game_skill_tittle_pk.png">`;
		this.skillTitle.classList.add("ssTitle");
		const dialog = this.dialog;
		const arrow = new Image();
		arrow.classList.add("game_skill_arrow");
		arrow.src = `${base}image/ui/dialog/arrow.png`;
		this.skillTitle.appendChild(arrow);
		arrow.addEventListener("click", function (e) {
			e.stopPropagation();
			if (dialog.classList.contains("open")) {
				dialog.classList.remove("open");
				arrow.style.transform = "rotate(0deg)";
			} else {
				dialog.classList.add("open");
				arrow.style.transform = "rotate(180deg)";
			}
		});
	}
}
