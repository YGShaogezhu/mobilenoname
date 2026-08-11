/**
 * @fileoverview 布局模块，负责手牌和弃牌区的布局计算与更新
 */
import { lib, game, ui, get, ai, _status } from "noname";

/**
 * 获取当前样式配置
 * @returns {string} 样式名称
 */
const getStyle = () => decadeUI?.config?.newDecadeStyle ?? lib.config.extension_十周年UI_newDecadeStyle;

/**
 * 获取弃牌缩放比例
 * @returns {number} 缩放比例
 */
const getDiscardScale = () => lib.config?.extension_十周年UI_discardScale ?? 0.14;

/**
 * 弃牌区最大宽度占屏幕宽度的比例
 * @constant {number}
 */
const DISCARD_MAX_WIDTH_RATIO = 0.7;

/**
 * 创建layout模块
 * @returns {Object} layout模块对象
 */
export function createLayoutModule() {
	return {
		/**
		 * 更新所有布局
		 */
		update() {
			this.updateHand();
			this.updateDiscard();
		},

		/**
		 * 更新手牌布局
		 */
		updateHand() {
			if (!game.me) return;
			const handNode = ui.handcards1;
			if (!handNode) return console.error("hand undefined");

			const cards = [...handNode.childNodes].filter(card => {
				if (card.classList.contains("removing")) {
					card.scaled = false;
					return false;
				}
				return true;
			});
			if (!cards.length) return;

			const bounds = decadeUI.boundsCaches.hand;
			bounds.check();
			const { width: pw, cardWidth: cw, cardHeight: ch, cardScale: cs, x: boundsX } = bounds;
			const csw = cw * cs;
			const y = Math.round((ch * cs - ch) / 2);
			let xMargin = csw + 2;
			let xStart = (csw - cw) / 2;
			const totalW = cards.length * csw + (cards.length - 1) * 2;
			const limitW = pw;
			let expand = false;

			if (totalW > limitW) {
				xMargin = csw - Math.abs(limitW - csw * cards.length) / (cards.length - 1);
				if (lib.config.fold_card) {
					const foldMin = parseFloat(lib.config.extension_十周年UI_handFoldMin) || 9;
					const min = cs * foldMin;
					if (xMargin < min) {
						expand = true;
						xMargin = min;
					}
				}
			} else {
				const style = getStyle();
				const shouldCenter = style === "codename" || ((style === "on" || style === "othersOff") && !lib.config.phonelayout);
				if (shouldCenter) {
					xStart = (ui.arena.offsetWidth - totalW) / 2 - boundsX;
				}
			}

			let selectedIndex = -1,
				spreadOffsetLeft = 0,
				spreadOffsetRight = 0,
				baseShift = 0;
			const folded = totalW > limitW && xMargin < csw - 0.5;

			if (folded && typeof ui.getSpreadOffset === "function") {
				const spread = ui.getSpreadOffset(cards, { cardWidth: csw, currentMargin: xMargin });
				({ spreadIndex: selectedIndex, spreadLeft: spreadOffsetLeft, spreadRight: spreadOffsetRight } = spread);
				// 非滚动折叠时把选中牌夹进可视区；滚动模式交给横向滚动
				if (selectedIndex !== -1 && !expand) {
					const selX = xStart + selectedIndex * xMargin;
					const maxSelX = Math.max(0, limitW - csw);
					baseShift = Math.round(Math.max(0, Math.min(maxSelX, selX)) - selX);
				}
			}

			// 滚动模式下左侧让位会把牌推到负坐标，整体右移补足
			const leftPad = expand && spreadOffsetLeft ? spreadOffsetLeft : 0;

			cards.forEach((card, i) => {
				let fx = xStart + i * xMargin + baseShift + leftPad;
				if (spreadOffsetLeft || spreadOffsetRight) {
					if (i < selectedIndex) fx -= spreadOffsetLeft;
					else if (i > selectedIndex) fx += spreadOffsetRight;
				}
				const x = Math.round(fx);
				const selected = card.classList.contains("selected");
				card.tx = x;
				card.ty = y;
				card.scaled = true;
				card.style.zIndex = selected || i === selectedIndex ? String(1000 + i) : String(i + 1);
				card.style.transform = `translate(${x}px,${y}px) scale(${cs})`;
				card._transform = card.style.transform;
				card.updateTransform(selected);
				// scrollh 下原生 updateTransform 不上移，布局侧补一层
				if (selected && expand) {
					card.style.transform = `${card._transform} translateY(-20px)`;
				}
			});

			const container = ui.handcards1Container;
			const spreadExtra = (spreadOffsetLeft || 0) + (spreadOffsetRight || 0);
			if (expand) {
				container.classList.add("scrollh");
				container.style.overflowX = "scroll";
				container.style.overflowY = "hidden";
				handNode.style.width = `${Math.round(cards.length * xMargin + (csw - xMargin) + spreadExtra)}px`;
				if (selectedIndex !== -1) {
					const selCard = cards[selectedIndex];
					const viewW = container.clientWidth || limitW;
					const target = Math.max(0, (selCard.tx || 0) + csw / 2 - viewW / 2);
					container.scrollLeft = target;
				}
			} else {
				container.classList.remove("scrollh");
				container.style.overflowX = container.style.overflowY = "";
				handNode.style.width = "100%";
			}
		},

		/**
		 * 更新弃牌区布局
		 * 当卡牌总宽度超过限制宽度时，卡牌会折叠重叠显示
		 */
		updateDiscard() {
			ui.thrown ??= [];
			ui.thrown = ui.thrown.filter(t => {
				if (t.classList.contains("drawingcard") || t.classList.contains("removing") || t.parentNode !== ui.arena || t.fixed) {
					return false;
				}
				t.classList.remove("removing");
				return true;
			});
			if (!ui.thrown.length) return;

			const rawCards = ui.thrown;
			// 折叠组内：主牌（第一张）排到最右侧压在最上
			const cards = [];
			for (let i = 0; i < rawCards.length; ) {
				const cur = rawCards[i];
				if (cur.dataset.viewasFold === "1" && cur._viewAsGroupId) {
					const gid = cur._viewAsGroupId;
					const group = [];
					while (i < rawCards.length && rawCards[i].dataset.viewasFold === "1" && rawCards[i]._viewAsGroupId === gid) {
						group.push(rawCards[i++]);
					}
					group.sort((a, b) => {
						const ap = a.dataset.viewasPrimary === "1" ? 1 : 0;
						const bp = b.dataset.viewasPrimary === "1" ? 1 : 0;
						return ap - bp;
					});
					cards.push(...group);
				} else {
					cards.push(cur);
					i++;
				}
			}
			ui.thrown = cards;

			const bounds = decadeUI.boundsCaches.arena;
			bounds.check();
			const { width: pw, height: ph, cardWidth: cw, cardHeight: ch } = bounds;
			const cs = Math.min((decadeUI.get.bodySize().height * getDiscardScale()) / ch, 1);
			const csw = cw * cs;
			const y = Math.round((ph - ch) / 2);

			// 弃牌区最大宽度限制为屏幕宽度的70%
			const maxWidth = pw * DISCARD_MAX_WIDTH_RATIO;
			const foldGap = Math.max(22, Math.round(csw * 0.16)); // 转化多牌折叠露边

			// 连续 viewas-fold 组按折叠间距计宽，其余牌正常间距
			const gaps = [];
			for (let i = 0; i < cards.length - 1; i++) {
				const a = cards[i];
				const b = cards[i + 1];
				const sameFold =
					a.dataset.viewasFold === "1" &&
					b.dataset.viewasFold === "1" &&
					a._viewAsGroupId &&
					a._viewAsGroupId === b._viewAsGroupId;
				gaps.push(sameFold ? foldGap : csw + 2);
			}

			let totalW = csw;
			for (const g of gaps) totalW += g;
			const limitW = Math.min(maxWidth, pw);

			let scaleGaps = gaps.slice();
			if (totalW > limitW && gaps.length) {
				const overflow = totalW - limitW;
				const shrinkable = gaps.reduce((s, g) => (g > foldGap ? s + (g - foldGap) : s), 0);
				if (shrinkable > 0) {
					const ratio = Math.min(1, overflow / shrinkable);
					scaleGaps = gaps.map(g => (g > foldGap ? g - (g - foldGap) * ratio : g));
					totalW = csw + scaleGaps.reduce((s, g) => s + g, 0);
				}
			}

			let xStart = (pw - Math.min(totalW, limitW)) / 2 + (csw - cw) / 2;
			let x = Math.round(xStart);
			cards.forEach((card, i) => {
				card.tx = x;
				card.ty = y;
				card.scaled = true;
				// 清掉手牌选中残留的 inline z-index
				if (card.dataset.viewasFold === "1") {
					card.style.zIndex = card.dataset.viewasPrimary === "1" ? "15" : "10";
				} else {
					card.style.zIndex = "";
				}
				card.style.transform = `translate(${x}px,${y}px) scale(${cs})`;
				if (i < scaleGaps.length) x += Math.round(scaleGaps[i]);
			});
		},

		/**
		 * 清理卡牌
		 * @param {HTMLElement} card - 卡牌元素
		 */
		clearout(card) {
			if (!card || card.fixed || card.classList.contains("removing")) return;
			if (card.name?.startsWith("shengbei_left_") || card.name?.startsWith("shengbei_right_")) {
				card.delete();
				return;
			}
			if (!ui.thrown.includes(card)) {
				ui.thrown.unshift(card);
				decadeUI.queueNextFrameTick(decadeUI.layoutDiscard, decadeUI);
			}
			card.classList.add("invalided");
			setTimeout(
				c => {
					c.remove();
					decadeUI.queueNextFrameTick(decadeUI.layoutDiscard, decadeUI);
				},
				2333,
				card
			);
		},

		/**
		 * 防抖处理
		 * @param {Object} config - 防抖配置
		 */
		_debounce(config) {
			const { defaultDelay, maxDelay, timeoutKey, timeKey, immediateCallback, callback } = config;
			const nowTime = Date.now();

			if (this[timeoutKey]) {
				clearTimeout(this[timeoutKey]);
				if (nowTime - this[timeKey] > maxDelay) {
					this[timeoutKey] = this[timeKey] = null;
					immediateCallback();
					return;
				}
			} else {
				this[timeKey] = nowTime;
			}

			this[timeoutKey] = setTimeout(
				() => {
					this[timeoutKey] = this[timeKey] = null;
					callback();
				},
				this[timeoutKey] ? nowTime - this[timeKey] : defaultDelay
			);
		},

		/**
		 * 延迟清理
		 */
		delayClear() {
			this._debounce({
				defaultDelay: 500,
				maxDelay: 1000,
				timeoutKey: "_delayClearTimeout",
				timeKey: "_delayClearTimeoutTime",
				immediateCallback: ui.clear,
				callback: ui.clear,
			});
		},

		/**
		 * 使布局失效
		 */
		invalidate() {
			this.invalidateHand();
			this.invalidateDiscard();
		},

		/**
		 * 使手牌布局失效
		 */
		invalidateHand() {
			this._debounce({
				defaultDelay: 40,
				maxDelay: 180,
				timeoutKey: "_handcardTimeout",
				timeKey: "_handcardTimeoutTime",
				immediateCallback: () => this.updateHand(),
				callback: () => this.updateHand(),
			});
		},

		/**
		 * 使弃牌区布局失效
		 */
		invalidateDiscard() {
			this._debounce({
				defaultDelay: ui.thrown?.length > 15 ? 80 : 40,
				maxDelay: 180,
				timeoutKey: "_discardTimeout",
				timeKey: "_discardTimeoutTime",
				immediateCallback: () => this.updateDiscard(),
				callback: () => this.updateDiscard(),
			});
		},

		/**
		 * 响应窗口大小变化
		 */
		resize() {
			if (!ui.arena) return;
			ui.arena.classList.toggle("dui-mobile", decadeUI.isMobile());

			decadeUI.dataset.animSizeUpdated = false;
			decadeUI.dataset.bodySize.updated = false;
			Object.values(decadeUI.boundsCaches).forEach(cache => (cache.updated = false));

			const ensureStyle = selector => decadeUI.sheet.getStyle(selector) || decadeUI.sheet.insertRule(`${selector} { zoom: 1; }`);
			const buttonsWindow = ensureStyle("#window > .dialog.popped .buttons:not(.smallzoom)");
			const buttonsArena = ensureStyle("#arena:not(.choose-character) .buttons:not(.smallzoom)");

			decadeUI.zooms.card = decadeUI.getCardBestScale();
			if (ui.me) ui.me.style.height = `${Math.round(decadeUI.getHandCardSize().height * decadeUI.zooms.card + 30.4)}px`;
			if (buttonsArena) buttonsArena.zoom = decadeUI.zooms.card;
			if (buttonsWindow) buttonsWindow.zoom = decadeUI.zooms.card;
			this.invalidate();
		},
	};
}
