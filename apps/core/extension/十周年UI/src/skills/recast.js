/**
 * 重铸交互模块 - 实现可重铸卡牌的"使用/重铸"合并交互
 */
import { lib, game, ui, get, _status } from "noname";

/** 是否为手杀按钮风格 */
export function isShoushaStyle() {
	return lib.config.extension_十周年UI_newDecadeStyle === "off";
}

/**
 * 重铸特性是否启用
 * 手杀风格始终启用（CZ 选牌后重铸）；其它风格依赖 Beta 开关
 */
export function isRecastFeatureActive() {
	if (isShoushaStyle()) return true;
	return lib.config.extension_十周年UI_enableRecastInteraction !== false;
}

export function canRecastCard(card, player) {
	if (!card || !player) return false;
	if (!isRecastFeatureActive()) return false;

	if (!lib.filter.cardRecastable(card, player, null, true)) return false;

	const event = _status.event;
	if (event?._backup) {
		const backupSkill = event._backup.skill || event.skill;
		if (backupSkill) {
			const skillInfo = lib.skill[backupSkill];
			if (skillInfo?.viewAs || skillInfo?.viewAsFilter) {
				return false;
			}
		}
	}

	return true;
}

// 检查卡牌是否被其他技能禁用
export function isCardDisabledByOthers(card, player) {
	if (!player) return false;

	const info = get.info(card);
	if (info?.enable) {
		const enableResult = typeof info.enable === "function" ? info.enable(card, player) : info.enable;
		if (enableResult === false) return true;
	}

	const ourSkill = lib.skill._decadeUI_recastable_enable;
	const originalMod = ourSkill?.mod?.cardEnabled;
	if (ourSkill?.mod) {
		delete ourSkill.mod.cardEnabled;
	}

	let disabled = false;
	try {
		const modResult = game.checkMod(card, player, _status.event, "unchanged", "cardEnabled", player);
		if (modResult === false) disabled = true;

		if (!disabled && get.itemtype(card) === "card") {
			const modResult2 = game.checkMod(card, player, _status.event, "unchanged", "cardEnabled2", player);
			if (modResult2 === false) disabled = true;
		}
	} finally {
		if (ourSkill?.mod && originalMod) {
			ourSkill.mod.cardEnabled = originalMod;
		}
	}

	return disabled;
}

// 获取卡牌的最小目标数
export function getCardMinTarget(card) {
	const info = get.info(card);
	if (!info) return 1;
	if (info.type === "equip") return 1;

	const select = info.selectTarget;
	if (select === -1) return 1;
	if (Array.isArray(select)) return Math.max(select[0], 0);
	if (typeof select === "number") return Math.max(select, 0);
	if (typeof select === "function") {
		try {
			const result = select(card, _status.event?.player);
			if (result === -1) return 1;
			if (Array.isArray(result)) return Math.max(result[0], 0);
			if (typeof result === "number") return Math.max(result, 0);
		} catch (e) {}
	}
	return 1;
}

/** 当前是否应显示手杀 CZ 重铸按钮 */
export function shouldShowRecastingBtn() {
	const player = game.me;
	const selectedCard = ui.selected.cards?.[0];
	if (!selectedCard || !player) return false;
	if (_status.event?.skill) return false;
	if ((ui.selected.targets?.length ?? 0) > 0) return false;
	return canRecastCard(selectedCard, player);
}

// 可重铸卡牌无目标时转为重铸
export const recastAnimateSkill = {
	_decadeUI_recastable_recast: {
		trigger: { player: ["useCardBefore", "respondBefore"] },
		forced: true,
		popup: false,
		silent: true,
		priority: Infinity + 1,
		filter(event, player) {
			if (!isRecastFeatureActive()) return false;

			if (event.name === "useCard") {
				if (event.targets?.length > 0) return false;
			}

			if (event.name === "respond") {
				if (!event._decadeUI_shouldRecast) return false;
			}

			if (event.skill) {
				const skillInfo = lib.skill[event.skill];
				if (skillInfo?.viewAs || skillInfo?.viewAsFilter) return false;
			}

			const cards = event.cards;
			if (!cards?.length) return false;

			return cards.every(card => lib.filter.cardRecastable(card, player, null, true));
		},
		async content(_event, trigger, player) {
			trigger.cancel();
			trigger.untrigger();
			await player.recast(trigger.cards);
		},
	},
};

// 被禁用的可重铸卡牌仍可选中
export const recastBaseSkill = {
	_decadeUI_recastable_enable: {
		mod: {
			cardEnabled(card, player) {
				if (player?.isPhaseUsing?.()) {
					if (!canRecastCard(card, player)) return;

					if (isCardDisabledByOthers(card, player)) {
						return true;
					}
				}
			},
			cardRespondable(card, player) {
				const event = _status.event;
				if (event?.name !== "chooseToRespond") return;
				if (!canRecastCard(card, player)) return;

				if (isCardDisabledByOthers(card, player)) {
					return true;
				}
			},
			selectTarget(_card, player, range) {
				if (!player?.isPhaseUsing?.()) return;
				const selectedCard = ui.selected.cards?.[0];
				if (!selectedCard || !canRecastCard(selectedCard, player)) return;

				// 返回新数组，允许选择0个目标
				const newRange = [...range];
				newRange[0] = 0;

				if (newRange[1] === -1) {
					newRange[1] = game.countPlayer();
				}

				return newRange;
			},
			playerEnabled(_card, player) {
				const selectedCard = ui.selected.cards?.[0];
				if (!selectedCard || !canRecastCard(selectedCard, player)) return;

				if (isCardDisabledByOthers(selectedCard, player)) return false;
			},
		},
	},
};

function updateRecastingBtnVisibility() {
	const btn = ui.confirm?.recastingBtn;
	if (!btn) return;
	btn.style.display = shouldShowRecastingBtn() ? "" : "none";
}

// 设置可重铸卡牌的交互逻辑
export function setupRecastableCards() {
	if (lib.hooks?.checkEnd) {
		lib.hooks.checkEnd.add("_decadeUI_recastable_check", event => {
			if (!ui.confirm) return;

			const eventName = event?.name;
			if (eventName !== "chooseToUse" && eventName !== "chooseToRespond") return;

			const okBtn = ui.confirm.node?.ok || ui.confirm.firstChild;
			if (!okBtn || okBtn.link !== "ok") return;

			const selectedCard = ui.selected.cards?.[0];
			const player = event?.player;
			const shousha = isShoushaStyle();

			updateRecastingBtnVisibility();

			if (!selectedCard || !player || !canRecastCard(selectedCard, player)) return;

			if (eventName === "chooseToRespond") {
				const canRespond = event.filterCard?.(selectedCard, player);
				if (canRespond) {
					if (!shousha) {
						okBtn.innerHTML = "确定";
						okBtn.classList.remove("disabled");
					}
					delete event._decadeUI_shouldRecast;
				} else if (shousha) {
					// 手杀：由 CZ 触发重铸，确定保持禁用
					okBtn.classList.add("disabled");
					event._decadeUI_shouldRecast = true;
				} else {
					okBtn.innerHTML = "重铸";
					okBtn.classList.remove("disabled");
					event._decadeUI_shouldRecast = true;
				}
				return;
			}

			if (ui.selected.targets.length === 0) {
				if (shousha) {
					// 手杀：确定保持禁用外观，点 CZ 再确认
					okBtn.classList.add("disabled");
				} else {
					okBtn.innerHTML = "重铸";
					okBtn.classList.remove("disabled");
				}
			} else {
				const card = get.card();
				const minTarget = card ? getCardMinTarget(card) : 1;
				if (!shousha) {
					okBtn.innerHTML = "确定";
				}
				if (ui.selected.targets.length >= minTarget) {
					okBtn.classList.remove("disabled");
				} else {
					okBtn.classList.add("disabled");
				}
			}
		});
	}

	if (lib.hooks?.uncheckEnd) {
		lib.hooks.uncheckEnd.add("_decadeUI_recastable_confirm_reset", () => {
			if (!ui.confirm) return;
			const okBtn = ui.confirm.node?.ok || ui.confirm.firstChild;
			const text = okBtn?.innerHTML;
			if (text === "重铸") {
				okBtn.innerHTML = "确定";
			}
			const event = _status.event;
			if (event?._decadeUI_shouldRecast) {
				delete event._decadeUI_shouldRecast;
			}
			updateRecastingBtnVisibility();
		});
	}
}

// 初始化重铸模块
export function initRecast() {
	if (!isRecastFeatureActive()) return;

	Object.assign(lib.skill, recastAnimateSkill, recastBaseSkill);
	game.addGlobalSkill("_decadeUI_recastable_recast");
	game.addGlobalSkill("_decadeUI_recastable_enable");

	if (lib.skill._recasting) {
		lib.skill._recasting.enable = false;
	}

	setupRecastableCards();

	patchChangeTargetCards();
}

// 修复有 changeTarget 的卡牌在无目标时的报错
function patchChangeTargetCards() {
	for (const cardName in lib.card) {
		const cardInfo = lib.card[cardName];
		if (!cardInfo?.changeTarget) continue;
		if (!cardInfo.recastable && !cardInfo.chongzhu) continue;

		const originalChangeTarget = cardInfo.changeTarget;
		cardInfo.changeTarget = function (player, targets) {
			if (!targets?.[0]) return;
			return originalChangeTarget.call(this, player, targets);
		};
	}
}
