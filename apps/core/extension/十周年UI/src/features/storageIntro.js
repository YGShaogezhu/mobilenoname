/**
 * @fileoverview 手杀牌库显示
 * @description 标记类技能用移动版牌库弹层展示存牌/文案（移植自王者荣耀 / 手杀美化）
 */
import { lib, game, ui, get } from "noname";
import { DialogExpansion } from "../ui/expansionDialog.js";

const CONFIG_KEY = "extension_十周年UI_storageIntro";
const STYLESHEET_ID = "decade-storage-intro-stylesheet";

let stylesheetLoaded = false;

/**
 * 加载牌库样式表
 */
function loadStylesheet() {
	if (stylesheetLoaded || document.getElementById(STYLESHEET_ID)) return;
	stylesheetLoaded = true;
	const link = document.createElement("link");
	link.id = STYLESHEET_ID;
	link.rel = "stylesheet";
	link.href = `${lib.assetURL}extension/十周年UI/src/styles/storageIntro.css`;
	document.head.appendChild(link);
}

/**
 * 注册 expansionDialog 并覆盖 get.storageintro
 */
function initStorageIntro() {
	if (!lib.config[CONFIG_KEY]) return;
	if (game.original_get_storageintro) return;

	loadStylesheet();
	ui.create.expansionDialog = DialogExpansion;

	game.original_get_storageintro = get.storageintro;
	Object.assign(get, {
		storageintro(type, content, player, dialog, skill) {
			switch (type) {
				case "mark": {
					if (content > 0) return "共有" + content + "个标记";
					return false;
				}
				case "turn": {
					if (content > 0) return "剩余" + content + "个回合";
					return false;
				}
				case "time": {
					if (content > 0) return "剩余" + content + "次";
					return false;
				}
				case "limited": {
					return content ? "已发动" : "未发动";
				}
				case "info": {
					return lib.translate[skill + "_info"];
				}
				case "cardCount": {
					if (Array.isArray(content)) {
						return "共有" + get.cnNumber(content.length) + "张牌";
					}
					return false;
				}
				case "expansion": {
					content = player.getCards("x", function (card) {
						return card.hasGaintag(skill);
					});
					const cards = content.reverse();
					if (dialog && content.length) {
						const name = get.plainText(lib.skill[skill].marktext || lib.translate[skill]);
						const expansionDialog = new ui.create.expansionDialog(name, cards);
						expansionDialog.quanji();
					} else {
						return "没有卡牌";
					}
					return false;
				}
				case "card":
				case "cards": {
					if (get.itemtype(content) == "card") {
						content = [content];
					}
					if (dialog && get.itemtype(content) == "cards") {
						dialog.addAuto(content);
					} else if (content && content.length) {
						if (Array.isArray(content)) {
							if (content.every(info => typeof info == "string")) {
								content = content.map(info => ["", "", info]);
							}
							const name = get.plainText(lib.skill[skill].marktext || lib.translate[skill]);
							const expansionDialog = new ui.create.expansionDialog(name, content);
							expansionDialog.quanji();
						}
						return false;
					}
					if (Array.isArray(content) && !content.length) {
						return "没有卡牌";
					}
					return false;
				}
				case "player":
				case "players": {
					if (get.itemtype(content) == "player") {
						content = [content];
					}
					if (dialog && get.itemtype(content) == "players") {
						dialog.addAuto(content);
						return false;
					}
					if (content && content.length) {
						return get.translation(content);
					}
					return false;
				}
				case "character":
				case "characters": {
					if (typeof content == "string") {
						content = [content];
					}
					if (dialog && Array.isArray(content)) {
						dialog.addAuto([content, "character"]);
						return false;
					}
					if (content && content.length) {
						return get.translation(content);
					}
					return false;
				}
				default: {
					if (!skill) {
						if (typeof type == "string") {
							type = type.replace(/#/g, content);
							type = type.replace(/&/g, get.cnNumber(content));
							type = type.replace(/\$/g, get.translation(content));
							return type;
						}
						if (typeof type == "function") {
							return type(content, player, skill);
						}
						return false;
					}
					const name = get.plainText(lib.skill[skill].marktext ?? lib.translate[skill]);
					const expansionDialog = new ui.create.expansionDialog(name);
					expansionDialog.guanchao();
					if (typeof type == "string") {
						type = type.replace(/#/g, content);
						type = type.replace(/&/g, get.cnNumber(content));
						type = type.replace(/\$/g, get.translation(content));
						expansionDialog.add(type);
						return false;
					}
					if (typeof type == "function") {
						expansionDialog.add(type(content, player, skill));
						return false;
					}
					return false;
				}
			}
		},
	});
}

/**
 * 手杀牌库显示入口
 */
export function setupStorageIntro() {
	initStorageIntro();
}
