/**
 * 装备牌处理模块入口 - 选手牌「全选」增强
 */

import { lib, game, ui, get } from "noname";
import { wrapAround } from "../utils/safeOverride.js";

/**
 * 初始化装备处理模块
 */
export function setupEquipHand() {
	wrapAround(ui.create, "cardChooseAll", () => {
		const event = get.event();
		if (!event.isMine() || !event.allowChooseAll || event.complexCard || event.complexSelect || !lib.config.choose_all_button) {
			return null;
		}

		const range = get.select(event.selectCard);
		if (range[1] <= 1) return null;

		return (event.cardChooseAll = ui.create.control("全选", () => {
			const event2 = get.event();
			const player = event2.player;

			const selecteds = [...ui.selected.cards].map(card => {
				const popup = player.getCards("hs", i => i._realid === card && i._decadeChoosePopup)[0];
				return popup || card;
			});
			ui.selected.cards.length = 0;
			game.check();

			const selectables = get.selectableCards();
			const cards = selecteds.length ? selectables.filter(c => !selecteds.includes(c)) : selectables;
			const toSelect = cards.length <= range[1] ? cards : cards.randomGets(range[1]);
			ui.selected.cards.push(...toSelect);

			for (const card of ui.selected.cards) {
				card.classList.add("selected");
				card.updateTransform(true, 0);
			}
			for (const card of selecteds) {
				card.classList.remove("selected");
				card.updateTransform(false, 0);
			}

			game.check();
			if (typeof event2.custom?.add?.card === "function") {
				event2.custom.add.card();
			}
		}));
	});
}
