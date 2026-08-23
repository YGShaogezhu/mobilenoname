/**
 * @fileoverview Content覆写模块 - lib.element.content相关的覆写方法
 */

import { lib, game, ui, get, ai, _status } from "noname";
import { createChooseNumberBars, tryParseNumericControls, parseControlAsNumber } from "../ui/chooseNumberBar.js";
import { enhanceChoiceListDialog } from "./player-card-dialog.js";
import {
	setupJudgeBox,
	appendJudgeCardToBox,
	playOverJudge,
	playJudgeResultFx,
	handleJudgeBoxCleanup,
} from "../ui/judge-box.js";

/** @type {Object|null} 基础方法引用 */
let baseContentMethods = null;

/**
 * 设置基础方法引用
 * @param {Object} methods - 基础方法对象
 */
export function setBaseContentMethods(methods) {
	baseContentMethods = methods;
}

/**
 * 是否为移动版样式（手杀 lbtn）
 * @returns {boolean}
 */
function isMobileDecadeStyle() {
	return lib.config.extension_十周年UI_newDecadeStyle === "off";
}

/**
 * 移动版 chooseNumbers：dialog 仅提示，确认条旁加减选数
 * @param {Function} baseChooseNumbers - 原始 chooseNumbers
 * @returns {Function}
 */
export function createContentChooseNumbers(baseChooseNumbers) {
	return async function chooseNumbers(event, trigger, player) {
		if (!isMobileDecadeStyle()) {
			return baseChooseNumbers.call(this, event, trigger, player);
		}

		if (event.chooseTime && _status.connectMode && !game.online) {
			event.time = lib.configOL.choose_timeout;
			game.broadcastAll(time => {
				lib.configOL.choose_timeout = time;
			}, event.chooseTime);
		}

		let result;
		if (!Array.isArray(event.numbers)) {
			event.numbers = [];
		}
		if (!event.numbers.length) {
			event.list.forEach(item => {
				if (Array.isArray(item)) {
					if (["asc", "sort"].includes(item[0])) {
						event.numbers.push(item.slice(1).sort((a, b) => a - b)[0]);
					} else if (item[0] == "desc") {
						event.numbers.push(item.slice(1).sort((a, b) => b - a)[0]);
					} else {
						event.numbers.push(item[0]);
					}
				} else {
					event.numbers.push(item.min || 0);
				}
			});
		}

		if (event.isMine()) {
			result = await new Promise(resolve => {
				_status.imchoosing = true;
				event.settleed = false;
				event.dialog = ui.create.dialog(event.prompt || "请调整以下数值", "forcebutton", "hidden");
				if (event.prompt2) {
					event.dialog.addText(event.prompt2);
				}

				for (const item of event.list) {
					event.dialog.addText(item.prompt || "选择一个数值");
				}
				event.dialog.add(" <br> ");
				event.dialog.open();

				/** @type {ReturnType<typeof createChooseNumberBars>|null} */
				let numberBars = null;

				const cleanup = () => {
					numberBars?.remove();
					numberBars = null;
					event.dialog?.close();
					if (ui.confirm) {
						ui.confirm.close();
					}
				};

				const syncConfirm = () => {
					if (event.filterOk(event)) {
						if (event.forced) {
							ui.create.confirm("o");
						} else {
							ui.create.confirm("oc");
						}
					} else if (!event.forced) {
						ui.create.confirm("c");
					} else if (ui.confirm) {
						ui.confirm.close();
					}
					numberBars?.attachToConfirm();
				};

				const onNumberChange = () => {
					numberBars?.refreshAll();
					syncConfirm();
				};

				numberBars = createChooseNumberBars(event, onNumberChange);

				event.switchToAuto = () => {
					if (!event.filterOk(event)) {
						if (!event.forced) {
							event._result = { bool: false };
						} else {
							event._result = "ai";
						}
					} else {
						event._result = "ai";
					}
					cleanup();
					game.resume();
					_status.imchoosing = false;
					resolve(event._result);
				};

				event.custom.replace.confirm = bool => {
					if (bool) {
						event._result = { bool: true, numbers: event.numbers };
					} else {
						event._result = { bool: false };
					}
					cleanup();
					game.resume();
					_status.imchoosing = false;
					resolve(event._result);
				};

				syncConfirm();
				game.pause();
				game.countChoose();
				event.choosing = true;
			});
		} else if (event.isOnline()) {
			result = await event.sendAsync();
		} else {
			result = "ai";
		}

		if (event.time) {
			game.broadcastAll(time => {
				lib.configOL.choose_timeout = time;
			}, event.time);
		}

		if ((!result || result == "ai" || (event.forced && !result.bool)) && event.processAI) {
			const numbers = event.processAI(event);
			if (typeof numbers == "boolean") {
				if (numbers == true) {
					result = { bool: true, numbers: event.numbers };
				} else {
					result = { bool: false };
				}
			} else if (Array.isArray(numbers)) {
				result = { bool: true, numbers };
			} else {
				result = { bool: false };
			}
		}
		event.result = result;
	};
}

/**
 * 规范化 chooseControl 的 controls（与核心 step1 开头一致）
 * @param {GameEvent} event
 * @returns {boolean} 是否应直接结束事件
 */
function normalizeChooseControlList(event) {
	if (event.controls.length == 0) {
		if (event.sortcard) {
			let sortnum = 2;
			if (event.sorttop) {
				sortnum = 1;
			}
			for (let i = 0; i < event.sortcard.length + sortnum; i++) {
				event.controls.push(get.cnNumber(i, true));
			}
		} else if (event.choiceList) {
			for (const [i] of event.choiceList.entries()) {
				event.controls.push(`选项${get.cnNumber(i + 1, true)}`);
			}
		} else {
			return true;
		}
	} else if (event.choiceList && event.controls.length == 1 && event.controls[0] == "cancel2") {
		event.controls.shift();
		for (const [i] of event.choiceList.entries()) {
			event.controls.push(`选项${get.cnNumber(i + 1, true)}`);
		}
		event.controls.push("cancel2");
	}
	return false;
}

/**
 * 移动版：纯数字 chooseControl（如奇谋/义从）改用加减条
 * @param {Function[]} baseChooseControl - 原始 chooseControl 步骤数组
 * @returns {Function[]}
 */
export function createContentChooseControl(baseChooseControl) {
	const baseSteps = Array.isArray(baseChooseControl) ? baseChooseControl : [baseChooseControl];
	const baseStep1 = baseSteps[0];
	const restSteps = baseSteps.slice(1);

	const finishChoiceListEnhance = event => {
		try {
			if (event.choiceList || event.dialogcontrol) {
				enhanceChoiceListDialog(event);
			}
		} catch (e) {}
	};

	const mobileStep1 = async (event, trigger, player) => {
		if (!isMobileDecadeStyle()) {
			await baseStep1.call(this, event, trigger, player);
			finishChoiceListEnhance(event);
			return;
		}

		if (normalizeChooseControlList(event)) {
			event.finish();
			return;
		}

		// 特殊形态仍走原逻辑（分离选项条不影响数字加减条）
		if (event.sortcard || event.dialogcontrol || event.arrangeSkill || event.choiceList) {
			await baseStep1.call(this, event, trigger, player);
			finishChoiceListEnhance(event);
			return;
		}

		const numeric = tryParseNumericControls(event.controls);
		if (!numeric || numeric.numbers.length < 1) {
			await baseStep1.call(this, event, trigger, player);
			finishChoiceListEnhance(event);
			return;
		}

		// 显式 seperate 的非确认场景：数字选择仍用加减条，跳过原分离按钮
		const plainControls = event.controls.slice(0);
		plainControls.remove("cancel2");
		if ((event.direct && plainControls.length == 1) || event.forceDirect) {
			event.result = {
				control: event.controls[0],
				links: get.links([event.controls[0]]),
			};
			return;
		}

		if (event.isMine()) {
			if (event.hsskill && _status.prehidden_skills.includes(event.hsskill) && event.controls.includes("cancel2")) {
				event.result = {
					bool: true,
					control: "cancel2",
				};
				return;
			}

			let initial = numeric.numbers[0];
			if (typeof event.choice === "number" && event.controls[event.choice] != null) {
				const fromChoice = parseControlAsNumber(event.controls[event.choice]);
				if (fromChoice != null) {
					initial = fromChoice;
				}
			}

			event.list = [numeric.numbers];
			event.numbers = [initial];
			event.filterSelect = () => true;
			event.filterOk = () => true;

			if (event.dialog) {
				if (Array.isArray(event.dialog)) {
					event.dialog = ui.create.dialog.apply(this, event.dialog);
				}
				event.dialog.open();
			} else if (event.prompt) {
				event.dialog = ui.create.dialog(event.prompt);
				if (event.prompt2) {
					event.dialog.addText(event.prompt2, Boolean(event.prompt2.length <= 20 || event.centerprompt2));
				}
			}

			/** @type {ReturnType<typeof createChooseNumberBars>|null} */
			let numberBars = null;

			const cleanupBars = () => {
				numberBars?.remove();
				numberBars = null;
			};

			const syncConfirm = () => {
				if (numeric.hasCancel) {
					ui.create.confirm("oc");
				} else {
					ui.create.confirm("o");
				}
				numberBars?.attachToConfirm();
			};

			numberBars = createChooseNumberBars(event, () => {
				numberBars?.refreshAll();
			});

			event.switchToAuto = () => {
				event.result = "ai";
				cleanupBars();
				if (ui.confirm) {
					ui.confirm.close();
				}
				game.resume();
			};

			if (!event.custom) {
				event.custom = { add: {}, replace: {}, temp: {}, close: {} };
			} else if (!event.custom.replace) {
				event.custom.replace = {};
			}

			event.custom.replace.confirm = bool => {
				if (bool) {
					const control = numeric.controlByNumber.get(event.numbers[0]);
					event.result = {
						control,
						links: get.links([control]),
					};
				} else {
					event.result = {
						control: "cancel2",
						links: get.links(["cancel2"]),
					};
				}
				cleanupBars();
				if (ui.confirm) {
					ui.confirm.close();
				}
				game.resume();
			};

			syncConfirm();
			game.pause();
			game.countChoose();
			event.choosing = true;
			return;
		}

		return baseStep1.call(this, event, trigger, player);
	};

	return [mobileStep1, ...restSteps];
}

/**
 * 创建获得卡牌覆写内容
 * @param {Object} baseGain - 基础gain方法数组
 * @returns {Array} 覆写后的gain方法数组
 */
export function createContentGain(baseGain) {
	return [
		...baseGain.slice(0, -2),
		async (event, trigger, player) => {
			let { cards, gaintag } = event;
			const handcards = player.node.handcards1;
			const fragment = document.createDocumentFragment();
			for (let i = 0; i < cards.length; i++) {
				const card = cards[i];
				let sort = lib.config.sort_card(card);
				if (lib.config.reverse_sort) sort = -sort;
				if (["o", "d"].includes(get.position(card, true))) {
					card.addKnower("everyone");
				}
				card.fix();
				card.style.transform = "";
				if (card.parentNode == handcards) {
					cards.splice(i--, 1);
					continue;
				}
				gaintag.forEach(tag => card.addGaintag(tag));
				if (event.knowers) card.addKnower(event.knowers);
				fragment.appendChild(card);
				if (_status.discarded) _status.discarded.remove(card);
				for (let j = 0; j < card.vanishtag.length; j++) {
					if (card.vanishtag[j][0] != "_") card.vanishtag.splice(j--, 1);
				}
			}
			const _dui = window.decadeUI;
			const gainTo = function (cards, nodelay) {
				cards.duiMod = event.source;
				if (player == game.me) {
					_dui.layoutHandDraws(cards);
					_dui.queueNextFrameTick(_dui.layoutHand, _dui);
					game.addVideo("gain12", player, [get.cardsInfo(fragment.childNodes), gaintag]);
				}
				const s = player.getCards("s");
				if (s.length) handcards.insertBefore(fragment, s[0]);
				else handcards.appendChild(fragment);
				game.broadcast(
					function (player, cards, num, gaintag) {
						player.directgain(cards, null, gaintag);
						_status.cardPileNum = num;
					},
					player,
					cards,
					ui.cardPile.childNodes.length,
					gaintag
				);
				if (nodelay !== true) {
					setTimeout(
						function (player) {
							player.update();
							game.resume();
						},
						get.delayx(400, 400) + 66,
						player
					);
				} else {
					player.update();
				}
			};
			if (event.animate == "draw") {
				game.pause();
				gainTo(cards);
				player.$draw(cards.length);
			} else if (event.animate == "gain") {
				game.pause();
				gainTo(cards);
				player.$gain(cards, event.log);
			} else if (event.animate == "gain2" || event.animate == "draw2") {
				game.pause();
				gainTo(cards);
				player.$gain2(cards, event.log);
			} else if (event.animate == "give" || event.animate == "giveAuto") {
				game.pause();
				gainTo(cards);
				const evtmap = event.losing_map;
				if (event.animate == "give") {
					for (const i in evtmap) {
						const source = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
						source.$give(evtmap[i][0], player, event.log);
					}
				} else {
					for (const i in evtmap) {
						const source = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
						if (evtmap[i][1].length) source.$giveAuto(evtmap[i][1], player, event.log);
						if (evtmap[i][2].length) source.$give(evtmap[i][2], player, event.log);
					}
				}
			} else if (typeof event.animate == "function") {
				const time = event.animate(event);
				game.pause();
				setTimeout(
					function () {
						gainTo(cards, true);
						game.resume();
					},
					get.delayx(time, time)
				);
			} else {
				gainTo(cards, true);
			}
		},
		async (event, trigger, player) => {
			if (event.updatePile) game.updateRoundNumber();
		},
	];
}

/**
 * 判定覆写
 * @returns {Array} 判定流程数组
 */
export function contentJudge() {
	return [
		async (event, trigger, player) => {
			const judgestr = `${get.translation(player)}的${event.judgestr}判定`;
			event.videoId = lib.status.videoId++;
			let cardj = event.directresult;
			if (!cardj) {
				if (player.getTopCards) {
					cardj = player.getTopCards()[0];
				} else {
					cardj = get.cards()[0];
				}
			}
			if (!cardj) {
				event.finish();
				return;
			}
			let waiting;
			const owner = get.owner(cardj);
			if (owner) {
				waiting = owner.lose(cardj, "visible", ui.ordering);
			} else {
				const nextj = game.cardsGotoOrdering(cardj);
				if (event.position != ui.discardPile) {
					nextj.noOrdering = true;
				}
				waiting = nextj;
			}
			player.judging.unshift(cardj);
			game.addVideo("judge1", player, [get.cardInfo(player.judging[0]), judgestr, event.videoId]);

			setupJudgeBox(event, player);
			await game.delay(0.5);
			appendJudgeCardToBox(event);

			game.log(player, "进行" + event.judgestr + "判定，亮出的判定牌为", player.judging[0]);
			if (!event.noJudgeTrigger) {
				await event.trigger("judge");
			}
			await game.delay(2);

			game.broadcastAll(
				function (player, card, id, cardid) {
					const event = game.online ? {} : _status.event;
					if (game.chess) {
						event.node = card.copy("thrown", "center", ui.arena).addTempClass("start");
					} else {
						const c = card.copy();
						c.judge = true;
						event.node = player.$throwordered2(c, true);
						if (ui.thrown && ui.thrown.length > 6) {
							ui.clear.delay = false;
							ui.clear();
						}
					}
					if (lib.cardOL) {
						lib.cardOL[cardid] = event.node;
					}
					event.node.cardid = cardid;
					if (!window.decadeUI) {
						ui.arena.classList.add("thrownhighlight");
						event.node.classList.add("thrownhighlight");
					} else if (game.online && event.dialog) {
						ui.dialogs.push(event.dialog);
					}
				},
				player,
				player.judging[0],
				event.videoId,
				get.id()
			);

			return waiting.forResult();
		},
		async (event, trigger, player) => {
			event.result = {
				card: player.judging[0],
				name: player.judging[0].name,
				number: get.number(player.judging[0]),
				suit: get.suit(player.judging[0]),
				color: get.color(player.judging[0]),
				id: player.judging[0].cardid,
				overjudge: false,
				node: event.node,
			};
			if (event.fixedResult) {
				for (const i in event.fixedResult) {
					event.result[i] = event.fixedResult[i];
				}
			}
			event.result.judge = event.judge(event.result);
			if (event.result.judge > 0) {
				event.result.bool = true;
			} else if (event.result.judge < 0) {
				event.result.bool = false;
			} else {
				event.result.bool = null;
			}
			player.judging.shift();
			game.checkMod(player, event.result, "judge", player);
			if (event.judge2) {
				const judge2 = event.judge2(event.result);
				if (typeof judge2 == "boolean") {
					player.tryJudgeAnimate(judge2);
				}
			}
			if (event.clearArena != false) {
				game.broadcastAll(ui.clear);
			}
			game.broadcast(function () {
				if (!window.decadeUI) {
					ui.arena.classList.remove("thrownhighlight");
				}
			});
			game.addVideo("judge2", null, event.videoId);
			game.log(player, "的判定结果为", event.result.card);

			if (event.judgeCard?.card && event.result.card && event.judgeCard.card.cardid !== event.result.card.cardid) {
				await playOverJudge(event);
			}
			await playJudgeResultFx(event);

			const triggerFixing = event.trigger("judgeFixing");
			event.triggerMessage("judgeresult");
			let callback = null;
			if (event.callback) {
				const next = game.createEvent("judgeCallback", false);
				next.player = player;
				next.card = event.result.card;
				next.judgeResult = get.copy(event.result);
				next.setContent(event.callback);
				callback = next;
				event.next1 = next;
			} else {
				if (!get.owner(event.result.card)) {
					if (event.position != ui.discardPile) {
						event.position.appendChild(event.result.card);
					}
				}
			}
			await triggerFixing;
			if (callback && event.next.includes(callback)) {
				await callback;
			}
			await handleJudgeBoxCleanup(event, callback);
		},
	];
}

/**
 * 创建失去卡牌覆写内容
 * @param {Object} baseLose - 基础lose方法数组
 * @returns {Array} 覆写后的lose方法数组
 */
export function createContentLose(baseLose) {
	return [
		async (event, trigger, player) => {
			const evt = event.getParent();
			if ((evt.name != "discard" || event.type != "discard") && (evt.name != "loseToDiscardpile" || event.type != "loseToDiscardpile")) {
				event.delay = false;
				if (event.blameEvent == undefined) event.animate = false;
			} else {
				if (evt.delay === false) event.delay = false;
				if (event.animate == undefined) event.animate = evt.animate;
			}
		},
		async (event, trigger, player) => {
			let { cards } = event;
			event.vcards = {
				cards: [],
				es: [],
				js: [],
			};
			event.vcard_cards = [];
			event.gaintag_map = {};
			const hs = [];
			const es = [];
			const js = [];
			const ss = [];
			const xs = [];
			const unmarks = [];
			if (event.insert_card && event.position == ui.cardPile) event.cards.reverse();
			const hej = player.getCards("hejsx");
			event.stockcards = cards.slice(0);
			for (let i = 0; i < cards.length; i++) {
				let cardx = [cards[i]];
				if (!hej.includes(cards[i])) {
					cards.splice(i--, 1);
					continue;
				} else if (cards[i].parentNode) {
					if (cards[i].parentNode.classList.contains("equips")) {
						cards[i].throwWith = cards[i].original = "e";
						const VEquip = cards[i][cards[i].cardSymbol];
						if (VEquip) {
							if (cards[i].isViewAsCard) {
								let loseCards = VEquip.cards;
								cardx.addArray(loseCards);
								event.vcard_cards.addArray(loseCards);
								loseCards.forEach(cardi => {
									cardi.throwWith = cardi.original = "e";
									delete cardi.destiny;
									es.push(cardi);
									event.vcard_map.set(cardi, VEquip || get.autoViewAs(cards[i], void 0, false));
								});
							} else {
								es.push(cards[i]);
								event.vcard_map.set(cards[i], VEquip || get.autoViewAs(cards[i], void 0, false));
								event.vcard_cards.add(cards[i]);
							}
							event.vcards.cards.push(cards[i]);
							event.vcards.es.push(cards[i]);
						}
					} else if (cards[i].parentNode.classList.contains("judges")) {
						cards[i].throwWith = cards[i].original = "j";
						const VJudge = cards[i][cards[i].cardSymbol];
						if (VJudge) {
							if (cards[i].isViewAsCard) {
								let loseCards = VJudge.cards;
								cardx.addArray(loseCards);
								event.vcard_cards.addArray(loseCards);
								loseCards.forEach(cardi => {
									cardi.throwWith = cardi.original = "j";
									delete cardi.destiny;
									js.push(cardi);
									event.vcard_map.set(cardi, VJudge || get.autoViewAs(cards[i], void 0, false));
								});
							} else {
								js.push(cards[i]);
								event.vcard_map.set(cards[i], VJudge || get.autoViewAs(cards[i], void 0, false));
								event.vcard_cards.add(cards[i]);
							}
							event.vcards.cards.push(cards[i]);
							event.vcards.js.push(cards[i]);
						}
					} else if (cards[i].parentNode.classList.contains("expansions")) {
						cards[i].throwWith = cards[i].original = "x";
						xs.push(cards[i]);
						event.vcard_map.set(cards[i], get.autoViewAs(cards[i], void 0, false));
						if (cards[i].gaintag && cards[i].gaintag.length) unmarks.addArray(cards[i].gaintag);
					} else if (cards[i].parentNode.classList.contains("handcards")) {
						if (cards[i].classList.contains("glows")) {
							cards[i].throwWith = cards[i].original = "s";
							ss.push(cards[i]);
							event.vcard_map.set(cards[i], get.autoViewAs(cards[i], void 0, false));
						} else {
							cards[i].throwWith = cards[i].original = "h";
							hs.push(cards[i]);
							event.vcard_map.set(cards[i], get.autoViewAs(cards[i], void 0, player));
						}
					} else {
						cards[i].throwWith = cards[i].original = null;
					}
				}
				for (let j = 0; j < cardx.length; j++) {
					if (cardx[j].gaintag && cardx[j].gaintag.length) {
						event.gaintag_map[cardx[j].cardid] = cardx[j].gaintag.slice(0);
						const tags = cardx[j].gaintag.filter(tag => !tag.startsWith("eternal_"));
						tags.forEach(tag => cardx[j].removeGaintag(tag));
					}
					cardx[j].style.transform += " scale(0.2)";
					cardx[j].classList.remove("glow");
					cardx[j].classList.remove("glows");
					cardx[j].recheck();
					const info = lib.card[cardx[j].name];
					if ("_destroy" in cardx[j]) {
						if (cardx[j]._destroy) {
							cardx[j].delete();
							cardx[j].destroyed = cardx[j]._destroy;
							continue;
						}
					} else if ("destroyed" in cardx[j]) {
						if (event.getlx !== false && event.position && cardx[j].willBeDestroyed(event.position.id, null, event)) {
							cardx[j].selfDestroy(event);
							continue;
						}
					} else if (info.destroy) {
						cardx[j].delete();
						cardx[j].destroyed = info.destroy;
						continue;
					}
					if (event.position) {
						if (_status.discarded) {
							if (event.position == ui.discardPile) {
								_status.discarded.add(cardx[j]);
							} else {
								_status.discarded.remove(cardx[j]);
							}
						}
						if (event.insert_index) {
							cardx[j].fix();
							event.position.insertBefore(cardx[j], event.insert_index(event, cardx[j]));
						} else if (event.insert_card) {
							cardx[j].fix();
							event.position.insertBefore(cardx[j], event.position.firstChild);
						} else if (event.position == ui.cardPile) {
							cardx[j].fix();
							event.position.appendChild(cardx[j]);
						} else cardx[j].goto(event.position);
					} else {
						cardx[j].remove();
					}
				}
			}
			const _dui = window.decadeUI;
			if (player == game.me) _dui.queueNextFrameTick(_dui.layoutHand, _dui);
			ui.updatej(player);
			game.broadcast(
				(player, cards, num) => {
					for (let i = 0; i < cards.length; i++) {
						cards[i].removeGaintag(true);
						cards[i].classList.remove("glow");
						cards[i].classList.remove("glows");
						cards[i].fix();
						cards[i].remove();
					}
					if (player == game.me) ui.updatehl();
					ui.updatej(player);
					_status.cardPileNum = num;
				},
				player,
				cards.slice(),
				ui.cardPile.childNodes.length
			);
			if (event.animate != false) {
				const evt = event.getParent();
				evt.discardid = lib.status.videoId++;
				game.broadcastAll(
					function (player, cards, id, visible) {
						const cardx = cards
							.slice()
							.map(i => (i.cards ? i.cards : [i]))
							.flat();
						cardx.duiMod = true;
						if (visible) player.$throw(cardx, null, "nobroadcast");
						const cardnodes = [];
						cardnodes._discardtime = get.time();
						for (let i = 0; i < cardx.length; i++) {
							if (cardx[i].clone) cardnodes.push(cardx[i].clone);
						}
						ui.todiscard[id] = cardnodes;
					},
					player,
					cards,
					evt.discardid,
					event.visible
				);
				if (lib.config.sync_speed && cards[0]?.clone) {
					if (evt.delay != false) {
						const waitingForTransition = get.time();
						evt.waitingForTransition = waitingForTransition;
						cards[0].clone.listenTransition(function () {
							if (_status.waitingForTransition == waitingForTransition && _status.paused) {
								game.resume();
							}
							delete evt.waitingForTransition;
						});
					} else if (evt.getParent().discardTransition) {
						delete evt.getParent().discardTransition;
						const waitingForTransition = get.time();
						evt.getParent().waitingForTransition = waitingForTransition;
						cards[0].clone.listenTransition(function () {
							if (_status.waitingForTransition == waitingForTransition && _status.paused) {
								game.resume();
							}
							delete evt.getParent().waitingForTransition;
						});
					}
				}
			}
			game.addVideo("lose", player, [get.cardsInfo(hs), get.cardsInfo(es), get.cardsInfo(js), get.cardsInfo(ss)]);
			event.cards2 = hs.concat(es);
			cards.removeArray(event.vcards.cards);
			cards.addArray(event.vcard_cards);
			player.getHistory("lose").push(event);
			game.getGlobalHistory().cardMove.push(event);
			player.update();
			game.addVideo("loseAfter", player);
			event.num = 0;
			if (event.position == ui.ordering) {
				const evt = event.relatedEvent || event.getParent();
				if (!evt.orderingCards) evt.orderingCards = [];
				if (!evt.noOrdering && !evt.cardsOrdered) {
					evt.cardsOrdered = true;
					const next = game.createEvent("orderingDiscard", false);
					event.next.remove(next);
					evt.after.push(next);
					next.relatedEvent = evt;
					next.setContent("orderingDiscard");
				}
				if (!evt.noOrdering) {
					evt.orderingCards.addArray(cards);
				}
			} else if (event.position == ui.cardPile) {
				game.updateRoundNumber();
			}
			if (unmarks.length) {
				for (const i of unmarks) {
					player[(lib.skill[i] && lib.skill[i].mark) || player.hasCard(card => card.hasGaintag(i), "x") ? "markSkill" : "unmarkSkill"](i);
				}
			}
			event.hs = hs;
			event.es = es;
			event.js = js;
			event.ss = ss;
			event.xs = xs;
			game.clearCardKnowers(hs);
			if (hs.length && !event.visible) {
				player.getCards("h").forEach(hcard => {
					hcard.clearKnowers();
				});
			}
		},
		...baseLose.slice(2),
	];
}
