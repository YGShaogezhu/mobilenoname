/**
 * @fileoverview 双将副将边框
 * @description 双将/十常侍/国战模式下显示手杀样式副将框（源自子琪版）
 */

import { lib, game, get } from "noname";

const CONFIG_KEY = "extension_十周年UI_shuangjiang";
const SKILL_DUAL = "_shousha_shuangjiang";
const SKILL_GZ_YINNI = "_gzyinni";
const SKILL_GZ_FRAME = "_guozhan";

/**
 * 是否启用副将边框
 * @returns {boolean}
 */
export function isDualDeputyFrameEnabled() {
	return lib.config?.[CONFIG_KEY] !== false;
}

/**
 * @returns {string}
 */
function getDoubleImageBase() {
	return window.decadeUIPath || `${lib.assetURL}extension/十周年UI/`;
}

/**
 * @param {string} name
 * @returns {string}
 */
function resolveCharacterGroup(name) {
	if (!name) return "";
	const info = get.character(name);
	if (info?.group) return info.group;
	const raw = lib.character[name];
	if (!raw) return "";
	if (raw.group) return raw.group;
	if (Array.isArray(raw)) return raw[1] || "";
	return "";
}

/**
 * 移除玩家身上的双将副将竖框
 * @param {HTMLElement} player
 */
export function removeDeputyFrameFromPlayer(player) {
	if (!player?._fujiangkuang) return;
	if (player._fujiangkuang.parentNode) {
		player._fujiangkuang.parentNode.removeChild(player._fujiangkuang);
	}
	delete player._fujiangkuang;
}

/**
 * 为玩家挂载双将副将竖框（非国战）
 * @param {HTMLElement} player
 * @param {import("noname").GameEvent} [trigger]
 */
export function applyDeputyFrameToPlayer(player, trigger) {
	if (!isDualDeputyFrameEnabled() || !window.decadeUI || !player) return;
	if (lib.config.mode === "guozhan") return;

	const shouldRefresh =
		!player.name2 ||
		trigger?.name === "changeCharacter" ||
		trigger?.name === "changeCharacterAfter" ||
		trigger?.name === "mbdanggu_clique" ||
		trigger?.name === "mbdanggu_cliqueAfter" ||
		trigger?.name === "restEnd" ||
		trigger?.name === "enterGame";

	if (player._fujiangkuang && shouldRefresh) {
		removeDeputyFrameFromPlayer(player);
	}

	if (!player.name2 || player._fujiangkuang) return;

	const group = resolveCharacterGroup(player.name2);
	if (!group) return;

	const frame = document.createElement("img");
	frame.className = "decadeUI-deputy-frame";
	frame.src = `${getDoubleImageBase()}image/ui/double/fu_${group}.png`;
	player.appendChild(frame);
	player._fujiangkuang = frame;
}

/**
 * 注册全局技能（更新触发挂钩）
 * @param {string} key
 */
function registerGlobalSkill(key) {
	if (!lib.skill.global) lib.skill.global = [];
	if (lib.skill.global.includes(key)) {
		game.removeGlobalSkill(key);
	}
	game.addGlobalSkill(key);
}

/**
 * 初始化双将副将边框功能
 */
export function setupDualDeputyFrame() {
	if (typeof lib.config[CONFIG_KEY] === "undefined") {
		game.saveConfig(CONFIG_KEY, true);
	}
	if (!isDualDeputyFrameEnabled()) return;

	if (window.decadeUI) {
		window.decadeUI.applyDeputyFrame = applyDeputyFrameToPlayer;
	}

	lib.skill[SKILL_DUAL] = {
		charlotte: true,
		forced: true,
		popup: false,
		lastDo: true,
		trigger: {
			global: ["gameStart", "changeCharacterAfter"],
			player: ["enterGame", "mbdanggu_cliqueAfter", "restEnd"],
		},
		filter(_event, player) {
			return lib.config.mode !== "guozhan" && Boolean(player);
		},
		content(event, trigger, player) {
			game.broadcastAll(
				function (player, trigger) {
					if (window.decadeUI?.applyDeputyFrame) {
						window.decadeUI.applyDeputyFrame(player, trigger);
					}
				},
				player,
				trigger
			);
		},
	};

	lib.skill[SKILL_GZ_YINNI] = {
		charlotte: true,
		forced: true,
		popup: false,
		priority: 999,
		firstDo: true,
		trigger: {
			global: ["gameStart", "dieBegin"],
			player: ["enterGame", "showCharacterEnd", "hideCharacterEnd"],
		},
		filter(event, player, name) {
			if (lib.config.mode !== "guozhan") return false;
			if (name === "showCharacterEnd" || name === "dieBegin") {
				return (
					event.player.getElementsByClassName("gzyinni").length > 0 ||
					event.player.getElementsByClassName("gzyinni1").length > 0 ||
					event.player.getElementsByClassName("player_gz_cntry").length > 0 ||
					event.player.getElementsByClassName("fujiang").length > 0
				);
			}
			return Boolean(player);
		},
		content() {
			var triggerName = event.triggername;
			game.broadcastAll(
				function (player, triggerName, trigger) {
					if (!window.decadeUI || !player) return;

					var base = window.decadeUIPath || lib.assetURL + "extension/十周年UI/";

					var gzMeDelete = function (node) {
						if (!this[node]) return;
						this[node].style.opacity = 0;
						var p = this;
						setTimeout(function () {
							if (!p[node]) return;
							p.removeChild(p[node]);
							p[node] = false;
						}, 600);
					};
					player.gzMe_delete = gzMeDelete;
					if (trigger?.player) trigger.player.gzMe_delete = gzMeDelete;

					if (triggerName === "gameStart" || triggerName === "enterGame") {
						if (player === game.me) return;

						if (!player.gzMe_gzyn) {
							var gzyn = document.createElement("img");
							gzyn.src = base + "image/ui/double/yinnigz.png";
							gzyn.className = "gzyinni";
							gzyn.style.cssText =
								"pointer-events:none;display:block;position:absolute;top:auto;bottom:0;left:16%;height:195px;width:40%;z-index:61;opacity:0;transition:all 0.5s";
							player.appendChild(gzyn);
							setTimeout(function () {
								gzyn.style.opacity = 1;
							}, 0);
							player.gzMe_gzyn = gzyn;
						}

						if (!player.gzMe_gzyn1) {
							var gzyn1 = document.createElement("img");
							gzyn1.src = base + "image/ui/double/yinnigz.png";
							gzyn1.className = "gzyinni1";
							gzyn1.style.cssText =
								"pointer-events:none;display:block;position:absolute;top:auto;bottom:0;left:56%;height:195px;width:43.4%;z-index:61;opacity:0;transition:all 0.5s";
							player.appendChild(gzyn1);
							setTimeout(function () {
								gzyn1.style.opacity = 1;
							}, 0);
							player.gzMe_gzyn1 = gzyn1;
						}

						if (!player.gzMe_cntry) {
							var cntry = document.createElement("img");
							cntry.src = base + "image/ui/double/player_gz_cntry.png";
							cntry.className = "player_gz_cntry";
							cntry.style.cssText =
								"pointer-events:none;display:block;position:absolute;top:-8.3px;left:-4px;height:33.5px;width:33.5px;z-index:62;opacity:0;transition:all 0.5s";
							player.appendChild(cntry);
							setTimeout(function () {
								cntry.style.opacity = 1;
							}, 0);
							player.gzMe_cntry = cntry;
						}

						if (!player.gzMe_fj) {
							var fj = document.createElement("img");
							fj.src = base + "image/ui/double/fujiang.png";
							fj.className = "fujiang";
							fj.style.cssText =
								"pointer-events:none;display:block;position:absolute;top:22px;left:62.6px;height:36.6px;width:21.6px;z-index:62;opacity:0;transition:all 0.5s";
							player.appendChild(fj);
							setTimeout(function () {
								fj.style.opacity = 1;
							}, 0);
							player.gzMe_fj = fj;
						}
						return;
					}

					if (triggerName === "showCharacterEnd") {
						if (player === game.me || !trigger?.player) return;
						var target = trigger.player;
						if ([0, 2].includes(trigger.num) && !target.isUnseen(0)) {
							target.gzMe_delete("gzMe_gzyn");
						}
						if ([1, 2].includes(trigger.num) && !target.isUnseen(1)) {
							target.gzMe_delete("gzMe_gzyn1");
							target.gzMe_delete("gzMe_fj");
						}
						if (!target.isUnseen(2)) target.gzMe_delete("gzMe_cntry");
						return;
					}

					if (triggerName === "dieBegin") {
						if (player === game.me || !trigger?.player) return;
						var dead = trigger.player;
						dead.gzMe_delete("gzMe_gzyn");
						dead.gzMe_delete("gzMe_gzyn1");
						dead.gzMe_delete("gzMe_fj");
						dead.gzMe_delete("gzMe_cntry");
						return;
					}

					if (triggerName === "hideCharacterEnd" && player !== game.me) {
						if (player.isUnseen(0) && !player.gzMe_gzyn) {
							var gzyn2 = document.createElement("img");
							gzyn2.src = base + "image/ui/double/yinnigz.png";
							gzyn2.className = "gzyinni";
							gzyn2.style.cssText =
								"pointer-events:none;display:block;position:absolute;top:auto;bottom:0;left:16%;height:195px;width:40%;z-index:61;opacity:0;transition:all 0.5s";
							player.appendChild(gzyn2);
							setTimeout(function () {
								gzyn2.style.opacity = 1;
							}, 0);
							player.gzMe_gzyn = gzyn2;
						}
						if (player.isUnseen(1) && !player.gzMe_gzyn1) {
							var gzyn3 = document.createElement("img");
							gzyn3.src = base + "image/ui/double/yinnigz.png";
							gzyn3.className = "gzyinni1";
							gzyn3.style.cssText =
								"pointer-events:none;display:block;position:absolute;top:auto;bottom:0;left:56%;height:195px;width:43.4%;z-index:61;opacity:0;transition:all 0.5s";
							player.appendChild(gzyn3);
							setTimeout(function () {
								gzyn3.style.opacity = 1;
							}, 0);
							player.gzMe_gzyn1 = gzyn3;
						}
						if (player.isUnseen(1) && !player.gzMe_fj) {
							var fj2 = document.createElement("img");
							fj2.src = base + "image/ui/double/fujiang.png";
							fj2.className = "fujiang";
							fj2.style.cssText =
								"pointer-events:none;display:block;position:absolute;top:22px;left:62.6px;height:36.6px;width:21.6px;z-index:62;opacity:0;transition:all 0.5s";
							player.appendChild(fj2);
							player.gzMe_fj = fj2;
						}
					}
				},
				player,
				triggerName,
				trigger
			);
		},
	};

	lib.skill[SKILL_GZ_FRAME] = {
		charlotte: true,
		forced: true,
		popup: false,
		trigger: {
			global: "gameStart",
			player: "showCharacterEnd",
		},
		filter(event, player, name) {
			if (lib.config.mode !== "guozhan") return false;
			if (name === "showCharacterEnd") {
				return event.player.getElementsByClassName("guozhan").length > 0;
			}
			return Boolean(player);
		},
		content() {
			var triggerName = event.triggername;
			game.broadcastAll(
				function (player, triggerName, trigger) {
					if (!window.decadeUI || !player) return;

					var base = window.decadeUIPath || lib.assetURL + "extension/十周年UI/";

					if (triggerName === "gameStart") {
						if (player.gzMe_guozhan) return;
						var gz = document.createElement("img");
						gz.src = base + "image/ui/double/fu_unknown.png";
						gz.className = "guozhan";
						gz.style.cssText =
							"pointer-events:none;display:block;position:absolute;top:-1.5px;left:62.6px;height:173px;width:22px;z-index:61";
						player.appendChild(gz);
						player.gzMe_guozhan = gz;
						return;
					}

					if (triggerName === "showCharacterEnd" && trigger?.player) {
						var target = trigger.player;
						if (!target.gzMe_delete) {
							target.gzMe_delete = function (node) {
								if (!this[node]) return;
								this[node].style.opacity = 0;
								var p = this;
								setTimeout(function () {
									if (!p[node]) return;
									p.removeChild(p[node]);
									p[node] = false;
								}, 600);
							};
						}
						target.gzMe_delete("gzMe_guozhan");

						var group = target.group;
						if (!group) return;
						var yh = document.createElement("img");
						yh.className = "decadeUI-deputy-frame guozhan";
						yh.src = base + "image/ui/double/fu_" + group + ".png";
						yh.style.cssText =
							"pointer-events:none;display:block;position:absolute;top:-1.5px;left:62.6px;height:173px;width:22px;z-index:61";
						target.appendChild(yh);
					}
				},
				player,
				triggerName,
				trigger
			);
		},
	};

	registerGlobalSkill(SKILL_DUAL);
	registerGlobalSkill(SKILL_GZ_YINNI);
	registerGlobalSkill(SKILL_GZ_FRAME);

	const refreshAllDeputyFrames = () => {
		if (!isDualDeputyFrameEnabled() || !window.decadeUI) return;
		const players = game.players.concat(game.dead || []);
		for (const player of players) {
			if (!player) continue;
			if (lib.config.mode === "guozhan") {
				if (player === game.me || player.gzMe_guozhan) continue;
				const base = getDoubleImageBase();
				const gz = document.createElement("img");
				gz.src = `${base}image/ui/double/fu_unknown.png`;
				gz.className = "guozhan";
				gz.style.cssText =
					"pointer-events:none;display:block;position:absolute;top:-1.5px;left:62.6px;height:173px;width:22px;z-index:61";
				player.appendChild(gz);
				player.gzMe_guozhan = gz;
				continue;
			}
			applyDeputyFrameToPlayer(player);
		}
	};

	lib.arenaReady.push(refreshAllDeputyFrames);
}
